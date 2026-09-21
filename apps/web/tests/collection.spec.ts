import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { CollectionSnapshot } from "@workspace/contracts"

type BrowserFixture = {
  baseURL: string
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
let first: CollectionSnapshot["items"][number]
let errors: string[] = []
let serverErrors: string[] = []
let expectedServerErrors = 0

async function snapshot(page: Page): Promise<CollectionSnapshot> {
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  return response.json()
}

const tile = (page: Page) =>
  page.locator(`article[data-sprite-id="${first.id}"]`)
const details = (page: Page) =>
  tile(page).getByRole("button", { name: /^Open / })
const captured = (page: Page) =>
  tile(page).getByRole("button", { name: /^Captured / })
const mastered = (page: Page) => tile(page).locator('[aria-label^="Mastered "]')
const queryChip = (page: Page, group: string, label: string) =>
  page
    .locator('[data-slot="combobox-chip"]')
    .filter({ hasText: `${group}${label}` })

async function addFilterToken(page: Page, label: string) {
  const option = page.getByRole("option", {
    name: new RegExp(`^${label}\\b`),
  })
  if (!(await option.isVisible()))
    await page.getByRole("button", { name: "Add collection filter" }).click()
  await option.click()
}

async function assertPersisted(
  page: Page,
  expected: { owned: boolean; mastered: boolean },
) {
  await expect
    .poll(async () => {
      const collection = await snapshot(page)
      const item = collection.items.find((candidate) => candidate.id === first.id)
      return item
        ? { owned: item.owned, mastered: item.mastered }
        : null
    })
    .toEqual(expected)
}

async function assertFits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
}

test.beforeEach(async ({ page }, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  ) as BrowserFixture
  await page.context().addCookies([
    fixture.cookies[testInfo.project.name === "desktop" ? "desktop" : "mobile"],
  ])
  errors = []
  serverErrors = []
  expectedServerErrors = 0
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message))
  page.on("console", (message) => {
    if (message.type() !== "error") return
    if (
      message.text().includes("va.vercel-scripts.com") &&
      message.text().includes("Content Security Policy")
    )
      return
    if (message.text().includes("500 (Internal Server Error)"))
      serverErrors.push(message.text())
    else {
      const location = message.location()
      errors.push(`${message.text()} (${location.url}:${location.lineNumber})`)
    }
  })
  const collection = await snapshot(page)
  expect(collection.items.length).toBeGreaterThan(100)
  first = collection.items.toSorted(
    (a, b) => a.displayOrder - b.displayOrder,
  )[0]!
  const reset = await page.request.put(`/api/v1/collection/${first.id}`, {
    headers: { origin: fixture.baseURL },
    data: { owned: false, mastered: false },
  })
  expect(reset.status()).toBe(200)
  await page.goto("/collection")
  await expect(
    page.getByRole("heading", { name: "Sprite locker" }),
  ).toBeVisible()
  await expect(page.getByTestId("virtualized-sprite-groups")).toHaveAttribute(
    "data-hydrated",
    "true",
  )
})

test.afterEach(async () => {
  expect(errors).toEqual([])
  expect(serverErrors).toHaveLength(expectedServerErrors)
})

test("meaningful collection renders without overflow or serious accessibility failures", async ({
  page,
}, testInfo) => {
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page).toHaveTitle(/My collection/)
  await expect(tile(page)).toBeVisible()
  await tile(page).scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      tile(page)
        .locator("img")
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0)
  await expect(page.locator("nextjs-dialog")).toHaveCount(0)
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
  await expect(mastered(page)).toBeDisabled()
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  const virtualGrid = page.getByTestId("virtualized-sprite-grid")
  await expect(virtualGrid).toHaveAttribute(
    "data-total-items",
    String((await snapshot(page)).items.length),
  )
  expect(await page.locator("article[data-sprite-id]").count()).toBeLessThan(
    Number(await virtualGrid.getAttribute("data-total-items")),
  )
  await assertFits(page)
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([])
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-collection.png`,
    fullPage: false,
  })
})

test("virtualized collection renders the final Sprite after a full-page scroll", async ({
  page,
}, testInfo) => {
  const collection = await snapshot(page)
  const last = collection.items
    .toSorted((a, b) => a.displayOrder - b.displayOrder)
    .at(-1)!
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  const virtualGrid = page.getByTestId("virtualized-sprite-grid")
  const initialIds = await page.locator("article[data-sprite-id]").evaluateAll(
    (articles) => articles.map((article) => article.getAttribute("data-sprite-id")),
  )

  await virtualGrid.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + bounds.bottom - window.innerHeight / 2)
  })

  const finalTile = page.locator(`article[data-sprite-id="${last.id}"]`)
  await expect(finalTile).toBeAttached()
  await expect(finalTile).toBeVisible()
  expect(
    await page.locator("article[data-sprite-id]").evaluateAll(
      (articles) => articles.map((article) => article.getAttribute("data-sprite-id")),
    ),
  ).not.toEqual(initialIds)
  expect(await page.locator("article[data-sprite-id]").count()).toBeLessThan(
    collection.items.length,
  )
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-collection-bottom.png`,
    fullPage: false,
  })
})

test("capture and mastery persist and clearing capture clears mastery", async ({
  page,
}, testInfo) => {
  await captured(page).click()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "true")
  await mastered(page).click()
  await expect(mastered(page)).toHaveAttribute("aria-pressed", "true")
  await details(page).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: /Available to help/i }),
  ).toHaveCount(0)
  await assertPersisted(page, { owned: true, mastered: true })
  await assertFits(page)
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-details.png`,
    fullPage: false,
  })
  await dialog.getByRole("button", { name: "Done", exact: true }).click()
  await page.reload()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "true")
  await expect(mastered(page)).toHaveAttribute("aria-pressed", "true")
  await captured(page).click()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
  await expect(mastered(page)).toHaveAttribute("aria-pressed", "false")
  await expect(mastered(page)).toBeDisabled()
  await assertPersisted(page, { owned: false, mastered: false })
  await page.reload()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
})

test("failed save leaves persisted state unchanged and offers a truthful retry", async ({
  page,
}) => {
  expectedServerErrors = 1
  await page.route(
    "**/collection",
    (route) => {
      if (!route.request().headers()["next-action"]) return route.continue()
      return route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Action unavailable",
      })
    },
    { times: 1 },
  )
  await captured(page).click()
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "The connection was interrupted." }),
  ).toBeVisible()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
  await expect(
    page.getByRole("status").filter({ hasText: /saved\./ }),
  ).toHaveCount(0)
  await assertPersisted(page, { owned: false, mastered: false })
  await captured(page).click()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "true")
  await assertPersisted(page, { owned: true, mastered: false })
})

test("rarity and search filters narrow results and empty-state reset restores the catalog", async ({
  page,
}) => {
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  const virtualGrid = page.getByTestId("virtualized-sprite-grid")
  const count = Number(await virtualGrid.getAttribute("data-total-items"))
  await addFilterToken(page, "Rare")
  await expect(queryChip(page, "Rarity", "Rare")).toBeVisible()
  const rare = await snapshot(page)
  await expect(virtualGrid).toHaveAttribute(
    "data-total-items",
    String(rare.items.filter((item) => item.rarity === "Rare").length),
  )
  await page
    .getByRole("combobox", { name: "Search collection" })
    .fill("zzzz-no-such-sprite")
  await expect(page.getByText("No Sprites match these filters")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(
    page.getByRole("combobox", { name: "Search collection" }),
  ).toHaveValue("")
  await expect(queryChip(page, "Rarity", "Rare")).toHaveCount(0)
  await expect(virtualGrid).toHaveAttribute("data-total-items", String(count))
  await page
    .getByRole("combobox", { name: "Search collection" })
    .fill(first.baseName)
  const expected = rare.items.filter((item) =>
    `${item.variant} ${item.baseName} ${item.season ?? "Season unavailable"}`
      .toLowerCase()
      .includes(first.baseName.toLowerCase()),
  )
  await expect(virtualGrid).toHaveAttribute(
    "data-total-items",
    String(expected.length),
  )
})

test("query tokens compose captured with not mastered", async ({ page }, testInfo) => {
  await captured(page).click()
  await assertPersisted(page, { owned: true, mastered: false })
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await addFilterToken(page, "Captured")
  await addFilterToken(page, "Not mastered")
  await page.keyboard.press("Escape")

  await expect(queryChip(page, "Capture", "Captured")).toBeVisible()
  await expect(queryChip(page, "Mastery", "Not mastered")).toBeVisible()
  const collection = await snapshot(page)
  await expect(page.getByTestId("virtualized-sprite-grid")).toHaveAttribute(
    "data-total-items",
    String(
      collection.items.filter((item) => item.owned && !item.mastered).length,
    ),
  )
  if (process.env.COLLECTION_SCREENSHOT_DIR) {
    await page.screenshot({
      path: `${process.env.COLLECTION_SCREENSHOT_DIR}/${testInfo.project.name}-query-tokens.png`,
      animations: "disabled",
      scale: "css",
    })
  }

  await addFilterToken(page, "Mastered")
  await expect(queryChip(page, "Mastery", "Not mastered")).toHaveCount(0)
  await expect(queryChip(page, "Mastery", "Mastered")).toBeVisible()
})

test("details support keyboard focus and modal removal restores the active filter focus", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await details(page).hover()
    await expect(
      page.getByText("No accepted friends have captured this Sprite yet", {
        exact: true,
      }),
    ).toBeVisible()
    await page.getByRole("heading", { name: "Sprite locker" }).hover()
  }
  await details(page).focus()
  await expect(details(page)).toBeFocused()
  if (testInfo.project.name !== "mobile-webkit") {
    await expect(
      page.getByText("No accepted friends have captured this Sprite yet", {
        exact: true,
      }),
    ).toBeVisible()
  }
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toBeVisible()
  for (const { source, percent } of first.dropChances)
    await expect(
      page
        .getByRole("dialog")
        .getByText(`${source}: ${percent}%`, { exact: true }),
    ).toBeVisible()
  await expect(
    page
      .getByRole("dialog")
      .getByText("Friends with this Sprite", { exact: true }),
  ).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([])
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Done", exact: true })
    .click()
  await expect(details(page)).toBeFocused()
  await addFilterToken(page, "Missing")
  await details(page).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Captured / })
    .click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(tile(page)).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Search collection" })).toBeFocused()
  await assertPersisted(page, { owned: true, mastered: false })
})

test("rapid collection actions stay optimistic and coalesce to the last intent", async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const search = page.getByRole("combobox", { name: "Search collection" })
  await search.fill(first.baseName)
  let requests = 0
  await page.route("**/collection", async (route) => {
    if (route.request().headers()["next-action"]) {
      requests += 1
      if (requests === 1) await gate
    }
    await route.continue()
  })
  try {
    await captured(page).click()
    await expect(captured(page)).toHaveAttribute("aria-pressed", "true")
    await assertPersisted(page, { owned: false, mastered: false })
    await mastered(page).click()
    await expect(mastered(page)).toHaveAttribute("aria-pressed", "true")
    await captured(page).click()
    await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
    expect(requests).toBe(1)
  } finally {
    release()
  }
  await expect.poll(() => requests).toBe(2)
  await expect(tile(page).getByRole("status")).toHaveCount(0)
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
  await expect(search).toHaveValue(first.baseName)
  await assertPersisted(page, { owned: false, mastered: false })
  await page.reload()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
})

test("collection switches between list and three grid sizes", async ({ page }, testInfo) => {
  const width = () => tile(page).evaluate((element) => element.getBoundingClientRect().width)
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await page.getByRole("radio", { name: "Small grid", exact: true }).click()
  const screenshot = async (view: string) => {
    if (!process.env.COLLECTION_SCREENSHOT_DIR) return
    const viewControl = page.getByRole("radiogroup", { name: "Collection view", exact: true })
    if (testInfo.project.name === "mobile") {
      await viewControl.evaluate((element) => {
        window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 96)
      })
    }
    await page.screenshot({
      path: `${process.env.COLLECTION_SCREENSHOT_DIR}/${testInfo.project.name}-${view}.png`,
      animations: "disabled",
      scale: "css",
    })
  }
  const smallWidth = await width()
  await screenshot("grid-small")
  await assertFits(page)
  await page.getByRole("radio", { name: "Medium grid", exact: true }).click()
  const mediumWidth = await width()
  await screenshot("grid-medium")
  expect(mediumWidth).toBeGreaterThan(smallWidth)
  await page.getByRole("radio", { name: "Large grid", exact: true }).click()
  expect(await width()).toBeGreaterThan(mediumWidth)
  await screenshot("grid-large")
  await assertFits(page)
  await page.getByRole("radio", { name: "List view", exact: true }).click()
  await expect(page.getByRole("radiogroup", { name: "Grid size", exact: true })).toHaveCount(0)
  expect(await tile(page).evaluate((element) => getComputedStyle(element).flexDirection)).toBe("row")
  await expect(
    page.locator("article[data-sprite-id]").getByText(/^\d+ can help/),
  ).toHaveCount(0)
  await expect(captured(page)).toBeVisible()
  await captured(page).click()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "true")
  await mastered(page).click()
  await expect(mastered(page)).toHaveAttribute("aria-pressed", "true")
  await expect(tile(page).getByRole("status")).toHaveCount(0)
  await assertPersisted(page, { owned: true, mastered: true })
  await screenshot("list")
  await assertFits(page)
  await details(page).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  const largeGrid = page.getByRole("radio", { name: "Large grid", exact: true })
  await expect(largeGrid).toHaveAttribute("aria-checked", "true")
  await largeGrid.click()
  await expect(largeGrid).toHaveAttribute("aria-checked", "true")
  await largeGrid.press("ArrowLeft")
  const mediumGrid = page.getByRole("radio", { name: "Medium grid", exact: true })
  await expect(mediumGrid).toBeFocused()
  await mediumGrid.press("Space")
  await expect(mediumGrid).toHaveAttribute("aria-checked", "true")
})

test("grouped view keeps each base Sprite and its variants in one section", async ({ page }, testInfo) => {
  const collection = await snapshot(page)
  const expected = collection.items.filter((item) => item.baseName === first.baseName)
  const expectedGroupCount = new Set(collection.items.map((item) => item.baseName)).size
  await expect(
    page.getByRole("radio", { name: "Grouped view", exact: true }),
  ).toHaveAttribute("aria-checked", "true")
  const virtualGroups = page.getByTestId("virtualized-sprite-groups")
  const section = page.getByRole("region", { name: first.baseName, exact: true })
  await expect(section.getByRole("heading", { name: first.baseName, exact: true, level: 2 })).toBeVisible()
  const variantProgress = section.getByLabel(
    `0 of ${expected.length} variants captured`,
  )
  await expect(variantProgress).toBeVisible()
  await expect(
    section.getByLabel(`0 of ${expected.length} variants mastered`),
  ).toBeVisible()
  await expect(virtualGroups).toHaveAttribute("data-total-groups", String(expectedGroupCount))
  expect(await page.locator("section").count()).toBeLessThan(expectedGroupCount)
  await expect(section.locator("article")).toHaveCount(expected.length)
  expect(await section.locator("article").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-sprite-id")).sort()
  )).toEqual(expected.map((item) => item.id).sort())
  await page.getByRole("radio", { name: "Small grid", exact: true }).click()
  await assertFits(page)
  if (process.env.COLLECTION_SCREENSHOT_DIR) {
    if (testInfo.project.name === "mobile") {
      await page.getByRole("radiogroup", { name: "Collection view", exact: true }).evaluate((element) => {
        window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 96)
      })
    }
    await page.screenshot({
      path: `${process.env.COLLECTION_SCREENSHOT_DIR}/${testInfo.project.name}-grouped.png`,
      animations: "disabled",
      scale: "css",
    })
  }
  await captured(page).click()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "true")
  await expect(
    section.getByLabel(`1 of ${expected.length} variants captured`),
  ).toBeVisible()
  await expect(tile(page).getByRole("status")).toHaveCount(0)
  await assertPersisted(page, { owned: true, mastered: false })
  await page.getByRole("combobox", { name: "Search collection", exact: true }).fill(first.baseName)
  await expect(section.locator("article")).toHaveCount(expected.length)
  await page.getByRole("combobox", { name: "Search collection", exact: true }).fill("no-such-sprite-123")
  await expect(page.getByText("No Sprites match these filters", { exact: true })).toBeVisible()
  await expect(page.locator("section")).toHaveCount(0)
  await page.getByRole("button", { name: "Clear filters", exact: true }).click()
  await expect(section).toBeVisible()
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await expect(page.locator("section")).toHaveCount(0)
  await expect(page.getByRole("radio", { name: "Small grid", exact: true })).toHaveAttribute("aria-checked", "true")
})

test("collection view preference persists across reloads", async ({ page }) => {
  const listView = page.getByRole("radio", { name: "List view", exact: true })
  await listView.click()
  await expect(listView).toHaveAttribute("aria-checked", "true")

  await page.reload()

  await expect(
    page.getByRole("radio", { name: "List view", exact: true }),
  ).toHaveAttribute("aria-checked", "true")
  await expect(page.getByTestId("virtualized-sprite-grid")).toHaveAttribute(
    "data-hydrated",
    "true",
  )
})
