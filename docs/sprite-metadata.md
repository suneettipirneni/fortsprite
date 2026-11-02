# Sprite metadata sources

The November 1 Treasure Hunters snapshot uses season 43 (`C7 MS`) and includes all 35 entries in Fortnite.GG's current-season roster. The initial 31-entry snapshot incorrectly treated Epic's launch-family list as exhaustive, excluding Transponder Snail and the Base, Cursed and Fortune versions of Lil’ Uzi Vert Jr. Transponder Snail was subsequently confirmed by a user's in-game catch; the Lil’ Uzi Vert Jr. entries follow Fortnite.GG's roster, with individual in-game availability not independently verified. As of November 2, the 11 Cursed variants are confirmed unreleased. Keep their status in the source snapshot (`apps/web/assets/catalog.json`) set to `unreleased` until the maintainer confirms their in-game release. This leaves 24 released entries in the season and preserves the Cursed records for existing collections. Sweet Dreams and Transponder Snail have only Base entries in that roster. Returning Gold variants are still scheduled for later. The detail pages report a raw summon cost of zero across the new roster, so the snapshot preserves that source field and leaves the displayed cost unknown. [Epic launch notes](https://communities.epicgames.com/thread/set-sail-for-fortnite-treasure-hunters-the-greatest-adventure-of-all-time/Pmud) · [Fortnite.GG roster](https://fortnite.gg/sprites) · [Transponder Snail](https://fortnite.gg/sprites/314-transponder-snail) · [Lil’ Uzi Vert Jr.](https://fortnite.gg/sprites/308-lil%27-uzi-vert-jr.)

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
