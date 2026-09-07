export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    requestId?: string
  }
}

export interface Viewer {
  displayName: string
  epicDisplayName: string
  fortniteDisplayName: string | null
  handle: string
  initials: string
  epicPermissions: {
    basicProfile: boolean
    friendsList: boolean
  }
}

export interface ViewerResponse {
  viewer: Viewer
}

export interface EpicFriend {
  displayName: string
  nickname: string | null
  initials: string
  friendsSince: string | null
  favorite: boolean
}

export interface EpicFriendsResponse {
  friends: EpicFriend[]
  total: number
  source: "epic-games"
}

export type CollectionState =
  { owned: false; mastered: false } | { owned: true; mastered: boolean }

export interface PublicProfile {
  id: string
  handle: string
  displayName: string
  fortniteDisplayName: string | null
  initials: string
}

export interface CatalogItem {
  id: string
  slug: string
  stableKey: string
  baseName: string
  variant: string
  sourceVariant: string
  rarity: string
  releaseStatus: "unreleased" | "released" | "retired"
  displayOrder: number
  season: string | null
  sourceSeasonId: number | null
  imagePath: string | null
  description: string | null
  descriptionLines: string[]
  levelProgression: string | null
  location: string | null
  spriteDustValue: number | null
  dropChancePercent: string | null
  dropChances: { source: string; percent: string }[]
  sourcePage: string
  sourceVerifiedAt: string
}

export type CollectionEntry = CollectionState & {
  spriteId: string
  updatedAt: string | null
}

export type CollectionItem = CatalogItem &
  CollectionEntry & {
    helpers: PublicProfile[]
  }

export interface CollectionProgress {
  total: number
  owned: number
  mastered: number
}

export interface CollectionSnapshot {
  friendAvailability: {
    status: "ready" | "unavailable"
    refreshedAt: string | null
  }
  items: CollectionItem[]
  progress: CollectionProgress
  updatedAt: string | null
}

export interface CollectionMutationResponse {
  entry: CollectionEntry
  progress: CollectionProgress
}

export type SharingAction =
  "request" | "accept" | "decline" | "remove" | "block" | "unblock"
export interface SharingFriend {
  profile: PublicProfile
  status: "none" | "incoming" | "outgoing" | "accepted" | "blocked"
}
export interface SharingSnapshot {
  friends: SharingFriend[]
  unjoined: EpicFriend[]
  blocked: PublicProfile[]
  refreshedAt: string
}
export interface FriendComparison {
  friend: PublicProfile
  forYou: CatalogItem[]
  forFriend: CatalogItem[]
  refreshedAt: string
}

export interface ProfileUpdate {
  handle: string
  displayName: string
  fortniteDisplayName: string | null
}
