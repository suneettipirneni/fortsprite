import "./env.js"
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { randomUUID } from "node:crypto"
import { Hono } from "hono"
import { eq, inArray } from "drizzle-orm"

const { db, pool } = await import("../src/db/client.ts")
const { user, rateLimit } = await import("../src/db/auth-schema.ts")
const { sprites } = await import("../src/db/schema.ts")
const { createCollectionRoutes } = await import("../src/collection-routes.ts")
const { createFriendRoutes } = await import("../src/friend-routes.ts")
const { createProfileRoutes } = await import("../src/profile-routes.ts")
const { epicRoutes } = await import("../src/epic/routes.ts")
const { DiscoveryRateLimitError } = await import("../src/rate-limit.ts")
const ids = [randomUUID(), randomUUID()]
const [owner, friend] = ids as [string, string]
const spriteId = randomUUID()
const handle = `route_${owner.slice(0, 8)}`
const session = async () => ({ user: { id: owner } })
const headers = {
  "content-type": "application/json",
  "x-test-context": "forwarded",
}
const refreshTime = "2026-09-06T00:00:00.000Z"

before(async () => {
  await db.insert(user).values(
    ids.map((id) => ({
      id,
      name: "Route fixture",
      email: `${id}@test.invalid`,
      handle: id === owner ? handle : `route_${id.slice(0, 8)}`,
    })),
  )
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
  await db.delete(user).where(inArray(user.id, ids))
  await db.delete(sprites).where(eq(sprites.id, spriteId))
  await db
    .delete(rateLimit)
    .where(eq(rateLimit.key, `friend-discovery:${owner}`))
  await pool.end()
})

test("collection routes use the injected helper lookup after session and query validation", async () => {
  let calls = 0
  const routes = createCollectionRoutes({
    database: db,
    getSession: session,
    getHelpers: async (received, viewerId, database) => {
      calls++
      assert.equal(received.get("x-test-context"), "forwarded")
      assert.equal(viewerId, owner)
      assert.equal(database, db)
      return {
        helpers: [
          {
            spriteId,
            profile: {
              id: friend,
              handle: "friend",
              displayName: "Friend",
              initials: "F",
              fortniteDisplayName: null,
            },
          },
        ],
        friendAvailability: {
          status: "ready" as const,
          refreshedAt: refreshTime,
        },
      }
    },
  })
  const app = new Hono().route("/alternate", routes)
  const response = await app.request("/alternate/collection?rarity=Rare", {
    headers,
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.deepEqual(body.friendAvailability, {
    status: "ready",
    refreshedAt: refreshTime,
  })
  assert.equal(
    body.items.find((item: { id: string }) => item.id === spriteId).helpers[0]
      .id,
    friend,
  )
  assert.equal(
    (await app.request("/alternate/collection?unknown=true", { headers }))
      .status,
    400,
  )
  assert.equal(calls, 1)
  const anonymous = createCollectionRoutes({
    getSession: async () => null,
    getHelpers: async () => {
      throw new Error("must not look up friends")
    },
  })
  assert.equal(
    (await anonymous.request("/collection?unknown=true")).status,
    401,
  )
})

test("collection routes distinguish empty ready availability from provider failure", async () => {
  for (const friendAvailability of [
    { status: "ready" as const, refreshedAt: refreshTime },
    { status: "unavailable" as const, refreshedAt: null },
  ]) {
    const routes = createCollectionRoutes({
      getSession: session,
      getHelpers: async () => ({ helpers: [], friendAvailability }),
    })
    const response = await routes.request("/collection")
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.deepEqual(body.friendAvailability, friendAvailability)
    assert.deepEqual(
      body.items.find((item: { id: string }) => item.id === spriteId).helpers,
      [],
    )
  }
})

test("query guards work under alternate prefixes without leaking onto unknown routes", async () => {
  const noProvider = async () => {
    throw new Error("must not call Epic")
  }
  const app = new Hono()
    .route(
      "/alternate",
      createFriendRoutes({ getSession: session, getFriends: noProvider }),
    )
    .route(
      "/alternate",
      createProfileRoutes({ getSession: session, deleteUser: noProvider }),
    )
    .route("/alternate", epicRoutes)
  for (const path of [
    "/friends?unknown=true",
    `/friends/${friend}/comparison?unknown=true`,
    "/me?unknown=true",
    "/epic/friends?unknown=true",
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
  const anonymous = createFriendRoutes({
    getSession: async () => null,
    getFriends: noProvider,
  })
  assert.equal((await anonymous.request("/friends?unknown=true")).status, 401)
})

test("privacy revocation and invalid mutations never require Epic lookup", async () => {
  let calls = 0
  const routes = createFriendRoutes({
    getSession: session,
    getFriends: async () => {
      calls++
      return { visible: [], local: [], localIds: [] }
    },
  })
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
  assert.equal(calls, 0)
})

test("friend discovery rate limits retain their HTTP retry contract", async () => {
  const routes = createFriendRoutes({
    getSession: session,
    getFriends: async () => {
      throw new DiscoveryRateLimitError(17)
    },
  })
  const response = await routes.request("/friends")
  assert.equal(response.status, 429)
  assert.equal(response.headers.get("retry-after"), "17")
  assert.equal((await response.json()).error.code, "RATE_LIMITED")
})

test("profile deletion honors the injected operation, confirmation, failures and cookie forwarding", async () => {
  let calls = 0
  let allow = false
  const routes = createProfileRoutes({
    getSession: session,
    deleteUser: async (received) => {
      calls++
      assert.equal(received.get("x-test-context"), "forwarded")
      return new Response(null, {
        status: allow ? 200 : 403,
        headers: allow ? { "set-cookie": "session=; Max-Age=0; Path=/" } : {},
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
  allow = true
  await db.insert(rateLimit).values({
    id: randomUUID(),
    key: `friend-discovery:${owner}`,
    count: 1,
    lastRequest: Date.now(),
  })
  const response = await remove(handle)
  assert.equal(response.status, 200)
  assert.equal(calls, 2)
  assert.ok(
    response.headers
      .getSetCookie()
      .some((cookie) => cookie.includes("Max-Age=0")),
  )
  assert.equal(
    (
      await db
        .select()
        .from(rateLimit)
        .where(eq(rateLimit.key, `friend-discovery:${owner}`))
    ).length,
    0,
  )
  assert.equal(
    (await db.select().from(user).where(eq(user.id, owner))).length,
    1,
  )
})
