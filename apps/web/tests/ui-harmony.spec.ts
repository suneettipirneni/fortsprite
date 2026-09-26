import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { expect, test, type Locator } from "@playwright/test"

async function bounds(locator: Locator) {
  await expect(locator).toBeVisible()
  return locator.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect()
    return { x, y, width, height }
  })
}

let fixtureDirectory: string
let fixturePath: string

function seedFixture(...args: string[]) {
  execFileSync(process.execPath, [
    resolve("../api/node_modules/tsx/dist/cli.mjs"),
    resolve("../api/tests/seed-browser.ts"),
    ...args,
  ], {
    env: { ...process.env, BROWSER_FIXTURE_PATH: fixturePath },
  })
}

test.beforeAll(() => {
  fixtureDirectory = mkdtempSync(join(tmpdir(), "fortsprite-ui-harmony-"))
  fixturePath = join(fixtureDirectory, "fixture.json")
  seedFixture()
})

test.afterAll(() => {
  seedFixture("--cleanup")
  rmSync(fixtureDirectory, { recursive: true, force: true })
})

test.beforeEach(async ({ page }, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(fixturePath, "utf8"),
  )
  await page.context().addCookies([
    fixture.cookies[testInfo.project.name === "desktop" ? "desktop" : "mobile"],
  ])
})

test("friend form controls share a height and align within their row", async ({ page }) => {
  await page.goto("/friends")
  const username = await bounds(page.getByRole("textbox", { name: "FortSprite username" }))
  const send = await bounds(page.getByRole("button", { name: "Send request" }))
  const search = await bounds(page.getByRole("textbox", { name: "Search friends" }))
  const refresh = await bounds(page.getByRole("button", { name: "Refresh friends" }))

  expect(username.height).toBe(send.height)
  expect(search.height).toBe(refresh.height)
  if (page.viewportSize()!.width >= 640) {
    expect(username.y).toBe(send.y)
    expect(search.y).toBe(refresh.y)
  } else {
    expect(username.height).toBeGreaterThanOrEqual(44)
    expect(search.height).toBeGreaterThanOrEqual(44)
  }
})

test("collection tools align and leave the first Sprite visible on mobile", async ({ page }) => {
  await page.goto("/collection")
  await expect(page.getByTestId("virtualized-sprite-groups")).toHaveAttribute("data-hydrated", "true")
  const query = await bounds(page.locator('[data-slot="combobox-chips"]'))
  const sort = await bounds(page.getByRole("combobox", { name: "Sort collection" }))
  const viewport = page.viewportSize()!

  if (viewport.width >= 1280) {
    expect(Math.abs(query.y - sort.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(query.height - sort.height)).toBeLessThanOrEqual(1)
  } else if (viewport.width < 640) {
    const firstSprite = await bounds(page.locator("article[data-sprite-id]").first())
    const dock = await bounds(page.getByRole("navigation", { name: "Mobile primary" }))
    expect(firstSprite.y).toBeLessThan(dock.y)
  }

  await page.getByRole("button", { name: "Add collection filter" }).click()
  await page.getByRole("option", { name: /^Captured\b/ }).click()
  await page.keyboard.press("Escape")
  const capturedChip = page.locator('[data-slot="combobox-chip"]').filter({ hasText: "Captured" })
  await expect(capturedChip).toBeVisible()
  const search = page.getByRole("combobox", { name: "Search collection" })
  await search.focus()
  await search.press("ArrowLeft")
  await expect(capturedChip).toBeFocused()
  await page.keyboard.press("Delete")
  await expect(capturedChip).toHaveCount(0)
  await expect(page.locator('[data-slot="combobox-chip"]').last()).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(search).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole("button", { name: "Clear collection query" }).click()
  await expect(page.getByRole("combobox", { name: "Search collection" })).toHaveValue("")
})

test("authenticated pages retain their content edge and fit the viewport", async ({ page, baseURL }) => {
  let contentEdge: number | undefined
  for (const route of ["/", "/collection", "/friends", "/matches", "/account", "/help"]) {
    await page.goto(route)
    await expect(page).toHaveURL(new URL(route, baseURL).toString())
    const heading = await bounds(page.getByRole("heading", { level: 1 }))
    contentEdge ??= heading.x
    expect(heading.x, route).toBe(contentEdge)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
    await expect(page.locator("nextjs-dialog")).toHaveCount(0)
  }
})
