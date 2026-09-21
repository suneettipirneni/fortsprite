import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { SignInOptions } from "@/components/sign-in-options"
import { FortSpriteIcon } from "@/components/fortsprite-icon"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <main className="locker-stage isolate grid min-h-dvh lg:grid-cols-2">
      <section className="auth-safe-area flex items-center justify-center bg-background/28 px-6 backdrop-blur-sm sm:p-10">
        <div className="flex w-full max-w-xs flex-col gap-7">
          <Link
            href="/"
            aria-label="Homepage"
            className="flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <FortSpriteIcon size={36} className="shrink-0 text-[#9cfab5]" />
            FortSprite
          </Link>
          <h1 className="text-balance text-3xl font-semibold tracking-tight">
            Keep your squad in sync.
          </h1>
          <Suspense fallback={null}>
            <SignInError searchParams={searchParams} />
          </Suspense>
          <SignInOptions />
          <p className="text-sm text-muted-foreground">
            Unofficial fan-made tool. Not affiliated with, endorsed by, or
            sponsored by Epic Games.
          </p>
          <p className="text-pretty text-sm text-muted-foreground">
            By continuing, you agree to the <Link href="/terms">Terms</Link> and
            acknowledge the <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </section>
      <aside className="relative hidden border-l border-white/8 bg-sidebar/38 p-12 text-sidebar-foreground backdrop-blur-sm lg:flex lg:items-center">
        <p className="absolute top-12 left-12 font-mono text-sm uppercase tracking-wide text-sidebar-foreground/55">
          Squad intelligence
        </p>
        <div className="flex max-w-lg flex-col gap-6">
          <FortSpriteIcon size={96} className="text-[#9cfab5]" />
          <p className="max-w-[18ch] text-balance text-5xl font-semibold tracking-tight">
            Your next find may already belong to a friend.
          </p>
          <p className="max-w-[48ch] text-pretty text-base text-sidebar-foreground/68">
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
      Sign-in was not completed. Please try again.
    </p>
  ) : null
}
