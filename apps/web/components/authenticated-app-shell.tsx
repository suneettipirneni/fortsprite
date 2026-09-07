import { Suspense } from "react"

import { AppShell, ProfileMenu } from "@/components/app-shell"
import { getViewer } from "@/lib/api"

async function AccountMenu() {
  const viewer = await getViewer()
  return <ProfileMenu viewer={viewer} />
}

export function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell
      profile={
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading account"
              className="h-9 w-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
            />
          }
        >
          <AccountMenu />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  )
}
