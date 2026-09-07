import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { RefreshDataButton } from "@/components/refresh-data-button"
import { CatalogResults } from "@/components/catalog-results"
import { FortSpriteApiError, getComparison } from "@/lib/api"

export const metadata: Metadata = { title: "Compare collections" }

export default function ComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <AuthenticatedAppShell>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
            <ContentLoading />
          </div>
        }
      >
        <ComparisonContent params={params} />
      </Suspense>
    </AuthenticatedAppShell>
  )
}

async function ComparisonContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getComparison(id).then(
    (data) => ({ data, error: null }),
    (error: unknown) => ({ data: null, error }),
  )
  if (!result.data) {
    const denied =
      result.error instanceof FortSpriteApiError &&
      [403, 404].includes(result.error.status)
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-semibold">
          {denied
            ? "This collection is not shared with you"
            : "Comparison temporarily unavailable"}
        </h1>
        <p className="text-muted-foreground">
          {denied
            ? "Both friends must accept FortSprite sharing and remain Epic friends. Review your sharing settings to continue."
            : "We could not refresh this comparison. Please try again."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="min-h-11">
            <Link href="/friends">Back to friends</Link>
          </Button>
          {!denied ? <RefreshDataButton /> : null}
        </div>
      </div>
    )
  }
  const comparison = result.data
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <Button asChild variant="ghost" className="mb-3 min-h-11">
          <Link href="/friends">Back to friends</Link>
        </Button>
        <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
          Compare collections
        </p>
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">
          You and {comparison.friend.displayName}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Captured Sprites can help friends regardless of mastery. Coordinate
          together in Fortnite.
        </p>
        {comparison.friend.fortniteDisplayName ? (
          <p className="mt-2 break-words text-sm">
            Fortnite name (user-provided) ·{" "}
            {comparison.friend.fortniteDisplayName}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Refreshed{" "}
          <time dateTime={comparison.refreshedAt}>
            {new Date(comparison.refreshedAt).toLocaleString("en-US", {
              timeZone: "UTC",
            })}
          </time>
          .
        </p>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <CatalogResults
          items={comparison.forYou}
          title="Sprites for you"
          description={`Sprites you are missing that ${comparison.friend.displayName} has captured.`}
          emptyMessage="Your friend has no captured Sprites that you are missing right now."
        />
        <CatalogResults
          items={comparison.forFriend}
          title="Sprites for your friend"
          description={`Sprites ${comparison.friend.displayName} is missing that you have captured.`}
          emptyMessage="You have no captured Sprites that your friend is missing right now."
        />
      </div>
    </div>
  )
}
