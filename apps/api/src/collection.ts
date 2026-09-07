import { and, asc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type {
  CollectionEntry,
  CollectionMutationResponse,
  CollectionSnapshot,
  CollectionState,
} from "@workspace/contracts"

import { db } from "./db/client.ts"
import { collectionEntries, sprites } from "./db/schema.ts"
import { catalogItem } from "./catalog.ts"

export const collectionStateSchema = z.discriminatedUnion("owned", [
  z
    .object({
      owned: z.literal(false),
      mastered: z.literal(false),
    })
    .strict(),
  z
    .object({
      owned: z.literal(true),
      mastered: z.boolean(),
    })
    .strict(),
])

export const spriteIdSchema = z.string().uuid()
export const collectionQuerySchema = z
  .object({
    search: z.string().max(120).optional(),
    variant: z.string().max(80).optional(),
    rarity: z.string().max(80).optional(),
    ownership: z.enum(["all", "owned", "missing"]).optional(),
  })
  .strict()

type CollectionQuery = z.infer<typeof collectionQuerySchema>
type Database = typeof db

function collectionEntry(
  row: typeof collectionEntries.$inferSelect,
): CollectionEntry {
  const state: CollectionState = row.owned
    ? { owned: true, mastered: row.mastered }
    : { owned: false, mastered: false }
  return {
    ...state,
    spriteId: row.spriteId,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getCollection(
  userId: string,
  query: CollectionQuery = {},
  database: Database = db,
): Promise<CollectionSnapshot> {
  const rows = await database
    .select({ sprite: sprites, entry: collectionEntries })
    .from(sprites)
    .leftJoin(
      collectionEntries,
      and(
        eq(collectionEntries.spriteId, sprites.id),
        eq(collectionEntries.userId, userId),
      ),
    )
    .where(eq(sprites.releaseStatus, "released"))
    .orderBy(asc(sprites.displayOrder), asc(sprites.slug))

  const allItems = rows.map(({ sprite, entry }) => ({
    ...catalogItem(sprite),
    ...(entry
      ? collectionEntry(entry)
      : {
          spriteId: sprite.id,
          owned: false as const,
          mastered: false as const,
          updatedAt: null,
        }),
    helpers: [],
  }))
  const search = query.search?.toLocaleLowerCase()
  const items = allItems.filter(
    (item) =>
      (!search ||
        `${item.baseName} ${item.variant}`
          .toLocaleLowerCase()
          .includes(search)) &&
      (!query.variant || item.variant === query.variant) &&
      (!query.rarity || item.rarity === query.rarity) &&
      (!query.ownership ||
        query.ownership === "all" ||
        (query.ownership === "owned" ? item.owned : !item.owned)),
  )
  const dates = allItems.flatMap((item) =>
    item.updatedAt ? [item.updatedAt] : [],
  )
  return {
    friendAvailability: { status: "unavailable", refreshedAt: null },
    items,
    progress: {
      total: allItems.length,
      owned: allItems.filter((item) => item.owned).length,
      mastered: allItems.filter((item) => item.mastered).length,
    },
    updatedAt: dates.length
      ? dates.reduce((latest, date) => (date > latest ? date : latest))
      : null,
  }
}

export async function setCollectionEntry(
  userId: string,
  spriteId: string,
  state: CollectionState,
  database: Database = db,
): Promise<CollectionMutationResponse | null> {
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`collection:${userId}`}))`,
    )
    const [sprite] = await transaction
      .select({ id: sprites.id })
      .from(sprites)
      .where(
        and(eq(sprites.id, spriteId), eq(sprites.releaseStatus, "released")),
      )
      .for("share")
    if (!sprite) return null
    const [entry] = await transaction
      .insert(collectionEntries)
      .values({ userId, spriteId, ...state })
      .onConflictDoUpdate({
        target: [collectionEntries.userId, collectionEntries.spriteId],
        set: {
          ...state,
          updatedAt: sql`case when (${collectionEntries.owned}, ${collectionEntries.mastered}) is distinct from (${state.owned}, ${state.mastered}) then now() else ${collectionEntries.updatedAt} end`,
        },
      })
      .returning()
    if (!entry)
      throw new Error("Collection update did not return its saved entry")
    const [progress] = await transaction
      .select({
        total: sql<number>`count(*)::int`,
        owned: sql<number>`count(*) filter (where ${collectionEntries.owned})::int`,
        mastered: sql<number>`count(*) filter (where ${collectionEntries.mastered})::int`,
      })
      .from(sprites)
      .leftJoin(
        collectionEntries,
        and(
          eq(collectionEntries.spriteId, sprites.id),
          eq(collectionEntries.userId, userId),
        ),
      )
      .where(eq(sprites.releaseStatus, "released"))
    return {
      entry: collectionEntry(entry),
      progress: progress ?? { total: 0, owned: 0, mastered: 0 },
    }
  })
}
