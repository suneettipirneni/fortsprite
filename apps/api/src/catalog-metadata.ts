// Reviewed supplemental metadata. Keep Fortnite.GG as the primary catalog source.
// Scope costs to the season and variant names checked against the audit; never
// apply current-season pricing to archived Sprites or future variant types.
export const spriteDustSource = {
  name: "CertiFried",
  url: "https://certifriedmultitool.com/sprites/info",
  verifiedAt: "2026-10-18",
  auditedAt: "2026-10-17",
} as const

export const resummonCostGroups = [
  { base: 100, special: 1500, families: ["Adventure", "Bush", "Jonesy"] },
  { base: 1250, special: 1500, families: ["8-Bit", "Birthday", "Onigiri", "Storm Scout"] },
  { base: 1250, special: null, families: ["Mega Man"] },
  { base: 1500, special: 1800, families: ["Dumpster Dive", "Honey", "Morgana", "Overshield", "Pond", "Shadow", "Sonic", "Tails"] },
  { base: 1750, special: 2100, families: ["Blinky", "Crash Bandicoot", "Jackrabbit", "Killswitch", "The Deer", "Vampire", "X-Ray"] },
  { base: 2000, special: 2400, families: ["Crown", "Klombo", "One Wish Willow", "Spooky Dash"] },
] as const

const costsByFamily = new Map<string, { base: number; special: number | null }>(
  resummonCostGroups.flatMap((group) => group.families.map((family) => [family, group] as const)),
)
const specialVariants = new Set([
  "Gold", "Cheat Master", "Loot Hacker", "Bounty Hunter", "Trick or Treat", "Quack",
])

export function supplementalDustMetadata(sprite: {
  baseName: string
  variant: string
  sourceSeasonId?: number | null
  season?: string | null
}) {
  if (sprite.sourceSeasonId !== 42 || sprite.season !== "C7 S4") return null
  const costs = costsByFamily.get(sprite.baseName)
  if (!costs) return null
  const value = sprite.variant === "Base"
    ? costs.base
    : specialVariants.has(sprite.variant) ? costs.special : null
  if (value === null) return null
  return { spriteDustValue: value, spriteDustSource }
}
