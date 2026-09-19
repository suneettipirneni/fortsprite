import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { passkey } from "@better-auth/passkey"
import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { sql } from "drizzle-orm"

import { user } from "./db/auth-schema.ts"
import { databaseSchema, db } from "./db/client.ts"
import { env } from "./env.ts"
import { usernameSchema } from "./identity.ts"

function requireRegistrationUsername(context: string | null | undefined) {
  const parsed = usernameSchema.safeParse(context)
  if (!parsed.success)
    throw new APIError("BAD_REQUEST", {
      message:
        "Choose a username with 3–24 letters, numbers, underscores or hyphens.",
    })
  return parsed.data
}

async function usernameIsTaken(username: string) {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.handle}) = lower(${username})`)
    .limit(1)
  return Boolean(existing)
}

function usernameTaken() {
  return new APIError("CONFLICT", {
    message: "That username is already taken. Choose another.",
  })
}

function isUniqueViolation(error: unknown) {
  const cause =
    error instanceof Error && "cause" in error ? error.cause : error
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "23505"
  )
}

function requireVerifiedUser(verified: boolean | undefined) {
  if (!verified)
    throw new APIError("UNAUTHORIZED", {
      message: "Passkey user verification is required.",
    })
}

function requireAtomicAccountCreation(createSession: boolean | undefined) {
  if (createSession !== true)
    throw new APIError("BAD_REQUEST", {
      message: "Account creation must also create its first session.",
    })
}

export const auth = betterAuth({
  appName: "FortSprite",
  logger: {
    level: "warn",
    log(level) {
      console.warn("Better Auth event", { level })
    },
  },
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  secrets: [{ version: 1, value: env.betterAuthSecret }],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: databaseSchema,
  }),
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/passkey/generate-register-options": { window: 60, max: 10 },
      "/passkey/verify-registration": { window: 60, max: 10 },
      "/passkey/generate-authenticate-options": { window: 60, max: 20 },
      "/passkey/verify-authentication": { window: 60, max: 20 },
      "/get-session": false,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  trustedOrigins: [env.webOrigin],
  user: {
    deleteUser: { enabled: true },
    additionalFields: {
      appDisplayName: { type: "string", required: false, input: false },
      handle: {
        type: "string",
        required: true,
        input: false,
      },
      fortniteDisplayName: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-real-ip"] },
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: Boolean(env.betterAuthCookieDomain),
      domain: env.betterAuthCookieDomain,
    },
  },
  plugins: [
    passkey({
      rpID: env.passkeyRpId,
      rpName: "FortSprite",
      origin: env.passkeyOrigin,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      registration: {
        requireSession: false,
        resolveUser: async ({ context }) => {
          const username = requireRegistrationUsername(context)
          if (await usernameIsTaken(username)) throw usernameTaken()
          const id = crypto.randomUUID()
          return { id, name: username, displayName: username }
        },
        afterVerification: async ({ ctx, verification, user, context }) => {
          requireVerifiedUser(verification.registrationInfo?.userVerified)

          const existingUser = await ctx.context.internalAdapter.findUserById(
            user.id,
          )
          if (existingUser) return

          requireAtomicAccountCreation(ctx.body.createSession)
          const username = requireRegistrationUsername(context)
          try {
            await ctx.context.internalAdapter.createUser(
              {
                id: user.id,
                name: username,
                email: `${user.id}@passkey.fortsprite.invalid`,
                emailVerified: false,
                handle: username,
              },
              { method: "passkey" },
            )
          } catch (error) {
            if (isUniqueViolation(error)) throw usernameTaken()
            throw error
          }
          return { name: "Primary passkey" }
        },
      },
      authentication: {
        afterVerification: ({ verification }) => {
          requireVerifiedUser(verification.authenticationInfo.userVerified)
        },
      },
    }),
  ],
})
