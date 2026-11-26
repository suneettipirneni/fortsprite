# Sprite metadata sources

Reviewed November 26, 2026 against Fortnite.GG's full roster: all 338 entries are released, including 59 Treasure Hunters entries (season 43). No new released identities were found since November 22. The 14 Gold variants and all four Sir Oscar the Second forms are now explicitly collectible in the source roster. [Fortnite.GG roster](https://fortnite.gg/sprites) · [Epic Oscar event notice](https://communities.epicgames.com/thread/captains-day-oscar-november-22/eOQD)

Updated the current season label from `C7 MS` to the source's `C7 Treasure Hunters`. Corrected six source names: Loot Hacker Bush, Bounty Hunter Crash Bandicoot, and Cheatmaster X-Ray, Onigiri, Vampire, and The Deer. The Bush and Crash Bandicoot source links now use their current names. Stable keys, IDs, slugs, variant categories, artwork, abilities, and resummon costs are preserved.

Mini Miku's base portrait comes from fnsprites.info. Its catalog record links to the source PNG. [Mini Miku portrait](https://www.fnsprites.info/spriteimg/minimiku_basic.png)

Fortnite.GG remains the primary source for identities, artwork, abilities,
locations and season labels. CertiFried's [Sprite catalog audit](https://certifriedmultitool.com/sprites/info)
supplements C7 S4 resummon costs from its published family pricing table. Reviewed
October 18, 2026; the page's audit was dated October 17, 2026. These are reported
costs from CertiFried, not an independent query to Epic.

The reviewed table is in `apps/api/src/catalog-metadata.ts`. Prices are scoped to
season 42 (C7 S4), known families and reviewed variant names. The special price
applies above Base; Mega Man has only a base price. Unknown families, variant types
and previous seasons keep their primary-source metadata. Do not derive costs from
rarity or extend the table to another season without review.

`catalogItem` applies the supplement to API/MCP and web reads, including existing
database rows. Imports also apply it, so reimporting Fortnite.GG's zero values
cannot overwrite reviewed costs. The catalog revision includes the supplemental
data. Responses include `spriteDustSource` with its URL, review and audit dates;
the details view links to it. There is no third-party request during a page load.

After reviewing source changes, update the table and dates, then refresh:

```sh
pnpm --filter @fortsprite/web catalog:sync-metadata
pnpm --filter @fortsprite/web catalog:validate
```

The refresh changes `spriteDustValue` only. Primary provenance (`sourcePage`,
`sourceVerifiedAt`, raw `sourceSummonCost`) remains intact. To persist resolved
values, run `catalog:import` with the target database environment. Sprite IDs and
collection history are preserved.

Resummon cost is dust spent retrieving a lost Sprite, distinct from extraction
rewards. Chest drop chances remain in source records but are hidden in the UI.
