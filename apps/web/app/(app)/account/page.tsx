import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import {
  AccountDeletionSkeleton,
  CredentialsSkeleton,
  ProfileSkeleton,
} from "@/components/page-data-skeletons"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { CredentialManager } from "@/components/credential-manager"
import { ProfileEditor } from "@/components/profile-editor"
import { PageHeader } from "@/components/page-header"
import { getCredentials, getViewer } from "@/lib/api"

export const metadata: Metadata = { title: "Account" }

export default function AccountPage() {
  return (
    <div className="app-page space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Make your profile yours."
        description="Choose how friends recognize you and how you securely sign in."
      />
      <div className="app-columns">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
          <Suspense fallback={<ProfileSkeleton />}>
            <AccountProfile />
          </Suspense>
          <Suspense fallback={<CredentialsSkeleton />}>
            <AccountCredentials />
          </Suspense>
          <Suspense fallback={<AccountDeletionSkeleton />}>
            <AccountDeletion />
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
              className="inline-flex min-h-11 items-center underline underline-offset-4"
            >
              Help
            </Link>
          </nav>
        </div>
      </div>
    </div>
  )
}

async function AccountProfile() {
  const viewer = await getViewer()
  return <ProfileEditor viewer={viewer} />
}

async function AccountCredentials() {
  const { credentials } = await getCredentials()
  return <CredentialManager credentials={credentials} />
}

async function AccountDeletion() {
  const viewer = await getViewer()
  return <DeleteAccountDialog handle={viewer.handle} />
}
