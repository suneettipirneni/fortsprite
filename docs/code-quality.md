# Code quality and organization

Reviewed September 18, 2026 for the account migration.

## Current ownership

| Area | Owner | Responsibility |
| --- | --- | --- |
| Authentication configuration | `apps/api/src/auth.ts` | Native Apple and Google providers, account linking, token encryption, passkey policy, sessions, and Better Auth plugins. |
| Authentication boundary | `apps/api/src/app.ts` | Exact method-and-path allowlist, callback error handling, CORS, response minimization, and router composition. |
| Provider signing | `apps/api/src/apple-client-secret.ts` | Short-lived ES256 Apple client-secret generation from deployment credentials. |
| Credential persistence | `apps/api/src/db/auth-schema.ts` | Better Auth users, accounts, sessions, verifications, rate limits, and passkeys. |
| Safe account projection | `apps/api/src/profile.ts` | Viewer and credential DTOs that omit emails, provider account IDs, tokens, credential IDs, and public keys. |
| Local social graph | `apps/api/src/friends.ts` | Exact-handle lookup, canonical relationships, blocks, collection helper access, and comparisons. |
| Feature transport | `apps/api/src/*-routes.ts` | Runtime validation, session-derived actor IDs, mutation limits, and response status. |
| Account UI | `apps/web/components/sign-in-options.tsx`, `credential-manager.tsx` | Provider sign-in, passkey sign-in/registration/removal, and linked-provider recovery controls. |
| Shared contracts | `packages/contracts` | Provider-neutral public response and mutation types. |

## Decisions that keep the system small

- `user.id` remains the sole owner key for profiles, collections, relationships, and credentials. Provider identities are authentication methods, not domain identities.
- Better Auth owns OAuth and WebAuthn ceremonies. Application code adds only deployment-specific Apple signing, user-verification policy, and safe presentation DTOs.
- Implicit email linking is disabled. A signed-in user may explicitly link Apple and Google even when Apple private relay produces a different email.
- Passkeys supplement a required Apple or Google recovery credential. This uses Better Auth's native unlink guard and avoids a custom cross-table credential-deletion protocol.
- Friend discovery is exact-handle only. Removing the Epic friend graph also removes upstream outage, permission, omission, token-refresh, and nickname states from the product.
- The authentication endpoint surface is allowlisted by both method and path. Generic OAuth, email/password, magic-link, raw account listing, and raw passkey listing remain unavailable.

## Verification posture

- Schema changes are generated and checked in through Drizzle.
- Database behavior is tested on an isolated schema-only Neon branch with seeded fixtures.
- WebAuthn behavior is tested in a real Chromium browser through a virtual resident, user-verified authenticator.
- Real Apple and Google callbacks remain deployment checks because local flow initialization is not proof of a completed provider session.

See [verification.md](verification.md) for current results and [vercel.md](vercel.md) for the release configuration.
