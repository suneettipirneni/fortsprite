import { Hono } from "hono"
import { z } from "zod"
import { db } from "./db/client.ts"
import { getFriendContext } from "./friend-service.ts"
import {
  changeSharing,
  getBlockedProfiles,
  getComparison,
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

export function createFriendRoutes({
  database = db,
  getSession = readSession,
  getFriends = getFriendContext,
}: {
  database?: typeof db
  getSession?: SessionReader
  getFriends?: typeof getFriendContext
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
      const { local, visible } = await getFriends(
        context.req.raw.headers,
        database,
      )
      const [friends, blocked] = await Promise.all([
        sharingFriends(userId, local, database),
        getBlockedProfiles(userId, database),
      ])
      const joined = new Set(local.map((friend) => friend.epicId))
      return context.json({
        friends,
        blocked,
        unjoined: visible
          .filter((friend) => !joined.has(friend.accountId))
          .map((friend) => ({
            displayName: friend.displayName,
            nickname: friend.nickname,
            friendsSince: friend.created,
            favorite: friend.favorite,
            initials: friend.displayName.slice(0, 2).toUpperCase(),
          })),
        refreshedAt: new Date().toISOString(),
      })
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
      const localIds = ["remove", "decline", "unblock"].includes(action)
        ? []
        : (await getFriends(context.req.raw.headers, database)).localIds
      await changeSharing(
        context.get("userId"),
        id.data,
        action,
        localIds,
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
      const { localIds } = await getFriends(context.req.raw.headers, database)
      return context.json(
        await getComparison(
          context.get("userId"),
          context.req.param("id"),
          localIds,
          database,
        ),
      )
    },
  )
  return routes
}

export const friendRoutes = createFriendRoutes()
