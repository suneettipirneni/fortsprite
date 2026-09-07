import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { CommandIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

import { EpicSignInButton } from "@/components/epic-sign-in-button"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="isolate grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Link
            href="/"
            aria-label="Homepage"
            className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide"
          >
            <CommandIcon className="size-4 shrink-0 stroke-primary" />
            FORTSPRITE
          </Link>
          <div className="flex flex-col gap-3">
            <Badge variant="secondary" className="w-fit">
              Epic account required
            </Badge>
            <h1 className="text-balance text-3xl font-semibold tracking-tight">
              Keep your squad in sync.
            </h1>
            <p className="text-pretty text-base text-muted-foreground sm:text-sm">
              FortSprite uses Epic Games to establish one trusted identity for
              your collection and friend list.
            </p>
          </div>
          <Suspense fallback={null}>
            <SignInError searchParams={searchParams} />
          </Suspense>
          <EpicSignInButton />
          <p className="text-sm text-muted-foreground">
            Unofficial fan-made tool. Not affiliated with, endorsed by, or
            sponsored by Epic Games.
          </p>
          <div className="grid gap-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
              <p>
                We request Basic Profile and Friends List access as documented
                in our Privacy Policy. Your Epic password is never shared with
                FortSprite.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <LockKeyholeIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
              <p>
                Signing in does not import or verify your Fortnite Sprite
                collection. You control those entries here.
              </p>
            </div>
          </div>
          <p className="text-pretty text-xs leading-5 text-muted-foreground">
            By continuing, you agree to the <Link href="/terms">Terms</Link> and
            acknowledge the <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
      <aside className="hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <p className="font-mono text-sm uppercase tracking-wide text-sidebar-foreground/55">
          Squad intelligence
        </p>
        <div className="flex max-w-xl flex-col gap-5">
          <p className="text-balance text-5xl font-semibold tracking-tight">
            Your next find may already belong to a friend.
          </p>
          <p className="max-w-[48ch] text-pretty text-base text-sidebar-foreground/65">
            Track every variant, find friends with the Sprites you need, and
            spend less time asking the whole group who has what.
          </p>
        </div>
      </aside>
    </main>
  )
}

async function SignInError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return error ? (
    <p role="alert" className="text-sm text-destructive">
      Epic Games sign-in was not completed. Please try again.
    </p>
  ) : null
}
