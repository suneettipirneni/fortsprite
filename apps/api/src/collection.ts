import { and, asc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type {
  CollectionEntry,
  CollectionMutationResponse,
  CollectionQuery,
  CollectionSnapshot,
  CollectionState,
  CollectionTrackingSnapshot,
} from "@workspace/contracts"
import { assembleCollection } from "@workspace/contracts"

import { db } from "./db/client.ts"
import { collectionEntries, sprites } from "./db/schema.ts"
import { catalogRevision, getCatalog } from "./catalog.ts"

export { collectionStateSchema, collectionQuerySchema } from "@workspace/contracts/sprite-tools"

export const spriteIdSchema = z.uuid()

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

export async function getCollectionTracking(
  userId: string,
  database: Database = db,
): Promise<CollectionTrackingSnapshot> {
  const rows = await database
    .select({
      spriteId: sprites.id,
      catalogUpdatedAt: sql<string>`extract(epoch from ${sprites.updatedAt})::text`,
      owned: collectionEntries.owned,
      mastered: collectionEntries.mastered,
      updatedAt: collectionEntries.updatedAt,
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
    .orderBy(asc(sprites.id))

  return {
    catalogRevision: catalogRevision(rows.map((row) => ({
      id: row.spriteId,
      updatedAt: row.catalogUpdatedAt,
    }))),
    entries: rows.map((row) => ({
      spriteId: row.spriteId,
      ...(row.owned
        ? { owned: true as const, mastered: row.mastered ?? false }
        : { owned: false as const, mastered: false as const }),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    })),
    helpers: [],
  }
}

export async function getCollection(
  userId: string,
  query: CollectionQuery = {},
  database: Database = db,
): Promise<CollectionSnapshot> {
  let [catalog, tracking] = await Promise.all([
    getCatalog(database),
    getCollectionTracking(userId, database),
  ])
  if (catalog.revision !== tracking.catalogRevision)
    [catalog, tracking] = await Promise.all([
      getCatalog(database),
      getCollectionTracking(userId, database),
    ])
  return assembleCollection(catalog, tracking, query)
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
