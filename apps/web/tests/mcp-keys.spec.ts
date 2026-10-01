import { readFile } from "node:fs/promises"
import { expect, test, type APIRequestContext } from "@playwright/test"
import type { CollectionSnapshot, McpKeySummary } from "@workspace/contracts"

type Fixture = {
  actors: { a: { cookies: Record<string, { name: string; value: string; url: string; httpOnly: boolean; sameSite: "Lax" }> } }
  sprites: { id: string }[]
}

async function rpc(request: APIRequestContext, key: string, method: string, params: object = {}) {
  const response = await request.post("/api/mcp", {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
    },
    data: { jsonrpc: "2.0", id: 1, method, params },
  })
  const text = await response.text()
  const json = response.headers()["content-type"]?.startsWith("text/event-stream")
    ? text.split("\n").find((line) => line.startsWith("data: "))?.slice(6)
    : text
  return { response, body: JSON.parse(json ?? "null") }
}

test("an account creates, copies and revokes a real collection MCP key", async ({ page, request }, testInfo) => {
  const fixture = JSON.parse(await readFile(process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json", "utf8")) as Fixture
  await page.context().addCookies([fixture.actors.a.cookies[testInfo.project.name]!])
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto("/account")
  const name = `Browser assistant ${testInfo.project.name}`
  await page.getByRole("textbox", { name: "MCP key name", exact: true }).fill(name)
  await page.getByRole("button", { name: "Create MCP key", exact: true }).click()
  const secret = page.getByRole("textbox", { name: "New MCP key", exact: true })
  await expect(secret).toBeVisible()
  const key = await secret.inputValue()
  expect(key).toMatch(/^fs_mcp_/)
  await page.getByRole("button", { name: "Copy MCP key", exact: true }).click()
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(key)
  const listed = await page.request.get("/api/v1/mcp-keys")
  expect(listed.status()).toBe(200)
  const listing = await listed.json() as { keys: McpKeySummary[] }
  expect(listing.keys.some((item) => item.name === name)).toBe(true)
  expect(JSON.stringify(listing)).not.toContain(key)
  expect(listing.keys.every((item) => !Object.hasOwn(item, "key"))).toBe(true)
  await page.getByRole("button", { name: "Done, hide key", exact: true }).click()
  await expect(secret).toHaveCount(0)
  await page.screenshot({ path: `/tmp/fortsprite-mcp-account-${testInfo.project.name}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)

  const initialize = await rpc(request, key, "initialize", {
    protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "browser-key-test", version: "1.0" },
  })
  expect(initialize.response.status()).toBe(200)
  const discovery = await rpc(request, key, "tools/list")
  expect(discovery.response.status()).toBe(200)
  expect(discovery.body.result.tools.map((tool: { name: string }) => tool.name)).toContain("set_collection_state")
  const saved = await rpc(request, key, "tools/call", {
    name: "set_collection_state",
    arguments: { spriteId: fixture.sprites[0]!.id, state: { owned: true, mastered: false } },
  })
  expect(saved.response.status()).toBe(200)
  const result = saved.body.result
  expect(result.isError).toBeUndefined()
  expect(result.structuredContent.entry.owned).toBe(true)
  expect(result.structuredContent.entry.mastered).toBe(false)
  const collection = await (await page.request.get("/api/v1/collection")).json() as CollectionSnapshot
  expect(collection.items.find((item) => item.id === fixture.sprites[0]!.id)?.owned).toBe(true)
  expect(collection.items.find((item) => item.id === fixture.sprites[0]!.id)?.mastered).toBe(false)
  const browserSession = await request.get("/api/auth/get-session", { headers: { Authorization: `Bearer ${key}` } })
  expect(await browserSession.json()).toBeNull()
  await page.getByRole("button", { name: `Revoke MCP key ${name}`, exact: true }).click()
  await expect(page.getByRole("button", { name: `Revoke MCP key ${name}`, exact: true })).toHaveCount(0)
  expect((await rpc(request, key, "tools/list")).response.status()).toBe(401)
  await page.reload()
  await expect(page.getByRole("textbox", { name: "New MCP key", exact: true })).toHaveCount(0)
})
