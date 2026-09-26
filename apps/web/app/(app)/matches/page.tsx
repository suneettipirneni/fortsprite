import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { ContentLoading } from "@/components/content-loading"
import { CatalogResults } from "@/components/catalog-results"
import { PageHeader } from "@/components/page-header"
import { getCollection } from "@/lib/api"
import { latestSeasonItems } from "@/lib/catalog-season"

export const metadata: Metadata = { title: "Friends can help" }

export default function MatchesPage() {
  return (
    <div className="app-page flex flex-col gap-8">
      <PageHeader
        eyebrow="Friends can help"
        title="Find your next capture."
        description="See which missing Sprites your sharing friends have captured."
        action={
          <Button asChild>
            <Link href="/friends" transitionTypes={["page-navigation"]}>
              Manage friends
            </Link>
          </Button>
        }
      />
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
    <div className="flex min-w-0 flex-col gap-8">
      <dl className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ["Missing", missing.length],
          ["Friends can help", available],
          ["No friend has it yet", missing.length - available],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 py-5 sm:px-6 sm:first:pl-0">
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
