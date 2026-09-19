import "./env.js"
import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { eq, inArray } from "drizzle-orm"

const { app } = await import("../src/app.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, session, rateLimit } = await import("../src/db/auth-schema.ts")
const {
  mutationLimitKey,
  mutationBudgets,
  userRateLimitKeys,
} = await import("../src/rate-limit.ts")

const owner = randomUUID()
const other = randomUUID()
const token = randomUUID()
const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
  .update(token)
  .digest("base64")
const headers = {
  cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`,
  origin: "http://localhost:3000",
  "content-type": "application/json",
}
const profile = {
  handle: `security_${owner.slice(0, 8)}`,
  displayName: "Saved",
  fortniteDisplayName: null,
}

before(async () => {
  await db.insert(user).values([
    {
      id: owner,
      name: "Security owner",
      email: `${owner}@test.invalid`,
      handle: `owner_${owner.slice(0, 8)}`,
    },
    {
      id: other,
      name: "Security peer",
      email: `${other}@test.invalid`,
      handle: `peer_${other.slice(0, 8)}`,
    },
  ])
  await db.insert(session).values({
    id: randomUUID(),
    userId: owner,
    token,
    expiresAt: new Date(Date.now() + 3_600_000),
    updatedAt: new Date(),
  })
})

after(async () => {
  await db.delete(user).where(inArray(user.id, [owner, other]))
  await db
    .delete(rateLimit)
    .where(inArray(rateLimit.key, userRateLimitKeys(owner)))
  await db
    .delete(rateLimit)
    .where(inArray(rateLimit.key, userRateLimitKeys(other)))
  await pool.end()
})

test("mutation budgets are atomic, isolated by user and operation, and expire", async () => {
  const key = mutationLimitKey(owner, "profile")
  await db.insert(rateLimit).values({
    id: randomUUID(),
    key,
    count: mutationBudgets.profile - 1,
    lastRequest: Date.now(),
  })
  const save = () =>
    app.request("/api/v1/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify(profile),
    })
  const responses = await Promise.all(Array.from({ length: 8 }, save))
  assert.equal(responses.filter((response) => response.status === 200).length, 1)
  assert.equal(responses.filter((response) => response.status === 429).length, 7)
  assert.ok(
    responses
      .filter((response) => response.status === 429)
      .every((response) => Number(response.headers.get("retry-after")) > 0),
  )
  const [saved] = await db.select().from(user).where(eq(user.id, owner))
  assert.equal(saved?.appDisplayName, "Saved")

  const { createProfileRoutes } = await import("../src/profile-routes.ts")
  const peerRoutes = createProfileRoutes({
    getSession: async () => ({ user: { id: other } }),
  })
  assert.equal(
    (
      await peerRoutes.request("/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...profile,
          handle: `security_${other.slice(0, 8)}`,
        }),
      })
    ).status,
    200,
  )
  assert.equal(
    (
      await app.request(`/api/v1/collection/${randomUUID()}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ owned: true, mastered: false }),
      })
    ).status,
    404,
  )
  await db
    .update(rateLimit)
    .set({ lastRequest: Date.now() - 61_000 })
    .where(eq(rateLimit.key, key))
  assert.equal((await save()).status, 200)
})

test("payload limits inspect streamed bodies and protect API and auth routes", async () => {
  const variants: Record<string, string>[] = [
    {},
    { "content-length": "1" },
    { "transfer-encoding": "chunked" },
  ]
  for (const extra of variants) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(" ".repeat(17_000)))
        controller.enqueue(new TextEncoder().encode(JSON.stringify(profile)))
        controller.close()
      },
    })
    const response = await app.request(
      new Request("http://localhost:3000/api/v1/profile", {
        method: "PUT",
        headers: { ...headers, ...extra },
        body: stream,
        duplex: "half",
      } as RequestInit),
    )
    assert.equal(response.status, 413)
    assert.equal((await response.json()).error.code, "PAYLOAD_TOO_LARGE")
  }
  const authResponse = await app.request("/api/auth/passkey/verify-registration", {
    method: "POST",
    headers,
    body: " ".repeat(33_000) + JSON.stringify({ response: {} }),
  })
  assert.equal(authResponse.status, 413)
})
