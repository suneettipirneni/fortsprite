import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { ComparisonPageSkeleton } from "@/components/page-data-skeletons"
import { RefreshDataButton } from "@/components/refresh-data-button"
import { CatalogResults } from "@/components/catalog-results"
import { PageHeader } from "@/components/page-header"
import { FortSpriteApiError, getComparison } from "@/lib/api"

export const metadata: Metadata = { title: "Compare collections" }

export default function ComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<ComparisonPageSkeleton />}>
      <ComparisonContent params={params} />
    </Suspense>
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
      <div className="app-page">
        <PageHeader
          eyebrow="Compare collections"
          title={
            denied
              ? "This collection is not shared with you"
              : "Comparison temporarily unavailable"
          }
          description={
            denied
              ? "Both friends must accept FortSprite sharing. Review your sharing settings to continue."
              : "We could not refresh this comparison. Please try again."
          }
          action={
            <>
              <Button asChild>
                <Link href="/friends">
                  Back to friends
                </Link>
              </Button>
              {!denied ? <RefreshDataButton /> : null}
            </>
          }
        />
      </div>
    )
  }
  const comparison = result.data
  return (
    <div className="app-page flex flex-col gap-8">
      <PageHeader
        eyebrow="Compare collections"
        title={<>You and {comparison.friend.displayName}</>}
        description="Current-season captured Sprites can help friends regardless of mastery. Coordinate together in Fortnite."
        action={
          <Button asChild variant="outline">
            <Link href="/friends">
              Back to friends
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {comparison.friend.fortniteDisplayName ? (
          <p className="break-words">
            Fortnite name (user-provided) ·{" "}
            {comparison.friend.fortniteDisplayName}
          </p>
        ) : null}
        <p>
          Refreshed{" "}
          <time dateTime={comparison.refreshedAt}>
            {new Date(comparison.refreshedAt).toLocaleString("en-US", {
              timeZone: "UTC",
            })}
          </time>
          .
        </p>
      </div>
      <div className="app-columns">
        <div className="min-w-0 lg:col-span-6">
          <CatalogResults
            items={comparison.forYou}
            title="Sprites for you"
            description={`Sprites you are missing that ${comparison.friend.displayName} has captured.`}
            emptyMessage="Your friend has no captured Sprites that you are missing right now."
          />
        </div>
        <div className="min-w-0 lg:col-span-6">
          <CatalogResults
            items={comparison.forFriend}
            title="Sprites for your friend"
            description={`Sprites ${comparison.friend.displayName} is missing that you have captured.`}
            emptyMessage="You have no captured Sprites that your friend is missing right now."
          />
        </div>
      </div>
    </div>
  )
}
