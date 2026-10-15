import { FortSpriteIcon } from "@/components/fortsprite-icon"
import { ContentLoading } from "@/components/content-loading"
import { PWA_BACKGROUND } from "@/lib/pwa"

export default function Loading() {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center text-[#a0f9b5]"
      style={{ backgroundColor: PWA_BACKGROUND }}
      aria-label="FortSprite"
    >
      <FortSpriteIcon size={128} />
      <ContentLoading />
    </main>
  )
}
