import { getOAuthProviderApi, oauthProvider, type OAuthOptions } from "@better-auth/oauth-provider"
import { APIError, createAuthEndpoint, createAuthMiddleware, sessionMiddleware } from "better-auth/api"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "./db/client.ts"
import { mcpOAuthFamily, oauthAccessToken, oauthConsent, oauthRefreshToken } from "./db/oauth-schema.ts"
import { env } from "./env.ts"

export const mcpResource = `${env.webOrigin}/api/mcp/collection`
export const mcpIssuer = `${env.betterAuthUrl}/api/auth`
export const mcpScopes = ["collection:read", "collection:write", "offline_access"]
export const mcpOAuthOptions: OAuthOptions<string[]> = {
  loginPage: "/sign-in",
  consentPage: "/mcp/consent",
  scopes: mcpScopes,
  grantTypes: ["authorization_code", "refresh_token"],
  disableJwtPlugin: true,
  allowDynamicClientRegistration: true,
  allowUnauthenticatedClientRegistration: true,
  clientRegistrationRequirePKCE: true,
  clientRegistrationDefaultScopes: mcpScopes,
  clientRegistrationDefaultResources: [mcpResource],
  resources: [{ identifier: mcpResource, allowedScopes: mcpScopes, accessTokenTtl: 3600 }],
  accessTokenExpiresIn: 3600,
  refreshTokenExpiresIn: 60 * 60 * 24 * 90,
  refreshTokenReuseInterval: 30,
  clientPrivileges: async () => false,
  resourcePrivileges: async () => false,
  rateLimit: { register: { window: 60, max: 10 } },
}

export const mcpOAuthProvider = oauthProvider(mcpOAuthOptions)

export const mcpOAuthResource = {
  id: "fortsprite-mcp-resource",
  hooks: {
    before: [{
      matcher: (context: { path?: string }) => context.path === "/oauth2/authorize",
      handler: createAuthMiddleware(async (context) => {
        const resource = context.query?.resource
        const resources = Array.isArray(resource) ? resource : [resource]
        if (resources.length !== 1 || resources[0] !== mcpResource)
          throw new APIError("BAD_REQUEST", { error: "invalid_target" })
      }),
    }, {
      matcher: (context: { path?: string }) => context.path === "/oauth2/token",
      handler: createAuthMiddleware(async (context) => {
        const provider = getOAuthProviderApi(context, mcpOAuthOptions)
        let familyId: string | undefined
        if (context.body?.grant_type === "authorization_code" && typeof context.body.code === "string")
          familyId = await provider.hashToken(context.body.code, "authorization_code")
        if (context.body?.grant_type === "refresh_token" && typeof context.body.refresh_token === "string") {
          const tokenHash = await provider.hashToken(context.body.refresh_token, "refresh_token")
          const [refresh] = await db.select().from(oauthRefreshToken).where(eq(oauthRefreshToken.token, tokenHash))
          familyId = refresh?.authorizationCodeId ?? undefined
        }
        const [family] = familyId ? await db.select().from(mcpOAuthFamily).where(eq(mcpOAuthFamily.authorizationCodeId, familyId)) : []
        if (!family) throw new APIError("BAD_REQUEST", { error: "invalid_grant" })
        return { context: { mcpAuthorizationFamily: familyId } }
      }),
    }],
    after: [{
      matcher: (context: { path?: string }) => context.path === "/oauth2/token",
      handler: createAuthMiddleware(async (context) => {
        const familyId = (context as typeof context & { mcpAuthorizationFamily?: string }).mcpAuthorizationFamily
        const [family] = familyId ? await db.select().from(mcpOAuthFamily).where(eq(mcpOAuthFamily.authorizationCodeId, familyId)) : []
        if (!family) {
          if (familyId) {
            await db.delete(oauthAccessToken).where(eq(oauthAccessToken.authorizationCodeId, familyId))
            await db.delete(oauthRefreshToken).where(eq(oauthRefreshToken.authorizationCodeId, familyId))
          }
          throw new APIError("BAD_REQUEST", { error: "invalid_grant" })
        }
      }),
    }],
  },
  endpoints: {
    verifyMcpOAuthToken: createAuthEndpoint("/mcp/verify-oauth-token", {
      method: "POST",
      metadata: { SERVER_ONLY: true },
      body: z.object({ token: z.string().min(1).max(512) }).strict(),
    }, async (context) => {
      const payload = await getOAuthProviderApi(context, mcpOAuthOptions).requireActiveAccessToken(context.body.token)
      const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
      if (payload.iss !== mcpIssuer || !audience.includes(mcpResource) || !payload.sub || payload.cnf || typeof payload.client_id !== "string")
        throw new APIError("UNAUTHORIZED", { error: "invalid_token" })
      const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : []
      const provider = getOAuthProviderApi(context, mcpOAuthOptions)
      const tokenHash = await provider.hashToken(context.body.token, "access_token")
      const [token] = await db.select().from(oauthAccessToken).where(eq(oauthAccessToken.token, tokenHash))
      const [family] = token?.authorizationCodeId ? await db.select().from(mcpOAuthFamily)
        .innerJoin(oauthConsent, eq(oauthConsent.id, mcpOAuthFamily.consentId))
        .where(and(eq(mcpOAuthFamily.authorizationCodeId, token.authorizationCodeId), eq(oauthConsent.userId, payload.sub), eq(oauthConsent.clientId, payload.client_id))) : []
      if (!family || !scopes.includes("collection:read") ||
        !scopes.every((scope) => family.oauth_consent.scopes.includes(scope)) || !family.oauth_consent.resources?.includes(mcpResource))
        throw new APIError("UNAUTHORIZED", { error: "invalid_token" })
      return { userId: payload.sub, scopes }
    }),
    getMcpConsentContext: createAuthEndpoint("/mcp/consent-context", {
      method: "POST",
      metadata: { SERVER_ONLY: true },
      use: [sessionMiddleware],
      body: z.object({ oauth_query: z.string().min(1).max(12_000) }).strict(),
    }, async (context) => {
      const query = new URLSearchParams(context.body.oauth_query)
      const clientId = query.get("client_id")
      const redirectUri = query.get("redirect_uri")
      const scopes = query.get("scope")?.split(" ").filter(Boolean) ?? []
      if (!clientId || !redirectUri || query.get("resource") !== mcpResource ||
        scopes.some((scope) => !mcpScopes.includes(scope)))
        throw new APIError("BAD_REQUEST", { error: "invalid_request" })
      const client = await getOAuthProviderApi(context, mcpOAuthOptions).getClient(clientId)
      if (!client || client.disabled || !client.redirectUris?.includes(redirectUri))
        throw new APIError("BAD_REQUEST", { error: "invalid_client" })
      return {
        client: { id: client.clientId, name: client.name ?? "Connected assistant", redirectHost: new URL(redirectUri).host },
        scopes,
        oauthQuery: context.body.oauth_query,
        viewer: { handle: context.context.session.user.handle as string },
      }
    }),
  },
}

// Bind before the provider publishes a code. All code paths, including passkey
// auto-resume, use Better Auth's verification creation lifecycle.
export async function bindMcpAuthorizationFamily(verification: { identifier: string; value: string }) {
  let value: unknown
  try { value = JSON.parse(verification.value) } catch { return }
  const parsed = z.object({ type: z.literal("authorization_code"), userId: z.string(), query: z.object({ client_id: z.string(), scope: z.string() }) }).safeParse(value)
  if (!parsed.success) return
  const [consent] = await db.select().from(oauthConsent).where(and(eq(oauthConsent.userId, parsed.data.userId), eq(oauthConsent.clientId, parsed.data.query.client_id)))
  if (!consent || !consent.resources?.includes(mcpResource) || !parsed.data.query.scope.split(" ").every((scope) => consent.scopes.includes(scope)))
    throw new APIError("BAD_REQUEST", { error: "invalid_grant" })
  await db.insert(mcpOAuthFamily).values({ authorizationCodeId: verification.identifier, consentId: consent.id })
}
