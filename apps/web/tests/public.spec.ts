import { randomUUID } from "node:crypto"
import { readFile, rename, writeFile } from "node:fs/promises"
import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

test("protected redirect, public accessibility and real Epic callback establish a browser session", async ({
  page,
}, testInfo) => {
  const fixture = JSON.parse(
    await readFile(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  const errors: string[] = []
  const expectedSignOutErrors: string[] = []
  let signOutFailureActive = false
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message))
  page.on("console", (message) => {
    if (
      signOutFailureActive &&
      message.type() === "error" &&
      message.location().url === `${fixture.baseURL}/api/auth/sign-out` &&
      message.text().includes("500 (Internal Server Error)")
    ) {
      expectedSignOutErrors.push(message.text())
      return
    }
    if (message.type() === "error")
      errors.push(`${message.text()} (${message.location().url})`)
  })
  const destination = "/collection?from=sign-in-test"
  expect((await page.request.get("/api/v1/collection")).status()).toBe(401)
  await page.goto(destination)
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/)
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe(destination)
  await expect(
    page.getByRole("heading", {
      name: "Keep your squad in sync.",
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByText(/Unofficial fan-made tool\./)).toBeVisible()
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
  await page.goto(`/sign-in?callbackUrl=${encodeURIComponent(destination)}`)
  const code = randomUUID()
  await page.route("https://epic.example.test/authorize**", async (route) => {
    const authorization = new URL(route.request().url())
    expect(authorization.searchParams.get("client_id")).toBe(
      "fortsprite-test-client",
    )
    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256")
    const state = authorization.searchParams.get("state")
    const challenge = authorization.searchParams.get("code_challenge")
    expect(state).toBeTruthy()
    expect(challenge).toBeTruthy()
    const temporary = `${fixture.providerPath}.next`
    await writeFile(
      temporary,
      JSON.stringify({
        ...fixture.provider,
        oauthCodes: {
          [code]: {
            accountId: fixture.actors.a.epicId,
            challenge,
            used: false,
          },
        },
      }),
      { mode: 0o600 },
    )
    await rename(temporary, fixture.providerPath)
    const callback = new URL(
      "/api/auth/oauth2/callback/epic-games",
      fixture.baseURL,
    )
    callback.searchParams.set("code", code)
    callback.searchParams.set("state", state!)
    await route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>Fixture Epic authorization</title><link rel="icon" href="data:,"></head><body><main><h1>Epic test authorization</h1><a href="${callback.href.replaceAll("&", "&amp;")}">Approve Basic Profile and Friends List</a></main></body></html>`,
    })
  })
  await page
    .getByRole("button", { name: "Continue with Epic Games", exact: true })
    .click()
  await page
    .getByRole("link", {
      name: "Approve Basic Profile and Friends List",
      exact: true,
    })
    .click()
  await expect(page).toHaveURL(`${fixture.baseURL}${destination}`)
  await expect(
    page.getByRole("heading", { name: "Sprite locker", exact: true }),
  ).toBeVisible()
  const response = await page.request.get("/api/auth/get-session")
  expect(response.status()).toBe(200)
  const authenticated = await response.json()
  expect(authenticated.user.id).toBe(fixture.actors.a.userId)
  expect(authenticated.user).not.toHaveProperty("email")
  expect(authenticated.session).not.toHaveProperty("token")
  const provider = JSON.parse(await readFile(fixture.providerPath, "utf8"))
  expect(provider.oauthCodes[code].used).toBe(true)
  signOutFailureActive = true
  await page.route("**/api/auth/sign-out", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Deliberate browser-test sign-out failure",
      }),
    })
  })
  await page.getByRole("button", { name: "Account menu", exact: true }).click()
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click()
  await expect(
    page.getByRole("alert").filter({
      hasText: "Sign out could not be completed. Please try again.",
    }),
  ).toBeVisible()
  expect((await page.request.get("/api/v1/me")).status()).toBe(200)
  await page.unroute("**/api/auth/sign-out")
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click()
  await expect(page).toHaveURL(`${fixture.baseURL}/sign-in`)
  expect((await page.request.get("/api/v1/collection")).status()).toBe(401)
  expect(expectedSignOutErrors).toHaveLength(1)
  expect(errors).toEqual([])
})
