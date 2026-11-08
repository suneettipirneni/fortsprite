# Sprite metadata sources

The Treasure Hunters snapshot uses season 43 (`C7 MS`) and retains all 35 known entries. Reviewed November 8, 2026 against Epic's Captain's Day announcement and Fortnite.GG's live roster: ten Cursed variants and all three Lil’ Uzi Vert Jr. variants are now released. Because Cursed Lil’ Uzi Vert Jr. belongs to both groups, this releases 12 previously held entries, bringing the season to 34 released entries and the full catalog to 313 released entries. The all-season roster contains source IDs 1–314 except 300, with no additional released identities.

Cursed Kelper (`fortnite-gg:300`) remains explicitly unreleased on Fortnite.GG and is absent from its collectible roster. Keep this record in `apps/web/assets/catalog.json` with `releaseStatus: "unreleased"` until availability is confirmed. All existing Sprite IDs and collection history are preserved. Transponder Snail was confirmed by a user's in-game catch; it and Sweet Dreams have only Base entries. Returning Gold variants are scheduled for November 22 and are not part of this release. Existing ability and summon-cost metadata is unchanged; the raw current-season summon cost remains zero and the displayed cost unknown. [Epic Captain's Day announcement](https://communities.epicgames.com/thread/captains-day-lil-uzi-vert-november-8/t3YN) · [Epic launch notes](https://communities.epicgames.com/thread/set-sail-for-fortnite-treasure-hunters-the-greatest-adventure-of-all-time/Pmud) · [Fortnite.GG roster](https://fortnite.gg/sprites) · [Cursed Kelper](https://fortnite.gg/sprites/300-cursed-kelper)

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
