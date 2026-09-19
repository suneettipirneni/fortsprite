import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { passkey } from "@better-auth/passkey"
import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"

import { databaseSchema, db } from "./db/client.ts"
import { env } from "./env.ts"

function createInitialHandle() {
  return `sprite_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function requireVerifiedUser(verified: boolean | undefined) {
  if (!verified)
    throw new APIError("UNAUTHORIZED", {
      message: "Passkey user verification is required.",
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
        defaultValue: createInitialHandle,
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
        resolveUser: () => {
          const id = crypto.randomUUID()
          return { id, name: "FortSprite collector" }
        },
        afterVerification: async ({ ctx, verification, user }) => {
          requireVerifiedUser(verification.registrationInfo?.userVerified)

          const existingUser = await ctx.context.internalAdapter.findUserById(
            user.id,
          )
          if (!existingUser)
            await ctx.context.internalAdapter.createUser(
              {
                id: user.id,
                name: user.name,
                email: `${user.id}@passkey.fortsprite.invalid`,
                emailVerified: false,
                handle: createInitialHandle(),
              },
              { method: "passkey" },
            )
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
