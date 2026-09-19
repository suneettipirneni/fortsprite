# Better Auth account migration rollout

The migration replaces the Epic identity and friend graph with FortSprite-owned accounts using Apple, Google, and passkeys.

1. Register the exact Google and Apple production callbacks documented in `docs/vercel.md`. Add every required provider, Apple signing, Better Auth, passkey, database, and support environment variable. Keep `BETTER_AUTH_SECRET` unchanged unless the old sessions are intentionally invalidated.
2. Install the committed lockfile and run migration 0007 through the package-local Drizzle command with a direct, non-pooled database URL. Verify the passkey table, cascade foreign key, user index, and unique credential index.
3. Run `pnpm --filter @fortsprite/api auth:remove-legacy-epic-user` without flags. It must report exactly one user, one account, one Epic account, zero passkeys, and `exactLegacyShape: true`.
4. Because the only legacy user is authorized disposable development data, rerun the same command with `--execute`. The command refuses every other database shape and deletes through the user cascade.
5. Verify zero users and zero `epic-games` account rows. Deploy the new application without any `EPIC_*` variables or old instances still serving Epic routes.
6. Verify real Google sign-in, Apple sign-in, explicit provider linking, final-provider unlink refusal, passkey registration, passkey sign-in, passkey deletion, sign-out, exact-handle friend requests, blocking, collection updates, and account deletion.

OAuth tokens remain encrypted by Better Auth. Application DTOs do not expose provider account IDs or token fields. Passkey DTOs do not expose credential IDs or public keys. Browser requests are constrained by the Hono method-and-path allowlist and same-origin checks.

The shared per-user budgets are 120 collection writes, 30 profile edits, 60 sharing grants, 120 privacy actions, and 10 deletion attempts per minute. Better Auth separately limits social sign-in and passkey authentication starts.

If provider setup is incomplete, do not re-enable the Epic integration as a fallback. Roll back the deployment while leaving migration 0007 in place because the additive passkey table is compatible with the previous schema.
