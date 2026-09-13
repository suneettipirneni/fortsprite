import "./env.js"
import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import { createHmac, randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import { symmetricDecrypt } from "better-auth/crypto"

const { app } = await import("../src/app.ts")
const { auth } = await import("../src/auth.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, session, account, rateLimit } =
  await import("../src/db/auth-schema.ts")
const { friendships, blocks } = await import("../src/db/schema.ts")
const { createFriendRoutes } = await import("../src/friend-routes.ts")
const { EpicPermissionRequiredError } = await import("../src/epic/service.ts")
const { EpicApiError } = await import("../src/epic/client.ts")
const {
  mutationLimitKey,
  mutationBudgets,
  userRateLimitKeys,
  DiscoveryRateLimitError,
} = await import("../src/rate-limit.ts")
const { encryptStoredOAuthTokens } = await import("../src/token-migration.ts")
const ids = [randomUUID(), randomUUID(), randomUUID()]
const [owner, friend, stranger] = ids as [string, string, string]
const [low, high] = [owner, friend].sort() as [string, string]
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
  handle: `audit_${owner.slice(0, 8)}`,
  displayName: "Saved",
  fortniteDisplayName: null,
}
const accountId = randomUUID()

before(async () => {
  await db
    .insert(user)
    .values(
      ids.map((id) => ({
        id,
        name: "Audit",
        email: `${id}@test.invalid`,
        handle: `audit_${id.slice(0, 8)}`,
      })),
    )
  await db
    .insert(session)
    .values({
      id: randomUUID(),
      userId: owner,
      token,
      expiresAt: new Date(Date.now() + 3600000),
      updatedAt: new Date(),
    })
})
after(async () => {
  await db.delete(user).where(inArray(user.id, ids))
  await db
    .delete(rateLimit)
    .where(inArray(rateLimit.key, ids.flatMap(userRateLimitKeys)))
  await pool.end()
})

test("mutation budget is atomic, rejects before writes, expires, and isolates users and operations", async () => {
  const key = mutationLimitKey(owner, "profile")
  await db
    .insert(rateLimit)
    .values({
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
  assert.equal(responses.filter((r) => r.status === 200).length, 1)
  assert.equal(responses.filter((r) => r.status === 429).length, 7)
  assert.ok(
    responses
      .filter((r) => r.status === 429)
      .every((r) => Number(r.headers.get("retry-after")) > 0),
  )
  const rejected = await app.request("/api/v1/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...profile, displayName: "Must not persist" }),
  })
  assert.equal(rejected.status, 429)
  const [saved] = await db.select().from(user).where(eq(user.id, owner))
  assert.equal(saved?.appDisplayName, "Saved")
  const { createProfileRoutes } = await import("../src/profile-routes.ts")
  const other = createProfileRoutes({
    getSession: async () => ({ user: { id: stranger } }),
  })
  assert.equal(
    (
      await other.request("/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...profile,
          handle: `audit_${stranger.slice(0, 8)}`,
        }),
      })
    ).status,
    200,
  )
  // Profile exhaustion cannot consume the collection or privacy budget.
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
    .set({ lastRequest: Date.now() - 61000 })
    .where(eq(rateLimit.key, key))
  assert.equal((await save()).status, 200)
})

test("known relationships can be blocked despite provider outage, lost consent or discovery throttling", async () => {
  for (const failure of [
    new EpicApiError("Unavailable", 503),
    new EpicPermissionRequiredError(),
    new DiscoveryRateLimitError(60),
  ]) {
    await db.delete(blocks).where(eq(blocks.blockerId, owner))
    await db
      .insert(friendships)
      .values({
        userLowId: low,
        userHighId: high,
        requestedById: friend,
        status: "accepted",
      })
    let calls = 0
    const routes = createFriendRoutes({
      getSession: async () => ({ user: { id: owner } }),
      getFriends: async () => {
        calls++
        throw failure
      },
    })
    const response = await routes.request(`/friends/${friend}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "block" }),
    })
    assert.equal(response.status, 200)
    assert.equal(calls, 0)
    assert.equal(
      (
        await db
          .select()
          .from(friendships)
          .where(eq(friendships.userLowId, low))
      ).length,
      0,
    )
    assert.equal(
      (await db.select().from(blocks).where(eq(blocks.blockerId, owner)))
        .length,
      1,
    )
  }
})

test("unknown block targets still require Epic verification and cannot change unrelated identities", async () => {
  let calls = 0
  const routes = createFriendRoutes({
    getSession: async () => ({ user: { id: owner } }),
    getFriends: async () => {
      calls++
      return { localIds: [], local: [], visible: [] }
    },
  })
  assert.equal(
    (
      await routes.request(`/friends/${stranger}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "block" }),
      })
    ).status,
    404,
  )
  assert.equal(calls, 1)
  const rows = await db
    .select()
    .from(blocks)
    .where(eq(blocks.blockedId, stranger))
  assert.equal(rows.length, 0)
})

test("body budgets cover actual streams, forged lengths, chunked bodies, and authentication", async () => {
  const variants: Record<string, string>[] = [
    {},
    { "content-length": "1" },
    { "transfer-encoding": "chunked" },
  ]
  for (const extra of variants) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(" ".repeat(17000)))
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
  const authResponse = await app.request("/api/auth/sign-in/oauth2", {
    method: "POST",
    headers,
    body: " ".repeat(33000) + '{"providerId":"epic-games"}',
  })
  assert.equal(authResponse.status, 413)
  const valid = await app.request("/api/v1/profile", {
    method: "PUT",
    headers,
    body: JSON.stringify(profile),
  })
  assert.equal(valid.status, 200)
})

test("legacy OAuth credentials migrate to authenticated ciphertext and migration is repeatable", async () => {
  const accessToken = "a".repeat(64)
  const refreshToken = `legacy-refresh-${randomUUID()}`
  await db
    .insert(account)
    .values({
      id: accountId,
      userId: owner,
      providerId: "epic-games",
      accountId: randomUUID(),
      accessToken,
      refreshToken,
    })
  const { secretConfig } = await auth.$context
  await encryptStoredOAuthTokens(secretConfig)
  const [encrypted] = await db
    .select()
    .from(account)
    .where(eq(account.id, accountId))
  assert.ok(encrypted?.accessToken)
  assert.ok(encrypted.refreshToken)
  assert.ok(encrypted.accessToken.startsWith("$ba$"))
  assert.ok(encrypted.refreshToken.startsWith("$ba$"))
  assert.equal(
    await symmetricDecrypt({ key: secretConfig, data: encrypted.accessToken }),
    accessToken,
  )
  assert.equal(
    await symmetricDecrypt({ key: secretConfig, data: encrypted.refreshToken }),
    refreshToken,
  )
  await encryptStoredOAuthTokens(secretConfig)
  const [again] = await db
    .select()
    .from(account)
    .where(eq(account.id, accountId))
  assert.equal(again?.accessToken, encrypted.accessToken)
  assert.equal(again?.refreshToken, encrypted.refreshToken)
  assert.equal(typeof secretConfig, "object")
  if (typeof secretConfig !== "string") {
    await assert.rejects(
      encryptStoredOAuthTokens({
        ...secretConfig,
        keys: new Map([[1, "wrong-encryption-secret-never-use"]]),
      }),
    )
    const [unchanged] = await db
      .select()
      .from(account)
      .where(eq(account.id, accountId))
    assert.equal(unchanged?.accessToken, encrypted.accessToken)
  }
})
