import "./env.js"
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"

const { db, pool } = await import("../src/db/client.ts")
const { user } = await import("../src/db/auth-schema.ts")
const { sprites, collectionEntries, friendships, blocks } =
  await import("../src/db/schema.ts")
const { changeSharing, getHelpers, getComparison, sharingFriends } =
  await import("../src/friends.ts")
const ids = [`A${randomUUID()}`, `a${randomUUID()}`, randomUUID()]
const [a, b, outsider] = ids as [string, string, string]
const spriteIds = [randomUUID(), randomUUID(), randomUUID()]
const [one, two, retired] = spriteIds as [string, string, string]

before(async () => {
  await db.insert(user).values(
    ids.map((id, i) => ({
      id,
      name: `Friend ${i}`,
      email: `${id}@test.invalid`,
      handle: `friend_${id.slice(0, 8)}`,
    })),
  )
  await db.insert(sprites).values(
    spriteIds.map((id, i) => ({
      id,
      slug: `sharing-${id}`,
      stableKey: `sharing:${id}`,
      baseName: `Sharing Sprite ${i}`,
      variantName: "Base",
      rarity: "Rare",
      releaseStatus: i === 2 ? ("retired" as const) : ("released" as const),
      sourceUrl: "https://example.test/sprite",
      sourceVerifiedAt: new Date(),
    })),
  )
  await db.insert(collectionEntries).values([
    { userId: a, spriteId: one, owned: true, mastered: true },
    { userId: b, spriteId: two, owned: true, mastered: false },
    { userId: b, spriteId: retired, owned: true },
  ])
})
after(async () => {
  await db.delete(user).where(inArray(user.id, ids))
  await db.delete(sprites).where(inArray(sprites.id, spriteIds))
  await pool.end()
})

test("ownership becomes available only after mutual sharing acceptance, regardless of mastery", async () => {
  await changeSharing(a, b, "request", [b])
  await changeSharing(a, b, "request", [b])
  assert.deepEqual(await getHelpers(a, [b]), [])
  await assert.rejects(changeSharing(a, b, "accept", [b]))
  await assert.rejects(getComparison(a, b, [b]))
  const local = [
    {
      id: b,
      name: "Friend B",
      appDisplayName: null,
      handle: "friend_b",
      fortniteDisplayName: null,
      epicId: "private",
    },
  ]
  assert.equal((await sharingFriends(a, local))[0]?.status, "outgoing")
  await changeSharing(b, a, "accept", [a])
  await changeSharing(b, a, "accept", [a])
  const helpers = await getHelpers(a, [b])
  assert.deepEqual(
    helpers.map((entry) => entry.spriteId),
    [two],
  )
  assert.equal(helpers[0]?.profile.id, b)
  assert.equal("epicId" in helpers[0]!.profile, false)
  const comparison = await getComparison(a, b, [b])
  assert.deepEqual(
    comparison.forYou.map((item) => item.id),
    [two],
  )
  assert.deepEqual(
    comparison.forFriend.map((item) => item.id),
    [one],
  )
  assert.deepEqual(await getHelpers(outsider, [a, b]), [])
  await assert.rejects(getComparison(outsider, b, [b]))
})

test("Epic omission and changed ownership immediately remove availability", async () => {
  assert.deepEqual(await getHelpers(a, []), [])
  await assert.rejects(getComparison(a, b, []))
  await db
    .update(collectionEntries)
    .set({ owned: false })
    .where(
      and(eq(collectionEntries.userId, b), eq(collectionEntries.spriteId, two)),
    )
  assert.deepEqual(await getHelpers(a, [b]), [])
  await db
    .update(collectionEntries)
    .set({ owned: true })
    .where(
      and(eq(collectionEntries.userId, b), eq(collectionEntries.spriteId, two)),
    )
  await changeSharing(a, b, "remove", [])
  assert.deepEqual(await getHelpers(a, [b]), [])
  await assert.rejects(getComparison(a, b, [b]))
})

test("concurrent acceptance and block cannot leave accepted sharing", async () => {
  await changeSharing(a, b, "request", [b])
  await Promise.allSettled([
    changeSharing(b, a, "accept", [a]),
    changeSharing(a, b, "block", [b]),
  ])
  const accepted = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        eq(friendships.userLowId, [a, b].sort()[0]!),
      ),
    )
  assert.equal(accepted.length, 0)
  assert.equal(
    (await db.select().from(blocks).where(eq(blocks.blockerId, a))).length,
    1,
  )
  assert.deepEqual(await getHelpers(a, [b]), [])
  assert.deepEqual(await getHelpers(b, [a]), [])
  await assert.rejects(changeSharing(b, a, "request", [a]))
  await changeSharing(a, b, "unblock", [])
  assert.deepEqual(await getHelpers(a, [b]), [])
})

test("concurrent request and block preserve exclusion; self and unrelated requests fail", async () => {
  await Promise.allSettled([
    changeSharing(a, b, "request", [b]),
    changeSharing(b, a, "block", [a]),
  ])
  assert.equal(
    (
      await db
        .select()
        .from(friendships)
        .where(eq(friendships.userLowId, [a, b].sort()[0]!))
    ).length,
    0,
  )
  await assert.rejects(changeSharing(a, a, "request", [a]))
  await assert.rejects(changeSharing(a, outsider, "request", []))
  await changeSharing(b, a, "unblock", [])
})
