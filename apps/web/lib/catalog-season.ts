type SeasonItem = {
  sourceSeasonId: number | null
}

export function latestSeasonId(items: SeasonItem[]): number | null {
  let latest: number | null = null

  for (const item of items) {
    if (
      item.sourceSeasonId !== null &&
      (latest === null || item.sourceSeasonId > latest)
    ) {
      latest = item.sourceSeasonId
    }
  }

  return latest
}

export function latestSeasonItems<T extends SeasonItem>(items: T[]): T[] {
  const latest = latestSeasonId(items)
  return latest === null
    ? []
    : items.filter((item) => item.sourceSeasonId === latest)
}
