"use client"

import { Suspense, useSyncExternalStore } from "react"
import type { Viewer } from "@workspace/contracts"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronsUpDownIcon,
  CommandIcon,
  MenuIcon,
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

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"
import { cn } from "@workspace/ui/lib/utils"

import { SignOutMenuItem } from "@/components/sign-out-menu-item"
import catalogMetadata from "../public/sprites/catalog-meta.json"

const catalogDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const navigation = [
  { label: "Overview", href: "/" },
  { label: "Collection", href: "/collection" },
  { label: "Friends can help", href: "/matches" },
  { label: "Friends", href: "/friends" },
  { label: "Account", href: "/account" },
]

const secondaryNavigation = [{ label: "Help", href: "/help" }]

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
      aria-label="Homepage"
      className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <CommandIcon className="size-4 shrink-0 stroke-primary" />
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide text-foreground/70 outline-none hover:bg-white/8 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-white/12 text-foreground",
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

function MobileNavigation() {
  const hydrated = useHydrated()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          disabled={!hydrated}
          className="relative lg:hidden"
        >
          <MenuIcon />
          <span
            aria-hidden="true"
            className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
          />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="!w-[min(20rem,calc(100%-3rem))]">
        <SheetHeader>
          <SheetTitle className="locker-display text-xl">FortSprite</SheetTitle>
          <SheetDescription>
            Your Sprite locker and friend network.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile primary" className="flex flex-col gap-1 px-3">
          {navigation.map((item) => (
            <SheetClose asChild key={item.href}>
              <NavigationLink {...item} />
            </SheetClose>
          ))}
        </nav>
        <nav
          aria-label="Mobile secondary"
          className="flex flex-col gap-1 border-t border-border px-3 pt-4"
        >
          {secondaryNavigation.map((item) => (
            <SheetClose asChild key={item.href}>
              <NavigationLink {...item} />
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <MobileNavigation />
          <Brand />

          <nav
            aria-label="Primary"
            className="hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex"
          >
            {navigation.map((item) => (
              <NavigationLink key={item.href} {...item} />
            ))}
          </nav>

          <div className="min-w-0 flex-1" />
          <p className="hidden text-sm text-foreground/55 2xl:block">
            Catalog checked{" "}
            {catalogDateFormatter.format(
              new Date(`${catalogMetadata.sourceVerifiedAt}T00:00:00Z`),
            )}
            .
          </p>
          {profile}
        </div>
      </header>
      <main className="min-w-0">{children}</main>
    </div>
  )
}
