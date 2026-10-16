import { mkdir, readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import type { FriendComparison } from "@workspace/contracts"

type Actor = {
  userId: string
  displayName: string
  handle: string
  cookies: Record<
    "desktop" | "mobile",
    {
      name: string
      value: string
      url: string
      httpOnly: boolean
      sameSite: "Lax"
    }
  >
}
type Fixture = {
  baseURL: string
  actors: { a: Actor; b: Actor }
  sprites: { id: string; baseName: string; variant: string; rarity: string }[]
}

let fixture: Fixture
let teammateContext: BrowserContext
let teammate: Page

async function sharing(page: Page, friendId: string, action: string) {
  const response = await page.request.post(`/api/v1/friends/${friendId}`, {
    headers: { origin: fixture.baseURL },
    data: { action },
  })
  expect(response.status()).toBe(200)
}

async function accessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    ),
  ).toEqual([])
}

test.beforeEach(async ({ page, browser }, testInfo) => {
  fixture = JSON.parse(
    await readFile(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  const project = testInfo.project.name === "desktop" ? "desktop" : "mobile"
  await page.context().addCookies([fixture.actors.a.cookies[project]])
  teammateContext = await browser.newContext({
    baseURL: fixture.baseURL,
    viewport: page.viewportSize(),
    isMobile: project === "mobile",
    hasTouch: project === "mobile",
  })
  await teammateContext.addCookies([fixture.actors.b.cookies[project]])
  teammate = await teammateContext.newPage()
  await sharing(page, fixture.actors.b.userId, "unblock")
  await sharing(teammate, fixture.actors.a.userId, "unblock")
  await sharing(page, fixture.actors.b.userId, "remove")
  for (const [actor, ownedSprite] of [[page, fixture.sprites[0]!], [teammate, fixture.sprites[1]!]] as const) {
    for (const sprite of fixture.sprites) {
      const response = await actor.request.put(`/api/v1/collection/${sprite.id}`, {
        headers: { origin: fixture.baseURL },
        data: { owned: sprite.id === ownedSprite.id, mastered: false },
      })
      expect(response.status()).toBe(200)
    }
  }
})

test.afterEach(async () => {
  await teammateContext?.close()
})

async function openComparison(page: Page) {
  const response = await page.request.post("/api/v1/friends", {
    headers: { origin: fixture.baseURL },
    data: { handle: fixture.actors.b.handle },
  })
  expect(response.status()).toBe(200)
  await sharing(teammate, fixture.actors.a.userId, "accept")
  await page.goto(`/friends/${fixture.actors.b.userId}`)
  await expect(page.getByRole("button", { name: "Export comparison" })).toBeEnabled()
}

test("exports both players' stats and downloads the preview PNG", async ({ page }, testInfo) => {
  const capture = await teammate.request.put(`/api/v1/collection/${fixture.sprites[0]!.id}`, {
    headers: { origin: fixture.baseURL },
    data: { owned: true, mastered: true },
  })
  expect(capture.status()).toBe(200)
  await openComparison(page)
  const comparison: FriendComparison = await (await page.request.get(`/api/v1/friends/${fixture.actors.b.userId}/comparison`)).json()
  // Capture canvas text to check that the actual PNG contains both identities and totals.
  await page.evaluate(() => {
    const drawn: string[] = []
    Object.assign(window, { comparisonText: drawn })
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
      drawn.push(args[0])
      original.apply(this, args)
    }
  })
  await page.getByRole("button", { name: "Export comparison" }).click()
  const dialog = page.getByRole("dialog", { name: "Export comparison" })
  const preview = dialog.getByRole("img")
  await expect(preview).toBeVisible()
  await expect(preview).toHaveJSProperty("naturalWidth", 1200)
  await expect(preview).toHaveJSProperty("naturalHeight", 720)
  const text = await page.evaluate(() => Reflect.get(window, "comparisonText") as string[])
  expect(text).toContain(fixture.actors.a.displayName)
  expect(text).toContain(fixture.actors.b.displayName)
  expect(text).toContain(`1 of ${comparison.progress.total} captured`)
  expect(text).toContain(`${comparison.progress.total - 1} missing`)
  expect(text).toContain(`2 of ${comparison.progress.total} captured`)
  expect(text).toContain(`${comparison.progress.total - 2} missing`)
  expect(text).toContain(new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(1 / comparison.progress.total))
  expect(text).toContain(new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(2 / comparison.progress.total))
  expect(text).toContain(`0 of ${comparison.progress.total} mastered`)
  expect(text).toContain(`1 of ${comparison.progress.total} mastered`)
  expect(text).toContain("0%")
  expect(text.filter((label) => label === "Mastered")).toHaveLength(2)
  expect(comparison.progress.viewerMastered).toBe(0)
  expect(comparison.progress.friendMastered).toBe(1)
  await expect(preview).toHaveAttribute("alt", new RegExp(`0 of ${comparison.progress.total} mastered;.*1 of ${comparison.progress.total} mastered`))
  expect(text).not.toContain("VS")
  const previewHash = await preview.evaluate(async (image: HTMLImageElement) => {
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", context.getImageData(0, 0, canvas.width, canvas.height).data)))
  })
  const downloadButton = dialog.getByRole("link", { name: "Download PNG" })
  await expect(downloadButton).toBeInViewport()
  const downloadEvent = page.waitForEvent("download")
  await downloadButton.click()
  const download = await downloadEvent
  await mkdir("../../output/comparison", { recursive: true })
  const path = `../../output/comparison/shared-${testInfo.project.name}.png`
  await download.saveAs(path)
  const file = await readFile(path)
  const downloadedHash = await page.evaluate(async (source) => {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", context.getImageData(0, 0, canvas.width, canvas.height).data)))
  }, `data:image/png;base64,${file.toString("base64")}`)
  expect(downloadedHash).toEqual(previewHash)
  expect(await download.failure()).toBeNull()
  expect(file.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect(download.suggestedFilename()).toMatch(/^fortsprite-comparison-.*\.png$/)
  await accessible(page)
  await page.screenshot({ path: `../../output/comparison/export-${testInfo.project.name}.png`, fullPage: true })
  const url = await preview.getAttribute("src")
  await dialog.getByRole("button", { name: "Close", exact: true }).click()
  await expect(dialog).not.toBeVisible()
  expect(await page.evaluate(async (src) => { try { const image = new Image(); image.src = src!; await image.decode(); return false } catch { return true } }, url)).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `../../output/comparison/${testInfo.project.name}-full-page.png`, fullPage: true })
})

test("retries failed exports and cancels generation when closed", async ({ page }) => {
  await openComparison(page)
  await page.route("**/brand/fortsprite.svg", (route) => route.fulfill({ status: 503, body: "Unavailable" }), { times: 1 })
  await page.getByRole("button", { name: "Export comparison" }).click()
  const dialog = page.getByRole("dialog", { name: "Export comparison" })
  await expect(dialog.getByRole("alert")).toContainText("could not load")
  await dialog.getByRole("button", { name: "Retry" }).click()
  await expect(dialog.getByRole("img")).toBeVisible()
  await dialog.getByRole("button", { name: "Close", exact: true }).click()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route("**/brand/fortsprite.svg", async (route) => {
    await gate
    await route.continue().catch(() => {})
  }, { times: 1 })
  const requested = page.waitForRequest("**/brand/fortsprite.svg")
  await page.getByRole("button", { name: "Export comparison" }).click()
  await requested
  await expect(dialog.getByRole("status")).toBeVisible()
  await dialog.getByRole("button", { name: "Close", exact: true }).click()
  release()
  await expect(dialog).not.toBeVisible()
  await page.getByRole("button", { name: "Export comparison" }).click()
  await expect(dialog.getByRole("img")).toBeVisible()
  await expect(dialog.getByRole("alert")).toHaveCount(0)
})
