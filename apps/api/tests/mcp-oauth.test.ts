import "./env.js"
import { after, before, beforeEach, test } from "node:test"
import assert from "node:assert/strict"
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"

const { app } = await import("../src/app.ts")
const { auth } = await import("../src/auth.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, session, rateLimit } = await import("../src/db/auth-schema.ts")
const { oauthClient, oauthAccessToken } = await import("../src/db/oauth-schema.ts")
const { mcpResource, mcpIssuer } = await import("../src/mcp-oauth.ts")
const { sprites, collectionEntries } = await import("../src/db/schema.ts")
const { userRateLimitKeys } = await import("../src/rate-limit.ts")
const spriteId = randomUUID()
const owners = [randomUUID(), randomUUID()]
const sessions = owners.map(() => randomUUID())
const clients: string[] = []
let fixtureIp = `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`
const fixtureIps: string[] = []
beforeEach(() => { fixtureIp = `198.18.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`; fixtureIps.push(fixtureIp) })
const callback = "https://assistant.test/oauth/callback"
const fullScope = "collection:read collection:write offline_access"

function headers(index = 0) {
  const token = sessions[index]!
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")
  return { cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`, origin: "http://localhost:3000", "content-type": "application/json" }
}
function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set("x-real-ip", fixtureIp)
  return app.request(`http://localhost:3000${path}`, { ...init, headers })
}
async function register(confidential = false) {
  const response = await request("/api/auth/oauth2/register", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      client_name: "OAuth fixture", redirect_uris: [callback], token_endpoint_auth_method: confidential ? "client_secret_post" : "none",
      grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], scope: fullScope, ...(confidential ? { require_pkce: false } : {}),
    }),
  })
  const body = await response.json()
  assert.equal(response.status, 201, JSON.stringify(body))
  clients.push(body.client_id)
  return body as { client_id: string; client_secret?: string }
}
function authorization(client: { client_id: string }, scope = fullScope) {
  const verifier = randomBytes(32).toString("base64url")
  const query = new URLSearchParams({ client_id: client.client_id, redirect_uri: callback, response_type: "code", scope,
    resource: mcpResource, state: randomUUID(), code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256", prompt: "consent" })
  return { verifier, path: `/api/auth/oauth2/authorize?${query}` }
}
async function consent(client: { client_id: string }, scope = fullScope) {
  const flow = authorization(client, scope)
  const authorized = await request(flow.path, { headers: headers() })
  const url = authorized.headers.get("location") ?? (await authorized.json()).url
  assert.equal(typeof url, "string")
  assert.equal(new URL(url, "http://localhost:3000").pathname, "/mcp/consent")
  const query = new URL(url, "http://localhost:3000").search.slice(1)
  const preview = await request(`/api/v1/mcp-oauth/consent?${new URLSearchParams({ oauth_query: query })}`, { headers: headers() })
  const previewBody = await preview.json()
  assert.equal(preview.status, 200, JSON.stringify(previewBody))
  assert.equal(previewBody.client.id, client.client_id)
  assert.equal(previewBody.client.redirectHost, "assistant.test")
  const accepted = await request("/api/auth/oauth2/consent", { method: "POST", headers: headers(), body: JSON.stringify({ accept: true, oauth_query: query }) })
  const acceptedBody = await accepted.json()
  assert.equal(accepted.status, 200, JSON.stringify(acceptedBody))
  const result = new URL(acceptedBody.url)
  assert.equal(result.origin + result.pathname, callback)
  assert.equal(result.searchParams.get("error"), null, result.toString())
  return { code: result.searchParams.get("code")!, verifier: flow.verifier, query }
}
async function token(client: { client_id: string; client_secret?: string }, params: Record<string, string>) {
  return request("/api/auth/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: client.client_id, ...(client.client_secret ? { client_secret: client.client_secret } : {}), resource: mcpResource, ...params }) })
}
async function connect(client: { client_id: string; client_secret?: string }, scope = fullScope) {
  const code = await consent(client, scope)
  const response = await token(client, { grant_type: "authorization_code", code: code.code, code_verifier: code.verifier, redirect_uri: callback })
  const body = await response.json()
  assert.equal(response.status, 200, JSON.stringify(body))
  return body as { access_token: string; refresh_token: string; scope: string }
}
async function verified(token: string) {
  try { return await auth.api.verifyMcpOAuthToken({ body: { token } }) } catch { return null }
}
async function grant(clientId: string) {
  const response = await request("/api/v1/mcp-oauth/grants", { headers: headers() })
  assert.equal(response.status, 200)
  return (await response.json()).grants.find((item: { clientId: string }) => item.clientId === clientId)
}
async function disconnect(clientId: string) {
  const existing = await grant(clientId)
  const response = await request(`/api/v1/mcp-oauth/grants/${existing.id}`, { method: "DELETE", headers: headers() })
  assert.equal(response.status, 200, await response.text())
}

before(async () => {
  await db.insert(sprites).values({ id: spriteId, stableKey: spriteId, slug: `oauth-${spriteId}`, baseName: "OAuth fixture", variantName: "Normal", rarity: "Rare", releaseStatus: "released", sourceUrl: "https://example.com/sprite", sourceVerifiedAt: new Date() })
  await db.insert(user).values(owners.map((id) => ({ id, name: "OAuth fixture", email: `${id}@test.invalid`, handle: `oauth_${id.slice(0, 8)}` })))
  await db.insert(session).values(owners.map((id, i) => ({ id: randomUUID(), token: sessions[i]!, userId: id, expiresAt: new Date(Date.now() + 3600000), updatedAt: new Date() })))
})
after(async () => {
  await db.delete(rateLimit).where(inArray(rateLimit.key, [...owners.flatMap(userRateLimitKeys), ...fixtureIps.flatMap((ip) => ["/oauth2/register", "/oauth2/authorize", "/oauth2/token", "/oauth2/consent", "/oauth2/revoke"].map((path) => `${ip}|${path}`))]))
  await db.delete(user).where(inArray(user.id, owners))
  await db.delete(sprites).where(eq(sprites.id, spriteId))
  if (clients.length) await db.delete(oauthClient).where(inArray(oauthClient.clientId, clients))
  await pool.end()
})

test("protected discovery challenges and advertises a matching resource and OAuth issuer", async () => {
  const challenge = await request("/api/mcp/collection", { method: "POST", headers: headers(), body: "{}" })
  assert.equal(challenge.status, 401)
  assert.match(challenge.headers.get("www-authenticate")!, /oauth-protected-resource\/api\/mcp\/collection/)
  const metadata = await (await request("/.well-known/oauth-protected-resource/api/mcp/collection")).json()
  assert.equal(metadata.resource, mcpResource)
  const issuer = await (await request("/.well-known/oauth-authorization-server/api/auth")).json()
  assert.equal(issuer.issuer, mcpIssuer)
  assert.equal(issuer.registration_endpoint, `${mcpIssuer}/oauth2/register`)
  assert.deepEqual(issuer.grant_types_supported, ["authorization_code", "refresh_token"])
})

test("public and confidential clients complete signed consent, PKCE, token and refresh flows", async () => {
  for (const confidential of [false, true]) {
    const client = await register(confidential)
    const [storedClient] = await db.select().from(oauthClient).where(eq(oauthClient.clientId, client.client_id))
    assert.notEqual(storedClient!.requirePKCE, false)
    const missing = new URL(authorization(client, "collection:read").path, "http://localhost:3000")
    missing.searchParams.delete("code_challenge")
    missing.searchParams.delete("code_challenge_method")
    const missingResponse = await request(missing.pathname + missing.search, { headers: headers() })
    const missingLocation = missingResponse.headers.get("location")
    const missingBody = await missingResponse.text()
    assert.equal(missingResponse.status >= 400 || (missingLocation ? new URL(missingLocation).searchParams.has("error") : missingBody.includes("error")), true)
    const flow = authorization(client)
    const unauthenticated = await request(flow.path)
    const login = unauthenticated.headers.get("location") ?? (await unauthenticated.json()).url
    assert.equal(new URL(login, "http://localhost:3000").pathname, "/sign-in")
    const tokens = await connect(client)
    assert.deepEqual(await verified(tokens.access_token), { userId: owners[0], scopes: fullScope.split(" ") })
    const refreshed = await token(client, { grant_type: "refresh_token", refresh_token: tokens.refresh_token })
    const refreshedBody = await refreshed.json()
    assert.equal(refreshed.status, 200, JSON.stringify(refreshedBody))
    assert.equal((await verified(refreshedBody.access_token))?.userId, owners[0])
    const bearer = { authorization: `Bearer ${refreshedBody.access_token}` }
    assert.equal(await (await request("/api/auth/get-session", { headers: bearer })).json(), null)
    assert.equal((await request("/api/v1/mcp-oauth/grants", { headers: bearer })).status, 401)
    for (const path of ["/api/v1/me", "/api/v1/mcp-keys"]) assert.equal((await request(path, { headers: bearer })).status, 401)
    await disconnect(client.client_id)
    assert.equal(await verified(refreshedBody.access_token), null)
    assert.equal((await token(client, { grant_type: "refresh_token", refresh_token: refreshedBody.refresh_token })).status, 400)
    await connect(client)
    assert.equal(await verified(refreshedBody.access_token), null)
  }
})

test("refresh racing with disconnect cannot reactivate old credentials after re-consent", async () => {
  const client = await register()
  const original = await connect(client)
  const context = await auth.$context
  const create = context.adapter.create
  let release!: () => void
  let entered!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const paused = new Promise<void>((resolve) => { entered = resolve })
  let intercept = true
  context.adapter.create = async (args) => {
    if (args.model === "oauthRefreshToken" && intercept) {
      intercept = false
      entered()
      await gate
    }
    return create(args)
  }
  try {
    const pending = token(client, { grant_type: "refresh_token", refresh_token: original.refresh_token })
    await paused
    await disconnect(client.client_id)
    const replacement = await connect(client)
    release()
    const response = await pending
    const raced = await response.json()
    assert.equal((await verified(replacement.access_token))?.userId, owners[0])
    if (response.ok) {
      assert.equal(await verified(raced.access_token), null, "old authorization family must remain revoked after re-consent")
      assert.equal((await token(client, { grant_type: "refresh_token", refresh_token: raced.refresh_token })).status, 400)
    }
  } finally {
    release()
    context.adapter.create = create
  }
})

test("signed consent previews reject tampering and never expose client secrets or account PII", async () => {
  const client = await register(true)
  const flow = await consent(client)
  const query = new URLSearchParams(flow.query)
  for (const tampered of [flow.query.replace("assistant.test", "attacker.test"), query.toString().replace(/sig=[^&]+/, "sig=invalid"), "client_id=unsigned"]) {
    const response = await request(`/api/v1/mcp-oauth/consent?${new URLSearchParams({ oauth_query: tampered })}`, { headers: headers() })
    assert.equal(response.status, 400)
    assert.equal(JSON.stringify(await response.json()).includes(client.client_secret!), false)
  }
  const unsigned = await request(`/api/v1/mcp-oauth/consent?${new URLSearchParams({ oauth_query: flow.query })}`)
  assert.equal(unsigned.status, 401)
  const preview = await (await request(`/api/v1/mcp-oauth/consent?${new URLSearchParams({ oauth_query: flow.query })}`, { headers: headers() })).json()
  assert.deepEqual(Object.keys(preview).sort(), ["client", "oauthQuery", "scopes", "viewer"])
  assert.deepEqual(Object.keys(preview.viewer), ["handle"])
  assert.deepEqual(Object.keys(preview.client).sort(), ["id", "name", "redirectHost"])
})

test("OAuth scope and audience determine tool access, owner writes persist, and browser sessions stay isolated", async () => {
  const client = await register()
  const readOnly = await connect(client, "collection:read offline_access")
  const full = await connect(client)
  for (const [tokens, canWrite] of [[readOnly, false], [full, true]] as const) {
    const sdk = new Client({ name: "oauth-collection-test", version: "1.0" })
    const transport = new StreamableHTTPClientTransport(new URL(mcpResource), {
      fetch: async (url, init) => app.fetch(new Request(url, init)), authProvider: { token: async () => tokens.access_token },
    })
    try {
      await sdk.connect(transport)
      const names = (await sdk.listTools()).tools.map((tool) => tool.name)
      assert.equal(names.includes("get_collection"), true)
      assert.equal(names.includes("set_collection_state"), canWrite)
      if (canWrite) {
        for (let i = 0; i < 2; i++) {
          const written = await sdk.callTool({ name: "set_collection_state", arguments: { spriteId, state: { owned: true, mastered: true } } })
          assert.equal(written.isError, undefined)
        }
      } else {
        await assert.rejects(sdk.callTool({ name: "set_collection_state", arguments: { spriteId, state: { owned: true, mastered: true } } }))
      }
    } finally { await sdk.close() }
  }
  const entries = await db.select().from(collectionEntries).where(eq(collectionEntries.spriteId, spriteId))
  assert.equal(entries.length, 1)
  assert.equal(entries[0]!.userId, owners[0])
  assert.equal(entries[0]!.mastered, true)
  assert.equal((await request("/api/mcp", { method: "POST", headers: { authorization: `Bearer ${full.access_token}`, "content-type": "application/json" }, body: "{}" })).status, 401)
  const existing = await grant(client.client_id)
  assert.equal((await request(`/api/v1/mcp-oauth/grants/${existing.id}`, { method: "DELETE", headers: headers(1) })).status, 404)
  assert.equal((await verified(full.access_token))?.userId, owners[0])
  const storedHash = createHash("sha256").update(full.access_token).digest("base64url")
  const [stored] = await db.select().from(oauthAccessToken).where(eq(oauthAccessToken.token, storedHash))
  assert.ok(stored)
  await db.update(oauthAccessToken).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(oauthAccessToken.id, stored.id))
  assert.equal(await verified(full.access_token), null)
})

test("authorization enforces S256 PKCE, exact callback and resource; unsupported grants and code replay fail", async () => {
  const client = await register()
  for (const changes of [{ code_challenge_method: "plain" }, { redirect_uri: "https://attacker.test/callback" }, { resource: "https://attacker.test/mcp" }, { resource: "" }]) {
    const flow = authorization(client)
    const url = new URL(flow.path, "http://localhost:3000")
    for (const [key, value] of Object.entries(changes)) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key) }
    const response = await request(url.pathname + url.search, { headers: headers() })
    const body = await response.text()
    const location = response.headers.get("location")
    assert.equal(response.status >= 400 || (location ? new URL(location, "http://localhost:3000").searchParams.has("error") : body.includes("error")), true, body)
  }
  const flow = await consent(client)
  assert.equal((await token(client, { grant_type: "authorization_code", code: flow.code, code_verifier: "incorrect", redirect_uri: callback })).status, 401)
  const valid = await consent(client)
  const params = { grant_type: "authorization_code", code: valid.code, code_verifier: valid.verifier, redirect_uri: callback }
  const exchanged = await token(client, params)
  assert.equal(exchanged.status, 200)
  const issued = await exchanged.json()
  assert.equal((await token(client, params)).status, 400)
  assert.equal(await verified(issued.access_token), null)
  assert.equal((await token(client, { grant_type: "client_credentials" })).status, 400)
})

test("an unexchanged code stays revoked after disconnect and re-consent", async () => {
  const client = await register()
  const old = await consent(client)
  await disconnect(client.client_id)
  const replacement = await connect(client)
  const response = await token(client, { grant_type: "authorization_code", code: old.code, code_verifier: old.verifier, redirect_uri: callback })
  assert.equal(response.status, 400)
  assert.equal((await verified(replacement.access_token))?.userId, owners[0])
})

test("code creation paused after grant binding cannot adopt a replacement consent", async () => {
  const client = await register()
  await connect(client)
  const context = await auth.$context
  const create = context.adapter.create
  let release!: () => void
  let entered!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const paused = new Promise<void>((resolve) => { entered = resolve })
  let intercept = true
  context.adapter.create = async (args) => {
    if (args.model === "verification" && typeof args.data.value === "string" && args.data.value.includes('"type":"authorization_code"') && intercept) {
      intercept = false
      entered()
      await gate
    }
    return create(args)
  }
  try {
    const pending = consent(client)
    await paused
    await disconnect(client.client_id)
    const replacement = await connect(client)
    release()
    const old = await pending
    assert.equal((await token(client, { grant_type: "authorization_code", code: old.code, code_verifier: old.verifier, redirect_uri: callback })).status, 400)
    assert.equal((await verified(replacement.access_token))?.userId, owners[0])
  } finally { release(); context.adapter.create = create }
})

test("dynamic clients cannot expand server scopes or enable client-credentials grants", async () => {
  for (const extra of [{ scope: "collection:read profile:write" }, { grant_types: ["client_credentials"] }]) {
    const response = await request("/api/auth/oauth2/register", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client_name: "Invalid scope fixture", redirect_uris: [callback], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], scope: fullScope, ...extra }),
    })
    assert.equal(response.status, 400, await response.text())
  }
})
