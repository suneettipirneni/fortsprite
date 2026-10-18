import Image, { type StaticImageData } from "next/image"

import backing0 from "@/assets/variant-backings/gold.png"
import backing1 from "@/assets/variant-backings/cheat-master.png"
import backing2 from "@/assets/variant-backings/loot-hacker.png"
import backing3 from "@/assets/variant-backings/bounty-hunter.png"
import backing4 from "@/assets/variant-backings/trick-or-treat.png"
import backing5 from "@/assets/variant-backings/quack.png"
import backing6 from "@/assets/variant-backings/cube.png"
import backing7 from "@/assets/variant-backings/gummy.png"
import backing8 from "@/assets/variant-backings/galaxy.png"
import backing9 from "@/assets/variant-backings/holofoil.png"
import backing10 from "@/assets/variant-backings/gem.png"

const backings: Record<string, StaticImageData | undefined> = {
  "Gold": backing0,
  "Cheat Master": backing1,
  "Loot Hacker": backing2,
  "Bounty Hunter": backing3,
  "Trick or Treat": backing4,
  "Quack": backing5,
  "Cube": backing6,
  "Gummy": backing7,
  "Galaxy": backing8,
  "Holofoil": backing9,
  "Gem": backing10,
}

/** Decorative layer; the parent supplies positioning, isolation and clipping. */
export function VariantBackdrop({
  variant,
  sizes,
  softened = false,
}: {
  variant: string
  sizes: string
  softened?: boolean
}) {
  const backing = Object.hasOwn(backings, variant) ? backings[variant] : undefined
  if (!backing) return null

  return (
    <div
      aria-hidden="true"
      data-variant-backdrop={variant}
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <Image
        key={variant}
        src={backing}
        alt=""
        fill
        sizes={sizes}
        placeholder="blur"
        loading="lazy"
        className={softened ? "scale-125 object-cover blur-xl" : "object-cover"}
      />
      {softened ? <div className="absolute inset-0 bg-black/55" /> : null}
    </div>
  )
}
