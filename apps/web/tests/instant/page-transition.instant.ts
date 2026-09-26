import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

type TransitionSnapshot = {
  mainClass: string
  running: string[]
  rootName: string
}

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

test("app navigation animates the page and keeps the shell mounted", async ({
  page,
  isMobile,
}) => {
  await page.addInitScript(() => {
    const start = document.startViewTransition?.bind(document)
    if (!start) return

    Object.assign(window, { pageTransitionSnapshots: [] as TransitionSnapshot[] })
    document.startViewTransition = ((
      update: Parameters<typeof document.startViewTransition>[0],
    ) => {
      const transition = start(update)
      void transition.ready.then(() => {
        const main = document.querySelector("main")
        const snapshot: TransitionSnapshot = {
          mainClass: main
            ? getComputedStyle(main).getPropertyValue("view-transition-class")
            : "missing",
          rootName: getComputedStyle(document.documentElement).viewTransitionName,
          running: document.documentElement
            .getAnimations({ subtree: true })
            .map((item) =>
              item instanceof CSSAnimation ? item.animationName : "other",
            ),
        }
        ;(window as Window & {
          pageTransitionSnapshots?: TransitionSnapshot[]
        }).pageTransitionSnapshots?.push(snapshot)
      }).catch(() => {
        // Superseded transitions can be skipped by the browser.
      })
      return transition
    }) as typeof document.startViewTransition
  })

  // Delay streamed responses in a fresh browser context to cover cold routes.
  await page.route("**/*", async (route) => {
    if (route.request().headers()["rsc"]) {
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    await route.continue()
  })
  await page.goto("/account")
  await expect(page).toHaveTitle("Account · FortSprite")
  await expect(
    page.getByRole("textbox", { name: "FortSprite display name", exact: true }),
  ).toBeVisible()
  const initialSnapshots = await page.evaluate(
    () =>
      (window as Window & { pageTransitionSnapshots?: TransitionSnapshot[] })
        .pageTransitionSnapshots ?? [],
  )
  expect(initialSnapshots.flatMap((snapshot) => snapshot.running)).not.toContain(
    "app-page-in",
  )
  const header = await page.locator("header").first().elementHandle()
  const main = await page.locator("main").elementHandle()
  const navigation = page.getByRole("navigation", {
    name: isMobile ? "Mobile primary" : "Primary",
    exact: true,
  })
  await navigation.getByRole("link", { name: "Collection", exact: true }).click()
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page.getByTestId("collection-content")).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { pageTransitionSnapshots?: TransitionSnapshot[] })
            .pageTransitionSnapshots?.length ?? 0,
      ),
    )
    .toBeGreaterThan(0)

  const snapshots = await page.evaluate(
    () =>
      (window as Window & { pageTransitionSnapshots?: TransitionSnapshot[] })
        .pageTransitionSnapshots ?? [],
  )
  expect(snapshots[0]?.mainClass).toContain("page-change")
  for (const snapshot of snapshots) {
    expect(snapshot.rootName).toBe("none")
    expect(
      snapshot.running.filter((name) =>
        name.startsWith("-ua-view-transition-group-anim"),
      ),
    ).toEqual([])
  }
  expect(snapshots[0]?.running).toContain("app-page-in")
  expect(snapshots[0]?.running).toContain("app-page-out")
  expect(await header?.evaluate((element) => element.isConnected)).toBe(true)
  expect(await main?.evaluate((element) => element.isConnected)).toBe(true)
  await page.screenshot({ path: test.info().outputPath("collection.png") })

  await page.emulateMedia({ reducedMotion: "reduce" })
  await navigation.getByRole("link", { name: "Account", exact: true }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { pageTransitionSnapshots?: TransitionSnapshot[] })
            .pageTransitionSnapshots?.length ?? 0,
      ),
    )
    .toBeGreaterThan(1)
  const reducedMotionSnapshot = await page.evaluate(
    () =>
      (window as Window & { pageTransitionSnapshots?: TransitionSnapshot[] })
        .pageTransitionSnapshots?.at(-1),
  )
  expect(reducedMotionSnapshot?.running).not.toContain("app-page-in")
  expect(reducedMotionSnapshot?.running).not.toContain("app-page-out")
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
