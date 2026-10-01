import { z } from "zod"
import type {
  CatalogItem,
  CatalogSnapshot,
  CollectionMutationResponse,
  CollectionSnapshot,
  FriendComparison,
  SharingFriend,
} from "./index.ts"

const filters = {
  search: z.string().max(120).optional().describe("Case-insensitive Sprite name, variant, or rarity search."),
  variant: z.string().max(80).optional().describe("Exact variant label, such as Gold."),
  rarity: z.string().max(80).optional().describe("Exact rarity label, such as Rare."),
}
const pagination = {
  limit: z.number().int().min(1).max(100).default(25).describe("Maximum results in this page, from 1 to 100."),
  offset: z.number().int().min(0).max(100_000).default(0).describe("Number of matching results to skip."),
}
export const collectionStateSchema = z.discriminatedUnion("owned", [
  z.object({ owned: z.literal(false), mastered: z.literal(false) }).strict(),
  z.object({ owned: z.literal(true), mastered: z.boolean() }).strict(),
])

export const collectionQuerySchema = z.object({
  ...filters,
  ownership: z.enum(["all", "owned", "missing"]).optional().describe("Ownership filter for the signed-in user."),
}).strict()

export const spriteToolDefinitions = {
  search_sprites: {
    description: "Search released Fortnite Sprites by name, variant, or rarity. Returns a page with stable Sprite IDs, metadata, and source links.",
    inputSchema: z.object({ ...filters, ...pagination }).strict(),
  },
  get_sprite: {
    description: "Get a released Sprite's details using its exact ID from search_sprites.",
    inputSchema: z.object({ spriteId: z.uuid().describe("Exact Sprite ID returned by search_sprites or get_collection.") }).strict(),
  },
  get_collection: {
    description: "Read the signed-in user's saved Sprite collection and progress. Filter and paginate the items.",
    inputSchema: collectionQuerySchema.extend(pagination),
  },
  set_collection_state: {
    description: "Save the signed-in user's complete desired ownership and mastery for one Sprite. Missing Sprites must have mastered false. Repeating a state is safe.",
    inputSchema: z.object({ spriteId: z.uuid().describe("Exact Sprite ID returned by search_sprites or get_collection."), state: collectionStateSchema.describe("Complete desired ownership and mastery. Mastery requires ownership.") }).strict(),
  },
  get_friends: {
    description: "Read the signed-in user's FortSprite sharing connections. Accepted friends can help with collection gaps.",
    inputSchema: z.object(pagination).strict(),
  },
  compare_friend_collection: {
    description: "Compare the signed-in user's collection with an accepted friend's. Returns Sprites each person can provide to the other. Use an exact friend ID from get_friends.",
    inputSchema: z.object({
      friendId: z.string().min(1).max(128).describe("Exact accepted friend profile ID returned by get_friends."),
      ...pagination,
    }).strict(),
  },
} as const

export type SpriteToolName = keyof typeof spriteToolDefinitions
export type SpriteToolInput<Name extends SpriteToolName> = z.output<
  (typeof spriteToolDefinitions)[Name]["inputSchema"]
>
export type SpritePage = {
  items: CatalogItem[]
  total: number
  nextOffset: number | null
}
export type SpriteTools = {
  search_sprites: { input: SpriteToolInput<"search_sprites">; output: SpritePage & { revision: string } }
  get_sprite: { input: SpriteToolInput<"get_sprite">; output: CatalogItem }
  get_collection: { input: SpriteToolInput<"get_collection">; output: Omit<CollectionSnapshot, "items"> & { items: CollectionSnapshot["items"]; total: number; nextOffset: number | null } }
  set_collection_state: { input: SpriteToolInput<"set_collection_state">; output: CollectionMutationResponse }
  get_friends: { input: SpriteToolInput<"get_friends">; output: { friends: SharingFriend[]; total: number; nextOffset: number | null; refreshedAt: string } }
  compare_friend_collection: { input: SpriteToolInput<"compare_friend_collection">; output: FriendComparison & { forYouTotal: number; forFriendTotal: number; forYouNextOffset: number | null; forFriendNextOffset: number | null } }
}

export const publicSpriteToolNames = ["search_sprites", "get_sprite"] as const
export const sessionSpriteToolNames = [
  "get_collection", "set_collection_state", "get_friends", "compare_friend_collection",
] as const

export function pageItems<T>(items: T[], { limit, offset }: { limit: number; offset: number }) {
  return {
    items: items.slice(offset, offset + limit),
    total: items.length,
    nextOffset: offset + limit < items.length ? offset + limit : null,
  }
}

export function selectCatalogPage(catalog: CatalogSnapshot, query: SpriteToolInput<"search_sprites">) {
  const search = query.search?.toLowerCase()
  const items = catalog.items.filter((item) =>
    (!search || `${item.baseName} ${item.variant} ${item.sourceVariant} ${item.rarity}`.toLowerCase().includes(search)) &&
    (!query.variant || item.variant.toLowerCase() === query.variant.toLowerCase()) &&
    (!query.rarity || item.rarity.toLowerCase() === query.rarity.toLowerCase()),
  )
  return { revision: catalog.revision, ...pageItems(items, query) }
}

export function spriteToolJsonSchema(name: SpriteToolName) {
  return z.toJSONSchema(spriteToolDefinitions[name].inputSchema, { io: "input", target: "draft-07" })
}
