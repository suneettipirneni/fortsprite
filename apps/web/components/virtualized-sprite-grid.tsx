"use client"

import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useWindowVirtualizer, type Range } from "@tanstack/react-virtual"
import { Badge } from "@workspace/ui/components/badge"

import type { CollectionChange } from "@/lib/collection-state"
import type { CatalogItem } from "@workspace/contracts"
import { CollectionTracking, TrackingSkeleton } from "@/components/collection-tracking"
import { SpriteTile } from "@/components/collection-sprite-tile"
import { CollectionGroupScroller } from "@/components/collection-group-scroller"

export type CollectionGridSize = "small" | "medium" | "large"

type SpriteGridProps = {
  view: "list" | "grid"
  gridSize: CollectionGridSize
  availabilityKnown: boolean
  currentSeasonId: number | null
  onChange: (sprite: CatalogItem, change: CollectionChange) => void
}

type VirtualizedSpriteGridProps = SpriteGridProps & {
  items: CatalogItem[]
}

type VirtualizedSpriteGroupsProps = SpriteGridProps & {
  groups: Array<{
    baseName: string
    items: CatalogItem[]
    baseImagePath: string | null | undefined
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
  width: number,
  columns: number,
  gap: number,
  view: "list" | "grid",
  desktop: boolean,
) {
  if (view === "list") return desktop ? 80 : 64

  // Match SpriteTile's 4:3 portrait plus its caption and controls. Estimating
  // every card at 360px made the scroll range shrink as 240px cards mounted.
  const tileWidth = Math.max(0, width - (columns - 1) * gap) / columns
  return tileWidth * 3 / 4 + (desktop ? 113 : 109)
}

function useVirtualContainerMeasurements() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [scrollMargin, setScrollMargin] = useState(0)
  const [viewport, setViewport] = useState({ width: 0, height: 900 })
  const [scrollPaddingStart, setScrollPaddingStart] = useState(96)

  const measure = useCallback(() => {
    const element = ref.current
    if (!element) return

    const bounds = element.getBoundingClientRect()
    setScrollPaddingStart((document.querySelector("header")?.getBoundingClientRect().height ?? 80) + 16)
    setWidth((current) => (current === bounds.width ? current : bounds.width))
    const nextScrollMargin = bounds.top + window.scrollY
    setScrollMargin((current) =>
      current === nextScrollMargin ? current : nextScrollMargin,
    )
    setViewport((current) => current.width === window.innerWidth && current.height === window.innerHeight
      ? current
      : { width: window.innerWidth, height: window.innerHeight })
  }, [])

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    measure()
    let frame = 0
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(scheduleMeasure)
    // Toolbar wrapping and streamed content can move the grid without resizing
    // it. Observe its layout ancestors instead of forcing layout on every scroll
    // render just to rediscover the same document offset.
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor)
    }
    window.addEventListener("resize", scheduleMeasure)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [measure])

  return { ref, width, scrollMargin, viewport, scrollPaddingStart }
}

// The virtualizer parents opt out of React Compiler, so explicitly keep
// unchanged rows out of scroll-driven renders. Tracking subscriptions stay live.
const SpriteTiles = memo(function SpriteTiles({
  items,
  columns,
  gap,
  view,
  availabilityKnown,
  currentSeasonId,
  onChange,
}: Omit<SpriteGridProps, "gridSize"> & {
  items: CatalogItem[]
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
          availabilityKnown={availabilityKnown}
          currentSeasonId={currentSeasonId}
          onChange={(change) => onChange(sprite, change)}
        />
      ))}
    </div>
  )
})

const SpriteGroupHeading = memo(function SpriteGroupHeading({
  baseName,
  items,
}: {
  baseName: string
  items: CatalogItem[]
}) {
  const ids = new Set(items.map((item) => item.id))
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-white/10 pb-3">
      <h2 className="truncate text-lg font-semibold">{baseName}</h2>
      <CollectionTracking fallback={<TrackingSkeleton className="h-6 w-40" />}>{(snapshot) => {
        const items = snapshot.items.filter((item) => ids.has(item.id))
        const total = items.length
        const captured = items.filter((item) => item.owned).length
        const mastered = items.filter((item) => item.mastered).length
        return <>
          <Badge variant="captured" aria-label={`${captured} of ${total} variants captured`} className="shrink-0 font-normal tabular-nums">
            <span className="font-semibold">{captured}</span><span aria-hidden="true">/</span><span>{total}</span><span>captured</span>
          </Badge>
          <Badge variant="mastered" aria-label={`${mastered} of ${total} variants mastered`} className="shrink-0 font-normal tabular-nums">
            <span className="font-semibold">{mastered}</span><span aria-hidden="true">/</span><span>{total}</span><span>mastered</span>
          </Badge>
        </>
      }}</CollectionTracking>
    </div>
  )
})

export function VirtualizedSpriteGrid({
  items,
  view,
  gridSize,
  ...tileProps
}: VirtualizedSpriteGridProps) {
  "use no memo"

  // React Compiler must not cache reads from TanStack Virtual's mutable instance.
  const hydrated = useHydrated()
  const { ref, width, scrollMargin, viewport } = useVirtualContainerMeasurements()
  const columns = columnsForWidth(width, view, gridSize)
  const desktop = viewport.width >= 640
  const gap = desktop ? GRID_GAP : MOBILE_GRID_GAP
  const rowHeight = estimatedRowHeight(width, columns, gap, view, desktop)
  const rows = useMemo(() => {
    const nextRows: CatalogItem[][] = []
    for (let index = 0; index < items.length; index += columns) {
      nextRows.push(items.slice(index, index + columns))
    }
    return nextRows
  }, [columns, items])
  const getItemKey = useCallback(
    (index: number) => `${view}:${width}:${desktop}:${rows[index]?.map((sprite) => sprite.id).join(":") ?? index}`,
    [desktop, rows, view, width],
  )
  const estimateSize = useCallback(
    () => rowHeight,
    [rowHeight],
  )
  // This component opts out of compilation with "use no memo" above.
  // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual requires fresh reads from its mutable instance.
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    directDomUpdates: true,
    useAnimationFrameWithResizeObserver: true,
    enabled: hydrated,
    estimateSize,
    gap,
    getItemKey,
    initialRect: { width: 0, height: 900 },
    // Keep two screens ready in either direction, including compact list rows.
    overscan: Math.max(3, Math.ceil(viewport.height * 2 / (rowHeight + gap))),
    scrollMargin,
  })
  const setContainerRef = useCallback((element: HTMLDivElement | null) => {
    ref.current = element
    virtualizer.containerRef(element)
  }, [ref, virtualizer])
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
      ref={setContainerRef}
      data-testid="virtualized-sprite-grid"
      data-hydrated="true"
      data-total-items={items.length}
      data-rendered-items={virtualRows.reduce(
        (total, row) => total + (rows[row.index]?.length ?? 0),
        0,
      )}
      style={{
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
  const groupsId = useId()
  const { ref, width, scrollMargin, viewport, scrollPaddingStart } = useVirtualContainerMeasurements()
  const columns = columnsForWidth(width, view, gridSize)
  const desktop = viewport.width >= 640
  const gridGap = desktop ? GRID_GAP : MOBILE_GRID_GAP
  const groupGap = desktop ? GROUP_GAP : MOBILE_GROUP_GAP
  const rowHeight = estimatedRowHeight(width, columns, gridGap, view, desktop)
  const headingHeight = 41 + (desktop ? 16 : 12)
  const getItemKey = useCallback(
    (index: number) => `${view}:${width}:${desktop}:${groups[index]?.baseName}:${groups[index]?.items.length}`,
    [desktop, groups, view, width],
  )
  const estimateSize = useCallback(
    (index: number) => {
      const itemCount = groups[index]?.items.length ?? 1
      return (
        headingHeight +
        Math.ceil(itemCount / columns) * rowHeight +
        Math.max(0, Math.ceil(itemCount / columns) - 1) * gridGap
      )
    },
    [columns, gridGap, headingHeight, groups, rowHeight],
  )
  const rangeExtractor = useCallback(({ startIndex, endIndex }: Range) => {
    // A group can span several screens. Buffer by distance instead of mounting
    // a fixed number of potentially very large groups on every scroll.
    let start = startIndex
    let end = endIndex
    const buffer = viewport.height * 2
    for (let distance = 0; start > 0 && distance < buffer;) {
      start--
      distance += estimateSize(start) + groupGap
    }
    for (let distance = 0; end < groups.length - 1 && distance < buffer;) {
      end++
      distance += estimateSize(end) + groupGap
    }
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [estimateSize, groupGap, groups.length, viewport.height])
  // This component opts out of compilation with "use no memo" above.
  // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual requires fresh reads from its mutable instance.
  const virtualizer = useWindowVirtualizer({
    count: groups.length,
    directDomUpdates: true,
    useAnimationFrameWithResizeObserver: true,
    enabled: hydrated,
    estimateSize,
    gap: groupGap,
    scrollPaddingStart,
    getItemKey,
    initialRect: { width: 0, height: 900 },
    rangeExtractor,
    scrollMargin,
  })
  const setContainerRef = useCallback((element: HTMLDivElement | null) => {
    ref.current = element
    virtualizer.containerRef(element)
  }, [ref, virtualizer])
  const virtualGroups = virtualizer.getVirtualItems()
  const scrollOffset = virtualizer.scrollOffset ?? 0
  // A short final group cannot reach the top of a tall viewport. Keep the
  // scrollbar at its endpoint when the document has reached its scroll limit.
  const activeIndex = virtualizer.isAtEnd(2)
    ? Math.max(0, groups.length - 1)
    : virtualGroups.find((group) => group.end > scrollOffset + scrollPaddingStart + 1)?.index ?? 0

  if (!hydrated) {
    const { baseName, items } = groups[0] ?? {
      baseName: "",
      items: [],
    }
    return (
      <div className="pr-7 sm:pr-8">
        <div
          ref={ref}
          data-testid="virtualized-sprite-groups"
          data-hydrated="false"
          data-total-groups={groups.length}
          data-rendered-groups={groups.length > 0 ? 1 : 0}
        >
          <section aria-label={baseName} className="space-y-3 sm:space-y-4">
            <SpriteGroupHeading baseName={baseName} items={items} />
            <SpriteTiles
              items={items}
              columns={columns}
              gap={gridGap}
              view={view}
              {...tileProps}
            />
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="pr-7 sm:pr-8">
      <div
        id={groupsId}
        ref={setContainerRef}
        data-testid="virtualized-sprite-groups"
        data-hydrated="true"
        data-total-groups={groups.length}
        data-rendered-groups={virtualGroups.length}
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {virtualGroups.map((virtualGroup) => {
          const { baseName, items } = groups[virtualGroup.index] ?? {
            baseName: "",
            items: [],
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
                width: "100%",
              }}
            >
              <section aria-label={baseName} className="space-y-3 sm:space-y-4">
                <SpriteGroupHeading baseName={baseName} items={items} />
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
      <CollectionGroupScroller
        key={groups.map((group) => group.baseName).join("\n")}
        groups={groups}
        activeIndex={activeIndex}
        controls={groupsId}
        contentTop={Math.max(0, scrollMargin - scrollOffset)}
        visible={scrollOffset + (virtualizer.scrollRect?.height ?? 0) > scrollMargin + 80 && scrollOffset < scrollMargin + virtualizer.getTotalSize()}
        onJump={(index) => virtualizer.scrollToIndex(index, { align: "start", behavior: "auto" })}
      />
    </div>
  )
}
