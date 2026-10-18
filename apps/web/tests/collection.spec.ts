import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { CollectionSnapshot } from "@workspace/contracts"
import { variantAbilities } from "../lib/sprite-abilities"

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
  const trigger = page.getByRole("button", { name: "Add collection filter", includeHidden: true })
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click()
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
      (message.text().includes("/_vercel/") ||
        message.location().url.includes("/_vercel/")) &&
      (message.text().includes("404 (Not Found)") ||
        message.text().includes("MIME type ('text/plain')"))
    ) return
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
  await page.getByRole("button", { name: "Clear collection query" }).click()
})

test.afterEach(async () => {
  expect(errors).toEqual([])
  expect(serverErrors).toHaveLength(expectedServerErrors)
})

test("current season is selected by default and multiple seasons can be shown", async ({ page }, testInfo) => {
  const collection = await snapshot(page)
  const currentSeasonId = Math.max(...collection.items.flatMap((item) =>
    item.sourceSeasonId === null ? [] : [item.sourceSeasonId],
  ))
  const current = collection.items.find((item) => item.sourceSeasonId === currentSeasonId)!
  const previous = collection.items.find((item) =>
    item.sourceSeasonId !== null && item.sourceSeasonId !== currentSeasonId,
  )!
  await page.reload()
  const grid = page.getByTestId("virtualized-sprite-grid")
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await expect(queryChip(page, "Season", current.season!)).toBeVisible()
  await expect(grid).toHaveAttribute(
    "data-total-items",
    String(collection.items.filter((item) => item.sourceSeasonId === currentSeasonId).length),
  )
  await page.screenshot({ path: `/tmp/fortsprite-seasons-${testInfo.project.name}-current.png` })
  await addFilterToken(page, previous.season!)
  await expect(queryChip(page, "Season", previous.season!)).toBeVisible()
  await expect(grid).toHaveAttribute(
    "data-total-items",
    String(collection.items.filter((item) =>
      item.sourceSeasonId === currentSeasonId || item.sourceSeasonId === previous.sourceSeasonId,
    ).length),
  )
  await page.screenshot({ path: `/tmp/fortsprite-seasons-${testInfo.project.name}-multiple.png` })
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Clear collection query" }).click()
  await expect(grid).toHaveAttribute("data-total-items", String(collection.items.length))
  await assertFits(page)
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

test("details separate variant bonuses from base abilities", async ({ page }, testInfo) => {
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page).toHaveTitle(/My collection/)
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  for (const [variant, baseName] of [
    ["Gold", "Vampire"],
    ["Trick or Treat", "Jonesy"],
    ["Quack", "Water"],
    ["Cube", "Boss"],
    ["Base", "Jonesy"],
  ]) {
    const search = page.getByRole("combobox", { name: "Search collection", exact: true })
    await search.fill(`${variant} ${baseName}`)
    await expect(search).toHaveValue(`${variant} ${baseName}`)
    await expect(page.getByTestId("virtualized-sprite-grid")).toHaveAttribute("data-total-items", "1")
    await page.getByRole("button", { name: new RegExp(`^Open ${variant} ${baseName} details\\.`) }).click()
    const dialog = page.getByRole("dialog")
    const baseHeading = dialog.getByRole("heading", { name: `${baseName} abilities`, exact: true })
    await baseHeading.scrollIntoViewIfNeeded()
    await expect(baseHeading).toBeVisible()
    if (variant !== "Base") {
      const bonus = variantAbilities[variant]!
      await expect(dialog.getByRole("heading", { name: variant, exact: true })).toBeVisible()
      await expect(dialog.getByText(bonus.description, { exact: true })).toHaveCount(1)
      await expect(dialog.locator('[data-slot="variant-ability"]').getByRole("link")).toHaveCount(0)
      const background = await dialog.locator('[data-slot="variant-ability"]').evaluate((element) => {
        const style = getComputedStyle(element)
        return [style.backgroundColor, style.backgroundImage, style.backgroundBlendMode]
      })
      const portraitBackground = await dialog.getByRole("img", { name: `${variant} ${baseName} Sprite`, exact: true }).evaluate((image) => {
        const style = getComputedStyle(image.parentElement!)
        return [style.backgroundColor, style.backgroundImage, style.backgroundBlendMode]
      })
      expect(background).toEqual(portraitBackground)
    } else {
      await expect(dialog.getByRole("link", { name: "Variant ability source" })).toHaveCount(0)
    }
    await expect(page.locator("nextjs-dialog")).toHaveCount(0)
    await assertFits(page)
    if (variant === "Trick or Treat") {
      await page.screenshot({ path: `/tmp/fortsprite-variant-ability-${testInfo.project.name}.png` })
    }
    await dialog.getByRole("button", { name: "Done", exact: true }).click()
    await expect(dialog).toHaveCount(0)
  }
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
  await expect(page.locator('[data-slot="combobox-content"]')).toHaveCount(0)
  await expect(page.getByRole("combobox", { name: "Search collection" })).toHaveValue("zzzz-no-such-sprite")
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
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const dropChance = dialog.locator("dl > div").filter({
    has: page.getByText("Drop chance", { exact: true }),
  }).getByRole("definition")
  for (const { source, percent } of first.dropChances)
    await expect(
      dropChance.getByText(`${source} ${percent}%`, { exact: true }),
    ).toBeVisible()
  const friends = dialog.locator("dl > div").filter({
    has: page.getByText("Friends", { exact: true }),
  }).getByRole("definition")
  await expect(friends).toHaveText(String(first.helpers.length))
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
  await page.keyboard.press("Escape")
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

test("variant group scrollbar previews on hover, jumps on click, and supports keyboard navigation", async ({ page }, testInfo) => {
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page).toHaveTitle(/FortSprite/)
  const collection = await snapshot(page)
  const names = [...new Set(collection.items.toSorted((a, b) => a.displayOrder - b.displayOrder).map((item) => item.baseName))]
  const groups = page.getByTestId("virtualized-sprite-groups")
  await groups.evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect(scrollbar).toBeVisible()
  await expect(scrollbar).toHaveAttribute("aria-valuemax", String(names.length))
  const bounds = (await scrollbar.boundingBox())!
  const x = bounds.x + bounds.width - 10
  const yFor = (index: number) => bounds.y + 20 + (bounds.height - 40) * index / (names.length - 1)
  const assertGroup = async (index: number) => {
    await expect(scrollbar).toHaveAttribute("aria-valuenow", String(index + 1))
    const heading = page.getByRole("heading", { level: 2, name: names[index]!, exact: true })
    await expect(heading).toBeVisible()
    await expect.poll(async () => heading.evaluate((element) => {
      const headerBottom = document.querySelector("header")!.getBoundingClientRect().bottom
      return element.getBoundingClientRect().top >= headerBottom && element.getBoundingClientRect().bottom < window.innerHeight - 100
    })).toBe(true)
  }
  await page.mouse.move(x, yFor(0))
  const initialOffset = await page.evaluate(() => window.scrollY)
  await page.mouse.move(x, yFor(names.length - 1), { steps: 8 })
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(names.length))
  expect(await page.evaluate(() => window.scrollY)).toBe(initialOffset)
  await page.mouse.click(x, yFor(names.length - 1))
  await assertGroup(names.length - 1)
  // Hover updates the preview without holding a button or moving the page.
  const middle = Math.floor(names.length / 2)
  await page.mouse.move(x, yFor(middle), { steps: 8 })
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(middle + 1))
  await expect(scrollbar).toHaveAttribute("data-dragging", "false")
  await expect(scrollbar).toHaveAttribute("data-hovering", "true")
  const preview = page.getByTestId("group-scroll-preview")
  await expect(preview.locator('[data-position="previous"]')).toContainText(names[middle - 1]!)
  await expect(preview.locator('[data-position="next"]')).toContainText(names[middle + 1]!)
  await expect(preview.locator('[data-position="current"]')).toContainText("Click to jump")
  const incoming = await preview.locator('[data-position="next"]').elementHandle()
  await page.mouse.move(x, yFor(middle + 1))
  await expect.poll(() => incoming!.getAttribute("data-position")).toBe("current")
  expect(await incoming!.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.16s")
  await page.mouse.click(x, yFor(middle + 1))
  await assertGroup(middle + 1)
  await page.mouse.move(x, yFor(middle))
  await page.mouse.click(x, yFor(middle))
  await assertGroup(middle)
  const portrait = preview.locator('[data-position="current"] img')
  await expect(portrait).toHaveAttribute("alt", `Base ${names[middle]} Sprite`)
  await expect.poll(() => portrait.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await assertFits(page)
  await page.screenshot({ path: `/tmp/fortsprite-group-scroller-${testInfo.project.name}-drag.png`, animations: "disabled", scale: "css" })
  await page.mouse.move(20, 100)
  await expect(preview).toHaveCount(0)
  await expect(scrollbar).toHaveAttribute("data-dragging", "false")
  await assertGroup(middle)
  await scrollbar.focus()
  await scrollbar.press("End")
  await assertGroup(names.length - 1)
  await expect(preview.locator('[data-position="next"]')).toHaveCount(0)
  await scrollbar.press("Home")
  await assertGroup(0)
  await expect(preview.locator('[data-position="previous"]')).toHaveCount(0)
  await scrollbar.press("ArrowDown")
  await assertGroup(1)
  await scrollbar.press("ArrowUp")
  await assertGroup(0)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await scrollbar.press("ArrowDown")
  await assertGroup(1)
  expect(await preview.locator('[data-position="current"]').evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s")
  expect(await scrollbar.locator("[data-active]").first().evaluate(element => getComputedStyle(element).transitionDuration)).toBe("0s")
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.mouse.click(20, 100)
  await page.mouse.wheel(0, 1600)
  await expect.poll(async () => Number(await scrollbar.getAttribute("aria-valuenow"))).toBeGreaterThan(1)
  await assertFits(page)
  await page.screenshot({ path: `/tmp/fortsprite-group-scroller-${testInfo.project.name}-idle.png`, animations: "disabled", scale: "css" })
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([])
})

test("variant group scrollbar keeps hover geometry stable and tolerates pointer jitter", async ({ page }) => {
  const groups = page.getByTestId("virtualized-sprite-groups")
  await groups.evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 250))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect(scrollbar).toBeVisible()
  const bounds = (await scrollbar.boundingBox())!

  const count = Number(await scrollbar.getAttribute("aria-valuemax"))
  const step = (bounds.height - 40) / (count - 1)
  const x = bounds.x + bounds.width / 2
  const y = (index: number) => bounds.y + 20 + step * index
  await page.mouse.move(x, y(10))
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "11")
  const draggingBounds = (await scrollbar.boundingBox())!
  expect(Math.abs(draggingBounds.y - bounds.y)).toBeLessThan(1)
  expect(Math.abs(draggingBounds.height - bounds.height)).toBeLessThan(1)
  // Small movements around the rounding boundary must not thrash between
  // groups that can each span several screens.
  for (const index of [10.55, 10.45, 10.58, 10.42]) {
    await page.mouse.move(x, y(index))
    await expect(scrollbar).toHaveAttribute("aria-valuenow", "11")
  }
  await page.mouse.move(x, y(10.85))
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "12")
  for (const index of [10.45, 10.55, 10.42, 10.58]) {
    await page.mouse.move(x, y(index))
    await expect(scrollbar).toHaveAttribute("aria-valuenow", "12")
  }
  await page.mouse.move(x, y(10.15))
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "11")
  await page.mouse.click(x, y(10.15))
  await expect(scrollbar).toHaveAttribute("data-dragging", "false")
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "11")
})

test("variant group scrollbar commits the latest hover on click and discards abandoned previews", async ({ page }) => {
  const collection = await snapshot(page)
  const names = [...new Set(collection.items.toSorted((a, b) => a.displayOrder - b.displayOrder).map((item) => item.baseName))]
  await page.getByTestId("virtualized-sprite-groups").evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
  const bounds = (await scrollbar.boundingBox())!
  const x = bounds.x + bounds.width / 2
  await page.mouse.move(x, bounds.y + 20)
  await expect(scrollbar).toHaveAttribute("data-hovering", "true")
  // A click before the queued frame must commit the latest pointer position.
  await scrollbar.evaluate((element, { x, y, height, count }) => {
    for (const index of [5, 20, 35, 12]) {
      element.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse", pointerId: 1, isPrimary: true, clientX: x, clientY: y + 20 + (height - 40) * index / (count - 1) }))
    }
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y + 20 + (height - 40) * 12 / (count - 1) }))
  }, { x, y: bounds.y, height: bounds.height, count: names.length })
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "13")
  await expect(page.getByRole("heading", { level: 2, name: names[12]!, exact: true })).toBeInViewport()
  const offset = await page.evaluate(() => window.scrollY)
  await page.mouse.move(x, bounds.y + bounds.height - 20)
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(names.length))
  await page.mouse.move(20, 100)
  await expect(page.getByTestId("group-scroll-preview")).toHaveCount(0)
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "13")
  expect(await page.evaluate(() => window.scrollY)).toBe(offset)
})

test("variant group scrollbar tick widths form a moving wave", async ({ page }) => {
  await page.getByTestId("virtualized-sprite-groups").evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
  const bounds = (await scrollbar.boundingBox())!
  const ticks = scrollbar.locator("[data-active]")
  const count = await ticks.count()
  const middle = Math.floor(count / 2)
  const width = (index: number) => ticks.nth(index).evaluate(element => element.getBoundingClientRect().width)
  const move = (index: number) => page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 20 + (bounds.height - 40) * index / (count - 1))
  await move(middle)
  await expect.poll(() => width(middle)).toBeGreaterThan(21)
  await expect.poll(() => width(middle - 1)).toBeGreaterThan(17)
  expect(await width(0)).toBeLessThan(13)
  expect(await width(middle)).toBeGreaterThan(await width(middle - 1))
  await move(middle + 3)
  await expect.poll(() => width(middle + 3)).toBeGreaterThan(21)
  await expect.poll(() => width(middle)).toBeLessThan(13)
  await move(middle)
  await expect.poll(() => width(middle)).toBeGreaterThan(21)
  await expect.poll(() => width(middle + 3)).toBeLessThan(13)
})

test("variant group scrollbar rolls continuously within a selected group", async ({ page }, testInfo) => {
  await page.getByTestId("virtualized-sprite-groups").evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
  const bounds = (await scrollbar.boundingBox())!
  const count = Number(await scrollbar.getAttribute("aria-valuemax"))
  const middle = Math.floor(count / 2)
  const x = bounds.x + bounds.width / 2
  const yFor = (index: number) => bounds.y + 20 + (bounds.height - 40) * index / (count - 1)
  const session = testInfo.project.name === "mobile" ? await page.context().newCDPSession(page) : null
  const move = async (position: number, start = false) => {
    if (session) await session.send("Input.dispatchTouchEvent", { type: start ? "touchStart" : "touchMove", touchPoints: [{ x, y: yFor(position) }] })
    else await page.mouse.move(x, yFor(position))
  }
  await move(middle, true)
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(middle + 1))
  const card = page.getByTestId("group-scroll-preview").locator('[data-position="current"]')
  const initial = (await card.boundingBox())!.y
  const scrollY = await page.evaluate(() => window.scrollY)
  let previous = initial
  for (const offset of [0.15, 0.3, 0.45]) {
    await move(middle + offset)
    await expect.poll(async () => (await card.boundingBox())!.y).toBeLessThan(previous - 3)
    await expect(scrollbar).toHaveAttribute("aria-valuenow", String(middle + 1))
    previous = (await card.boundingBox())!.y
  }
  expect(initial - previous).toBeGreaterThan(15)
  await page.screenshot({ path: `/tmp/fortsprite-scroller-${testInfo.project.name}-continuous.png`, animations: "disabled", scale: "css" })
  await move(middle)
  await expect.poll(async () => Math.abs((await card.boundingBox())!.y - initial)).toBeLessThan(1)
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
  if (session) {
    await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] })
    await session.detach()
  }
})

test("variant group scrollbar keeps rolling cards separated", async ({ page }) => {
  await page.getByTestId("virtualized-sprite-groups").evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
  const bounds = (await scrollbar.boundingBox())!
  const count = Number(await scrollbar.getAttribute("aria-valuemax"))
  const middle = Math.floor(count / 2)
  const yFor = (index: number) => bounds.y + 20 + (bounds.height - 40) * index / (count - 1)
  await page.mouse.move(bounds.x + bounds.width / 2, yFor(middle))
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(middle + 1))
  const recorder = await page.getByTestId("group-scroll-preview").evaluateHandle(element => {
    const state = { frames: 0, minimumGap: Infinity, worst: "" }
    let frame = 0
    const sample = () => {
      const cards = [...element.querySelectorAll('[data-position]:not([data-position="buffer"])')]
        .map(card => card.getBoundingClientRect()).sort((a, b) => a.top - b.top)
      for (let index = 1; index < cards.length; index++) {
        const gap = cards[index]!.top - cards[index - 1]!.bottom
        if (gap < state.minimumGap) {
          state.minimumGap = gap
          state.worst = JSON.stringify([...element.querySelectorAll('[data-position]:not([data-position="buffer"])')].map(card => ({ text: card.textContent, height: (card as HTMLElement).offsetHeight, rect: card.getBoundingClientRect().toJSON(), transform: getComputedStyle(card).transform })))
        }
      }
      state.frames++
      frame = requestAnimationFrame(sample)
    }
    frame = requestAnimationFrame(sample)
    return { state, stop: () => cancelAnimationFrame(frame) }
  })
  for (const index of [...Array.from({ length: count }, (_, index) => index), ...Array.from({ length: count }, (_, index) => count - index - 1)]) {
    await page.mouse.move(bounds.x + bounds.width / 2, yFor(index), { steps: 4 })
    await expect(scrollbar).toHaveAttribute("aria-valuenow", String(index + 1))
  }
  await expect.poll(() => page.getByTestId("group-scroll-preview").evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0)
  const result = await recorder.evaluate(recorder => { recorder.stop(); return recorder.state })
  expect(result.frames).toBeGreaterThan(10)
  expect(result.minimumGap, result.worst).toBeGreaterThanOrEqual(0)
  expect(result.minimumGap).toBeLessThan(1)
})

test("variant group scrollbar aligns the current card with its highlighted tick at both ends", async ({ page }, testInfo) => {
  await page.getByTestId("virtualized-sprite-groups").evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
  const bounds = (await scrollbar.boundingBox())!
  const count = Number(await scrollbar.getAttribute("aria-valuemax"))
  for (const index of [0, count - 1]) {
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 20 + (bounds.height - 40) * index / (count - 1))
    await expect(scrollbar).toHaveAttribute("aria-valuenow", String(index + 1))
    await expect.poll(() => scrollbar.evaluate(element => {
      const tick = element.querySelector('[data-active="true"]')!.getBoundingClientRect()
      const card = element.querySelector('[data-position="current"]')!.getBoundingClientRect()
      return Math.abs((tick.top + tick.height / 2) - (card.top + card.height / 2))
    })).toBeLessThan(1)
    const card = await page.getByTestId("group-scroll-preview").locator('[data-position="current"]').boundingBox()
    expect(card!.y).toBeGreaterThan(await page.locator("header").evaluate(element => element.getBoundingClientRect().bottom))
    expect(card!.y + card!.height).toBeLessThan(page.viewportSize()!.height)
    expect(bounds.x).toBeLessThan(8)
    expect(card!.x).toBeGreaterThan(bounds.x + bounds.width - 6)
    expect(card!.x + card!.width).toBeLessThan(page.viewportSize()!.width)
    const mirrored = await page.getByTestId("group-scroll-preview").locator('[data-position="current"]').evaluate(element => {
      const pointer = getComputedStyle(element, "::after")
      return { left: pointer.left, border: pointer.borderLeftWidth }
    })
    expect(mirrored.left).toBe("-6px")
    expect(mirrored.border).toBe("1px")
    if (index === 0 || index === count - 1) {
      await page.screenshot({ path: `/tmp/fortsprite-scroller-${testInfo.project.name}-${index === 0 ? "start" : "end"}.png`, animations: "disabled", scale: "css" })
    }
  }
})

test("variant group scrollbar stays full height near the mobile toolbar without blocking controls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile safe areas and browser height changes")
  await page.addStyleTag({ content: ":root { --safe-area-top: 59px; --safe-area-bottom: 34px; }" })
  const groups = page.getByTestId("virtualized-sprite-groups")
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  const showFirstGroupAtBottom = () => groups.evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - (innerHeight - 160)))
  for (const height of [760, 640]) {
    await page.setViewportSize({ width: 393, height })
    await showFirstGroupAtBottom()
    await expect(scrollbar).toBeVisible()
    await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
    const bounds = (await scrollbar.boundingBox())!
    const ticks = await scrollbar.locator("[data-active]").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top))
    expect(Math.min(...ticks.slice(1).map((top, index) => top - ticks[index]!))).toBeGreaterThan(12)
    const filter = page.getByRole("button", { name: "Add collection filter" })
    const searchBounds = (await page.getByRole("combobox", { name: "Search collection" }).boundingBox())!
    expect(searchBounds.x).toBeGreaterThanOrEqual(bounds.x + bounds.width)
    const filterBounds = (await filter.boundingBox())!
    expect(filterBounds.x).toBeGreaterThanOrEqual(bounds.x + bounds.width)
    await filter.click()
    await expect(page.getByRole("listbox")).toBeVisible()
    await page.keyboard.press("Escape")
    await assertFits(page)
    await page.screenshot({ path: `/tmp/fortsprite-mobile-top-scroller-${height}.png`, animations: "disabled", scale: "css" })
    await groups.evaluate(element => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
    await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
    expect(Math.abs((await scrollbar.boundingBox())!.y - bounds.y)).toBeLessThan(1)
  }
})

test("variant group scrollbar follows filters and hides outside grouped view", async ({ page }) => {
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  const showGroups = async () => {
    await page.getByTestId("virtualized-sprite-groups").evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
    await expect(scrollbar).toBeVisible()
  }
  await showGroups()
  await page.getByRole("combobox", { name: "Search collection" }).evaluate((element) => element.scrollIntoView({ block: "center" }))
  await addFilterToken(page, "Gold")
  await page.keyboard.press("Escape")
  await showGroups()
  await scrollbar.focus()
  await scrollbar.press("Home")
  const collection = await snapshot(page)
  const goldGroup = collection.items.toSorted((a, b) => a.displayOrder - b.displayOrder).find((item) => item.variant === "Gold")!
  const baseSprite = collection.items.find((item) => item.baseName === goldGroup.baseName && item.variant === "Base")!
  const portrait = page.getByTestId("group-scroll-preview").locator('[data-position="current"] img')
  await expect(portrait).toHaveAttribute("alt", `Base ${goldGroup.baseName} Sprite`)
  const filename = baseSprite.imagePath!.split("/").at(-1)!.split(".")[0]!
  await expect(portrait).toHaveAttribute("src", new RegExp(`%2F${filename}\\.`))
  await expect.poll(() => portrait.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  const clearQuery = page.getByRole("button", { name: "Clear collection query" })
  await clearQuery.evaluate((element) => element.scrollIntoView({ block: "center" }))
  await clearQuery.click()
  const search = page.getByRole("combobox", { name: "Search collection", exact: true })
  await search.fill(first.baseName)
  await expect(page.getByTestId("virtualized-sprite-groups")).toHaveAttribute("data-total-groups", "1")
  await expect(scrollbar).toHaveCount(0)
  await search.fill("no-such-sprite-123")
  await expect(page.getByText("No Sprites match these filters", { exact: true })).toBeVisible()
  await expect(scrollbar).toHaveCount(0)
  await page.getByRole("button", { name: "Clear filters", exact: true }).click()
  await showGroups()
  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await expect(scrollbar).toHaveCount(0)
  await page.getByRole("radio", { name: "List view", exact: true }).click()
  await expect(scrollbar).toHaveCount(0)
})

test("variant group scrollbar previews a rapid touch sweep and mounts the destination before release scrolling", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "CDP touch input uses mobile Chromium")
  const groups = page.getByTestId("virtualized-sprite-groups")
  await groups.evaluate((element) => window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - 100))
  const scrollbar = page.getByRole("scrollbar", { name: "Jump to variant group" })
  await expect.poll(async () => Math.round((await scrollbar.boundingBox())?.height ?? 0)).toBe(288)
  const bounds = (await scrollbar.boundingBox())!
  const session = await page.context().newCDPSession(page)
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 })
  const x = bounds.x + bounds.width - 10
  const count = Number(await scrollbar.getAttribute("aria-valuemax"))
  const target = Math.floor((count - 1) * 0.7)
  const yFor = (index: number) => bounds.y + 20 + (bounds.height - 40) * index / (count - 1)
  const originalOffset = await page.evaluate(() => window.scrollY)
  const originalRendered = await groups.getAttribute("data-rendered-groups")
  const recorder = await page.evaluateHandle((target) => {
    const container = document.querySelector('[data-testid="virtualized-sprite-groups"]')!
    const original = window.scrollTo
    const state = { blankFrames: 0, frames: 0, jumps: [] as { mounted: boolean; covered: boolean }[] }
    const covered = () => [...container.children].some((element) => {
      const rect = element.getBoundingClientRect()
      return rect.top < innerHeight / 2 && rect.bottom > innerHeight / 2
    })
    let frame = 0
    const sample = () => {
      state.frames++
      if (!covered()) state.blankFrames++
      frame = requestAnimationFrame(sample)
    }
    frame = requestAnimationFrame(sample)
    window.scrollTo = ((...args: Parameters<typeof window.scrollTo>) => {
      const mounted = !!container.querySelector(`[data-index="${target}"]`)
      original.apply(window, args)
      state.jumps.push({ mounted, covered: covered() })
    }) as typeof window.scrollTo
    return { state, stop: () => { cancelAnimationFrame(frame); window.scrollTo = original } }
  }, target)
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: bounds.y + 20 }] })
  await expect(scrollbar).toHaveAttribute("data-dragging", "true")
  // No settling/assertion between moves: exercise the rapid reversals in the
  // phone recording with a slower main thread, including both endpoints.
  for (const fraction of [0.2, 0.8, 1, 0.6, 0.1, 0.9, 0, 0.35, 0.7]) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: yFor(Math.floor((count - 1) * fraction)) }] })
  }
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(target + 1))
  await expect(page.getByTestId("group-scroll-preview").locator('[data-position="current"]')).toContainText("Release to jump")
  expect(await page.evaluate(() => window.scrollY)).toBe(originalOffset)
  await expect(groups).toHaveAttribute("data-rendered-groups", originalRendered!)
  expect(await recorder.evaluate(({ state }) => state.jumps.length)).toBe(0)
  await expect.poll(() => page.getByTestId("group-scroll-preview").locator('[data-position="current"] img').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.screenshot({ path: "/tmp/fortsprite-group-scroller-mobile-touch-preview.png", animations: "disabled", scale: "css" })
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await expect(scrollbar).toHaveAttribute("data-dragging", "false")
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(target + 1))
  await expect(groups.locator(`[data-index="${target}"]`).getByRole("heading", { level: 2 })).toBeInViewport()
  const samples = await recorder.evaluate((recorder) => { recorder.stop(); return recorder.state })
  expect(samples.frames).toBeGreaterThan(10)
  expect(samples.blankFrames).toBe(0)
  expect(samples.jumps.length).toBeGreaterThan(0)
  expect(samples.jumps.every(({ mounted, covered }) => mounted && covered)).toBe(true)
  await page.screenshot({ path: "/tmp/fortsprite-group-scroller-mobile-touch.png", animations: "disabled", scale: "css" })
  // A cancelled gesture must restore the current group without moving the page.
  const settledOffset = await page.evaluate(() => window.scrollY)
  const nextBounds = (await scrollbar.boundingBox())!
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: nextBounds.y + 20 }] })
  await expect(scrollbar).toHaveAttribute("aria-valuenow", "1")
  await session.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] })
  await expect(scrollbar).toHaveAttribute("data-dragging", "false")
  await expect(scrollbar).toHaveAttribute("aria-valuenow", String(target + 1))
  expect(await page.evaluate(() => window.scrollY)).toBe(settledOffset)
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 })
  await session.detach()
})
