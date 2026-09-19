import { limitBody } from "./body-limit.ts"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { requestId } from "hono/request-id"
import { count, eq, sql } from "drizzle-orm"

import { auth } from "./auth.ts"
import { db } from "./db/client.ts"
import { passkey } from "./db/auth-schema.ts"
import { env } from "./env.ts"
import { collectionRoutes } from "./collection-routes.ts"
import { friendRoutes } from "./friend-routes.ts"
import { profileRoutes } from "./profile-routes.ts"

export const app = new Hono()

app.use("*", requestId())
app.use("/api/*", async (context, next) => {
  context.header("Cache-Control", "no-store")
  await next()
})

app.use("/api/v1/*", limitBody(16 * 1024))
app.use("/api/auth/*", limitBody(32 * 1024))

app.use("/api/v1/*", async (context, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(context.req.method)) {
    const origin = context.req.header("origin")
    if (
      origin !== env.webOrigin ||
      context.req.header("sec-fetch-site") === "cross-site"
    ) {
      return context.json(
        {
          error: {
            code: "INVALID_ORIGIN",
            message: "This request must come from FortSprite.",
            requestId: context.get("requestId"),
          },
        },
        403,
      )
    }
  }
  await next()
})

app.use(
  "/api/auth/*",
  cors({
    origin: env.webOrigin,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
)

app.on(["GET", "POST"], "/api/auth/*", async (context) => {
  const path = context.req.path.slice("/api/auth".length)
  const allowed = new Map([
    ["/get-session", ["GET"]],
    ["/sign-out", ["POST"]],
    ["/passkey/generate-register-options", ["GET"]],
    ["/passkey/verify-registration", ["POST"]],
    ["/passkey/generate-authenticate-options", ["GET"]],
    ["/passkey/verify-authentication", ["POST"]],
    ["/passkey/delete-passkey", ["POST"]],
    ["/passkey/update-passkey", ["POST"]],
  ])
  if (!allowed.get(path)?.includes(context.req.method)) {
    return context.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "This authentication operation is unavailable.",
        },
      },
      404,
    )
  }

  if (path === "/passkey/delete-passkey") {
    const session = await auth.api.getSession({ headers: context.req.raw.headers })
    if (session) {
      const [{ value }] = await db
        .select({ value: count() })
        .from(passkey)
        .where(eq(passkey.userId, session.user.id))
      if (value <= 1)
        return context.json(
          {
            error: {
              code: "LAST_PASSKEY",
              message: "Add another passkey before removing this one.",
            },
          },
          409,
        )
    }
  }

  const response = await auth.handler(context.req.raw)
  if (path !== "/get-session" || !response.ok) return response
  const body = await response.json()
  if (!body) return Response.json(null, { headers: response.headers })
  const { id, name, image, handle, fortniteDisplayName } = body.user
  return Response.json(
    {
      user: { id, name, image, handle, fortniteDisplayName },
      session: { expiresAt: body.session.expiresAt },
    },
    { headers: response.headers },
  )
})

app.get("/api/v1/health", async (context) => {
  try {
    await db.execute(sql`select 1`)

    return context.json({
      service: "fortsprite-api",
      status: "ok",
      checks: { database: "ok" },
    })
  } catch {
    console.error("FortSprite API database readiness check failed", {
      requestId: context.get("requestId"),
    })

    return context.json(
      {
        service: "fortsprite-api",
        status: "unavailable",
        checks: { database: "unavailable" },
      },
      503,
    )
  }
})

app.route("/api/v1", collectionRoutes)
app.route("/api/v1", friendRoutes)
app.route("/api/v1", profileRoutes)

app.onError((error, context) => {
  console.error("Unhandled FortSprite API request error", {
    requestId: context.get("requestId"),
    name: error.name,
  })

  return context.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "The FortSprite API could not complete this request.",
        requestId: context.get("requestId"),
      },
    },
    500,
  )
})
