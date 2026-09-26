import "./env.js"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { eq, inArray, sql } from "drizzle-orm"
import { assembleCollection, CatalogRevisionMismatchError } from "@workspace/contracts"
import type { CollectionTrackingSnapshot } from "@workspace/contracts"

const { db, pool } = await import("../src/db/client.ts")
const { user, rateLimit } = await import("../src/db/auth-schema.ts")
const { sprites } = await import("../src/db/schema.ts")
const { getCatalog, catalogRevision } = await import("../src/catalog.ts")
const { getCollectionTracking, setCollectionEntry } = await import("../src/collection.ts")
const { createCollectionRoutes } = await import("../src/collection-routes.ts")
const { readBudgets, readLimitKey, userRateLimitKeys } = await import("../src/rate-limit.ts")
const owner = randomUUID()
const peer = randomUUID()
const ids = [randomUUID(), randomUUID(), randomUUID()]
let helperCalls = 0
const helpers = [{
  spriteId: ids[0]!,
  mastered: true,
  profile: { id: peer, handle: "tracking_peer", displayName: "Tracking peer", initials: "TP", fortniteDisplayName: null },
}]
const routes = createCollectionRoutes({
  getSession: async () => ({ user: { id: owner } }),
  readHelpers: async () => { helperCalls++; return helpers },
})

before(async () => {
  await db.insert(user).values([owner, peer].map((id) => ({
    id, name: "Tracking collector", email: `${id}@test.invalid`, handle: `track_${id.slice(0, 8)}`,
  })))
  await db.insert(sprites).values(ids.map((id, index) => ({
    id, stableKey: id, slug: id, baseName: `Tracking ${index}`,
    variantName: "Base", rarity: "Rare", displayOrder: index,
    releaseStatus: index === 2 ? "retired" as const : "released" as const,
    sourceUrl: "https://example.test/sprite", sourceVerifiedAt: new Date(),
  })))
})

after(async () => {
  await db.delete(user).where(inArray(user.id, [owner, peer]))
  await db.delete(sprites).where(inArray(sprites.id, ids))
  await db.delete(rateLimit).where(inArray(rateLimit.key, [
    ...userRateLimitKeys(owner), ...userRateLimitKeys(peer),
  ]))
  await pool.end()
})

test("state requires authentication and rejects query parameters before helper reads", async () => {
  const anonymous = createCollectionRoutes({ getSession: async () => null })
  assert.equal((await anonymous.request("/collection/state")).status, 401)
  assert.equal((await anonymous.request("/collection/state?owner=other")).status, 401)
  assert.equal((await routes.request("/collection/state?owner=other")).status, 400)
  assert.equal(helperCalls, 0)
})

test("state and cached public catalog assemble the same authorized full collection", async () => {
  await setCollectionEntry(owner, ids[0]!, { owned: true, mastered: true })
  await setCollectionEntry(peer, ids[1]!, { owned: true, mastered: true })
  const response = await routes.request("/collection/state")
  assert.equal(response.status, 200)
  const state = await response.json() as CollectionTrackingSnapshot
  assert.deepEqual(state.entries.find((entry) => entry.spriteId === ids[1]), {
    spriteId: ids[1], owned: false, mastered: false, updatedAt: null,
  })
  assert.equal(state.entries.some((entry) => entry.spriteId === ids[2]), false)
  assert.deepEqual(state.helpers, helpers)
  const full = await routes.request("/collection")
  assert.equal(full.status, 200)
  assert.deepEqual(assembleCollection(await getCatalog(), state), await full.json())
})

test("catalog revisions ignore private ownership but capture microsecond metadata and membership changes", async () => {
  const before = await getCollectionTracking(owner)
  await setCollectionEntry(owner, ids[0]!, { owned: false, mastered: false })
  const changedTracking = await getCollectionTracking(owner)
  assert.equal(changedTracking.catalogRevision, before.catalogRevision)
  assert.equal(changedTracking.entries.find((entry) => entry.spriteId === ids[0])?.owned, false)
  await db.update(sprites).set({
    updatedAt: sql`${sprites.updatedAt} + interval '1 microsecond'`,
    description: "Revised metadata",
  }).where(eq(sprites.id, ids[0]!))
  const changedMetadata = await getCollectionTracking(owner)
  assert.notEqual(changedMetadata.catalogRevision, before.catalogRevision)
  const catalog = await getCatalog()
  assert.equal(catalog.revision, changedMetadata.catalogRevision)
  assert.equal(catalog.items.find((item) => item.id === ids[0])?.description, "Revised metadata")
  assert.throws(() => assembleCollection(catalog, before), /catalog changed while loading/)
  await db.update(sprites).set({ releaseStatus: "released" }).where(eq(sprites.id, ids[2]!))
  const released = await getCollectionTracking(owner)
  assert.notEqual(released.catalogRevision, changedMetadata.catalogRevision)
  assert.ok(released.entries.some((entry) => entry.spriteId === ids[2]))
  const newerCatalog = await getCatalog()
  assert.throws(() => assembleCollection(newerCatalog, changedMetadata), CatalogRevisionMismatchError)
  await db.update(sprites).set({ releaseStatus: "retired" }).where(eq(sprites.id, ids[2]!))
  const retired = await getCollectionTracking(owner)
  assert.equal(retired.catalogRevision, changedMetadata.catalogRevision)
  assert.equal(retired.entries.some((entry) => entry.spriteId === ids[2]), false)
  assert.throws(() => assembleCollection(newerCatalog, retired), CatalogRevisionMismatchError)
  const restoredCatalog = await getCatalog()
  assert.equal(restoredCatalog.revision, catalog.revision)
  assert.equal(assembleCollection(restoredCatalog, retired).items.some((item) => item.id === ids[2]), false)
  await db.update(sprites).set({ releaseStatus: "released" }).where(eq(sprites.id, ids[2]!))
  await db.delete(sprites).where(eq(sprites.id, ids[2]!))
  const deleted = await getCollectionTracking(owner)
  assert.notEqual(deleted.catalogRevision, released.catalogRevision)
  assert.equal(deleted.entries.some((entry) => entry.spriteId === ids[2]), false)
  assert.equal(catalogRevision([{ id: "b", updatedAt: "1.000001" }, { id: "a", updatedAt: "2" }]),
    catalogRevision([{ id: "a", updatedAt: "2" }, { id: "b", updatedAt: "1.000001" }]))
})

test("state and full collection share the authenticated read budget", async () => {
  const key = readLimitKey(owner, "collection")
  await db.insert(rateLimit).values({
    id: randomUUID(), key, count: readBudgets.collection, lastRequest: Date.now(),
  }).onConflictDoUpdate({ target: rateLimit.key, set: { count: readBudgets.collection, lastRequest: Date.now() } })
  const before = helperCalls
  assert.equal((await routes.request("/collection/state")).status, 429)
  assert.equal((await routes.request("/collection")).status, 429)
  assert.equal(helperCalls, before)
})
