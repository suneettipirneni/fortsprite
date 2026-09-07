import type { CollectionSnapshot, PublicProfile } from "@workspace/contracts"
import { db } from "./db/client.ts"
import { getConsentedEpicFriends } from "./epic/service.ts"
import { getHelpers, resolveLocalFriends } from "./friends.ts"

export async function getFriendContext(headers: Headers, database = db) {
  const visible = await getConsentedEpicFriends(headers)
  const local = await resolveLocalFriends(
    visible.map((friend) => friend.accountId),
    database,
  )
  return { visible, local, localIds: local.map((friend) => friend.id) }
}

type CollectionHelpers = {
  helpers: { spriteId: string; profile: PublicProfile }[]
  friendAvailability: CollectionSnapshot["friendAvailability"]
}

export async function collectionHelpers(
  headers: Headers,
  viewerId: string,
  database = db,
): Promise<CollectionHelpers> {
  try {
    const { localIds } = await getFriendContext(headers, database)
    return {
      helpers: await getHelpers(viewerId, localIds, database),
      friendAvailability: {
        status: "ready" as const,
        refreshedAt: new Date().toISOString(),
      },
    }
  } catch {
    return {
      helpers: [],
      friendAvailability: { status: "unavailable" as const, refreshedAt: null },
    }
  }
}
