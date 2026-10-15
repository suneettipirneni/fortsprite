import type { CatalogItem } from "@workspace/contracts"

// Reviewed variant-wide effects. See docs/sprite-abilities.md for provenance.
export const variantAbilities: Record<string, { description: string; source: string }> = {
  Gold: {
    description: "Gain 3x bonus XP from eliminations",
    source: "https://fortnite.gg/sprites/228-gold-vampire-sprite",
  },
  "Cheat Master": {
    description: "Button mash! All inputs are correct when entering cheat codes found in the world",
    source: "https://fortnite.gg/sprites/183-cheat-master-jonesy-sprite",
  },
  "Loot Hacker": {
    description: "Increases chances of spawning items from your Loot Hacks.",
    source: "https://fortnite.gg/sprites/110-loot-hacker-jonesy-sprite",
  },
  "Bounty Hunter": {
    description: "Chance to find sprites when eliminating opponents. Only gains sprite XP from eliminations, unless sprite has special XP rules.",
    source: "https://fortnite.gg/sprites/207-bounty-hunter-adventure-sprite",
  },
  "Trick or Treat": {
    description: "Chance to find candy when opening containers.",
    source: "https://fortnitespritelist.com/sprites/JonesySprite_Variant_TrickTreat",
  },
  Quack: {
    description: "While equipped, shares 50% of the Sprite XP it earns with every other Sprite in your match inventory.",
    source: "https://communities.epicgames.com/thread/v41-30-act-iii-battle-royale-update-notes/LMZJ",
  },
  Cube: {
    description: "Grants the Overdrive effect while you are in the Storm.",
    source: "https://fortnitespritelist.com/sprites/BossSprite_Variant_Cube",
  },
  Gummy: {
    description: "Gain 20% more Sprite Dust upon Extraction",
    source: "https://fortnite.gg/sprites/153-gummy-llama-sprite",
  },
  Galaxy: {
    description: "Gain 30% more Ammo whenever picked up in the world",
    source: "https://fortnite.gg/sprites/154-galaxy-llama-sprite",
  },
  Holofoil: {
    description: "5% chance for your squad to find rare Sprite Variants from looting chests",
    source: "https://fortnite.gg/sprites/57-holofoil-seven-sprite",
  },
  Gem: {
    description: "Take 30% less Fall damage",
    source: "https://fortnite.gg/sprites/155-gem-llama-sprite",
  },
}

export function spriteAbilities(
  sprite: Pick<CatalogItem, "variant" | "description" | "descriptionLines">,
) {
  const variantAbility = Object.hasOwn(variantAbilities, sprite.variant)
    ? variantAbilities[sprite.variant]
    : null
  const lines = sprite.descriptionLines.map((line) => line.trim()).filter(Boolean)
  // Older imports may only have the combined description, or omit the bonus.
  if (lines.length === 0 && sprite.description?.trim()) lines.push(sprite.description.trim())
  const baseAbilities = lines.flatMap((line) => {
    if (!variantAbility) return [line]
    if (line === variantAbility.description) return []
    if (line.startsWith(`${variantAbility.description} `)) {
      return [line.slice(variantAbility.description.length).trim()]
    }
    return [line]
  })
  return { variantAbility, baseAbilities }
}
