import type { CollectionItem } from "@workspace/contracts"

export type OwnershipFilter = "all" | "owned" | "missing" | "mastered"
export type CatalogSort = "catalog" | "season-newest" | "season-oldest"
export type CollectionFilters = {
  query: string
  ownership: OwnershipFilter
  variant: string
  rarity: string
  sort: CatalogSort
}

export function filterCollection<T extends CollectionItem>(
  sprites: T[],
  filters: CollectionFilters,
): T[] {
  const { query, ownership, variant, rarity, sort } = filters
  const normalizedQuery = query.trim().toLowerCase()

  const matchingSprites = sprites.filter((sprite) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      `${sprite.variant} ${sprite.baseName} ${sprite.season ?? "Season unavailable"}`
        .toLowerCase()
        .includes(normalizedQuery)
    const matchesOwnership =
      ownership === "all" ||
      (ownership === "owned" && sprite.owned) ||
      (ownership === "missing" && !sprite.owned) ||
      (ownership === "mastered" && sprite.mastered)
    const matchesVariant = variant === "all" || sprite.variant === variant

    return (
      matchesQuery &&
      matchesOwnership &&
      matchesVariant &&
      (rarity === "all" || sprite.rarity === rarity)
    )
  })

  return matchingSprites.toSorted((left, right) => {
    if (sort === "catalog") return left.displayOrder - right.displayOrder

    if (left.sourceSeasonId === null && right.sourceSeasonId !== null) return 1
    if (right.sourceSeasonId === null && left.sourceSeasonId !== null) return -1
    const seasonDifference =
      (left.sourceSeasonId ?? 0) - (right.sourceSeasonId ?? 0)
    if (seasonDifference !== 0) {
      return sort === "season-newest" ? -seasonDifference : seasonDifference
    }

    return left.displayOrder - right.displayOrder
  })
}
