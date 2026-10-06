# Verification record

This record distinguishes implemented behavior, local evidence, and deployment checks for the Better Auth passkey-only account migration.

## Current coverage

| Area | Local evidence | Remaining deployment check |
| --- | --- | --- |
| Passkeys | Better Auth 1.7 passkey-first registration, required unique usernames, resident credentials, required user verification, transactional user/session creation, safe credential inventory, verified sign-in, and additional-passkey management in Chromium. | Register and authenticate with platform passkeys on current Safari, Chrome, Firefox, Edge, and mobile devices at `fortsprite.net`. |
| Account recovery | The application and migration 0008 reject removal of the final passkey while allowing full account deletion. The UI directs users to add a second device or password-manager passkey. | Confirm recovery guidance with real synced and hardware passkeys. There is intentionally no provider or email fallback. |
| Profiles and credentials | Profile fields persist independently from authentication metadata. Application DTOs omit internal email, passkey credential IDs, public keys, and session tokens. | Confirm profile and credential management after real platform-passkey registration. |
| Friends and collection privacy | Exact-username requests, acceptance, removal, blocking, helpers, and two-way comparison are enforced from local relationships and blocks. No provider friend graph remains. | Exercise two real accounts after deployment. |
| Database | Migration 0007 creates the passkey table. Migration 0008 protects the final passkey with a serialized database trigger while permitting account-deletion cascades. Both migrations are applied in production. | Continue normal backup and restore testing. |
| Production account reset | After the required-username release, the authorized September 19 cleanup deleted the sole production user and its passkey, cleared pending registration challenges, and verified zero user-owned auth, collection, friendship, and block rows. | Restore from a database backup if the deleted development account is ever needed. |

## Running the checks

Use Node 22 and an isolated PostgreSQL database whose name contains `test`.

```sh
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/api db:migrate
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test
pnpm lint
pnpm typecheck
pnpm build
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/web test:e2e
```

Browser tests create local fixture users with separate desktop and mobile sessions. Passkey journeys use Chromium's virtual WebAuthn authenticator with resident credentials and user verification. Test users, credentials, relationships, and collection entries are removed by teardown.

## Verified on October 6, 2026

The dependency upgrade uses Next.js, `eslint-config-next`, and `@next/playwright` 16.4.0. Better Auth and its plugins are aligned at 1.7.7. API, database, UI, and test packages were updated with a refreshed lockfile. Node type definitions match the production Node 22 runtime. TypeScript 5.9 and ESLint 9 remain pinned within the versions supported by Next.js's lint plugins; the root explicitly declares TypeScript so automatic peer installation cannot select an unsupported compiler.

- Verification used Node 22.23.3 and the pinned pnpm 10.28.2, with a temporary local PostgreSQL database containing only test fixtures.
- Root lint and typechecking passed. Lint retains the existing image-preview warning in `collection-image-export.tsx`.
- All 63 API tests and 48 web unit tests passed.
- The ordinary production build passed with all 239 Sprite images, Cache Components and Partial Prefetching enabled, and the production testing API disabled. A frozen-lockfile installation also passed.
- Collection and prefetch tests passed 15 production-mode assertions across desktop and mobile, with one intentional skip for a mobile-only test in the desktop project. Collection tests ran together; prefetch tests ran once per project with fresh fixture accounts. Combining those groups in one run exhausted the shared fixture account's read budget and returned HTTP 429, so the isolated runs preserve the production rate limits.
- Native WebMCP tests belong to `playwright.webmcp.config.ts`, which enables the experimental browser features. The ordinary browser configuration now excludes that test file; the WebMCP configuration explicitly includes it.
- All six desktop/mobile MCP key, OAuth, and native WebMCP browser tests passed using that configuration. The OAuth test captures the authentication response before fulfilling the browser request, preventing navigation from discarding its response body.
- The broader browser suite is not green. Its initial run had 90 passes, 13 failures, and three intentional skips. The WebMCP configuration and OAuth test fixes resolved four failures; a mobile control-height assertion passed on an isolated rerun. Eight consistent failures remain: desktop/mobile dashboard season counts and passkey-removal display refreshes, mobile Chromium/WebKit full-catalog image counts, mobile first-tile visibility, and a WebKit tooltip intercepting the grid selector after a dialog closes. Each reproduced in a separate copy of commit `8dea2cc` with its original frozen dependencies, including Next.js 16.3.6, on a different port and test database. These existing failures were not suppressed or repaired as part of the dependency upgrade.
- `pnpm audit --prod` reported no vulnerabilities. The full audit retains one high-severity advisory in the development-only Next.js lint dependency chain, `fast-glob → micromatch → braces`: [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). No patched release was available, and no advisory suppression was added.

## Verified on September 18, 2026

- Migration 0007 applied successfully to the expiring schema-only Neon branch and production.
- Migration 0008 applied successfully to the isolated local test database and the Neon production branch before the passkey-only deployment.
- The authorized legacy cleanup deleted the sole Epic-only development user and cascade-owned data. The verification pass found zero users, accounts, Epic accounts, and passkeys.
- Deployment `dpl_Aou7qKjUYBHkMs8TMRjqweQP5Ke9` made username selection mandatory before first-passkey registration and requires the first passkey, user, and session to share Better Auth's transaction. Live checks returned 400 for missing and malformed usernames.
- The authorized post-deployment reset deleted one production passkey user and cleared five pending verification rows. Transactional post-checks found zero users, accounts, sessions, passkeys, collection entries, friendships, blocks, and verifications.
- The database-backed API suite passed 33 of 33 tests.
- The web unit suite passed 25 of 25 tests.
- The Playwright suite passed 34 of 34 tests across desktop and mobile Chromium profiles. Both profiles reject unverified first-passkey registration, create an account only after verified registration, add a second resident passkey, sign out, and sign back in with it. The focused post-upgrade passkey run also passed 4 of 4 tests.
- The provider-neutral NFR-003 benchmark passed at 166.29 ms p95 and 136.58 ms p50 over 20 measured reads. Its 250-Sprite, 100-friend, 12,500-row fixture used four database queries per read.
- Forced uncached lint and TypeScript checks passed across all four workspaces under Node 22.
- The production build completed under Node 22 with all 178 Sprite assets and application routes.
- Vercel production deployment `dpl_7JDhe8HjvCpGVVmAscgv1CHzusR1` reached `READY` and was aliased to `fortsprite.net`. The live session endpoint returned `200`, and live registration options reported `rpId=fortsprite.net`, resident credentials required, and user verification required.
- The production Neon credential was rotated during the release, Vercel received a pooled connection with explicit `sslmode=verify-full`, and the active deployment had no error-level or HTTP 500 logs after the final authentication probes.

## Explicit limits

- A virtual authenticator proves the WebAuthn integration path, not every platform authenticator or password manager.
- Desktop and mobile Playwright projects use Chromium. Safari, Firefox, and Edge authentication remain release checks.
- Local and branch timings do not establish Vercel-region latency.
- Historical Epic-specific audit records describe the previous implementation and are retained only as dated evidence.
