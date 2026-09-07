import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import { instant } from "@next/playwright"

test.beforeEach(async ({ page, baseURL }) => {
  const fixture = JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  )
  await page.context().addCookies([
    {
      ...fixture.cookie,
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
})

test("collection soft navigation commits its shell and then streams private data", async ({
  page,
  isMobile,
}) => {
  await page.goto("/account")
  if (isMobile)
    await page.getByRole("button", { name: "Open navigation" }).click()
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
    if (isMobile) {
      await page.getByRole("button", { name: "Open navigation" }).click()
    }
  })
  await expect(page.getByTestId("collection-content")).toBeVisible()
  if (isMobile) {
    await expect(
      page.getByRole("navigation", { name: "Mobile primary" }),
    ).toBeVisible()
  }
})
