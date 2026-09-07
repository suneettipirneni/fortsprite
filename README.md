# FortSprite

A friend-first Fortnite Sprite collection tracker.

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

Fill in the database and registered Epic client settings. `BETTER_AUTH_URL` and `WEB_ORIGIN` are both `http://localhost:3000` for local development. Register `http://localhost:3000/api/auth/oauth2/callback/epic-games` with Epic. The user-info endpoint comes from Epic's published OpenID configuration.

Migration and import commands run in the API package. Supply those commands with the same server environment or copy the local settings to `apps/api/.env`.

```bash
pnpm --filter @fortsprite/api db:migrate
pnpm --filter @fortsprite/api catalog:import
pnpm dev
```

Open `http://localhost:3000`. Check `http://localhost:3000/api/v1/health` if the app cannot reach PostgreSQL.

Collection ownership and mastery are stored in PostgreSQL. Missing items cannot remain mastered. Friend availability derives from ownership and accepted friendship, with no per-item opt-in. The collection page and dashboard read saved counts. Epic friends are read server-side and omitted when Epic does not return a consented account profile.

Friends can request and accept FortSprite collection sharing, compare both directions, and block or remove sharing. Matches update from current consented Epic relationships and saved ownership. Account settings support profile editing and confirmed deletion after a recent sign-in.

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

The Epic tests use deterministic local responses. A real Epic callback requires separate verification with the registered product credentials.

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
