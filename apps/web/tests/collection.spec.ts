import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { CollectionSnapshot } from "@workspace/contracts"

type BrowserFixture = {
  baseURL: string
  cookie: {
    name: string
    value: string
    url: string
    httpOnly: boolean
    sameSite: "Lax"
  }
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

async function assertPersisted(
  page: Page,
  expected: { owned: boolean; mastered: boolean },
) {
  const collection = await snapshot(page)
  expect(collection.friendAvailability.status).toBe("ready")
  expect(collection.items.find((item) => item.id === first.id)).toMatchObject(
    expected,
  )
}

async function assertFits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
}

test.beforeEach(async ({ page }) => {
  const fixture = JSON.parse(
    readFileSync(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  ) as BrowserFixture
  await page.context().addCookies([fixture.cookie])
  errors = []
  serverErrors = []
  expectedServerErrors = 0
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message))
  page.on("console", (message) => {
    if (message.type() !== "error") return
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
  const count = await page.locator("article[data-sprite-id]").count()
  await page.getByRole("combobox", { name: "Filter by rarity" }).click()
  await page.getByRole("option", { name: "Rare", exact: true }).click()
  const rare = await snapshot(page)
  await expect(page.locator("article[data-sprite-id]")).toHaveCount(
    rare.items.filter((item) => item.rarity === "Rare").length,
  )
  await page
    .getByRole("textbox", { name: "Search collection" })
    .fill("zzzz-no-such-sprite")
  await expect(page.getByText("No Sprites match these filters")).toBeVisible()
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(
    page.getByRole("textbox", { name: "Search collection" }),
  ).toHaveValue("")
  await expect(
    page.getByRole("combobox", { name: "Filter by rarity" }),
  ).toHaveText("All rarities")
  await expect(page.locator("article[data-sprite-id]")).toHaveCount(count)
  await page
    .getByRole("textbox", { name: "Search collection" })
    .fill(first.baseName)
  const expected = rare.items.filter((item) =>
    `${item.variant} ${item.baseName} ${item.season ?? "Season unavailable"}`
      .toLowerCase()
      .includes(first.baseName.toLowerCase()),
  )
  await expect(page.locator("article[data-sprite-id]")).toHaveCount(
    expected.length,
  )
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
  await expect(
    page.getByText("No accepted friends have captured this Sprite yet", {
      exact: true,
    }),
  ).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("dialog")).toBeVisible()
  for (const { source, percent } of first.dropChances)
    await expect(
      page
        .getByRole("dialog")
        .getByText(`${source}: ${percent}%`, { exact: true }),
    ).toBeVisible()
  await expect(page.getByText(/^Friends checked /)).toBeVisible()
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
  const missing = page
    .getByRole("group", { name: "Filter collection status" })
    .getByRole("button", { name: /^Missing/ })
  await missing.click()
  await details(page).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Captured / })
    .click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(tile(page)).toHaveCount(0)
  await expect(missing).toBeFocused()
  await assertPersisted(page, { owned: true, mastered: false })
})

test("rapid collection actions stay optimistic and coalesce to the last intent", async ({
  page,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const search = page.getByRole("textbox", { name: "Search collection" })
  await search.fill("Jackrabbit")
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
  await expect(search).toHaveValue("Jackrabbit")
  await assertPersisted(page, { owned: false, mastered: false })
  await page.reload()
  await expect(captured(page)).toHaveAttribute("aria-pressed", "false")
})
