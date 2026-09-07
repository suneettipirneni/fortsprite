import "./env.js"
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"

const { app } = await import("../src/app.js")
const { db, pool } = await import("../src/db/client.js")
const { user, session, account } = await import("../src/db/auth-schema.js")
const { sprites, collectionEntries } = await import("../src/db/schema.js")
const userId = randomUUID()
const otherId = randomUUID()
const spriteId = randomUUID()
const token = randomUUID()
const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
  .update(token)
  .digest("base64")
const cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`
const headers = {
  cookie,
  origin: "http://localhost:3000",
  "content-type": "application/json",
}

before(async () => {
  await db.insert(user).values([
    {
      id: userId,
      name: "Test collector",
      email: `${userId}@test.invalid`,
      handle: `test_${userId.slice(0, 8)}`,
    },
    {
      id: otherId,
      name: "Other collector",
      email: `${otherId}@test.invalid`,
      handle: `test_${otherId.slice(0, 8)}`,
    },
  ])
  await db.insert(session).values({
    id: randomUUID(),
    token,
    userId,
    expiresAt: new Date(Date.now() + 3_600_000),
    updatedAt: new Date(),
  })
  await db.insert(account).values({
    id: randomUUID(),
    userId,
    accountId: randomUUID().replaceAll("-", ""),
    providerId: "epic-games",
    scope: "basic_profile",
  })
  await db.insert(sprites).values({
    id: spriteId,
    slug: `test-${spriteId}`,
    stableKey: `test:${spriteId}`,
    baseName: "Test Sprite",
    variantName: "Base",
    rarity: "Rare",
    releaseStatus: "released",
    sourceUrl: "https://example.test/sprite",
    sourceVerifiedAt: new Date(),
  })
})

after(async () => {
  await db.delete(user).where(eq(user.id, userId))
  await db.delete(user).where(eq(user.id, otherId))
  await db.delete(sprites).where(eq(sprites.id, spriteId))
  await pool.end()
})

async function put(state: unknown, requestHeaders = headers) {
  return app.request(`/api/v1/collection/${spriteId}`, {
    method: "PUT",
    headers: requestHeaders,
    body: JSON.stringify(state),
  })
}

test("real Better Auth session protects collection reads", async () => {
  assert.equal((await app.request("/api/v1/collection")).status, 401)
  assert.equal(
    (
      await app.request("/api/v1/collection", {
        headers: { cookie: "better-auth.session_token=forged" },
      })
    ).status,
    401,
  )
  const response = await app.request("/api/v1/collection", { headers })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("cache-control"), "no-store")
  const body = await response.json()
  const item = body.items.find((value: { id: string }) => value.id === spriteId)
  assert.equal(item.owned, false)
  assert.equal(item.mastered, false)
  assert.equal("canHelp" in item, false)
  assert.deepEqual(body.friendAvailability, {
    status: "unavailable",
    refreshedAt: null,
  })
})

test("committed desired state survives independent reads and clears dependent flags", async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await put({ owned: true, mastered: true })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).entry.mastered, true)
  }
  const entries = await db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.userId, userId))
  assert.equal(entries.length, 1)
  const snapshot = await (
    await app.request("/api/v1/collection", { headers })
  ).json()
  assert.equal(
    snapshot.items.find((item: { id: string }) => item.id === spriteId).owned,
    true,
  )
  assert.equal((await put({ owned: false, mastered: false })).status, 200)
  const [entry] = await db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.userId, userId))
  assert.equal(entry?.owned, false)
  assert.equal(entry?.mastered, false)
})

test("invalid states and client-supplied owners cannot mutate any collection", async () => {
  assert.equal((await put({ owned: false, mastered: true })).status, 400)
  assert.equal(
    (
      await put({
        owned: true,
        mastered: false,
        userId: otherId,
      })
    ).status,
    400,
  )
  assert.equal((await put({ owned: true })).status, 400)
  assert.equal(
    (await put({ owned: true, mastered: false, canHelp: true })).status,
    400,
  )
  assert.equal(
    (await app.request("/api/v1/collection?owner=someone", { headers })).status,
    400,
  )
  assert.equal(
    (
      await app.request(`/api/v1/collection/not-a-uuid`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ owned: true, mastered: false }),
      })
    ).status,
    400,
  )
  assert.equal(
    (
      await db
        .select()
        .from(collectionEntries)
        .where(eq(collectionEntries.userId, otherId))
    ).length,
    0,
  )
})

test("cross-origin and missing-origin writes are rejected before persistence", async () => {
  const state = { owned: true, mastered: false }
  assert.equal(
    (await put(state, { ...headers, origin: "https://attacker.test" })).status,
    403,
  )
  assert.equal((await put(state, { ...headers, origin: "" })).status, 403)
})

test("unreleased and retired catalog items cannot be updated", async () => {
  for (const releaseStatus of ["unreleased", "retired"] as const) {
    await db
      .update(sprites)
      .set({ releaseStatus })
      .where(eq(sprites.id, spriteId))
    assert.equal((await put({ owned: true, mastered: false })).status, 404)
    const snapshot = await (
      await app.request("/api/v1/collection", { headers })
    ).json()
    assert.equal(
      snapshot.items.some((item: { id: string }) => item.id === spriteId),
      false,
    )
  }
  await db
    .update(sprites)
    .set({ releaseStatus: "released" })
    .where(eq(sprites.id, spriteId))
})

test("database constraints reject dependent flags for missing entries", async () => {
  await assert.rejects(
    db
      .update(collectionEntries)
      .set({ owned: false, mastered: true })
      .where(eq(collectionEntries.userId, userId)),
  )
})

test("parallel desired-state writes preserve one valid row", async () => {
  const states = [
    { owned: true, mastered: true },
    { owned: false, mastered: false },
    { owned: true, mastered: false },
  ]
  const responses = await Promise.all(states.map((state) => put(state)))
  assert.ok(responses.every((response) => response.status === 200))
  const entries = await db
    .select()
    .from(collectionEntries)
    .where(eq(collectionEntries.userId, userId))
  assert.equal(entries.length, 1)
  const entry = entries[0]!
  assert.ok(entry.owned || !entry.mastered)
})

test("browser auth responses hide provider identity and token operations", async () => {
  const response = await app.request("/api/auth/get-session", { headers })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.user.id, userId)
  assert.equal("email" in body.user, false)
  assert.equal("token" in body.session, false)
  for (const path of [
    "get-access-token",
    "list-accounts",
    "sign-in/email",
    "sign-up/email",
  ]) {
    assert.equal(
      (
        await app.request(`/api/auth/${path}`, {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      404,
    )
  }
})

test("invalid OAuth callback state cannot create an account or session", async () => {
  const response = await app.request(
    "/api/auth/oauth2/callback/epic-games?code=forged&state=forged",
  )
  assert.equal(response.status, 302)
  assert.ok(response.headers.get("location")?.includes("error"))
  assert.equal(response.headers.get("location")?.includes("code=forged"), false)
})

test("sign out revokes the actual session used by collection endpoints", async () => {
  const response = await app.request("/api/auth/sign-out", {
    method: "POST",
    headers,
    body: "{}",
  })
  assert.equal(response.status, 200)
  assert.equal(
    (await app.request("/api/v1/collection", { headers })).status,
    401,
  )
})
