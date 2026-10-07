# Authenticated-page performance — October 6, 2026

Compared with upstream main `4a0a3d8` (Next.js 16.4.0, including the Rust React compiler), the optimized build completes a working search about half a second sooner on the constrained connection tested. First paint does not improve significantly. These are local production-build measurements, not production Vercel latency.

## Measured results

| Metric | Before | After | Relative change |
| --- | ---: | ---: | ---: |
| Collection: time to working search | 6,581 ms | 6,104 ms | **−7.3%** |
| Matches: time to working search | 6,244 ms | 5,732 ms | **−8.2%** |
| JavaScript transferred during either cold-load journey, including navigation prefetch | 514,634 B | 464,326 B | **−9.8%** |
| JavaScript decoded during either journey | 1,550,401 B | 1,379,363 B | **−11.0%** |
| Matches authenticated RSC prefetch, uncompressed | 139,916 B | 38,542 B | **−72.5%** |
| Matches prefetch, estimated gzip | 13,907 B | 8,154 B | **−41.4%** |
| Collection authenticated RSC prefetch, uncompressed | 248,052 B | 233,656 B | −5.8% |
| Collection prefetch, estimated gzip | 26,745 B | 26,404 B | −1.3% |
| Collection first contentful paint | 1,656 ms | 1,652 ms | −0.2%, inconclusive |
| Matches first contentful paint | 1,628 ms | 1,614 ms | −0.9%, inconclusive |
| Extra full-catalog database reads on the first Matches request | 1 | 0 | One redundant read removed |

The paired bootstrap 95% intervals for the working-search change are −7.64% to −7.03% for Collection and −8.33% to −8.01% for Matches. Both first-paint intervals include zero. Steady local RSC response time changed from 21.40 to 20.70 ms for Collection and 17.91 to 17.92 ms for Matches; these small local differences do not establish a server-latency win.

## Changes retained

- Result cards in Matches and friend comparisons receive only their six display/filter fields and helper profiles. Detail descriptions, source URLs, and other unused metadata stay off these client boundaries. Collection retains the rich catalog for immediate details.
- Collection's server-to-client tracking payload represents untouched entries by ID and sends each helper profile once. Decoding preserves catalog membership, removal timestamps, helper order, mastery, and independent user snapshots. Decoded snapshots are memoized by payload object with a `WeakMap`; this is not a cache shared by user ID. The public API contract stays unchanged.
- Collection assembly starts private tracking and the already shared public catalog concurrently. It checks revision equality before combining them and retains revision-specific loading and retry on changes. A live isolated-database metadata change verified that Matches refreshes instead of using stale catalog data.
- WebMCP schemas and validation load only when `document.modelContext` exists. Unsupported browsers avoid that bundle; supported browsers still register public and authenticated tools with their existing abort-scoped lifetime.
- The mobile dock uses `LazyMotion`, `domAnimation`, and `m.span`, preserving its spring and reduced-motion behavior while excluding unused drag/layout features. See [Motion's feature-bundle documentation](https://motion.dev/docs/react-lazy-motion).
- The canvas export renderer loads on Generate. The export dialog remains eager, and cancellation checks cover the asynchronous import.
- Privacy and terms use `ensureStatic = "navigation"` as future static-rendering guardrails. They were already statically rendered; no immediate speed gain is attributed to these exports. See [Next.js static-page guidance](https://nextjs.org/docs/app/guides/keeping-pages-static).

Only public catalog metadata is shared across users. Ownership, timestamps, helpers, friendship eligibility, credentials, and viewer data retain their authenticated/private boundaries and mutation invalidation.

## Suspense evaluation

The existing composition helps perceived loading and remains granular:

- Navigation and headings do not wait for the account menu. Streamed menu triggers still wait for their own hydration.
- Collection's shared artwork and filters render while tracking is gated. Individual progress values and capture/mastery controls fill in afterward. Moving the private await into the explorer's parent would withhold this useful shared content. The gated-tracking regression checks visible artwork and no more than a 1px change in progress-block height.
- Dashboard counts/cards share one request-scoped collection read. Sharing sections and viewer identity can resolve independently. Starting the public catalog alongside tracking removes a data dependency without collapsing these UI boundaries.
- Matches' counts, season label, and results use the same deduplicated collection promise. Their small boundaries preserve labels and useful fallbacks without repeated collection reads.
- Account profile, credentials, MCP keys/grants, and deletion sections remain independent. A slower credential or grant request need not hold the profile form.
- Friend comparison stays together under its boundary because identity, authorization, and both sides of the comparison need the same authenticated result.

Full private prefetch stays enabled for the primary tabs. Replacing it with a static shell would regress the existing guarantee that personalized counts and controls are present immediately after a prefetched navigation.

## Trials excluded

`ensureStatic = "prefetch"` on Help reduced one measured prefetch response's median completion from 10.93 to 6.54 ms (−40.2%), but increased its uncompressed body from 4,704 to 13,013 B (+176.6%). Twelve paired prefetched browser navigations showed no reliable visible improvement. Help retains its existing prefetch behavior.

A local-font experiment produced mixed first-paint and interaction results. Font preloading competed with critical code, so the font changes were discarded. The final authenticated benchmarks use the original font setup in both builds.

## Method and limits

- Two independently installed production builds, with the same Node 22.23.3, Next.js 16.4.0, dependencies, Rust React compiler setting, and isolated PostgreSQL 18.4 database. Upstream main was fetched and checked before release.
- The complete 239-item catalog was seeded before both builds. Each actor had one captured current-season item and no accepted friends. Dense friend graphs may gain more from profile deduplication, but that gain was not measured here.
- Chromium 153, fresh contexts, 1440×1000 viewport, blocked analytics scripts, 4× CPU slowdown, 80ms network latency, 150,000 B/s download and 125,000 B/s upload. These emulate constrained resources; they are not measurements from physical phones.
- Eight cold-load samples per route and variant, alternating variant order, with no concurrent builds during the final run. Working-search time runs from navigation start until automation can enter a nonexistent query and observe `Showing 0 of…`, after DOMContentLoaded; it includes automation/polling overhead and is not a universal TTI metric. Each journey restores the query and settles for 1.5 seconds before recording resources.
- JavaScript transfer/decoded sizes are browser resource-timing sums, including background primary-tab prefetch. RSC uses 24 requests per route and variant with headers and the canonical `_rsc` URL captured from actual private Link prefetch. RSC gzip sizes are computed with `gzipSync`, not captured wire sizes.
- Actors were refreshed to stay inside production read budgets. Both servers used local TLS proxies. Native Vercel region/CDN behavior and HTTP/2 were not benchmarked.
- A query probe records categories only, not SQL parameters or credentials. It observed 14 versus 13 total query calls on the first Matches response, with the full-catalog call changing from one to zero.

[Sanitized samples and summary](performance-2026-10-06.json) retain the measured results. Session cookies and user fixtures are not checked in.

## Validation

Validation results are recorded in [verification.md](verification.md). Existing browser failures from the dependency upgrade remain documented there; they are not suppressed by this performance change.
