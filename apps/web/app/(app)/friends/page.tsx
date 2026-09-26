import type { Metadata } from "next"
import { Suspense } from "react"

import { FriendsPageSkeleton } from "@/components/page-data-skeletons"
import { FriendsManager } from "@/components/friends-manager"
import { PageHeader } from "@/components/page-header"
import { getSharing } from "@/lib/api"

export const metadata: Metadata = { title: "Friends" }

export default function FriendsPage() {
  return (
    <div className="app-page space-y-8">
      <PageHeader
        eyebrow="Friends"
        title="Collect with your squad."
        description="Find friends by their exact FortSprite username. Accept sharing to compare collections and find captures for each other."
      />
      <div className="app-columns">
        <div className="min-w-0 lg:col-span-9">
          <Suspense fallback={<FriendsPageSkeleton />}>
            <FriendsContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

async function FriendsContent() {
  const snapshot = await getSharing().catch(() => null)
  return <FriendsManager snapshot={snapshot} />
}
