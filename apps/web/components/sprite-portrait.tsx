import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import type { SpriteTone } from "@/lib/catalog-presentation"

const toneClasses: Record<
  SpriteTone,
  { frame: string; body: string; glow: string }
> = {
  aqua: {
    frame: "bg-chart-1/12",
    body: "bg-chart-1",
    glow: "bg-chart-1/35",
  },
  gold: {
    frame: "bg-chart-2/15",
    body: "bg-chart-2",
    glow: "bg-chart-2/35",
  },
  violet: {
    frame: "bg-chart-3/12",
    body: "bg-chart-3",
    glow: "bg-chart-3/35",
  },
  green: {
    frame: "bg-chart-4/12",
    body: "bg-chart-4",
    glow: "bg-chart-4/35",
  },
  ember: {
    frame: "bg-chart-5/12",
    body: "bg-chart-5",
    glow: "bg-chart-5/35",
  },
}

const variantFrameClasses: Record<string, string> = {
  Base: "bg-chart-1/30",
  Gold: "bg-chart-2/38",
  Gummy: "bg-chart-5/34",
  Galaxy: "bg-chart-3/38",
  Gem: "bg-chart-4/34",
  Holofoil: "bg-linear-to-br from-chart-1/40 via-chart-3/35 to-chart-4/40",
  Cube: "bg-chart-3/48",
  Quack: "bg-chart-2/45",
}

type SpritePortraitProps = {
  tone: SpriteTone
  variant?: string
  label: string
  src?: string
  sizes?: string
  className?: string
}

export function SpritePortrait({
  tone,
  variant,
  label,
  src,
  sizes = "(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 14rem",
  className,
}: SpritePortraitProps) {
  const classes = toneClasses[tone]
  const frameClass = variant
    ? (variantFrameClasses[variant] ?? classes.frame)
    : classes.frame

  if (src) {
    return (
      <div
        className={cn(
          "relative isolate aspect-[5/4] overflow-hidden rounded-[min(1.2vw,1rem)]",
          frameClass,
          className,
        )}
      >
        <Image
          src={src}
          alt={`${label} Sprite`}
          fill
          sizes={sizes}
          className="object-contain p-2"
        />
      </div>
    )
  }

  return (
    <div
      aria-label={`${label} placeholder artwork`}
      role="img"
      className={cn(
        "relative isolate aspect-[5/4] overflow-hidden rounded-[min(1.2vw,1rem)]",
        frameClass,
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-x-[18%] bottom-[12%] h-[38%] rounded-full blur-xl",
          classes.glow,
        )}
      />
      <div
        className={cn(
          "absolute top-[23%] left-1/2 size-[42%] -translate-x-1/2 rotate-45 rounded-[38%_52%_44%_48%] shadow-sm ring-1 ring-foreground/8",
          classes.body,
        )}
      >
        <span className="absolute top-[31%] left-[22%] size-[9%] rounded-full bg-foreground/85" />
        <span className="absolute top-[22%] right-[25%] size-[9%] rounded-full bg-foreground/85" />
      </div>
      <div
        className={cn(
          "absolute bottom-[13%] left-1/2 h-[28%] w-[35%] -translate-x-1/2 rounded-[46%_46%_38%_38%]",
          classes.body,
        )}
      />
      <span className="absolute inset-x-[18%] bottom-[9%] h-px bg-foreground/10" />
    </div>
  )
}
