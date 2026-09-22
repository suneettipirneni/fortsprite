import "./env.js"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { eq, inArray } from "drizzle-orm"
import { Hono } from "hono"

const { db, pool } = await import("../src/db/client.ts")
const { user, rateLimit } = await import("../src/db/auth-schema.ts")
const { sprites } = await import("../src/db/schema.ts")
const { createCollectionRoutes } = await import("../src/collection-routes.ts")
const { createFriendRoutes } = await import("../src/friend-routes.ts")
const { createProfileRoutes } = await import("../src/profile-routes.ts")
const { readBudgets, readLimitKey, userRateLimitKeys } = await import(
  "../src/rate-limit.ts"
)

const owner = randomUUID()
const friend = randomUUID()
const spriteId = randomUUID()
const handle = `route_${owner.slice(0, 8)}`
const readSession = async () => ({ user: { id: owner } })
const headers = {
  "content-type": "application/json",
  "x-test-context": "forwarded",
}

before(async () => {
  await db.insert(user).values([
    {
      id: owner,
      name: "Route owner",
      email: `${owner}@test.invalid`,
      handle,
    },
    {
      id: friend,
      name: "Route friend",
      email: `${friend}@test.invalid`,
      handle: `route_${friend.slice(0, 8)}`,
    },
  ])
  await db.insert(sprites).values({
    id: spriteId,
    stableKey: spriteId,
    slug: spriteId,
    baseName: "Boundary fixture",
    variantName: "Base",
    rarity: "Rare",
    releaseStatus: "released",
    sourceUrl: "https://example.test/sprite",
    sourceVerifiedAt: new Date(),
  })
})

after(async () => {
  await db.delete(user).where(inArray(user.id, [owner, friend]))
  await db.delete(sprites).where(eq(sprites.id, spriteId))
  await db
    .delete(rateLimit)
    .where(
      inArray(rateLimit.key, [
        ...userRateLimitKeys(owner),
        ...userRateLimitKeys(friend),
      ]),
    )
  await pool.end()
})

test("collection routes call the injected helper reader only after authentication and query validation", async () => {
  let calls = 0
  const routes = createCollectionRoutes({
    database: db,
    getSession: readSession,
    readHelpers: async (viewerId, database) => {
      calls++
      assert.equal(viewerId, owner)
      assert.equal(database, db)
      return [
        {
          spriteId,
          mastered: true,
          profile: {
            id: friend,
            handle: "route_friend",
            displayName: "Route friend",
            initials: "RF",
            fortniteDisplayName: null,
          },
        },
      ]
    },
  })
  const app = new Hono().route("/alternate", routes)
  const response = await app.request("/alternate/collection?rarity=Rare", {
    headers,
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(
    body.items.find((item: { id: string }) => item.id === spriteId).helpers[0]
      .id,
    friend,
  )
  assert.equal(
    body.items.find((item: { id: string }) => item.id === spriteId).helpers[0]
      .mastered,
    true,
  )
  assert.equal(
    (await app.request("/alternate/collection?unknown=true", { headers }))
      .status,
    400,
  )
  assert.equal(calls, 1)

  const anonymous = createCollectionRoutes({
    getSession: async () => null,
    readHelpers: async () => {
      throw new Error("helper lookup must not run")
    },
  })
  assert.equal((await anonymous.request("/collection?unknown=true")).status, 401)
})

test("expensive reads stop before database work at the per-user budget", async () => {
  const collectionKey = readLimitKey(owner, "collection")
  const comparisonKey = readLimitKey(owner, "comparison")
  for (const [key, count] of [
    [collectionKey, readBudgets.collection],
    [comparisonKey, readBudgets.comparison],
  ] as const)
    await db
      .insert(rateLimit)
      .values({ id: randomUUID(), key, count, lastRequest: Date.now() })
      .onConflictDoUpdate({
        target: rateLimit.key,
        set: { count, lastRequest: Date.now() },
      })
  let helperCalls = 0
  const collection = createCollectionRoutes({
    getSession: readSession,
    readHelpers: async () => {
      helperCalls++
      return []
    },
  })
  const rejectedCollection = await collection.request("/collection")
  assert.equal(rejectedCollection.status, 429)
  assert.ok(Number(rejectedCollection.headers.get("retry-after")) > 0)
  assert.equal(helperCalls, 0)

  const friends = createFriendRoutes({ getSession: readSession })
  const rejectedComparison = await friends.request(
    `/friends/${friend}/comparison`,
  )
  assert.equal(rejectedComparison.status, 429)
  assert.ok(Number(rejectedComparison.headers.get("retry-after")) > 0)

  const peerCollection = createCollectionRoutes({
    getSession: async () => ({ user: { id: friend } }),
    readHelpers: async () => [],
  })
  assert.equal((await peerCollection.request("/collection")).status, 200)
})

test("query guards stay attached under alternate route prefixes", async () => {
  const app = new Hono()
    .route("/alternate", createFriendRoutes({ getSession: readSession }))
    .route("/alternate", createProfileRoutes({ getSession: readSession }))
  for (const path of [
    "/friends?unknown=true",
    `/friends/${friend}/comparison?unknown=true`,
    "/me?unknown=true",
    "/credentials?unknown=true",
  ])
    assert.equal((await app.request(`/alternate${path}`)).status, 400)
  assert.equal(
    (
      await app.request("/alternate/profile?unknown=true", {
        method: "PUT",
        headers,
        body: "{}",
      })
    ).status,
    400,
  )
  assert.equal(
    (await app.request("/alternate/missing?unknown=true")).status,
    404,
  )
  const anonymous = createFriendRoutes({ getSession: async () => null })
  assert.equal((await anonymous.request("/friends?unknown=true")).status, 401)
})

test("privacy revocation stays idempotent while invalid mutations fail closed", async () => {
  const routes = createFriendRoutes({ getSession: readSession })
  for (const action of ["remove", "decline", "unblock"])
    assert.equal(
      (
        await routes.request(`/friends/${friend}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action }),
        })
      ).status,
      200,
    )
  assert.equal(
    (
      await routes.request(`/friends/${friend}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "invalid" }),
      })
    ).status,
    400,
  )
})

test("profile deletion validates confirmation and forwards cleared cookies", async () => {
  let calls = 0
  let allowed = false
  const routes = createProfileRoutes({
    getSession: readSession,
    deleteUser: async (received) => {
      calls++
      assert.equal(received.get("x-test-context"), "forwarded")
      return new Response(null, {
        status: allowed ? 200 : 403,
        headers: allowed ? { "set-cookie": "session=; Max-Age=0; Path=/" } : {},
      })
    },
  })
  const remove = (confirmation: string) =>
    routes.request("/profile", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ confirmation }),
    })
  assert.equal((await remove("wrong_handle")).status, 400)
  assert.equal(calls, 0)
  assert.equal((await remove(handle)).status, 403)
  allowed = true
  const response = await remove(handle)
  assert.equal(response.status, 200)
  assert.equal(calls, 2)
  assert.ok(
    response.headers
      .getSetCookie()
      .some((cookie) => cookie.includes("Max-Age=0")),
  )
  assert.equal((await db.select().from(user).where(eq(user.id, owner))).length, 1)
})
