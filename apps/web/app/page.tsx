import { Suspense } from "react"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { SpritePortrait } from "@/components/sprite-portrait"
import { getCollection, getSharing, getViewer } from "@/lib/api"
import { latestSeasonItems } from "@/lib/catalog-season"
import { completionPercent, presentSprite } from "@/lib/catalog-presentation"

async function DashboardContent() {
  const [collection, sharing] = await Promise.all([
    getCollection(),
    getSharing(),
  ])
  const currentSeason = latestSeasonItems(collection.items)
  const currentSeasonName = currentSeason.find((item) => item.season)?.season
  const missingSprites = currentSeason
    .filter((sprite) => !sprite.owned)
    .map(presentSprite)
  const availableCount = missingSprites.filter(
    (sprite) => sprite.helpers.length > 0,
  ).length
  const acceptedFriends = sharing.friends.filter(
    (friend) => friend.status === "accepted",
  )

  return (
    <>
      <section aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="sr-only">
          Collection progress
        </h2>
        <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
          <div className="flex flex-col gap-1 py-5 pr-4">
            <dt className="truncate text-base text-muted-foreground sm:text-sm">
              Collected
            </dt>
            <dd className="tabular-nums text-3xl font-semibold tracking-tight">
              {collection.progress.owned}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-l border-border py-5 pl-4 sm:px-6">
            <dt className="truncate text-base text-muted-foreground sm:text-sm">
              Completion
            </dt>
            <dd className="tabular-nums text-3xl font-semibold tracking-tight">
              {completionPercent(
                collection.progress.owned,
                collection.progress.total,
              )}
              %
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-border py-5 pr-4 sm:border-t-0 sm:border-l sm:px-6">
            <dt className="truncate text-base text-muted-foreground sm:text-sm">
              Sharing friends
            </dt>
            <dd className="tabular-nums text-3xl font-semibold tracking-tight">
              {acceptedFriends.length}
            </dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-l border-border py-5 pl-4 sm:border-t-0 sm:pl-6">
            <dt className="truncate text-base text-muted-foreground sm:text-sm">
              Mastered
            </dt>
            <dd className="tabular-nums text-3xl font-semibold tracking-tight">
              {collection.progress.mastered}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="reach-heading"
        className="grid overflow-hidden rounded-xl bg-sidebar text-sidebar-foreground ring-1 ring-sidebar-border lg:grid-cols-[7fr_5fr]"
      >
        <div className="flex flex-col justify-between gap-8 p-5 sm:p-8">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">
              Best next move
            </Badge>
            <div>
              <h2
                id="reach-heading"
                className="max-w-[18ch] text-balance text-3xl font-semibold tracking-tight sm:text-4xl"
              >
                {`${availableCount} current-season gaps within reach.`}
              </h2>
              <p className="max-w-[54ch] text-pretty text-base text-sidebar-foreground/65 sm:text-sm">
                {`You are missing ${missingSprites.length} ${currentSeasonName ?? "current-season"} Sprites. Sharing friends have captured ${availableCount} of them. ${missingSprites.length - availableCount} have no current friend coverage.`}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" asChild className="w-fit">
              <Link href="/matches">Find friends who can help</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-sidebar-border p-px sm:grid-cols-4 lg:grid-cols-2">
          {missingSprites.length === 0 ? (
            <p className="col-span-full flex items-center justify-center p-8 text-center text-sidebar-foreground/65">
              {currentSeason.length === 0
                ? "The current-season Sprite catalog is not available yet."
                : "Every current-season Sprite is in your locker. Keep hunting for mastery."}
            </p>
          ) : null}
          {missingSprites.slice(0, 4).map((sprite) => (
            <div
              key={sprite.id}
              className="flex min-w-0 flex-col gap-3 bg-sidebar p-4"
            >
              <SpritePortrait
                tone={sprite.tone}
                variant={sprite.variant}
                label={`${sprite.variant} ${sprite.baseName}`}
                src={sprite.imagePath ?? undefined}
              />
              <div className="min-w-0">
                <p className="truncate text-base font-medium sm:text-sm">
                  {sprite.variant} {sprite.baseName}
                </p>
                <p className="truncate text-base text-sidebar-foreground/55 sm:text-sm">
                  Missing from your locker
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[7fr_5fr]">
        <section aria-labelledby="nearby-heading" className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2
                id="nearby-heading"
                className="text-balance text-2xl font-semibold tracking-tight"
              >
                Next collection gaps
              </h2>
              <p className="text-pretty text-base text-muted-foreground sm:text-sm">
                Missing Sprites from your saved collection.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/collection">View all</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {missingSprites.length === 0 ? (
              <p className="col-span-full rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                {collection.progress.total === 0
                  ? "Released Sprites will appear when the catalog is available."
                  : "No collection gaps. You have captured every released Sprite."}
              </p>
            ) : null}
            {missingSprites.slice(0, 4).map((sprite) => (
              <Link
                key={sprite.id}
                href="/collection"
                className="group grid min-w-0 grid-cols-[5rem_1fr] gap-4 rounded-xl border border-border bg-card p-3 outline-none hover:bg-accent/45 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <SpritePortrait
                  tone={sprite.tone}
                  variant={sprite.variant}
                  label={`${sprite.variant} ${sprite.baseName}`}
                  src={sprite.imagePath ?? undefined}
                  className="aspect-square"
                />
                <span className="flex min-w-0 flex-col justify-center gap-1">
                  <span className="truncate text-base font-medium sm:text-sm">
                    {sprite.variant} {sprite.baseName}
                  </span>
                  <span className="text-base text-muted-foreground sm:text-sm">
                    {sprite.rarity}
                  </span>
                  <span className="flex items-center gap-1.5 text-base sm:text-sm">
                    <CheckIcon className="size-4 shrink-0 stroke-primary" />
                    {sprite.helpers.length > 0
                      ? `${sprite.helpers.length} friends can help`
                      : "No sharing friend has it yet"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="squad-heading">
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
            {acceptedFriends.slice(0, 4).map((friend) => (
              <div key={friend.profile.id} className="border-b border-border last:border-b-0">
                <div className="flex min-w-0 items-center gap-3 py-3">
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
                  <Badge variant="outline" className="tabular-nums">
                    Sharing
                  </Badge>
                </div>
              </div>
            ))}
            {acceptedFriends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No friends have accepted collection sharing yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-10 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
              Collection command
            </p>
            <h1 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Good hunting,{" "}
              <Suspense fallback="hunter">
                <GreetingName />
              </Suspense>
              .
            </h1>
            <p className="max-w-[62ch] text-pretty text-base text-muted-foreground sm:text-sm">
              <Suspense fallback="Your collection and friend network.">
                <FriendStatus />
              </Suspense>
            </p>
          </div>
          <Button asChild>
            <Link href="/friends">
              View friends
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <Suspense fallback={<ContentLoading />}>
          <DashboardContent />
        </Suspense>
      </div>
    </AuthenticatedAppShell>
  )
}

async function GreetingName() {
  const viewer = await getViewer()
  return viewer.displayName.split(/\s+/)[0] ?? viewer.displayName
}

async function FriendStatus() {
  const friends = await getSharing().catch(() => null)
  return friends
    ? `${friends.friends.filter((friend) => friend.status === "accepted").length} friend connections are sharing collections with you.`
    : "Your collection and friend network."
}
