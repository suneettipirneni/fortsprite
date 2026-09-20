import type { CollectionItem } from "@workspace/contracts"

export type CaptureFilter = "captured" | "missing"
export type MasteryFilter = "mastered" | "not-mastered"
export type CatalogSort = "catalog" | "season-newest" | "season-oldest"
export type CollectionFilters = {
  query: string
  capture: CaptureFilter | null
  mastery: MasteryFilter | null
  variants: string[]
  rarities: string[]
  sort: CatalogSort
}

export function filterCollection<T extends CollectionItem>(
  sprites: T[],
  filters: CollectionFilters,
): T[] {
  const { query, capture, mastery, variants, rarities, sort } = filters
  const normalizedQuery = query.trim().toLowerCase()

  const matchingSprites = sprites.filter((sprite) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      `${sprite.variant} ${sprite.baseName} ${sprite.season ?? "Season unavailable"}`
        .toLowerCase()
        .includes(normalizedQuery)
    const matchesCapture =
      capture === null ||
      (capture === "captured" && sprite.owned) ||
      (capture === "missing" && !sprite.owned)
    const matchesMastery =
      mastery === null ||
      (mastery === "mastered" && sprite.mastered) ||
      (mastery === "not-mastered" && !sprite.mastered)
    const matchesVariant =
      variants.length === 0 || variants.includes(sprite.variant)
    const matchesRarity =
      rarities.length === 0 || rarities.includes(sprite.rarity)

    return (
      matchesQuery &&
      matchesCapture &&
      matchesMastery &&
      matchesVariant &&
      matchesRarity
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
