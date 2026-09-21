import { readFile } from "node:fs/promises"
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type BrowserContext, type Page } from "@playwright/test"
import type { CollectionSnapshot } from "@workspace/contracts"

type Actor = {
  userId: string
  displayName: string
  handle: string
  cookies: Record<
    "desktop" | "mobile",
    {
      name: string
      value: string
      url: string
      httpOnly: boolean
      sameSite: "Lax"
    }
  >
}
type Fixture = {
  baseURL: string
  actors: { a: Actor; b: Actor }
  sprites: { id: string; baseName: string; variant: string; rarity: string }[]
}

let fixture: Fixture
let teammateContext: BrowserContext
let teammate: Page

async function sharing(page: Page, friendId: string, action: string) {
  const response = await page.request.post(`/api/v1/friends/${friendId}`, {
    headers: { origin: fixture.baseURL },
    data: { action },
  })
  expect(response.status()).toBe(200)
}

async function collection(page: Page): Promise<CollectionSnapshot> {
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  return response.json()
}

async function accessible(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical",
    ),
  ).toEqual([])
}

test.beforeEach(async ({ page, browser }, testInfo) => {
  fixture = JSON.parse(
    await readFile(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  const project = testInfo.project.name as "desktop" | "mobile"
  await page.context().addCookies([fixture.actors.a.cookies[project]])
  teammateContext = await browser.newContext({
    baseURL: fixture.baseURL,
    viewport: page.viewportSize(),
    isMobile: testInfo.project.name === "mobile",
    hasTouch: testInfo.project.name === "mobile",
  })
  await teammateContext.addCookies([fixture.actors.b.cookies[project]])
  teammate = await teammateContext.newPage()
  await sharing(page, fixture.actors.b.userId, "unblock")
  await sharing(teammate, fixture.actors.a.userId, "unblock")
  await sharing(page, fixture.actors.b.userId, "remove")
})

test.afterEach(async () => {
  await teammateContext?.close()
})

test("exact-username requests unlock mutual collection comparison", async ({
  page,
}) => {
  const [ours, theirs] = fixture.sprites
  await page.goto("/friends")
  await page
    .getByRole("textbox", { name: "FortSprite username" })
    .fill(fixture.actors.b.handle)
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(page.getByText("Request sent", { exact: true })).toBeVisible()

  await teammate.goto("/friends")
  await teammate
    .getByRole("button", {
      name: `Accept with ${fixture.actors.a.displayName}`,
      exact: true,
    })
    .click()
  await expect(
    teammate.getByText("Sharing collections", { exact: true }),
  ).toBeVisible()
  await expect(
    teammate.getByText(
      `${fixture.actors.a.displayName}. Collection sharing is now active.`,
    ),
  ).toBeVisible()

  await page.reload()
  await expect(page.getByRole("link", { name: "Compare" })).toBeVisible()
  const snapshot = await collection(page)
  expect(
    snapshot.items
      .find((item) => item.id === theirs!.id)
      ?.helpers.map((friend) => friend.id),
  ).toEqual([fixture.actors.b.userId])

  await page.goto("/matches")
  const helperLink = page
    .getByRole("link")
    .filter({ hasText: fixture.actors.b.displayName })
  await expect(helperLink).toBeVisible()
  await expect(helperLink).toContainText(`@${fixture.actors.b.handle}`)

  await page.goto("/friends")
  await page.getByRole("link", { name: "Compare" }).click()
  await expect(
    page.getByRole("heading", {
      name: `${theirs!.variant} ${theirs!.baseName}`,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: `${ours!.variant} ${ours!.baseName}` }),
  ).toBeVisible()
  await accessible(page)
})

test("blocking revokes sharing and unblocking does not restore it", async ({
  page,
}) => {
  const request = await page.request.post("/api/v1/friends", {
    headers: { origin: fixture.baseURL },
    data: { handle: fixture.actors.b.handle },
  })
  expect(request.status()).toBe(200)
  await sharing(teammate, fixture.actors.a.userId, "accept")
  await page.goto("/friends")
  await page
    .getByRole("button", {
      name: `Block with ${fixture.actors.b.displayName}`,
      exact: true,
    })
    .click()
  await expect(
    page.getByRole("button", {
      name: `Unblock with ${fixture.actors.b.displayName}`,
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByText(
      `${fixture.actors.b.displayName}. User blocked in FortSprite. Collection sharing is off.`,
    ),
  ).toBeVisible()
  expect(
    (await page.request.get(`/api/v1/friends/${fixture.actors.b.userId}/comparison`)).status(),
  ).toBe(404)
  await page
    .getByRole("button", {
      name: `Unblock with ${fixture.actors.b.displayName}`,
      exact: true,
    })
    .click()
  await expect(
    page.getByText(
      `${fixture.actors.b.displayName}. User unblocked. Collection sharing remains off.`,
    ),
  ).toBeVisible()
  await expect(page.getByText("No FortSprite friends yet")).toBeVisible()
  expect(
    (await page.request.get(`/api/v1/friends/${fixture.actors.b.userId}/comparison`)).status(),
  ).toBe(404)
})

test("a verified resident passkey can be added and used to sign back in", async ({
  page,
}) => {
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
  await page.goto("/account")
  const initialResponse = await page.request.get("/api/v1/credentials")
  expect(initialResponse.status()).toBe(200)
  const initialPasskeys = (await initialResponse.json()).credentials as {
    id: string
    kind: string
  }[]
  await page.getByRole("textbox", { name: "Passkey name" }).fill("Test device")
  await page.getByRole("button", { name: "Add passkey" }).click()
  await expect(
    page.getByRole("alert").filter({
      hasText: "The passkey could not be added. Please try again.",
    }),
  ).toBeVisible()
  let credentials = await page.request.get("/api/v1/credentials")
  expect(credentials.status()).toBe(200)
  expect((await credentials.json()).credentials).toHaveLength(
    initialPasskeys.length,
  )

  await cdp.send("WebAuthn.setUserVerified", {
    authenticatorId,
    isUserVerified: true,
  })
  await page.getByRole("button", { name: "Add passkey" }).click()
  await expect(page.getByText("Passkey added.")).toBeVisible()
  await expect(page.getByText("Test device")).toBeVisible()

  for (const credential of initialPasskeys) {
    const removed = await page.request.post(
      "/api/auth/passkey/delete-passkey",
      {
        headers: { origin: fixture.baseURL },
        data: { id: credential.id },
      },
    )
    expect(removed.status()).toBe(200)
  }
  await page.reload()
  await expect(
    page.getByRole("button", { name: "Remove passkey Test device" }),
  ).toBeDisabled()

  credentials = await page.request.get("/api/v1/credentials")
  expect(credentials.status()).toBe(200)
  const serialized = JSON.stringify(await credentials.json())
  expect(serialized).not.toContain("credentialID")
  expect(serialized).not.toContain("publicKey")

  await cdp.send("WebAuthn.removeVirtualAuthenticator", {
    authenticatorId,
  })
  const { authenticatorId: backupAuthenticatorId } = await cdp.send(
    "WebAuthn.addVirtualAuthenticator",
    {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  )
  await page.getByRole("textbox", { name: "Passkey name" }).fill("Backup key")
  await page.getByRole("button", { name: "Add passkey" }).click()
  await expect(page.getByText("Backup key")).toBeVisible()
  await page
    .getByRole("button", { name: "Remove passkey Test device" })
    .click()
  await expect(page.getByText("Passkey removed.")).toBeVisible()
  await expect(page.getByText("Test device")).not.toBeVisible()
  await expect(
    page.getByRole("button", { name: "Remove passkey Backup key" }),
  ).toBeDisabled()

  const signOut = await page.request.post("/api/auth/sign-out", {
    headers: { origin: fixture.baseURL },
    data: {},
  })
  expect(signOut.status()).toBe(200)
  await page.goto("/sign-in")
  await cdp.send("WebAuthn.setUserVerified", {
    authenticatorId: backupAuthenticatorId,
    isUserVerified: false,
  })
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(
    page.getByRole("alert").filter({
      hasText: "We could not sign you in. Please try again.",
    }),
  ).toBeVisible()
  expect((await page.request.get("/api/v1/me")).status()).toBe(401)

  await cdp.send("WebAuthn.setUserVerified", {
    authenticatorId: backupAuthenticatorId,
    isUserVerified: true,
  })
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/$/)
  expect((await page.request.get("/api/v1/me")).status()).toBe(200)
})
