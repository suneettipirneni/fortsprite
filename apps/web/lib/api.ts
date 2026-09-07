import "server-only"

import type {
  ApiErrorResponse,
  CollectionSnapshot,
  EpicFriendsResponse,
  ViewerResponse,
  SharingSnapshot,
  FriendComparison,
} from "@workspace/contracts"
import { cache } from "react"
import { cookies } from "next/headers"
import { connection } from "next/server"

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
  await connection()
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

export const getViewer = cache(async () => {
  const response = await getJson<ViewerResponse>("/api/v1/me")
  return response.viewer
})

export const getEpicFriends = cache(() =>
  getJson<EpicFriendsResponse>("/api/v1/epic/friends"),
)

export const getCollection = cache(() =>
  getJson<CollectionSnapshot>("/api/v1/collection"),
)

export const getSharing = cache(() =>
  getJson<SharingSnapshot>("/api/v1/friends"),
)

export const getComparison = cache((userId: string) =>
  getJson<FriendComparison>(
    `/api/v1/friends/${encodeURIComponent(userId)}/comparison`,
  ),
)
