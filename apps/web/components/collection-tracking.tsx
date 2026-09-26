"use client"

import { createContext, startTransition, Suspense, use, useContext, useLayoutEffect, useState, useSyncExternalStore } from "react"
import type { CatalogItem, CollectionSnapshot } from "@workspace/contracts"
import { updateCollectionAction } from "@/app/actions/collection"
import { createCollectionSync } from "@/lib/collection-sync"
import type { CollectionChange } from "@/lib/collection-state"
import type { CollectionNotice } from "@/components/collection-sprite-tile"
import type { Sprite } from "@/lib/catalog-presentation"
import { cn } from "@workspace/ui/lib/utils"

type TrackingContextValue = {
  collection: Promise<CollectionSnapshot>
  catalog: Map<string, CatalogItem>
  sync: ReturnType<typeof createCollectionSync>
  pendingIds: Set<string>
  notice: CollectionNotice | null
  clearNotice: (id: string) => void
}

const TrackingContext = createContext<TrackingContextValue | null>(null)

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
  collection: Promise<CollectionSnapshot>
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
          if (result.ok) resolve(result.data)
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
  const snapshot = use(collection)
  useLayoutEffect(() => { sync.reconcile(snapshot.items) }, [snapshot, sync])
  return null
}

export function useTrackedCollection() {
  const { collection, catalog, sync, pendingIds } = useCollectionControls()
  const snapshot = use(collection)
  const queued = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot)
  const items = snapshot.items.filter((item) => catalog.has(item.id)).map((item) => {
    const entry = queued.get(item.spriteId)
    return entry && (pendingIds.has(item.id) || (entry.updatedAt ?? "") >= (item.updatedAt ?? ""))
      ? { ...item, ...catalog.get(item.id), ...entry }
      : { ...item, ...catalog.get(item.id) }
  })
  const updatedAt = items.reduce<string | null>((latest, item) =>
    item.updatedAt && (!latest || item.updatedAt > latest) ? item.updatedAt : latest, null)
  return { ...snapshot, items, updatedAt, progress: {
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
  const { collection, sync, pendingIds } = useCollectionControls()
  const snapshot = use(collection)
  const queued = useSyncExternalStore(sync.subscribe, sync.getSnapshot, sync.getSnapshot)
  const item = snapshot.items.find((item) => item.id === spriteId)
  if (!item) return <span className="text-xs text-muted-foreground">Tracking unavailable</span>
  const entry = queued.get(spriteId)
  const sprite = entry && (pendingIds.has(spriteId) || (entry.updatedAt ?? "") >= (item.updatedAt ?? ""))
    ? { ...item, ...entry }
    : item
  return children({ sprite, onChange: (change) => {
    sync.reconcile(snapshot.items)
    if (onChange) onChange(change)
    else sync.change(spriteId, change)
  } })
}
