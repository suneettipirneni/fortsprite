import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { CatalogResults } from "@/components/catalog-results"
import {
  MatchesResultsSkeleton,
  PageValueSkeleton,
} from "@/components/page-data-skeletons"
import { PageHeader } from "@/components/page-header"
import { getCollection } from "@/lib/api"
import { latestSeasonItems } from "@/lib/catalog-season"

export const metadata: Metadata = { title: "Friends can help" }

const metrics = [
  ["missing", "Missing"],
  ["available", "Friends can help"],
  ["unavailable", "No friend has it yet"],
] as const

type MatchMetric = (typeof metrics)[number][0]

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
      <dl className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {metrics.map(([metric, label]) => (
          <div key={metric} className="min-w-0 py-5 sm:px-6 sm:first:pl-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              <Suspense fallback={<PageValueSkeleton label={`Loading ${label.toLowerCase()} count`} />}>
                <MatchCount metric={metric} />
              </Suspense>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-base text-muted-foreground sm:text-sm">
        Only <Suspense fallback="latest-season"><SeasonName /></Suspense> Sprites are eligible. Ownership
        is self-reported and does not guarantee availability in Fortnite.
      </p>
      <Suspense fallback={<MatchesResultsSkeleton />}>
        <MatchResults />
      </Suspense>
    </div>
  )
}

async function MatchCount({ metric }: { metric: MatchMetric }) {
  const collection = await getCollection()
  const missing = latestSeasonItems(collection.items).filter((item) => !item.owned)
  if (metric === "missing") return missing.length
  const available = missing.filter((item) => item.helpers.length > 0).length
  return metric === "available" ? available : missing.length - available
}

async function SeasonName() {
  const collection = await getCollection()
  return (
    latestSeasonItems(collection.items).find((item) => item.season)?.season ??
    "latest-season"
  )
}

async function MatchResults() {
  const collection = await getCollection()
  const currentSeason = latestSeasonItems(collection.items)
  const currentSeasonName = currentSeason.find((item) => item.season)?.season
  const missing = currentSeason.filter((item) => !item.owned)
  return (
    <CatalogResults
      items={missing}
      title={currentSeasonName ? `${currentSeasonName} missing Sprites` : "Latest-season missing Sprites"}
      description="Filter current-season collection gaps by name, rarity, variant, or friend availability."
      showAvailability
      availabilityKnown
      emptyMessage={currentSeason.length === 0
        ? "The current-season catalog is not available yet."
        : "You have captured every current-season Sprite."}
    />
  )
}
