import "./env.js"
import { after, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
const { db, pool } = await import("../src/db/client.ts")
const { rateLimit } = await import("../src/db/auth-schema.ts")
const { consumeDiscoveryLimit } = await import("../src/rate-limit.ts")
const { app } = await import("../src/app.ts")
const userId = randomUUID()
const ip = `198.18.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`

after(async () => {
  await db
    .delete(rateLimit)
    .where(eq(rateLimit.key, `friend-discovery:${userId}`))
  await db.delete(rateLimit).where(eq(rateLimit.key, `${ip}|/sign-in/oauth2`))
  await pool.end()
})

test("discovery limit is atomic across concurrent database connections and expires", async () => {
  await db
    .insert(rateLimit)
    .values({
      id: randomUUID(),
      key: `friend-discovery:${userId}`,
      count: 119,
      lastRequest: Date.now(),
    })
  const attempts = await Promise.allSettled(
    Array.from({ length: 8 }, () => consumeDiscoveryLimit(userId)),
  )
  assert.equal(
    attempts.filter((result) => result.status === "fulfilled").length,
    1,
  )
  await db
    .update(rateLimit)
    .set({ lastRequest: Date.now() - 61000 })
    .where(eq(rateLimit.key, `friend-discovery:${userId}`))
  await consumeDiscoveryLimit(userId)
  const [counter] = await db
    .select()
    .from(rateLimit)
    .where(eq(rateLimit.key, `friend-discovery:${userId}`))
  assert.equal(counter?.count, 1)
})

test("Epic sign-in rate limit is enforced by Better Auth with a retry header", async () => {
  let last: Response | undefined
  for (let i = 0; i < 11; i++) {
    last = await app.request("/api/auth/sign-in/oauth2", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "x-real-ip": ip,
        "content-type": "application/json",
      },
      body: JSON.stringify({ providerId: "not-epic" }),
    })
  }
  assert.equal(last?.status, 429)
  assert.ok(Number(last?.headers.get("x-retry-after")) > 0)
})
