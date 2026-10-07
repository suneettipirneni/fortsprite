"use client"

import { createContext, startTransition, Suspense, use, useContext, useLayoutEffect, useState, useSyncExternalStore } from "react"
import type { CatalogItem, CollectionEntry, CollectionSnapshot, CollectionTrackingSnapshot, SpriteHelper } from "@workspace/contracts"
import { updateCollectionAction } from "@/app/actions/collection"
import { createCollectionSync } from "@/lib/collection-sync"
import type { CollectionChange } from "@/lib/collection-state"
import type { CollectionNotice } from "@/components/collection-sprite-tile"
import type { Sprite } from "@/lib/catalog-presentation"
import { cn } from "@workspace/ui/lib/utils"
import { notifyOtherTabs } from "@/lib/cross-tab-refresh"
import { unpackCollectionTracking, type CollectionTrackingPayload } from "@/lib/collection-tracking-payload"

type TrackingContextValue = {
  collection: Promise<CollectionTrackingPayload>
  catalog: Map<string, CatalogItem>
  sync: ReturnType<typeof createCollectionSync>
  pendingIds: Set<string>
  notice: CollectionNotice | null
  clearNotice: (id: string) => void
}

const TrackingContext = createContext<TrackingContextValue | null>(null)

type TrackingIndex = {
  entries: Map<string, CollectionEntry>
  helpers: Map<string, SpriteHelper[]>
}

const trackingIndexes = new WeakMap<CollectionTrackingSnapshot, TrackingIndex>()

function indexTracking(snapshot: CollectionTrackingSnapshot): TrackingIndex {
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

export function TrackingSkeleton({ className }: { className?: string }) {
  return <span role="status" aria-label="Loading collection tracking" data-testid="tracking-skeleton"
    className={cn("inline-block h-5 w-12 animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)} />
}

export function useCollectionControls() {
  const context = useContext(TrackingContext)
  if (!context) throw new Error("Collection tracking requires its provider")
  return context
}

export function CollectionTrackingProvider({ collection, catalog, children }: {
  collection: Promise<CollectionTrackingPayload>
  catalog: Map<string, CatalogItem>
  children: React.ReactNode
}) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [notice, setNotice] = useState<CollectionNotice | null>(null)
  const [sync] = useState(() => createCollectionSync({
    entries: [],
    save: (id, state) => new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await updateCollectionAction(id, state)
          if (result.ok) {
            notifyOtherTabs()
            resolve(result.data)
          }
          else reject(new Error(result.error))
        } catch {
          reject(new Error("The connection was interrupted. Check your connection and try again."))
        }
      })
    }),
    onPending: (id, pending) => setPendingIds((current) => {
      const next = new Set(current)
      if (pending) next.add(id)
      else next.delete(id)
      return next
    }),
    onSaved: (entry) => setNotice((current) => current?.spriteId === entry.spriteId ? null : current),
    onError: (id, error) => setNotice({
      spriteId: id,
      message: error instanceof Error ? error.message : "Your collection could not be saved. Please try again.",
    }),
  }))
  return <TrackingContext value={{ collection, catalog, sync, pendingIds, notice,
    clearNotice: (id) => setNotice((current) => current?.spriteId === id ? null : current),
  }}>
    <Suspense fallback={null}><TrackingReconciler /></Suspense>
    {children}
  </TrackingContext>
}

function TrackingReconciler() {
  const { collection, sync } = useCollectionControls()
  const snapshot = unpackCollectionTracking(use(collection))
  useLayoutEffect(() => { sync.reconcile(snapshot.entries) }, [snapshot, sync])
  return null
}

export function useTrackedCollection(): CollectionSnapshot {
  const { collection, catalog, sync, pendingIds } = useCollectionControls()
  const snapshot = unpackCollectionTracking(use(collection))
  const queued = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot)
  const tracking = indexTracking(snapshot)
  const items = [...catalog.values()].flatMap((item) => {
    const serverEntry = tracking.entries.get(item.id)
    if (!serverEntry) return []
    const queuedEntry = queued.get(item.id)
    const entry = queuedEntry && (pendingIds.has(item.id) || (queuedEntry.updatedAt ?? "") >= (serverEntry.updatedAt ?? ""))
      ? queuedEntry
      : serverEntry
    return [{ ...item, ...entry, helpers: tracking.helpers.get(item.id) ?? [] }]
  })
  const updatedAt = items.reduce<string | null>((latest, item) =>
    item.updatedAt && (!latest || item.updatedAt > latest) ? item.updatedAt : latest, null)
  return { items, updatedAt, progress: {
    total: items.length,
    owned: items.filter((item) => item.owned).length,
    mastered: items.filter((item) => item.mastered).length,
  } }
}

export function CollectionTracking({ children, fallback = <TrackingSkeleton /> }: {
  children: (snapshot: CollectionSnapshot) => React.ReactNode
  fallback?: React.ReactNode
}) {
  return <Suspense fallback={fallback}><TrackingValue>{children}</TrackingValue></Suspense>
}

function TrackingValue({ children }: { children: (snapshot: CollectionSnapshot) => React.ReactNode }) {
  return children(useTrackedCollection())
}

export function SpriteTracking({ spriteId, onChange, children, fallback = <TrackingSkeleton /> }: {
  spriteId: string
  onChange?: (change: CollectionChange) => void
  children: (value: { sprite: Sprite; onChange: (change: CollectionChange) => void }) => React.ReactNode
  fallback?: React.ReactNode
}) {
  return <Suspense fallback={fallback}>
    <SpriteTrackingValue spriteId={spriteId} onChange={onChange}>{children}</SpriteTrackingValue>
  </Suspense>
}

function SpriteTrackingValue({ spriteId, onChange, children }: {
  spriteId: string
  onChange?: (change: CollectionChange) => void
  children: (value: { sprite: Sprite; onChange: (change: CollectionChange) => void }) => React.ReactNode
}) {
  const { collection, catalog, sync, pendingIds } = useCollectionControls()
  const snapshot = unpackCollectionTracking(use(collection))
  const queued = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot)
  const tracking = indexTracking(snapshot)
  const item = catalog.get(spriteId)
  const serverEntry = tracking.entries.get(spriteId)
  if (!item || !serverEntry) return <span className="text-xs text-muted-foreground">Tracking unavailable</span>
  const queuedEntry = queued.get(spriteId)
  const entry = queuedEntry && (pendingIds.has(spriteId) || (queuedEntry.updatedAt ?? "") >= (serverEntry.updatedAt ?? ""))
    ? queuedEntry
    : serverEntry
  const sprite = { ...item, ...entry, helpers: tracking.helpers.get(spriteId) ?? [] }
  return children({ sprite, onChange: (change) => {
    sync.reconcile(snapshot.entries)
    if (onChange) onChange(change)
    else sync.change(spriteId, change)
  } })
}
