import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { RefreshDataButton } from "@/components/refresh-data-button"
import { CatalogResults } from "@/components/catalog-results"
import { getCollection } from "@/lib/api"

export const metadata: Metadata = { title: "Friends can help" }

export default function MatchesPage() {
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
              Friends can help
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your next capture.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              See which missing Sprites your sharing friends have captured. Each
              Sprite appears once, with all eligible friends underneath.
            </p>
          </div>
          <Button asChild className="min-h-11">
            <Link href="/friends">Manage friends</Link>
          </Button>
        </div>
        <Suspense fallback={<ContentLoading />}>
          <MatchResults />
        </Suspense>
      </div>
    </AuthenticatedAppShell>
  )
}

async function MatchResults() {
  const collection = await getCollection()
  const missing = collection.items.filter((item) => !item.owned)
  const available = missing.filter((item) => item.helpers.length > 0).length
  const ready = collection.friendAvailability.status === "ready"
  return (
    <>
      <dl className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ["Missing", missing.length],
          ["Friends can help", ready ? available : "Unavailable"],
          [
            "No friend has it yet",
            ready ? missing.length - available : "Unavailable",
          ],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 px-4 py-5 first:pl-0">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {!ready ? (
        <div role="alert" className="rounded-xl border border-border p-5">
          <p className="font-medium">
            Friend availability could not be refreshed.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your saved collection is still available. Refresh this page to check
            your sharing friends again.
          </p>
          <div className="mt-3">
            <RefreshDataButton />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {collection.friendAvailability.refreshedAt
            ? `Friend availability checked ${new Date(collection.friendAvailability.refreshedAt).toLocaleString("en-US", { timeZone: "UTC" })}.`
            : "Friend availability is up to date."}{" "}
          Ownership is self-reported and does not guarantee availability in
          Fortnite.
        </p>
      )}
      <CatalogResults
        items={missing}
        title="Missing Sprites"
        description="Filter your collection gaps by name, rarity, variant, or friend availability."
        showAvailability
        availabilityKnown={ready}
        emptyMessage={
          collection.progress.total === 0
            ? "The released catalog is not available yet."
            : "You have captured every released Sprite. Your locker is complete."
        }
      />
    </>
  )
}
