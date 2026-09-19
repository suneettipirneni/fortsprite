# Deploy FortSprite to Vercel

The production domain is [fortsprite.net](https://fortsprite.net). Assign it to this Vercel project for production deployments.

1. Create a PostgreSQL database with a provider that supports pooled connections. Keep the connection string in deployment secrets.
2. Import the repository into Vercel. Select the Next.js preset and set the root directory to `apps/web`. Enable access to files outside that root so workspace packages are available.
3. Set the environment variables from `apps/web/.env.example` in Vercel. Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32`. Set both `BETTER_AUTH_URL` and `WEB_ORIGIN` to `https://fortsprite.net` for production. Leave `BETTER_AUTH_COOKIE_DOMAIN` empty. Set `SUPPORT_CONTACT_URL` to your actual HTTPS contact page or `mailto:` address; it supplies the Help, Privacy and Terms contact link. The link is omitted locally when unset, so setting it is a release requirement.
4. Set `PASSKEY_RP_ID=fortsprite.net` and `PASSKEY_ORIGIN=https://fortsprite.net`. Passkeys require no Google, Apple, or other provider registration.
5. Run `pnpm --filter @fortsprite/api db:migrate` with the target `DATABASE_URL` in a secure local terminal or release job. Do not run migrations on every function request.
6. Run `pnpm --filter @fortsprite/api catalog:import` with the same server environment to import the curated snapshot. This command preserves existing Sprite IDs and collection history.
7. Run `pnpm build` and deploy through Vercel. Verify `/api/v1/health` reports a healthy database. Check passkey-first account creation, sign-out, passkey sign-in, additional passkey registration, final-passkey deletion refusal, and collection reload on that deployment.

Use a stable preview domain and a separate database for preview testing. Arbitrary generated preview URLs are different WebAuthn origins and cannot share production passkeys. Never put server secrets in variables with the `NEXT_PUBLIC_` prefix.

The web app mounts Hono at `/api` through its Node.js route handler. It needs no separate API deployment or `API_URL`. PostgreSQL queries, authorization, and migrations remain in `apps/api`.

## Catalog artwork

Development and production builds copy every catalog image from `apps/web/assets/sprites` into `apps/web/public/sprites`. The importer stores the catalog's local image paths in PostgreSQL. Missing or empty source files fail the build; entries without an image path use the placeholder.

After refreshing the catalog, commit the source images, run the catalog importer against the target database, and deploy the app so database paths and published assets stay in sync.

## Release status

Production deployments target [fortsprite.net](https://fortsprite.net) through the GitHub repository https://github.com/suneettipirneni/fortsprite. Repeat the database-health, public-policy, authentication-redirect, provider, passkey, and catalog checks on the canonical domain. Support contact is configured as `suneettipirneni@icloud.com`.

The passkey-only release was deployed on September 18, 2026. Production has `PASSKEY_RP_ID=fortsprite.net` and `PASSKEY_ORIGIN=https://fortsprite.net`; the former Epic OAuth variables were removed. Migration 0008 is applied to the production branch.

Platform passkeys still need deployment verification across the supported browsers and device/password-manager combinations.

## Persistent rate limits

Authentication uses [Better Auth database rate limiting](https://better-auth.com/docs/concepts/rate-limit), including ten passkey registration starts and twenty passkey authentication attempts per minute. Application mutations use persistent per-user budgets. Migration 0005 creates the shared PostgreSQL counters. Authentication trusts the `x-real-ip` header supplied by [Vercel](https://vercel.com/docs/headers/request-headers); do not expose the standalone debug API directly on an untrusted network.

The workspace configuration follows [Vercel’s monorepo root settings](https://vercel.com/docs/monorepos/monorepo-faq).
