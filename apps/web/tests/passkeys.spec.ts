import { expect, test } from "@playwright/test"

test("passkey ceremonies cannot replace another tab's challenge and release their lock after errors", async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const context = page.context()
  await context.route("**/api/auth/**", (route) => route.continue({
    headers: { ...route.request().headers(), "x-real-ip": `198.18.73.${testInfo.project.name === "desktop" ? 1 : 2}` },
  }))
  const cdp = await context.newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2", transport: "internal", hasResidentKey: true,
      hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
    },
  })
  const username = `lock_${testInfo.project.name}_${Date.now().toString(36)}`
  const baseURL = "http://localhost:3000"
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("status of 401")) consoleErrors.push(message.text())
  })
  await page.goto("/sign-in?callbackUrl=/account")
  await expect(page).toHaveTitle("Sign in · FortSprite")
  await page.getByRole("textbox", { name: "Username", exact: true }).fill(username)
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await expect(page).toHaveURL(`${baseURL}/account`)
  await expect(page.getByText("No MCP keys created yet.")).toBeVisible()
  await expect(page.getByText("No assistants connected yet.")).toBeVisible()
  await page.request.post("/api/auth/sign-out", { headers: { origin: baseURL }, data: {} })
  await page.goto("/sign-in?callbackUrl=/account")
  const other = await context.newPage()
  await other.goto("/sign-in")
  const generated: string[] = []
  context.on("request", (request) => {
    if (/\/passkey\/generate-(authenticate|register)-options/.test(request.url())) generated.push(request.url())
  })
  let release!: () => void
  let verificationStarted!: () => void
  const barrier = new Promise<void>((resolve) => { release = resolve })
  const verifying = new Promise<void>((resolve) => { verificationStarted = resolve })
  await page.route("**/api/auth/passkey/verify-authentication", async (route) => {
    verificationStarted()
    await barrier
    await route.continue()
  }, { times: 1 })
  try {
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await verifying
    const originalCookie = (await context.cookies()).find((cookie) => cookie.name.endsWith("better-auth-passkey"))
    expect(originalCookie).toBeTruthy()
    const busy = other.getByRole("alert").filter({ hasText: "A passkey request is already open" })
    await other.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(busy).toBeVisible()
    await other.getByRole("textbox", { name: "Username", exact: true }).fill(`other_${Date.now().toString(36)}`)
    await other.getByRole("button", { name: "Create account", exact: true }).click()
    await expect(busy).toBeVisible()
    expect(generated).toHaveLength(1)
    expect((await context.cookies()).find((cookie) => cookie.name.endsWith("better-auth-passkey"))).toEqual(originalCookie)
    await other.screenshot({ path: `/tmp/fortsprite-passkey-lock-${testInfo.project.name}.png`, fullPage: true })
    expect(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    release()
    await expect(page).toHaveURL(`${baseURL}/account`)
    expect((await page.request.get("/api/v1/me")).status()).toBe(200)
    await expect(page.getByText("No MCP keys created yet.")).toBeVisible()
    await expect(page.getByText("No assistants connected yet.")).toBeVisible()

    // Additional-passkey registration must use the same cross-tab lock, too.
    await other.evaluate(() => {
      void navigator.locks.request("fortsprite-passkey-ceremony", () => new Promise<void>((resolve) => {
        Object.assign(window, { releasePasskeyTestLock: resolve })
      }))
    })
    await expect.poll(() => other.evaluate(() => "releasePasskeyTestLock" in window)).toBe(true)
    await page.getByRole("button", { name: "Add passkey", exact: true }).click()
    await expect(page.getByRole("alert").filter({ hasText: "A passkey request is already open" })).toBeVisible()
    expect(generated).toHaveLength(1)
    await other.evaluate(() => {
      const releaseLock = Reflect.get(window, "releasePasskeyTestLock") as () => void
      releaseLock()
    })
    await expect.poll(async () => (await other.evaluate(() => navigator.locks.query())).held?.length).toBe(0)

    await page.request.post("/api/auth/sign-out", { headers: { origin: baseURL }, data: {} })
    await page.goto("/sign-in?callbackUrl=/account")
    await page.route("**/api/auth/passkey/verify-authentication", (route) => route.fulfill({
      status: 401, contentType: "application/json",
      body: JSON.stringify({ code: "USER_VERIFICATION_REQUIRED", message: "Passkey user verification is required." }),
    }), { times: 1 })
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page.getByRole("alert").filter({ hasText: "fingerprint, face, or PIN" })).toBeVisible()
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page).toHaveURL(`${baseURL}/account`)
    expect((await page.request.get("/api/v1/me")).status()).toBe(200)
    await expect(page.getByText("No MCP keys created yet.")).toBeVisible()
    await expect(page.getByText("No assistants connected yet.")).toBeVisible()
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  } finally {
    release()
    await other.close()
    const me = await page.request.get("/api/v1/me")
    if (me.ok() && (await me.json()).viewer.handle === username) {
      await page.request.delete("/api/v1/profile", {
        headers: { origin: baseURL }, data: { confirmation: username },
      })
    }
  }
})
