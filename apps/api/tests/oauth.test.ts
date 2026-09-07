import "./env.js"
import { after, test } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomBytes, randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"

type Grant = { challenge: string; profile: unknown; used: boolean }
type Flow = { code: string; state: string; cookie: string }

const grants = new Map<string, Grant>()
const tokens = new Map<string, unknown>()
const refreshTokens = new Set<string>()
const states = new Set<string>()
const userIds = new Set<string>()
const epicIds = new Set<string>()
const fixtureIp = `10.${[...randomBytes(3)].join(".")}`
const originalFetch = globalThis.fetch
let tokenExchanges = 0
let refreshExchanges = 0
let friendsAccessToken = ""

globalThis.fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)
  if (url.href === process.env.EPIC_OAUTH_TOKEN_URL) {
    assert.equal(request.method, "POST")
    assert.equal(
      request.headers.get("authorization"),
      `Basic ${Buffer.from(`${process.env.EPIC_OAUTH_CLIENT_ID}:${process.env.EPIC_OAUTH_CLIENT_SECRET}`).toString("base64")}`,
    )
    const body = new URLSearchParams(await request.text())
    let profile: unknown
    if (body.get("grant_type") === "refresh_token") {
      assert.ok(refreshTokens.has(body.get("refresh_token") ?? ""))
      refreshExchanges++
    } else {
      assert.equal(body.get("grant_type"), "authorization_code")
      const grant = grants.get(body.get("code") ?? "")
      if (!grant || grant.used) {
        return Response.json({ error: "invalid_grant" }, { status: 400 })
      }
      assert.equal(
        createHash("sha256")
          .update(body.get("code_verifier") ?? "")
          .digest("base64url"),
        grant.challenge,
      )
      assert.equal(
        body.get("redirect_uri"),
        "http://localhost:3000/api/auth/oauth2/callback/epic-games",
      )
      grant.used = true
      profile = grant.profile
      tokenExchanges++
    }
    const accessToken = randomUUID()
    const refreshToken = randomUUID()
    tokens.set(accessToken, profile)
    refreshTokens.add(refreshToken)
    return Response.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: "basic_profile friends_list",
    })
  }
  if (url.href === process.env.EPIC_OAUTH_USER_INFO_URL) {
    const token =
      request.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""
    assert.ok(tokens.has(token))
    return Response.json(tokens.get(token))
  }
  if (
    url.origin === "https://api.epicgames.dev" &&
    url.pathname.startsWith("/epic/friends/v1/")
  ) {
    friendsAccessToken =
      request.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""
    assert.ok(tokens.has(friendsAccessToken))
    return Response.json({ friends: [] })
  }
  throw new Error(
    `Unexpected network request in OAuth fixture: ${url.origin}${url.pathname}`,
  )
}

const { app } = await import("../src/app.js")
const { db, pool } = await import("../src/db/client.js")
const { account, user, session, verification, rateLimit } = await import(
  "../src/db/auth-schema.js"
)

after(async () => {
  globalThis.fetch = originalFetch
  if (epicIds.size) {
    const createdAccounts = await db
      .select({ userId: account.userId })
      .from(account)
      .where(inArray(account.accountId, [...epicIds]))
    for (const created of createdAccounts) userIds.add(created.userId)
  }
  if (userIds.size) await db.delete(user).where(inArray(user.id, [...userIds]))
  if (states.size)
    await db
      .delete(verification)
      .where(inArray(verification.identifier, [...states]))
  await db
    .delete(rateLimit)
    .where(
      inArray(rateLimit.key, [
        `${fixtureIp}|/sign-in/oauth2`,
        `${fixtureIp}|/oauth2/callback/epic-games`,
        ...[...userIds].map((id) => `friend-discovery:${id}`),
      ]),
    )
  await pool.end()
})

function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ")
}

async function start(profile: unknown): Promise<Flow> {
  if (
    typeof profile === "object" &&
    profile !== null &&
    "sub" in profile &&
    typeof profile.sub === "string"
  )
    epicIds.add(profile.sub)
  const response = await app.request(
    "http://localhost:3000/api/auth/sign-in/oauth2",
    {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
        "x-real-ip": fixtureIp,
      },
      body: JSON.stringify({
        providerId: "epic-games",
        callbackURL: "/collection",
        errorCallbackURL: "/sign-in",
      }),
    },
  )
  assert.equal(response.status, 200)
  const url = new URL((await response.json()).url)
  assert.equal(url.origin, "https://epic.example.test")
  assert.equal(url.searchParams.get("response_type"), "code")
  assert.equal(
    url.searchParams.get("client_id"),
    process.env.EPIC_OAUTH_CLIENT_ID,
  )
  assert.equal(url.searchParams.get("code_challenge_method"), "S256")
  assert.ok(url.searchParams.get("scope")?.includes("basic_profile"))
  const state = url.searchParams.get("state")!
  const challenge = url.searchParams.get("code_challenge")!
  assert.ok(state && challenge)
  states.add(state)
  const code = randomUUID()
  grants.set(code, { challenge, profile, used: false })
  const cookie = cookies(response)
  assert.ok(cookie.includes("better-auth.state="))
  return { code, state, cookie }
}

function callback(
  flow: Flow,
  cookie = flow.cookie,
  query = new URLSearchParams({ code: flow.code, state: flow.state }),
) {
  return app.request(
    `http://localhost:3000/api/auth/oauth2/callback/epic-games?${query}`,
    {
      headers: { cookie, "x-real-ip": fixtureIp },
    },
  )
}

async function assertSignedIn(response: Response) {
  assert.equal(response.status, 302)
  assert.equal(response.headers.get("location"), "/collection")
  const cookie = cookies(response)
  assert.ok(cookie.includes("better-auth.session_token="))
  const current = await app.request("/api/auth/get-session", {
    headers: { cookie },
  })
  assert.equal(current.status, 200)
  const body = await current.json()
  assert.ok(body.user.id)
  userIds.add(body.user.id)
  assert.equal("email" in body.user, false)
  assert.equal("token" in body.session, false)
  return { cookie, userId: body.user.id as string }
}

test("Epic OAuth uses PKCE, persists one account across logins, and refreshes expired access", async () => {
  const epicId = randomUUID().replaceAll("-", "")
  const first = await start({
    sub: epicId,
    preferred_username: "Epic Original",
  })
  const signedIn = await assertSignedIn(await callback(first))
  const [initialAccount] = await db
    .select()
    .from(account)
    .where(eq(account.userId, signedIn.userId))
  assert.equal(initialAccount?.accountId, epicId)
  assert.equal(initialAccount?.providerId, "epic-games")
  assert.ok(initialAccount?.accessToken)
  assert.ok(initialAccount?.refreshToken)
  assert.deepEqual(initialAccount?.scope?.split(",").sort(), [
    "basic_profile",
    "friends_list",
  ])
  assert.equal(
    (await db.select().from(session).where(eq(session.userId, signedIn.userId)))
      .length,
    1,
  )

  await db
    .update(user)
    .set({
      appDisplayName: "My collector name",
      fortniteDisplayName: "My game name",
    })
    .where(eq(user.id, signedIn.userId))
  const second = await start({
    sub: epicId,
    preferred_username: "Epic Renamed",
  })
  assert.notEqual(second.state, first.state)
  const returning = await assertSignedIn(await callback(second))
  assert.equal(returning.userId, signedIn.userId)
  const accounts = await db
    .select()
    .from(account)
    .where(eq(account.accountId, epicId))
  assert.equal(accounts.length, 1)
  const [profile] = await db
    .select()
    .from(user)
    .where(eq(user.id, signedIn.userId))
  assert.equal(profile?.name, "Epic Renamed")
  assert.equal(profile?.appDisplayName, "My collector name")
  assert.equal(profile?.fortniteDisplayName, "My game name")
  const viewer = await (
    await app.request("/api/v1/me", { headers: { cookie: returning.cookie } })
  ).json()
  assert.equal(viewer.viewer.displayName, "My collector name")
  assert.equal(viewer.viewer.epicDisplayName, "Epic Renamed")
  assert.deepEqual(viewer.viewer.epicPermissions, {
    basicProfile: true,
    friendsList: true,
  })

  await db
    .update(account)
    .set({ accessTokenExpiresAt: new Date(0) })
    .where(eq(account.userId, signedIn.userId))
  const beforeRefresh = refreshExchanges
  const friends = await app.request("/api/v1/epic/friends", {
    headers: { cookie: returning.cookie },
  })
  assert.equal(friends.status, 200)
  assert.deepEqual((await friends.json()).friends, [])
  assert.equal(refreshExchanges, beforeRefresh + 1)
  const [refreshed] = await db
    .select()
    .from(account)
    .where(eq(account.userId, signedIn.userId))
  assert.equal(refreshed?.accessToken, friendsAccessToken)
  assert.notEqual(refreshed?.accessToken, accounts[0]?.accessToken)
  assert.ok(
    refreshed?.accessTokenExpiresAt &&
      refreshed.accessTokenExpiresAt > new Date(),
  )

  const exchanges = tokenExchanges
  const replay = await callback(first)
  assert.equal(replay.status, 302)
  assert.ok(replay.headers.get("location")?.includes("error="))
  assert.equal(cookies(replay).includes("session_token="), false)
  assert.equal(tokenExchanges, exchanges)
  assert.equal(
    (await db.select().from(session).where(eq(session.userId, signedIn.userId)))
      .length,
    2,
  )
})

test("OAuth rejects missing cookies, cross-flow state, consent denial, and malformed Epic identity", async () => {
  const epicId = randomUUID().replaceAll("-", "")
  const first = await start({ sub: epicId, preferred_username: "Uncreated" })
  const other = await start({
    sub: randomUUID().replaceAll("-", ""),
    preferred_username: "Other",
  })
  const exchanges = tokenExchanges
  for (const cookie of ["", other.cookie, `${first.cookie}tampered`]) {
    const response = await callback(first, cookie)
    assert.equal(response.status, 302)
    assert.ok(response.headers.get("location")?.includes("error="))
    assert.equal(cookies(response).includes("session_token="), false)
  }
  const denied = await callback(
    first,
    first.cookie,
    new URLSearchParams({ state: first.state, error: "access_denied" }),
  )
  assert.equal(denied.status, 302)
  assert.ok(denied.headers.get("location")?.includes("error=access_denied"))
  assert.equal(tokenExchanges, exchanges)
  assert.equal(
    (await db.select().from(account).where(eq(account.accountId, epicId)))
      .length,
    0,
  )

  const expired = await start({ sub: epicId, preferred_username: "Uncreated" })
  const [storedState] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, expired.state))
  assert.ok(storedState)
  await db
    .update(verification)
    .set({
      expiresAt: new Date(0),
      value: JSON.stringify({ ...JSON.parse(storedState.value), expiresAt: 0 }),
    })
    .where(eq(verification.identifier, expired.state))
  const expiration = await callback(expired)
  assert.equal(expiration.status, 302)
  assert.ok(expiration.headers.get("location")?.includes("error="))
  assert.equal(tokenExchanges, exchanges)

  const badCode = await start({ sub: epicId, preferred_username: "Uncreated" })
  const rejectedCode = await callback({
    ...badCode,
    code: "invalid-fixture-code",
  })
  assert.equal(rejectedCode.status, 302)
  assert.ok(rejectedCode.headers.get("location")?.includes("error="))
  assert.equal(cookies(rejectedCode).includes("session_token="), false)
  assert.equal(tokenExchanges, exchanges)

  for (const profile of [
    { sub: "not-an-epic-id", preferred_username: "Invalid" },
    { sub: epicId },
  ]) {
    const flow = await start(profile)
    const response = await callback(flow)
    assert.equal(response.status, 302)
    assert.equal(
      response.headers.get("location"),
      "http://localhost:3000/sign-in?error=oauth",
    )
    assert.equal(cookies(response).includes("session_token="), false)
    assert.equal(
      (await db.select().from(account).where(eq(account.accountId, epicId)))
        .length,
      0,
    )
  }
})
