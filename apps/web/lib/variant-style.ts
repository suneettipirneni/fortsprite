export type VariantStyle = {
  frame: {
    backgroundBlendMode?: string
    backgroundColor: string
    backgroundImage?: string
  }
  body: string
  glow: string
}

function globularBackdrop(
  backgroundColor: string,
  topLeft: string,
  bottomRight: string,
  topRight: string,
): VariantStyle["frame"] {
  return {
    backgroundColor,
    backgroundImage: [
      `radial-gradient(ellipse 145% 125% at -32% -28%, ${topLeft} 0%, transparent 78%)`,
      `radial-gradient(ellipse 140% 130% at 132% 132%, ${bottomRight} 0%, transparent 80%)`,
      `radial-gradient(ellipse 125% 155% at 136% -38%, ${topRight} 0%, transparent 78%)`,
      `radial-gradient(ellipse 135% 115% at -26% 138%, ${topRight} 0%, transparent 82%)`,
    ].join(", "),
    backgroundBlendMode: "soft-light, screen, screen, normal",
  }
}

const baseStyle: VariantStyle = {
  frame: { backgroundColor: "var(--background)" },
  body: "bg-chart-1",
  glow: "bg-chart-1/25",
}

const futureVariantStyle: VariantStyle = {
  frame: globularBackdrop(
    "oklch(0.22 0.12 270)",
    "oklch(0.72 0.18 228 / 55%)",
    "oklch(0.68 0.22 306 / 48%)",
    "oklch(0.7 0.23 27 / 32%)",
  ),
  body: "bg-chart-3",
  glow: "bg-chart-3/30",
}

// Adding a catalog variant should usually be one entry here. Keep Base neutral;
// give every named variant a backdrop that reflects its in-game material.
export const variantStyles = {
  Base: baseStyle,
  "Bounty Hunter": {
    frame: globularBackdrop(
      "oklch(0.22 0.12 326)",
      "oklch(0.62 0.25 326 / 62%)",
      "oklch(0.79 0.16 85 / 36%)",
      "oklch(0.5 0.2 294 / 48%)",
    ),
    body: "bg-fuchsia-500",
    glow: "bg-fuchsia-400/35",
  },
  "Cheat Master": {
    frame: globularBackdrop(
      "oklch(0.19 0.09 158)",
      "oklch(0.76 0.22 135 / 54%)",
      "oklch(0.66 0.17 184 / 42%)",
      "oklch(0.48 0.18 151 / 56%)",
    ),
    body: "bg-emerald-500",
    glow: "bg-lime-400/35",
  },
  Cube: {
    frame: globularBackdrop(
      "oklch(0.18 0.09 286)",
      "oklch(0.55 0.22 292 / 55%)",
      "oklch(0.64 0.24 326 / 38%)",
      "oklch(0.42 0.18 270 / 56%)",
    ),
    body: "bg-violet-600",
    glow: "bg-violet-400/35",
  },
  Galaxy: {
    frame: globularBackdrop(
      "oklch(0.15 0.08 276)",
      "oklch(0.45 0.2 276 / 52%)",
      "oklch(0.58 0.23 310 / 48%)",
      "oklch(0.38 0.16 250 / 62%)",
    ),
    body: "bg-indigo-600",
    glow: "bg-violet-400/35",
  },
  Gem: {
    frame: globularBackdrop(
      "oklch(0.42 0.1 244)",
      "oklch(0.94 0.04 220 / 58%)",
      "oklch(0.72 0.15 220 / 45%)",
      "oklch(0.8 0.08 245 / 48%)",
    ),
    body: "bg-sky-200",
    glow: "bg-cyan-300/35",
  },
  Gold: {
    frame: globularBackdrop(
      "oklch(0.27 0.08 67)",
      "oklch(0.82 0.18 78 / 58%)",
      "oklch(0.92 0.13 98 / 38%)",
      "oklch(0.65 0.16 62 / 52%)",
    ),
    body: "bg-amber-400",
    glow: "bg-yellow-300/35",
  },
  Gummy: {
    frame: globularBackdrop(
      "oklch(0.24 0.11 8)",
      "oklch(0.7 0.22 18 / 58%)",
      "oklch(0.75 0.2 135 / 38%)",
      "oklch(0.63 0.22 350 / 52%)",
    ),
    body: "bg-rose-500",
    glow: "bg-rose-300/35",
  },
  Holofoil: {
    frame: globularBackdrop(
      "oklch(0.28 0.12 282)",
      "oklch(0.76 0.15 205 / 58%)",
      "oklch(0.8 0.2 135 / 44%)",
      "oklch(0.68 0.24 330 / 52%)",
    ),
    body: "bg-cyan-400",
    glow: "bg-fuchsia-300/35",
  },
  "Loot Hacker": {
    frame: globularBackdrop(
      "oklch(0.2 0.11 265)",
      "oklch(0.55 0.22 265 / 58%)",
      "oklch(0.75 0.14 210 / 42%)",
      "oklch(0.52 0.21 292 / 52%)",
    ),
    body: "bg-blue-500",
    glow: "bg-cyan-400/35",
  },
  Quack: {
    frame: globularBackdrop(
      "oklch(0.23 0.14 302)",
      "oklch(0.62 0.25 320 / 55%)",
      "oklch(0.73 0.15 210 / 48%)",
      "oklch(0.58 0.22 280 / 56%)",
    ),
    body: "bg-violet-500",
    glow: "bg-cyan-300/35",
  },
} satisfies Record<string, VariantStyle>

export function isStyledVariant(
  variant: string,
): variant is keyof typeof variantStyles {
  return Object.hasOwn(variantStyles, variant)
}

export function variantStyle(variant: string): VariantStyle {
  return isStyledVariant(variant)
    ? variantStyles[variant]
    : futureVariantStyle
}
