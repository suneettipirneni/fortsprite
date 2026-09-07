import "./env.js"
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { eq, inArray, or } from "drizzle-orm"
const { app } = await import("../src/app.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, session, account } = await import("../src/db/auth-schema.ts")
const { collectionEntries, friendships, blocks, sprites } =
  await import("../src/db/schema.ts")
const spriteId = randomUUID()
const ids = [randomUUID(), randomUUID(), randomUUID()]
const [owner, other] = ids as [string, string, string]
const token = randomUUID()
const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
  .update(token)
  .digest("base64")
const headers = {
  cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`,
  origin: "http://localhost:3000",
  "content-type": "application/json",
}
const handle = `profile_${owner.slice(0, 8)}`
before(async () => {
  await db.insert(user).values(
    ids.map((id) => ({
      id,
      name: "Epic Name",
      email: `${id}@test.invalid`,
      handle: `original_${id.slice(0, 8)}`,
    })),
  )
  await db.insert(session).values({
    id: randomUUID(),
    token,
    userId: owner,
    expiresAt: new Date(Date.now() + 3600000),
    updatedAt: new Date(),
  })
  await db.insert(account).values({
    id: randomUUID(),
    userId: owner,
    accountId: randomUUID().replaceAll("-", ""),
    providerId: "epic-games",
    scope: "basic_profile,friends_list",
  })
})
after(async () => {
  await db.delete(user).where(inArray(user.id, ids))
  await db.delete(sprites).where(eq(sprites.id, spriteId))
  await pool.end()
})
const save = (body: unknown, requestHeaders = headers) =>
  app.request("/api/v1/profile", {
    method: "PUT",
    headers: requestHeaders,
    body: JSON.stringify(body),
  })

test("profile saves edited name separately from provider identity and survives fresh reads", async () => {
  const response = await save({
    handle,
    displayName: "My app name",
    fortniteDisplayName: "My Fortnite name",
  })
  assert.equal(response.status, 200)
  await db.update(user).set({ name: "New Epic Name" }).where(eq(user.id, owner))
  const viewer = (await (await app.request("/api/v1/me", { headers })).json())
    .viewer
  assert.equal(viewer.displayName, "My app name")
  assert.deepEqual(viewer.epicPermissions, {
    basicProfile: true,
    friendsList: true,
  })
  assert.equal(viewer.epicDisplayName, "New Epic Name")
  assert.equal(viewer.fortniteDisplayName, "My Fortnite name")
  assert.equal(viewer.handle, handle)
  assert.equal(
    (
      await save({
        handle,
        displayName: "My app name",
        fortniteDisplayName: null,
      })
    ).status,
    200,
  )
})

test("profile boundary rejects invalid fields, cross-origin writes and unauthenticated writes", async () => {
  const valid = { handle, displayName: "Collector", fortniteDisplayName: null }
  for (const body of [
    { ...valid, userId: other },
    { ...valid, displayName: " " },
    { ...valid, displayName: "hello\u0001" },
    { ...valid, handle: "ab" },
    { ...valid, handle: "has space" },
    { ...valid, fortniteDisplayName: "x".repeat(61) },
  ])
    assert.equal((await save(body)).status, 400)
  assert.equal((await save(valid, { ...headers, cookie: "" })).status, 401)
  assert.equal(
    (await save(valid, { ...headers, origin: "https://attacker.test" })).status,
    403,
  )
  const [untouched] = await db.select().from(user).where(eq(user.id, other))
  assert.equal(untouched?.appDisplayName, null)
})

test("case-insensitive handle collision returns actionable conflict without partial updates", async () => {
  const taken = `taken_${owner.slice(0, 8)}`
  await db.update(user).set({ handle: taken }).where(eq(user.id, other))
  assert.equal(
    (
      await save({
        handle: taken.toUpperCase(),
        displayName: "Should not save",
        fortniteDisplayName: null,
      })
    ).status,
    409,
  )
  const [profile] = await db.select().from(user).where(eq(user.id, owner))
  assert.equal(profile?.handle, handle)
  assert.equal(profile?.appDisplayName, "My app name")
})

test("account deletion requires confirmation and a fresh session, then revokes access", async () => {
  const remove = (confirmation: string) =>
    app.request("/api/v1/profile", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ confirmation }),
    })
  assert.equal((await remove("wrong_handle")).status, 400)
  await db
    .update(session)
    .set({ createdAt: new Date(Date.now() - 172800000) })
    .where(eq(session.userId, owner))
  assert.equal((await remove(handle)).status, 403)
  assert.equal(
    (await db.select().from(user).where(eq(user.id, owner))).length,
    1,
  )
  await db
    .update(session)
    .set({ createdAt: new Date() })
    .where(eq(session.userId, owner))
  await db.insert(sprites).values({
    id: spriteId,
    stableKey: spriteId,
    slug: spriteId,
    baseName: "Deletion fixture",
    variantName: "Base",
    rarity: "Common",
    sourceUrl: "https://example.test/sprite",
    sourceVerifiedAt: new Date(),
  })
  await db.insert(collectionEntries).values([
    { userId: owner, spriteId, owned: true },
    { userId: other, spriteId, owned: true },
  ])
  const pair = [owner, other].sort()
  await db.insert(friendships).values({
    userLowId: pair[0]!,
    userHighId: pair[1]!,
    requestedById: other,
    status: "accepted",
  })
  await db.insert(blocks).values([
    { blockerId: owner, blockedId: ids[2]! },
    { blockerId: ids[2]!, blockedId: owner },
  ])
  const result = await remove(handle)
  assert.equal(result.status, 200)
  assert.ok(
    result.headers
      .getSetCookie()
      .some((cookie) => cookie.includes("Max-Age=0")),
  )
  for (const [table, condition] of [
    [user, eq(user.id, owner)],
    [session, eq(session.userId, owner)],
    [account, eq(account.userId, owner)],
    [collectionEntries, eq(collectionEntries.userId, owner)],
    [
      friendships,
      or(eq(friendships.userLowId, owner), eq(friendships.userHighId, owner)),
    ],
    [blocks, or(eq(blocks.blockerId, owner), eq(blocks.blockedId, owner))],
  ] as const)
    assert.equal((await db.select().from(table).where(condition)).length, 0)
  assert.equal(
    (
      await db
        .select()
        .from(collectionEntries)
        .where(eq(collectionEntries.userId, other))
    ).length,
    1,
  )
  assert.equal(
    (await app.request("/api/v1/collection", { headers })).status,
    401,
  )
})
