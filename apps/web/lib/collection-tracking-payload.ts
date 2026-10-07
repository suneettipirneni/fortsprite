import type {
  CollectionEntry,
  CollectionTrackingSnapshot,
  PublicProfile,
} from "@workspace/contracts"

// The public catalog already describes each Sprite. Private tracking only needs
// its ID and changes from the untouched state, plus each friend's profile once.
export type CollectionTrackingPayload = {
  catalogRevision: string
  entries: (string | CollectionEntry)[]
  profiles: PublicProfile[]
  helpers: [spriteId: string, profileIndex: number, mastered: boolean][]
}

export function packCollectionTracking(
  snapshot: CollectionTrackingSnapshot,
): CollectionTrackingPayload {
  const profiles: PublicProfile[] = []
  const profileIndexes = new Map<string, number>()
  return {
    catalogRevision: snapshot.catalogRevision,
    entries: snapshot.entries.map((entry) =>
      !entry.owned && !entry.mastered && entry.updatedAt === null
        ? entry.spriteId
        : entry,
    ),
    profiles,
    helpers: snapshot.helpers.map(({ spriteId, profile, mastered }) => {
      let index = profileIndexes.get(profile.id)
      if (index === undefined) {
        index = profiles.length
        profiles.push(profile)
        profileIndexes.set(profile.id, index)
      }
      return [spriteId, index, mastered]
    }),
  }
}

const snapshots = new WeakMap<CollectionTrackingPayload, CollectionTrackingSnapshot>()

export function unpackCollectionTracking(
  payload: CollectionTrackingPayload,
): CollectionTrackingSnapshot {
  const existing = snapshots.get(payload)
  if (existing) return existing
  const snapshot: CollectionTrackingSnapshot = {
    catalogRevision: payload.catalogRevision,
    entries: payload.entries.map((entry) => typeof entry === "string"
      ? { spriteId: entry, owned: false, mastered: false, updatedAt: null }
      : entry),
    helpers: payload.helpers.map(([spriteId, index, mastered]) => {
      const profile = payload.profiles[index]
      if (!profile) throw new Error("Collection helper profile is missing")
      return { spriteId, profile, mastered }
    }),
  }
  snapshots.set(payload, snapshot)
  return snapshot
}
