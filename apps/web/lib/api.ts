import "server-only"

import type {
  ApiErrorResponse,
  CatalogSnapshot,
  CollectionSnapshot,
  CollectionTrackingSnapshot,
  CredentialsResponse,
  ViewerResponse,
  SharingSnapshot,
  FriendComparison,
} from "@workspace/contracts"
import { assembleCollection } from "@workspace/contracts"
import { cache } from "react"
import { cacheLife } from "next/cache"
import { cookies } from "next/headers"
import { connection } from "next/server"

import { getCatalog } from "@/lib/catalog"

export class FortSpriteApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = "FortSpriteApiError"
  }
}

async function getJson<T>(path: string): Promise<T> {
  const cookieStore = await cookies()
  const { app } = await import("@fortsprite/api/app")
  const response = await app.request(path, {
    headers: {
      accept: "application/json",
      cookie: cookieStore.toString(),
    },
    cache: "no-store",
  })
  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    const errorBody = body as Partial<ApiErrorResponse> | undefined
    throw new FortSpriteApiError(
      errorBody?.error?.message ?? "The FortSprite API request failed.",
      response.status,
      errorBody?.error?.code ?? "API_REQUEST_FAILED",
    )
  }

  return body as T
}

export async function getViewer(): Promise<ViewerResponse["viewer"]> {
  "use cache: private"
  cacheLife({ stale: 30 })
  const response = await getJson<ViewerResponse>("/api/v1/me")
  return response.viewer
}

export const getCredentials = cache(() =>
  getJson<CredentialsResponse>("/api/v1/credentials"),
)

export const getCollection = cache(async (): Promise<CollectionSnapshot> => {
  await connection()
  let tracking = await getJson<CollectionTrackingSnapshot>("/api/v1/collection/state")
  let catalog: CatalogSnapshot
  try {
    catalog = await getCatalog(tracking.catalogRevision)
  } catch {
    tracking = await getJson<CollectionTrackingSnapshot>("/api/v1/collection/state")
    catalog = await getCatalog(tracking.catalogRevision)
  }
  return assembleCollection(catalog, tracking)
})

export const getSharing = cache(async (): Promise<SharingSnapshot> => {
  await connection()
  return getJson<SharingSnapshot>("/api/v1/friends")
})

export const getComparison = cache(async (userId: string): Promise<FriendComparison> => {
  await connection()
  return getJson<FriendComparison>(
    `/api/v1/friends/${encodeURIComponent(userId)}/comparison`,
  )
})
