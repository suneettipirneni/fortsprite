import "./env.js"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { eq, inArray } from "drizzle-orm"

const { db, pool } = await import("../src/db/client.ts")
const { user } = await import("../src/db/auth-schema.ts")
const { collectionEntries, sprites } = await import("../src/db/schema.ts")
const {
  changeSharing,
  getComparison,
  getHelpers,
  requestFriendByHandle,
  sharingFriends,
} = await import("../src/friends.ts")

const viewerId = randomUUID()
const friendId = randomUUID()
const blockedId = randomUUID()
const spriteId = randomUUID()

before(async () => {
  await db.insert(user).values([
    {
      id: viewerId,
      name: "Viewer",
      email: `${viewerId}@test.invalid`,
      handle: `viewer_${viewerId.slice(0, 6)}`,
    },
    {
      id: friendId,
      name: "Friend",
      email: `${friendId}@test.invalid`,
      handle: `friend_${friendId.slice(0, 6)}`,
    },
    {
      id: blockedId,
      name: "Blocked",
      email: `${blockedId}@test.invalid`,
      handle: `blocked_${blockedId.slice(0, 6)}`,
    },
  ])
  await db.insert(sprites).values({
    id: spriteId,
    slug: `friend-test-${spriteId}`,
    stableKey: `friend-test:${spriteId}`,
    baseName: "Friend Test Sprite",
    variantName: "Base",
    rarity: "Rare",
    releaseStatus: "released",
    sourceUrl: "https://example.test/friend-sprite",
    sourceVerifiedAt: new Date(),
  })
  await db.insert(collectionEntries).values({
    userId: friendId,
    spriteId,
    owned: true,
  })
})

after(async () => {
  await db.delete(user).where(inArray(user.id, [viewerId, friendId, blockedId]))
  await db.delete(sprites).where(eq(sprites.id, spriteId))
  await pool.end()
})

test("exact usernames create local requests without provider identities", async () => {
  const friend = await requestFriendByHandle(
    viewerId,
    `FRIEND_${friendId.slice(0, 6)}`,
  )
  assert.equal(friend.profile.id, friendId)
  assert.equal(friend.status, "outgoing")
  assert.equal("accountId" in friend.profile, false)
  const incoming = await sharingFriends(friendId)
  assert.equal(incoming[0]?.status, "incoming")
  await assert.rejects(
    requestFriendByHandle(viewerId, "missing_handle"),
    /No FortSprite account/,
  )
})

test("accepted sharing alone unlocks helpers and comparison", async () => {
  await changeSharing(friendId, viewerId, "accept")
  const [helper] = await getHelpers(viewerId)
  assert.equal(helper?.spriteId, spriteId)
  assert.equal(helper?.profile.id, friendId)
  const comparison = await getComparison(viewerId, friendId)
  assert.equal(comparison.forYou[0]?.id, spriteId)
  await changeSharing(viewerId, friendId, "remove")
  assert.deepEqual(await getHelpers(viewerId), [])
  await assert.rejects(
    getComparison(viewerId, friendId),
    /shared collection is unavailable/,
  )
})

test("blocks remove relationships and prevent new requests", async () => {
  await requestFriendByHandle(viewerId, `blocked_${blockedId.slice(0, 6)}`)
  await changeSharing(blockedId, viewerId, "accept")
  await getComparison(viewerId, blockedId)
  await changeSharing(viewerId, blockedId, "block")
  assert.equal((await sharingFriends(blockedId)).length, 0)
  await assert.rejects(
    getComparison(viewerId, blockedId),
    /shared collection is unavailable/,
  )
  await assert.rejects(
    requestFriendByHandle(blockedId, `viewer_${viewerId.slice(0, 6)}`),
    /sharing relationship is unavailable/,
  )
})
