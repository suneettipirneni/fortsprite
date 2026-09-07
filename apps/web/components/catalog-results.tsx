"use client"

import type { CatalogResult, CatalogFilters } from "@/lib/catalog-filter"
import { useDeferredValue, useId, useState } from "react"

import { FilterSelect } from "@/components/filter-select"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { SelectItem } from "@workspace/ui/components/select"
import { CatalogResultCard } from "@/components/catalog-result-card"
import { filterCatalogResults } from "@/lib/catalog-filter"

const emptyFilters: CatalogFilters = {
  query: "",
  rarity: "all",
  variant: "all",
  availability: "all",
}

export function CatalogResults({
  items,
  title,
  description,
  showAvailability = false,
  availabilityKnown = true,
  emptyMessage,
}: {
  items: CatalogResult[]
  title: string
  description: string
  showAvailability?: boolean
  availabilityKnown?: boolean
  emptyMessage: string
}) {
  const titleId = useId()
  const [filters, setFilters] = useState(emptyFilters)
  const query = useDeferredValue(filters.query)
  const rarities = [...new Set(items.map((item) => item.rarity))].sort()
  const variants = [...new Set(items.map((item) => item.variant))].sort()
  const filtered = filterCatalogResults(items, {
    ...filters,
    query,
    availability: availabilityKnown ? filters.availability : "all",
  })

  return (
    <section aria-labelledby={titleId} className="min-w-0 space-y-5">
      <div>
        <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        <Input
          className="h-11"
          aria-label={`Search ${title}`}
          placeholder="Search name or variant"
          value={filters.query}
          onChange={(event) =>
            setFilters({ ...filters, query: event.target.value })
          }
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FilterSelect
            value={filters.rarity}
            onValueChange={(rarity) => setFilters({ ...filters, rarity })}
            label={`Filter ${title} by rarity`}
          >
            <SelectItem value="all">All rarities</SelectItem>
            {rarities.map((rarity) => (
              <SelectItem key={rarity} value={rarity}>
                {rarity}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filters.variant}
            onValueChange={(variant) => setFilters({ ...filters, variant })}
            label={`Filter ${title} by variant`}
          >
            <SelectItem value="all">All variants</SelectItem>
            {variants.map((variant) => (
              <SelectItem key={variant} value={variant}>
                {variant}
              </SelectItem>
            ))}
          </FilterSelect>
        </div>
        {showAvailability ? (
          <FilterSelect
            value={filters.availability}
            disabled={!availabilityKnown}
            onValueChange={(availability) =>
              setFilters({
                ...filters,
                availability: availability as CatalogFilters["availability"],
              })
            }
            label="Filter by friend availability"
          >
            <SelectItem value="all">All missing Sprites</SelectItem>
            <SelectItem value="available">Friends can help</SelectItem>
            <SelectItem value="unavailable">No friend has it yet</SelectItem>
          </FilterSelect>
        ) : null}
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        Showing {filtered.length} of {items.length} Sprites
      </p>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          <p>
            {items.length === 0
              ? emptyMessage
              : "No Sprites match these filters."}
          </p>
          {items.length > 0 ? (
            <Button
              className="mt-4 min-h-11"
              variant="outline"
              onClick={() => setFilters(emptyFilters)}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <CatalogResultCard
              key={item.id}
              item={item}
              showAvailability={showAvailability}
              availabilityKnown={availabilityKnown}
            />
          ))}
        </div>
      )}
    </section>
  )
}
