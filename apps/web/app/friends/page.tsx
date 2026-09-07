import type { Metadata } from "next"
import { Suspense } from "react"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { FriendsManager } from "@/components/friends-manager"
import { getSharing } from "@/lib/api"

export const metadata: Metadata = { title: "Friends" }

export default function FriendsPage() {
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <div>
          <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            Friends
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Collect with your squad.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Connect with your Epic friends on FortSprite. Once you both accept
            sharing, compare your collections and see which captured Sprites can
            help each other.
          </p>
        </div>
        <Suspense fallback={<ContentLoading />}>
          <FriendsContent />
        </Suspense>
      </div>
    </AuthenticatedAppShell>
  )
}

async function FriendsContent() {
  const snapshot = await getSharing().catch(() => null)
  return <FriendsManager snapshot={snapshot} />
}
