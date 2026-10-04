import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

import {
  DashboardCardsSkeleton,
  PageValueSkeleton,
  SquadRowsSkeleton,
} from "@/components/page-data-skeletons"
import { DashboardStats } from "@/components/dashboard-stats"
import { PageHeader } from "@/components/page-header"
import { SpritePortrait } from "@/components/sprite-portrait"
import { getCollection, getSharing, getViewer } from "@/lib/api"
import { latestSeasonItems } from "@/lib/catalog-season"
import { summarizeDashboardProgress } from "@/lib/dashboard-progress"
import { presentSprite } from "@/lib/catalog-presentation"

function DashboardContent() {
  return (
    <>
      <Suspense fallback={<DashboardStats sharingCount={<SharingMetric />} />}>
        <CollectionStats sharingCount={<SharingMetric />} />
      </Suspense>

      <section
        aria-labelledby="reach-heading"
        className="app-columns items-center rounded-2xl bg-card/80 p-5 text-card-foreground shadow-sm ring-1 ring-white/10 backdrop-blur-sm sm:p-8"
      >
        <div className="min-w-0 space-y-3 lg:col-span-8">
          <h2
            id="reach-heading"
            className="max-w-[30ch] text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            <Suspense fallback={<><PageValueSkeleton label="Loading available gaps" /> current-season gaps within reach.</>}>
              <GapHeadline />
            </Suspense>
          </h2>
          <p className="max-w-[60ch] text-pretty text-base text-sidebar-foreground/65 sm:text-sm">
            <Suspense fallback={<PageValueSkeleton label="Loading gap details" className="h-5 w-full" />}>
              <GapDescription />
            </Suspense>
          </p>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <Button variant="secondary" asChild>
            <Link href="/matches">
              Find friends who can help
            </Link>
          </Button>
        </div>
      </section>

      <div className="app-columns">
        <section aria-labelledby="nearby-heading" className="min-w-0 lg:col-span-8">
          <div className="flex items-end justify-between gap-4">
            <h2
              id="nearby-heading"
              className="text-balance text-2xl font-semibold tracking-tight"
            >
              Next collection gaps
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/collection">
                View all
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Suspense fallback={<DashboardCardsSkeleton />}>
              <GapCards />
            </Suspense>
          </div>
        </section>

        <section aria-labelledby="squad-heading" className="min-w-0 lg:col-span-4">
          <div>
            <h2
              id="squad-heading"
              className="text-balance text-2xl font-semibold tracking-tight"
            >
              FortSprite squad
            </h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-sm">
              Friends who accepted collection sharing with you.
            </p>
          </div>
          <div className="mt-5 flex flex-col">
            <Suspense fallback={<SquadRowsSkeleton />}>
              <SquadRows />
            </Suspense>
          </div>
        </section>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="app-page space-y-8">
      <PageHeader
        eyebrow="Collection command"
        title={
          <>
            Good hunting,{" "}
            <Suspense fallback="hunter">
              <GreetingName />
            </Suspense>
            .
          </>
        }
        action={
          <Button asChild>
            <Link href="/friends">
              View friends
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      <DashboardContent />
    </div>
  )
}

async function GreetingName() {
  const viewer = await getViewer()
  return viewer.displayName.split(/\s+/)[0] ?? viewer.displayName
}

async function CollectionStats({ sharingCount }: { sharingCount: ReactNode }) {
  const { items } = await getCollection()
  return <DashboardStats progress={summarizeDashboardProgress(items)} sharingCount={sharingCount} />
}

function SharingMetric() {
  return <Suspense fallback={<PageValueSkeleton label="Loading sharing friend count" />}>
    <SharingCount />
  </Suspense>
}

async function SharingCount() {
  const sharing = await getSharing()
  return sharing.friends.filter((friend) => friend.status === "accepted").length
}

async function GapHeadline() {
  const collection = await getCollection()
  const available = latestSeasonItems(collection.items).filter(
    (sprite) => !sprite.owned && sprite.helpers.length > 0,
  ).length
  return `${available} current-season ${available === 1 ? "gap" : "gaps"} within reach.`
}

async function GapDescription() {
  const collection = await getCollection()
  const currentSeason = latestSeasonItems(collection.items)
  const season = currentSeason.find((item) => item.season)?.season
  const missing = currentSeason.filter((sprite) => !sprite.owned)
  const unavailable = missing.filter((sprite) => sprite.helpers.length === 0).length
  return `You are missing ${missing.length} ${season ?? "current-season"} Sprites. ${unavailable} have no current friend coverage.`
}

async function GapCards() {
  const collection = await getCollection()
  const currentSeason = latestSeasonItems(collection.items)
  const missingSprites = currentSeason
    .filter((sprite) => !sprite.owned)
    .map(presentSprite)
  return (
    <>
      {missingSprites.length === 0 ? (
        <p className="col-span-full rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          {currentSeason.length === 0
            ? "The current-season Sprite catalog is not available yet."
            : "You have captured every current-season Sprite."}
        </p>
      ) : null}
      {missingSprites.slice(0, 4).map((sprite) => (
        <Link
          key={sprite.id}
          href="/collection"
          className="group grid min-w-0 grid-cols-[5rem_1fr] gap-4 rounded-xl bg-card/72 p-3 shadow-sm ring-1 ring-white/10 outline-none hover:bg-accent/45 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <SpritePortrait
            variant={sprite.variant}
            label={`${sprite.variant} ${sprite.baseName}`}
            src={sprite.imagePath ?? undefined}
            sizes="80px"
            className="aspect-square"
          />
          <span className="flex min-w-0 flex-col justify-center gap-1">
            <span className="truncate text-base font-medium sm:text-sm">
              {sprite.variant} {sprite.baseName}
            </span>
            <span className="text-base text-muted-foreground sm:text-sm">
              {sprite.rarity}
            </span>
            <span className="text-base sm:text-sm">
              {sprite.helpers.length > 0
                ? `${sprite.helpers.length} ${sprite.helpers.length === 1 ? "friend" : "friends"} can help`
                : "No sharing friend has it yet"}
            </span>
          </span>
        </Link>
      ))}
    </>
  )
}

async function SquadRows() {
  const sharing = await getSharing()
  const acceptedFriends = sharing.friends.filter(
    (friend) => friend.status === "accepted",
  )
  return (
    <>
      {acceptedFriends.slice(0, 4).map((friend) => (
        <div
          key={friend.profile.id}
          className="flex min-w-0 items-center gap-3 border-b border-border py-3 last:border-b-0"
        >
          <Avatar className="size-9 shrink-0">
            <AvatarFallback>{friend.profile.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium sm:text-sm">
              {friend.profile.displayName}
            </p>
            <p className="truncate text-base text-muted-foreground sm:text-sm">
              @{friend.profile.handle}
            </p>
          </div>
        </div>
      ))}
      {acceptedFriends.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No friends have accepted collection sharing yet.
        </div>
      ) : null}
    </>
  )
}
