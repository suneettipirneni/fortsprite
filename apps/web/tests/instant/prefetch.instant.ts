import { readFileSync } from "node:fs"
import { instant } from "@next/playwright"
import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import type { CollectionSnapshot, ViewerResponse } from "@workspace/contracts"

type Actor = {
  displayName: string
  cookies: Record<
    "desktop" | "mobile",
    Parameters<BrowserContext["addCookies"]>[0][number]
  >
}

type Fixture = { actors: { a: Actor; b: Actor } }

function readFixture(): Fixture {
  return JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  ) as Fixture
}

async function authenticate(
  context: BrowserContext,
  actor: Actor,
  project: "desktop" | "mobile",
  baseURL: string,
) {
  await context.addCookies([
    {
      ...actor.cookies[project],
      name: "__Secure-better-auth.session_token",
      url: baseURL.replace("http:", "https:"),
      secure: true,
    },
  ])
}

function navigation(page: Page, isMobile: boolean) {
  return page.getByRole("navigation", {
    name: isMobile ? "Mobile primary" : "Primary",
    exact: true,
  })
}

function collectedCount(page: Page) {
  return page.getByRole("term").filter({ hasText: /^Collected$/ })
    .locator("..").getByRole("definition")
}

async function waitForPrefetch(page: Page, path: string) {
  const response = await page.waitForResponse((response) => {
    const headers = response.request().headers()
    return new URL(response.url()).pathname === path &&
      headers.rsc === "1" &&
      !headers["next-router-segment-prefetch"] &&
      headers["next-router-prefetch"] !== "1" &&
      headers["next-router-prefetch"] !== "3"
  })
  expect(response.status()).toBe(200)
}

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  await authenticate(
    page.context(),
    readFixture().actors.a,
    testInfo.project.name as "desktop" | "mobile",
    baseURL!,
  )
})

test("primary routes prefetch structure while tracking waits for navigation", async ({
  page,
  isMobile,
}) => {
  const prefetched = Promise.all(
    ["/", "/collection", "/matches", "/friends"].map((path) =>
      waitForPrefetch(page, path),
    ),
  )
  await page.goto("/account")
  await expect(page.getByLabel("FortSprite display name", { exact: true }))
    .toBeVisible()
  const nav = navigation(page, isMobile)
  await prefetched

  for (const href of ["/", "/collection", "/matches", "/friends"]) {
    await instant(page, async () => {
      await nav.locator(`a[href="${href}"]`).click()
      await expect(page).toHaveURL(new RegExp(`${href}$`))
      if (href === "/") {
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Good hunting,")
        await expect(collectedCount(page)).toHaveCount(0)
      } else if (href === "/collection") {
        await expect(page.getByRole("main").getByTestId("collection-shell")).toBeVisible()
        await expect(page.getByRole("main").getByTestId("collection-content")).toHaveCount(0)
      } else if (href === "/matches") {
        await expect(page.getByRole("heading", { level: 1 }))
          .toHaveText("Find your next capture.")
        await expect(page.getByRole("term").filter({ hasText: /^Missing$/ }))
          .toHaveCount(0)
      } else {
        await expect(page.getByRole("heading", { level: 1 }))
          .toHaveText("Collect with your squad.")
        await expect(page.getByRole("textbox", { name: "Search friends" }))
          .toHaveCount(0)
      }
    })
    if (href === "/") await expect(collectedCount(page)).toHaveText(/^\d+$/)
    else if (href === "/collection")
      await expect(page.getByRole("main").getByTestId("collection-content")).toBeVisible()
    else if (href === "/matches")
      await expect(page.getByRole("term").filter({ hasText: /^Missing$/ })).toBeVisible()
    else await expect(page.getByRole("textbox", { name: "Search friends" })).toBeVisible()
  }
})

test("a collection action invalidates a prefetched overview", async ({
  page,
  isMobile,
  baseURL,
}) => {
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  const original: CollectionSnapshot = await response.json()
  const prefetched = waitForPrefetch(page, "/collection")
  await page.goto("/")
  await expect(collectedCount(page)).toHaveText(String(original.progress.owned))
  const nav = navigation(page, isMobile)
  await prefetched
  await instant(page, async () => {
    await nav.locator('a[href="/collection"]').click()
    await expect(page.getByRole("main").getByTestId("collection-shell")).toBeVisible()
  })
  await expect(page.getByRole("main").getByTestId("collection-content")).toBeVisible()
  const tile = page.locator("article[data-sprite-id]").first()
  const id = await tile.getAttribute("data-sprite-id")
  const sprite = original.items.find((item) => item.id === id)!

  try {
    const [saved] = await Promise.all([
      page.waitForResponse((result) =>
        result.request().method() === "POST" &&
        Boolean(result.request().headers()["next-action"]),
      ),
      tile.getByRole("button", { name: /^Captured / }).click(),
    ])
    expect(saved.status()).toBe(200)
    await expect(tile.getByRole("button", { name: /^Captured / }))
      .toHaveAttribute("aria-pressed", String(!sprite.owned))
    await nav.locator('a[href="/"]').click()
    await expect(collectedCount(page)).toHaveText(
      String(original.progress.owned + (sprite.owned ? -1 : 1)),
    )
  } finally {
    const restored = await page.request.put(`/api/v1/collection/${sprite.id}`, {
      headers: { origin: baseURL!.replace("http:", "https:") },
      data: { owned: sprite.owned, mastered: sprite.mastered },
    })
    expect(restored.status()).toBe(200)
  }
})

test("a profile action refreshes a previously prefetched greeting", async ({
  page,
  isMobile,
  baseURL,
}) => {
  const response = await page.request.get("/api/v1/me")
  expect(response.status()).toBe(200)
  const { viewer }: ViewerResponse = await response.json()
  const prefetched = waitForPrefetch(page, "/")
  await page.goto("/account")
  const nav = navigation(page, isMobile)
  await prefetched
  await instant(page, async () => {
    await nav.locator('a[href="/"]').click()
    await expect(page.getByRole("heading", { level: 1 }))
      .toHaveText(`Good hunting, ${viewer.displayName.split(/\s+/)[0]}.`)
  })
  await nav.locator('a[href="/account"]').click()

  try {
    await page.getByLabel("FortSprite display name", { exact: true })
      .fill("Prefetched collector")
    await page.getByRole("button", { name: "Save profile", exact: true }).click()
    await expect(page.locator("form").getByRole("status"))
      .toHaveText("Your profile has been saved.")
    await nav.locator('a[href="/"]').click()
    await expect(page.getByRole("heading", { level: 1 }))
      .toHaveText("Good hunting, Prefetched.")
  } finally {
    const restored = await page.request.put("/api/v1/profile", {
      headers: { origin: baseURL!.replace("http:", "https:") },
      data: {
        handle: viewer.handle,
        displayName: viewer.displayName,
        fortniteDisplayName: viewer.fortniteDisplayName,
      },
    })
    expect(restored.status()).toBe(200)
  }
})

test("private prefetch keeps two signed-in users separate", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, testInfo) => {
  const fixture = readFixture()
  const otherContext = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
  })
  await authenticate(
    otherContext,
    fixture.actors.b,
    testInfo.project.name as "desktop" | "mobile",
    baseURL!,
  )
  const other = await otherContext.newPage()
  const origin = baseURL!.replace("http:", "https:")
  const collectionResponse = await other.request.get("/api/v1/collection")
  expect(collectionResponse.status()).toBe(200)
  const original: CollectionSnapshot = await collectionResponse.json()
  const sprite = original.items.find((item) => !item.owned)!
  const captured = await other.request.put(`/api/v1/collection/${sprite.id}`, {
    headers: { origin },
    data: { owned: true, mastered: false },
  })
  expect(captured.status()).toBe(200)
  try {
    for (const [actorPage, actor, mobile] of [
      [page, fixture.actors.a, isMobile],
      [other, fixture.actors.b, false],
    ] as const) {
      const response = await actorPage.request.get("/api/v1/collection")
      expect(response.status()).toBe(200)
      const snapshot: CollectionSnapshot = await response.json()
      const prefetched = waitForPrefetch(actorPage, "/")
      await actorPage.goto("/account")
      await expect(actorPage.getByLabel("FortSprite display name", { exact: true }))
        .toHaveValue(actor.displayName)
      await prefetched
      await instant(actorPage, async () => {
        await navigation(actorPage, mobile).locator('a[href="/"]').click()
        await expect(actorPage.getByRole("heading", { level: 1 }))
          .toHaveText(`Good hunting, ${actor.displayName.split(/\s+/)[0]}.`)
      })
      await expect(collectedCount(actorPage)).toHaveText(String(snapshot.progress.owned))
    }
  } finally {
    const restored = await other.request.put(`/api/v1/collection/${sprite.id}`, {
      headers: { origin },
      data: { owned: sprite.owned, mastered: sprite.mastered },
    })
    expect(restored.status()).toBe(200)
    await otherContext.close()
  }
})

test("tracking changed in another tab is fresh after prefetch and on return navigation", async ({
  page,
  baseURL,
  isMobile,
}) => {
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  const original: CollectionSnapshot = await response.json()
  const latestSeason = Math.max(...original.items.map((item) => item.sourceSeasonId ?? -1))
  const sprite = original.items.filter((item) => item.sourceSeasonId === latestSeason)
    .toSorted((a, b) => a.displayOrder - b.displayOrder)[0]!
  const secondTab = await page.context().newPage()
  const update = async (owned: boolean, mastered: boolean) => {
    const result = await secondTab.request.put(`/api/v1/collection/${sprite.id}`, {
      headers: { origin: baseURL!.replace("http:", "https:") },
      data: { owned, mastered },
    })
    expect(result.status()).toBe(200)
  }
  try {
    await update(false, false)
    const prefetched = waitForPrefetch(page, "/collection")
    await page.goto("/account")
    await prefetched
    await update(true, true)
    const nav = navigation(page, isMobile)
    await nav.locator('a[href="/collection"]').click()
    const tile = page.locator(`article[data-sprite-id="${sprite.id}"]`)
    await expect(tile.getByRole("button", { name: /^Captured / }))
      .toHaveAttribute("aria-pressed", "true")
    await expect(tile.getByTestId("mastered-crown")).toBeVisible()
    await nav.locator('a[href="/account"]').click()
    await expect(page.getByLabel("FortSprite display name", { exact: true })).toBeVisible()
    await update(false, false)
    await nav.locator('a[href="/collection"]').click()
    await expect(tile.getByRole("button", { name: /^Captured / }))
      .toHaveAttribute("aria-pressed", "false")
    await expect(tile.getByTestId("mastered-crown")).toHaveCount(0)
  } finally {
    await update(sprite.owned, sprite.mastered)
    await secondTab.close()
  }
})
