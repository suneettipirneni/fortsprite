import { createHash, randomBytes, randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test"

type Fixture = {
  baseURL: string
  sprites: { id: string; baseName: string }[]
}

type OAuthTokens = {
  access_token: string
  refresh_token: string
  token_type: string
  scope: string
}

async function rpc(request: APIRequestContext, token: string, method: string, params: object = {}) {
  const response = await request.post("/api/mcp/collection", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
    },
    data: { jsonrpc: "2.0", id: 1, method, params },
  })
  const text = await response.text()
  const json = response.headers()["content-type"]?.startsWith("text/event-stream")
    ? text.split("\n").find((line) => line.startsWith("data: "))?.slice(6)
    : text
  return { response, body: JSON.parse(json ?? "null") }
}

async function virtualPasskey(context: BrowserContext, page: Parameters<BrowserContext["newCDPSession"]>[0]) {
  const cdp = await context.newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })
}

test("a passkey sign-in completes personal OAuth consent and disconnected grants lose access immediately", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000)
  const fixture = JSON.parse(await readFile(process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json", "utf8")) as Fixture
  const username = `oauth_${testInfo.project.name}_${Date.now().toString(36)}`
  const clientName = `Browser OAuth assistant ${testInfo.project.name}`
  const redirectUri = "https://assistant.test/oauth/callback"
  const resource = new URL("/api/mcp/collection", fixture.baseURL).href
  const scope = "collection:read collection:write offline_access"
  const verifier = randomBytes(32).toString("base64url")
  const challenge = createHash("sha256").update(verifier).digest("base64url")
  const state = randomUUID()
  let accountCreated = false
  const browserErrors: string[] = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrated|hydration/i.test(message.text()))
      browserErrors.push(message.text())
  })
  await virtualPasskey(page.context(), page)

  try {
    await page.goto("/sign-in")
    await page.getByRole("textbox", { name: "Username", exact: true }).fill(username)
    await page.getByRole("button", { name: "Create account", exact: true }).click()
    await expect(page).toHaveURL(`${fixture.baseURL}/`)
    accountCreated = true
    expect((await (await page.request.get("/api/v1/me")).json()).viewer.handle).toBe(username)
    expect((await page.request.post("/api/auth/sign-out", {
      headers: { origin: fixture.baseURL }, data: {},
    })).status()).toBe(200)
    expect((await page.request.get("/api/v1/me")).status()).toBe(401)

    const registration = await request.post("/api/auth/oauth2/register", {
      data: {
        client_name: clientName,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope,
      },
    })
    expect(registration.status()).toBe(201)
    const client = await registration.json() as { client_id: string }
    const authorization = new URL("/api/auth/oauth2/authorize", fixture.baseURL)
    authorization.search = new URLSearchParams({
      client_id: client.client_id,
      response_type: "code",
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope,
      resource,
      state,
    }).toString()
    await page.route(`${redirectUri}**`, (route) => route.fulfill({
      status: 200, contentType: "text/html", body: "<title>OAuth callback received</title>",
    }))
    await page.goto(authorization.href)
    await expect(page).toHaveURL(/\/sign-in\?/)
    expect(new URL(page.url()).searchParams.get("sig")).toBeTruthy()
    expect((await page.request.get("/api/v1/me")).status()).toBe(401)
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    await expect(page).toHaveURL(/\/mcp\/consent\?/)
    await expect(page.getByText(clientName, { exact: true })).toBeVisible()
    await expect(page.getByText(username, { exact: false })).toBeVisible()
    await expect(page.getByRole("button", { name: "Allow access", exact: true })).toBeVisible()

    const invalidConsent = await page.context().newPage()
    try {
      const tampered = new URL(page.url())
      tampered.searchParams.set("client_id", "tampered-client")
      const response = await invalidConsent.goto(tampered.href)
      const serverHtml = await response!.text()
      expect(serverHtml).toContain("Connection request unavailable")
      expect(serverHtml).not.toContain("Allow access")
      await expect(invalidConsent.getByRole("heading", { name: "Connection request unavailable", exact: true })).toBeVisible()
      await expect(invalidConsent.getByRole("button", { name: "Allow access", exact: true })).toHaveCount(0)
    } finally {
      await invalidConsent.close()
    }

    await page.screenshot({ path: `/tmp/fortsprite-oauth-consent-${testInfo.project.name}.png`, fullPage: true, caret: "initial" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
    await page.getByRole("button", { name: "Allow access", exact: true }).click()
    await expect(page).toHaveURL(/\/oauth\/callback\?/)
    const callback = new URL(page.url())
    expect(callback.searchParams.get("state")).toBe(state)
    expect(callback.searchParams.has("error")).toBe(false)
    const code = callback.searchParams.get("code")!
    expect(code).toBeTruthy()
    const exchange = await request.post("/api/auth/oauth2/token", {
      form: {
        grant_type: "authorization_code",
        client_id: client.client_id,
        redirect_uri: redirectUri,
        code_verifier: verifier,
        code,
        resource,
      },
    })
    expect(exchange.status()).toBe(200)
    const tokens = await exchange.json() as OAuthTokens
    expect(tokens.token_type.toLowerCase()).toBe("bearer")
    expect(typeof tokens.access_token).toBe("string")
    expect(typeof tokens.refresh_token).toBe("string")
    const browserSession = await request.get("/api/auth/get-session", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    expect(await browserSession.json()).toBeNull()

    const initialized = await rpc(request, tokens.access_token, "initialize", {
      protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "oauth-browser-test", version: "1.0" },
    })
    expect(initialized.response.status()).toBe(200)
    const discovery = await rpc(request, tokens.access_token, "tools/list")
    expect(discovery.body.result.tools.map((tool: { name: string }) => tool.name)).toContain("get_collection")
    expect(discovery.body.result.tools.map((tool: { name: string }) => tool.name)).toContain("set_collection_state")
    const desiredState = {
      name: "set_collection_state",
      arguments: { spriteId: fixture.sprites[0]!.id, state: { owned: true, mastered: true } },
    }
    const saved = await rpc(request, tokens.access_token, "tools/call", desiredState)
    expect(saved.body.result.structuredContent.entry.owned).toBe(true)
    expect(saved.body.result.structuredContent.entry.mastered).toBe(true)
    const repeated = await rpc(request, tokens.access_token, "tools/call", desiredState)
    expect(repeated.body.result.structuredContent.entry.updatedAt).toBe(saved.body.result.structuredContent.entry.updatedAt)
    const collection = await rpc(request, tokens.access_token, "tools/call", {
      name: "get_collection", arguments: { search: fixture.sprites[0]!.baseName, ownership: "owned" },
    })
    expect(collection.body.result.structuredContent.items.find((item: { id: string }) => item.id === fixture.sprites[0]!.id)?.mastered).toBe(true)

    expect((await page.request.post("/api/auth/sign-out", {
      headers: { origin: fixture.baseURL }, data: {},
    })).status()).toBe(200)
    const reconnectState = randomUUID()
    const reconnectVerifier = randomBytes(32).toString("base64url")
    const reconnectAuthorization = new URL(authorization.href)
    reconnectAuthorization.searchParams.set("state", reconnectState)
    reconnectAuthorization.searchParams.set("code_challenge", createHash("sha256").update(reconnectVerifier).digest("base64url"))
    expect(reconnectAuthorization.searchParams.has("prompt")).toBe(false)
    await page.goto(reconnectAuthorization.href)
    await expect(page).toHaveURL(/\/sign-in\?/)
    const authenticated = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/auth/passkey/verify-authentication" && response.request().method() === "POST",
    )
    await page.getByRole("button", { name: "Sign in", exact: true }).click()
    const afterHook = await (await authenticated).json() as { redirect: boolean; url: string }
    expect(afterHook.redirect).toBe(true)
    expect(new URL(afterHook.url).origin).toBe("https://assistant.test")
    await expect(page).toHaveURL(/\/oauth\/callback\?/)
    const reconnectCallback = new URL(page.url())
    expect(reconnectCallback.searchParams.get("state")).toBe(reconnectState)
    expect(reconnectCallback.searchParams.get("code")).not.toBe(code)
    const reconnectExchange = await request.post("/api/auth/oauth2/token", {
      form: {
        grant_type: "authorization_code",
        client_id: client.client_id,
        redirect_uri: redirectUri,
        code_verifier: reconnectVerifier,
        code: reconnectCallback.searchParams.get("code")!,
        resource,
      },
    })
    expect(reconnectExchange.status()).toBe(200)
    const reconnectTokens = await reconnectExchange.json() as OAuthTokens
    const reconnectedCollection = await rpc(request, reconnectTokens.access_token, "tools/call", {
      name: "get_collection", arguments: { search: fixture.sprites[0]!.baseName, ownership: "owned" },
    })
    expect(reconnectedCollection.response.status()).toBe(200)
    expect(reconnectedCollection.body.result.structuredContent.items.find((item: { id: string }) => item.id === fixture.sprites[0]!.id)?.mastered).toBe(true)

    await page.goto("/account")
    const disconnect = page.getByRole("button", { name: `Disconnect assistant ${clientName}`, exact: true })
    await expect(disconnect).toBeVisible()
    await page.screenshot({ path: `/tmp/fortsprite-oauth-grants-${testInfo.project.name}.png`, fullPage: true, caret: "initial" })
    await disconnect.click()
    await expect(disconnect).toHaveCount(0)
    for (const issued of [tokens, reconnectTokens]) {
      expect((await rpc(request, issued.access_token, "tools/list")).response.status()).toBe(401)
      const refreshed = await request.post("/api/auth/oauth2/token", {
        form: { grant_type: "refresh_token", client_id: client.client_id, refresh_token: issued.refresh_token, resource },
      })
      expect(refreshed.status()).toBe(400)
      expect((await refreshed.json()).error).toBe("invalid_grant")
    }
    expect(browserErrors).toEqual([])
  } finally {
    if (accountCreated) {
      if ((await page.request.get("/api/v1/me")).status() === 401) {
        await page.goto("/sign-in")
        await page.getByRole("button", { name: "Sign in", exact: true }).click()
        await expect(page).toHaveURL(`${fixture.baseURL}/`)
      }
      const deleted = await page.request.delete("/api/v1/profile", {
        headers: { origin: fixture.baseURL }, data: { confirmation: username },
      })
      expect(deleted.status()).toBe(200)
    }
  }
})
