import { readFileSync } from "node:fs"
import { instant } from "@next/playwright"
import { expect, test, type ElementHandle } from "@playwright/test"
import type { CollectionSnapshot } from "@workspace/contracts"

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  const fixture = JSON.parse(readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"))
  await page.context().addCookies([{
    ...fixture.cookies[testInfo.project.name],
    name: "__Secure-better-auth.session_token",
    url: baseURL!.replace("http:", "https:"),
    secure: true,
  }])
})

test("rapid capture and mastery failures restore confirmed tracking", async ({ page, baseURL }) => {
  const response = await page.request.get("/api/v1/collection")
  const original: CollectionSnapshot = await response.json()
  const season = Math.max(...original.items.map((item) => item.sourceSeasonId ?? -1))
  const sprite = original.items.filter((item) => item.sourceSeasonId === season)
    .toSorted((a, b) => a.displayOrder - b.displayOrder)[0]!
  const setState = (owned: boolean, mastered: boolean) => page.request.put(`/api/v1/collection/${sprite.id}`, {
    headers: { origin: baseURL!.replace("http:", "https:") }, data: { owned, mastered },
  })
  expect((await setState(false, false)).ok()).toBe(true)
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const saving = new Promise<void>((resolve) => { started = resolve })
  let failures = 0
  await page.route("**/*", async (route) => {
    if (route.request().headers()["next-action"]) {
      started()
      await gate
      failures++
      await route.fulfill({ status: 500, contentType: "text/plain", body: "Simulated save failure" })
    } else await route.continue()
  })
  try {
    await page.goto("/collection")
    const tile = page.locator(`article[data-sprite-id="${sprite.id}"]`)
    const capture = tile.getByRole("button", { name: /^Captured / })
    await expect(capture).toHaveAttribute("aria-pressed", "false")
    await capture.click()
    await saving
    await expect(capture).toHaveAttribute("aria-pressed", "true")
    await tile.getByRole("button", { name: /^Mastered / }).click()
    await expect(tile.getByTestId("mastered-crown")).toBeVisible()
    release()
    await expect.poll(() => failures).toBe(2)
    await expect(capture).toHaveAttribute("aria-pressed", "false")
    await expect(tile.getByTestId("mastered-crown")).toHaveCount(0)
    await expect(page.getByRole("alert").first()).toBeVisible()
  } finally {
    release()
    await page.unrouteAll({ behavior: "wait" })
    expect((await setState(sprite.owned, sprite.mastered)).ok()).toBe(true)
  }
})

test("collection artwork and filters render before fresh tracking on first and return navigation", async ({
  page,
  isMobile,
}) => {
  await page.goto("/account")
  await expect(page.getByLabel("FortSprite display name", { exact: true })).toBeVisible()
  const nav = page.getByRole("navigation", {
    name: isMobile ? "Mobile primary" : "Primary", exact: true,
  })
  const main = page.getByRole("main")
  for (let visit = 0; visit < 2; visit++) {
    let search: ElementHandle | null = null
    await instant(page, async () => {
      await nav.locator('a[href="/collection"]').click()
      await expect(page).toHaveURL(/\/collection$/)
      await expect(main.getByTestId("collection-content")).toBeVisible()
      await expect(main.locator("article[data-sprite-id]").first()).toBeVisible()
      await expect(main.locator("article[data-sprite-id] img").first()).toBeVisible()
      await expect(main.getByRole("radio", { name: "Grid view", exact: true })).toBeVisible()
      await expect(main.getByRole("combobox", { name: "Search collection", exact: true }))
        .toHaveValue(visit === 0 ? "" : "Jonesy")
      await expect(main.getByText("Loading collection…", { exact: true })).toHaveCount(0)
      await expect(main.locator("article[data-sprite-id]").first()
        .getByRole("button", { name: /^Captured / })).toHaveCount(0)
      const dismissInstall = page.getByRole("button", { name: "Dismiss install suggestion" })
      if (await dismissInstall.isVisible()) await dismissInstall.click()
      if (isMobile) await main.locator("article[data-sprite-id]").first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: test.info().outputPath(`tracking-pending-${visit}.png`) })
      const query = main.getByRole("combobox", { name: "Search collection", exact: true })
      search = await query.elementHandle()
      await query.fill("Jonesy")
      if (visit === 0) {
        await main.locator("article[data-sprite-id]").first()
          .getByRole("button", { name: /^Open .* details/ }).click()
        const details = page.getByRole("dialog")
        await expect(details.getByText("About this Sprite")).toBeVisible()
        await details.getByRole("button", { name: "Done", exact: true }).click()
      }
    })
    await expect(main.locator("article[data-sprite-id]").first()
      .getByRole("button", { name: /^Captured / })).toBeVisible()
    expect(await (search as ElementHandle | null)?.evaluate((element) => element.isConnected)).toBe(true)
    await main.getByRole("combobox", { name: "Search collection", exact: true }).fill("Jonesy")
    await nav.locator('a[href="/account"]').click()
    await expect(page.getByLabel("FortSprite display name", { exact: true })).toBeVisible()
  }
})
