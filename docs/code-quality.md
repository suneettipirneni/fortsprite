# Code quality and organization

Reviewed September 18, 2026 for the account migration.

## Current ownership

| Area | Owner | Responsibility |
| --- | --- | --- |
| Authentication configuration | `apps/api/src/auth.ts` | Passkey-first user creation, user-verification policy, sessions, and Better Auth plugins. |
| Authentication boundary | `apps/api/src/app.ts` | Exact method-and-path allowlist, final-passkey protection, CORS, response minimization, and router composition. |
| Credential persistence | `apps/api/src/db/auth-schema.ts` | Better Auth users, accounts, sessions, verifications, rate limits, and passkeys. |
| Safe account projection | `apps/api/src/profile.ts` | Viewer and credential DTOs that omit emails, provider account IDs, tokens, credential IDs, and public keys. |
| Local social graph | `apps/api/src/friends.ts` | Exact-handle lookup, canonical relationships, blocks, collection helper access, and comparisons. |
| Feature transport | `apps/api/src/*-routes.ts` | Runtime validation, session-derived actor IDs, mutation limits, and response status. |
| Account UI | `apps/web/components/sign-in-options.tsx`, `credential-manager.tsx` | Passkey-first account creation, sign-in, additional registration, removal, and recovery guidance. |
| Shared contracts | `packages/contracts` | Provider-neutral public response and mutation types. |

## Decisions that keep the system small

- `user.id` remains the sole owner key for profiles, collections, relationships, and credentials.
- Better Auth owns WebAuthn challenges, verification, credential counters, and session creation. Application code adds user-verification policy and safe presentation DTOs.
- A verified first passkey creates the local user and session inside the library-managed registration transaction, avoiding incomplete accounts from abandoned ceremonies.
- Migration 0008 serializes passkey deletion per user and refuses removal of the final passkey. Cascading full-account deletion remains available.
- Friend discovery is exact-handle only. Removing the Epic friend graph also removes upstream outage, permission, omission, token-refresh, and nickname states from the product.
- The authentication endpoint surface is allowlisted by both method and path. Social OAuth, generic OAuth, email/password, magic-link, raw account listing, and raw passkey listing remain unavailable.

## Verification posture

- Schema changes are generated and checked in through Drizzle.
- Database behavior is tested on an isolated schema-only Neon branch with seeded fixtures.
- WebAuthn behavior is tested in a real Chromium browser through a virtual resident, user-verified authenticator.
- Platform passkeys remain deployment checks because a virtual authenticator does not cover every browser, device, or password manager.

See [verification.md](verification.md) for current results and [vercel.md](vercel.md) for the release configuration.
