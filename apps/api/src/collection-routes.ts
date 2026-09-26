import { Hono } from "hono"
import type { SpriteHelper } from "@workspace/contracts"
import {
  type ApiEnvironment,
  type SessionReader,
  readSession,
  requireSession,
  limitMutations,
  limitReads,
  handleApiError,
} from "./http.ts"
import { db } from "./db/client.ts"
import { getHelpers } from "./friends.ts"
import {
  collectionQuerySchema,
  collectionStateSchema,
  getCollection,
  getCollectionTracking,
  setCollectionEntry,
  spriteIdSchema,
} from "./collection.ts"

export function createCollectionRoutes({
  database = db,
  getSession = readSession,
  readHelpers = getHelpers,
}: {
  database?: typeof db
  getSession?: SessionReader
  readHelpers?: typeof getHelpers
} = {}) {
  const routes = new Hono<ApiEnvironment>()
  const authenticated = requireSession(getSession)
  routes.onError(handleApiError)

  routes.get(
    "/collection/state",
    authenticated,
    limitReads("collection", database),
    async (context) => {
      if (Object.keys(context.req.query()).length > 0)
        return context.json(
          { error: { code: "INVALID_INPUT", message: "Collection state does not accept filters." } },
          400,
        )
      const [tracking, helpers] = await Promise.all([
        getCollectionTracking(context.get("userId"), database),
        readHelpers(context.get("userId"), database),
      ])
      return context.json({ ...tracking, helpers })
    },
  )

  routes.get(
    "/collection",
    authenticated,
    limitReads("collection", database),
    async (context) => {
      const query = collectionQuerySchema.safeParse(context.req.query())
      if (!query.success)
        return context.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "The collection filters are invalid.",
            },
          },
          400,
        )
      const [collection, availableHelpers] = await Promise.all([
        getCollection(context.get("userId"), query.data, database),
        readHelpers(context.get("userId"), database),
      ])
      const helpers = new Map<string, SpriteHelper[]>()
      for (const helper of availableHelpers) {
        const profiles = helpers.get(helper.spriteId) ?? []
        profiles.push({ ...helper.profile, mastered: helper.mastered })
        helpers.set(helper.spriteId, profiles)
      }
      return context.json({
        ...collection,
        items: collection.items.map((item) => ({
          ...item,
          helpers: helpers.get(item.id) ?? [],
        })),
      })
    },
  )

  routes.put(
    "/collection/:spriteId",
    authenticated,
    limitMutations("collection", database),
    async (context) => {
      const spriteId = spriteIdSchema.safeParse(context.req.param("spriteId"))
      const state = collectionStateSchema.safeParse(
        await context.req.json().catch(() => null),
      )
      if (!spriteId.success || !state.success)
        return context.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "Choose a valid Sprite collection state.",
            },
          },
          400,
        )
      const result = await setCollectionEntry(
        context.get("userId"),
        spriteId.data,
        state.data,
        database,
      )
      if (!result)
        return context.json(
          {
            error: {
              code: "SPRITE_NOT_FOUND",
              message: "This released Sprite could not be found.",
            },
          },
          404,
        )
      return context.json(result)
    },
  )

  return routes
}

export const collectionRoutes = createCollectionRoutes()
