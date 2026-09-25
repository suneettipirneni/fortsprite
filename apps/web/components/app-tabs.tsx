import type { LucideIcon } from "lucide-react"
import {
  Grid2X2Icon,
  HouseIcon,
  SparklesIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react"

export type AppTab = Readonly<{
  segment: null | "collection" | "matches" | "friends" | "account"
  href: "/" | "/collection" | "/matches" | "/friends" | "/account"
  desktopLabel: string
  mobileLabel: string
  Icon: LucideIcon
}>

export const appTabs: readonly AppTab[] = [
  {
    segment: null,
    href: "/",
    desktopLabel: "Overview",
    mobileLabel: "Home",
    Icon: HouseIcon,
  },
  {
    segment: "collection",
    href: "/collection",
    desktopLabel: "Collection",
    mobileLabel: "Collection",
    Icon: Grid2X2Icon,
  },
  {
    segment: "matches",
    href: "/matches",
    desktopLabel: "Friends can help",
    mobileLabel: "Matches",
    Icon: SparklesIcon,
  },
  {
    segment: "friends",
    href: "/friends",
    desktopLabel: "Friends",
    mobileLabel: "Friends",
    Icon: UsersRoundIcon,
  },
  {
    segment: "account",
    href: "/account",
    desktopLabel: "Account",
    mobileLabel: "Account",
    Icon: UserRoundIcon,
  },
]
