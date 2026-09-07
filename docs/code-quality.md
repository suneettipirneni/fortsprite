# Code quality and organization review

Reviewed September 6, 2026. This pass covered the custom application code, API composition, public contracts, authentication boundaries, collection state flow, and regression tests. It did not restyle the UI or change the shared shadcn component inventory.

## Findings and changes

| Finding | Change | Why it matters |
| --- | --- | --- |
| Collection HTTP routes imported provider/database orchestration from another route module. | Moved consented friend resolution and helper availability into `apps/api/src/friend-service.ts`. | HTTP modules now consume application services without depending on sibling routes. |
| One social router combined friend sharing, profile editing and account deletion. | Split transport into `collection-routes.ts`, `friend-routes.ts`, and `profile-routes.ts`; `app.ts` composes them. | Each endpoint family has an obvious owner, while existing local queries and transactional invariants remain together. |
| Route factories accepted test dependencies but still called global helper discovery and account deletion. | Added explicit helper-lookup and deletion dependencies with production defaults. | Tests can exercise the HTTP boundary without accidentally invoking real Epic authentication or deleting through a different dependency. |
| Query validation relied on absolute parent paths and wildcard middleware reached unrelated paths. | Bound middleware to the actual endpoints and shared typed session/query handling in `http.ts`. | Routers validate correctly under another prefix. Unknown paths now return 404, rather than an incidental authentication or query error. |
| The collection screen combined page state with a large interactive tile and inline domain filtering. | Extracted the intact tile/dialog into `collection-sprite-tile.tsx` and pure filtering into `lib/collection-filter.ts`. | Screen-level synchronization is easier to trace; focus, hover and dialog state still have one owner. |
| Collection season ordering and combined filters lacked direct tests. | Added four characterization cases, first run against the original filter body. | Search normalization, season text, null ordering, tie stability, filter intersections and input immutability are pinned. |
| API test files were transpiled and executed without typechecking. | Added `apps/api/tsconfig.test.json` to the package's `typecheck` script. | Fixture and dependency-shape mistakes are caught before execution. |
| Some account fixtures stored OAuth scopes in the wrong format. | Made missing-friends-permission fixtures explicit and used Better Auth's comma-separated stored scopes for profile fixtures. Added permission/availability assertions. | Tests now describe their intended consent state instead of accidentally exercising fallback behavior. |

## Current ownership

| Area | Owner | Responsibilities |
| --- | --- | --- |
| App composition | `apps/api/src/app.ts` | Origins, cache headers, request IDs, authentication operation allowlist, health and router mounting. |
| HTTP mechanics | `apps/api/src/http.ts` | Typed session context, query rejection, shared friend/profile error translation. |
| Feature transport | `apps/api/src/*-routes.ts` | Request validation, session-derived user IDs, status codes and response cookies. |
| Friend orchestration | `apps/api/src/friend-service.ts` | Resolve consented Epic identities to local friends and degrade helper availability safely. |
| Local domain operations | `collection.ts`, `friends.ts`, `profile.ts`, `catalog.ts` | Persistence, projection, sharing/block invariants, catalog import and desired-state updates. |
| Epic integration | `apps/api/src/epic` | Provider HTTP boundaries, trusted identity, permissions and token retrieval. |
| Collection coordinator | `apps/web/components/collection-explorer.tsx` | Search/filter state, deferred query, optimistic collection state, pending saves and page layout. |
| Interactive tile | `apps/web/components/collection-sprite-tile.tsx` | Tile, preview, dialog, controls and focus restoration. |
| Collection behavior | `apps/web/lib/collection-filter.ts`, `collection-sync.ts`, `collection-state.ts` | Pure filtering, serialized/coalesced saves and ownership/mastery transitions. |
| Shared contracts | `packages/contracts` | Public response and mutation types without exposing provider tokens or account identifiers. |

The API's relative import graph has no cycles. Feature route modules do not import sibling feature routes.

## Decisions that keep the code smaller

- Kept the existing `components`/`lib` and API module conventions. A feature-folder migration would move many files without improving the current call graph.
- Kept collection synchronization in the screen coordinator. There is only one editor, so an additional editor hook would mostly move code behind another call.
- Kept tile, hover preview and dialog control together. Splitting those controllers would make focus restoration depend on more components.
- Kept collection filtering distinct from overview/comparison filtering. Their search text, season support, ordering and tie rules differ.
- Kept Better Auth responsible for authentication and token refresh. Replacing its checks with direct database reads to reduce query counts would change security behavior.
- Kept existing transactions, canonical friendship pairs and per-user write serialization. Their complexity protects real concurrent invariants.
- Removed old route modules after migrating their callers. There are no compatibility wrappers for the old layout.

## Verification

- Four filter characterization cases passed against the original algorithm before extraction; all 13 web unit tests pass after extraction.
- All 45 functional API tests pass. Six new boundary tests cover injected helpers, ready/unavailable availability, alternate router prefixes, unknown paths, privacy revocation, rate-limit headers and injected account deletion/cookie forwarding.
- Root lint and typechecking pass, including the API tests.
- Independent reviews of both frontend and API diffs found no unintended behavior change.
- Full browser regression and production build results are recorded in `docs/verification.md` after the final run.

## Remaining concerns

The performance gate remains unresolved. The latest run measured p95 524.21 ms against a 500 ms target. Previous pre-refactor runs also failed near that threshold. The measured fixture has 250 Sprites, 100 accepted friends, 12,500 ownership rows, 14 SQL queries and three simulated Epic calls per collection read. The response is approximately 2.15 MB. These measurements identify the workload, not the source of the latency. A dedicated profiling pass should separate SQL time, authentication work and response processing before changing the query or payload design. No performance threshold was relaxed.

Helper discovery intentionally returns an unavailable state on failure so collection tracking remains usable. Its catch-all fallback still provides limited diagnostic detail. A separate observability change can add safe error classification without leaking provider data or changing fallback behavior.

Live Epic callback verification, deployment configuration, production artwork availability and the supported browser-version release matrix remain release tasks described in `docs/vercel.md`.
