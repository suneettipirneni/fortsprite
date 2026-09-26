import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  )
  const cookie =
    fixture.cookies[testInfo.project.name === "desktop" ? "desktop" : "mobile"]
  await page.context().addCookies([
    {
      ...cookie,
      name: "__Secure-better-auth.session_token",
      url: baseURL!.replace("http:", "https:"),
      secure: true,
    },
  ])
})

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" })
})

test("app navigation skips view transitions and keeps the shell mounted", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    const start = document.startViewTransition?.bind(document)
    if (!start) return

    const state = Object.assign(window, { pageTransitionCalls: 0 })
    document.startViewTransition = ((
      update: Parameters<typeof document.startViewTransition>[0],
    ) => {
      state.pageTransitionCalls += 1
      return start(update)
    }) as typeof document.startViewTransition
  })

  // Include cold streamed routes, where tracking can resolve after navigation.
  await page.route("**/*", async (route) => {
    if (route.request().headers()["rsc"]) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    await route.continue()
  })
  await page.goto("/account")
  await expect(page).toHaveTitle("Account · FortSprite")
  const displayName = page.getByRole("textbox", {
    name: "FortSprite display name",
    exact: true,
  })
  await expect(displayName).toBeVisible()
  await displayName.fill("Unsaved navigation draft")
  const header = await page.locator("header").first().elementHandle()
  const main = await page.locator("main").elementHandle()
  const navigation = page.getByRole("navigation", {
    name: isMobile ? "Mobile primary" : "Primary",
    exact: true,
  })

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion })
    await navigation.getByRole("link", { name: "Collection", exact: true }).click()
    await expect(page).toHaveURL(/\/collection$/)
    await expect(page.getByTestId("collection-content")).toBeVisible()
    await navigation.getByRole("link", { name: "Account", exact: true }).click()
    await expect(page).toHaveURL(/\/account$/)
    await expect(displayName).toHaveValue("Unsaved navigation draft")
    expect(await header?.evaluate((element) => element.isConnected)).toBe(true)
    expect(await main?.evaluate((element) => element.isConnected)).toBe(true)
  }

  expect(await page.evaluate(() =>
    (window as Window & { pageTransitionCalls?: number }).pageTransitionCalls,
  )).toBe(0)
  await page.screenshot({ path: test.info().outputPath("navigation-no-transition.png") })
})

test("scroll resets keep the mobile indicator inside the persistent dock", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Mobile indicator geometry")
  await page.goto("/collection")
  await expect(page.getByTestId("collection-content")).toBeVisible()
  const navigation = page.getByRole("navigation", { name: "Mobile primary" })
  const indicator = await navigation
    .locator("[data-tab-indicator]")
    .elementHandle()
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))

  for (const href of ["/account", "/collection", "/friends", "/collection"]) {
    await page.evaluate(() => window.scrollTo(0, 1200))
    const observations = page.evaluate(() => new Promise<{
      missing: boolean
      outside: boolean
      positions: number[]
    }>((resolve) => {
      const result = { missing: false, outside: false, positions: [] as number[] }
      const started = performance.now()
      const sample = () => {
        const dock = document.querySelector("[data-mobile-tab-dock]")?.getBoundingClientRect()
        const pill = document.querySelector("[data-tab-indicator]")?.getBoundingClientRect()
        if (!dock || !pill) result.missing = true
        else {
          result.positions.push(pill.x)
          if (pill.left < dock.left - 1 || pill.right > dock.right + 1 ||
              pill.top < dock.top - 1 || pill.bottom > dock.bottom + 1) result.outside = true
        }
        if (performance.now() - started < 1800) requestAnimationFrame(sample)
        else resolve(result)
      }
      sample()
    }))
    await navigation.locator(`a[href="${href}"]`).click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    const result = await observations
    expect(result.missing).toBe(false)
    expect(result.outside).toBe(false)
    expect(new Set(result.positions.map(Math.round)).size).toBeGreaterThan(2)
    expect(await indicator?.evaluate((element) => element.isConnected)).toBe(true)
    await expect(navigation.locator(`a[href="${href}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    )
  }
  expect(errors).toEqual([])
  await page.screenshot({ path: test.info().outputPath("scrolled-navigation.png") })
})
