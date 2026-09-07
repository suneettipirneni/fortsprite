import { readFileSync } from "node:fs"
import { test, expect } from "@playwright/test"

test("streamed menus become interactive only after their JavaScript loads", async ({
  page,
  isMobile,
}) => {
  const fixture = JSON.parse(
    readFileSync(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  await page.context().addCookies([fixture.actors.a.cookie])
  let release!: () => void
  const scriptsReady = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/_next/static/**/*.js", async (route) => {
    await scriptsReady
    await route.continue()
  })
  const account = page.getByRole("button", {
    name: "Account menu",
    exact: true,
  })
  const navigation = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  })
  try {
    await page.goto("/collection", { waitUntil: "commit" })
    await expect(page.getByTestId("collection-shell")).toBeVisible()
    await expect(account).toBeVisible()
    await expect(account).toBeDisabled()
    if (isMobile) {
      await expect(navigation).toBeVisible()
      await expect(navigation).toBeDisabled()
    }
  } finally {
    release()
  }
  await expect(account).toBeEnabled()
  await account.click()
  await expect(
    page.getByRole("menuitem", { name: "Sign out", exact: true }),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  if (isMobile) {
    await navigation.click()
    await expect(
      page.getByRole("navigation", { name: "Mobile primary", exact: true }),
    ).toBeVisible()
  }
})
