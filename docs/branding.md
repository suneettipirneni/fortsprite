# FortSprite icon

Use the shared filled SVG component for app branding:

```tsx
import { FortSpriteIcon } from "@/components/fortsprite-icon"

<FortSpriteIcon size={32} className="shrink-0 text-[#9cfab5]" />
<FortSpriteIcon size={24} color="currentColor" />
```

The icon defaults to 24px and inherits the current text color. It accepts standard SVG props, including `className`, `style`, and React 19's `ref`. It has a filled silhouette, so use `color` or text-color utilities to theme it.

It is decorative by default when paired with the FortSprite wordmark. For a standalone meaningful image, pass `role="img"`, `aria-hidden={false}`, and `aria-label="FortSprite"`. Label icon-only links and buttons on their interactive element instead.

The downloadable transparent SVG is [fortsprite.svg](../apps/web/public/brand/fortsprite.svg), served at `/brand/fortsprite.svg`. The component and SVG use the same paths traced from the approved mint mascot. The eyes and mouth are transparent cutouts. Keep both path definitions in sync when changing the artwork.

For a square app icon, use [fortsprite-rounded.svg](../apps/web/public/brand/fortsprite-rounded.svg). It places the same mascot on a navy rounded square with transparent outer corners. The favicon at `apps/web/app/icon.png` is its 128 × 128 PNG export.
