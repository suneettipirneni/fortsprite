"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useWindowVirtualizer } from "@tanstack/react-virtual"

import type { CollectionChange } from "@/lib/collection-state"
import type { Sprite } from "@/lib/catalog-presentation"
import {
  SpriteTile,
  type CollectionNotice,
} from "@/components/collection-sprite-tile"

export type CollectionGridSize = "small" | "medium" | "large"

type SpriteGridProps = {
  view: "list" | "grid"
  gridSize: CollectionGridSize
  pendingIds: Set<string>
  availabilityKnown: boolean
  notice: CollectionNotice | null
  onRemovedFocus: () => void
  onChange: (sprite: Sprite, change: CollectionChange) => void
}

type VirtualizedSpriteGridProps = SpriteGridProps & {
  items: Sprite[]
}

type VirtualizedSpriteGroupsProps = SpriteGridProps & {
  groups: Array<[baseName: string, items: Sprite[]]>
}

const GRID_GAP = 12
const GROUP_GAP = 32
const subscribeToHydration = () => () => {}

function useHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  )
}

function columnsForWidth(
  width: number,
  view: "list" | "grid",
  gridSize: CollectionGridSize,
) {
  if (view === "list") return 1

  if (gridSize === "small") {
    if (width >= 1024) return 8
    if (width >= 768) return 6
    if (width >= 576) return 4
    if (width >= 400) return 3
    return 2
  }

  if (gridSize === "medium") {
    if (width >= 1024) return 6
    if (width >= 768) return 5
    if (width >= 576) return 3
    return 2
  }

  if (width >= 768) return 4
  if (width >= 576) return 3
  if (width >= 384) return 2
  return 1
}

function estimatedRowHeight(
  view: "list" | "grid",
  gridSize: CollectionGridSize,
) {
  if (view === "list") return 104
  if (gridSize === "small") return 300
  if (gridSize === "medium") return 360
  return 480
}

function useVirtualContainerMeasurements() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [scrollMargin, setScrollMargin] = useState(0)

  const measure = useCallback(() => {
    const element = ref.current
    if (!element) return

    const bounds = element.getBoundingClientRect()
    setWidth((current) => (current === bounds.width ? current : bounds.width))
    const nextScrollMargin = bounds.top + window.scrollY
    setScrollMargin((current) =>
      current === nextScrollMargin ? current : nextScrollMargin,
    )
  }, [])

  useLayoutEffect(measure)
  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [measure])

  return { ref, width, scrollMargin }
}

function SpriteTiles({
  items,
  columns,
  view,
  pendingIds,
  availabilityKnown,
  notice,
  onRemovedFocus,
  onChange,
}: Omit<SpriteGridProps, "gridSize"> & {
  items: Sprite[]
  columns: number
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((sprite) => (
        <SpriteTile
          key={sprite.id}
          sprite={sprite}
          view={view}
          pending={pendingIds.has(sprite.id)}
          availabilityKnown={availabilityKnown}
          onRemovedFocus={onRemovedFocus}
          notice={notice?.spriteId === sprite.id ? notice : null}
          onChange={(change) => onChange(sprite, change)}
        />
      ))}
    </div>
  )
}

export function VirtualizedSpriteGrid({
  items,
  view,
  gridSize,
  ...tileProps
}: VirtualizedSpriteGridProps) {
  const hydrated = useHydrated()
  const { ref, width, scrollMargin } = useVirtualContainerMeasurements()
  const columns = columnsForWidth(width, view, gridSize)
  const rows = useMemo(() => {
    const nextRows: Sprite[][] = []
    for (let index = 0; index < items.length; index += columns) {
      nextRows.push(items.slice(index, index + columns))
    }
    return nextRows
  }, [columns, items])
  const getItemKey = useCallback(
    (index: number) => rows[index]?.map((sprite) => sprite.id).join(":") ?? index,
    [rows],
  )
  const estimateSize = useCallback(
    () => estimatedRowHeight(view, gridSize),
    [gridSize, view],
  )
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    enabled: hydrated,
    estimateSize,
    gap: GRID_GAP,
    getItemKey,
    initialRect: { width: 0, height: 900 },
    overscan: 3,
    scrollMargin,
    useFlushSync: false,
  })
  const virtualRows = virtualizer.getVirtualItems()

  if (!hydrated) {
    const initialItems = rows[0] ?? []
    return (
      <div
        ref={ref}
        data-testid="virtualized-sprite-grid"
        data-total-items={items.length}
        data-rendered-items={initialItems.length}
      >
        <SpriteTiles
          items={initialItems}
          columns={columns}
          view={view}
          {...tileProps}
        />
      </div>
    )
  }

  return (
    <div
      ref={ref}
      data-testid="virtualized-sprite-grid"
      data-total-items={items.length}
      data-rendered-items={virtualRows.reduce(
        (total, row) => total + (rows[row.index]?.length ?? 0),
        0,
      )}
      style={{
        height: virtualizer.getTotalSize(),
        position: "relative",
        width: "100%",
      }}
    >
      {virtualRows.map((virtualRow) => (
        <div
          key={virtualRow.key}
          ref={virtualizer.measureElement}
          data-index={virtualRow.index}
          style={{
            left: 0,
            position: "absolute",
            top: 0,
            transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
            width: "100%",
          }}
        >
          <SpriteTiles
            items={rows[virtualRow.index] ?? []}
            columns={columns}
            view={view}
            {...tileProps}
          />
        </div>
      ))}
    </div>
  )
}

export function VirtualizedSpriteGroups({
  groups,
  view,
  gridSize,
  ...tileProps
}: VirtualizedSpriteGroupsProps) {
  const hydrated = useHydrated()
  const { ref, width, scrollMargin } = useVirtualContainerMeasurements()
  const columns = columnsForWidth(width, view, gridSize)
  const getItemKey = useCallback(
    (index: number) => groups[index]?.[0] ?? index,
    [groups],
  )
  const estimateSize = useCallback(
    (index: number) => {
      const itemCount = groups[index]?.[1].length ?? 1
      return (
        72 +
        Math.ceil(itemCount / columns) * estimatedRowHeight(view, gridSize) +
        Math.max(0, Math.ceil(itemCount / columns) - 1) * GRID_GAP
      )
    },
    [columns, gridSize, groups, view],
  )
  const virtualizer = useWindowVirtualizer({
    count: groups.length,
    enabled: hydrated,
    estimateSize,
    gap: GROUP_GAP,
    getItemKey,
    initialRect: { width: 0, height: 900 },
    overscan: 2,
    scrollMargin,
    useFlushSync: false,
  })
  const virtualGroups = virtualizer.getVirtualItems()

  if (!hydrated) {
    const [baseName, items] = groups[0] ?? ["", []]
    return (
      <div
        ref={ref}
        data-testid="virtualized-sprite-groups"
        data-total-groups={groups.length}
        data-rendered-groups={groups.length > 0 ? 1 : 0}
      >
        <section aria-label={baseName} className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 border-b border-white/15 pb-3">
            <h2 className="text-lg font-semibold">{baseName}</h2>
            <span className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "variant" : "variants"}
            </span>
          </div>
          <SpriteTiles
            items={items}
            columns={columns}
            view={view}
            {...tileProps}
          />
        </section>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      data-testid="virtualized-sprite-groups"
      data-total-groups={groups.length}
      data-rendered-groups={virtualGroups.length}
      style={{
        height: virtualizer.getTotalSize(),
        position: "relative",
        width: "100%",
      }}
    >
      {virtualGroups.map((virtualGroup) => {
        const [baseName, items] = groups[virtualGroup.index] ?? ["", []]
        return (
          <div
            key={virtualGroup.key}
            ref={virtualizer.measureElement}
            data-index={virtualGroup.index}
            style={{
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translateY(${virtualGroup.start - virtualizer.options.scrollMargin}px)`,
              width: "100%",
            }}
          >
            <section aria-label={baseName} className="space-y-4">
              <div className="flex items-baseline justify-between gap-3 border-b border-white/15 pb-3">
                <h2 className="text-lg font-semibold">{baseName}</h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "variant" : "variants"}
                </span>
              </div>
              <SpriteTiles
                items={items}
                columns={columns}
                view={view}
                {...tileProps}
              />
            </section>
          </div>
        )
      })}
    </div>
  )
}
