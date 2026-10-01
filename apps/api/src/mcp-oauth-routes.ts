import { APIError } from "better-auth/api"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"
import { z } from "zod"
import { auth } from "./auth.ts"
import { db } from "./db/client.ts"
import { oauthAccessToken, oauthClient, oauthConsent, oauthRefreshToken } from "./db/oauth-schema.ts"
import { type ApiEnvironment, handleApiError, limitMutations, limitReads, readSession, rejectQueryParameters, requireSession } from "./http.ts"

export const mcpOAuthRoutes = new Hono<ApiEnvironment>()
mcpOAuthRoutes.use("/mcp-oauth/*", requireSession(readSession))
mcpOAuthRoutes.onError((error, context) => {
  if (error instanceof APIError)
    return context.json({ error: { code: "INVALID_OAUTH_REQUEST", message: "This connection request is invalid or has expired." } }, error.statusCode === 401 ? 401 : 400)
  return handleApiError(error, context)
})
mcpOAuthRoutes.get("/mcp-oauth/consent", limitReads("sharing"), async (context) => {
  const parsed = z.object({ oauth_query: z.string().min(1).max(12_000) }).strict().safeParse(context.req.query())
  if (!parsed.success)
    return context.json({ error: { code: "INVALID_OAUTH_REQUEST", message: "This connection request is invalid or has expired." } }, 400)
  return context.json(await auth.api.getMcpConsentContext({ headers: context.req.raw.headers, body: parsed.data }))
})
mcpOAuthRoutes.get("/mcp-oauth/grants", rejectQueryParameters, limitReads("sharing"), async (context) => {
  const rows = await db.select({
    id: oauthConsent.id,
    clientId: oauthConsent.clientId,
    clientName: oauthClient.name,
    scopes: oauthConsent.scopes,
    createdAt: oauthConsent.createdAt,
  }).from(oauthConsent).innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
    .where(eq(oauthConsent.userId, context.get("userId")))
  return context.json({ grants: rows.map((row) => ({ ...row, clientName: row.clientName ?? "Connected assistant", createdAt: row.createdAt.toISOString() })) })
})
mcpOAuthRoutes.delete("/mcp-oauth/grants/:id", rejectQueryParameters, limitMutations("profile"), async (context) => {
  const userId = context.get("userId")
  const [grant] = await db.select().from(oauthConsent).where(and(eq(oauthConsent.id, context.req.param("id")), eq(oauthConsent.userId, userId)))
  if (!grant)
    return context.json({ error: { code: "NOT_FOUND", message: "This connection is unavailable." } }, 404)
  await db.transaction(async (transaction) => {
    await transaction.delete(oauthAccessToken).where(and(eq(oauthAccessToken.userId, userId), eq(oauthAccessToken.clientId, grant.clientId)))
    await transaction.delete(oauthRefreshToken).where(and(eq(oauthRefreshToken.userId, userId), eq(oauthRefreshToken.clientId, grant.clientId)))
    await transaction.delete(oauthConsent).where(and(eq(oauthConsent.id, grant.id), eq(oauthConsent.userId, userId)))
  })
  return context.json({ success: true })
})
