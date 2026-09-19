# Verification record

This record distinguishes implemented behavior, local evidence, and deployment checks for the Better Auth account migration. It does not claim that registered Apple or Google production applications have completed a live callback.

## Current coverage

| Area | Local evidence | Remaining deployment check |
| --- | --- | --- |
| Apple and Google | Native Better Auth provider flow initialization, allowlisted callbacks, safe session DTOs, rejected forged state, and an independently verified Apple ES256 client secret. | Complete real callbacks with registered production credentials. |
| Passkeys | Better Auth 1.6 passkey schema and plugin, resident credentials, required user verification enforced after library verification, safe credential inventory, rejected unverified registration and authentication, verified sign-in, and passkey deletion in Chromium. | Register and authenticate with platform passkeys on current Safari, Chrome, Firefox, Edge, and mobile devices at `fortsprite.net`. |
| Account recovery | The server rejects removal of the final Apple or Google credential, permits removal when another social recovery credential remains, and initializes linking for a configured provider. Passkeys are supplemental and can be removed independently. | Complete linked-provider callbacks with production Apple private-relay and Google accounts, then confirm provider recovery guidance and key rotation. |
| Profiles and credentials | Profile fields persist independently from provider claims. Application DTOs omit email, provider account IDs, tokens, passkey credential IDs, and public keys. | Confirm linked-provider flows for Apple private relay and Google on production. |
| Friends and collection privacy | Exact-handle requests, acceptance, removal, blocking, helpers, and two-way comparison are enforced from local relationships and blocks. No provider friend graph remains. | Exercise two real accounts after deployment. |
| Database | Migration 0007 creates the passkey table, cascade foreign key, user index, and unique credential index. It was applied successfully on an expiring schema-only Neon branch and the production branch. | Confirm the next application deployment starts cleanly against the migrated production schema. |
| Legacy user | The guarded cleanup matched exactly one user, one account, one Epic account, and zero passkeys. The authorized deletion completed and its post-check found zero users, accounts, Epic accounts, and passkeys. | No legacy data action remains. Restore from a database backup if the deleted development account is ever needed. |

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

Browser tests create two Google-backed local fixture users with separate desktop and mobile sessions. The passkey journey uses Chromium's virtual WebAuthn authenticator with a resident credential and user verification. Test users, credentials, relationships, and collection entries are removed by teardown.

## Verified on September 18, 2026

- Migration 0007 applied successfully to the expiring schema-only Neon branch and production.
- The authorized legacy cleanup deleted the sole Epic-only development user and cascade-owned data. The verification pass found zero users, accounts, Epic accounts, and passkeys.
- The database-backed API suite passed 35 of 35 tests.
- The web unit suite passed 25 of 25 tests.
- The Playwright suite passed 32 of 32 tests across desktop and mobile Chromium profiles. Both profiles reject unverified passkey registration and authentication, accept verified registration and sign-in, and remove the passkey.
- The provider-neutral NFR-003 benchmark passed at 262.38 ms p95 and 254.17 ms p50 over 20 measured reads. Its 250-Sprite, 100-friend, 12,500-row fixture used four database queries per read.
- Forced uncached lint and TypeScript checks passed across all four workspaces under Node 22.
- The production build completed under Node 22 with all 178 Sprite assets and application routes.

## Explicit limits

- Automated flow initialization is not a completed real Apple or Google session.
- A virtual authenticator proves the WebAuthn integration path, not every platform authenticator or password manager.
- Desktop and mobile Playwright projects use Chromium. Safari, Firefox, and Edge authentication remain release checks.
- Local and branch timings do not establish Vercel-region latency.
- Historical Epic-specific audit records describe the previous implementation and are retained only as dated evidence.
