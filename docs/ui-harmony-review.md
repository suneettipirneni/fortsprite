# UI Harmony — committed Next.js site

November 15, 2026. Worktree: `codex/ui-harmony`, based on committed `main` at `a82acb4`. No Exact migration files or uncommitted migration changes were copied into this worktree. The earlier Exact-specific review is superseded by this review.

## Scope and intent

The primary route is `collection`: find, filter and inspect Fortnite Sprites, with progress tracking as supporting context. Scoped branches cover the query/filter molecule, application shell, accessible controls and responsive composition. Cards are appropriate for visual identification; the grouped navigator supports movement between base Sprites and their variants. A table or hidden-controls redesign is not justified by this task.

Preserved strengths: original Sprite portraits and variant backdrops; mint branding and navy surfaces; grouped variant navigation; explicit rarity and variant text; existing touch target heights; selected states; keyboard interaction and modal focus restoration. The expressive dock and saturated palette are intentional product identity.

All browser work used a disposable local PostgreSQL database and generated test collectors. No production data or account was used. Catalog content came from the committed snapshot: 313 released Sprites, 34 in the selected current season. Test mutations were restored to the original capture fixture before the final audit.

## Findings and changes

| Finding | Evidence and consequence | Correction, preservation and verification |
| --- | --- | --- |
| **Major, high confidence:** unnamed filter removal. Owner: shared combobox chip and collection query bar. | Axe found the icon-only chip removal button had no accessible name at all four audit widths. This leaves its operation unidentified to assistive technology. | Added an optional `removeLabel` to the shared chip, with the collection supplying “Remove Season: C7 MS” and equivalent contextual names. Kept its icon, geometry and keyboard behavior. The default-season browser test asserts the contextual name; final axe checks confirm the unnamed-button finding is absent. |
| **Major, high confidence:** visible and accessible labels differ. Owners: app header, sign-in and Sprite tile. | Brand links were named “Homepage,” the account menu excluded the visible collector identity/initials, and Sprite names reordered the visible name/rarity/variant. Axe additionally exposed concatenated text nodes such as `Halfpeel'dRareBase`. Voice and accessible naming should identify the same visible object. | Brand links now include “FortSprite”; the account name includes the visible identity; Sprite names follow the visible order. Explicit spaces preserve word boundaries between flex-laid-out labels without altering the visual arrangement. Decorative avatar content remains hidden from the accessibility tree. Updated label-dependent tests; menu/profile and details tests passed. This addresses WCAG 2.5.3 as tagged by axe, not a visual scoring threshold. |
| **Major, high confidence:** text-growth overflow. Owners: header, query and collection view controls. | At 390px with the root font doubled from 16px to 32px, controls extended the page by 103px and the query input was compressed by its action buttons. | Allowed the brand to shrink and wrap at “Fort / Sprite,” reduced excess mobile menu padding, and used container-based wrapping for query actions and view choices. Larger text retains all controls and labels. Verified zero horizontal overflow, long-search recovery and visible focus at doubled text. This is a text-growth stress check, not actual browser page zoom or a complete WCAG resize-text certification. |
| **Moderate, high confidence:** labels on generic elements. Owners: collection query chip and grouped progress badges. | Manual triage of 58 repeated axe review candidates found `aria-label` on generic `div` and `span` elements. Those labels are not reliably exposed, potentially losing the filter category or the relationship between progress counts. | Give each filter chip a named group role, preserving its operable remove button. Expose each compact progress badge as a single named image, consistent with existing summary badges. Updated grouped-view tests assert the named role and changing capture count. All eight affected desktop/mobile tests pass; all 58 ARIA candidates are absent from the fresh four-width audit. |
| **Moderate, high measurement confidence; medium design confidence:** competing mobile progress scale and excess spacing. Owner: collection page composition. | The 30px progress numerals competed with the 30px title. At 390 × 844px the first card began at y=625px. The toolbar, progress and title occupied much of the initial viewport. | Mobile progress numerals now use 24px; desktop retains 30px. Local gaps reduce from 24→16px and 20→16px, with 12→8px above progress bars. First card begins at y=593px, 32px earlier, with the same card width and height. Existing spacing/type tokens supplied these local targets; they are design choices, not standards. Preserved controls, grouping, artwork and touch heights. |

Alternatives considered: hiding grid/sort/export controls would save more space but add interaction cost; removing the variant navigator would weaken a distinctive browsing aid. Both were rejected. At 320px, intentional wrapping still consumes vertical space. Normal-size mobile profile padding is slightly tighter; its target remains larger than the visible initials. Larger-text branding may wrap instead of clipping.

## Verification

- 17 applicable desktop/mobile browser regressions passed; one desktop case explicitly skips a mobile-only scrollbar check. Covered current-season tokens, accessible chip removal, rendered collection accessibility, details, search/empty recovery, keyboard/modal focus, grid sizes, mobile rail clearance, hydration and profile-menu updates.
- After the final responsive edits, all six affected search/view/hydration checks passed again.
- After the additional label-semantics fixes, eight desktop/mobile checks passed for current-season filters, rendered accessibility, search/reset and grouped progress updates. A fresh four-width audit has zero confirmed axe violations, zero ARIA review candidates and zero capture errors.
- Web and shared UI TypeScript/lint checks passed. Lint retains two existing image-export `no-img-element` warnings in unrelated code.
- Matched collection captures at 320 × 800, 390 × 844, 768 × 1024 and 1440 × 1000 CSS px; fixed product theme and reduced-motion preference, same test account/data.
- Additional successful probes: 320, 768, 1023 and 1024px; 390px with 32px root text; long empty search/reset and actual focused search ring. No horizontal page overflow in these cases.
- Public sign-in captured and inspected at 390 and 1440px, with no confirmed axe violations.
- Baseline collection audit: four unnamed-button occurrences and 83 label/name mismatch occurrences across four viewports. These are repeated manifestations of the component causes above, not 87 separate user problems. Final collection audit: zero confirmed axe violations and zero capture errors; the automated comparison is saved with the evidence.

The capture runner still flags indeterminate contrast over gradients and other manual-review candidates. A clean confirmed-violation lane does not establish full accessibility conformance. Browser-emulated mobile is not physical touch-device verification. Real screen-reader/voice operation, actual page zoom, live passkeys, production performance and a whole-site authenticated audit remain outside this review.

## Modern SaaS preference fit

**74/100 — provisional** for the 390px collection scenario. Calculated by UI Harmony's `style-score.mjs`, separately from task and accessibility findings. Quiet hierarchy, surfaces, typography, rhythm and component precision are each 3/4; purposeful color is 2/4; product character is 4/4. The saturated palette is a mixed fit for neutral SaaS minimalism but should remain because it is FortSprite's identity. Legibility remains unknown pending gradient contrast verification. This score is subjective preference fit, not universal design quality or validated usability.

## Evidence

Local ignored artifacts live in `.audit/ui-harmony/`: `baseline/` and `final/` contain screenshots, geometry and axe results; `semantics-final/` contains the latest four-width captures after the label-semantics fixes; `sign-in/` contains the public auth captures; `stress/` contains text-growth and intermediate-width evidence; browser logs, the comparison and the style input/output accompany them. Session cookies and database credentials are not included.

This review records local verification of the implementation. Publishing and deployment status are tracked by the associated pull request.
