import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { ContentLoading } from "@/components/content-loading"
import { CatalogResults } from "@/components/catalog-results"
import { getCollection } from "@/lib/api"
import { latestSeasonItems } from "@/lib/catalog-season"

export const metadata: Metadata = { title: "Friends can help" }

export default function MatchesPage() {
  return (
    <div className="app-page flex flex-col gap-8">
      <div className="flex max-w-6xl flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:pb-8">
        <div>
          <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            Friends can help
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Find your next capture.
          </h1>
          <p className="mt-2 max-w-[62ch] text-pretty text-base text-muted-foreground sm:text-sm">
            See which missing Sprites your sharing friends have captured. Each
            Sprite appears once, with all eligible friends underneath.
          </p>
        </div>
        <Button asChild className="min-h-11">
          <Link href="/friends" transitionTypes={["page-navigation"]}>
            Manage friends
          </Link>
        </Button>
      </div>
      <Suspense fallback={<ContentLoading />}>
        <MatchResults />
      </Suspense>
    </div>
  )
}

async function MatchResults() {
  const collection = await getCollection()
  const currentSeason = latestSeasonItems(collection.items)
  const currentSeasonName = currentSeason.find((item) => item.season)?.season
  const missing = currentSeason.filter((item) => !item.owned)
  const available = missing.filter((item) => item.helpers.length > 0).length
  return (
    <div className="flex max-w-6xl flex-col gap-8">
      <dl className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ["Missing", missing.length],
          ["Friends can help", available],
          ["No friend has it yet", missing.length - available],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 px-4 py-5 first:pl-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-base text-muted-foreground sm:text-sm">
        Only {currentSeasonName ?? "latest-season"} Sprites are eligible. Ownership
        is self-reported and does not guarantee availability in Fortnite.
      </p>
      <CatalogResults
        items={missing}
        title={
          currentSeasonName
            ? `${currentSeasonName} missing Sprites`
            : "Latest-season missing Sprites"
        }
        description="Filter current-season collection gaps by name, rarity, variant, or friend availability."
        showAvailability
        availabilityKnown
        emptyMessage={
          currentSeason.length === 0
            ? "The current-season catalog is not available yet."
            : "You have captured every current-season Sprite."
        }
      />
    </div>
  )
}
