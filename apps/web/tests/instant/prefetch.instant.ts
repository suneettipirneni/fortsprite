import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
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

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  // Fresh actors isolate private caches, mutations, and per-user rate budgets.
  // The suite has one worker; the seeder removes the previous temporary actors.
  execFileSync(process.execPath, [
    resolve(__dirname, "../../../api/node_modules/tsx/dist/cli.mjs"),
    resolve(__dirname, "../../../api/tests/seed-browser.ts"),
  ], { env: { ...process.env, NODE_ENV: "test" }, stdio: "pipe" })
  await authenticate(
    page.context(),
    readFixture().actors.a,
    testInfo.project.name as "desktop" | "mobile",
    baseURL!,
  )
})

// Each navigation gets a fresh page: previous destinations cannot warm its cache.
for (const href of ["/", "/collection", "/matches", "/friends", "/account"]) {
  test(`primary link to ${href} has its prefetched content ready`, async ({
    page,
    isMobile,
  }, testInfo) => {
    const source = href === "/account" ? "/collection" : "/account"
    await page.goto(source)
    const nav = navigation(page, isMobile)
    await expect(nav).toBeVisible()
    if (source === "/account")
      await expect(page.getByLabel("FortSprite display name", { exact: true })).toBeEnabled()
    else
      await expect(page.getByRole("main").getByTestId("collection-content")).toBeVisible()

    await instant(page, async () => {
      await nav.locator(`a[href="${href}"]`).click()
      await expect(page).toHaveURL(new URL(href, testInfo.project.use.baseURL).href)
      await expect(nav).toBeVisible()
      if (href === "/") {
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Good hunting,")
        await expect(collectedCount(page)).toBeVisible()
        await expect(collectedCount(page)).toHaveText(/^\d+$/)
        await expect(page.getByRole("progressbar", { name: "Collection completion" })).toBeVisible()
        await expect(page.getByRole("status", { name: "Loading completion" })).toHaveCount(0)
      } else if (href === "/collection") {
        await expect(page.getByRole("main").getByTestId("collection-shell")).toBeVisible()
        await expect(page.getByRole("main").getByTestId("collection-content")).toBeVisible()
        await expect(page.getByRole("main").locator("article[data-sprite-id] img").first()).toBeVisible()
        await expect(page.getByRole("progressbar", { name: "Captured progress" })).toBeVisible()
        await expect(page.getByRole("progressbar", { name: "Mastered progress" })).toBeVisible()
      } else if (href === "/matches") {
        await expect(page.getByRole("heading", { level: 1 }))
          .toHaveText("Find your next capture.")
        await expect(page.getByRole("textbox", { name: /Search .* missing Sprites/ })).toBeEnabled()
        await expect(page.getByRole("status", { name: "Loading missing count" })).toHaveCount(0)
      } else if (href === "/friends") {
        await expect(page.getByRole("heading", { level: 1 }))
          .toHaveText("Collect with your squad.")
        await expect(page.getByRole("textbox", { name: "Search friends" }))
          .toBeEnabled()
      } else {
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make your profile yours.")
        await expect(page.getByRole("textbox", { name: "FortSprite display name" })).toBeEnabled()
        // Credentials must stay fresh and load only after navigation.
        await expect(page.getByRole("status", { name: "Loading passkeys" })).toBeVisible()
        await expect(page.getByRole("textbox", { name: "Passkey name" })).toBeDisabled()
      }
      const screenshot = testInfo.outputPath("prefetched-page.png")
      await page.screenshot({ path: screenshot })
      await testInfo.attach("prefetched-page", {
        path: screenshot,
        contentType: "image/png",
      })
    })
    if (href === "/account") {
      await expect(page.getByRole("textbox", { name: "Passkey name" })).toBeEnabled()
      await expect(page.getByRole("status", { name: "Loading passkeys" })).toHaveCount(0)
    }
  })
}

test("a collection action invalidates a prefetched overview", async ({
  page,
  isMobile,
  baseURL,
}) => {
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  const original: CollectionSnapshot = await response.json()

  await page.goto("/")
  await expect(collectedCount(page)).toHaveText(String(original.progress.owned))
  const nav = navigation(page, isMobile)

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

  await page.goto("/account")
  const nav = navigation(page, isMobile)

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

      await actorPage.goto("/account")
      await expect(actorPage.getByLabel("FortSprite display name", { exact: true }))
        .toHaveValue(actor.displayName)

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

test("tracking changed in another tab refreshes a prefetched collection", async ({
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

    await page.goto("/account")

    await secondTab.goto("/collection")
    const secondTile = secondTab.locator(`article[data-sprite-id="${sprite.id}"]`)
    await expect(secondTile.getByRole("button", { name: /^Captured / }))
      .toHaveAttribute("aria-pressed", "false")
    const refreshed = page.waitForEvent("load")
    await secondTile.getByRole("button", { name: /^Captured / }).click()
    await refreshed
    const nav = navigation(page, isMobile)
    await nav.locator('a[href="/collection"]').click()
    const tile = page.locator(`article[data-sprite-id="${sprite.id}"]`)
    await expect(tile.getByRole("button", { name: /^Captured / }))
      .toHaveAttribute("aria-pressed", "true")
    await nav.locator('a[href="/account"]').click()
    await expect(page.getByLabel("FortSprite display name", { exact: true })).toBeVisible()
    const refreshedAgain = page.waitForEvent("load")
    await secondTile.getByRole("button", { name: /^Captured / }).click()
    await refreshedAgain
    await nav.locator('a[href="/collection"]').click()
    await expect(tile.getByRole("button", { name: /^Captured / }))
      .toHaveAttribute("aria-pressed", "false")
  } finally {
    await update(sprite.owned, sprite.mastered)
    await secondTab.close()
  }
})
