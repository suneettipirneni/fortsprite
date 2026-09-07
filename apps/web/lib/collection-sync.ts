import type {
  CollectionEntry,
  CollectionMutationResponse,
  CollectionState,
} from "@workspace/contracts"

import {
  updateCollectionState,
  type CollectionChange,
} from "./collection-state"

type SyncLane = {
  confirmed: CollectionEntry
  desired: CollectionState
  revision: number
  running: boolean
}

type CollectionSyncOptions = {
  entries: CollectionEntry[]
  save: (
    id: string,
    state: CollectionState,
  ) => Promise<CollectionMutationResponse>
  onPending: (id: string, pending: boolean) => void
  onSaved: (entry: CollectionEntry) => void
  onError: (id: string, error: unknown) => void
}

function stateOf(entry: CollectionEntry): CollectionState {
  return entry.owned
    ? { owned: true, mastered: entry.mastered }
    : { owned: false, mastered: false }
}

export function createCollectionSync(options: CollectionSyncOptions) {
  const lanes = new Map<string, SyncLane>(
    options.entries.map((entry) => [
      entry.spriteId,
      {
        confirmed: entry,
        desired: stateOf(entry),
        revision: 0,
        running: false,
      },
    ]),
  )

  const listeners = new Set<() => void>()
  let snapshot = new Map<string, CollectionEntry>()

  function publish() {
    snapshot = new Map(
      [...lanes].map(([id, lane]) => [
        id,
        {
          spriteId: id,
          updatedAt: lane.confirmed.updatedAt,
          ...lane.desired,
        },
      ]),
    )
    for (const listener of listeners) listener()
  }
  publish()

  function subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function getSnapshot() {
    return snapshot
  }

  async function flush(id: string, lane: SyncLane) {
    lane.running = true
    options.onPending(id, true)

    try {
      while (true) {
        const revision = lane.revision
        const desired = lane.desired

        try {
          const { entry } = await options.save(id, desired)
          if ((entry.updatedAt ?? "") >= (lane.confirmed.updatedAt ?? ""))
            lane.confirmed = entry
          options.onSaved(lane.confirmed)
          publish()

          if (lane.revision === revision) {
            lane.desired = stateOf(lane.confirmed)
            publish()
          }
        } catch (error) {
          if (lane.revision === revision) {
            lane.desired = stateOf(lane.confirmed)
            publish()
          }
          options.onError(id, error)
        }

        if (lane.revision === revision) break
      }
    } finally {
      lane.running = false
      options.onPending(id, false)
    }
  }

  function change(id: string, command: CollectionChange): CollectionState {
    const lane = lanes.get(id)
    if (!lane) throw new Error(`Sprite ${id} is not in this collection.`)
    const desired = updateCollectionState(lane.desired, command)
    if (
      desired.owned === lane.desired.owned &&
      desired.mastered === lane.desired.mastered
    )
      return lane.desired

    lane.desired = desired
    lane.revision += 1
    publish()
    if (!lane.running) void flush(id, lane)
    return desired
  }

  function reconcile(entries: CollectionEntry[]) {
    const visibleIds = new Set(entries.map((entry) => entry.spriteId))
    for (const [id, lane] of lanes)
      if (!visibleIds.has(id) && !lane.running) lanes.delete(id)

    for (const entry of entries) {
      let lane = lanes.get(entry.spriteId)
      if (!lane) {
        lane = {
          confirmed: entry,
          desired: stateOf(entry),
          revision: 0,
          running: false,
        }
        lanes.set(entry.spriteId, lane)
      } else if ((entry.updatedAt ?? "") >= (lane.confirmed.updatedAt ?? "")) {
        lane.confirmed = entry
        if (!lane.running) lane.desired = stateOf(entry)
      }
    }
    publish()
  }

  return { change, reconcile, subscribe, getSnapshot }
}
