import "./env.js"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, test } from "node:test"
import { eq, inArray } from "drizzle-orm"
import { PROTOCOL_VERSION_META_KEY, CLIENT_CAPABILITIES_META_KEY } from "@modelcontextprotocol/server"
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client"
import { createSpriteMcpHandler } from "../src/mcp.ts"
import { db, pool } from "../src/db/client.ts"
import { sprites, collectionEntries } from "../src/db/schema.ts"
import { user, rateLimit } from "../src/db/auth-schema.ts"
import { app } from "../src/app.ts"

import { userRateLimitKeys, readLimitKey, mutationLimitKey, readBudgets, mutationBudgets } from "../src/rate-limit.ts"

const prefix = `mcp-${randomUUID()}`
const owner = `${prefix}-owner`
const other = `${prefix}-other`
const ids = [randomUUID(), randomUUID(), randomUUID()]
const slugPrefix = prefix.toLowerCase()
const handler = createSpriteMcpHandler({ verifyKey: async (headers) =>
  headers.get("authorization") === "Bearer test-owner-key" ? { userId: owner } : null,
})
let requestId = 0
async function rpc(method: string, params: object = {}, { token, cookie, version = "2026-07-28" }: { token?: string; cookie?: string; version?: string } = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", Accept: "application/json, text/event-stream", "MCP-Protocol-Version": version,
  }
  if (version === "2026-07-28") {
    headers["Mcp-Method"] = method
    if (method === "tools/call") headers["Mcp-Name"] = (params as { name: string }).name
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (cookie) headers.Cookie = cookie
  const response = await handler.fetch(new Request("http://localhost:3000/api/mcp", {
    method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params: version === "2026-07-28" ? { ...params, _meta: { [PROTOCOL_VERSION_META_KEY]: version, [CLIENT_CAPABILITIES_META_KEY]: {} } } : params }),
  }))
  const text = await response.text()
  const json = response.headers.get("content-type")?.startsWith("text/event-stream")
    ? text.split("\n").find((line) => line.startsWith("data: "))?.slice(6)
    : text
  assert.ok(json)
  return { response, body: JSON.parse(json) }
}

after(async () => {
  await db.delete(rateLimit).where(inArray(rateLimit.key, [...userRateLimitKeys(owner), ...userRateLimitKeys(other)]))
  await db.delete(user).where(inArray(user.id, [owner, other]))
  await db.delete(sprites).where(inArray(sprites.id, ids))
  await handler.close()
  await pool.end()
})

test("MCP catalog tools initialize, filter, paginate, and hide unreleased Sprites across protocol versions", async () => {
  await db.insert(user).values([owner, other].map((id, index) => ({ id, name: id, email: `${id}@test.invalid`, handle: `mcp_${prefix.slice(4, 12)}_${index}` })))
  await db.insert(sprites).values(ids.map((id, index) => ({
    id, slug: `${slugPrefix}-${index}`, stableKey: `${prefix}:${index}`, baseName: prefix,
    variantName: index === 0 ? "Gold" : "Normal", sourceVariant: index === 0 ? "Golden" : "Normal",
    rarity: "Rare", releaseStatus: index === 2 ? "unreleased" as const : "released" as const,
    displayOrder: index, sourceUrl: "https://example.com/sprite", sourceVerifiedAt: new Date("2026-10-01"),
  })))
  for (const version of ["2026-07-28", "2025-11-25"]) {
    if (version === "2025-11-25") {
      const initialized = await rpc("initialize", { protocolVersion: version, capabilities: {}, clientInfo: { name: "fortsprite-test", version: "1.0" } }, { version })
      assert.equal(initialized.response.status, 200)
      assert.equal(initialized.body.result.protocolVersion, version)
    }
    const listed = await rpc("tools/list", {}, { version })
    assert.deepEqual(listed.body.result.tools.map((tool: { name: string }) => tool.name), ["search_sprites", "get_sprite"])
    const page = await rpc("tools/call", { name: "search_sprites", arguments: { search: prefix, rarity: "Rare", limit: 1 } }, { version })
    assert.deepEqual(page.body.result.structuredContent.items.map((item: { id: string }) => item.id), [ids[0]])
    assert.equal(page.body.result.structuredContent.total, 2)
    assert.equal(page.body.result.structuredContent.nextOffset, 1)
    const next = await rpc("tools/call", { name: "search_sprites", arguments: { search: prefix, offset: 1 } }, { version })
    assert.deepEqual(next.body.result.structuredContent.items.map((item: { id: string }) => item.id), [ids[1]])
    const filtered = await rpc("tools/call", { name: "search_sprites", arguments: { search: prefix, variant: "Gold" } }, { version })
    assert.deepEqual(filtered.body.result.structuredContent.items.map((item: { id: string }) => item.id), [ids[0]])
    const detail = await rpc("tools/call", { name: "get_sprite", arguments: { spriteId: ids[0] } }, { version })
    assert.equal(detail.body.result.structuredContent.id, ids[0])
  }
})

test("remote collection tools require a verified key, preserve ownership and idempotent desired state", async () => {
  const anonymous = await rpc("tools/list", {}, { cookie: "better-auth.session_token=any-session" })
  assert.deepEqual(anonymous.body.result.tools.map((tool: { name: string }) => tool.name), ["search_sprites", "get_sprite"])
  const denied = await rpc("tools/call", { name: "set_collection_state", arguments: { spriteId: ids[0], state: { owned: true, mastered: true } } })
  assert.equal(denied.body.result?.isError ?? Boolean(denied.body.error), true)
  const invalid = await rpc("tools/list", {}, { token: "wrong" })
  assert.equal(invalid.response.status, 401)
  const options = { token: "test-owner-key" }
  const names = (await rpc("tools/list", {}, options)).body.result.tools.map((tool: { name: string }) => tool.name)
  assert.deepEqual(names, ["search_sprites", "get_sprite", "get_collection", "set_collection_state"])
  const args = { spriteId: ids[0], state: { owned: true, mastered: true } }
  const first = await rpc("tools/call", { name: "set_collection_state", arguments: args }, options)
  const repeated = await rpc("tools/call", { name: "set_collection_state", arguments: args }, options)
  assert.equal(first.body.result.structuredContent.entry.owned, true)
  assert.equal(first.body.result.structuredContent.entry.mastered, true)
  assert.equal(repeated.body.result.structuredContent.entry.updatedAt, first.body.result.structuredContent.entry.updatedAt)
  const collection = await rpc("tools/call", { name: "get_collection", arguments: { search: prefix, ownership: "owned" } }, options)
  assert.deepEqual(collection.body.result.structuredContent.items.map((item: { id: string }) => item.id), [ids[0]])
  assert.equal((await db.select().from(collectionEntries).where(eq(collectionEntries.userId, other))).length, 0)
  for (const arguments_ of [
    { ...args, userId: other },
    { spriteId: ids[0], state: { owned: false, mastered: true } },
    { spriteId: ids[2], state: { owned: true, mastered: false } },
  ]) {
    const rejected = await rpc("tools/call", { name: "set_collection_state", arguments: arguments_ }, options)
    assert.equal(rejected.body.result?.isError ?? Boolean(rejected.body.error), true)
  }
})

test("MCP rejects invalid origin, host, header mirrors and oversized bodies", async () => {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: { [PROTOCOL_VERSION_META_KEY]: "2026-07-28", [CLIENT_CAPABILITIES_META_KEY]: {} } } })
  for (const headers of [new Headers({ Origin: "https://evil.example" }), new Headers({ Host: "evil.example" })]) {
    headers.set("Content-Type", "application/json")
    const response = await app.request("http://localhost:3000/api/mcp", { method: "POST", headers, body })
    assert.equal(response.status, 403)
    assert.equal(response.headers.get("cache-control"), "no-store")
  }
  for (const origin of [undefined, "http://localhost:3000"]) {
    const headers = new Headers({ "Content-Type": "application/json", Accept: "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/list" })
    if (origin) headers.set("Origin", origin)
    const allowed = await app.request("http://localhost:3000/api/mcp", { method: "POST", headers, body })
    assert.equal(allowed.status, 200)
    assert.equal(allowed.headers.get("cache-control"), "no-store")
    assert.deepEqual((await allowed.json()).result.tools.map((tool: { name: string }) => tool.name), ["search_sprites", "get_sprite"])
  }
  const oversized = await app.request("http://localhost:3000/api/mcp", { method: "POST", body: "x".repeat(16 * 1024 + 1) })
  assert.equal(oversized.status, 413)
  const misleadingLength = await app.request("http://localhost:3000/api/mcp", { method: "POST", headers: { "Content-Length": "1" }, body: "x".repeat(16 * 1024 + 1) })
  assert.equal(misleadingLength.status, 413)
  const mismatch = await handler.fetch(new Request("http://localhost:3000/api/mcp", { method: "POST", headers: {
    "Content-Type": "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/call", Accept: "application/json",
  }, body }))
  assert.equal(mismatch.status, 400)
})


test("official SDK HTTP client initializes and calls tools across distinct request servers", async () => {
  for (const token of [undefined, "test-owner-key"]) {
    const client = new Client({ name: "fortsprite-sdk-test", version: "1.0.0" })
    const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/api/mcp"), {
      fetch: async (url, init) => handler.fetch(new Request(url, init)),
      ...(token ? { authProvider: { token: async () => token } } : {}),
    })
    try {
      await client.connect(transport)
      const discovery = await client.listTools()
      assert.deepEqual(discovery.tools.map((tool) => tool.name), token
        ? ["search_sprites", "get_sprite", "get_collection", "set_collection_state"]
        : ["search_sprites", "get_sprite"])
      const result = await client.callTool({ name: "search_sprites", arguments: { search: prefix, limit: 1 } })
      assert.equal(result.isError, undefined)
      const content = result.content as { type: string; text: string }[]
      assert.equal(JSON.parse(content[0]!.text).items[0].id, ids[0])
      const details = await client.callTool({ name: "get_sprite", arguments: { spriteId: ids[0] } })
      assert.equal(JSON.parse((details.content as { text: string }[])[0]!.text).id, ids[0])
      if (token) {
        const saved = await client.callTool({ name: "set_collection_state", arguments: { spriteId: ids[1], state: { owned: true, mastered: false } } })
        assert.equal(JSON.parse((saved.content as { text: string }[])[0]!.text).entry.spriteId, ids[1])
      }
    } finally { await client.close() }
  }
})


test("remote collection calls share the existing per-user REST budgets", async () => {
  for (const [key, count, name, arguments_] of [
    [readLimitKey(owner, "collection"), readBudgets.collection, "get_collection", {}],
    [mutationLimitKey(owner, "collection"), mutationBudgets.collection, "set_collection_state", { spriteId: ids[0], state: { owned: false, mastered: false } }],
  ] as const) {
    await db.insert(rateLimit).values({ id: randomUUID(), key, count, lastRequest: Date.now() }).onConflictDoUpdate({ target: rateLimit.key, set: { count, lastRequest: Date.now() } })
    const result = await rpc("tools/call", { name, arguments: arguments_ }, { token: "test-owner-key" })
    assert.equal(result.body.result.isError, true)
    assert.equal(result.body.result.content[0].text, "Too many requests. Try again later.")
  }
  const [entry] = await db.select().from(collectionEntries).where(eq(collectionEntries.spriteId, ids[0]!))
  assert.equal(entry?.mastered, true)
})


test("public tool inputs and unavailable Sprite IDs return bounded errors", async () => {
  for (const [name, arguments_] of [
    ["get_sprite", { spriteId: "not-a-uuid" }],
    ["search_sprites", { limit: 101 }],
    ["search_sprites", { userId: other }],
    ["get_sprite", { spriteId: ids[2] }],
    ["get_sprite", { spriteId: randomUUID() }],
  ]) {
    const result = await rpc("tools/call", { name, arguments: arguments_ })
    assert.equal(result.body.result?.isError ?? Boolean(result.body.error), true)
    assert.equal(JSON.stringify(result.body).includes("postgresql"), false)
  }
})
