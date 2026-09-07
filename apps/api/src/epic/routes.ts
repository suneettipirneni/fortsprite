import type {
  ApiErrorResponse,
  EpicFriendsResponse,
  ViewerResponse,
} from "@workspace/contracts"
import { Hono } from "hono"
import { rejectQueryParameters } from "../http.ts"

import { DiscoveryRateLimitError } from "../rate-limit.ts"
import { EpicApiError } from "./client.ts"
import {
  AuthenticationRequiredError,
  EpicPermissionRequiredError,
  getEpicFriends,
  getViewer,
} from "./service.ts"

export const epicRoutes = new Hono()

function errorResponse(error: unknown): {
  body: ApiErrorResponse
  status: 401 | 403 | 429 | 502
} {
  if (error instanceof DiscoveryRateLimitError)
    return {
      body: { error: { code: "RATE_LIMITED", message: error.message } },
      status: 429,
    }
  if (error instanceof AuthenticationRequiredError) {
    return {
      body: {
        error: {
          code: "AUTH_REQUIRED",
          message: "Sign in with Epic Games to continue.",
        },
      },
      status: 401,
    }
  }

  if (error instanceof EpicPermissionRequiredError) {
    return {
      body: {
        error: {
          code: "EPIC_FRIENDS_PERMISSION_REQUIRED",
          message: "Reconnect Epic Games and approve Friends access.",
        },
      },
      status: 403,
    }
  }

  if (error instanceof EpicApiError) {
    console.error("Epic Games API request failed", {
      status: error.status,
    })
  } else {
    console.error("Epic Games integration failed")
  }

  return {
    body: {
      error: {
        code: "EPIC_UPSTREAM_ERROR",
        message: "Epic Games data is temporarily unavailable. Try again.",
      },
    },
    status: 502,
  }
}

epicRoutes.get("/me", rejectQueryParameters, async (context) => {
  try {
    return context.json<ViewerResponse>({
      viewer: await getViewer(context.req.raw.headers),
    })
  } catch (error) {
    if (error instanceof DiscoveryRateLimitError)
      context.header("Retry-After", String(error.retryAfter))
    const response = errorResponse(error)
    return context.json(response.body, response.status)
  }
})

epicRoutes.get("/epic/friends", rejectQueryParameters, async (context) => {
  try {
    return context.json<EpicFriendsResponse>(
      await getEpicFriends(context.req.raw.headers),
    )
  } catch (error) {
    if (error instanceof DiscoveryRateLimitError)
      context.header("Retry-After", String(error.retryAfter))
    const response = errorResponse(error)
    return context.json(response.body, response.status)
  }
})
