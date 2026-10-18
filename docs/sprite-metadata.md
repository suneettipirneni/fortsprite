# Sprite metadata sources

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
