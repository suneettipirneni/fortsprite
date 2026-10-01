import { readFile } from "node:fs/promises"
import { expect, test, type Page } from "@playwright/test"
import type { CollectionMutationResponse, CollectionSnapshot } from "@workspace/contracts"

type NativeContext = {
  getTools(): Promise<{ name: string }[]>
  executeTool(tool: { name: string }, input: string): Promise<string>
}
type NativeDocument = Document & { modelContext: NativeContext }
type Fixture = {
  baseURL: string
  actors: { a: { cookies: Record<string, { name: string; value: string; url: string; httpOnly: boolean; sameSite: "Lax" }> }; b: { userId: string } }
  sprites: { id: string; baseName: string }[]
}
async function names(page: Page) {
  return page.evaluate(async () => (await (document as NativeDocument).modelContext.getTools()).map((tool) => tool.name).sort())
}
async function call<T>(page: Page, name: string, input: object = {}): Promise<T> {
  return page.evaluate(async ({ name, input }) => {
    const context = (document as NativeDocument).modelContext
    const tool = (await context.getTools()).find((candidate) => candidate.name === name)
    if (!tool) throw new Error(`Missing tool ${name}`)
    const result = await context.executeTool(tool, JSON.stringify(input))
    return JSON.parse(result)
  }, { name, input })
}

test("native WebMCP discovers scoped tools and saves collection state with live refresh and cross-tab persistence", async ({ page }, testInfo) => {
  const fixture = JSON.parse(await readFile(process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json", "utf8")) as Fixture
  const sprite = fixture.sprites[0]!
  await page.goto("/sign-in")
  expect(await page.evaluate(() => typeof (document as NativeDocument).modelContext)).toBe("object")
  await expect.poll(() => names(page)).toEqual(["get_sprite", "search_sprites"])
  const searched = await call<{ items: { id: string }[] }>(page, "search_sprites", { search: sprite.baseName })
  expect(searched.items.some((item) => item.id === sprite.id)).toBe(true)
  await page.context().addCookies([fixture.actors.a.cookies[testInfo.project.name]!])
  await page.goto("/collection")
  const privateNames = ["compare_friend_collection", "get_collection", "get_friends", "get_sprite", "search_sprites", "set_collection_state"]
  await expect.poll(() => names(page)).toEqual(privateNames)
  await call(page, "set_collection_state", { spriteId: sprite.id, state: { owned: false, mastered: false } })
  const tile = page.locator(`article[data-sprite-id="${sprite.id}"]`)
  const captured = tile.getByRole("button", { name: /^Captured / })
  const mastered = tile.getByRole("button", { name: /^Mastered / })
  await expect(captured).toHaveAttribute("aria-pressed", "false")
  const otherTab = await page.context().newPage()
  try {
    await otherTab.goto("/collection")
    await expect(otherTab.locator(`article[data-sprite-id="${sprite.id}"]`).getByRole("button", { name: /^Captured / })).toHaveAttribute("aria-pressed", "false")
    const first = await call<CollectionMutationResponse>(page, "set_collection_state", { spriteId: sprite.id, state: { owned: true, mastered: true } })
    expect(first.entry.owned).toBe(true)
    expect(first.entry.mastered).toBe(true)
    await expect(captured).toHaveAttribute("aria-pressed", "true")
    await expect(mastered).toHaveAttribute("aria-pressed", "true")
    await expect(otherTab.locator(`article[data-sprite-id="${sprite.id}"]`).getByRole("button", { name: /^Mastered / })).toHaveAttribute("aria-pressed", "true")
    const repeated = await call<CollectionMutationResponse>(page, "set_collection_state", { spriteId: sprite.id, state: { owned: true, mastered: true } })
    expect(repeated.entry.updatedAt).toBe(first.entry.updatedAt)
    const snapshot = await call<CollectionSnapshot>(page, "get_collection", { search: sprite.baseName, ownership: "owned" })
    expect(snapshot.items.find((item) => item.id === sprite.id)?.mastered).toBe(true)
    const friends = await call<{ friends: unknown[] }>(page, "get_friends")
    expect(Array.isArray(friends.friends)).toBe(true)
    await expect(call(page, "set_collection_state", { spriteId: sprite.id, userId: fixture.actors.b.userId, state: { owned: false, mastered: false } })).rejects.toThrow()
    await expect(call(page, "set_collection_state", { spriteId: sprite.id, state: { owned: false, mastered: true } })).rejects.toThrow()
    await page.getByRole("link", { name: "Homepage", exact: true }).click()
    await expect.poll(() => names(page)).toEqual(privateNames)
    await page.getByRole("link", { name: "Collection", exact: true }).filter({ visible: true }).first().click()
    await expect(mastered).toHaveAttribute("aria-pressed", "true")
    await page.reload()
    await expect(mastered).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: "Account menu" }).click()
    await page.getByRole("menuitem", { name: "Sign out" }).click()
    await page.waitForURL("**/sign-in")
    await expect.poll(() => names(page)).toEqual(["get_sprite", "search_sprites"])
  } finally { await otherTab.close() }
})
