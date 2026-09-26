"use client"

import type { CatalogItem, CollectionSnapshot } from "@workspace/contracts"
import {
  useDeferredValue,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import {
  Grid2X2Icon,
  Grid3X3Icon,
  ListIcon,
  Rows3Icon,
  SquareIcon,
} from "lucide-react"

import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { FilterSelect } from "@/components/filter-select"
import {
  CollectionQueryBar,
  type CollectionQueryToken,
} from "@/components/collection-query-bar"
import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { SelectGroup, SelectItem } from "@workspace/ui/components/select"

import type { CollectionChange } from "@/lib/collection-state"
import {
  filterCollection,
  type CatalogSort,
  type CaptureFilter,
  type MasteryFilter,
} from "@/lib/collection-filter"
import {
  completionPercent,
} from "@/lib/catalog-presentation"
import { CollectionTracking, CollectionTrackingProvider, TrackingSkeleton, useCollectionControls } from "@/components/collection-tracking"
import { latestSeasonId } from "@/lib/catalog-season"
import { summarizeSeasons } from "@/lib/collection-summary"
import {
  VirtualizedSpriteGrid,
  VirtualizedSpriteGroups,
  type CollectionGridSize,
} from "@/components/virtualized-sprite-grid"
import {
  getCollectionViewServerSnapshot,
  getCollectionViewSnapshot,
  isCollectionView,
  saveCollectionView,
  subscribeToCollectionView,
} from "@/lib/collection-view-preference"

const gridSizeOptions = [
  { value: "small", label: "Small grid", icon: Grid3X3Icon },
  { value: "medium", label: "Medium grid", icon: Grid2X2Icon },
  { value: "large", label: "Large grid", icon: SquareIcon },
] as const

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

function formatUtcDate(date: Date) {
  return `${monthNames[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function formatUtcTime(date: Date) {
  const hours = date.getUTCHours()
  const displayHours = hours % 12 || 12
  const minutes = String(date.getUTCMinutes()).padStart(2, "0")
  return `${displayHours}:${minutes} ${hours < 12 ? "AM" : "PM"}`
}

function formatUtcDateTime(date: Date) {
  return `${formatUtcDate(date)}, ${formatUtcTime(date)} UTC`
}

export function CollectionExplorer({ catalog, collection }: {
  catalog: CatalogItem[]
  collection: Promise<CollectionSnapshot>
}) {
  return <CollectionTrackingProvider collection={collection} catalog={new Map(catalog.map((item) => [item.id, item]))}>
    <CollectionExplorerContent catalog={catalog} />
  </CollectionTrackingProvider>
}

function CollectionExplorerContent({ catalog }: { catalog: CatalogItem[] }) {
  const { sync, pendingIds, notice, clearNotice } = useCollectionControls()
  const sprites = catalog
  const currentSeasonId = latestSeasonId(sprites)
  const seasonOptions = summarizeSeasons(sprites)
  const view = useSyncExternalStore(
    subscribeToCollectionView,
    getCollectionViewSnapshot,
    getCollectionViewServerSnapshot,
  )
  const [gridSize, setGridSize] = useState<CollectionGridSize>("medium")
  const [query, setQuery] = useState("")
  const [filterTokens, setFilterTokens] = useState<CollectionQueryToken[]>(() => {
    const current = catalog.find(
      (item) => item.sourceSeasonId === currentSeasonId,
    )
    if (!current || current.sourceSeasonId === null) return []
    return [{
      id: `season:${current.sourceSeasonId}`,
      group: "season",
      groupLabel: "Season",
      label: current.season ?? `Season ${current.sourceSeasonId}`,
      value: String(current.sourceSeasonId),
      count: catalog.filter(
        (item) => item.sourceSeasonId === current.sourceSeasonId,
      ).length,
    }]
  })
  const [sort, setSort] = useState<CatalogSort>("catalog")
  const deferredQuery = useDeferredValue(query)
  const queryInputRef = useRef<HTMLInputElement>(null)

  const capture =
    (filterTokens.find((token) => token.group === "capture")?.value as
      | CaptureFilter
      | undefined) ?? null
  const mastery =
    (filterTokens.find((token) => token.group === "mastery")?.value as
      | MasteryFilter
      | undefined) ?? null
  const variants = filterTokens
    .filter((token) => token.group === "variant")
    .map((token) => token.value)
  const rarities = filterTokens
    .filter((token) => token.group === "rarity")
    .map((token) => token.value)
  const seasons = filterTokens
    .filter((token) => token.group === "season")
    .map((token) => token.value === "unknown" ? null : Number(token.value))
  const seasonSprites = seasons.length === 0
    ? sprites
    : sprites.filter((sprite) => seasons.includes(sprite.sourceSeasonId))
  const variantOptions = new Map<string, number>()
  const rarityOptions = new Map<string, number>()
  for (const sprite of seasonSprites) {
    variantOptions.set(sprite.variant, (variantOptions.get(sprite.variant) ?? 0) + 1)
    rarityOptions.set(sprite.rarity, (rarityOptions.get(sprite.rarity) ?? 0) + 1)
  }

  const filteredSprites = filterCollection(sprites, {
    query: deferredQuery,
    capture: null,
    mastery: null,
    variants,
    rarities,
    seasons,
    sort,
  })

  const filterOptions: CollectionQueryToken[] = [
    ...seasonOptions.map(([id, { label, count }]) => ({
      id: `season:${id ?? "unknown"}`,
      group: "season" as const,
      groupLabel: "Season",
      label,
      value: id === null ? "unknown" : String(id),
      count,
    })),
    {
      id: "capture:captured",
      group: "capture",
      groupLabel: "Capture",
      label: "Captured",
      value: "captured",
      count: null,
    },
    {
      id: "capture:missing",
      group: "capture",
      groupLabel: "Capture",
      label: "Missing",
      value: "missing",
      count: null,
    },
    {
      id: "mastery:mastered",
      group: "mastery",
      groupLabel: "Mastery",
      label: "Mastered",
      value: "mastered",
      count: null,
    },
    {
      id: "mastery:not-mastered",
      group: "mastery",
      groupLabel: "Mastery",
      label: "Not mastered",
      value: "not-mastered",
      count: null,
    },
    ...[...variantOptions].map(([option, count]) => ({
      id: `variant:${option}`,
      group: "variant" as const,
      groupLabel: "Variant",
      label: option,
      value: option,
      count,
    })),
    ...[...rarityOptions].map(([option, count]) => ({
      id: `rarity:${option}`,
      group: "rarity" as const,
      groupLabel: "Rarity",
      label: option,
      value: option,
      count,
    })),
  ]

  function updateSprite(sprite: CatalogItem, change: CollectionChange) {
    clearNotice(sprite.id)
    const updated = sync.change(sprite.id, change)
    const leavesFilter =
      filterCollection([{ ...sprite, ...sync.getSnapshot().get(sprite.id)!, ...updated, helpers: [] }], {
        query: deferredQuery,
        capture,
        mastery,
        variants,
        rarities,
        seasons,
        sort,
      }).length === 0

    if (leavesFilter) queryInputRef.current?.focus()
  }

  const gridProps = {
    view: view === "list" ? "list" as const : "grid" as const,
    gridSize,
    pendingIds,
    availabilityKnown: true,
    currentSeasonId,
    notice,
    onRemovedFocus: () => queryInputRef.current?.focus(),
    onChange: updateSprite,
  }

  function renderResults(results: CatalogItem[]) {
    const groups = new Map<string, CatalogItem[]>()
    for (const item of results) {
      const group = groups.get(item.baseName) ?? []
      group.push(item)
      groups.set(item.baseName, group)
    }
    const groupedResults = [...groups].map(([baseName, items]) => ({ baseName, items }))
    return (results.length > 0 ? (
          <div className="@container">
            {view === "grouped" ? (
              <VirtualizedSpriteGroups groups={groupedResults} {...gridProps} />
            ) : <VirtualizedSpriteGrid items={results} {...gridProps} />}
          </div>
        ) : (
          <Empty className="min-h-64 border border-white/14 bg-card">
            <EmptyHeader>
              <EmptyTitle>
                {sprites.length === 0
                  ? "Your catalog is not ready yet"
                  : "No Sprites match these filters"}
              </EmptyTitle>
              <EmptyDescription>
                {sprites.length === 0
                  ? "Released Sprites will appear here when the catalog is available."
                  : "Clear the search or choose a broader filter."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("")
                  setFilterTokens([])
                }}
              >
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ))
  }

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="grid shrink-0 grid-cols-2 gap-0 tabular-nums">
        {(["owned", "mastered"] as const).map((field) => <div key={field} className={field === "owned" ? "pr-6" : "border-l border-white/10 pl-6 sm:pl-8"}>
          <p className="text-base sm:text-sm"><span className="text-3xl font-semibold tracking-tight text-foreground">
            <CollectionTracking fallback={<TrackingSkeleton className="h-8 w-10" />}>{(snapshot) => snapshot.items.filter((item) =>
              (seasons.length === 0 || seasons.includes(item.sourceSeasonId)) && item[field]).length}</CollectionTracking>
          </span>{" "}{field === "owned" ? "captured" : "mastered"}</p>
          <p className="mt-1 text-base text-muted-foreground sm:text-sm">
            <CollectionTracking>{(snapshot) => completionPercent(snapshot.items.filter((item) =>
              (seasons.length === 0 || seasons.includes(item.sourceSeasonId)) && item[field]).length, seasonSprites.length)}</CollectionTracking>% of {seasonSprites.length}
          </p>
        </div>)}
      </div>
      <div
        data-testid="collection-content"
        className="@container isolate flex min-w-0 flex-col gap-5 border-t border-white/10 pt-5 antialiased sm:col-span-2 sm:gap-6 sm:pt-8"
      >
        <div className="flex flex-col gap-3">
          <div className="grid min-w-0 gap-2 @2xl:grid-cols-[minmax(0,1fr)_11rem]">
            <CollectionQueryBar
              query={query}
              onQueryChange={setQuery}
              tokens={filterTokens}
              options={filterOptions}
              onTokensChange={setFilterTokens}
              inputRef={queryInputRef}
              renderCount={(option) => option.group === "capture" || option.group === "mastery"
                ? <CollectionTracking fallback={<TrackingSkeleton className="h-4 w-6" />}>{(snapshot) => {
                  const items = snapshot.items.filter((item) => seasons.length === 0 || seasons.includes(item.sourceSeasonId))
                  return items.filter((item) => option.group === "capture"
                    ? option.value === "captured" ? item.owned : !item.owned
                    : option.value === "mastered" ? item.mastered : !item.mastered).length
                }}</CollectionTracking>
                : option.count}
            />
            <div className="min-w-0">
              <FilterSelect
                name="sprite-sort"
                value={sort}
                onValueChange={(value) => setSort(value as CatalogSort)}
                label="Sort collection"
                placeholder="Sort"
                className="w-full"
              >
                <SelectGroup>
                  <SelectItem value="catalog">Catalog order</SelectItem>
                  <SelectItem value="season-newest">
                    Season: newest first
                  </SelectItem>
                  <SelectItem value="season-oldest">
                    Season: oldest first
                  </SelectItem>
                </SelectGroup>
              </FilterSelect>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => {
                if (isCollectionView(value)) saveCollectionView(value)
              }}
              aria-label="Collection view"
              variant="outline"
              spacing={0}
            >
              <ToggleGroupItem value="list" aria-label="List view" className="group-data-[spacing=0]/toggle-group:px-1.5">
                <ListIcon aria-hidden="true" /> List
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view" className="group-data-[spacing=0]/toggle-group:px-1.5">
                <Grid2X2Icon aria-hidden="true" /> Grid
              </ToggleGroupItem>
              <ToggleGroupItem value="grouped" aria-label="Grouped view" className="group-data-[spacing=0]/toggle-group:px-1.5">
                <Rows3Icon aria-hidden="true" /> Grouped
              </ToggleGroupItem>
            </ToggleGroup>
            {view !== "list" ? (
              <ToggleGroup
                type="single"
                value={gridSize}
                onValueChange={(value) => {
                  if (value === "small" || value === "medium" || value === "large") {
                    setGridSize(value)
                  }
                }}
                aria-label="Grid size"
                variant="outline"
                spacing={0}
              >
                {gridSizeOptions.map(({ value, label, icon: Icon }) => (
                  <Tooltip key={value}>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value={value}
                        aria-label={label}
                        className="w-(--control-height) aria-checked:bg-muted"
                      >
                        <Icon aria-hidden="true" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </ToggleGroup>
            ) : null}
          </div>
          {notice ? (
            <p role="alert" className="text-sm text-destructive">
              {notice.message}
            </p>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <p role="status">
              Showing {capture || mastery ? <CollectionTracking>{(snapshot) => filterCollection(snapshot.items, {
                query: deferredQuery, capture, mastery, variants, rarities, seasons, sort,
              }).length}</CollectionTracking> : filteredSprites.length} of {seasonSprites.length} Sprites
            </p>
            <p aria-live="polite" aria-atomic="true">
              <CollectionTracking>{({ updatedAt }) => updatedAt ? <>
                Saved <time dateTime={updatedAt} title={formatUtcDateTime(new Date(updatedAt))}>{formatUtcDate(new Date(updatedAt))}</time>
              </> : "No changes saved yet."}</CollectionTracking>
            </p>
          </div>
        </div>

        {capture || mastery ? <CollectionTracking fallback={<div role="status" className="min-h-32 rounded-xl border border-white/10 p-5"><TrackingSkeleton className="mr-3 h-5 w-20" />Checking collection filters…</div>}>
          {(snapshot) => renderResults(filterCollection(snapshot.items, {
            query: deferredQuery, capture, mastery, variants, rarities, seasons, sort,
          }))}
        </CollectionTracking> : renderResults(filteredSprites)}
        {sprites.length > 0 ? (
          <p className="border-t border-white/10 pt-5 text-base text-muted-foreground sm:text-sm">
            Catalog source checked{" "}
            {formatUtcDate(
              new Date(
                sprites.reduce(
                  (latest, sprite) =>
                    sprite.sourceVerifiedAt > latest
                      ? sprite.sourceVerifiedAt
                      : latest,
                  sprites[0]!.sourceVerifiedAt,
                ),
              ),
            )}
            .
          </p>
        ) : null}
      </div>
    </>
  )
}
