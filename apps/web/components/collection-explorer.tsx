"use client"

import type { CollectionSnapshot } from "@workspace/contracts"
import {
  startTransition,
  useDeferredValue,
  useEffect,
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
import { createCollectionSync } from "@/lib/collection-sync"
import type { CollectionNotice } from "@/components/collection-sprite-tile"
import {
  filterCollection,
  type CatalogSort,
  type CaptureFilter,
  type MasteryFilter,
} from "@/lib/collection-filter"
import {
  completionPercent,
  presentSprite,
  type Sprite,
} from "@/lib/catalog-presentation"
import { latestSeasonId } from "@/lib/catalog-season"
import { summarizeCollection, summarizeSeasons } from "@/lib/collection-summary"
import { updateCollectionAction } from "@/app/actions/collection"
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

export function CollectionExplorer({
  initialCollection,
}: {
  initialCollection: CollectionSnapshot
}) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [notice, setNotice] = useState<CollectionNotice | null>(null)
  const [sync] = useState(() =>
    createCollectionSync({
      entries: initialCollection.items,
      save: (id, state) =>
        new Promise((resolve, reject) => {
          startTransition(async () => {
            try {
              const result = await updateCollectionAction(id, state)
              if (result.ok) resolve(result.data)
              else reject(new Error(result.error))
            } catch {
              reject(
                new Error(
                  "The connection was interrupted. Check your connection and try again.",
                ),
              )
            }
          })
        }),
      onPending: (id, pending) => {
        setPendingIds((current) => {
          const next = new Set(current)
          if (pending) next.add(id)
          else next.delete(id)
          return next
        })
      },
      onSaved: (entry) => {
        setNotice((current) =>
          current?.spriteId === entry.spriteId ? null : current,
        )
      },
      onError: (id, error) => {
        setNotice({
          spriteId: id,
          message:
            error instanceof Error
              ? error.message
              : "Your collection could not be saved. Please try again.",
        })
      },
    }),
  )
  useEffect(() => {
    // Feed refreshed server entries into the queue while preserving pending intent.
    sync.reconcile(initialCollection.items)
  }, [initialCollection, sync])
  const entries = useSyncExternalStore(
    sync.subscribe,
    sync.getSnapshot,
    sync.getSnapshot,
  )
  const sprites = initialCollection.items.map((item) =>
    presentSprite({ ...item, ...entries.get(item.spriteId) }),
  )
  let updatedAt = initialCollection.updatedAt
  for (const entry of entries.values()) {
    if (entry.updatedAt && (!updatedAt || entry.updatedAt > updatedAt)) {
      updatedAt = entry.updatedAt
    }
  }
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
    const current = initialCollection.items.find(
      (item) => item.sourceSeasonId === currentSeasonId,
    )
    if (!current || current.sourceSeasonId === null) return []
    return [{
      id: `season:${current.sourceSeasonId}`,
      group: "season",
      groupLabel: "Season",
      label: current.season ?? `Season ${current.sourceSeasonId}`,
      value: String(current.sourceSeasonId),
      count: initialCollection.items.filter(
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
  const {
    captured: ownedCount,
    mastered: masteredCount,
    variants: variantOptions,
    rarities: rarityOptions,
    groups: variantProgress,
  } = summarizeCollection(seasonSprites)

  const filteredSprites = filterCollection(sprites, {
    query: deferredQuery,
    capture,
    mastery,
    variants,
    rarities,
    seasons,
    sort,
  })

  const spriteGroups = new Map<string, Sprite[]>()
  if (view === "grouped") {
    for (const sprite of filteredSprites) {
      const group = spriteGroups.get(sprite.baseName)
      if (group) group.push(sprite)
      else spriteGroups.set(sprite.baseName, [sprite])
    }
  }
  const groupedSprites = [...spriteGroups].map(([baseName, items]) => ({
    baseName,
    items,
    progress: variantProgress.get(baseName) ?? {
      captured: 0,
      mastered: 0,
      total: items.length,
    },
  }))

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
      count: ownedCount,
    },
    {
      id: "capture:missing",
      group: "capture",
      groupLabel: "Capture",
      label: "Missing",
      value: "missing",
      count: seasonSprites.length - ownedCount,
    },
    {
      id: "mastery:mastered",
      group: "mastery",
      groupLabel: "Mastery",
      label: "Mastered",
      value: "mastered",
      count: masteredCount,
    },
    {
      id: "mastery:not-mastered",
      group: "mastery",
      groupLabel: "Mastery",
      label: "Not mastered",
      value: "not-mastered",
      count: seasonSprites.length - masteredCount,
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

  function updateSprite(sprite: Sprite, change: CollectionChange) {
    setNotice((current) => (current?.spriteId === sprite.id ? null : current))
    const updated = sync.change(sprite.id, change)
    const leavesFilter =
      filterCollection([{ ...sprite, ...updated }], {
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

  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="true"
        className="grid shrink-0 grid-cols-2 gap-0 tabular-nums"
      >
        <div className="pr-6">
          <p className="text-base sm:text-sm">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {ownedCount}
            </span>{" "}
            captured
          </p>
          <p className="mt-1 text-base text-muted-foreground sm:text-sm">
            {completionPercent(ownedCount, seasonSprites.length)}% of {seasonSprites.length}
          </p>
        </div>
        <div className="border-l border-white/10 pl-6 sm:pl-8">
          <p className="text-base sm:text-sm">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {masteredCount}
            </span>{" "}
            mastered
          </p>
          <p className="mt-1 text-base text-muted-foreground sm:text-sm">
            {completionPercent(masteredCount, seasonSprites.length)}% of{" "}
            {seasonSprites.length}
          </p>
        </div>
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
              Showing {filteredSprites.length} of {seasonSprites.length} Sprites
            </p>
            <p aria-live="polite" aria-atomic="true">
              {updatedAt ? (
                <>
                  Saved{" "}
                  <time dateTime={updatedAt} title={formatUtcDateTime(new Date(updatedAt))}>
                    {formatUtcDate(new Date(updatedAt))}
                  </time>
                </>
              ) : "No changes saved yet."}
            </p>
          </div>
        </div>

        {filteredSprites.length > 0 ? (
          <div className="@container">
            {view === "grouped" ? (
              <VirtualizedSpriteGroups groups={groupedSprites} {...gridProps} />
            ) : <VirtualizedSpriteGrid items={filteredSprites} {...gridProps} />}
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
        )}
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
