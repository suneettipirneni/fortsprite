import type { McpKeySummary } from "@workspace/contracts"
import { APIError } from "better-auth/api"
import { Hono } from "hono"
import { z } from "zod"
import { auth } from "./auth.ts"
import { env } from "./env.ts"
import { type ApiEnvironment, handleApiError, limitMutations, readSession, rejectQueryParameters, requireSession } from "./http.ts"

function summarizeKey(key: {
  id: string
  name: string | null
  start: string | null
  createdAt: Date
  expiresAt: Date | null
  lastRequest: Date | null
}): McpKeySummary {
  return {
    id: key.id,
    name: key.name ?? "MCP key",
    start: key.start ?? "fs_mcp_",
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() ?? null,
    lastUsedAt: key.lastRequest?.toISOString() ?? null,
  }
}

export const mcpKeyRoutes = new Hono<ApiEnvironment>()
mcpKeyRoutes.onError((error, context) => {
  if (error instanceof APIError && error.statusCode === 404)
    return context.json({ error: { code: "NOT_FOUND", message: "This MCP key is unavailable." } }, 404)
  return handleApiError(error, context)
})
mcpKeyRoutes.use("/mcp-keys*", requireSession(readSession), rejectQueryParameters, async (context, next) => {
  if (context.req.method !== "GET" && (context.req.header("origin") !== env.webOrigin || context.req.header("sec-fetch-site") === "cross-site"))
    return context.json({ error: { code: "INVALID_ORIGIN", message: "This request must come from FortSprite." } }, 403)
  await next()
})
mcpKeyRoutes.get("/mcp-keys", async (context) => {
  const result = await auth.api.listApiKeys({
    headers: context.req.raw.headers,
    query: { configId: "mcp", sortBy: "createdAt", sortDirection: "desc" },
  })
  return context.json({ keys: result.apiKeys.map(summarizeKey) })
})
mcpKeyRoutes.post("/mcp-keys", limitMutations("profile"), async (context) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(40).regex(/^[^\u0000-\u001f\u007f]+$/) }).strict().safeParse(await context.req.json().catch(() => null))
  if (!parsed.success)
    return context.json({ error: { code: "INVALID_INPUT", message: "Give this key a name of 1–40 characters." } }, 400)
  const key = await auth.api.createApiKey({
    body: {
      configId: "mcp",
      name: parsed.data.name,
      userId: context.get("userId"),
      expiresIn: 60 * 60 * 24 * 90,
      permissions: { collection: ["read", "write"] },
    },
  })
  return context.json({ credential: { ...summarizeKey(key), key: key.key } }, 201)
})
mcpKeyRoutes.delete("/mcp-keys/:id", limitMutations("profile"), async (context) => {
  await auth.api.deleteApiKey({
    headers: context.req.raw.headers,
    body: { configId: "mcp", keyId: context.req.param("id") },
  })
  return context.json({ success: true })
})
