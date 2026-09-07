import type { CatalogItem, PublicProfile } from "@workspace/contracts"

export type CatalogResult = CatalogItem & { helpers?: PublicProfile[] }
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
