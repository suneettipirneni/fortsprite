import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"
import { pageItems, selectCatalogPage, spriteToolDefinitions } from "@workspace/contracts/sprite-tools"
import type { CollectionSnapshot } from "@workspace/contracts"
import { createCollectionRoutes } from "./collection-routes.ts"
import { db } from "./db/client.ts"
import { mcpResource } from "./mcp-oauth.ts"
import { getCatalog } from "./catalog.ts"

export function createSpriteMcpHandler({ readCatalog = getCatalog, verifyKey = async () => null, database = db }: {
  readCatalog?: typeof getCatalog
  verifyKey?: (headers: Headers) => Promise<{ userId: string; scopes?: string[] } | null>
  database?: typeof db
} = {}) {
  const handler = createMcpHandler(({ authInfo }) => {
    const server = new McpServer({ name: "fortsprite", version: "1.0.0" })
    const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    server.registerTool("search_sprites", {
      ...spriteToolDefinitions.search_sprites,
      annotations,
    }, async (query) => {
      try {
        const result = selectCatalogPage(await readCatalog(), query)
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result }
      } catch {
        return { isError: true, content: [{ type: "text", text: "The Sprite catalog is temporarily unavailable." }] }
      }
    })
    server.registerTool("get_sprite", {
      ...spriteToolDefinitions.get_sprite,
      annotations,
    }, async ({ spriteId }) => {
      try {
        const sprite = (await readCatalog()).items.find((item) => item.id === spriteId)
        if (!sprite) return { isError: true, content: [{ type: "text", text: "This released Sprite was not found." }] }
        return { content: [{ type: "text", text: JSON.stringify(sprite) }], structuredContent: { ...sprite } }
      } catch {
        return { isError: true, content: [{ type: "text", text: "The Sprite catalog is temporarily unavailable." }] }
      }
    })
    const userId = authInfo?.extra?.userId
    if (typeof userId === "string") {
      const collection = createCollectionRoutes({ database, getSession: async () => ({ user: { id: userId } }) })
      if (authInfo!.scopes.includes("collection:read")) server.registerTool("get_collection", {
        ...spriteToolDefinitions.get_collection,
        annotations,
      }, async ({ limit, offset, ...query }) => {
        const response = await collection.request(`/collection?${new URLSearchParams(query)}`)
        if (!response.ok) return collectionError(response)
        const snapshot = await response.json() as CollectionSnapshot
        const result = { ...snapshot, ...pageItems(snapshot.items, { limit, offset }) }
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result }
      })
      if (authInfo!.scopes.includes("collection:read") && authInfo!.scopes.includes("collection:write")) server.registerTool("set_collection_state", {
        ...spriteToolDefinitions.set_collection_state,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      }, async ({ spriteId, state }) => {
        const response = await collection.request(`/collection/${encodeURIComponent(spriteId)}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state),
        })
        if (!response.ok) return collectionError(response)
        const result = await response.json()
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result }
      })
    }
    return server
  }, { responseMode: "json" })
  return {
    ...handler,
    async fetch(request: Request) {
      if (!request.headers.has("authorization")) return handler.fetch(request)
      const identity = await verifyKey(request.headers)
      if (!identity) return Response.json({ error: "A valid FortSprite connection or MCP key is required." }, {
        status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${new URL("/.well-known/oauth-protected-resource/api/mcp/collection", mcpResource)}", scope="collection:read collection:write"`, "Cache-Control": "no-store" },
      })
      return handler.fetch(request, { authInfo: {
        token: "", clientId: "fortsprite-personal-key", scopes: identity.scopes ?? ["collection:read", "collection:write"], extra: { userId: identity.userId },
      } })
    },
  }
}

async function collectionError(response: Response) {
  const messages: Record<number, string> = {
    400: "Choose a valid Sprite collection state or filter.",
    401: "A valid FortSprite connection or MCP key is required.",
    404: "This released Sprite could not be found.",
    429: "Too many requests. Try again later.",
  }
  return { isError: true, content: [{ type: "text" as const, text: messages[response.status] ?? "FortSprite could not complete this collection request." }] }
}
