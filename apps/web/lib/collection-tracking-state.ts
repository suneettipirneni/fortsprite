import type {
  CatalogItem,
  CollectionEntry,
  CollectionSnapshot,
  CollectionTrackingSnapshot,
  SpriteHelper,
} from "@workspace/contracts"

type TrackingIndex = {
  entries: Map<string, CollectionEntry>
  helpers: Map<string, SpriteHelper[]>
}

const trackingIndexes = new WeakMap<CollectionTrackingSnapshot, TrackingIndex>()

export function indexTracking(snapshot: CollectionTrackingSnapshot): TrackingIndex {
  const existing = trackingIndexes.get(snapshot)
  if (existing) return existing

  const entries = new Map(snapshot.entries.map((entry) => [entry.spriteId, entry]))
  const helpers = new Map<string, SpriteHelper[]>()
  for (const helper of snapshot.helpers) {
    const profiles = helpers.get(helper.spriteId) ?? []
    profiles.push({ ...helper.profile, mastered: helper.mastered })
    helpers.set(helper.spriteId, profiles)
  }
  const index = { entries, helpers }
  trackingIndexes.set(snapshot, index)
  return index
}

export function resolveTrackingEntry(
  serverEntry: CollectionEntry,
  queuedEntry: CollectionEntry | undefined,
  pending: boolean,
): CollectionEntry {
  return queuedEntry && (pending || (queuedEntry.updatedAt ?? "") >= (serverEntry.updatedAt ?? ""))
    ? queuedEntry
    : serverEntry
}

// One reader per collection provider: summary, filters, export, and group headings
// share a projection instead of each rebuilding the entire catalog on every write.
export function createCollectionSnapshotReader(catalog: Map<string, CatalogItem>) {
  let previous: {
    snapshot: CollectionTrackingSnapshot
    queued: Map<string, CollectionEntry>
    pending: Set<string>
    value: CollectionSnapshot
  } | undefined

  return function read(
    snapshot: CollectionTrackingSnapshot,
    queued: Map<string, CollectionEntry>,
    pending: Set<string>,
  ): CollectionSnapshot {
    if (previous?.snapshot === snapshot && previous.queued === queued && previous.pending === pending)
      return previous.value

    const tracking = indexTracking(snapshot)
    const items: CollectionSnapshot["items"] = []
    let updatedAt: string | null = null
    let owned = 0
    let mastered = 0
    for (const item of catalog.values()) {
      const serverEntry = tracking.entries.get(item.id)
      if (!serverEntry) continue
      const entry = resolveTrackingEntry(serverEntry, queued.get(item.id), pending.has(item.id))
      items.push({ ...item, ...entry, helpers: tracking.helpers.get(item.id) ?? [] })
      if (entry.updatedAt && (!updatedAt || entry.updatedAt > updatedAt)) updatedAt = entry.updatedAt
      if (entry.owned) owned++
      if (entry.mastered) mastered++
    }
    const value = { items, updatedAt, progress: { total: items.length, owned, mastered } }
    previous = { snapshot, queued, pending, value }
    return value
  }
}
