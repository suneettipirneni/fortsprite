import { Hono } from "hono"
import { z } from "zod"
import { db } from "./db/client.ts"
import {
  changeSharing,
  getBlockedProfiles,
  getComparison,
  handleSchema,
  requestFriendByHandle,
  sharingActionSchema,
  sharingFriends,
} from "./friends.ts"
import {
  type ApiEnvironment,
  type SessionReader,
  handleApiError,
  readSession,
  rejectQueryParameters,
  requireSession,
} from "./http.ts"
import { consumeMutationLimit } from "./rate-limit.ts"

const requestSchema = z.object({ handle: handleSchema }).strict()

export function createFriendRoutes({
  database = db,
  getSession = readSession,
}: {
  database?: typeof db
  getSession?: SessionReader
} = {}) {
  const routes = new Hono<ApiEnvironment>()
  const authenticated = requireSession(getSession)
  routes.onError(handleApiError)
  routes.get(
    "/friends",
    authenticated,
    rejectQueryParameters,
    async (context) => {
      const userId = context.get("userId")
      const [friends, blocked] = await Promise.all([
        sharingFriends(userId, database),
        getBlockedProfiles(userId, database),
      ])
      return context.json({
        friends,
        blocked,
        refreshedAt: new Date().toISOString(),
      })
    },
  )
  routes.post(
    "/friends",
    authenticated,
    rejectQueryParameters,
    async (context) => {
      const parsed = requestSchema.safeParse(
        await context.req.json().catch(() => null),
      )
      if (!parsed.success)
        return context.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "Enter an exact FortSprite handle.",
            },
          },
          400,
        )
      await consumeMutationLimit(
        context.get("userId"),
        "sharing",
        database,
      )
      const friend = await requestFriendByHandle(
        context.get("userId"),
        parsed.data.handle,
        database,
      )
      return context.json({ friend })
    },
  )
  routes.post(
    "/friends/:id",
    authenticated,
    rejectQueryParameters,
    async (context) => {
      const id = z.string().min(1).max(128).safeParse(context.req.param("id"))
      const parsed = sharingActionSchema.safeParse(
        await context.req.json().catch(() => null),
      )
      if (!id.success || !parsed.success)
        return context.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "Choose a valid sharing action.",
            },
          },
          400,
        )
      const { action } = parsed.data
      const privacyAction = ["remove", "decline", "unblock", "block"].includes(
        action,
      )
      await consumeMutationLimit(
        context.get("userId"),
        privacyAction ? "privacy" : "sharing",
        database,
      )
      await changeSharing(
        context.get("userId"),
        id.data,
        action,
        database,
      )
      return context.json({ ok: true })
    },
  )
  routes.get(
    "/friends/:id/comparison",
    authenticated,
    rejectQueryParameters,
    async (context) => {
      const id = z.string().min(1).max(128).safeParse(context.req.param("id"))
      if (!id.success)
        return context.json(
          {
            error: { code: "INVALID_INPUT", message: "Choose a valid friend." },
          },
          400,
        )
      return context.json(
        await getComparison(context.get("userId"), id.data, database),
      )
    },
  )
  return routes
}

export const friendRoutes = createFriendRoutes()
