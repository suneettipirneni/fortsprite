import { and, eq, inArray, or, sql } from "drizzle-orm"
import { z } from "zod"
import type {
  PublicProfile,
  SharingAction,
  SharingFriend,
} from "@workspace/contracts"
import { catalogItem } from "./catalog.ts"
import { user } from "./db/auth-schema.ts"
import { db } from "./db/client.ts"
import { blocks, collectionEntries, friendships, sprites } from "./db/schema.ts"
import { usernameSchema } from "./identity.ts"

const profileColumns = {
  id: user.id,
  name: user.name,
  appDisplayName: user.appDisplayName,
  handle: user.handle,
  fortniteDisplayName: user.fortniteDisplayName,
}

export const handleSchema = usernameSchema

export const sharingActionSchema = z
  .object({
    action: z.enum([
      "request",
      "accept",
      "decline",
      "remove",
      "block",
      "unblock",
    ]),
  })
  .strict()

export class FriendshipError extends Error {
  constructor(
    readonly status: 403 | 404 | 409,
    message: string,
  ) {
    super(message)
  }
}

export function publicProfile(
  profile: Pick<
    typeof user.$inferSelect,
    "id" | "name" | "handle" | "fortniteDisplayName" | "appDisplayName"
  >,
): PublicProfile {
  const displayName = profile.appDisplayName ?? profile.name
  return {
    id: profile.id,
    displayName,
    handle: profile.handle,
    fortniteDisplayName: profile.fortniteDisplayName,
    initials:
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "FS",
  }
}

function acceptedFriendCondition(
  viewerId: string,
  friendId: string | typeof user.id,
) {
  return sql`exists (select 1 from ${friendships} where ${friendships.status} = 'accepted'
    and ${friendships.userLowId} = least(${viewerId}::text collate "C", ${friendId}::text collate "C")
    and ${friendships.userHighId} = greatest(${viewerId}::text collate "C", ${friendId}::text collate "C"))
    and not exists (select 1 from ${blocks} where ${blocks.blockerId} = ${viewerId} and ${blocks.blockedId} = ${friendId})
    and not exists (select 1 from ${blocks} where ${blocks.blockerId} = ${friendId} and ${blocks.blockedId} = ${viewerId})`
}

function latestReleasedSeasonCondition() {
  return sql`${sprites.sourceSeasonId} = (
    select max(latest_sprites.source_season_id)
    from ${sprites} as latest_sprites
    where latest_sprites.release_status = 'released'
  )`
}

export async function sharingFriends(viewerId: string, database = db) {
  const [relationships, blocked] = await Promise.all([
    database
      .select()
      .from(friendships)
      .where(
        or(
          eq(friendships.userLowId, viewerId),
          eq(friendships.userHighId, viewerId),
        ),
      ),
    database
      .select()
      .from(blocks)
      .where(
        or(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, viewerId)),
      ),
  ])
  const peerIds = [
    ...new Set(
      relationships.map((relationship) =>
        relationship.userLowId === viewerId
          ? relationship.userHighId
          : relationship.userLowId,
      ),
    ),
  ]
  if (!peerIds.length) return [] satisfies SharingFriend[]
  const profiles = await database
    .select(profileColumns)
    .from(user)
    .where(inArray(user.id, peerIds))
  return profiles
    .filter(
      (profile) =>
        !blocked.some(
          (block) =>
            block.blockerId === profile.id && block.blockedId === viewerId,
        ),
    )
    .map((profile): SharingFriend => {
      const relationship = relationships.find(
        (row) => row.userLowId === profile.id || row.userHighId === profile.id,
      )
      const status = blocked.some((row) => row.blockedId === profile.id)
        ? "blocked"
        : relationship?.status === "accepted"
          ? "accepted"
          : relationship?.requestedById === viewerId
            ? "outgoing"
            : "incoming"
      return { profile: publicProfile(profile), status }
    })
}

export async function requestFriendByHandle(
  viewerId: string,
  handle: string,
  database = db,
) {
  const [friend] = await database
    .select(profileColumns)
    .from(user)
    .where(sql`lower(${user.handle}) = lower(${handle})`)
  if (!friend || friend.id === viewerId)
    throw new FriendshipError(404, "No FortSprite account uses that username.")
  await changeSharing(viewerId, friend.id, "request", database)
  return { profile: publicProfile(friend), status: "outgoing" as const }
}

export async function changeSharing(
  viewerId: string,
  friendId: string,
  action: SharingAction,
  database = db,
) {
  if (viewerId === friendId)
    throw new FriendshipError(404, "This friend could not be found.")
  const [low, high] = [viewerId, friendId].sort() as [string, string]
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`friendship:${low}:${high}`}))`,
    )
    const [target] = await transaction
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, friendId))
    if (!target)
      throw new FriendshipError(404, "This friend could not be found.")
    const pair = and(
      eq(friendships.userLowId, low),
      eq(friendships.userHighId, high),
    )
    const [relationship] = await transaction
      .select()
      .from(friendships)
      .where(pair)
    const blocked = await transaction
      .select()
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, friendId)),
          and(eq(blocks.blockerId, friendId), eq(blocks.blockedId, viewerId)),
        ),
      )
    if (action === "unblock") {
      await transaction
        .delete(blocks)
        .where(
          and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, friendId)),
        )
      return
    }
    if (action === "remove" || action === "decline") {
      if (
        action === "decline" &&
        relationship &&
        (relationship.status !== "pending" ||
          relationship.requestedById === viewerId)
      )
        throw new FriendshipError(
          403,
          "Only the recipient can decline this request.",
        )
      await transaction.delete(friendships).where(pair)
      return
    }
    if (action === "block") {
      await transaction.delete(friendships).where(pair)
      await transaction
        .insert(blocks)
        .values({ blockerId: viewerId, blockedId: friendId })
        .onConflictDoNothing()
      return
    }
    if (blocked.length)
      throw new FriendshipError(
        404,
        "This sharing relationship is unavailable.",
      )
    if (action === "accept") {
      if (relationship?.status === "accepted") return
      if (
        !relationship ||
        relationship.status !== "pending" ||
        relationship.requestedById === viewerId
      )
        throw new FriendshipError(
          403,
          "Only the recipient can accept a pending request.",
        )
      await transaction
        .update(friendships)
        .set({
          status: "accepted",
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(pair)
      return
    }
    if (
      relationship?.status === "accepted" ||
      relationship?.status === "pending"
    )
      return
    await transaction
      .insert(friendships)
      .values({
        userLowId: low,
        userHighId: high,
        requestedById: viewerId,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [friendships.userLowId, friendships.userHighId],
        set: {
          status: "pending",
          requestedById: viewerId,
          respondedAt: null,
          updatedAt: new Date(),
        },
      })
  })
}

export async function getHelpers(viewerId: string, database = db) {
  const rows = await database
    .select({
      entries: sql<{ spriteId: string; mastered: boolean }[]>`
        jsonb_agg(jsonb_build_object(
          'spriteId', ${collectionEntries.spriteId},
          'mastered', ${collectionEntries.mastered}
        ))
      `,
      profile: profileColumns,
    })
    .from(collectionEntries)
    .innerJoin(user, eq(user.id, collectionEntries.userId))
    .innerJoin(sprites, eq(sprites.id, collectionEntries.spriteId))
    .where(
      and(
        eq(collectionEntries.owned, true),
        eq(sprites.releaseStatus, "released"),
        latestReleasedSeasonCondition(),
        acceptedFriendCondition(viewerId, user.id),
      ),
    )
    .groupBy(user.id)
  return rows.flatMap((row) => {
    const profile = publicProfile(row.profile)
    return row.entries.map(({ spriteId, mastered }) => ({
      spriteId,
      mastered,
      profile,
    }))
  })
}

export async function getBlockedProfiles(viewerId: string, database = db) {
  const profiles = await database
    .select(profileColumns)
    .from(blocks)
    .innerJoin(user, eq(user.id, blocks.blockedId))
    .where(eq(blocks.blockerId, viewerId))
  return profiles.map(publicProfile)
}

export async function getComparison(
  viewerId: string,
  friendId: string,
  database = db,
) {
  const rows = await database
    .select({
      sprite: sprites,
      profile: profileColumns,
      viewerOwned: sql<boolean>`exists (select 1 from ${collectionEntries} where ${collectionEntries.userId} = ${viewerId} and ${collectionEntries.spriteId} = ${sprites.id} and ${collectionEntries.owned})`,
      friendOwned: sql<boolean>`exists (select 1 from ${collectionEntries} where ${collectionEntries.userId} = ${friendId} and ${collectionEntries.spriteId} = ${sprites.id} and ${collectionEntries.owned})`,
    })
    .from(user)
    .leftJoin(
      sprites,
      and(
        eq(sprites.releaseStatus, "released"),
        latestReleasedSeasonCondition(),
      ),
    )
    .where(
      and(eq(user.id, friendId), acceptedFriendCondition(viewerId, user.id)),
    )
  const first = rows[0]
  if (!first)
    throw new FriendshipError(404, "This shared collection is unavailable.")
  const ordered = rows
    .filter((row) => row.sprite)
    .sort(
      (a, b) =>
        a.sprite!.displayOrder - b.sprite!.displayOrder ||
        a.sprite!.slug.localeCompare(b.sprite!.slug),
    )
  return {
    friend: publicProfile(first.profile),
    forYou: ordered.flatMap((row) =>
      !row.viewerOwned && row.friendOwned && row.sprite
        ? [catalogItem(row.sprite)]
        : [],
    ),
    forFriend: ordered.flatMap((row) =>
      row.viewerOwned && !row.friendOwned && row.sprite
        ? [catalogItem(row.sprite)]
        : [],
    ),
    refreshedAt: new Date().toISOString(),
  }
}
