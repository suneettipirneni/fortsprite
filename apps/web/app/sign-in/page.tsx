import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { LockKeyholeIcon, ShieldCheckIcon } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"

import { SignInOptions } from "@/components/sign-in-options"
import { FortSpriteIcon } from "@/components/fortsprite-icon"

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
            <FortSpriteIcon size={40} className="shrink-0 text-[#9cfab5]" />
            FORTSPRITE
          </Link>
          <div className="flex flex-col gap-3">
            <Badge variant="secondary" className="w-fit">
              Passkeys only
            </Badge>
            <h1 className="text-balance text-3xl font-semibold tracking-tight">
              Keep your squad in sync.
            </h1>
            <p className="text-pretty text-base text-muted-foreground sm:text-sm">
              Choose a username and create a passkey, or sign in with one you
              already have. There are no passwords or social-provider accounts
              to connect.
            </p>
          </div>
          <Suspense fallback={null}>
            <SignInError searchParams={searchParams} />
          </Suspense>
          <SignInOptions />
          <p className="text-sm text-muted-foreground">
            Unofficial fan-made tool. Not affiliated with, endorsed by, or
            sponsored by Epic Games.
          </p>
          <div className="grid gap-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
              <p>
                Your fingerprint, face scan, or device PIN stays with your
                device. FortSprite never receives it.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <LockKeyholeIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
              <p>
                A passkey stays protected by your device or password manager.
                FortSprite stores only the public credential needed to verify
                it.
              </p>
            </div>
            <p>
              Add a second passkey after signing up. Without one, losing your
              only passkey means losing access to the account.
            </p>
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
          <FortSpriteIcon size={128} className="text-[#9cfab5]" />
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
      Sign-in was not completed. Please try again.
    </p>
  ) : null
}
