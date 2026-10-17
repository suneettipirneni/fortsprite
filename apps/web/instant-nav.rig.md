# FortSprite instant navigation rig

- BUILD: `tests/instant/start.ts` prepares production Sprite assets, runs `next build`, and serves the resulting `.next-instant` artifact with `next start` on localhost port 3002.
- EXPOSE: `EXPOSE_TESTING_API=1` is set during both build and start. `next.config.ts` must enable `experimental.exposeTestingApiInProductionBuild` only under that explicit opt-in. Normal deployment builds omit it.
- RUN: From the repository root, run `TEST_DATABASE_URL=postgresql://.../fortsprite_test_instant pnpm --filter @fortsprite/web exec playwright test --config playwright.instant.config.ts`. Use an already migrated isolated test database. The URL pathname must contain `test`. The config tests desktop and mobile Chromium without retries.
- TEST USER: The API browser seeder creates two temporary users, signed sessions, and collection entries. Tests inject the first user's signed session without navigating the measured page first. The fixture uses `/tmp/fortsprite-instant-fixture.json` and is cleaned when the server exits.
- DRIFT: Production uses secure session cookies; the test rewrites the seeded cookie name to `__Secure-better-auth.session_token`. Production configuration requires HTTPS origins, so the rig uses an HTTPS proxy at `https://localhost:3002` in front of `next start`. It covers authenticated navigation and collection and profile mutations, but not passkey ceremonies. Catalog import uses the checked-in manifest. Production artwork remains subject to the approval publisher. No feature flags, paid plans, or roles affect this collection fixture.
- LOOP: Build, start, test, inspect the failure, edit, and run the same command again. Playwright refuses an existing server on the configured port. The launcher forwards termination signals to its Next process. Never reuse a stale artifact. Never run this rig alongside the ordinary browser suite because asset preparation writes the same public asset directory. Dedicated fixture paths and the separate build directory isolate the remaining runtime resources.
- LIVENESS: Local build and start happen in one launcher invocation; no remote SHA probe is needed. An occupied port is an error rather than permission to reuse another server.
- WALLS: A test PostgreSQL database and installed Playwright Chromium are prerequisites. `PLAYWRIGHT_BROWSERS_PATH` may identify the machine's existing Chromium install. Run focused tests when iterating: repeated full runs in a short window can hit the API's IP rate limit.

The locked tests assert that prefetched data is visible immediately on all five primary tabs, with a separate fresh-page test per destination and viewport. Account credentials remain uncached: its profile is ready under the lock, while its passkey skeleton stays visible until the lock releases. Tests use the public `instant()` API rather than internal prefetch request headers. A cold collection navigation instead checks that its progress skeleton has the same height as the loaded stats. Mutation tests check that the active tab sees its own saved changes and that another open tab refreshes after an in-app collection action. Hard navigation reloads without the lock before checking streamed content, because its locked document cannot resume streaming after release.

When first validating a change, confirm both navigation types reach the same selectors without the lock using a temporary baseline test. Record the locked failure before moving the static shell, then restore only the old boundary to show the regression test fails and reapply the fix to show it passes. Remove temporary baseline tests before shipping. A build or selector failure is not evidence that navigation was blocked.

## Primary-link contracts

All five primary tabs retain their existing viewport-triggered `prefetch={true}` policy; this pass adds no server-invoking links or cache lifetimes.

- `/account` → Overview (`/`): greeting, collected count, and completion progress ready before the click.
- `/account` → Collection (`/collection`): collection content, first Sprite image, and captured/mastered progress ready before the click.
- `/account` → Friends can help (`/matches`): heading, missing count, and search ready before the click.
- `/account` → Friends (`/friends`): heading and friend search ready before the click.
- `/collection` → Account (`/account`): heading and editable profile ready before the click; fresh passkey data waits for navigation. `getCredentials()` calls `connection()` before API rate-limit bookkeeping can execute during prefetch.

Prefetching remains best-effort; these tests check available content, not latency guarantees. Account's disabled passkey input and loading status under the lock, followed by an enabled input after release, also prove the testing lock is engaged.

For focused prefetch validation, run `prefetch.instant.ts` on both configured projects. Its serial `beforeEach` reseeds the temporary actors so private caches, mutations, and per-user rate budgets cannot leak between tests. Production rate limits stay enabled. Do not run this fixture concurrently with another suite.
