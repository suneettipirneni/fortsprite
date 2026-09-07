import "./env.js"
import { after, before, mock, test } from "node:test"
import assert from "node:assert/strict"
import { createHmac, randomBytes, randomUUID } from "node:crypto"
import { performance } from "node:perf_hooks"
import { cpus, platform, arch } from "node:os"
import { eq, inArray } from "drizzle-orm"
import type { CollectionSnapshot } from "@workspace/contracts"

const fixtureId = randomUUID()
const viewerId = randomUUID()
const viewerEpicId = randomUUID().replaceAll("-", "")
const fixtureIp = `10.${[...randomBytes(3)].join(".")}`
const sessionToken = randomUUID()
const epicToken = randomUUID()
const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
  .update(sessionToken)
  .digest("base64")
const headers = {
  cookie: `better-auth.session_token=${encodeURIComponent(`${sessionToken}.${signature}`)}`,
  "x-real-ip": fixtureIp,
}
const friends = Array.from({ length: 100 }, (_, index) => ({
  id: randomUUID(),
  epicId: randomUUID().replaceAll("-", ""),
  name: `Benchmark friend ${index}`,
}))
const friendsByEpicId = new Map(
  friends.map((friend) => [friend.epicId, friend]),
)
const spriteIds = Array.from({ length: 250 }, () => randomUUID())
const fixtureSpriteIds = new Set<string>(spriteIds)
const userIds = [viewerId, ...friends.map((friend) => friend.id)]
const networkCalls: { endpoint: "friends" | "accounts"; accounts: string[] }[] =
  []
const unexpectedNetworkCalls: string[] = []
const originalFetch = globalThis.fetch

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  assert.equal(request.headers.get("authorization"), `Bearer ${epicToken}`)
  if (
    url.href === `https://api.epicgames.dev/epic/friends/v1/${viewerEpicId}`
  ) {
    networkCalls.push({ endpoint: "friends", accounts: [] })
    return Response.json({
      friends: friends.map((friend) => ({
        accountId: friend.epicId,
        created: "2026-01-01T00:00:00Z",
        favorite: false,
      })),
    })
  }
  if (
    url.origin === "https://api.epicgames.dev" &&
    url.pathname === "/epic/id/v2/accounts"
  ) {
    const accounts = url.searchParams.getAll("accountId")
    networkCalls.push({ endpoint: "accounts", accounts })
    assert.equal(accounts.length, 50)
    return Response.json(
      accounts.map((accountId) => {
        const friend = friendsByEpicId.get(accountId)
        assert.ok(friend)
        return { accountId, displayName: friend.name }
      }),
    )
  }
  unexpectedNetworkCalls.push(`${url.origin}${url.pathname}`)
  throw new Error("Unexpected upstream request in collection benchmark")
}

const { app } = await import("../src/app.js")
const { db, pool } = await import("../src/db/client.js")
const { user, account, session, rateLimit } =
  await import("../src/db/auth-schema.js")
const { sprites, collectionEntries, friendships } =
  await import("../src/db/schema.js")

before(async () => {
  await db.insert(user).values(
    userIds.map((id, index) => ({
      id,
      name: index === 0 ? "Benchmark viewer" : friends[index - 1]!.name,
      email: `${id}@benchmark.invalid`,
      handle: `perf_${id.replaceAll("-", "").slice(0, 16)}`,
    })),
  )
  await db.insert(account).values(
    userIds.map((userId, index) => ({
      id: randomUUID(),
      userId,
      accountId: index === 0 ? viewerEpicId : friends[index - 1]!.epicId,
      providerId: "epic-games",
      scope: "basic_profile,friends_list",
      accessToken: index === 0 ? epicToken : null,
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
    })),
  )
  await db.insert(session).values({
    id: randomUUID(),
    token: sessionToken,
    userId: viewerId,
    expiresAt: new Date(Date.now() + 3_600_000),
    updatedAt: new Date(),
  })
  await db.insert(sprites).values(
    spriteIds.map((id, index) => ({
      id,
      stableKey: `benchmark:${fixtureId}:${index}`,
      slug: `benchmark-${fixtureId}-${index}`,
      baseName: `Benchmark Sprite ${index}`,
      variantName: "Base",
      rarity: "Rare",
      releaseStatus: "released" as const,
      sourceUrl: "https://example.test/benchmark",
      sourceVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    })),
  )
  await db.insert(friendships).values(
    friends.map((friend) => {
      const [userLowId, userHighId] = [viewerId, friend.id].sort()
      return {
        userLowId: userLowId!,
        userHighId: userHighId!,
        requestedById: viewerId,
        status: "accepted" as const,
        respondedAt: new Date(),
      }
    }),
  )
  const entries = friends.flatMap((friend, friendIndex) =>
    spriteIds.flatMap((spriteId, spriteIndex) =>
      (friendIndex + spriteIndex) % 2 === 0
        ? [
            {
              userId: friend.id,
              spriteId,
              owned: true,
              mastered: spriteIndex % 5 === 0,
            },
          ]
        : [],
    ),
  )
  assert.equal(entries.length, 12_500)
  for (let offset = 0; offset < entries.length; offset += 1000) {
    await db
      .insert(collectionEntries)
      .values(entries.slice(offset, offset + 1000))
  }
})

after(async () => {
  mock.restoreAll()
  globalThis.fetch = originalFetch
  await db.delete(user).where(inArray(user.id, userIds))
  await db.delete(sprites).where(inArray(sprites.id, spriteIds))
  await db
    .delete(rateLimit)
    .where(eq(rateLimit.key, `friend-discovery:${viewerId}`))
  await pool.end()
})

test("NFR-003 collection p95 stays below 500ms with 250 Sprites and 100 accepted friends", async (context) => {
  const querySpy = mock.method(pool, "query")
  const durations: number[] = []
  const queryCounts: number[] = []
  let catalogTotal = 0
  let responseBytes = 0

  for (let index = 0; index < 23; index++) {
    const queriesBefore = querySpy.mock.callCount()
    const upstreamBefore = networkCalls.length
    const startedAt = performance.now()
    const response = await app.request("/api/v1/collection", { headers })
    const body = await response.text()
    const snapshot = JSON.parse(body) as CollectionSnapshot
    const elapsed = performance.now() - startedAt
    const queryCount = querySpy.mock.callCount() - queriesBefore
    assert.equal(response.status, 200)
    assert.equal(snapshot.friendAvailability.status, "ready")
    assert.ok(snapshot.progress.total >= 250)
    assert.equal(snapshot.items.length, snapshot.progress.total)
    const fixtureItems = snapshot.items.filter((item) =>
      fixtureSpriteIds.has(item.id),
    )
    assert.equal(fixtureItems.length, 250)
    assert.ok(fixtureItems.every((item) => item.helpers.length === 50))
    assert.deepEqual(
      new Set(
        fixtureItems.flatMap((item) => item.helpers.map((helper) => helper.id)),
      ),
      new Set(friends.map((friend) => friend.id)),
    )
    const upstream = networkCalls.slice(upstreamBefore)
    assert.deepEqual(upstream.map((call) => call.endpoint).sort(), [
      "accounts",
      "accounts",
      "friends",
    ])
    assert.deepEqual(
      new Set(upstream.flatMap((call) => call.accounts)),
      new Set(friends.map((friend) => friend.epicId)),
    )
    assert.ok(
      queryCount > 0 && queryCount <= 18,
      `Expected bounded database reads, received ${queryCount}`,
    )
    assert.deepEqual(unexpectedNetworkCalls, [])
    if (index >= 3) {
      durations.push(elapsed)
      queryCounts.push(queryCount)
    }
    catalogTotal = snapshot.progress.total
    responseBytes = Buffer.byteLength(body)
  }

  const sorted = durations.toSorted((left, right) => left - right)
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1]!
  const report = {
    requirement: "NFR-003",
    transport: "in-process Epic fixture; live PostgreSQL and Hono handler",
    environment: {
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
    },
    fixtureSprites: spriteIds.length,
    actualReleasedSprites: catalogTotal,
    acceptedCurrentFriends: friends.length,
    friendCollectionRows: 12_500,
    helpersPerFixtureSprite: 50,
    measuredRequests: durations.length,
    warmupRequests: 3,
    upstreamRequestsPerRead: 3,
    accountBatchSizes: [50, 50],
    databaseQueriesPerRead: [...new Set(queryCounts)],
    responseBytes,
    p50Ms: Number(sorted[Math.ceil(sorted.length * 0.5) - 1]!.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    maxMs: Number(sorted.at(-1)!.toFixed(2)),
  }
  context.diagnostic(JSON.stringify(report))
  assert.ok(
    p95 < 500,
    `Collection API p95 was ${p95.toFixed(2)}ms; expected below 500ms`,
  )
})
