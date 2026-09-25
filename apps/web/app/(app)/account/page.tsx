import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { ContentLoading } from "@/components/content-loading"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { CredentialManager } from "@/components/credential-manager"
import { ProfileEditor } from "@/components/profile-editor"
import { getCredentials, getViewer } from "@/lib/api"

export const metadata: Metadata = { title: "Account" }

export default function AccountPage() {
  return (
    <div className="app-page">
      <div className="flex max-w-4xl flex-col gap-8">
        <div className="border-b border-white/10 pb-6 sm:pb-8">
          <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Make your profile yours.
          </h1>
          <p className="mt-2 max-w-[62ch] text-pretty text-base text-muted-foreground sm:text-sm">
            Choose how friends recognize you and how you securely sign in.
          </p>
        </div>
        <Suspense fallback={<ContentLoading />}>
          <AccountDetails />
        </Suspense>
        <nav
          aria-label="Account policies"
          className="flex flex-wrap gap-5 border-t border-white/10 pt-5 text-sm"
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
            transitionTypes={["page-navigation"]}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Help
          </Link>
        </nav>
      </div>
    </div>
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
