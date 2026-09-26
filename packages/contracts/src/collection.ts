import type {
  CatalogSnapshot,
  CollectionItem,
  CollectionQuery,
  CollectionSnapshot,
  CollectionTrackingSnapshot,
  SpriteHelper,
} from "./index.ts"

export class CatalogRevisionMismatchError extends Error {
  constructor() {
    super("The Sprite catalog changed while loading the collection. Please retry.")
    this.name = "CatalogRevisionMismatchError"
  }
}

export function assembleCollection(
  catalog: CatalogSnapshot,
  tracking: CollectionTrackingSnapshot,
  query: CollectionQuery = {},
): CollectionSnapshot {
  if (catalog.revision !== tracking.catalogRevision)
    throw new CatalogRevisionMismatchError()
  const entries = new Map(tracking.entries.map((entry) => [entry.spriteId, entry]))
  const helpers = new Map<string, SpriteHelper[]>()
  for (const helper of tracking.helpers) {
    const profiles = helpers.get(helper.spriteId) ?? []
    profiles.push({ ...helper.profile, mastered: helper.mastered })
    helpers.set(helper.spriteId, profiles)
  }
  const allItems: CollectionItem[] = catalog.items.flatMap((item) => {
    const entry = entries.get(item.id)
    return entry
      ? [{ ...item, ...entry, helpers: helpers.get(item.id) ?? [] }]
      : []
  })
  const search = query.search?.toLocaleLowerCase()
  const items = allItems.filter(
    (item) =>
      (!search ||
        `${item.baseName} ${item.variant}`.toLocaleLowerCase().includes(search)) &&
      (!query.variant || item.variant === query.variant) &&
      (!query.rarity || item.rarity === query.rarity) &&
      (!query.ownership ||
        query.ownership === "all" ||
        (query.ownership === "owned" ? item.owned : !item.owned)),
  )
  const dates = allItems.flatMap((item) => item.updatedAt ? [item.updatedAt] : [])
  return {
    items,
    progress: {
      total: allItems.length,
      owned: allItems.filter((item) => item.owned).length,
      mastered: allItems.filter((item) => item.mastered).length,
    },
    updatedAt: dates.length
      ? dates.reduce((latest, date) => date > latest ? date : latest)
      : null,
  }
}
