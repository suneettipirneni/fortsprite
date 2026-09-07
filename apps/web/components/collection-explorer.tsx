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
import { SearchIcon } from "lucide-react"

import { FilterSelect } from "@/components/filter-select"
import { Button } from "@workspace/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
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
import {
  SpriteTile,
  type CollectionNotice,
} from "@/components/collection-sprite-tile"
import {
  filterCollection,
  type CatalogSort,
  type OwnershipFilter,
} from "@/lib/collection-filter"
import {
  completionPercent,
  presentSprite,
  type Sprite,
} from "@/lib/catalog-presentation"
import { updateCollectionAction } from "@/app/actions/collection"

const verifiedDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

const updatedDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

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
  const [query, setQuery] = useState("")
  const [ownership, setOwnership] = useState<OwnershipFilter>("all")
  const [variant, setVariant] = useState("all")
  const [rarity, setRarity] = useState("all")
  const [sort, setSort] = useState<CatalogSort>("catalog")
  const deferredQuery = useDeferredValue(query)
  const activeFilterRef = useRef<HTMLButtonElement>(null)

  const filteredSprites = filterCollection(sprites, {
    query: deferredQuery,
    ownership,
    variant,
    rarity,
    sort,
  })

  const ownedCount = sprites.filter((sprite) => sprite.owned).length
  const masteredCount = sprites.filter((sprite) => sprite.mastered).length
  const filters = [
    { value: "all", label: "All", count: sprites.length },
    { value: "missing", label: "Missing", count: sprites.length - ownedCount },
    { value: "owned", label: "Captured", count: ownedCount },
    { value: "mastered", label: "Mastered", count: masteredCount },
  ] as const

  function updateSprite(sprite: Sprite, change: CollectionChange) {
    setNotice((current) => (current?.spriteId === sprite.id ? null : current))
    const updated = sync.change(sprite.id, change)
    const leavesFilter =
      (ownership === "missing" && updated.owned) ||
      (ownership === "owned" && !updated.owned) ||
      (ownership === "mastered" && !updated.mastered)

    if (leavesFilter) activeFilterRef.current?.focus()
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
          <InputGroup className="h-11 w-full bg-background/32">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              name="sprite-search"
              aria-label="Search collection"
              placeholder="Search collection"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </InputGroup>
          <div className="flex flex-col justify-between gap-3 xl:flex-row">
            <div
              role="group"
              aria-label="Filter collection status"
              className="flex gap-1 overflow-x-auto rounded-lg bg-background/25 p-1"
            >
              {filters.map((filter) => (
                <Button
                  key={filter.value}
                  ref={ownership === filter.value ? activeFilterRef : undefined}
                  type="button"
                  variant={ownership === filter.value ? "secondary" : "ghost"}
                  aria-pressed={ownership === filter.value}
                  onClick={() => setOwnership(filter.value)}
                  className="h-12 min-w-12 flex-1 gap-2 px-2 text-sm sm:h-9 sm:px-3"
                >
                  {filter.label}
                  <span className="text-xs tabular-nums opacity-70 max-sm:hidden">
                    {filter.count}
                  </span>
                </Button>
              ))}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
              <FilterSelect
                name="sprite-variant"
                value={variant}
                onValueChange={setVariant}
                label="Filter by variant"
                placeholder="Variant"
              >
                <SelectGroup>
                  <SelectItem value="all">All variants</SelectItem>
                  {variantOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </FilterSelect>
              <FilterSelect
                name="sprite-rarity"
                value={rarity}
                onValueChange={setRarity}
                label="Filter by rarity"
                placeholder="Rarity"
              >
                <SelectGroup>
                  <SelectItem value="all">All rarities</SelectItem>
                  {rarityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </FilterSelect>
              <FilterSelect
                name="sprite-sort"
                value={sort}
                onValueChange={(value) => setSort(value as CatalogSort)}
                label="Sort collection"
                placeholder="Sort"
                className="xl:min-w-44"
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
        </div>

        {notice ? (
          <p role="alert" className="text-sm text-destructive">
            {notice.message}
          </p>
        ) : null}
        {initialCollection.friendAvailability.status === "unavailable" ? (
          <p role="status" className="text-sm text-muted-foreground">
            Friend availability could not be refreshed. Your collection is still
            available. Reload to check friends again.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {updatedAt
            ? `Collection updated ${updatedDateFormatter.format(new Date(updatedAt))}.`
            : "No collection changes saved yet."}
        </p>
        {initialCollection.friendAvailability.status === "ready" &&
        initialCollection.friendAvailability.refreshedAt ? (
          <p className="text-xs text-muted-foreground">
            Friends checked{" "}
            {updatedDateFormatter.format(
              new Date(initialCollection.friendAvailability.refreshedAt),
            )}
            .
          </p>
        ) : null}
        <p role="status" className="text-xs text-muted-foreground">
          Showing {filteredSprites.length} of {sprites.length} Sprites
        </p>

        {filteredSprites.length > 0 ? (
          <div className="@container">
            <div className="grid grid-cols-1 gap-3 @[300px]:grid-cols-2 @xl:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
              {filteredSprites.map((sprite) => (
                <SpriteTile
                  key={sprite.id}
                  sprite={sprite}
                  pending={pendingIds.has(sprite.id)}
                  availabilityKnown={
                    initialCollection.friendAvailability.status === "ready"
                  }
                  onRemovedFocus={() => activeFilterRef.current?.focus()}
                  notice={notice?.spriteId === sprite.id ? notice : null}
                  onChange={(change) => updateSprite(sprite, change)}
                />
              ))}
            </div>
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
                  setOwnership("all")
                  setVariant("all")
                  setRarity("all")
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
            {verifiedDateFormatter.format(
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
