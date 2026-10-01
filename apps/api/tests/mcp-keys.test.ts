import "./env.js"
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { eq, inArray } from "drizzle-orm"
import type { McpKeyCredential } from "@workspace/contracts"

const { app } = await import("../src/app.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, session } = await import("../src/db/auth-schema.ts")
const { apikey } = await import("../src/db/mcp-schema.ts")
const { verifyMcpKey } = await import("../src/mcp-access.ts")
const owners = [randomUUID(), randomUUID()]
const tokens = owners.map(() => randomUUID())
const handles = owners.map((id) => `mcp_${id.slice(0, 8)}`)

function sessionHeaders(index = 0) {
  const token = tokens[index]!
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64")
  return {
    cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`,
    origin: "http://localhost:3000",
    "content-type": "application/json",
  }
}

function create(body: unknown = { name: "Assistant" }, headers = sessionHeaders()) {
  return app.request("/api/v1/mcp-keys", { method: "POST", headers, body: JSON.stringify(body) })
}

async function mint() {
  const response = await create()
  assert.equal(response.status, 201)
  return (await response.json()).credential as McpKeyCredential
}

function keyHeaders(key: string) {
  return new Headers({ authorization: `Bearer ${key}` })
}

before(async () => {
  await db.insert(user).values(owners.map((id, index) => ({
    id, name: "MCP fixture", email: `${id}@test.invalid`, handle: handles[index]!,
  })))
  await db.insert(session).values(owners.map((id, index) => ({
    id: randomUUID(), token: tokens[index]!, userId: id,
    expiresAt: new Date(Date.now() + 3600000), updatedAt: new Date(),
  })))
})

after(async () => {
  await db.delete(user).where(inArray(user.id, owners))
  await pool.end()
})

test("a session mints a scoped account key, stores its hash and lists only safe metadata", async () => {
  const credential = await mint()
  assert.match(credential.key, /^fs_mcp_/)
  assert.equal(new Date(credential.expiresAt!).getTime() > Date.now() + 89 * 86400000, true)
  assert.deepEqual(await verifyMcpKey(keyHeaders(credential.key)), { userId: owners[0] })
  const [stored] = await db.select().from(apikey).where(eq(apikey.id, credential.id))
  assert.equal(stored!.referenceId, owners[0])
  assert.notEqual(stored!.key, credential.key)
  assert.deepEqual(JSON.parse(stored!.permissions!), { collection: ["read", "write"] })
  const listed = await app.request("/api/v1/mcp-keys", { headers: sessionHeaders() })
  assert.equal(listed.status, 200)
  const summary = (await listed.json()).keys.find((key: { id: string }) => key.id === credential.id)
  assert.deepEqual(Object.keys(summary).sort(), ["createdAt", "expiresAt", "id", "lastUsedAt", "name", "start"])
  assert.equal(JSON.stringify(summary).includes(credential.key), false)
  const otherList = await (await app.request("/api/v1/mcp-keys", { headers: sessionHeaders(1) })).json()
  assert.deepEqual(otherList.keys, [])
})

test("creation rejects ownership and permission spoofing, bad names and cross-origin calls", async () => {
  for (const body of [
    { name: "Assistant", userId: owners[1] },
    { name: "Assistant", permissions: { profile: ["write"] } },
    { name: "Assistant", expiresIn: null },
    { name: " " }, { name: "x".repeat(41) }, { name: "bad\nname" },
  ]) assert.equal((await create(body)).status, 400)
  assert.equal((await create({ name: "Assistant" }, { ...sessionHeaders(), cookie: "" })).status, 401)
  assert.equal((await create({ name: "Assistant" }, { ...sessionHeaders(), origin: "https://attacker.test" })).status, 403)
  assert.equal((await create({ name: "Assistant" }, { ...sessionHeaders(), "sec-fetch-site": "cross-site" } as ReturnType<typeof sessionHeaders>)).status, 403)
})

test("MCP credentials cannot become browser sessions or mutate profiles and cookie sessions cannot verify as MCP keys", async () => {
  const credential = await mint()
  assert.equal(await verifyMcpKey(new Headers(sessionHeaders())), null)
  for (const headers of [keyHeaders(credential.key), new Headers({ "x-api-key": credential.key })]) {
    const response = await app.request("/api/auth/get-session", { headers })
    assert.equal(response.status, 200)
    assert.equal(await response.json(), null)
    assert.equal((await app.request("/api/v1/me", { headers })).status, 401)
    headers.set("origin", "http://localhost:3000")
    headers.set("content-type", "application/json")
    assert.equal((await app.request("/api/v1/profile", {
      method: "PUT", headers,
      body: JSON.stringify({ handle: "unauthorized", displayName: "No", fortniteDisplayName: null }),
    })).status, 401)
    assert.equal((await app.request("/api/v1/mcp-keys", { headers })).status, 401)
  }
  for (const operation of ["create", "verify", "update", "delete"])
    assert.equal((await app.request(`/api/auth/api-key/${operation}`, {
      method: "POST", headers: sessionHeaders(), body: "{}",
    })).status, 404)
})

test("verification rejects keys with missing scope, disabled keys, expired keys and malformed bearer headers", async () => {
  const credential = await mint()
  await db.update(apikey).set({ permissions: JSON.stringify({ collection: ["read"] }) }).where(eq(apikey.id, credential.id))
  assert.equal(await verifyMcpKey(keyHeaders(credential.key)), null)
  await db.update(apikey).set({ permissions: JSON.stringify({ collection: ["read", "write"] }), enabled: false }).where(eq(apikey.id, credential.id))
  assert.equal(await verifyMcpKey(keyHeaders(credential.key)), null)
  await db.update(apikey).set({ enabled: true, expiresAt: new Date(Date.now() - 1000) }).where(eq(apikey.id, credential.id))
  assert.equal(await verifyMcpKey(keyHeaders(credential.key)), null)
  for (const authorization of ["Basic abc", "Bearer invalid", `Bearer ${credential.key} extra`])
    assert.equal(await verifyMcpKey(new Headers({ authorization })), null)
})

test("only the owner can revoke a key and revocation immediately removes its access", async () => {
  const credential = await mint()
  assert.equal((await app.request(`/api/v1/mcp-keys/${credential.id}`, {
    method: "DELETE", headers: sessionHeaders(1),
  })).status, 404)
  assert.deepEqual(await verifyMcpKey(keyHeaders(credential.key)), { userId: owners[0] })
  assert.equal((await app.request(`/api/v1/mcp-keys/${credential.id}`, {
    method: "DELETE", headers: sessionHeaders(),
  })).status, 200)
  assert.equal(await verifyMcpKey(keyHeaders(credential.key)), null)
})

test("deleting the account cascades its MCP keys and revokes the credential", async () => {
  const credential = await mint()
  assert.equal((await app.request("/api/v1/profile", {
    method: "DELETE", headers: sessionHeaders(), body: JSON.stringify({ confirmation: handles[0] }),
  })).status, 200)
  assert.equal((await db.select().from(apikey).where(eq(apikey.referenceId, owners[0]!))).length, 0)
  assert.equal(await verifyMcpKey(keyHeaders(credential.key)), null)
})
