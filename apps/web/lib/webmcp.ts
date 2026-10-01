import type { CollectionSnapshot, SharingSnapshot, FriendComparison } from "@workspace/contracts"
import {
  pageItems,
  publicSpriteToolNames,
  selectCatalogPage,
  sessionSpriteToolNames,
  spriteToolDefinitions,
  spriteToolJsonSchema,
  type SpriteToolName,
  type SpriteToolInput,
  type SpriteTools,
} from "@workspace/contracts/sprite-tools"

export interface WebMcpTool {
  name: SpriteToolName
  description: string
  inputSchema: object
  annotations: { readOnlyHint: boolean; consequentialHint?: boolean }
  execute(input: unknown, client: { signal?: AbortSignal }): Promise<string>
}
export interface ModelContext {
  registerTool(tool: WebMcpTool, options?: { signal: AbortSignal }): void | Promise<void>
}

export type CollectionSaver = (input: SpriteTools["set_collection_state"]["input"]) => Promise<SpriteTools["set_collection_state"]["output"]>

export function browserModelContext(): ModelContext | undefined {
  return (document as Document & { modelContext?: ModelContext }).modelContext
}

function parseInput<Name extends SpriteToolName>(name: Name, input: unknown): SpriteToolInput<Name> {
  const parsed = spriteToolDefinitions[name].inputSchema.safeParse(input)
  if (!parsed.success) throw new Error("Choose valid FortSprite tool arguments.")
  return parsed.data as SpriteToolInput<Name>
}

async function readApi<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", signal })
  if (!response.ok) {
    if (response.status === 401) throw new Error("Sign in to use this FortSprite tool.")
    if (response.status === 403) throw new Error("This sharing operation is unavailable.")
    if (response.status === 429) throw new Error("Too many requests. Try again later.")
    throw new Error("FortSprite could not complete this request.")
  }
  return response.json()
}

export function createSpriteWebMcpTools({ session = false, signal, saveCollection }: {
  session?: boolean
  signal: AbortSignal
  saveCollection?: CollectionSaver
}): WebMcpTool[] {
  const names = session ? sessionSpriteToolNames : publicSpriteToolNames
  return names.map((name) => ({
    name,
    description: spriteToolDefinitions[name].description,
    inputSchema: spriteToolJsonSchema(name),
    annotations: { readOnlyHint: name !== "set_collection_state", consequentialHint: false },
    async execute(input, client) {
      const executionSignal = client?.signal ? AbortSignal.any([signal, client.signal]) : signal
      executionSignal.throwIfAborted()
      switch (name) {
        case "search_sprites": {
          const query = parseInput(name, input)
          const catalog = await readApi<import("@workspace/contracts").CatalogSnapshot>("/api/v1/catalog", executionSignal)
          return JSON.stringify(selectCatalogPage(catalog, query))
        }
        case "get_sprite": {
          const { spriteId } = parseInput(name, input)
          const catalog = await readApi<import("@workspace/contracts").CatalogSnapshot>("/api/v1/catalog", executionSignal)
          const sprite = catalog.items.find((item) => item.id === spriteId)
          if (!sprite) throw new Error("This released Sprite was not found.")
          return JSON.stringify(sprite)
        }
        case "get_collection": {
          const { limit, offset, ...query } = parseInput(name, input)
          const parameters = new URLSearchParams(query)
          const collection = await readApi<CollectionSnapshot>(`/api/v1/collection?${parameters}`, executionSignal)
          return JSON.stringify({ ...collection, ...pageItems(collection.items, { limit, offset }) })
        }
        case "set_collection_state": {
          const desired = parseInput(name, input)
          if (!saveCollection) throw new Error("Collection changes are unavailable.")
          return JSON.stringify(await saveCollection(desired))
        }
        case "get_friends": {
          const query = parseInput(name, input)
          const snapshot = await readApi<SharingSnapshot>("/api/v1/friends", executionSignal)
          const { items, ...page } = pageItems(snapshot.friends, query)
          return JSON.stringify({ friends: items, ...page, refreshedAt: snapshot.refreshedAt })
        }
        case "compare_friend_collection": {
          const query = parseInput(name, input)
          const comparison = await readApi<FriendComparison>(`/api/v1/friends/${encodeURIComponent(query.friendId)}/comparison`, executionSignal)
          const forYou = pageItems(comparison.forYou, query)
          const forFriend = pageItems(comparison.forFriend, query)
          return JSON.stringify({
            ...comparison,
            forYou: forYou.items,
            forFriend: forFriend.items,
            forYouTotal: forYou.total,
            forFriendTotal: forFriend.total,
            forYouNextOffset: forYou.nextOffset,
            forFriendNextOffset: forFriend.nextOffset,
          })
        }
      }
    },
  }))
}

export async function registerSpriteWebMcp(context: ModelContext, tools: WebMcpTool[], signal: AbortSignal) {
  await Promise.all(tools.map(async (tool) => {
    if (!signal.aborted) await context.registerTool(tool, { signal })
  }))
}
