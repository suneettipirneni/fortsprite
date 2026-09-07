import assert from "node:assert/strict"
import { setImmediate } from "node:timers/promises"
import test from "node:test"
import type {
  CollectionEntry,
  CollectionMutationResponse,
  CollectionState,
} from "@workspace/contracts"

import { createCollectionSync } from "../lib/collection-sync"

const missing: CollectionState = {
  owned: false,
  mastered: false,
}
const captured: CollectionState = { ...missing, owned: true }
const mastered: CollectionState = { ...captured, mastered: true }

function harness(states: Record<string, CollectionState> = { air: missing }) {
  const current = new Map<string, Pick<CollectionEntry, "owned" | "mastered">>(
    Object.entries(states),
  )
  const pending = new Set<string>()
  const errors: unknown[] = []
  const requests: {
    id: string
    state: CollectionState
    resolve: (value: CollectionMutationResponse) => void
    reject: (reason: unknown) => void
  }[] = []
  const entries: CollectionEntry[] = Object.entries(states).map(
    ([spriteId, state]) => ({
      ...state,
      spriteId,
      updatedAt: null,
    }),
  )
  const sync = createCollectionSync({
    entries,
    save: (id, state) => {
      const request = Promise.withResolvers<CollectionMutationResponse>()
      requests.push({
        id,
        state,
        resolve: request.resolve,
        reject: request.reject,
      })
      return request.promise
    },
    onPending: (id, saving) => {
      if (saving) pending.add(id)
      else pending.delete(id)
    },
    onSaved: () => {},
    onError: (_id, error) => errors.push(error),
  })

  sync.subscribe(() => {
    current.clear()
    for (const [id, { owned, mastered }] of sync.getSnapshot())
      current.set(id, { owned, mastered })
  })

  async function succeed(index: number) {
    const request = requests[index]!
    request.resolve({
      entry: {
        ...request.state,
        spriteId: request.id,
        updatedAt: `2026-09-05T12:00:0${index}Z`,
      },
      progress: { total: entries.length, owned: 0, mastered: 0 },
    })
    await setImmediate()
  }

  async function fail(index: number) {
    requests[index]!.reject(new Error("Save failed"))
    await setImmediate()
  }

  return { sync, current, pending, errors, requests, succeed, fail }
}

test("capture updates immediately before the request resolves", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  assert.deepEqual(h.current.get("air"), captured)
  assert.equal(h.pending.has("air"), true)
  assert.deepEqual(h.requests[0]?.state, captured)
  await h.succeed(0)
  assert.equal(h.pending.size, 0)
})

test("capture then mastery serializes and coalesces newer desired state", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.change("air", { field: "mastered", checked: true })
  h.sync.change("air", { field: "mastered", checked: false })
  h.sync.change("air", { field: "mastered", checked: true })
  const desired = mastered
  assert.deepEqual(h.current.get("air"), desired)
  assert.equal(h.requests.length, 1)
  await h.succeed(0)
  assert.deepEqual(h.current.get("air"), desired)
  assert.equal(h.requests.length, 2)
  assert.deepEqual(h.requests[1]?.state, desired)
  await h.succeed(1)
  assert.deepEqual(h.current.get("air"), desired)
  assert.equal(h.pending.size, 0)
})

test("capture then off keeps the newer intent when capture succeeds", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.change("air", { field: "mastered", checked: true })
  h.sync.change("air", { field: "owned", checked: false })
  assert.deepEqual(h.current.get("air"), missing)
  await h.succeed(0)
  assert.deepEqual(h.current.get("air"), missing)
  assert.deepEqual(h.requests[1]?.state, missing)
  await h.succeed(1)
  assert.equal(h.requests.length, 2)
})

test("latest failure restores the last confirmed server state", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.change("air", { field: "mastered", checked: true })
  await h.succeed(0)
  await h.fail(1)
  assert.deepEqual(h.current.get("air"), captured)
  assert.equal(h.errors.length, 1)
  assert.equal(h.pending.size, 0)
  h.sync.change("air", { field: "mastered", checked: true })
  assert.deepEqual(h.requests[2]?.state, mastered)
  await h.succeed(2)
  assert.deepEqual(h.current.get("air"), mastered)
})

test("an earlier failure preserves and saves newer intent", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.change("air", { field: "mastered", checked: true })
  await h.fail(0)
  assert.deepEqual(h.current.get("air"), mastered)
  assert.deepEqual(h.requests[1]?.state, mastered)
  assert.equal(h.pending.has("air"), true)
  await h.succeed(1)
  assert.deepEqual(h.current.get("air"), mastered)
  assert.equal(h.pending.size, 0)
})

test("independent Sprite responses never overwrite another Sprite", async () => {
  const h = harness({ air: missing, dream: captured })
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.change("dream", { field: "mastered", checked: true })
  assert.equal(h.requests.length, 2)
  await h.succeed(1)
  assert.deepEqual(h.current.get("dream"), mastered)
  assert.equal(h.pending.has("air"), true)
  assert.equal(h.pending.has("dream"), false)
  await h.fail(0)
  assert.deepEqual(h.current.get("air"), missing)
  assert.deepEqual(h.current.get("dream"), mastered)
})

function entry(
  state: CollectionState,
  updatedAt: string | null,
  spriteId = "air",
): CollectionEntry {
  return { ...state, spriteId, updatedAt }
}

test("refresh preserves queued mastery while accepting confirmed server capture", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.change("air", { field: "mastered", checked: true })
  const snapshot = entry(captured, "2026-09-05T12:00:00Z")
  h.sync.reconcile([snapshot])
  assert.deepEqual(
    [...h.sync.getSnapshot().values()],
    [{ ...snapshot, ...mastered }],
  )
  assert.equal(h.pending.has("air"), true)
  await h.succeed(0)
  assert.deepEqual(h.requests[1]?.state, mastered)
  await h.fail(1)
  assert.deepEqual(h.current.get("air"), captured)
})

test("stale snapshots and delayed action responses cannot overwrite newer confirmed state", async () => {
  const h = harness()
  h.sync.change("air", { field: "owned", checked: true })
  const newer = entry(mastered, "2026-09-05T12:01:00Z")
  h.sync.reconcile([newer])
  assert.deepEqual(
    [...h.sync.getSnapshot().values()],
    [{ ...newer, ...captured }],
  )
  await h.succeed(0)
  assert.deepEqual(h.current.get("air"), mastered)
  h.sync.reconcile([entry(missing, null)])
  assert.deepEqual([...h.sync.getSnapshot().values()], [newer])
})

test("idle refresh adopts remote state and registers new catalog entries", async () => {
  const h = harness()
  const remote = entry(captured, "2026-09-05T12:00:00Z")
  const added = entry(missing, null, "dream")
  h.sync.reconcile([remote, added])
  assert.deepEqual([...h.sync.getSnapshot().values()], [remote, added])
  h.sync.reconcile([remote, added])
  assert.deepEqual([...h.sync.getSnapshot().values()], [remote, added])
  h.sync.change("air", { field: "mastered", checked: true })
  assert.deepEqual(h.requests[0]?.state, mastered)
  h.sync.change("dream", { field: "owned", checked: true })
  assert.deepEqual(h.requests[1]?.state, captured)
  await h.succeed(0)
  await h.succeed(1)
})

test("refresh removes absent idle lanes but preserves pending writes", async () => {
  const h = harness({ air: missing, dream: missing })
  h.sync.change("air", { field: "owned", checked: true })
  h.sync.reconcile([])
  assert.deepEqual([...h.sync.getSnapshot().values()], [entry(captured, null)])
  assert.throws(() => h.sync.change("dream", { field: "owned", checked: true }))
  h.sync.change("air", { field: "mastered", checked: true })
  await h.succeed(0)
  assert.deepEqual(h.requests[1]?.state, mastered)
  await h.succeed(1)
  assert.equal(h.pending.size, 0)
  h.sync.reconcile([])
  assert.equal(h.sync.getSnapshot().size, 0)
  assert.throws(() => h.sync.change("air", { field: "owned", checked: false }))
})

test("queue snapshots contain only collection state and publish through a stable subscription", () => {
  const h = harness()
  let notifications = 0
  const unsubscribe = h.sync.subscribe(() => {
    notifications++
  })
  const oldMetadata = {
    ...entry(captured, "2026-09-05T12:00:00Z"),
    helpers: ["old friend"],
    description: "old description",
  }
  h.sync.reconcile([oldMetadata])
  const snapshot = h.sync.getSnapshot()
  assert.equal(h.sync.getSnapshot(), snapshot)
  assert.deepEqual(snapshot.get("air"), entry(captured, "2026-09-05T12:00:00Z"))
  h.sync.reconcile([entry(missing, null)])
  assert.deepEqual(
    [...h.sync.getSnapshot().values()],
    [entry(captured, "2026-09-05T12:00:00Z")],
  )
  assert.equal(notifications, 2)
  unsubscribe()
  h.sync.reconcile([])
  assert.equal(notifications, 2)
})
