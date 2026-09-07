# FortSprite MVP Requirements

Status: Draft product specification
Target stack: TypeScript, Next.js, Hono, Better Auth, Drizzle ORM, PostgreSQL
Purpose: Define requirements at a level that can be translated directly into automated tests.

## 1. Product outcome

FortSprite is an unofficial companion app that lets signed-in users:

1. Record which Fortnite Sprite catalog items they own.
2. Record which owned catalog items they have mastered.
3. Connect with other FortSprite users as friends.
4. Automatically appear as available to help friends with items they own.
5. See which missing items are available through accepted friends.
6. Compare collections with a friend so both users can coordinate in Fortnite.

The MVP is a tracker and coordination tool. Epic Games OAuth establishes identity only; FortSprite does not read or synchronize Fortnite gameplay or collection data, alter an in-game collection, transfer an item, guarantee a trade, or provide in-app chat or payments.

### Catalog reference

The initial human reference for Sprite names and metadata is the [Fortnite.GG Sprite catalog](https://fortnite.gg/sprites). It currently distinguishes base Sprites from collectible variants, released from unreleased items, and ownership from mastery. Its item pages also expose metadata such as rarity, description/ability, location, variant, summon cost, and drop chances.

FortSprite must not depend on Fortnite.GG at runtime. Catalog data will be stored as a curated, versioned snapshot so the app and its tests continue to work if that page changes or is unavailable. Referencing the site does not grant permission to copy its images or proprietary data wholesale; `LEGAL-002` still applies.

## 2. Requirement conventions

- `P0` means required for the first usable release.
- `P1` means valuable immediately after the first release but not a launch blocker.
- Every `Given / When / Then` statement is an acceptance criterion and should become at least one automated test.
- “Sprite” means an exact collectible catalog item, including its variant. For example, a Base Water Sprite and a Gold Water Sprite are two different catalog items.
- “Owns” means the user says the item is present in their Fortnite collection. FortSprite does not independently verify this claim.
- “Mastered” means the user says an owned item has reached its in-game mastery state. Mastery is tracked independently per exact catalog item but cannot be true for a missing item.
- “Can help” means an accepted friend owns that exact item. Availability is derived from ownership and friendship, with no separate opt-in or mastery requirement. It does not imply willingness, a transfer, or a guarantee.
- A “friend” is another user with an accepted friendship. Pending requests do not grant friend access.

## 3. Actors and permissions

| Actor | Capabilities |
| --- | --- |
| Visitor | View the Epic Games sign-in, legal, privacy, and authentication-error pages |
| Authenticated user | Manage their own profile, collection, friend relationships, and friend overview |
| Friend | View the collection and help availability exposed by an accepted friend |
| Administrator | Maintain catalog data through a protected administrative mechanism |

## 4. Functional requirements

### 4.1 Accounts and sessions

#### AUTH-001 — Create an account through Epic Games (`P0`)

Given a visitor has no FortSprite account, when they complete the Epic Games authorization flow with the required consent, then Better Auth creates exactly one local user and one Epic provider account linked by Epic's immutable account identifier.

Given that same Epic identity completes the flow again, when account matching occurs, then the existing FortSprite user is signed in and no duplicate user or provider account is created.

Given the Epic callback is denied, malformed, missing a valid state, replays an already-consumed authorization response, or fails provider verification, then no account or session is created and the visitor receives a safe recoverable error.

Given any request targets Better Auth email/password, magic-link, registration, or a non-Epic social provider flow, then the flow is unavailable and no account or session is created.

#### AUTH-002 — Sign in and sign out with Epic Games (`P0`)

Given a visitor opens the sign-in page, then Epic Games is the only sign-in action and no local email, password, or alternate-provider controls are rendered.

Given an existing user completes valid Epic authorization, then Better Auth creates a secure session and sends the user to the validated in-app destination or the authenticated dashboard.

Given Epic authorization fails or the user cancels consent, then the app returns a generic recoverable authentication error and creates no session.

Given an authenticated user, when they sign out, then the current session is invalidated and protected pages and endpoints no longer accept it.

#### AUTH-003 — Protect authenticated resources (`P0`)

Given a visitor without a valid session, when they navigate to an authenticated page, then they are redirected to sign in and the intended destination is preserved.

Given a request without a valid session, when it calls a protected API endpoint, then the API returns `401` and performs no mutation.

Given the web application cannot reach the authentication service, when a visitor requests a protected page, then access fails closed and the visitor is sent to sign in rather than receiving protected content.

#### AUTH-004 — Epic authorization boundaries (`P0`)

Given FortSprite starts an Epic authorization request, then it requests only `basic_profile` to identify the account and `friends_list` to retrieve the consented Epic friends list; collection, presence, friend-management, or unrelated Epic permissions are not requested.

Given an Epic access or refresh token is stored by Better Auth, then application pages and business APIs never expose the token, and logs never record it.

Given a user loses access to their Epic account, then FortSprite directs them to Epic's account-recovery flow; FortSprite provides no local password-reset path.

#### AUTH-005 — Delete an account (`P1`)

Given a user confirms account deletion, when deletion completes, then their authentication data, profile, collection entries, friend requests, friendships, and blocks are removed or irreversibly anonymized according to the documented retention policy.

Given a FortSprite account is deleted, then the deletion does not claim to delete, alter, or revoke the user's Epic Games account beyond revoking FortSprite's own authorization where supported.

Given a deleted account, when another user opens previously cached friend data, then the deleted profile and collection are no longer available.

### 4.2 Profiles and identity

#### PROF-001 — Unique app handle (`P0`)

Given a user chooses a handle, then it must be 3–24 characters, contain only letters, digits, underscores, or hyphens, and be unique case-insensitively.

Given users `SpriteFan` and `spritefan`, when uniqueness is evaluated, then the handles conflict.

#### PROF-002 — Profile fields (`P0`)

Given an authenticated user, when they update their profile, then they can set a display name and an optional Fortnite display name, subject to documented length and character validation.

Given a display name is sourced from an Epic identity claim, then the UI may label it as Epic-provided but must not claim that Epic verified the user's manually tracked collection.

Given a Fortnite display name is manually entered rather than sourced from Epic, then the UI labels it as user-provided.

#### PROF-003 — Profile authorization (`P0`)

Given an authenticated user, when they update a profile other than their own, then the API returns `403` or `404` and no data changes.

Given two users are not accepted friends, when either requests the other’s private collection endpoint, then collection data is not returned.

### 4.3 Sprite catalog

#### CAT-001 — Catalog item identity (`P0`)

Each catalog item must have a stable ID, unique slug, base sprite name, variant name, rarity, image reference, release status, display order, source page URL, source verification date, and created/updated timestamps.

The model must allow optional reference metadata including an ability/description, location text, Sprite Dust value (labeled “Summon Cost” by the reference), exact drop-chance entries, and level progression without requiring those fields to track ownership.

Given an approved released catalog snapshot is complete, then every listed Sprite has a stable key, base name, normalized variant, source variant, rarity, release state, display order, local image reference, Sprite Dust value, drop-chance value, source page, and source verification date. Optional description, location, and progression fields are stored when present and remain absent when the source does not provide them.

Given two catalog items share a base sprite but have different variants, when collection state is stored or queried, then they remain independently trackable.

Given a catalog import is rerun, when an item has the same stable external key or slug, then the existing item is updated rather than duplicated.

#### CAT-002 — Browse and search the catalog (`P0`)

Given an authenticated user opens their collection, then all released catalog items are shown in deterministic order with name, variant, rarity, image, and the user’s current ownership state.

Given a user enters a search term, when it matches a base name or variant case-insensitively, then only matching items are shown.

Given a user selects rarity, variant, or ownership filters, then the displayed results satisfy all active filters.

Given no item matches, then the UI shows an empty state and a way to clear filters.

#### CAT-003 — Handle catalog changes safely (`P0`)

Given a new released item is added, then it becomes visible without requiring changes to application code.

Given an item is retired or corrected, then existing user collection records remain referentially valid and the item is not silently deleted.

Given an item is not released, then it does not count toward user completion and is not shown in the default collection view.

#### CAT-004 — Protect catalog administration (`P0`)

Given a non-administrator, when they attempt to create, update, retire, or delete catalog data, then the request is rejected and no catalog data changes.

Given a catalog write contains an invalid rarity, missing stable key, unsafe image URL, or duplicate slug, then the write fails validation.

#### CAT-005 — Curate from the reference catalog (`P0`)

Given an administrator imports or updates the curated Fortnite.GG snapshot, then base name, variant, rarity, release status, source URL, and source verification date are preserved for each referenced item.

Given the reference adds or removes a variant type, rarity value, or optional metadata field, then an administrator can represent the update through validated catalog data rather than an application-code release.

Given the import runs against an unchanged snapshot, then it is idempotent and changes neither catalog item IDs nor user collection records.

Given Fortnite.GG is unavailable, changes its markup, or returns incomplete content, then normal FortSprite reads continue from the last approved snapshot and no existing catalog data is destructively replaced.

Catalog counts, available filter values, and completion denominators must be derived from approved released catalog records; the current reference total must never be hard-coded into application logic or tests.

#### CAT-006 — Display optional Sprite details (`P1`)

Given an item has curated optional metadata, when a user opens its detail view, then the app can show its description/ability, location, Sprite Dust value, drop chances, and level progression with a link to the recorded source page.

Given the reference labels an item’s Sprite Dust value as “Summon Cost,” then the importer preserves the numeric value as `spriteDustValue` and records the source label for provenance.

Given an optional value is absent or not currently verified, then the UI omits it or labels it unavailable and does not fabricate a value.

Given a probability is stored, then its numeric precision is preserved even when it is less than `0.01%`.

### 4.4 Personal collection

#### COLL-001 — Mark an item owned or missing (`P0`)

Given a released catalog item, when its owner marks it owned, then exactly one collection entry exists for the user/item pair and subsequent reads return `owned: true`.

Given an owned item, when its owner marks it missing, then subsequent reads return `owned: false` and its `mastered` state becomes false and it stops qualifying for friend availability in the same transaction.

Given the same desired state is submitted more than once, then the result is idempotent and no duplicate record is created.

#### COLL-002 — Collection authorization (`P0`)

Given one user, when they attempt to mutate another user’s collection entry, then the operation is rejected and neither ownership nor help state changes.

#### COLL-002A — Track mastery (`P0`)

Given a user owns an item, when they mark it mastered, then subsequent reads return `mastered: true` for that exact user/item pair.

Given a mastered item, when its owner marks it not mastered, then ownership remains true and subsequent reads return `mastered: false`.

Given a user does not own an item, when they attempt to mark it mastered, then the API rejects the invalid state and persists no mastery flag.

Given a user marks a mastered item missing, then ownership and mastery are updated atomically so the item is no longer owned, mastered, or available to friends.

Given an accepted friend views a collection or comparison, then mastery may be shown for visible collection entries; visitors, pending requesters, blocked users, and unrelated users receive no mastery data.

#### COLL-003 — Collection progress (`P0`)

Given `R` released items and the user owns `O` distinct released items, then the collection overview shows `O / R` and a completion percentage calculated as `O ÷ R × 100`.

Given the catalog contains retired, unreleased, or duplicate database rows, then only distinct released catalog items participate in the denominator.

Given the released catalog is empty, then progress renders as `0 / 0` and `0%` without a divide-by-zero error.

The overview must also show a distinct mastered count and mastered percentage calculated against all distinct released catalog items. Ownership completion and mastery completion must never be conflated.

#### COLL-004 — Collection mutation feedback (`P0`)

Given a user changes ownership, then the control communicates its pending state without blocking unrelated collection actions.

Given the server accepts the mutation, then the displayed state and progress settle to the persisted values.

Given the server rejects the mutation, then the UI restores the persisted state and shows an accessible error message.

### 4.5 Help availability

#### HELP-001 — Derive availability from ownership (`P0`)

Given a user owns an item, then accepted friends automatically see that the user may be able to help with that item, whether or not it is mastered.

Given a user does not own an item, then they are not available to help with it. No per-item help flag or opt-in control exists.

Given a user marks an item missing, then subsequent friend availability reads exclude it.

#### HELP-002 — Availability privacy (`P0`)

Given a visitor, pending requester, declined requester, blocked user, or unrelated authenticated user, when they request someone’s help availability, then no help data is returned.

Given an accepted friend, when they request a friend’s availability, then all currently owned items are returned.

#### HELP-003 — Availability freshness (`P0`)

Given a friend removes the item from their collection, unfriends the viewer, or blocks the viewer, when the viewer next refreshes or revalidates friend availability, then that friend is absent from the item’s available helpers.

The UI must show when collection/help data was last updated so users do not interpret old information as guaranteed current availability.

### 4.6 Friend relationships

#### FRND-001 — List consented Epic friends (`P0`)

Given an authenticated user granted `friends_list`, when they open Friends, then FortSprite requests their current Epic friends list with the server-held user access token and returns only display-safe friend fields.

Given Epic omits a friend because that account has not consented to Basic Profile for the Epic application, then FortSprite does not attempt to bypass the omission or infer that account's identity.

Given friend account records are resolved, then the API batches account lookups and never returns Epic account IDs, OAuth tokens, email addresses, or linked platform identifiers to the browser.

#### FRND-002 — Preserve Epic relationship ownership (`P0`)

Given a user wants to add, remove, block, accept, or decline an Epic friend, then FortSprite directs them to Epic-owned relationship controls rather than mutating the Epic relationship.

Given an Epic friendship changes outside FortSprite, then the next friends refresh reflects Epic's current result.

#### FRND-003 — Activate FortSprite sharing (`P0`)

Given an Epic friend has not joined FortSprite or has not explicitly enabled collection sharing, then no collection, mastery, or help-availability data is exposed for that friend.

Given both Epic friends have FortSprite accounts and approve the product's sharing relationship, then friend-only collection comparisons may be enabled without treating the Epic friendship itself as sharing consent.

#### FRND-004 — Friends states (`P0`)

Given Epic returns zero visible friends, then the UI presents an intentional empty state explaining the Basic Profile consent boundary rather than showing demo profiles.

Given Epic or the FortSprite API cannot refresh friends, then the UI presents a recoverable error state and does not falsely display a successful empty list.

#### FRND-005 — Friend data freshness (`P0`)

Given an authenticated user reloads the Friends page, then FortSprite requests the current Epic list rather than presenting a persistent browser-side copy as authoritative.

Given token refresh is required, then Hono obtains a valid provider token through Better Auth and never exposes the refreshed token to application pages or API responses.

### 4.7 Friend availability overview

#### OVER-001 — Summarize missing-item coverage (`P0`)

Given the current user is missing `M` released items, then the overview shows:

- the total missing count;
- the number of missing items for which at least one accepted friend owns the item; and
- the number of missing items with no friend who owns them.

Each item is counted once in the summary even if multiple friends can help.

#### OVER-002 — Show where help is available (`P0`)

Given the user is missing an item and one or more accepted friends own it, then the overview shows the item and every eligible friend who owns it.

Given an accepted friend owns an item without mastering it, then that friend is still shown as a source for it.

Given the current user already owns an item, then it is excluded from the default “friends can help” list.

Given multiple friends can help with the same item, then the UI groups them beneath one catalog item rather than duplicating the item.

#### OVER-003 — Filter and sort the overview (`P0`)

The overview must support search plus rarity, variant, and availability filters.

Given the default sort, then items with one or more available friends appear before unavailable items, followed by deterministic catalog order.

Given active filters produce no matches, then the UI explains why and offers a clear-filters action.

#### OVER-004 — Compare with one friend (`P0`)

Given an accepted friend, when the current user opens comparison, then the app can show at least these two independently filtered sets:

1. Items the current user is missing and the friend owns.
2. Items the friend is missing and the current user owns.

Given the relationship is no longer accepted, then the comparison is no longer accessible even through a previously known URL.

#### OVER-005 — Coordinate outside the app (`P0`)

Given an eligible friend, then the UI shows the friend’s app display name and, when provided, their user-supplied Fortnite display name so the users can coordinate in Fortnite.

The UI must not label an offer as a completed trade, promise that an item can be transferred, or claim that a Fortnite name has been verified.

#### OVER-006 — Avoid leaking friend data (`P0`)

Given an overview or comparison API response, then it contains only data needed for the requesting user’s authorized view and does not expose friend email addresses, Epic account identifiers, OAuth tokens, authentication sessions, or unrelated collection records.

### 4.8 Navigation and basic UI states

#### UI-001 — Primary navigation (`P0`)

Given an authenticated user, then primary navigation provides direct access to Overview, Collection, Friends, Friends Can Help, and Account.

Given the current route, then its navigation item is programmatically identifiable as current.

#### UI-002 — Loading, empty, and error states (`P0`)

Every data-backed page must have a meaningful loading state, an empty state where an empty result is valid, and a recoverable error state where loading can fail.

Loading UI must not falsely display zero progress, an empty collection, or “no friends can help” before the relevant request finishes.

#### UI-003 — Responsive interaction (`P0`)

All launch-critical tasks must be usable at viewport widths of 320 CSS pixels and above without horizontal page scrolling.

Interactive controls must remain reachable and readable with touch, mouse, and keyboard input.

#### UI-004 — Sprite grid and metadata preview (`P0`)

Given an authenticated user opens the collection, then released Sprites are presented as a responsive visual grid of independently actionable tiles rather than a vertically stacked form per Sprite.

Given a fine-pointer user hovers a Sprite tile, then an anchored Hover Card opens with the Sprite’s variant, rarity, mastery state, and friend availability without navigating or opening a modal.

Given a keyboard user focuses the same tile, then the same Hover Card preview opens, the tile’s full metadata remains available through its accessible name, and the focus indicator remains visible.

Given a touch user activates a tile, then an accessible detail surface presents the same metadata and the ownership and mastery controls; no required information or action depends on hover support.

Given collection state changes in the detail surface, then the tile’s persistent ownership, mastery, and friend-availability summary updates immediately and remains consistent with the collection invariants.

#### UI-005 — Fortnite-inspired locker presentation (`P0`)

Given an authenticated user opens a product page, then the interface uses the shared Fortnite-inspired visual system: a layered blue gradient-mesh stage, high-contrast light text, a yellow primary action, compact uppercase navigation, and aligned italic display typography, without reproducing Fortnite logos, character artwork, or trade dress verbatim.

Given a page heading contains a title, subtitle, and supporting copy, then the three text roles share a clear left edge, preserve visible word spacing, and use distinct shared typography treatments rather than page-specific font declarations.

Given a desktop-width user opens the collection, then the primary navigation is presented in the top application header and the collection is arranged as a dense locker-style grid.

Given a user opens the app below the desktop navigation breakpoint, then the primary navigation is available through an accessible modal Sheet with a programmatic title, description, focus containment, Escape-key dismissal, and focus restoration to its trigger.

Given a Sprite tile is rendered, then its artwork surface uses a deterministic color-coded background treatment derived from the exact variant type rather than ownership, mastery, or rarity. At minimum, Base, Gold, Gummy, Galaxy, Gem, Holofoil, Cube, and Quack map to documented shared theme treatments, and the same variant treatment is reused in the grid tile, Hover Card, and detail surface.

Given two Sprites have different configured variants, then their computed background treatments differ unless both variants intentionally share one documented treatment.

Given a Sprite is missing, owned, or mastered, then its persistent tile state communicates the status with an icon, label, accessible name, or structural indicator in addition to color. Missing items show a lock indicator, owned items show an ownership indicator, and mastered items show a distinct selected frame and mastery indicator.

Given one or more accepted friends can help with a missing Sprite, then its tile shows the current helper count and its Hover Card identifies the available friends.

### 4.9 Legal and product boundaries

#### LEGAL-001 — Unofficial product notice (`P0`)

The public site must state that FortSprite is an unofficial fan-made tool and is not affiliated with, endorsed by, or sponsored by Epic Games.

The app must provide accessible Privacy Policy and Terms links from public authentication pages and the authenticated account area.

#### LEGAL-002 — Asset provenance (`P0`)

Every catalog image and third-party data source must have a documented origin and usage basis before production use.

Given an image has no approved source, then the production catalog must use a neutral placeholder rather than shipping the unapproved asset.

## 5. Data invariants

These invariants should be enforced at the database level where possible and duplicated in service validation where doing so improves error messages.

| ID | Invariant |
| --- | --- |
| DATA-001 | The Epic provider's immutable account identifier maps to at most one local Better Auth account and one FortSprite user. |
| DATA-002 | Profile handles are unique case-insensitively. |
| DATA-003 | Catalog slugs and stable external keys are unique. |
| DATA-004 | At most one collection record exists per `(userId, catalogItemId)`. |
| DATA-005 | Friend availability is derived from ownership and accepted friendship. No separate help opt-in is stored. |
| DATA-005A | `mastered = true` implies `owned = true`. |
| DATA-006 | At most one active friend relationship/request exists for an unordered pair of users. |
| DATA-007 | A user cannot friend, request, or block themself. |
| DATA-008 | A block and an accepted friendship cannot coexist for the same user pair. |
| DATA-009 | Deleting or disabling a catalog item must not orphan collection history. |
| DATA-010 | Every imported catalog item records its source URL and the date its source metadata was last verified. |

## 6. API and architecture requirements

#### ARCH-001 — Runtime boundaries (`P0`)

- Next.js owns the web UI and page rendering.
- Hono owns the application API under a versioned prefix such as `/api/v1`.
- Better Auth owns Epic OAuth, sessions, and supported local account lifecycle endpoints; local passwords and alternate identity providers are disabled.
- Drizzle ORM owns application schema definitions, typed queries, and migrations for PostgreSQL.
- Business authorization is enforced in Hono service/API code, not only in React or middleware redirects.
- Shared request/response contracts must be TypeScript-safe across the Hono API and Next.js client.

#### ARCH-001A — Monorepo and UI system (`P0`)

- The repository uses pnpm workspaces and Turborepo.
- Deployable applications live under `apps/`, initially `apps/web` and `apps/api`.
- Shared interface code lives in the single `packages/ui` package.
- `packages/ui` is initialized through the official shadcn CLI and contains the complete official component registry so product screens compose shared primitives instead of recreating them per app.
- Brand colors, typography, radii, focus treatment, surfaces, charts, and sidebar tokens are defined in the UI package’s global theme and consumed through semantic Tailwind utilities.
- The Next.js app imports UI components only through `@workspace/ui` package exports and must not reach into package source files with relative paths.
- Root scripts delegate to `turbo run`; package-specific build, lint, typecheck, test, database, and development logic remains in the package that owns it.

Given a UI primitive is rendered in the web app, when the theme changes between supported color schemes, then the primitive resolves its colors and states from shared semantic tokens without page-specific raw color overrides.

Given a package is built, linted, or typechecked from the repository root, then Turborepo runs the owning package task and respects workspace dependency ordering.

#### ARCH-001B — Database ownership (`P0`)

PostgreSQL is the database of record. Drizzle schema definitions and migrations are owned by `apps/api`; the web app must not connect directly to PostgreSQL.

Better Auth uses its supported Drizzle adapter with the PostgreSQL provider, and its schema changes are generated into Drizzle schema/migrations rather than applied by an unrelated migration system.

Given a schema change is proposed, then a deterministic Drizzle migration can be generated, reviewed, and applied through package-local scripts.

Given application code accesses persistence, then it does so through a typed Drizzle query or transaction owned by the API package.

#### ARCH-001C — Epic OAuth deployment contract (`P0`)

- Epic client ID, client secret, provider endpoints, approved scopes, and Better Auth secret are supplied only through deployment secrets and are never committed to the repository or bundled into the browser.
- The Epic application registration contains the exact Better Auth callback URL for each deployed environment.
- Better Auth uses its Generic OAuth provider integration for the Epic authorization-code flow, including state validation and PKCE when supported by the registered Epic client.
- Provider response fields are mapped only from the Epic Developer Portal contract for the registered product; unverified community endpoint assumptions are not accepted as production configuration.
- The Hono auth handler is the only endpoint that exchanges Epic authorization codes. Authenticated Hono application services may obtain a valid provider token through Better Auth for approved Epic API calls, but tokens never enter browser code or application API responses.

Given required Epic configuration is absent or malformed, then the API fails startup with the name of the missing configuration key and does not start in a partially authenticated mode.

Given a callback URL is not allowlisted for the current Epic client, then deployment verification fails before release.

#### ARCH-002 — Request validation (`P0`)

All mutation endpoints and all query parameters must be runtime-validated before entering business logic.

Invalid requests return a consistent structured error shape with a stable machine-readable code and safe human-readable message.

Unknown request fields must not be able to mutate protected attributes such as `userId`, role, friendship owner, or catalog administrator status.

#### ARCH-003 — Authorization and transactions (`P0`)

Every object-level read or mutation must derive the acting user from the verified session, never from a trusted client-supplied user ID.

Multi-record state changes, including accepting a friendship, removing a friendship, blocking a user, and clearing `mastered` when ownership is removed, must be atomic.

#### ARCH-004 — Consistent API behavior (`P0`)

The API should use these status semantics consistently:

| Outcome | Status |
| --- | --- |
| Successful read/update | `200` |
| Successful creation | `201` |
| Successful deletion with no body | `204` |
| Invalid input | `400` or `422`, chosen once for the API |
| Missing/invalid session | `401` |
| Authenticated but unauthorized | `403` or privacy-preserving `404` |
| Not found | `404` |
| State/uniqueness conflict | `409` |
| Rate limited | `429` |

#### ARCH-005 — Observability (`P1`)

Server errors must have a correlation/request ID in logs and safe error responses.

Authentication events, catalog administrative writes, and authorization failures must be auditable without logging OAuth codes, Epic access or refresh tokens, session cookies, or unnecessary personal data.

## 7. Non-functional requirements

#### NFR-001 — Accessibility (`P0`)

Launch-critical flows must meet WCAG 2.2 AA expectations, including keyboard operation, visible focus, semantic labels, sufficient contrast, non-color-only state communication, and announcements for asynchronous success or failure.

Automated accessibility checks must report no serious or critical violations on sign-in, collection, friends, and friend overview pages. Keyboard-flow tests must cover every critical action because automated checks alone are insufficient.

#### NFR-002 — Security (`P0`)

- Production sessions use secure, HTTP-only cookies with an appropriate SameSite policy.
- State-changing browser requests have CSRF protection appropriate to the Better Auth and Hono integration.
- Local password, email/password registration, magic-link, and non-Epic social sign-in endpoints are disabled.
- OAuth state and callback validation, PKCE where supported, secure token handling, and CSRF protections are delegated to the configured Better Auth flow rather than reimplemented in application code.
- User-provided profile text is escaped when rendered and cannot inject HTML or script.
- Authentication and user-discovery endpoints are rate-limited.
- Authorization tests cover every user-owned and friend-only endpoint.

#### NFR-003 — Performance (`P0`)

With a test dataset of 250 catalog items and 100 accepted friends, the collection and friend overview APIs must return within 500 ms at the 95th percentile in the agreed production-like test environment, excluding network latency.

The UI must avoid one API request per friend or per catalog item when generating the friend overview; the overview is delivered through a bounded aggregate query/API response.

#### NFR-004 — Reliability and concurrency (`P0`)

Concurrent collection updates, crossed friend requests, and repeated accept/remove actions must preserve all data invariants and return deterministic success or conflict results.

User-visible mutations must never report success before the server has either committed the result or the UI can safely reconcile an optimistic state with a failure.

#### NFR-005 — Browser support (`P0`)

The app must support the latest two stable major versions of Chrome, Safari, Firefox, and Edge at release time.

## 8. Required automated test suites

### 8.1 Unit tests

- Handle normalization and validation (`PROF-001`).
- Ownership and mastery progress calculations (`COLL-002A`, `COLL-003`).
- Catalog and overview filtering/sorting (`CAT-002`, `OVER-003`).
- Catalog snapshot normalization and idempotent import behavior (`CAT-005`).
- Epic account/friend response validation, batched account resolution, safe-field mapping, and consent-aware omission (`FRND-001` through `FRND-005`).
- Ownership-derived availability rules (`HELP-001`).
- Request schema validation and safe error mapping (`ARCH-002`, `ARCH-004`).

### 8.2 Database/integration tests

- Every invariant in `DATA-001` through `DATA-010`.
- Epic identity uniqueness and idempotent account creation (`AUTH-001`, `DATA-001`).
- Better Auth session recognition by protected Hono routes (`AUTH-002`, `AUTH-003`).
- Rejected state, replayed callback, canceled consent, invalid provider response, and disabled non-Epic/local sign-in paths (`AUTH-001`, `AUTH-004`).
- Object-level authorization for profile, collection, friendship, comparison, overview, and catalog endpoints.
- Atomic ownership/mastery/help and friend/block transitions (`ARCH-003`).
- Epic friends endpoint behavior for valid sessions, missing permission, expired-token refresh, upstream failure, zero visible friends, and batched populated results (`FRND-001` through `FRND-005`).
- Aggregate overview accuracy with multiple friends, missing items, unmastered owned items, retired items, removed friends, and blocks (`OVER-001`, `OVER-002`).

### 8.3 End-to-end tests

At minimum, automate these user journeys in a real browser:

1. Complete Epic authorization as a new visitor → create one account → sign out → protected-route redirect → authorize again → reuse the same account.
2. Browse the Sprite grid → open its anchored Hover Card metadata preview with pointer hover and keyboard focus → open details by touch/click → search/filter catalog → mark items owned and mastered → see the tile and both progress measures update → reload and verify persistence.
3. Mark an owned item mastered → mark it missing → verify mastery is cleared and the item disappears from friend availability.
4. User A authorizes Epic Friends access → sees only consented Epic friends → no Epic identifiers or tokens appear in browser responses.
5. Epic friend B joins FortSprite and explicitly enables collection sharing → B owns an item A is missing → A sees it in Friends Can Help → both open the two-way comparison.
6. B marks the item missing → A refreshes/revalidates → B disappears from the item’s available helpers.
7. One friend removes or blocks the other → previously accessible friend collection/comparison URLs are denied.
8. Invalid/failed collection mutation → optimistic UI reconciles and announces the error.
9. Keyboard-only completion of collection update, Epic friends navigation, sharing approval, and friend overview filtering.
10. Mobile-width completion of collection and friend-help journeys with no horizontal page overflow.

### 8.4 Test data requirements

Shared test builders/fixtures must be able to create:

- visitors, normal users, friends, pending requesters, unrelated users, blocked users, and administrators;
- released, unreleased, and retired catalog items across multiple base names, variants, and rarities;
- owned, missing, mastered, and unmastered collection states; and
- cases where zero, one, or many friends can help with the same item.

Tests must not depend on production catalog ordering, mutable live Fortnite data, live Fortnite.GG responses, real Epic authorization, or third-party network availability. Epic integration tests must use deterministic local OAuth, Friends, and Accounts API fixtures that cover success, consent denial, invalid state, replay, malformed responses, empty friends, missing friend profiles, pagination/batching limits, token refresh, and upstream failure. Catalog importer tests must use checked-in HTML/structured fixtures whose provenance and capture date are documented.

## 9. MVP release gate

The MVP is releasable when:

1. All `P0` acceptance criteria have automated coverage or an explicitly documented manual verification where automation is impractical.
2. All data invariants and authorization boundaries pass integration tests.
3. The ten critical end-to-end journeys pass in the primary CI browser, with targeted cross-browser coverage for authentication and the collection/friend overview flows.
4. Automated accessibility checks have no serious or critical findings and the defined keyboard tests pass.
5. Catalog assets have approved provenance or use placeholders.
6. Privacy Policy, Terms, unofficial-product notice, and account-support contact are present.

## 10. Deliberate MVP exclusions

The following are out of scope unless separately specified:

- Automated Fortnite collection, friend-list, or gameplay synchronization beyond the required Epic identity login.
- In-app transfer, escrow, payment, or guarantee of Sprite availability.
- In-app chat, push notifications, public collection links, public trading marketplace, groups, or teams.
- Per-level mastery progression, duplicate quantity, Sprite Dust calculations, collection history, reputation, and ratings. The MVP tracks only whether an exact Sprite is mastered.
- Native mobile applications.

These exclusions keep the first release focused. The data model should not use assumptions that make these features impossible later, but no unused abstractions are required for them now.
