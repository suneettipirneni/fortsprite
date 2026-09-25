import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

type TransitionSnapshot = {
  mainClass: string
  running: string[]
}

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  )
  const cookie = fixture.cookies[testInfo.project.name as "desktop" | "mobile"]
  await page.context().addCookies([
    {
      ...cookie,
      name: "__Secure-better-auth.session_token",
      url: baseURL!.replace("http:", "https:"),
      secure: true,
    },
  ])
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
          running: document.documentElement
            .getAnimations({ subtree: true })
            .map((item) =>
              item instanceof CSSAnimation ? item.animationName : "other",
            ),
        }
        ;(window as Window & {
          pageTransitionSnapshots?: TransitionSnapshot[]
        }).pageTransitionSnapshots?.push(snapshot)
      })
      return transition
    }) as typeof document.startViewTransition
  })

  await page.goto("/account")
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
