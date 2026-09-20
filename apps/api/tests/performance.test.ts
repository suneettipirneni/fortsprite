import "./env.js"
import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { arch, cpus, platform } from "node:os"
import { performance } from "node:perf_hooks"
import { after, before, mock, test } from "node:test"
import { inArray } from "drizzle-orm"
import type { CollectionSnapshot } from "@workspace/contracts"

const fixtureId = randomUUID()
const viewerId = randomUUID()
const sessionToken = randomUUID()
const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
  .update(sessionToken)
  .digest("base64")
const headers = {
  cookie: `better-auth.session_token=${encodeURIComponent(`${sessionToken}.${signature}`)}`,
}
const friends = Array.from({ length: 100 }, (_, index) => ({
  id: randomUUID(),
  name: `Benchmark friend ${index}`,
}))
const spriteIds = Array.from({ length: 250 }, () => randomUUID())
const fixtureSpriteIds = new Set<string>(spriteIds)
const userIds = [viewerId, ...friends.map((friend) => friend.id)]

const { app } = await import("../src/app.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, session } = await import("../src/db/auth-schema.ts")
const { sprites, collectionEntries, friendships } =
  await import("../src/db/schema.ts")

before(async () => {
  await db.insert(user).values(
    userIds.map((id, index) => ({
      id,
      name: index === 0 ? "Benchmark viewer" : friends[index - 1]!.name,
      email: `${id}@benchmark.invalid`,
      handle: `perf_${id.replaceAll("-", "").slice(0, 16)}`,
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
      sourceSeasonId: 2_147_483_647,
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
  for (let offset = 0; offset < entries.length; offset += 1_000)
    await db.insert(collectionEntries).values(entries.slice(offset, offset + 1_000))
})

after(async () => {
  mock.restoreAll()
  await db.delete(user).where(inArray(user.id, userIds))
  await db.delete(sprites).where(inArray(sprites.id, spriteIds))
  await pool.end()
})

test("NFR-003 local collection aggregation stays below 500ms p95 with 250 Sprites and 100 friends", async (context) => {
  const querySpy = mock.method(pool, "query")
  const durations: number[] = []
  const queryCounts: number[] = []
  let catalogTotal = 0
  let responseBytes = 0

  for (let index = 0; index < 23; index++) {
    const queriesBefore = querySpy.mock.callCount()
    const startedAt = performance.now()
    const response = await app.request("/api/v1/collection", { headers })
    const body = await response.text()
    const snapshot = JSON.parse(body) as CollectionSnapshot
    const elapsed = performance.now() - startedAt
    const queryCount = querySpy.mock.callCount() - queriesBefore
    assert.equal(response.status, 200)
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
    assert.ok(
      queryCount > 0 && queryCount <= 8,
      `Expected bounded database reads, received ${queryCount}`,
    )
    if (index >= 3) {
      durations.push(elapsed)
      queryCounts.push(queryCount)
    }
    catalogTotal = snapshot.progress.total
    responseBytes = Buffer.byteLength(body)
  }

  const sorted = durations.toSorted((left, right) => left - right)
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1]!
  context.diagnostic(
    JSON.stringify({
      requirement: "NFR-003",
      transport: "in-process Hono with isolated Neon PostgreSQL",
      environment: {
        node: process.version,
        platform: platform(),
        arch: arch(),
        cpu: cpus()[0]?.model,
      },
      fixtureSprites: spriteIds.length,
      actualReleasedSprites: catalogTotal,
      acceptedFriends: friends.length,
      friendCollectionRows: 12_500,
      helpersPerFixtureSprite: 50,
      measuredRequests: durations.length,
      warmupRequests: 3,
      databaseQueriesPerRead: [...new Set(queryCounts)],
      responseBytes,
      p50Ms: Number(sorted[Math.ceil(sorted.length * 0.5) - 1]!.toFixed(2)),
      p95Ms: Number(p95.toFixed(2)),
      maxMs: Number(sorted.at(-1)!.toFixed(2)),
    }),
  )
  assert.ok(
    p95 < 500,
    `Collection API p95 was ${p95.toFixed(2)}ms; expected below 500ms`,
  )
})
