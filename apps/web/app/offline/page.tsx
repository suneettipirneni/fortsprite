import type { Metadata } from "next"
import Link from "next/link"
import { WifiOffIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { FortSpriteIcon } from "@/components/fortsprite-icon"

export const metadata: Metadata = { title: "Offline" }

export default function OfflinePage() {
  return (
    <main className="locker-stage isolate flex min-h-dvh items-center justify-center px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] text-center">
      <div className="flex max-w-sm flex-col items-center gap-6 rounded-2xl border border-white/15 bg-background/75 p-8 shadow-2xl backdrop-blur-xl">
        <FortSpriteIcon size={72} className="text-[#9cfab5]" />
        <div>
          <WifiOffIcon className="mx-auto mb-3 size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            You’re offline
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            FortSprite needs a connection to safely load your latest collection
            and friend data.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Try again</Link>
        </Button>
      </div>
    </main>
  )
}
