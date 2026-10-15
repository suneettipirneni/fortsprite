# Sprite variant abilities

Reviewed October 15, 2026. Variant effects stack with the individual Sprite's base abilities. The details panel labels these separately using the variant name. `apps/web/lib/sprite-abilities.ts` holds the reviewed effects and sources; `catalog.json` includes the effects in both description fields for API/MCP consumers after catalog import.

Fortnite.GG omits variant effects on some detail pages. Sixty entries needed their variant effect added: 26 Trick or Treat, nine Cube, nine Quack, and four each of Gold, Cheat Master, Loot Hacker, and Bounty Hunter. The prior 54 count measured descriptions identical to their base entry and missed six descriptions with different line grouping or text. The UI also supplies reviewed variant effects for older database imports and removes the duplicate from base ability text.

| Variant | Effect | Evidence |
| --- | --- | --- |
| Gold | 3× elimination XP | [Gold Vampire](https://fortnite.gg/sprites/228-gold-vampire-sprite) |
| Cheat Master | Any inputs work when entering world cheat codes | [Cheat Master Jonesy](https://fortnite.gg/sprites/183-cheat-master-jonesy-sprite) |
| Loot Hacker | Increased item spawn chances from Loot Hacks | [Loot Hacker Jonesy](https://fortnite.gg/sprites/110-loot-hacker-jonesy-sprite) |
| Bounty Hunter | Chance to find Sprites on eliminations; Sprite XP only from eliminations unless special XP rules apply | [Bounty Hunter Adventure](https://fortnite.gg/sprites/207-bounty-hunter-adventure-sprite) |
| Trick or Treat | Chance to find candy when opening containers | [Jonesy, extracted game-file perks](https://fortnitespritelist.com/sprites/JonesySprite_Variant_TrickTreat) |
| Quack | Other Sprites in your match inventory receive 50% of the equipped Quack Sprite's progress | [Epic v41.30 update notes](https://communities.epicgames.com/thread/v41-30-act-iii-battle-royale-update-notes/LMZJ) |
| Cube | Overdrive in the Storm | [Boss, extracted game-file perks](https://fortnitespritelist.com/sprites/BossSprite_Variant_Cube), [independent guide](https://games.gg/fortnite/guides/fortnite-cube-sprites-all-variants-and-locations/) |
| Gummy | 20% more Sprite Dust on extraction | [Gummy Llama](https://fortnite.gg/sprites/153-gummy-llama-sprite) |
| Galaxy | 30% more ammo when picked up | [Galaxy Llama](https://fortnite.gg/sprites/154-galaxy-llama-sprite) |
| Holofoil | 5% squad chance to find rare variants from looted chests | [Holofoil Seven](https://fortnite.gg/sprites/57-holofoil-seven-sprite) |
| Gem | 30% less fall damage | [Gem Llama](https://fortnite.gg/sprites/155-gem-llama-sprite) |

New variant labels require a reviewed effect and source. The catalog coverage test fails if a non-base variant has no reviewed effect or omits it from either description field. Unknown variants render their supplied description without inventing an effect.

These corrections do not re-verify unrelated spawn rates, costs, locations, or base abilities. Existing per-Sprite source URLs and verification dates retain that provenance. Missing base text remains explicitly unavailable.
