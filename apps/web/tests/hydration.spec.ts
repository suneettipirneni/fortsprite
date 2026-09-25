import { readFileSync } from "node:fs"
import { test, expect } from "@playwright/test"

test("streamed account menu waits for JavaScript while mobile tabs remain links", async ({
  page,
  isMobile,
}, testInfo) => {
  const fixture = JSON.parse(
    readFileSync(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  await page.context().addCookies([
    fixture.actors.a.cookies[
      testInfo.project.name as "desktop" | "mobile"
    ],
  ])
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
  const navigation = page.getByRole("navigation", {
    name: "Mobile primary",
    exact: true,
  })
  try {
    await page.goto("/collection", { waitUntil: "commit" })
    await expect(page.getByTestId("collection-shell")).toBeVisible()
    await expect(account).toBeVisible()
    await expect(account).toBeDisabled()
    if (isMobile) {
      await expect(navigation).toBeVisible()
      await expect(
        navigation.getByRole("link", { name: "Collection", exact: true }),
      ).toHaveAttribute("href", "/collection")
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
    await expect(navigation).toBeVisible()
  }
})
