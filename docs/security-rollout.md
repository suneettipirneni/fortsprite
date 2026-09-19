# Better Auth account migration rollout

The migration replaces the Epic identity and friend graph with FortSprite-owned, passkey-only accounts.

1. Add the Better Auth, passkey, database, and support environment variables documented in `docs/vercel.md`. Keep `BETTER_AUTH_SECRET` unchanged unless existing sessions are intentionally invalidated.
2. Install the committed lockfile and run migrations through 0008 with a direct, non-pooled database URL. Verify the passkey table and the final-passkey deletion trigger.
3. Run `pnpm --filter @fortsprite/api auth:remove-legacy-epic-user` without flags. It must report exactly one user, one account, one Epic account, zero passkeys, and `exactLegacyShape: true`.
4. Because the only legacy user is authorized disposable development data, rerun the same command with `--execute`. The command refuses every other database shape and deletes through the user cascade.
5. Verify zero users and zero `epic-games` account rows. Deploy the new application without any `EPIC_*` variables or old instances still serving Epic routes.
6. Verify passkey-first account creation, passkey sign-in, adding a backup passkey, final-passkey deletion refusal, sign-out, exact-handle friend requests, blocking, collection updates, and account deletion.

Application DTOs do not expose internal emails, passkey credential IDs, public keys, or session tokens. Browser requests are constrained by the Hono method-and-path allowlist and same-origin checks.

The shared per-user budgets are 120 collection writes, 30 profile edits, 60 sharing grants, 120 privacy actions, and 10 deletion attempts per minute. Better Auth separately limits passkey registration and authentication starts.

If passkey deployment verification fails, do not re-enable Epic as a fallback. Roll back the application while leaving the additive passkey migrations in place.
