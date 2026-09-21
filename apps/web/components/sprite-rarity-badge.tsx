import type { ComponentProps } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

const rarityClassNames: Record<string, string> = {
  rare: "border-rarity-rare/45 bg-rarity-rare/15 text-rarity-rare",
  epic: "border-rarity-epic/45 bg-rarity-epic/15 text-rarity-epic",
  legendary:
    "border-rarity-legendary/45 bg-rarity-legendary/15 text-rarity-legendary",
  mythic: "border-rarity-mythic/45 bg-rarity-mythic/15 text-rarity-mythic",
  special: "rarity-special-badge",
}

type SpriteRarityBadgeProps = Omit<ComponentProps<typeof Badge>, "children"> & {
  rarity: string
}

export function SpriteRarityBadge({
  rarity,
  className,
  ...props
}: SpriteRarityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        rarityClassNames[rarity.toLowerCase()],
        className,
      )}
      {...props}
    >
      {rarity}
    </Badge>
  )
}
