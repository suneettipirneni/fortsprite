# FortSprite security audit — 2026-09-13

**Current status: code remediation complete; production rollout pending.** All four application findings and all 14 distinct dependency advisories from the baseline are addressed in the working tree. The final registry audit reports zero vulnerabilities. See the final verification below and [security rollout instructions](security-rollout.md) before deploying.

Audited commit: `21c2e20d8aec80d0c783beb0718f38f5462bed38`, plus the working tree visible during review. Concurrent branding/documentation edits were present and were not modified. Additional catalog/artwork changes appeared during the audit; those later changes were not re-audited. The findings and baseline evidence below describe the original review; the remediation status at the end describes the subsequent authorized fixes.

The application-code review identified **three medium-severity findings and one low-severity finding**. The subsequently authorized dependency audit found **14 distinct advisories: 2 critical, 6 high, and 6 moderate**. Vulnerable package versions are confirmed; exploitation of the critical/high advisories against FortSprite was not demonstrated. Production infrastructure was not inspected. Prioritize dependency patching alongside the application findings below.

**Scope and method.** Reviewed the Next.js → Hono → Better Auth → PostgreSQL boundaries; all application API routes and server actions; Epic identity, consent, token refresh and outbound requests; collection ownership and friendship authorization; profile mutation/deletion; database constraints and migrations; caching and redirects; relevant rendering and asset-import paths; configuration and package manifests. Inspected installed Better Auth internals rather than assuming its defaults. Ran existing tests and targeted probes against a newly initialized PostgreSQL database on loopback, using simulated Epic responses. No production database or real Epic account was used.

**1. Medium — Epic bearer and refresh tokens are stored without application-level encryption.**

Location: `apps/api/src/auth.ts:60–64`; token columns at `apps/api/src/db/auth-schema.ts:70–72`.

The `account` configuration disables linking but does not enable `encryptOAuthTokens`. In installed Better Auth 1.6.26, `dist/oauth2/utils.mjs` returns tokens unchanged unless this option is true, and the generic OAuth callback uses that function before persisting tokens. Runtime inspection confirmed the option is disabled. The existing OAuth integration test also confirms a refreshed database access token equals the bearer token sent to the simulated provider.

Impact requires database-read access, an exposed dump, or an equivalent disclosure. Under that prerequisite, the attacker obtains immediately usable Epic credentials within their granted scopes and validity; refresh tokens can extend exposure. This is not evidence of a currently exploitable database disclosure or unrestricted Epic account takeover. Storage-volume encryption does not prevent disclosure through database queries or exports.

Fix: enable Better Auth's supported `account.encryptOAuthTokens` option and plan migration/rotation of existing plaintext tokens. Verify the installed version's legacy-token compatibility before rollout; changing the option alone does not rewrite every existing row. Keep the encryption secret separate from database access. Better Auth documents the option in its [configuration reference](https://better-auth.com/docs/reference/options).

Acceptance: both initial sign-in and token refresh persist ciphertext distinct from provider tokens; friend lookups still work; migration handles existing users; database-only access cannot recover token plaintext.

**2. Medium — Blocking can fail without revoking existing sharing when Epic discovery fails.**

Locations: `apps/api/src/friend-routes.ts:83–93` and `apps/api/src/friends.ts:193–203`.

Only `remove`, `decline`, and `unblock` bypass discovery. `block` requires a successful live Epic lookup, and its service branch also requires the target to appear in that result before deleting the accepted relationship and writing the block.

Reproduction: seeded two users with accepted sharing, used the route's supported dependency injection to make Epic discovery fail, and submitted `action: "block"`. The route returned 502; the accepted relationship remained and no block row was written. A per-user discovery limit or missing permission can cause the same ordering problem. Reads fail closed when their own discovery fails, but the other user's successful discovery can still permit reads through the retained relationship.

Fix: authorize blocking an already-known local relationship using database state under the existing pair lock, and atomically revoke sharing/write the block without requiring upstream discovery. Preserve authorization restrictions for arbitrary unknown IDs. `remove` already offers independent revocation, which limits impact, but does not make the block action reliable.

Acceptance: blocking an existing peer succeeds during Epic outage, consent loss and exhausted discovery quota; both directions lose sharing; unrelated users cannot manipulate relationships; existing accept/block concurrency guarantees remain intact.

**3. Medium — Application mutations have no server-side request budget.**

Locations: `apps/api/src/profile-routes.ts:30–54`, `apps/api/src/collection-routes.ts:65–85`, and `apps/api/src/app.ts:22–42`.

Better Auth's limits protect its authentication handler. The custom discovery limiter protects Epic friend refreshes. Neither applies to profile or collection writes; session lookup inside those routes does not turn them into rate-limited authentication operations. Origin checking prevents browser CSRF, but does not throttle an authenticated client that submits the expected Origin.

Reproduction: 130 consecutive authenticated profile updates all returned 200, with no 429 response. Collection writes additionally acquire a per-user PostgreSQL advisory lock and recalculate progress; the connection pool has five connections per process. Sustained/concurrent requests can consume database and function capacity. No production load test or service outage was attempted, so the exact denial-of-service threshold is unknown.

Fix: enforce a shared, atomic per-user mutation budget before expensive work, with route-appropriate burst allowances and Retry-After. Cover Hono directly so server actions and direct HTTP requests share enforcement. Consider a separate trusted-edge/IP budget for unauthenticated DB-backed endpoints. Preserve legitimate rapid collection editing and privacy revocation.

Acceptance: burst traffic remains usable, sustained excess receives 429 before writes/locks, budgets hold across instances, and one user does not consume another user's allowance.

**4. Low — JSON parsing has no application-level body-size limit.**

Locations: `apps/api/src/profile-routes.ts:35–37`, `apps/api/src/collection-routes.ts:67–69`, and the other JSON mutation handlers.

Zod validates values only after the entire body has been read and parsed. There is no Hono body-size middleware. A valid profile update prefixed with 2 MiB of JSON whitespace returned 200 in the actual application handler. That demonstrates unnecessary parsing/allocation, not a measured process crash. Deployment request-size limits can bound the risk; the standalone Hono server has a different boundary, and no deployed limits were verified.

Fix: apply Hono's supported body-limit middleware with small limits suited to these payloads, before JSON parsing. Select a separate appropriate limit for auth if needed. Enforce actual stream size, not only the client-supplied Content-Length. This complements the request-count control in finding 3.

Acceptance: oversized and chunked requests receive 413 before parsing or persistence; normal mutations and OAuth continue to work.

**Controls that held under review/testing.**

- Real signed-session tests rejected missing/forged cookies. Sign-out invalidated the session. Account deletion required the correct handle and a fresh session, removed dependent records, and revoked subsequent access.
- Collection ownership derives from the session; strict input schemas reject client-supplied owners and invalid dependent state. Parameterized Drizzle queries and database constraints protect the reviewed SQL paths.
- Shared reads require accepted sharing, current Epic visibility, and no block in either direction. Outsider, pending, removed and blocked cases were tested. Concurrent acceptance/blocking retained exclusion.
- Simulated OAuth verified S256 PKCE, state-cookie binding, replay rejection, malformed identity rejection, stable account identity and token refresh. Account linking is disabled. The public auth allowlist excludes account/token operations and local signup.
- Hono mutations require the configured origin; cross-origin auth sign-out also returned 403. API responses use no-store. Server reads use request-scoped React cache and request cookies rather than a global user-data cache.
- Profile rendering uses React text interpolation; no application dangerouslySetInnerHTML/eval/raw SQL sink was found in the reviewed paths. Catalog import restricts local asset paths and HTTPS source URLs. Runtime Epic requests use fixed/configured endpoints, reject redirects and have a ten-second timeout.
- Installed cookie defaults are HttpOnly and SameSite=Lax; production configuration enables Secure. These are code/library checks, not inspection of deployed Set-Cookie headers.

**Additional hardening observations, not confirmed exploits.** The repository does not configure a CSP or frame-ancestors policy in Next/Hono; deployed edge headers are unknown. Consider a compatible CSP and framing restriction, taking external font CSS into account. `EXPOSE_TESTING_API=1` enables Next testing APIs in production builds; guard this against accidental production use. Authentication trusts `x-real-ip` for the documented Vercel deployment; the standalone server should remain loopback-only or behind a trusted proxy. Do not label header spoofing a verified Vercel bypass. Provider-token revocation on account deletion, database roles/TLS/backup controls, secret rotation and deployed firewall controls need infrastructure-level verification.

**Verification results and limits.**

On the supported Node 22.12.0 runtime, API tests passed **45/46**, and web unit tests passed **23/23**. The only API failure was the performance benchmark: collection p95 **685.77 ms**, exceeding its 500 ms threshold, with 250 catalog items and 100 accepted friends. It emitted about 2.15 MB per response and measured 14 DB queries. These are local concurrent-suite measurements, not production capacity measurements. An initial Node 24 run also failed only that benchmark. All targeted probes reproduced the findings on Node 22.

Evidence is retained in ignored local files `.audit/security-probes.mts`, `.audit/security-probes.log`, `.audit/api-tests-node22.log`, and `.audit/web-tests-node22.log`. Reproduction uses the existing `tests/env.ts` guard and requires a separately migrated TEST_DATABASE_URL containing `test` in its database pathname; never point these fixtures at production.

A pattern scan of 237 tracked text files found only the known localhost database credentials in the two example env files. No live secret matched the selected private-key, GitHub-token, AWS-key, OpenAI-key or credential-URL patterns. This was not an exhaustive entropy scan or Git-history audit.

**Dependency advisory follow-up — completed with user approval.** `pnpm audit --json` completed on 2026-09-13 and exited 1 because it found vulnerabilities. The raw result is retained at `.audit/dependency-audit.json`. At that baseline, no dependency or lockfile changes had been made. Registry metadata reported 17 findings (4 critical, 7 high, 6 moderate); these correspond to **14 distinct advisory IDs**, because Next.js and sharp appear through multiple dependency paths. The two Next.js critical advisories and the sharp advisory were also checked against the maintainers' published notices.

| Package in audited graph | Distinct advisories | Patched version floor | FortSprite applicability |
| --- | --- | --- | --- |
| Next.js 16.3.0 | 2 critical | 16.3.3 | Image optimizer is used; AVIF exploit reachability is unconfirmed. Windows-specific issue does not match reviewed configuration. |
| sharp 0.35.3 | 1 high | 0.35.4 | Transitive image-processing dependency of Next.js; related to the AVIF issue, not an independent demonstrated attack. |
| Hono 4.13.1 | 3 moderate | 4.13.5 | No toSSG or dot-notation parseBody usage found; fragment-query differential needs runtime-specific reachability assessment. |
| fast-uri 3.1.5 | 4 high | 3.1.6 | Through shadcn → dotenvx → conf → ajv; no application request-path use found. |
| qs 6.15.3 | 2 moderate | 6.16.0 | Through shadcn → MCP SDK → Express; no application request-path use found. |
| js-yaml 4.3.1 | 1 high | 4.3.2 | Through ESLint; tooling exposure, not a confirmed production YAML endpoint. |
| esbuild 0.18.20 | 1 moderate | 0.25.0 | Through drizzle-kit → esm-loader → core-utils; requires use of vulnerable esbuild serving functionality, which was not found in application runtime. |

**Dependency priority 1: Next.js/sharp image optimization.** [GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4) describes unauthenticated RCE when AVIF images are optimized, fixed in Next.js 16.3.3. [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) covers the underlying libheif issue; sharp 0.35.4 includes the patched dependency. FortSprite uses next/image with curated local images and has no reviewed user-upload endpoint or configured remote image allowlist. This limits the identified attacker-controlled input paths, but does not justify leaving the vulnerable decoder installed. Upgrade Next.js, align the related Next tooling, and verify every resolved sharp copy is patched. Rebuild/redeploy and test image optimization. No malicious AVIF or RCE probe was run.

**Dependency priority 1: Windows advisory, conditional applicability.** [GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) affects Windows-hosted Pages/App Router applications without Cache Components, fixed in Next.js 16.3.3. The audited configuration enables cacheComponents and the observed development host is macOS; deployment docs target Vercel. Thus the required conditions were not established here. The same Next patch removes the affected version regardless.

**Dependency priority 2: Hono.** Upgrade to at least 4.13.5 for [SSG traversal](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv), [dot-notation memory amplification](https://github.com/advisories/GHSA-g6gw-c38x-mqfc), and [fragment/query interpretation differences](https://github.com/advisories/GHSA-crvj-82cr-hjcx). FortSprite uses req.json rather than parseBody with dot expansion and does not use Hono SSG. Its no-store responses and absence of Hono cache middleware reduce the cache-poisoning scenario, but do not establish how the deployed adapter handles literal fragments. Re-run authorization, query-boundary and request-size tests after updating.

**Dependency priority 3: tooling chains.** Update or remove unused tooling dependencies, then verify the resolved graph meets the floors above. At baseline, `shadcn` was a regular dependency of packages/ui. Its `shadcn/tailwind.css` export is used during the CSS build; the CLI is tooling, and imported `@shadcn/react` is a separate runtime package. Keep shadcn available as a development/build dependency. That change clarifies runtime scope but does not itself remediate its advisories. Prefer compatible upstream updates; do not blindly force esbuild across its pre-1.0 API versions through an override.

The four fast-uri IDs are GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf and GHSA-jqff-g426-hqxp. The qs IDs are GHSA-x5fp-wj9c-mxmx and GHSA-4mjr-xmp4-gh2g. js-yaml is GHSA-2883-xcg3-v3hh; esbuild is GHSA-67mh-4wv8-2f99. Full descriptions and dependency paths are preserved in the raw audit evidence. The registry result labels all dependency paths as non-dev, including ESLint and drizzle-kit; exposure classifications above use package manifests and reviewed imports rather than trusting that flag.

Acceptance: update the lockfile, re-run the advisory audit and relevant build/tests, verify deployed runtime versions, and explicitly document any remaining tooling-only exceptions. Advisory matching does not verify package integrity, deployed versions, or exploitability by itself.

The baseline review did not run browser end-to-end tests. Neither the baseline nor the remediation verifies a real-provider OAuth callback, deployed headers, external penetration resistance, production load, infrastructure/IAM, or historical secrets. Prioritize Next.js/sharp patching, reliable block revocation, token encryption/migration, then mutation and body budgets; complete production verification before treating the audit as release assurance.

**Remediation completed in the working tree — 2026-09-13.**

- Updated Next.js and its related tooling to 16.3.5, Hono to 4.13.7, and shadcn to 4.21.0. Compatible transitive overrides keep sharp, fast-uri, qs and js-yaml above their patched floors. Removed only Drizzle Kit 0.31.10's unused legacy loader dependency; its bundled runtime and migration command were verified. shadcn remains available as a development/build dependency for generation and its Tailwind CSS export. No advisory suppression was added.
- Enabled Better Auth's authenticated OAuth token encryption with a versioned key configuration. Added `pnpm --filter @fortsprite/api auth:encrypt-tokens` to migrate existing access/refresh tokens under row locks. Regression tests cover ciphertext round trips, refresh, migration retries, hexadecimal legacy tokens and wrong-key rejection. Existing production rows still require this command during rollout.
- Allowed blocking known relationships entirely through the local database, including during Epic outages, lost consent or exhausted discovery allowance. Unknown targets still require Epic visibility. Pair locking preserves authorization under concurrent changes; remote verification runs outside database transactions.
- Added atomic shared per-user mutation budgets with separate privacy allowance, fixed windows and Retry-After responses. Added actual-stream body limits before JSON parsing, including missing or forged Content-Length cases, plus the Next server-action size limit.
- Added a Cache Components-compatible CSP, framing and browser capability restrictions, a guard against accidental production testing APIs, and loopback binding for the standalone API.
- Fixed the collection benchmark by matching the canonical friendship pair index and aggregating helper rows in SQL. Authorization remains in the same statement; no permission cache was introduced. Corrected one existing browser test to search the selected fixture's base name instead of assuming Jackrabbit is first in the catalog. Concurrent catalog and branding edits were preserved.

**Final verification.** Supported Node 22.12.0, isolated loopback PostgreSQL test database, simulated Epic responses:

| Check | Result |
| --- | --- |
| `pnpm audit --json` | Zero vulnerabilities across 944 reported dependencies; no advisory exceptions |
| API integration/unit suite | 51/51 passed |
| Web unit suite | 25/25 passed |
| Desktop/mobile Playwright suite | All 36 scenarios passed: 32 initial passes, then 4/4 affected scenarios passed after CSP/test corrections |
| Workspace type checking and lint | Both passed, four workspace tasks each |
| Production Next build | Passed in isolated `.next-security` output |
| Drizzle migration/config loading | Passed against the isolated test database |
| OAuth migration CLI | Passed; idempotent no-op after integration fixtures were removed |
| Next runtime inspection | No compilation or runtime errors at inspection; public DOM and React tree verified |
| Collection benchmark | p95 161.80 ms, below 500 ms; 20 measured requests after 3 warmups, 250 fixture Sprites plus 178 existing catalog rows and 100 accepted friends |

The benchmark is a local result, not production capacity assurance. Browser tests ran the development server; the production configuration was separately built and unit-checked. No real Epic callback, live deployment, infrastructure/IAM configuration or historical backup was changed or verified. The CSP permits inline hydration/styles for partial prerendering and is not a strict nonce policy.

Evidence is retained locally in ignored `.audit/dependency-audit-fixed.json`, `.audit/api-tests-fixed.log`, `.audit/web-tests-fixed.log`, `.audit/browser-tests-fixed.log`, `.audit/browser-tests-retry.log`, `.audit/build-fixed.log`, `.audit/typecheck-fixed.log` and `.audit/lint-fixed.log`. These include the earlier browser failures and successful targeted rerun rather than concealing them. See [security rollout instructions](security-rollout.md) for the token migration, deployment ordering and remaining infrastructure verification.
