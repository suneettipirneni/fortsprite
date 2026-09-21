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
import { Badge } from "@workspace/ui/components/badge"

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
  currentSeasonId: number | null
  notice: CollectionNotice | null
  onRemovedFocus: () => void
  onChange: (sprite: Sprite, change: CollectionChange) => void
}

type VirtualizedSpriteGridProps = SpriteGridProps & {
  items: Sprite[]
}

type VirtualizedSpriteGroupsProps = SpriteGridProps & {
  groups: Array<{
    baseName: string
    items: Sprite[]
    progress: { captured: number; mastered: number; total: number }
  }>
}

const GRID_GAP = 12
const GROUP_GAP = 32
const MOBILE_GRID_GAP = 8
const MOBILE_GROUP_GAP = 20
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
    if (width >= 336) return 3
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
  gap,
  view,
  pendingIds,
  availabilityKnown,
  currentSeasonId,
  notice,
  onRemovedFocus,
  onChange,
}: Omit<SpriteGridProps, "gridSize"> & {
  items: Sprite[]
  columns: number
  gap: number
}) {
  return (
    <div
      className="grid"
      style={{
        gap,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {items.map((sprite) => (
        <SpriteTile
          key={sprite.id}
          sprite={sprite}
          view={view}
          pending={pendingIds.has(sprite.id)}
          availabilityKnown={availabilityKnown}
          currentSeasonId={currentSeasonId}
          onRemovedFocus={onRemovedFocus}
          notice={notice?.spriteId === sprite.id ? notice : null}
          onChange={(change) => onChange(sprite, change)}
        />
      ))}
    </div>
  )
}

function SpriteGroupHeading({
  baseName,
  captured,
  mastered,
  total,
}: {
  baseName: string
  captured: number
  mastered: number
  total: number
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-white/10 pb-3">
      <h2 className="truncate text-lg font-semibold">{baseName}</h2>
      <Badge
        variant="captured"
        aria-label={`${captured} of ${total} variants captured`}
        className="shrink-0 font-normal tabular-nums"
      >
        <span className="font-semibold">{captured}</span>
        <span aria-hidden="true">/</span>
        <span>{total}</span>
        <span>captured</span>
      </Badge>
      <Badge
        variant="mastered"
        aria-label={`${mastered} of ${total} variants mastered`}
        className="shrink-0 font-normal tabular-nums"
      >
        <span className="font-semibold">{mastered}</span>
        <span aria-hidden="true">/</span>
        <span>{total}</span>
        <span>mastered</span>
      </Badge>
    </div>
  )
}

export function VirtualizedSpriteGrid({
  items,
  view,
  gridSize,
  ...tileProps
}: VirtualizedSpriteGridProps) {
  "use no memo"

  // React Compiler must not cache reads from TanStack Virtual's mutable instance.
  const hydrated = useHydrated()
  const { ref, width, scrollMargin } = useVirtualContainerMeasurements()
  const columns = columnsForWidth(width, view, gridSize)
  const gap = width >= 640 ? GRID_GAP : MOBILE_GRID_GAP
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
    gap,
    getItemKey,
    initialRect: { width: 0, height: 900 },
    overscan: 3,
    scrollMargin,
  })
  const virtualRows = virtualizer.getVirtualItems()

  if (!hydrated) {
    const initialItems = rows[0] ?? []
    return (
      <div
        ref={ref}
        data-testid="virtualized-sprite-grid"
        data-hydrated="false"
        data-total-items={items.length}
        data-rendered-items={initialItems.length}
      >
        <SpriteTiles
          items={initialItems}
          columns={columns}
          gap={gap}
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
      data-hydrated="true"
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
            gap={gap}
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
  "use no memo"

  // React Compiler must not cache reads from TanStack Virtual's mutable instance.
  const hydrated = useHydrated()
  const { ref, width, scrollMargin } = useVirtualContainerMeasurements()
  const columns = columnsForWidth(width, view, gridSize)
  const gridGap = width >= 640 ? GRID_GAP : MOBILE_GRID_GAP
  const groupGap = width >= 640 ? GROUP_GAP : MOBILE_GROUP_GAP
  const getItemKey = useCallback(
    (index: number) => groups[index]?.baseName ?? index,
    [groups],
  )
  const estimateSize = useCallback(
    (index: number) => {
      const itemCount = groups[index]?.items.length ?? 1
      return (
        72 +
        Math.ceil(itemCount / columns) * estimatedRowHeight(view, gridSize) +
        Math.max(0, Math.ceil(itemCount / columns) - 1) * gridGap
      )
    },
    [columns, gridGap, gridSize, groups, view],
  )
  const virtualizer = useWindowVirtualizer({
    count: groups.length,
    enabled: hydrated,
    estimateSize,
    gap: groupGap,
    getItemKey,
    initialRect: { width: 0, height: 900 },
    overscan: 2,
    scrollMargin,
  })
  const virtualGroups = virtualizer.getVirtualItems()

  if (!hydrated) {
    const { baseName, items, progress } = groups[0] ?? {
      baseName: "",
      items: [],
      progress: { captured: 0, mastered: 0, total: 0 },
    }
    return (
      <div
        ref={ref}
        data-testid="virtualized-sprite-groups"
        data-hydrated="false"
        data-total-groups={groups.length}
        data-rendered-groups={groups.length > 0 ? 1 : 0}
      >
        <section aria-label={baseName} className="space-y-3 sm:space-y-4">
          <SpriteGroupHeading baseName={baseName} {...progress} />
          <SpriteTiles
            items={items}
            columns={columns}
            gap={gridGap}
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
      data-hydrated="true"
      data-total-groups={groups.length}
      data-rendered-groups={virtualGroups.length}
      style={{
        height: virtualizer.getTotalSize(),
        position: "relative",
        width: "100%",
      }}
    >
      {virtualGroups.map((virtualGroup) => {
        const { baseName, items, progress } = groups[virtualGroup.index] ?? {
          baseName: "",
          items: [],
          progress: { captured: 0, mastered: 0, total: 0 },
        }
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
            <section aria-label={baseName} className="space-y-3 sm:space-y-4">
              <SpriteGroupHeading baseName={baseName} {...progress} />
              <SpriteTiles
                items={items}
                columns={columns}
                gap={gridGap}
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
