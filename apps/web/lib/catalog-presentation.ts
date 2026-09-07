import type { CollectionItem } from "@workspace/contracts"

export type SpriteTone = "aqua" | "gold" | "violet" | "green" | "ember"
export type Sprite = CollectionItem & { tone: SpriteTone }

const variantTones: Record<string, SpriteTone> = {
  Base: "aqua",
  "Cheat Master": "violet",
  Gold: "gold",
  Gummy: "ember",
  Galaxy: "violet",
  Gem: "green",
  Holofoil: "green",
  Cube: "violet",
  Quack: "gold",
}

export function spriteTone(variant: string): SpriteTone {
  return variantTones[variant] ?? "aqua"
}

export function presentSprite(item: CollectionItem): Sprite {
  return { ...item, tone: spriteTone(item.variant) }
}

export function completionPercent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100)
}
