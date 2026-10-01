import assert from "node:assert/strict"
import { test } from "node:test"
import { spriteToolDefinitions } from "@workspace/contracts/sprite-tools"
import { createSpriteWebMcpTools, registerSpriteWebMcp, type ModelContext, type WebMcpTool } from "../lib/webmcp"

test("document registration owns tool lifetime through its AbortSignal", async () => {
  const controller = new AbortController()
  const tools = new Map<string, WebMcpTool>()
  const api: ModelContext = {
    async registerTool(tool, options) {
      assert.ok(options)
      assert.equal(options.signal, controller.signal)
      tools.set(tool.name, tool)
      options.signal.addEventListener("abort", () => tools.delete(tool.name), { once: true })
    },
  }
  await registerSpriteWebMcp(api, createSpriteWebMcpTools({ signal: controller.signal }), controller.signal)
  assert.deepEqual([...tools.keys()], ["search_sprites", "get_sprite"])
  controller.abort()
  assert.equal(tools.size, 0)
})

test("session tools validate complete desired state and reject foreign user identity", async () => {
  let saved: unknown
  const signal = new AbortController().signal
  const tools = createSpriteWebMcpTools({ session: true, signal, saveCollection: async (input) => {
    saved = input
    return { entry: { spriteId: input.spriteId, ...input.state, updatedAt: null }, progress: { total: 1, owned: 1, mastered: 0 } }
  } })
  assert.deepEqual(tools.map((tool) => tool.name), ["get_collection", "set_collection_state", "get_friends", "compare_friend_collection"])
  const save = tools.find((tool) => tool.name === "set_collection_state")!
  const spriteId = "b0e7e940-b2c2-4669-997d-8b72cecb9755"
  await assert.rejects(save.execute({ spriteId, state: { owned: false, mastered: true } }, {}), /valid FortSprite tool arguments/)
  await assert.rejects(save.execute({ spriteId, userId: "someone-else", state: { owned: true, mastered: false } }, {}), /valid FortSprite tool arguments/)
  assert.equal(saved, undefined)
  const result = JSON.parse(await save.execute({ spriteId, state: { owned: true, mastered: false } }, {}))
  assert.equal(result.entry.owned, true)
  assert.deepEqual(saved, { spriteId, state: { owned: true, mastered: false } })
  assert.equal(spriteToolDefinitions.search_sprites.inputSchema.safeParse({ limit: 101 }).success, false)
})

test("read callbacks use same-origin credentials and propagate execution cancellation", async () => {
  const originalFetch = globalThis.fetch
  const lifecycle = new AbortController()
  const execution = new AbortController()
  let requestSignal: AbortSignal | undefined
  globalThis.fetch = async (input, init) => {
    assert.equal(input, "/api/v1/friends")
    assert.equal(init?.credentials, "same-origin")
    assert.equal(init?.cache, "no-store")
    requestSignal = init?.signal as AbortSignal
    return Response.json({ friends: [], blocked: [], refreshedAt: "2026-10-01" })
  }
  try {
    const tool = createSpriteWebMcpTools({ session: true, signal: lifecycle.signal }).find((candidate) => candidate.name === "get_friends")!
    assert.deepEqual(JSON.parse(await tool.execute({}, { signal: execution.signal })), { friends: [], total: 0, nextOffset: null, refreshedAt: "2026-10-01" })
    execution.abort()
    assert.equal(requestSignal?.aborted, true)
    await assert.rejects(tool.execute({}, { signal: execution.signal }), { name: "AbortError" })
  } finally { globalThis.fetch = originalFetch }
})
