export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    requestId?: string
  }
}

export interface Viewer {
  displayName: string
  fortniteDisplayName: string | null
  handle: string
  initials: string
}

export interface ViewerResponse {
  viewer: Viewer
}

export type CredentialSummary =
  | {
      id: string
      kind: "social"
      provider: "apple" | "google"
      createdAt: string
    }
  | {
      id: string
      kind: "passkey"
      name: string | null
      deviceType: string
      backedUp: boolean
      createdAt: string | null
    }

export interface CredentialsResponse {
  credentials: CredentialSummary[]
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
