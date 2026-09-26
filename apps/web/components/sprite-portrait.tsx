"use client"

import Image, { type StaticImageData } from "next/image"
import { useState } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { spriteArtwork } from "@/lib/generated/sprite-artwork"
import { variantStyle } from "@/lib/variant-style"

type SpritePortraitProps = {
  variant: string
  label: string
  src?: string
  sizes?: string
  className?: string
}

function SpriteArtwork({
  src,
  alt,
  sizes,
}: {
  src: string | StaticImageData
  alt: string
  sizes: string
}) {
  const [loaded, setLoaded] = useState(false)
  const preview = typeof src === "string" ? undefined : src.blurDataURL

  return (
    <>
      {preview && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-2 bg-contain bg-center bg-no-repeat blur-sm transition-opacity duration-200 motion-reduce:transition-none",
            loaded ? "opacity-0" : "opacity-100",
          )}
          style={{ backgroundImage: `url("${preview}")` }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        loading="lazy"
        sizes={sizes}
        className={cn(
          "object-contain p-2 transition-opacity duration-200 motion-reduce:transition-none",
          preview && !loaded ? "opacity-0" : "opacity-100",
        )}
        onLoad={(event) => {
          if (event.currentTarget.naturalWidth > 0) setLoaded(true)
        }}
      />
    </>
  )
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
        <SpriteArtwork
          key={src}
          src={spriteArtwork[src] ?? src}
          alt={`${label} Sprite`}
          sizes={sizes}
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
