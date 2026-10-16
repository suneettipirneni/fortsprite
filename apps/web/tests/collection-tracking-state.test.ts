import assert from "node:assert/strict"
import test from "node:test"
import type { CatalogItem, CollectionEntry, CollectionTrackingSnapshot } from "@workspace/contracts"
import { createCollectionSnapshotReader } from "../lib/collection-tracking-state"

function item(id: string): CatalogItem {
  return {
    id, slug: id, stableKey: id, baseName: id, variant: "Base", sourceVariant: "Base",
    rarity: "Rare", releaseStatus: "released", displayOrder: 0, season: "C7 S4",
    sourceSeasonId: 42, imagePath: null, description: null, descriptionLines: [],
    levelProgression: null, location: null, spriteDustValue: null, dropChancePercent: null,
    dropChances: [], sourcePage: "https://example.test", sourceVerifiedAt: "2026-10-16T00:00:00Z",
  }
}

const missing: CollectionEntry = { spriteId: "air", owned: false, mastered: false, updatedAt: null }

test("consumers share one collection projection until tracking changes", () => {
  const read = createCollectionSnapshotReader(new Map([["air", item("air")], ["dream", item("dream")]]))
  const server: CollectionTrackingSnapshot = { catalogRevision: "1", entries: [missing], helpers: [] }
  const queued = new Map<string, CollectionEntry>()
  const pending = new Set<string>()
  const first = read(server, queued, pending)
  assert.equal(read(server, queued, pending), first)
  assert.deepEqual(first.progress, { total: 1, owned: 0, mastered: 0 })
  assert.equal(first.updatedAt, null)
  assert.deepEqual(first.items.map((sprite) => sprite.id), ["air"])

  const captured: CollectionEntry = { ...missing, owned: true, mastered: false }
  const changed = new Map([["air", captured]])
  const second = read(server, changed, pending)
  assert.notEqual(second, first)
  assert.equal(read(server, changed, pending), second)
  assert.deepEqual(second.progress, { total: 1, owned: 1, mastered: 0 })
})

test("pending intent wins during refresh and completed writes respect newer server state", () => {
  const read = createCollectionSnapshotReader(new Map([["air", item("air")]]))
  const timestamp = "2026-10-16T01:00:00Z"
  const server: CollectionTrackingSnapshot = {
    catalogRevision: "1", entries: [{ ...missing, updatedAt: timestamp }], helpers: [],
  }
  const queued = new Map<string, CollectionEntry>([["air", { ...missing, owned: true, mastered: true }]])
  const saving = read(server, queued, new Set(["air"]))
  assert.deepEqual(saving.progress, { total: 1, owned: 1, mastered: 1 })
  const saved = read(server, queued, new Set())
  assert.deepEqual(saved.progress, { total: 1, owned: 0, mastered: 0 })
  assert.equal(saved.updatedAt, timestamp)
})

test("new server snapshots refresh helpers, membership, and isolate collection readers", () => {
  const catalog = new Map([["air", item("air")]])
  const read = createCollectionSnapshotReader(catalog)
  const otherUser = createCollectionSnapshotReader(catalog)
  const queued = new Map<string, CollectionEntry>()
  const pending = new Set<string>()
  const server: CollectionTrackingSnapshot = { catalogRevision: "1", entries: [missing], helpers: [] }
  const initial = read(server, queued, pending)
  const updated = read({
    ...server,
    entries: [{ ...missing, owned: true, mastered: true, updatedAt: "2026-10-16T02:00:00Z" }],
    helpers: [{ spriteId: "air", mastered: true, profile: {
      id: "friend", handle: "friend", displayName: "Friend", initials: "F", fortniteDisplayName: null,
    } }],
  }, queued, pending)
  assert.deepEqual(updated.progress, { total: 1, owned: 1, mastered: 1 })
  assert.equal(updated.items[0]?.helpers[0]?.mastered, true)
  assert.equal(updated.updatedAt, "2026-10-16T02:00:00Z")
  assert.deepEqual(otherUser(server, queued, pending), initial)
  assert.deepEqual(read({ ...server, entries: [] }, queued, pending).progress, { total: 0, owned: 0, mastered: 0 })
})
