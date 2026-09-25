import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import { instant } from "@next/playwright"

type InstantActor = {
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

type InstantFixture = {
  cookies: InstantActor["cookies"]
  actors: { a: InstantActor; b: InstantActor }
  sprites: { id: string; baseName: string; variant: string; rarity: string }[]
}

function readFixture(): InstantFixture {
  return JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  ) as InstantFixture
}

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  const fixture = readFixture()
  await page.context().addCookies([
    {
      ...fixture.cookies[testInfo.project.name as "desktop" | "mobile"],
      name: "__Secure-better-auth.session_token",
      url: baseURL!.replace("http:", "https:"),
      secure: true,
    },
  ])
})

async function assertShell(page: Page) {
  await expect(page.getByTestId("collection-shell")).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Homepage", exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByTestId("collection-content")).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath("shell.png") })
}

test("collection hard navigation serves its shell while private data is gated", async ({
  page,
  baseURL,
  isMobile,
}) => {
  await instant(
    page,
    async () => {
      await page.goto("/collection")
      await expect(page).toHaveURL(/\/collection$/)
      await assertShell(page)
    },
    { baseURL },
  )
  await page.reload()
  await expect(page.getByTestId("collection-content")).toBeVisible()

  const collectionResponse = await page.request.get("/api/v1/collection")
  expect(collectionResponse.status()).toBe(200)
  const collection = await collectionResponse.json()
  const first = collection.items.toSorted(
    (a: { displayOrder: number }, b: { displayOrder: number }) =>
      a.displayOrder - b.displayOrder,
  )[0]
  const updateResponse = await page.request.put(
    `/api/v1/collection/${first.id}`,
    {
      headers: { origin: "https://localhost:3002" },
      data: { owned: true, mastered: true },
    },
  )
  expect(updateResponse.status()).toBe(200)
  await page.reload()

  await expect(page.getByTestId("mastered-crown").first()).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath("loaded.png"),
  })

  const installDismiss = page.getByRole("button", {
    name: "Dismiss install suggestion",
  })
  if (await installDismiss.isVisible()) await installDismiss.click()
  await page
    .locator("article[data-sprite-id]")
    .first()
    .getByRole("button", { name: /^Open .* details/ })
    .click()
  const details = page.getByRole("dialog")
  await expect(details).toBeVisible()
  await expect(details.getByText("About this Sprite")).toBeVisible()
  await expect(
    details.getByRole("button", { name: /^Mastered / }),
  ).toHaveAttribute("aria-pressed", "true")
  if (isMobile) {
    await expect(page.locator('[data-slot="drawer-content"]')).toBeVisible()
    await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0)
  } else {
    await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible()
    await expect(page.locator('[data-slot="drawer-content"]')).toHaveCount(0)
  }
  await page.screenshot({
    path: test.info().outputPath("details.png"),
  })
  await details.getByRole("button", { name: "Done", exact: true }).click()
})

test("mobile grid density changes and list rows stay compact", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile density regression")
  const fixture = readFixture()
  const origin = baseURL!.replace("http:", "https:")
  const teammateContext = await browser.newContext({ baseURL })
  await teammateContext.addCookies([
    {
      ...fixture.actors.b.cookies.mobile,
      name: "__Secure-better-auth.session_token",
      url: origin,
      secure: true,
    },
  ])
  const teammate = await teammateContext.newPage()
  const browserErrors: string[] = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() !== "error") return
    const location = message.location().url
    if (
      location.includes("/_vercel/") ||
      message.text().includes("/_vercel/")
    )
      return
    browserErrors.push(message.text())
  })

  const request = await page.request.post("/api/v1/friends", {
    headers: { origin },
    data: { handle: fixture.actors.b.handle },
  })
  expect(request.status()).toBe(200)
  const accept = await teammate.request.post(
    `/api/v1/friends/${fixture.actors.a.userId}`,
    {
      headers: { origin },
      data: { action: "accept" },
    },
  )
  expect(accept.status()).toBe(200)
  const helperSprite = fixture.sprites[1]!
  const master = await teammate.request.put(
    `/api/v1/collection/${helperSprite.id}`,
    {
      headers: { origin },
      data: { owned: true, mastered: true },
    },
  )
  expect(master.status()).toBe(200)

  await page.goto("/collection")
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page).toHaveTitle(/FortSprite/)
  await expect(page.getByTestId("collection-content")).toBeVisible()
  await expect(page.locator("nextjs-portal")).toHaveCount(0)
  const firstTile = page.locator("article[data-sprite-id]").first()
  const tileWidth = () =>
    firstTile.evaluate((element) => element.getBoundingClientRect().width)

  await page.getByRole("radio", { name: "Grid view", exact: true }).click()
  await page.getByRole("radio", { name: "Small grid", exact: true }).click()
  const helperTile = page.locator(
    `article[data-sprite-id="${helperSprite.id}"]`,
  )
  await expect(helperTile.getByText("1 can help · 1 mastered")).toBeVisible()
  const smallWidth = await tileWidth()
  await page.screenshot({ path: test.info().outputPath("grid-small.png") })

  await page.getByRole("radio", { name: "Medium grid", exact: true }).click()
  const mediumWidth = await tileWidth()
  expect(mediumWidth).toBeGreaterThan(smallWidth)

  await page.getByRole("radio", { name: "Large grid", exact: true }).click()
  expect(await tileWidth()).toBeGreaterThan(mediumWidth)

  await page.getByRole("radio", { name: "List view", exact: true }).click()
  await expect(
    page.locator("article[data-sprite-id]").getByText(/^\d+ can help/),
  ).toHaveCount(0)
  const visibleRowHeights = await page
    .locator("article[data-sprite-id]:visible")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().height),
    )
  expect(new Set(visibleRowHeights).size).toBe(1)
  await page.screenshot({ path: test.info().outputPath("list.png") })

  await helperTile.getByRole("button", { name: /^Open / }).click()
  const details = page.getByRole("dialog")
  const helpers = details.getByText("Friends who can help")
  await helpers.scrollIntoViewIfNeeded()
  await expect(helpers).toBeVisible()
  const masteredFriend = details
    .getByRole("listitem")
    .filter({ hasText: fixture.actors.b.displayName })
  await expect(
    masteredFriend.getByText("Mastered", { exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: test.info().outputPath("mastered-helper.png"),
  })
  expect(browserErrors).toEqual([])
  await teammateContext.close()
})

test("collection soft navigation commits its shell and then streams private data", async ({
  page,
  isMobile,
}) => {
  await page.goto("/account")
  const navigation = page.getByRole("navigation", {
    name: isMobile ? "Mobile primary" : "Primary",
    exact: true,
  })
  const link = navigation.getByRole("link", { name: "Collection", exact: true })
  await expect(link).toBeVisible()
  await instant(page, async () => {
    await link.click()
    await expect(page).toHaveURL(/\/collection$/)
    await assertShell(page)
  })
  await expect(page.getByTestId("collection-content")).toBeVisible()
  if (isMobile) {
    await expect(
      page.getByRole("navigation", { name: "Mobile primary" }),
    ).toBeVisible()
  }
})
