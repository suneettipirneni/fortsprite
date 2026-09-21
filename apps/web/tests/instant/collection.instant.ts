import { readFileSync } from "node:fs"
import { test, expect, type Page } from "@playwright/test"
import { instant } from "@next/playwright"

test.beforeEach(async ({ page, baseURL }, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(process.env.BROWSER_FIXTURE_PATH!, "utf8"),
  )
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
