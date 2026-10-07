import assert from "node:assert/strict"
import test from "node:test"
import type { CollectionTrackingSnapshot } from "@workspace/contracts"
import { packCollectionTracking, unpackCollectionTracking } from "../lib/collection-tracking-payload"

test("compact tracking retains membership, timestamps, helper order, and mastery", () => {
  const profile = {
    id: "friend", handle: "friend", displayName: "Friend", initials: "F", fortniteDisplayName: null,
  }
  const snapshot: CollectionTrackingSnapshot = {
    catalogRevision: "revision-1",
    entries: [
      { spriteId: "untouched", owned: false, mastered: false, updatedAt: null },
      { spriteId: "captured", owned: true, mastered: true, updatedAt: "2026-10-06T00:00:00Z" },
      { spriteId: "removed", owned: false, mastered: false, updatedAt: "2026-10-06T01:00:00Z" },
    ],
    helpers: [
      { spriteId: "untouched", profile, mastered: true },
      { spriteId: "captured", profile: { ...profile, id: "other", handle: "other" }, mastered: false },
      { spriteId: "untouched", profile, mastered: false },
    ],
  }
  const payload = packCollectionTracking(snapshot)
  const restored = unpackCollectionTracking(JSON.parse(JSON.stringify(payload)))
  assert.deepEqual(restored, snapshot)
  assert.equal(restored.helpers[0]?.profile, restored.helpers[2]?.profile)
  assert.equal(unpackCollectionTracking(payload), unpackCollectionTracking(payload))
  assert.ok(JSON.stringify(payload).length < JSON.stringify(snapshot).length)
})

test("empty snapshots and separate users keep independent tracking and profiles", () => {
  const empty: CollectionTrackingSnapshot = { catalogRevision: "empty", entries: [], helpers: [] }
  assert.deepEqual(unpackCollectionTracking(packCollectionTracking(empty)), empty)
  const entry = { spriteId: "same-sprite", owned: false, mastered: false, updatedAt: null } as const
  const a = packCollectionTracking({ ...empty, entries: [entry] })
  const b = packCollectionTracking({ ...empty, entries: [{ ...entry, owned: true, mastered: true }] })
  assert.equal(unpackCollectionTracking(a).entries[0]?.owned, false)
  assert.equal(unpackCollectionTracking(b).entries[0]?.mastered, true)
  assert.notEqual(unpackCollectionTracking(a), unpackCollectionTracking(b))
})
