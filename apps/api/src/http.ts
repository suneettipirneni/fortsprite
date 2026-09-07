import type { ErrorHandler } from "hono"
import { createMiddleware } from "hono/factory"
import { z } from "zod"
import { auth } from "./auth.ts"
import { FriendshipError } from "./friends.ts"
import { EpicPermissionRequiredError } from "./epic/service.ts"
import { EpicApiError } from "./epic/client.ts"
import { DiscoveryRateLimitError } from "./rate-limit.ts"

export type ApiEnvironment = {
  Variables: { userId: string; requestId: string }
}

export type SessionReader = (
  headers: Headers,
) => Promise<{ user: { id: string } } | null>

export const readSession: SessionReader = (headers) =>
  auth.api.getSession({ headers })

export function requireSession(getSession: SessionReader) {
  return createMiddleware<ApiEnvironment>(async (context, next) => {
    const session = await getSession(context.req.raw.headers)
    if (!session)
      return context.json(
        {
          error: {
            code: "AUTH_REQUIRED",
            message: "Sign in with Epic Games to continue.",
          },
        },
        401,
      )
    context.set("userId", session.user.id)
    await next()
  })
}

const emptyQuerySchema = z.object({}).strict()

export const rejectQueryParameters = createMiddleware(async (context, next) => {
  if (!emptyQuerySchema.safeParse(context.req.query()).success)
    return context.json(
      {
        error: {
          code: "INVALID_INPUT",
          message: "This request does not accept query parameters.",
        },
      },
      400,
    )
  await next()
})

export const handleApiError: ErrorHandler<ApiEnvironment> = (
  error,
  context,
) => {
  if (error instanceof DiscoveryRateLimitError) {
    context.header("Retry-After", String(error.retryAfter))
    return context.json(
      { error: { code: "RATE_LIMITED", message: error.message } },
      429,
    )
  }
  if (error instanceof FriendshipError)
    return context.json(
      { error: { code: "SHARING_UNAVAILABLE", message: error.message } },
      error.status,
    )
  if (error instanceof EpicPermissionRequiredError)
    return context.json(
      {
        error: {
          code: "EPIC_FRIENDS_PERMISSION_REQUIRED",
          message: "Reconnect Epic Games and approve Friends access.",
        },
      },
      403,
    )
  const upstream = error instanceof EpicApiError
  console.error("FortSprite request failed", {
    requestId: context.get("requestId"),
    name: error.name,
  })
  return context.json(
    {
      error: {
        code: upstream ? "FRIENDS_UNAVAILABLE" : "INTERNAL_ERROR",
        message: upstream
          ? "Friend data could not be refreshed. Please try again."
          : "Your request could not be completed. Please try again.",
        requestId: context.get("requestId"),
      },
    },
    upstream ? 502 : 500,
  )
}
