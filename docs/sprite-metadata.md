# Sprite metadata sources

The Treasure Hunters snapshot uses season 43 (`C7 MS`) and includes 42 released entries. Reviewed November 15, 2026 against Epic's v43.10 notes and Fortnite.GG's current collectible roster: Mini Miku and Squiplash now have Base, Fortune, and Cursed forms, and Zee has a Base form. Their source IDs are 321, 323, 324, 332, 334, 335, and 338. Cursed Kelper (`fortnite-gg:300`), released November 12, is also now marked released. The full catalog contains 321 released entries.

All existing Sprite IDs and collection history are preserved. Transponder Snail, Sweet Dreams, and Zee have only Base entries. Treasure Hunters Gold variants and every Sir Oscar the Second form remain unreleased and are excluded. Existing ability and summon-cost metadata is unchanged; the raw current-season summon cost remains zero and the displayed cost unknown. [Epic v43.10 notes](https://communities.epicgames.com/thread/v43-10-fortnite-treasure-hunters-update-notes/CoOG) · [Fortnite.GG roster](https://fortnite.gg/sprites) · [Cursed Kelper](https://fortnite.gg/sprites/300-cursed-kelper)

The new records retain Fortnite.GG detail-page provenance and include the reviewed Fortune/Cursed effects alongside each base ability. Mini Miku's base portrait is sourced from the corroborating [fnsprites.info tracker](https://www.fnsprites.info/) because its Fortnite.GG detail page could not be retrieved; `sourceImage` records that exact PNG source. The other six portraits come from Fortnite.GG. All seven images are bundled locally.

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
