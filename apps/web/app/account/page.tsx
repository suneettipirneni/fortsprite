import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { ContentLoading } from "@/components/content-loading"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { CredentialManager } from "@/components/credential-manager"
import { ProfileEditor } from "@/components/profile-editor"
import { getCredentials, getViewer } from "@/lib/api"

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
            Choose how friends recognize you and how you securely sign in.
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
  const [viewer, credentialResponse] = await Promise.all([
    getViewer(),
    getCredentials(),
  ])
  return (
    <>
      <ProfileEditor viewer={viewer} />
      <CredentialManager credentials={credentialResponse.credentials} />
      <DeleteAccountDialog handle={viewer.handle} />
    </>
  )
}
