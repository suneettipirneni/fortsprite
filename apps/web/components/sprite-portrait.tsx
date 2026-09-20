import Image from "next/image"

import { cn } from "@workspace/ui/lib/utils"

import { variantStyle } from "@/lib/variant-style"

type SpritePortraitProps = {
  variant: string
  label: string
  src?: string
  sizes?: string
  className?: string
}

export function SpritePortrait({
  variant,
  label,
  src,
  sizes = "(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 14rem",
  className,
}: SpritePortraitProps) {
  const classes = variantStyle(variant)

  if (src) {
    return (
      <div
        className={cn(
          "relative isolate aspect-[5/4] overflow-hidden rounded-[min(1.2vw,1rem)]",
          className,
        )}
        style={classes.frame}
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
        className,
      )}
      style={classes.frame}
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
