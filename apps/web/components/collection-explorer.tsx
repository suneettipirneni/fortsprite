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

function formatUtcDateTime(date: Date) {
  const hours = date.getUTCHours()
  const displayHours = hours % 12 || 12
  const minutes = String(date.getUTCMinutes()).padStart(2, "0")
  return `${formatUtcDate(date)}, ${displayHours}:${minutes} ${hours < 12 ? "AM" : "PM"}`
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
  const variantOptions = [...new Set(sprites.map((sprite) => sprite.variant))]
  const rarityOptions = [...new Set(sprites.map((sprite) => sprite.rarity))]
  const view = useSyncExternalStore(
    subscribeToCollectionView,
    getCollectionViewSnapshot,
    getCollectionViewServerSnapshot,
  )
  const [gridSize, setGridSize] = useState<CollectionGridSize>("medium")
  const [query, setQuery] = useState("")
  const [filterTokens, setFilterTokens] = useState<CollectionQueryToken[]>([])
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

  const filteredSprites = filterCollection(sprites, {
    query: deferredQuery,
    capture,
    mastery,
    variants,
    rarities,
    sort,
  })
  const currentSeasonId = latestSeasonId(sprites)

  const variantProgress = new Map<
    string,
    { captured: number; mastered: number; total: number }
  >()
  for (const sprite of sprites) {
    const progress = variantProgress.get(sprite.baseName) ?? {
      captured: 0,
      mastered: 0,
      total: 0,
    }
    progress.total += 1
    if (sprite.owned) progress.captured += 1
    if (sprite.mastered) progress.mastered += 1
    variantProgress.set(sprite.baseName, progress)
  }

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

  const ownedCount = sprites.filter((sprite) => sprite.owned).length
  const masteredCount = sprites.filter((sprite) => sprite.mastered).length
  const filterOptions: CollectionQueryToken[] = [
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
      count: sprites.length - ownedCount,
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
      count: sprites.length - masteredCount,
    },
    ...variantOptions.map((option) => ({
      id: `variant:${option}`,
      group: "variant" as const,
      groupLabel: "Variant",
      label: option,
      value: option,
      count: sprites.filter((sprite) => sprite.variant === option).length,
    })),
    ...rarityOptions.map((option) => ({
      id: `rarity:${option}`,
      group: "rarity" as const,
      groupLabel: "Rarity",
      label: option,
      value: option,
      count: sprites.filter((sprite) => sprite.rarity === option).length,
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
        className="flex shrink-0 gap-6 tabular-nums sm:gap-8"
      >
        <div>
          <p className="text-sm">
            <span className="text-2xl font-semibold text-foreground">
              {ownedCount}
            </span>{" "}
            captured
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {completionPercent(ownedCount, sprites.length)}% of {sprites.length}
          </p>
        </div>
        <div className="border-l border-white/15 pl-6 sm:pl-8">
          <p className="text-sm">
            <span className="text-2xl font-semibold text-foreground">
              {masteredCount}
            </span>{" "}
            mastered
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {completionPercent(masteredCount, sprites.length)}% of{" "}
            {sprites.length}
          </p>
        </div>
      </div>
      <div
        data-testid="collection-content"
        className="isolate flex flex-col gap-5 border-t border-white/15 pt-5 antialiased sm:col-span-2"
      >
        <div className="flex flex-col gap-3">
          <div className="grid min-w-0 gap-2 xl:grid-cols-[minmax(0,1fr)_11rem]">
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
          <p className="text-xs text-muted-foreground">
            Combine tokens to narrow the catalog, such as Captured + Not
            mastered. Multiple variants or rarities match any selected value.
          </p>
        </div>

        {notice ? (
          <p role="alert" className="text-sm text-destructive">
            {notice.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {updatedAt
            ? `Collection updated ${formatUtcDateTime(new Date(updatedAt))}.`
            : "No collection changes saved yet."}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-xs text-muted-foreground">
            Showing {filteredSprites.length} of {sprites.length} Sprites
          </p>
          <div className="flex flex-wrap items-center gap-3">
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
              <ToggleGroupItem value="list" aria-label="List view" className="h-11 px-3">
                <ListIcon aria-hidden="true" /> List
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view" className="h-11 px-3">
                <Grid2X2Icon aria-hidden="true" /> Grid
              </ToggleGroupItem>
              <ToggleGroupItem value="grouped" aria-label="Grouped view" className="h-11 px-3">
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
                        className="size-11 aria-checked:bg-muted"
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
          <p className="border-t border-white/10 pt-4 text-xs text-muted-foreground">
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
