import { Hono } from "hono"
import {
  type ApiEnvironment,
  type SessionReader,
  readSession,
  requireSession,
} from "./http.ts"
import { db } from "./db/client.ts"
import { collectionHelpers } from "./friend-service.ts"
import {
  collectionQuerySchema,
  collectionStateSchema,
  getCollection,
  setCollectionEntry,
  spriteIdSchema,
} from "./collection.ts"

export function createCollectionRoutes({
  database = db,
  getSession = readSession,
  getHelpers = collectionHelpers,
}: {
  database?: typeof db
  getSession?: SessionReader
  getHelpers?: typeof collectionHelpers
} = {}) {
  const routes = new Hono<ApiEnvironment>()
  const authenticated = requireSession(getSession)

  routes.get("/collection", authenticated, async (context) => {
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
    const [collection, availability] = await Promise.all([
      getCollection(context.get("userId"), query.data, database),
      getHelpers(context.req.raw.headers, context.get("userId"), database),
    ])
    const helpers = new Map<
      string,
      (typeof availability.helpers)[number]["profile"][]
    >()
    for (const helper of availability.helpers) {
      const profiles = helpers.get(helper.spriteId) ?? []
      profiles.push(helper.profile)
      helpers.set(helper.spriteId, profiles)
    }
    return context.json({
      ...collection,
      friendAvailability: availability.friendAvailability,
      items: collection.items.map((item) => ({
        ...item,
        helpers: helpers.get(item.id) ?? [],
      })),
    })
  })

  routes.put("/collection/:spriteId", authenticated, async (context) => {
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
  })

  return routes
}

export const collectionRoutes = createCollectionRoutes()
