# Deploy FortSprite to Vercel

1. Create a PostgreSQL database with a provider that supports pooled connections. Keep the connection string in deployment secrets.
2. Import the repository into Vercel. Select the Next.js preset and set the root directory to `apps/web`. Enable access to files outside that root so workspace packages are available.
3. Set the environment variables from `apps/web/.env.example` in Vercel. Generate `BETTER_AUTH_SECRET` with `openssl rand -hex 32`. Set both `BETTER_AUTH_URL` and `WEB_ORIGIN` to the exact public HTTPS origin. Leave `BETTER_AUTH_COOKIE_DOMAIN` empty. Set `SUPPORT_CONTACT_URL` to your actual HTTPS contact page or `mailto:` address; it supplies the Help, Privacy and Terms contact link. The link is omitted locally when unset, so setting it is a release requirement.
4. Configure the Epic client for the deployed product. Register the exact callback URL `https://YOUR_DOMAIN/api/auth/oauth2/callback/epic-games`. Confirm the registered client supports the configured scopes and PKCE.
5. Run `pnpm --filter @fortsprite/api db:migrate` with the target `DATABASE_URL` in a secure local terminal or release job. Do not run migrations on every function request.
6. Run `pnpm --filter @fortsprite/api catalog:import` with the same server environment to import the curated snapshot. Use `--approvals=path/to/asset-approvals.json` for approved artwork. This command preserves existing Sprite IDs and collection history.
7. Run `pnpm build` and deploy through Vercel. Verify `/api/v1/health` reports a healthy database. Check the real Epic sign-in, callback, sign-out, and collection reload on that deployment.

Use a stable preview domain and a separate database and Epic callback registration for preview testing. Arbitrary generated preview URLs are not automatically approved OAuth callbacks. Never put server secrets in variables with the `NEXT_PUBLIC_` prefix.

The web app mounts Hono at `/api` through its Node.js route handler. It needs no separate API deployment or `API_URL`. PostgreSQL queries, authorization, and migrations remain in `apps/api`.

## Approve catalog artwork

The importer accepts an approval file with this shape. Each `sourceUrl` must match the catalog record's original `sourceImage`.

```json
{
  "assets": [
    {
      "imagePath": "/sprites/example.png",
      "sourceUrl": "https://example.com/original.png",
      "usageBasis": "Document the actual permission or license here.",
      "approvedAt": "2026-09-05"
    }
  ]
}
```

Set `CATALOG_ASSET_APPROVALS` to the approval file path for the production build. Pass that same manifest to the database importer. The build publishes only approved images. Production responses use a neutral image when approval is absent. For local development only, pass `--allow-source-artwork` to the importer. That flag is rejected in production and does not establish production approval.

## Release status

Collection tracking, friend sharing, comparisons, profile editing, and account deletion are implemented. Local protocol and database tests use deterministic Epic fixtures. Verify the real Epic callback, approved artwork, support contact, hosting retention settings, and cross-browser checks before releasing. No Vercel deployment has been performed by this task.

## Persistent rate limits

Authentication uses [Better Auth database rate limiting](https://better-auth.com/docs/concepts/rate-limit), including ten sign-in starts per minute. Friend discovery permits 120 refreshes per user per minute. Migration 0005 creates the shared PostgreSQL counters. Authentication trusts the `x-real-ip` header supplied by [Vercel](https://vercel.com/docs/headers/request-headers); do not expose the standalone debug API directly on an untrusted network.

The workspace configuration follows [Vercel’s monorepo root settings](https://vercel.com/docs/monorepos/monorepo-faq).
