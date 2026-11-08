import { expect, test } from "@playwright/test"

test("passkey sessions survive the production page guard, reload, and sign-in", async ({ page, baseURL }, info) => {
  const context = page.context()
  const cdp = await context.newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2", transport: "internal", hasResidentKey: true,
      hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
    },
  })
  const username = `guard_${info.project.name}_${Date.now().toString(36)}`
  // Vercel serves these scripts only on deployed hosts.
  await page.route("**/_vercel/**/script.js", (route) => route.fulfill({
    contentType: "application/javascript", body: "",
  }))
  const errors: string[] = []
  const consoleErrors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) consoleErrors.push(message.text())
  })
  const origin = baseURL!
  const main = page.getByRole("main")
  try {
    await page.goto("/sign-in?callbackUrl=/account")
    await expect(page).toHaveTitle("Sign in · FortSprite")
    await page.getByRole("textbox", { name: "Username", exact: true }).fill(username)
    await page.getByRole("button", { name: "Create account", exact: true }).click()
    await expect(page).toHaveURL(`${origin}/account`)
    await expect(main.getByText("No MCP keys created yet.")).toBeVisible()
    expect((await page.request.get("/api/v1/me")).status()).toBe(200)
    await page.reload()
    await expect(page).toHaveURL(`${origin}/account`)
    await expect(main.getByText("No assistants connected yet.")).toBeVisible()

    await page.request.post("/api/auth/sign-out", { headers: { origin }, data: {} })
    await page.goto("/account")
    await expect(page).toHaveURL(`${origin}/sign-in?callbackUrl=%2Faccount`)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page).toHaveURL(`${origin}/account`)
    await expect(main.getByText("No MCP keys created yet.")).toBeVisible()
    await expect(main.getByRole("heading", { name: "Make your profile yours." })).toBeVisible()
    expect((await page.request.get("/api/v1/me")).status()).toBe(200)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
    expect(consoleErrors).toEqual([])
    await page.screenshot({ path: `/tmp/fortsprite-passkey-session-${info.project.name}.png`, fullPage: true })
  } finally {
    const me = await page.request.get("/api/v1/me")
    if (me.ok() && (await me.json()).viewer.handle === username) {
      const response = await page.request.delete("/api/v1/profile", {
        headers: { origin }, data: { confirmation: username },
      })
      expect(response.ok()).toBe(true)
    }
  }
})
