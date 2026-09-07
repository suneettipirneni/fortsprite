import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { ProfileEditor } from "@/components/profile-editor"
import { getViewer } from "@/lib/api"

export const metadata: Metadata = { title: "Account" }

export default function AccountPage() {
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6 lg:p-8">
        <div>
          <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Make your profile yours.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Choose how your friends recognize you on FortSprite. Your Epic
            account stays connected for sign-in.
          </p>
        </div>
        <Suspense fallback={<ContentLoading />}>
          <AccountDetails />
        </Suspense>
        <nav
          aria-label="Account policies"
          className="flex flex-wrap gap-5 border-t border-border pt-5 text-sm"
        >
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Terms
          </Link>
          <Link
            href="/help"
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Help
          </Link>
        </nav>
      </div>
    </AuthenticatedAppShell>
  )
}

async function AccountDetails() {
  const viewer = await getViewer()
  return (
    <>
      <ProfileEditor viewer={viewer} />
      <section
        aria-labelledby="epic-identity"
        className="space-y-4 border-t border-border pt-6"
      >
        <h2 id="epic-identity" className="text-xl font-semibold">
          Connected Epic account
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">
              Epic-provided display name
            </dt>
            <dd className="mt-1 break-words">{viewer.epicDisplayName}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              Friends permission
            </dt>
            <dd className="mt-1">
              {viewer.epicPermissions.friendsList
                ? "Connected"
                : "Sign out and reconnect to approve Friends access"}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">
          Editing your FortSprite profile does not change your Epic display name
          or Fortnite account.
        </p>
      </section>
      <DeleteAccountDialog handle={viewer.handle} />
    </>
  )
}
