import type { CollectionItem } from "@workspace/contracts"

export type Sprite = CollectionItem

export function presentSprite(item: CollectionItem): Sprite {
  return item
}

export function completionPercent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}
