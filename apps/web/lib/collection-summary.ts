import type { CollectionItem } from "@workspace/contracts"

type Progress = { captured: number; mastered: number; total: number }

export function summarizeSeasons(
  items: Pick<CollectionItem, "sourceSeasonId" | "season">[],
) {
  const seasons = new Map<number | null, { label: string; count: number }>()
  for (const item of items) {
    seasons.set(item.sourceSeasonId, {
      label: item.season ?? "Season unavailable",
      count: (seasons.get(item.sourceSeasonId)?.count ?? 0) + 1,
    })
  }
  return [...seasons].sort(([left], [right]) =>
    left === null ? 1 : right === null ? -1 : right - left,
  )
}

export function summarizeCollection(
  items: Pick<CollectionItem, "baseName" | "variant" | "rarity" | "owned" | "mastered">[],
) {
  const variants = new Map<string, number>()
  const rarities = new Map<string, number>()
  const groups = new Map<string, Progress>()
  let captured = 0
  let mastered = 0

  for (const item of items) {
    variants.set(item.variant, (variants.get(item.variant) ?? 0) + 1)
    rarities.set(item.rarity, (rarities.get(item.rarity) ?? 0) + 1)
    const progress = groups.get(item.baseName) ?? { captured: 0, mastered: 0, total: 0 }
    progress.total += 1
    if (item.owned) {
      captured += 1
      progress.captured += 1
    }
    if (item.mastered) {
      mastered += 1
      progress.mastered += 1
    }
    groups.set(item.baseName, progress)
  }

  return { captured, mastered, variants, rarities, groups }
}
