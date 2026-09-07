import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"

import { databaseSchema, db } from "./db/client.ts"
import { env } from "./env.ts"
import { getEpicUserInfo } from "./epic/client.ts"

export const EPIC_PROVIDER_ID = "epic-games"

function createEpicHandle() {
  return `epic_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`
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
      "/sign-in/oauth2": { window: 60, max: 10 },
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
        defaultValue: createEpicHandle,
      },
      fortniteDisplayName: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  databaseHooks: {
    user: {
      deleteUser: { enabled: true },
      create: {
        before: async (user) => ({
          data: {
            ...user,
            fortniteDisplayName: user.name,
          },
        }),
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
    genericOAuth({
      config: [
        {
          providerId: EPIC_PROVIDER_ID,
          clientId: env.epicClientId,
          clientSecret: env.epicClientSecret,
          authentication: "basic",
          getUserInfo: (tokens) =>
            getEpicUserInfo(tokens.accessToken, env.epicUserInfoUrl),
          authorizationUrl: env.epicAuthorizationUrl,
          tokenUrl: env.epicTokenUrl,
          userInfoUrl: env.epicUserInfoUrl,
          scopes: env.epicScopes,
          pkce: true,
          overrideUserInfo: true,
        },
      ],
    }),
  ],
})
