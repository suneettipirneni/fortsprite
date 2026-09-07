# Verification record

This record distinguishes implemented behavior, local evidence, and deployment checks. It is not a claim that a live Epic application or Vercel deployment has been verified.

## Requirement coverage

| Requirements | Implementation and local evidence | Remaining verification |
| --- | --- | --- |
| AUTH-001–004 | Real Better Auth handler, signed state, PKCE, trusted userInfo, repeat identity, consent, expiry, replay rejection, token refresh, sign-out and public DTO tests in `apps/api/tests/oauth.test.ts` and `integration.test.ts`. | Real registered Epic application and deployed callback. Local browser protocol flow passed. |
| AUTH-005 | Handle-confirmed account deletion through Better Auth, recent-session requirement, cascading session/account/collection/friendship/block removal, preservation of another user’s collection and subsequent 401 in `profile.test.ts`. | Browser confirmation and cancellation passed on desktop and mobile. |
| PROF-001–003 | Strict profile validation, case-insensitive database handle uniqueness, protected-field rejection and app-name preservation across provider login in `profile.test.ts` and `oauth.test.ts`. | Browser edit/reload and 320px layout checks passed. |
| CAT-001–006 | Strict curated importer, configurable rarity vocabulary, complete optional metadata, stable UUIDs, conflict rejection, idempotency, history retention and source approval in `catalog.test.ts`. The checked-in JSON snapshot has per-item provenance and verification dates. | Operator approval of production data and artwork usage. Unapproved images are not published. |
| COLL-001–004 | Desired-state writes, mastery invariant, transaction serialization, real sessions and reloads in API integration and collection browser tests. Six client synchronization tests cover queued intent, out-of-order independent records and failures. | Integrated desktop/mobile collection and social checks passed. |
| HELP-001–003 | No help opt-in exists. Helpers require ownership, accepted sharing, current consented Epic visibility and no block in either direction. Service tests include unmastered ownership, missing/retired items and revocation. | Provider-to-browser omission, revocation and outage recovery checks passed. |
| FRND-001–005 | Batched consented Epic identities, local sharing requests/acceptance/removal, atomic blocks, explicit errors, current server refresh and separate Epic relationship controls. Tests include concurrent request/block and accept/block. | Browser sharing and Accounts-omission checks passed. |
| OVER-001–006 | Real collection snapshot supplies grouped helpers. Matches and both comparison directions have independent search/rarity/variant filters. API queries enforce accepted sharing and blocks at the private read. | Browser filters and known-URL revocation passed. |
| UI-001–005 | Responsive navigation, loading/error surfaces, locker grid, pointer/keyboard preview, touch details, persistent owned/mastered indicators and neutral image fallback. Initial desktop/mobile suite passed 10/10. | Expanded desktop/mobile suite passed. |
| LEGAL-001–002 | Public Terms/Privacy and unofficial notice; authenticated links; production asset approval enforced in both import and publishing. | Set the real SUPPORT_CONTACT_URL before launch; operator policy review and approved provenance remain release checks. |
| DATA-001–010 | Database uniqueness, foreign keys, checks, canonical pair collation, and transaction locks enforce identity/collection/relationship invariants. Cross-table block exclusion is enforced by serialized services and every private query. | All seven migrations replayed successfully into a fresh isolated PostgreSQL database on September 6, 2026. |
| ARCH-001–004 | One Next/Vercel origin with Hono ownership, supported Better Auth/Drizzle integration, validated mutations, session-derived ownership, strict origin checks and safe structured errors. Root build, lint and typechecking pass. | Live deployment configuration remains an operator check. |
| ARCH-005 | Request IDs, safe server errors, redacted authentication logging and persistent rate counters. | Hosting log retention and operational alerting. |
| NFR-001–002 | Semantic controls, error announcements, keyboard checks, CSRF, secure production cookies, server-held tokens, PostgreSQL-backed auth/discovery rate limits and authorization tests. | Expanded accessibility checks passed; deployed security review remains. |
| NFR-003 | Real Hono/PostgreSQL benchmark with 250 released items, 100 accepted friends and 12,500 ownership rows. Twenty measured reads after three warmups. Latest full-suite local p95 321.57 ms; maximum 406.10 ms. Fourteen SQL queries and three batched Epic fixture requests per read. | Repeat in the chosen hosting/database regions; local timings do not establish Vercel latency. |
| NFR-004 | Parallel database writes and client synchronization tests prove idempotency, atomic relationships, failure recovery and independent state lanes. | Expanded browser actions passed. |
| NFR-005 | Desktop and mobile Chromium fixture suite. | Targeted Firefox/WebKit engine checks and manual latest-two-version Chrome/Safari/Firefox/Edge release matrix. |

## Running the checks

Use Node 22 and the root pnpm version. Use an isolated PostgreSQL database with `test` in its name.

```sh
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/api db:migrate
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @fortsprite/web exec playwright install chromium
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/web test:e2e
```

The performance test creates and removes its own catalog and users. Run browser tests after integration tests finish so their catalog fixture remains stable. Browser tests own port 3000 and use `.next-e2e`. Their Epic responses come from a test-process preload, not production routes or browser API mocks. Test users and sessions are removed by teardown.

The source-artwork publisher runs before development and production builds. Production with no approval manifest publishes no artwork. Do not run a production build during a browser test that is verifying development artwork.

## Final local verification, September 6, 2026

- API suite passed 40/40 and web unit suite passed 9/9 against an isolated database. The strengthened account deletion cascade test subsequently passed 4/4 profile cases.
- All 20 desktop/mobile Chromium scenarios passed across the final full run (18 passing) and the focused outage rerun (2 passing). Only test locator corrections were made between these runs. The outage test intentionally causes provider errors and checks recovery; unexpected browser errors remain failures.
- Tests cover exact per-source drop probabilities, helper freshness, automatic availability from unmastered captures, configured support links, public sign-in, sharing/blocking privacy, collection persistence and profile editing.
- Root lint, typechecking and the production build passed. Seven migrations replayed successfully into a fresh database. Production published zero unapproved images; all 150 development images were then restored byte-for-byte from private originals. The build used fixture credentials and a fixture support address, not live deployment credentials.
- Epic transport uses deterministic fixtures. Actual Epic credentials, deployed callback behavior, hosting latency, account-support destination, policies and the manual browser-version release matrix are not established by these results.

## Follow-up cleanup verification, September 6, 2026

The four-file behavior-preserving cleanup passed 39 functional API tests, 9 web unit tests, lint, typechecking, and desktop/mobile save-recovery browser checks (2/2). The performance gate failed before cleanup at p95 520.93 ms and after cleanup at 514.69 ms against its 500 ms threshold. The earlier passing benchmark remains historical evidence; the current performance gate is not green. No threshold was changed.

## Organization, Next.js and Server Actions verification, September 6, 2026

The organization pass separated API feature transports from friend orchestration and extracted collection tile/filter modules. It passed 45 functional API checks, with the existing performance gate still failing at p95 524.21ms against 500ms. No schema or authorization semantics changed in that pass.

The final Next.js/action implementation passes all 23 web unit tests, all 30 desktop/mobile browser scenarios, root lint/typechecking, and the ordinary production build (22.909s). Eight production instant-navigation checks pass across hard/soft navigation and both screen sizes, repeated twice. Unmocked agent-browser plus Next MCP reports no compilation or session errors across all 10 page routes. The normal built configuration has Cache Components and Partial Prefetching enabled and the testing API disabled.

Browser regressions cover immediate optimistic collection/sharing changes, per-Sprite coalescing, rollback and retry, retained filters and dialogs during RSC refresh, profile validation/draft preservation, confirmed permission before comparison, and menus that remain disabled until their JavaScript can handle clicks. Production published zero unapproved images; the 150 development images were restored afterward. Tests use isolated databases and Epic fixtures; live OAuth, deployment origin configuration, and hosting latency remain deployment verification tasks. See [the rendering and actions guide](nextjs-optimization.md) for architecture, reproduction commands, and evidence.
