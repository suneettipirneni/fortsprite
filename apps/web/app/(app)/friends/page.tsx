import type { Metadata } from "next"
import { Suspense } from "react"

import { ContentLoading } from "@/components/content-loading"
import { FriendsManager } from "@/components/friends-manager"
import { getSharing } from "@/lib/api"

export const metadata: Metadata = { title: "Friends" }

export default function FriendsPage() {
  return (
    <div className="app-page">
        <div className="flex max-w-5xl flex-col gap-8">
          <div className="border-b border-white/10 pb-6 sm:pb-8">
            <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
              Friends
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Collect with your squad.
            </h1>
            <p className="mt-2 max-w-[62ch] text-pretty text-base text-muted-foreground sm:text-sm">
              Find friends by their exact FortSprite username. Once you both accept
              sharing, compare collections and see which captured Sprites can help
              each other.
            </p>
        </div>
        <Suspense fallback={<ContentLoading />}>
          <FriendsContent />
        </Suspense>
      </div>
    </div>
  )
}

async function FriendsContent() {
  const snapshot = await getSharing().catch(() => null)
  return <FriendsManager snapshot={snapshot} />
}
