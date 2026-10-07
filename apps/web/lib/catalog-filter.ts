import type { CatalogItem, SpriteHelper } from "@workspace/contracts"

export type CatalogResult = Pick<
  CatalogItem,
  "id" | "baseName" | "variant" | "rarity" | "displayOrder" | "imagePath"
> & { helpers?: SpriteHelper[] }

// Send only fields used by result cards and filters across the client boundary.
export function toCatalogResult(item: CatalogResult): CatalogResult {
  return {
    id: item.id,
    baseName: item.baseName,
    variant: item.variant,
    rarity: item.rarity,
    displayOrder: item.displayOrder,
    imagePath: item.imagePath,
    ...(item.helpers ? { helpers: item.helpers } : {}),
  }
}
export type CatalogFilters = {
  query: string
  rarity: string
  variant: string
  availability: "all" | "available" | "unavailable"
}

export function filterCatalogResults(
  items: CatalogResult[],
  filters: CatalogFilters,
): CatalogResult[] {
  const query = filters.query.trim().toLocaleLowerCase()
  return items
    .filter(
      (item) =>
        `${item.baseName} ${item.variant}`
          .toLocaleLowerCase()
          .includes(query) &&
        (filters.rarity === "all" || item.rarity === filters.rarity) &&
        (filters.variant === "all" || item.variant === filters.variant) &&
        (filters.availability === "all" ||
          (filters.availability === "available"
            ? (item.helpers?.length ?? 0) > 0
            : (item.helpers?.length ?? 0) === 0)),
    )
    .toSorted(
      (a, b) =>
        Number((b.helpers?.length ?? 0) > 0) -
          Number((a.helpers?.length ?? 0) > 0) ||
        a.displayOrder - b.displayOrder ||
        a.id.localeCompare(b.id),
    )
}
