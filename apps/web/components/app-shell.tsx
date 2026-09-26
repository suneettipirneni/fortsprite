"use client"

import { Suspense, useSyncExternalStore } from "react"
import type { Viewer } from "@workspace/contracts"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronsUpDownIcon,
  UserRoundIcon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { cn } from "@workspace/ui/lib/utils"

import { appTabs } from "@/components/app-tabs"
import { SignOutMenuItem } from "@/components/sign-out-menu-item"
import { FortSpriteIcon } from "@/components/fortsprite-icon"

// Streamed menu triggers must not accept pointer events before their handlers exist.
const subscribeHydration = () => () => {}
const hydratedSnapshot = () => true
const serverHydrationSnapshot = () => false

function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    hydratedSnapshot,
    serverHydrationSnapshot,
  )
}

function Brand() {
  return (
    <Link
      href="/"
      prefetch={true}
      aria-label="Homepage"
      className="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <FortSpriteIcon size={32} className="shrink-0 text-[#9cfab5]" />
      <span className="locker-display text-lg text-foreground">FortSprite</span>
    </Link>
  )
}

function NavigationLinkContent({
  href,
  label,
  pathname,
}: {
  href: string
  label: string
  pathname: string
}) {
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`))

  return (
    <Link
      href={href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center rounded-lg px-3 text-sm font-medium text-foreground/65 outline-none hover:bg-white/6 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-white/9 text-foreground",
      )}
    >
      {label}
    </Link>
  )
}

function ActiveNavigationLink(props: { href: string; label: string }) {
  const pathname = usePathname()
  return <NavigationLinkContent {...props} pathname={pathname} />
}

function NavigationLink(props: { href: string; label: string }) {
  return (
    <Suspense fallback={<NavigationLinkContent {...props} pathname="" />}>
      <ActiveNavigationLink {...props} />
    </Suspense>
  )
}

export function ProfileMenu({ viewer }: { viewer: Viewer }) {
  const hydrated = useHydrated()
  const pathname = usePathname()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="gap-2"
          aria-label="Account menu"
          disabled={!hydrated}
        >
          <Avatar className="size-7 outline-1 -outline-offset-1 outline-white/10">
            <AvatarFallback>{viewer.initials}</AvatarFallback>
          </Avatar>
          <div className="hidden max-w-40 truncate text-sm sm:block">
            {viewer.displayName}
          </div>
          <ChevronsUpDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuLabel className="truncate">
          {viewer.displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/account"
              aria-current={pathname === "/account" ? "page" : undefined}
            >
              <UserRoundIcon />
              Profile
            </Link>
          </DropdownMenuItem>
          <SignOutMenuItem />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode
  profile: React.ReactNode
}) {
  return (
    <div className="locker-stage isolate min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-background/68 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="app-container flex h-[var(--app-header-content-height)] items-center gap-3">
          <Brand />

          <nav
            aria-label="Primary"
            className="hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex"
          >
            {appTabs.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                label={item.desktopLabel}
              />
            ))}
          </nav>

          <div className="min-w-0 flex-1" />
          {profile}
        </div>
      </header>
      <main className="min-w-0">{children}</main>
    </div>
  )
}
