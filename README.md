<img src="apps/web/public/brand/fortsprite.svg" alt="FortSprite logo" width="128" height="128" />

# FortSprite

A friend-first Fortnite Sprite collection tracker.

Production: [fortsprite.net](https://fortsprite.net). See [deployment setup](docs/vercel.md) for the Apple, Google, and passkey configuration.

## Workspace

- `apps/web` owns the Next.js UI and mounts the Hono API at `/api`.
- `apps/api` owns Better Auth, application services, PostgreSQL, and Drizzle migrations.
- `packages/contracts` owns public API types.
- `packages/ui` owns shared shadcn components and theme tokens.

See [Code quality and organization](docs/code-quality.md) for module ownership, design decisions and verification findings.

See [Next.js rendering and navigation](docs/nextjs-optimization.md) for private data boundaries, Server Actions, optimistic updates, and the production navigation test rig.

## Run locally

Use Node.js 22 and pnpm 10.28.2.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
```

Fill in the database, Google OAuth, Apple Sign in, and passkey settings. `BETTER_AUTH_URL`, `WEB_ORIGIN`, and `PASSKEY_ORIGIN` are `http://localhost:3000` for local development, with `PASSKEY_RP_ID=localhost`. Register `/api/auth/callback/google` and `/api/auth/callback/apple` as the provider callback paths. Apple requires a Services ID, Team ID, Key ID, and PKCS8 private key. Use an HTTPS development origin when exercising Apple end to end.

Migration and import commands run in the API package. Supply those commands with the same server environment or copy the local settings to `apps/api/.env`.

```bash
pnpm --filter @fortsprite/api db:migrate
pnpm --filter @fortsprite/api catalog:import
pnpm dev
```

Open `http://localhost:3000`. Check `http://localhost:3000/api/v1/health` if the app cannot reach PostgreSQL.

Collection ownership and mastery are stored in PostgreSQL. Missing items cannot remain mastered. Friend availability derives from ownership and mutually accepted FortSprite sharing, with no per-item opt-in. The collection page and dashboard read saved counts.

Friends connect through exact FortSprite handles, can accept collection sharing, compare both directions, and block or remove sharing. Account settings support profile editing, linked Apple and Google methods, passkeys, and confirmed deletion after a recent sign-in. A social provider remains connected as a recovery anchor, so passkey-only accounts are not created.

## Verify changes

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Create a separate database whose name contains `test`, apply migrations to it, and supply its URL to the integration tests. Tests reject a missing test URL. They create their own fixtures and never use the normal app database.

```bash
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/api db:migrate
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm test
```

The automated suite verifies provider flow initialization, local account behavior, and WebAuthn with a virtual authenticator. Real Apple and Google callbacks still require verification with registered provider credentials on the deployed origin.

## Catalog

The checked-in snapshot in `apps/web/public/sprites` records source URLs, verification dates, seasons, variants, exact drop chances, and local artwork paths. Runtime reads use PostgreSQL and do not scrape Fortnite.GG.

```bash
pnpm --filter @fortsprite/web catalog:validate
pnpm --filter @fortsprite/web catalog:sync-assets
```

Pass `--rarities=path/to/rarities.json` to approve a changed rarity vocabulary without an application release. The file is a JSON array of unique, nonempty labels. Unlisted values are rejected.

Catalog import is transactional and preserves database IDs on repeated imports. It rejects conflicting identities and does not delete missing records. Builds publish the source images referenced by the catalog in both development and production.

See [Deploy FortSprite to Vercel](docs/vercel.md) for deployment configuration and catalog artwork.

Browser tests use a separate authenticated fixture and an isolated Next build directory. Install Chromium once, then run them against the migrated test database.

```bash
pnpm --filter @fortsprite/web exec playwright install chromium
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/web test:e2e
```
