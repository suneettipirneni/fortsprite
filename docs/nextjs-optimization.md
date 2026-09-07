# Next.js rendering and navigation

The four skills linked from the [official Next.js AI agents guide](https://nextjs.org/docs/app/guides/ai-agents) were installed and applied: `next-dev-loop`, `next-cache-components-adoption`, `next-cache-components-optimizer`, and `next-partial-prefetching-adoption`.

FortSprite renders its navigation and page headings before private data resolves. Account identity, collections, friendship state, and comparisons stream into that frame through Suspense. This improves the initial loading experience without sharing private responses between users.

## Data boundaries

[`lib/api.ts`](../apps/web/lib/api.ts) awaits `connection()` before reading cookies and calling the authenticated Hono API with `no-store`. This explicit request boundary keeps private work out of prerendering. Its `React.cache` wrappers deduplicate calls within a server render. They do not provide a persistent data cache.

Do not add shared `"use cache"` boundaries around viewer, collection, sharing, or comparison reads. Those responses depend on the signed-in user, current Epic consent, accepted sharing, and blocks. The API continues to enforce those checks for every private read and mutation.

Public catalog metadata and fixed page copy can remain in the static shell. Private counts, names, ownership controls, and comparison results appear only after their authenticated reads resolve. Comparison parameters stay inside the suspended content component; friend IDs are not enumerated for prerendering.

## Shell composition

[`AuthenticatedAppShell`](../apps/web/components/authenticated-app-shell.tsx) renders the shared frame synchronously and streams its profile menu. Page components keep fixed headings and explanatory copy outside their data boundaries. `ContentLoading` supplies a visible fallback inside the existing responsive content container.

[`AppShell`](../apps/web/components/app-shell.tsx) gives each navigation link a small Suspense boundary around `usePathname()`. The fallback renders the same link without an active-state marker. Resolving the pathname updates that marker without withholding the entire navigation. Keep responsive layout outside these boundaries so mobile and desktop use the same frame before and after streaming.

The configuration uses Next.js 16.3 with `cacheComponents: true` and `partialPrefetching: true`. Cache Components permits a prerendered shell with fresh request-time content. Partial Prefetching prepares reusable shell content through normal links. Neither setting guarantees cached private data or a completed page before a click. Keep explicit full-prefetch requests limited to a measured need.

Streamed account and mobile menu triggers are disabled until their own component hydrates. This prevents a visible server-rendered pointer control from losing an early click while its JavaScript is still loading. Ordinary navigation links remain usable. The hydration regression holds script requests, checks the disabled state, then releases them and opens each menu. The hook uses React's [server snapshot contract](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering).

The testing API is enabled only when `EXPOSE_TESTING_API=1`. Normal deployment builds must omit that environment variable.

## Mutations and optimistic state

Collection edits, sharing controls, and profile saves call the Server Actions in [`app/actions`](../apps/web/app/actions). The server-only [`mutateApi`](../apps/web/lib/server-mutation.ts) bridge forwards the request's cookies, Origin, and Sec-Fetch-Site to fixed Hono endpoints. It does not substitute an authorized origin or accept a client-supplied owner. Hono authenticates the session, checks the origin, validates the input, and applies the existing database rules. Expected API failures return an `ActionResult`; client components display a generic retry message for transport failures.

`FriendsManager` applies `useOptimistic` inside an async transition. Requests and blocks update immediately, then settle against fresh server props. A rejected action restores the confirmed snapshot. Optimistic acceptance cannot enable Compare until the confirmed snapshot grants sharing. Unblock removes the blocked entry without inventing a visible friend or restoring consent. Pending controls prevent duplicate submissions.

`ProfileEditor` uses a form action with `useActionState`. Fields remain visible but disabled while saving. The form retains the user's draft after failure, and it reports success only after the server accepts the change. Profile and sharing actions call `refresh()` after success so the action response includes updated route content.

Collection edits retain the existing per-Sprite desired-state queue and immediate ownership feedback. Successful collection actions invalidate the overview and matches paths. Server-rendered updates must reconcile with the queue without remounting the explorer or discarding filters, focus, and queued intent. The regression suite covers that interaction separately from shell navigation.

## Authentication and latency

[`proxy.ts`](../apps/web/proxy.ts) still validates the session before serving matched protected requests. A cold document or prefetch request can therefore wait for authentication before receiving its shell. Suspense does not remove that work. The API remains the authorization boundary even when navigation and fixed copy are visible.

The existing API latency budget is separate from shell rendering. The organization pass measured collection API p95 at **524.21 ms** against a **500 ms** target. The navigation work does not establish that this query budget has improved.

## Verification

React Compiler is enabled with `reactCompiler: true` and `babel-plugin-react-compiler`.
The app and shared UI use ordinary functions and derived values instead of manual
`useMemo`/`useCallback`. Collection saves retain their per-Sprite synchronization
queue; profile failures retain the controlled draft.

The root `eslint.config.mjs` applies Next.js React/TypeScript rules and all 16
recommended React Hooks rules at error severity to both `apps/web` and
`packages/ui/src`. Run `pnpm lint` from the root. Compiler diagnostics supported
by the plugin fail lint, including purity, refs, unsupported syntax and incompatible
libraries. The lint task includes this configuration in its Turborepo cache inputs.

The compiler cleanup passed root lint/typechecking, 23 web unit tests, the 30-case
desktop/mobile suite, and 18 targeted browser checks after the final action changes.
The ordinary production build passed with React Compiler enabled and the testing
API disabled. An in-memory impure-render probe confirmed `react-hooks/purity`
reports an error for files in both packages.

The [instant-navigation rig](../apps/web/instant-nav.rig.md) documents the isolated database, production build, signed test user, provider fixture, and `instant()` assertions. From the repository root, with an already migrated test database:

```sh
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/web exec playwright test --config playwright.instant.config.ts
```

The launcher builds and starts its own production artifact. Run it separately from the ordinary browser suite because both prepare the public Sprite assets. The ordinary regression command is:

```sh
TEST_DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @fortsprite/web test:e2e
```

Final local evidence, September 6, 2026:

| Check | Result |
| --- | --- |
| Production baseline without the lock | 4 passed across hard and soft navigation on desktop and mobile |
| Original page under the dynamic-data lock | 4 failed because the collection heading was unavailable |
| Optimized page under the same lock | 4 passed on desktop and mobile |
| Revert-and-reapply differential | Desktop hard and soft navigation failed with the collection shell boundary reverted; both passed after reapplying it |
| Final Partial Prefetching configuration with Server Actions | 8 production instant-navigation checks passed: hard and soft navigation, desktop and mobile, each repeated twice |
| Server Action regression suite | All 30 desktop/mobile scenarios passed, including delayed requests, rollback, coalescing, retained dialogs/filters, validation retries and delayed JavaScript |
| Runtime diagnostics | No compilation/configuration/session errors across all 10 page routes in an unmocked agent-browser sweep |
| Ordinary production build | Passed in 22.909s with the testing API disabled |
| Static checks and web units | Root lint/typechecking and all 23 web unit tests passed |

The preceding organization pass separately passed 45 API functional tests, 13 web unit tests, 20 browser scenarios, and the production build. Those API results predate the rendering change; the final web and production checks above verify the completed rendering and action implementation.

The differential evidence was recorded in `/tmp/fortsprite-instant-final-reverted.log` and `/tmp/fortsprite-instant-final-reapplied.log`. The earlier desktop and mobile success is in `/tmp/fortsprite-instant-green.log`. These are local run artifacts. The checked-in rig and tests reproduce the assertions.

Final logs: `/tmp/fortsprite-actions-browser-verified.log`, `/tmp/fortsprite-instant-final-verified.log`, `/tmp/fortsprite-runtime-route-sweep.log`, and `/tmp/fortsprite-production-final-build.log`. Browser checks used isolated PostgreSQL databases and deterministic Epic fixtures. The production instant rig verifies rendering over its read-only local transport; real mutation flows are exercised by the ordinary browser suite. These checks do not establish a live Epic deployment or Vercel-region latency.
