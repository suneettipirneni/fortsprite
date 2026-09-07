import { Suspense } from "react"
import { ContentLoading } from "@/components/content-loading"
import type { Metadata } from "next"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { CollectionExplorer } from "@/components/collection-explorer"
import { getCollection } from "@/lib/api"

export const metadata: Metadata = { title: "My collection" }

export default function CollectionPage() {
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto grid w-full max-w-[100rem] gap-5 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6 lg:p-8">
        <div>
          <h1
            id="collection-heading"
            data-testid="collection-shell"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            Sprite locker
          </h1>
          <p className="mt-2 text-base text-pretty text-foreground/65 sm:text-sm">
            Track captures and mastery. Open a Sprite for details.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="sm:col-span-2">
              <ContentLoading label="Loading collection…" />
            </div>
          }
        >
          <CollectionContent />
        </Suspense>
      </div>
    </AuthenticatedAppShell>
  )
}

async function CollectionContent() {
  const collection = await getCollection()
  return <CollectionExplorer initialCollection={collection} />
}
