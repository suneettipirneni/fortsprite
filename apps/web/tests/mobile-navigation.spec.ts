import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

test("mobile tabs navigate, select nested routes, and stay off public pages", async ({
  page,
  baseURL,
  isMobile,
}, testInfo) => {
  test.setTimeout(120_000)
  test.skip(!isMobile, "Mobile navigation")

  const fixture = JSON.parse(
    readFileSync(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  await page.context().addCookies([fixture.actors.a.cookies.mobile])
  await page.goto("/account")
  await expect(
    page.getByRole("navigation", { name: "Mobile primary" }).getByRole("link", {
      name: "Account",
      exact: true,
    }),
  ).toHaveAttribute("aria-current", "page")
  await page.screenshot({
    path: testInfo.outputPath("mobile-tabs-account.png"),
    caret: "initial",
  })
  await page.goto("/collection")

  const navigation = page.getByRole("navigation", {
    name: "Mobile primary",
    exact: true,
  })
  await expect(navigation).toBeVisible()
  await expect(page.getByTestId("collection-content")).toBeVisible()

  const installPrompt = page.getByRole("complementary", {
    name: "Install FortSprite",
  })
  await expect(installPrompt).toBeVisible({ timeout: 7_000 })
  const promptBounds = await installPrompt.boundingBox()
  const dockBounds = await navigation.boundingBox()
  expect(promptBounds && dockBounds && promptBounds.y + promptBounds.height).toBeLessThan(
    dockBounds!.y,
  )
  await page.screenshot({
    path: testInfo.outputPath("mobile-tabs-install.png"),
    caret: "initial",
  })
  await installPrompt.getByRole("button", { name: "Dismiss install suggestion" }).click()
  await page.screenshot({
    path: testInfo.outputPath("mobile-tabs.png"),
    caret: "initial",
  })

  await page.setViewportSize({ width: 320, height: 720 })
  await page.screenshot({
    path: testInfo.outputPath("mobile-tabs-320.png"),
    caret: "initial",
  })
  const bottomSpacing = await page.evaluate(() => {
    const probe = document.createElement("div")
    probe.style.paddingBottom = "env(safe-area-inset-bottom)"
    document.body.append(probe)
    const safeAreaInset = Number.parseFloat(getComputedStyle(probe).paddingBottom)
    probe.remove()
    const dock = document.querySelector<HTMLElement>("[data-mobile-tab-dock]")!
    return {
      actual: window.innerHeight - dock.getBoundingClientRect().bottom,
      expected: Math.max(12, safeAreaInset),
    }
  })
  expect(Math.abs(bottomSpacing.actual - bottomSpacing.expected)).toBeLessThan(1)

  for (const [label, href] of [
    ["Home", "/"],
    ["Collection", "/collection"],
    ["Matches", "/matches"],
    ["Friends", "/friends"],
    ["Account", "/account"],
  ] as const) {
    const link = navigation.getByRole("link", { name: label, exact: true })
    const size = await link.boundingBox()
    expect(size?.width).toBeGreaterThanOrEqual(48)
    expect(size?.height).toBeGreaterThanOrEqual(48)
    const widths = await navigation.getByRole("link").evaluateAll((links) =>
      links.map((item) => item.getBoundingClientRect().width),
    )
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1)
    await link.click()
    await expect(page).toHaveURL(new URL(href, baseURL).toString())
    await expect(link).toHaveAttribute("aria-current", "page")
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)
  }

  await page.evaluate(() => {
    const positions: { left: number; right: number }[] = []
    const startedAt = performance.now()
    const sample = () => {
      const indicator = document.querySelector<HTMLElement>("[data-tab-indicator]")
      if (indicator) {
        const { left, right } = indicator.getBoundingClientRect()
        positions.push({ left, right })
      }
      if (performance.now() - startedAt < 1_200) requestAnimationFrame(sample)
    }
    Object.assign(window, { tabIndicatorPositions: positions })
    requestAnimationFrame(sample)
  })
  await navigation.getByRole("link", { name: "Home", exact: true }).click()
  await expect(page).toHaveURL(new URL("/", baseURL).toString())
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Set(
              (window as Window & { tabIndicatorPositions?: { left: number }[] })
                .tabIndicatorPositions?.map(({ left }) => Math.round(left)) ?? [],
            ).size,
        ),
      { timeout: 1_500 },
    )
    .toBeGreaterThan(2)
  const dockAtHome = await navigation.boundingBox()
  const positions = await page.evaluate(
    () =>
      (window as Window & {
        tabIndicatorPositions?: { left: number; right: number }[]
      }).tabIndicatorPositions ?? [],
  )
  for (const { left, right } of positions) {
    expect(left).toBeGreaterThanOrEqual(dockAtHome!.x - 1)
    expect(right).toBeLessThanOrEqual(dockAtHome!.x + dockAtHome!.width + 1)
  }
  await navigation.getByRole("link", { name: "Account", exact: true }).click()
  await expect(page).toHaveURL(new URL("/account", baseURL).toString())
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const footerBounds = await page.locator("body > footer").boundingBox()
  const dockAtBottom = await navigation.boundingBox()
  expect(footerBounds && dockAtBottom && footerBounds.y + footerBounds.height).toBeLessThan(
    dockAtBottom!.y,
  )

  await page
    .getByRole("navigation", { name: "Account policies" })
    .getByRole("link", { name: "Help" })
    .click()
  await expect(page).toHaveURL(new URL("/help", baseURL).toString())
  await expect(navigation).toBeVisible()
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(0)

  await page.goto(`/friends/${fixture.actors.b.userId}`)
  await expect(
    navigation.getByRole("link", { name: "Friends", exact: true }),
  ).toHaveAttribute("aria-current", "page")

  await page.goto("/sign-in")
  await expect(navigation).toHaveCount(0)
  await page.goto("/account")
  await expect(navigation.locator("[data-tab-indicator]")).toBeVisible()
  const indicatorBounds = await navigation.locator("[data-tab-indicator]").boundingBox()
  const dockAfterRemount = await navigation.boundingBox()
  expect(indicatorBounds!.x).toBeGreaterThanOrEqual(dockAfterRemount!.x)
  expect(indicatorBounds!.x + indicatorBounds!.width).toBeLessThanOrEqual(
    dockAfterRemount!.x + dockAfterRemount!.width,
  )
})
