import type { CollectionItem } from "@workspace/contracts"

import { latestSeasonId } from "./catalog-season"
import { summarizeSeasons } from "./collection-summary"

type Progress = { owned: number; mastered: number; total: number }

export type DashboardProgress = {
  currentSeasonId: number | null
  allTime: Progress
  seasons: (Progress & { id: number | null; label: string })[]
}

export function summarizeDashboardProgress(
  items: Pick<CollectionItem, "sourceSeasonId" | "season" | "owned" | "mastered">[],
): DashboardProgress {
  const allTime: Progress = { owned: 0, mastered: 0, total: items.length }
  const seasons = new Map<number | null, Progress>()

  for (const item of items) {
    const progress = seasons.get(item.sourceSeasonId) ?? { owned: 0, mastered: 0, total: 0 }
    progress.total += 1
    if (item.owned) {
      progress.owned += 1
      allTime.owned += 1
    }
    if (item.mastered) {
      progress.mastered += 1
      allTime.mastered += 1
    }
    seasons.set(item.sourceSeasonId, progress)
  }

  return {
    currentSeasonId: latestSeasonId(items),
    allTime,
    seasons: summarizeSeasons(items).map(([id, { label }]) => ({
      id,
      label,
      ...seasons.get(id)!,
    })),
  }
}
