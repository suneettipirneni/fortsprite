import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import type { CollectionSnapshot } from "@workspace/contracts"

type BrowserFixture = {
  baseURL: string
  cookies: Record<"desktop" | "mobile", {
    name: string
    value: string
    url: string
    httpOnly: boolean
    sameSite: "Lax"
  }>
  sprites: { id: string; baseName: string }[]
}

let collection: CollectionSnapshot
let fixture: BrowserFixture
let runtimeErrors: string[]

async function openExport(page: Page) {
  await page.getByRole("button", { name: "Export image", exact: true }).click()
  return page.getByRole("dialog", { name: "Export collection image" })
}

async function savePreview(page: Page, name: string) {
  const dialog = page.getByRole("dialog", { name: "Export collection image" })
  await dialog.getByRole("button", { name: "Generate preview", exact: true }).click()
  const preview = dialog.getByRole("img", { name: "Collection image preview" })
  await expect(preview).toBeVisible({ timeout: 45_000 })
  const dimensions = await preview.evaluate((node) => ({
    width: (node as HTMLImageElement).naturalWidth,
    height: (node as HTMLImageElement).naturalHeight,
  }))
  expect(dimensions.width).toBe(1440)
  expect(dimensions.height).toBeGreaterThan(500)
  const previewHash = await preview.evaluate(async (node) => {
    const image = node as HTMLImageElement
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", pixels.data))]
  })
  const downloadPromise = page.waitForEvent("download")
  await dialog.getByRole("link", { name: "Download PNG" }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fortsprite-.*\.png$/)
  await download.saveAs(`/tmp/fortsprite-export-${name}.png`)
  const downloaded = readFileSync(`/tmp/fortsprite-export-${name}.png`)
  expect([...downloaded.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  expect(downloaded.readUInt32BE(16)).toBe(dimensions.width)
  expect(downloaded.readUInt32BE(20)).toBe(dimensions.height)
  const downloadHash = await page.evaluate(async (source) => {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", pixels.data))]
  }, `data:image/png;base64,${downloaded.toString("base64")}`)
  expect(downloadHash).toEqual(previewHash)
  expect(await download.failure()).toBeNull()
  return dimensions
}

test.beforeEach(async ({ page }, testInfo) => {
  fixture = JSON.parse(readFileSync(
    process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json", "utf8",
  )) as BrowserFixture
  await page.context().addCookies([
    fixture.cookies[testInfo.project.name === "desktop" ? "desktop" : "mobile"],
  ])
  runtimeErrors = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  const reset = await page.request.put(`/api/v1/collection/${fixture.sprites[0]!.id}`, {
    headers: { origin: fixture.baseURL },
    data: { owned: true, mastered: false },
  })
  expect(reset.status()).toBe(200)
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  collection = await response.json() as CollectionSnapshot
  await page.goto("/collection")
  await expect(page.locator('[data-testid="virtualized-sprite-groups"], [data-testid="virtualized-sprite-grid"]'))
    .toHaveAttribute("data-hydrated", "true")
  await expect(page.getByRole("button", { name: "Export image", exact: true })).toBeEnabled()
})

test.afterEach(async () => {
  expect(runtimeErrors).toEqual([])
})

test("defaults to the current season's filtered selection", async ({ page }, testInfo) => {
  const dialog = await openExport(page)
  await expect(dialog.getByRole("radio", { name: "Current filters", exact: true })).toBeChecked()
  await expect(dialog.getByRole("switch", { name: "Group by Sprite type", exact: true })).toBeChecked()
  const season = Math.max(...collection.items.flatMap((item) => item.sourceSeasonId === null ? [] : [item.sourceSeasonId]))
  const count = collection.items.filter((item) => item.sourceSeasonId === season).length
  expect(count).toBeLessThan(collection.items.length)
  await expect(dialog.getByText(`1 of ${count} captured`, { exact: true })).toBeVisible()
  await savePreview(page, `current-season-${testInfo.project.name}`)
  await expect(dialog.getByRole("link", { name: "Download PNG" })).toHaveAttribute("download", /-grouped\.png$/)
})

test("includes the signed-in username only when selected in either layout", async ({ page }, testInfo) => {
  const response = await page.request.get("/api/v1/me")
  expect(response.status()).toBe(200)
  const { viewer } = await response.json() as { viewer: { handle: string } }
  const dialog = await openExport(page)
  await dialog.getByRole("switch", { name: "Group by Sprite type", exact: true }).uncheck()
  const usernameSwitch = dialog.getByRole("switch", { name: "Include username", exact: true })
  await expect(usernameSwitch).not.toBeChecked()
  await expect(dialog.getByText(`Show @${viewer.handle} on the image.`, { exact: true })).toBeVisible()
  const usernamePixels = () => dialog.getByRole("img", { name: "Collection image preview" }).evaluate(async (node) => {
    const image = node as HTMLImageElement
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(800, 92, 560, 38)
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", pixels.data))]
  })
  await savePreview(page, `username-hidden-${testInfo.project.name}`)
  const hidden = await usernamePixels()
  await usernameSwitch.check()
  await expect(dialog.getByRole("link", { name: "Download PNG" })).toHaveCount(0)
  await savePreview(page, `username-shown-${testInfo.project.name}`)
  const shown = await usernamePixels()
  expect(shown).not.toEqual(hidden)
  await dialog.getByRole("switch", { name: "Group by Sprite type", exact: true }).check()
  await savePreview(page, `username-grouped-${testInfo.project.name}`)
  expect(await usernamePixels()).toEqual(shown)
  await usernameSwitch.uncheck()
  await expect(dialog.getByRole("img", { name: "Collection image preview" })).toHaveCount(0)
  await savePreview(page, `username-grouped-hidden-${testInfo.project.name}`)
  expect(await usernamePixels()).toEqual(hidden)
})

test("groups Sprite variants and replaces the previous preview", async ({ page }, testInfo) => {
  const dialog = await openExport(page)
  await expect(dialog.getByRole("switch", { name: "Group by Sprite type", exact: true })).toBeChecked()
  await dialog.getByRole("switch", { name: "Group by Sprite type", exact: true }).uncheck()
  const grid = await savePreview(page, `grid-${testInfo.project.name}`)
  await dialog.getByRole("switch", { name: "Group by Sprite type", exact: true }).check()
  await expect(dialog.getByRole("img", { name: "Collection image preview" })).toHaveCount(0)
  await expect(dialog.getByRole("link", { name: "Download PNG" })).toHaveCount(0)
  const grouped = await savePreview(page, `grouped-${testInfo.project.name}`)
  expect(grouped.height).not.toBe(grid.height)
  await expect(dialog.getByRole("switch", { name: "Group by Sprite type", exact: true })).toBeChecked()
  const alignment = await dialog.getByRole("img", { name: "Collection image preview" }).evaluate((node) => {
    const image = node as HTMLImageElement
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    const pixel = (x: number) => [...context.getImageData(x, 460, 1, 1).data]
    return { background: pixel(75), firstGroup: pixel(84), secondGroup: pixel(756) }
  })
  expect(alignment.firstGroup).not.toEqual(alignment.background)
  expect(alignment.secondGroup).not.toEqual(alignment.background)
})

test("exports every sprite and downloads the exact preview PNG", async ({ page }, testInfo) => {
  const dialog = await openExport(page)
  await dialog.getByRole("radio", { name: "Full collection", exact: true }).check()
  await expect(dialog.getByText(`1 of ${collection.items.length} captured`, { exact: true })).toBeVisible()
  await expect(dialog.getByText(`0 of ${collection.items.length} mastered`, { exact: true })).toBeVisible()
  const dimensions = await savePreview(page, `full-${testInfo.project.name}`)
  expect(dimensions.height).toBeGreaterThan(2000)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `/tmp/fortsprite-export-dialog-${testInfo.project.name}.png` })
})

test("keeps navigation and a tall export inside the safe area", async ({ page, isMobile }, testInfo) => {
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page).toHaveTitle("My collection · FortSprite")
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  // Desktop WebKit does not expose device insets; exercise the CSS geometry
  // with asymmetric portrait and landscape insets as well as a zero-inset screen.
  for (const screen of isMobile
    ? [
        { width: 390, height: 844, top: 59, right: 0, bottom: 34, left: 0 },
        { width: 844, height: 390, top: 0, right: 59, bottom: 21, left: 59 },
      ]
    : [{ width: 1440, height: 1000, top: 0, right: 0, bottom: 0, left: 0 }]) {
    await page.setViewportSize({ width: screen.width, height: screen.height })
    await page.evaluate((insets) => {
      for (const edge of ["top", "right", "bottom", "left"] as const) {
        document.documentElement.style.setProperty(`--safe-area-${edge}`, `${insets[edge]}px`)
      }
      window.scrollTo(0, 0)
    }, screen)
    const header = page.locator("header").filter({ has: page.getByRole("link", { name: "Homepage", exact: true }) })
    const brand = header.getByRole("link", { name: "Homepage", exact: true })
    const assertBrandInsets = async () => {
      const bounds = (await brand.boundingBox())!
      expect(bounds.y).toBeGreaterThanOrEqual(screen.top + 8)
      expect(bounds.x).toBeGreaterThanOrEqual(screen.left)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(screen.width - screen.right)
    }
    await assertBrandInsets()
    await page.evaluate(() => window.scrollTo(0, 500))
    await assertBrandInsets()
    await page.screenshot({ path: `/tmp/fortsprite-safe-area-nav-${testInfo.project.name}-${screen.width}.png` })
    await page.evaluate(() => window.scrollTo(0, 0))

    const dialog = await openExport(page)
    await dialog.getByRole("radio", { name: "Full collection", exact: true }).check()
    await dialog.getByRole("button", { name: "Generate preview", exact: true }).click()
    await expect(dialog.getByRole("img", { name: "Collection image preview" })).toBeVisible({ timeout: 45_000 })
    const scroller = dialog.locator('[data-slot="export-scroll-content"]')
    await scroller.evaluate((node) => { node.scrollTop = 0 })
    const bounds = (await dialog.boundingBox())!
    expect(bounds.y).toBeGreaterThanOrEqual(screen.top + 15)
    if (isMobile) {
      await expect(dialog).toHaveAttribute("data-slot", "drawer-content")
      expect(bounds.y + bounds.height).toBeCloseTo(screen.height, 0)
    } else {
      await expect(dialog).toHaveAttribute("data-slot", "dialog-content")
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(screen.height - screen.bottom - 15)
      expect(bounds.x).toBeGreaterThanOrEqual(screen.left + 15)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(screen.width - screen.right - 15)
    }
    const title = dialog.getByRole("heading", { name: "Export collection image" })
    await expect(title).toBeInViewport()
    const titleBounds = (await title.boundingBox())!
    expect(titleBounds.x).toBeGreaterThanOrEqual(screen.left + (isMobile ? 0 : 15))
    expect(titleBounds.x + titleBounds.width).toBeLessThanOrEqual(screen.width - screen.right - (isMobile ? 0 : 15))
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeInViewport()
    await page.screenshot({ path: `/tmp/fortsprite-safe-area-dialog-${testInfo.project.name}-${screen.width}.png` })
    await scroller.evaluate((node) => { node.scrollTop = node.scrollHeight })
    await expect(title).toBeInViewport()
    await dialog.getByRole("link", { name: "Download PNG" }).scrollIntoViewIfNeeded()
    await expect(dialog.getByRole("link", { name: "Download PNG" })).toBeInViewport()
    const downloadBounds = (await dialog.getByRole("link", { name: "Download PNG" }).boundingBox())!
    expect(downloadBounds.y + downloadBounds.height).toBeLessThanOrEqual(screen.height - screen.bottom - 15)
    await dialog.getByRole("button", { name: "Close", exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }
  expect(consoleErrors).toEqual([])
})

test("exports the current search and current mastery state", async ({ page }, testInfo) => {
  const first = fixture.sprites[0]!
  await page.getByRole("combobox", { name: "Search collection" }).fill(first.baseName)
  await page.locator(`article[data-sprite-id="${first.id}"]`)
    .getByRole("button", { name: /^Mastered / }).click()
  const dialog = await openExport(page)
  await expect(dialog.getByRole("radio", { name: "Current filters", exact: true })).toBeChecked()
  const season = Math.max(...collection.items.flatMap((item) => item.sourceSeasonId === null ? [] : [item.sourceSeasonId]))
  const count = collection.items.filter((item) => item.sourceSeasonId === season &&
    `${item.variant} ${item.baseName} ${item.season}`.toLowerCase().includes(first.baseName.toLowerCase())).length
  await expect(dialog.getByText(`1 of ${count} captured`, { exact: true })).toBeVisible()
  await expect(dialog.getByText(`1 of ${count} mastered`, { exact: true })).toBeVisible()
  const dimensions = await savePreview(page, `filtered-${testInfo.project.name}`)
  expect(dimensions.height).toBeLessThan(1200)
})

test("handles empty filters and retries failed artwork", async ({ page }) => {
  await page.getByRole("combobox", { name: "Search collection" }).fill("no-sprite-matches-this-search")
  let dialog = await openExport(page)
  await dialog.getByRole("radio", { name: "Current filters", exact: true }).check()
  await expect(dialog.getByRole("button", { name: "Generate preview", exact: true })).toBeDisabled()
  await dialog.getByRole("button", { name: "Close", exact: true }).click()
  await page.getByRole("combobox", { name: "Search collection" }).fill(fixture.sprites[0]!.baseName)
  await page.route("**/sprites/**", (route) => route.abort())
  dialog = await openExport(page)
  await dialog.getByRole("radio", { name: "Current filters", exact: true }).check()
  await dialog.getByRole("button", { name: "Generate preview", exact: true }).click()
  await expect(dialog.getByRole("alert")).toBeVisible()
  await expect(dialog.getByRole("link", { name: "Download PNG" })).toHaveCount(0)
  await page.unroute("**/sprites/**")
  await dialog.getByRole("button", { name: "Retry", exact: true }).click()
  await expect(dialog.getByRole("img", { name: "Collection image preview" })).toBeVisible({ timeout: 45_000 })
  await expect(dialog.getByRole("link", { name: "Download PNG" })).toBeVisible()
})

test("includes an optimistic mastery change before saving finishes", async ({ page }, testInfo) => {
  const first = fixture.sprites[0]!
  await page.getByRole("combobox", { name: "Search collection" }).fill(first.baseName)
  let releaseSave: () => void = () => {}
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve })
  await page.route("**/collection", async (route) => {
    if (route.request().method() === "POST") await saveGate
    await route.continue()
  })
  try {
    const tile = page.locator(`article[data-sprite-id="${first.id}"]`)
    await tile.getByRole("button", { name: /^Mastered / }).click()
    const dialog = await openExport(page)
    await dialog.getByRole("radio", { name: "Current filters", exact: true }).check()
    await expect(dialog.getByText(/^1 of \d+ mastered$/)).toBeVisible()
    const response = await page.request.get("/api/v1/collection")
    const saved = await response.json() as CollectionSnapshot
    expect(saved.items.find((item) => item.id === first.id)?.mastered).toBe(false)
    await savePreview(page, `optimistic-${testInfo.project.name}`)
  } finally {
    releaseSave()
  }
  await expect.poll(async () => {
    const response = await page.request.get("/api/v1/collection")
    const saved = await response.json() as CollectionSnapshot
    return saved.items.find((item) => item.id === first.id)?.mastered
  }).toBe(true)
})

test("cancels a closed export and generates a new scope on reopening", async ({ page }, testInfo) => {
  await page.route("**/sprites/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.continue()
  })
  let dialog = await openExport(page)
  const artworkRequest = page.waitForRequest("**/sprites/**")
  await dialog.getByRole("button", { name: "Generate preview", exact: true }).click()
  await artworkRequest
  await dialog.getByRole("button", { name: "Close", exact: true }).click()
  await page.unrouteAll({ behavior: "wait" })
  await page.getByRole("combobox", { name: "Search collection" }).fill(fixture.sprites[0]!.baseName)
  dialog = await openExport(page)
  await dialog.getByRole("radio", { name: "Current filters", exact: true }).check()
  await expect(dialog.getByRole("link", { name: "Download PNG" })).toHaveCount(0)
  const dimensions = await savePreview(page, `reopened-${testInfo.project.name}`)
  expect(dimensions.height).toBeLessThan(1200)
  await expect(dialog.getByRole("alert")).toHaveCount(0)
})
