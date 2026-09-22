import { readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("social preview images are public PNGs", async ({ request }) => {
  for (const path of ["/opengraph-image", "/twitter-image"]) {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
    expect((await response.body()).subarray(1, 4).toString()).toBe("PNG")
  }
})

test("a verified passkey atomically creates the account and its first session", async ({
  page,
}, testInfo) => {
  const username = `e2e_${testInfo.project.name}_${Date.now().toString(36)}`
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  const { authenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: false,
        automaticPresenceSimulation: true,
      },
    },
  )

  await page.goto("/sign-in")
  await page.getByRole("textbox", { name: "Username" }).fill(username)
  await page
    .getByRole("button", { name: "Create account" })
    .click()
  await expect(
    page.getByRole("alert").filter({
      hasText: "Your account could not be created. Please try again.",
    }),
  ).toBeVisible()
  expect((await page.request.get("/api/v1/me")).status()).toBe(401)

  await cdp.send("WebAuthn.setUserVerified", {
    authenticatorId,
    isUserVerified: true,
  })

  let removeCreateSession = true
  await page.route("**/api/auth/passkey/verify-registration", async (route) => {
    if (!removeCreateSession) return route.continue()
    const body = route.request().postDataJSON()
    if (testInfo.project.name === "desktop") delete body.createSession
    else body.createSession = false
    await route.continue({ postData: JSON.stringify(body) })
  })
  await page
    .getByRole("button", { name: "Create account" })
    .click()
  await expect(
    page.getByRole("alert").filter({
      hasText: "Your account could not be created. Please try again.",
    }),
  ).toBeVisible()
  expect((await page.request.get("/api/v1/me")).status()).toBe(401)

  removeCreateSession = false
  await page
    .getByRole("button", { name: "Create account" })
    .click()
  await expect(page).toHaveURL(/\/$/)

  const me = await page.request.get("/api/v1/me")
  expect(me.status()).toBe(200)
  const viewer = (await me.json()).viewer
  expect(viewer.handle).toBe(username)
  expect(viewer.displayName).toBe(username)

  const remove = await page.request.delete("/api/v1/profile", {
    headers: { origin: new URL(page.url()).origin },
    data: { confirmation: viewer.handle },
  })
  expect(remove.status()).toBe(200)
  expect((await page.request.get("/api/v1/me")).status()).toBe(401)
})

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
    page.getByRole("button", { name: "Create account" }),
  ).toBeDisabled()
  await expect(page.getByRole("textbox", { name: "Username" })).toHaveAttribute(
    "required",
    "",
  )
  await expect(
    page.getByRole("button", { name: "Sign in" }),
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

  await page.goto("/privacy")
  await expect(page.getByText("Last updated September 22, 2026")).toBeVisible()
  await expect(page.getByText(/launch-draft/i)).toHaveCount(0)
  await expect(
    page.getByRole("heading", { name: "Analytics and external resources" }),
  ).toBeVisible()

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
