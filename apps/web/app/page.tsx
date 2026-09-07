import { Suspense } from "react"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { SpritePortrait } from "@/components/sprite-portrait"
import { getCollection, getEpicFriends, getViewer } from "@/lib/api"
import { completionPercent, presentSprite } from "@/lib/catalog-presentation"

async function DashboardContent() {
  const [collection, friendsResult] = await Promise.all([
    getCollection(),
    getEpicFriends().then(
      (data) => ({ data, error: false }),
      () => ({ data: null, error: true }),
    ),
  ])
  const missingSprites = collection.items
    .filter((sprite) => !sprite.owned)
    .map(presentSprite)
  const availabilityReady = collection.friendAvailability.status === "ready"
  const availableCount = missingSprites.filter(
    (sprite) => sprite.helpers.length > 0,
  ).length
  const epicFriends = friendsResult.data?.friends ?? []

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
              Epic friends
            </dt>
            <dd className="tabular-nums text-3xl font-semibold tracking-tight">
              {friendsResult.error ? (
                <span className="text-base font-normal">Unavailable</span>
              ) : (
                epicFriends.length
              )}
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
                {availabilityReady
                  ? `${availableCount} collection gaps within reach.`
                  : "Keep your Sprite collection up to date."}
              </h2>
              <p className="max-w-[54ch] text-pretty text-base text-sidebar-foreground/65 sm:text-sm">
                {availabilityReady
                  ? `You are missing ${missingSprites.length} released Sprites. Sharing friends have captured ${availableCount} of them. ${missingSprites.length - availableCount} have no current friend coverage.`
                  : "Friend availability could not be refreshed. Your captured and mastered Sprites remain saved."}
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
              {collection.progress.total === 0
                ? "The Sprite catalog is not available yet."
                : "Every released Sprite is in your locker. Keep hunting for mastery."}
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
                    {availabilityReady
                      ? sprite.helpers.length > 0
                        ? `${sprite.helpers.length} friends can help`
                        : "No sharing friend has it yet"
                      : "Friend availability unavailable"}
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
              Epic squad
            </h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-sm">
              Read directly from your consented Epic friends list.
            </p>
          </div>
          <div className="mt-5 flex flex-col">
            {epicFriends.slice(0, 4).map((friend, index) => (
              <div key={`${friend.displayName}-${index}`}>
                {index > 0 ? <Separator /> : null}
                <div className="flex min-w-0 items-center gap-3 py-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback>{friend.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium sm:text-sm">
                      {friend.displayName}
                    </p>
                    <p className="truncate text-base text-muted-foreground sm:text-sm">
                      {friend.nickname ?? "Epic Games friend"}
                    </p>
                  </div>
                  <Badge variant="outline" className="tabular-nums">
                    Epic
                  </Badge>
                </div>
              </div>
            ))}
            {epicFriends.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                {friendsResult.error
                  ? "Epic friends could not be refreshed right now."
                  : "No friends have granted the Epic profile consent required to appear here yet."}
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
              View Epic friends
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
  const friends = await getEpicFriends().catch(() => null)
  return friends
    ? `${friends.friends.length} Epic friend${friends.friends.length === 1 ? " is" : "s are"} visible to FortSprite.`
    : "Your Epic identity is connected; friend data is temporarily unavailable."
}
