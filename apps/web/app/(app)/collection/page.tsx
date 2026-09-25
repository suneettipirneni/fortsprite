import { Suspense } from "react"
import { ContentLoading } from "@/components/content-loading"
import type { Metadata } from "next"

import { CollectionExplorer } from "@/components/collection-explorer"
import { getCollection } from "@/lib/api"

export const metadata: Metadata = { title: "My collection" }

export default function CollectionPage() {
  return (
    <div className="app-page grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
      <div>
        <h1
          id="collection-heading"
          data-testid="collection-shell"
          className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          Sprite locker
        </h1>
        <p className="mt-2 max-w-[56ch] text-pretty text-base text-foreground/65 sm:text-sm">
          Track captures and mastery. Open a Sprite for details.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="border-t border-white/10 pt-6 sm:col-span-2 sm:pt-8">
            <ContentLoading label="Loading collection…" />
          </div>
        }
      >
        <CollectionContent />
      </Suspense>
    </div>
  )
}

async function CollectionContent() {
  const collection = await getCollection()
  return <CollectionExplorer initialCollection={collection} />
}
