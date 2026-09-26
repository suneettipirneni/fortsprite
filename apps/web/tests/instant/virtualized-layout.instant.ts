import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page, baseURL }, info) => {
  const fixture = JSON.parse(readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"))
  await page.context().addCookies([{
    ...fixture.cookies[info.project.name],
    name: "__Secure-better-auth.session_token", url: baseURL!, secure: true,
  }])
})

test("virtualized groups resize without overlapping or closing active details", async ({ page, isMobile }) => {
  await page.goto("/collection")
  const grid = page.getByTestId("virtualized-sprite-groups")
  await expect(grid).toHaveAttribute("data-hydrated", "true")
  const firstTile = grid.locator("article[data-sprite-id]").first()
  await expect(firstTile.getByRole("button", { name: /^Captured / })).toBeVisible()
  await firstTile.getByRole("button", { name: /^Open .* details/ }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  await page.setViewportSize(isMobile ? { width: 844, height: 390 } : { width: 1100, height: 850 })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("About this Sprite")).toBeVisible()
  await dialog.getByRole("button", { name: "Done", exact: true }).click()
  await expect(dialog).toHaveCount(0)

  await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
  await expect.poll(() => page.evaluate(() => window.visualViewport?.height)).toBe(isMobile ? 844 : 1000)
  if (isMobile) {
    await expect.poll(() => page.getByRole("navigation", { name: "Mobile primary" }).evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const bottom = Number.parseFloat(getComputedStyle(element).bottom)
      return Math.abs(bounds.bottom + bottom - window.innerHeight)
    })).toBeLessThan(1)
  }
  for (const fraction of [0, 0.4, 0.8, 0.2, 0]) {
    await grid.evaluate((element, value) => {
      const bounds = element.getBoundingClientRect()
      window.scrollTo(0, bounds.top + window.scrollY + bounds.height * value)
    }, fraction)
    await expect.poll(async () => grid.locator("article[data-sprite-id]").evaluateAll((tiles) =>
      tiles.some((tile) => {
        const bounds = tile.getBoundingClientRect()
        return bounds.top < window.innerHeight && bounds.bottom > 0
      }),
    )).toBe(true)
    await expect.poll(async () => grid.locator("[data-index]").evaluateAll((rows) => {
      const boxes = rows.map((row) => row.getBoundingClientRect()).sort((a, b) => a.top - b.top)
      return boxes.every((box, index) => index === 0 || box.top >= boxes[index - 1]!.bottom - 1)
    })).toBe(true)
  }
  await page.screenshot({ path: test.info().outputPath("virtualized-layout.png") })
})
