import { Hono } from "hono"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { auth } from "./auth.ts"
import { db } from "./db/client.ts"
import { user, rateLimit } from "./db/auth-schema.ts"
import { profileSchema, updateProfile } from "./profile.ts"
import {
  type ApiEnvironment,
  type SessionReader,
  handleApiError,
  readSession,
  rejectQueryParameters,
  requireSession,
} from "./http.ts"

export function createProfileRoutes({
  database = db,
  getSession = readSession,
  deleteUser = (headers) =>
    auth.api.deleteUser({ headers, body: {}, asResponse: true }),
}: {
  database?: typeof db
  getSession?: SessionReader
  deleteUser?: (headers: Headers) => Promise<Response>
} = {}) {
  const routes = new Hono<ApiEnvironment>()
  const authenticated = requireSession(getSession)
  routes.onError(handleApiError)
  routes.put(
    "/profile",
    authenticated,
    rejectQueryParameters,
    async (context) => {
      const parsed = profileSchema.safeParse(
        await context.req.json().catch(() => null),
      )
      if (!parsed.success)
        return context.json(
          {
            error: {
              code: "INVALID_INPUT",
              message:
                "Use a 3–24 character handle with letters, digits, underscores or hyphens, and names of 1–60 characters.",
            },
          },
          400,
        )
      try {
        const profile = await updateProfile(
          context.get("userId"),
          parsed.data,
          database,
        )
        if (!profile)
          return context.json(
            {
              error: {
                code: "AUTH_REQUIRED",
                message: "Sign in again to edit your profile.",
              },
            },
            401,
          )
        return context.json({ profile })
      } catch (error) {
        const cause =
          error instanceof Error && "cause" in error ? error.cause : error
        if (
          typeof cause === "object" &&
          cause &&
          "code" in cause &&
          cause.code === "23505"
        )
          return context.json(
            {
              error: {
                code: "HANDLE_TAKEN",
                message: "That handle is already taken. Choose another.",
              },
            },
            409,
          )
        throw error
      }
    },
  )
  routes.delete(
    "/profile",
    authenticated,
    rejectQueryParameters,
    async (context) => {
      const parsed = z
        .object({ confirmation: z.string().min(3).max(24) })
        .strict()
        .safeParse(await context.req.json().catch(() => null))
      const [profile] = await database
        .select({ handle: user.handle })
        .from(user)
        .where(eq(user.id, context.get("userId")))
      if (!parsed.success || parsed.data.confirmation !== profile?.handle)
        return context.json(
          {
            error: {
              code: "CONFIRMATION_REQUIRED",
              message: "Type your current handle to confirm account deletion.",
            },
          },
          400,
        )
      const result = await deleteUser(context.req.raw.headers)
      if (!result.ok)
        return context.json(
          {
            error: {
              code: "REAUTH_REQUIRED",
              message:
                "Sign out and sign in with Epic Games again before deleting your account.",
            },
          },
          403,
        )
      await database
        .delete(rateLimit)
        .where(eq(rateLimit.key, `friend-discovery:${context.get("userId")}`))
      for (const cookie of result.headers.getSetCookie())
        context.header("set-cookie", cookie, { append: true })
      return context.json({ ok: true })
    },
  )
  return routes
}

export const profileRoutes = createProfileRoutes()
