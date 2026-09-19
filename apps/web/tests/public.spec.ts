import { readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("protected redirects preserve destination and the account-neutral sign-in page is accessible", async ({
  page,
}, testInfo) => {
  const fixture = JSON.parse(
    await readFile(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  const destination = "/collection?from=sign-in-test"
  expect((await page.request.get("/api/v1/collection")).status()).toBe(401)
  await page.goto(destination)
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/)
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(destination)
  await expect(
    page.getByRole("heading", { name: "Keep your squad in sync." }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Continue with Apple" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Sign in with a passkey" }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(
    accessibility.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    ),
  ).toEqual([])
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-sign-in.png`,
  })
  for (const path of ["/privacy", "/terms"]) {
    await page.goto(path)
    await expect(
      page.getByRole("link", { name: "Contact FortSprite support" }),
    ).toHaveAttribute("href", "mailto:support@example.test")
  }

  await page.context().addCookies([
    fixture.actors.a.cookies[
      testInfo.project.name as "desktop" | "mobile"
    ],
  ])
  await page.goto(destination)
  await expect(page).toHaveURL(`${fixture.baseURL}${destination}`)
  const response = await page.request.get("/api/auth/get-session")
  expect(response.status()).toBe(200)
  const authenticated = await response.json()
  expect(authenticated.user.id).toBe(fixture.actors.a.userId)
  expect(authenticated.user).not.toHaveProperty("email")
  expect(authenticated.session).not.toHaveProperty("token")
})
