import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { passkey } from "@better-auth/passkey"
import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"

import { createAppleClientSecret } from "./apple-client-secret.ts"
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
      "/sign-in/social": { window: 60, max: 10 },
      "/passkey/generate-authenticate-options": { window: 60, max: 20 },
      "/passkey/verify-authentication": { window: 60, max: 20 },
      "/get-session": false,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  trustedOrigins: [env.webOrigin, "https://appleid.apple.com"],
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    },
    apple: async () => ({
      clientId: env.appleClientId,
      clientSecret: await createAppleClientSecret({
        clientId: env.appleClientId,
        teamId: env.appleTeamId,
        keyId: env.appleKeyId,
        privateKey: env.applePrivateKey,
      }),
    }),
  },
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
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      allowDifferentEmails: true,
      allowUnlinkingAll: false,
      updateUserInfoOnLink: false,
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
        requireSession: true,
        afterVerification: ({ verification }) => {
          requireVerifiedUser(verification.registrationInfo?.userVerified)
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
