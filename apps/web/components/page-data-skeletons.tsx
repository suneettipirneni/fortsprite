import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { PageHeader } from "@/components/page-header"

export function PageValueSkeleton({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block h-[1em] w-12 animate-pulse rounded bg-muted align-middle motion-reduce:animate-none", className)} />
  )
}

export function DashboardCardsSkeleton({
  label = "Loading collection gaps",
  className,
}: {
  label?: string
  className?: string
} = {}) {
  return (
    <div role="status" aria-label={label} className={cn("col-span-full grid gap-3 sm:grid-cols-2", className)}>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} aria-hidden="true" className="grid grid-cols-[5rem_1fr] gap-4 rounded-xl bg-card/72 p-3 ring-1 ring-white/10">
          <div className="size-20 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          <div className="flex flex-col justify-center gap-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SquadRowsSkeleton() {
  return (
    <div role="status" aria-label="Loading sharing friends">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MatchesResultsSkeleton() {
  return (
    <section aria-label="Loading missing Sprites" aria-busy="true" className="@container flex min-w-0 flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Latest-season missing Sprites</h2>
        <p className="mt-2 text-pretty text-base text-muted-foreground sm:text-sm">Filter current-season collection gaps by name, rarity, variant, or friend availability.</p>
      </div>
      <div className="space-y-2">
        <Input disabled aria-label="Search missing Sprites" placeholder="Search name or variant" />
        <div className="grid grid-cols-1 gap-2 @min-[28rem]:grid-cols-2">
          <Button disabled variant="outline" className="justify-start">All rarities</Button>
          <Button disabled variant="outline" className="justify-start">All variants</Button>
        </div>
        <Button disabled variant="outline" className="w-full justify-start">All missing Sprites</Button>
      </div>
      <PageValueSkeleton label="Loading matching Sprite count" className="h-5 w-44" />
      <DashboardCardsSkeleton />
    </section>
  )
}

export function FriendsPageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-xl bg-card/60 p-4 ring-1 ring-white/10 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input disabled aria-label="FortSprite username" placeholder="Exact FortSprite username" />
        <Button disabled>Send request</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input disabled aria-label="Search friends" placeholder="Search friends" />
        <Button disabled variant="outline">Refresh friends</Button>
      </div>
      <section>
        <h2 className="text-xl font-semibold">FortSprite friends</h2>
        <SquadRowsSkeleton />
      </section>
      <p className="border-t border-border pt-5 text-sm text-muted-foreground">Friend requests and blocks apply only inside FortSprite.</p>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {["FortSprite display name", "FortSprite username", "Fortnite display name (optional)"].map((label, index) => (
          <div key={label} className={cn("flex flex-col gap-3", index === 2 && "sm:col-span-2")}>
            <span className="text-sm font-medium">{label}</span>
            <PageValueSkeleton label={`Loading ${label}`} className="h-9 w-full" />
            <div aria-hidden="true" className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
      <Button disabled size="lg" className="sm:self-start">Save profile</Button>
    </div>
  )
}

export function CredentialsSkeleton() {
  return (
    <section aria-busy="true" className="space-y-5 border-t border-border pt-6">
      <div>
        <h2 className="text-xl font-semibold">Passkeys</h2>
        <p className="mt-1 text-sm text-muted-foreground">FortSprite uses passkeys only. Add a second passkey on another device or password manager so you can still sign in if one is lost.</p>
      </div>
      <PageValueSkeleton label="Loading passkeys" className="h-20 w-full rounded-xl" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input disabled aria-label="Passkey name" placeholder="Passkey name, optional" />
        <Button disabled>Add passkey</Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">FortSprite cannot recover your account if every passkey is lost. The final passkey can only be removed by deleting the account.</p>
    </section>
  )
}

export function AccountDeletionSkeleton() {
  return (
    <section aria-busy="true" className="space-y-3 border-t border-border pt-6">
      <h2 className="text-xl font-semibold">Delete your FortSprite account</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Permanently delete your FortSprite profile, collection, sharing
        relationships, passkeys, and sessions. Your Fortnite account remains
        unchanged.
      </p>
      <Button disabled variant="destructive" className="min-h-11">Delete FortSprite account</Button>
    </section>
  )
}

export function ComparisonPageSkeleton() {
  return (
    <div className="app-page flex flex-col gap-8">
      <PageHeader
        eyebrow="Compare collections"
        title="Compare your collections."
        description="Current-season captured Sprites can help friends regardless of mastery. Coordinate together in Fortnite."
        action={
          <Button asChild variant="outline">
            <Link href="/friends" transitionTypes={["page-navigation"]}>
              Back to friends
            </Link>
          </Button>
        }
      />
      <PageValueSkeleton label="Loading comparison details" className="h-5 w-56" />
      <div className="app-columns">
        {([
          ["Sprites for you", "Sprites you are missing that your friend has captured."],
          ["Sprites for your friend", "Sprites your friend is missing that you have captured."],
        ] as const).map(([title, description]) => (
          <section key={title} aria-label={title} aria-busy="true" className="@container flex min-w-0 flex-col gap-5 lg:col-span-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-pretty text-base text-muted-foreground sm:text-sm">{description}</p>
            </div>
            <div className="space-y-2">
              <Input disabled aria-label={`Search ${title}`} placeholder="Search name or variant" />
              <div className="grid grid-cols-1 gap-2 @min-[28rem]:grid-cols-2">
                <Button disabled variant="outline" className="justify-start">All rarities</Button>
                <Button disabled variant="outline" className="justify-start">All variants</Button>
              </div>
            </div>
            <PageValueSkeleton label={`Loading ${title.toLowerCase()} count`} className="h-5 w-44" />
            <DashboardCardsSkeleton label={`Loading ${title.toLowerCase()}`} className="sm:grid-cols-1 @min-[38rem]:grid-cols-2 @min-[58rem]:grid-cols-3" />
          </section>
        ))}
      </div>
    </div>
  )
}
