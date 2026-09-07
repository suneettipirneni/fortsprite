import { readFile, rename, writeFile } from "node:fs/promises"
import { test, expect, type BrowserContext, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import type { CollectionSnapshot, SharingSnapshot } from "@workspace/contracts"

type Actor = {
  userId: string
  epicId: string
  accessToken: string
  displayName: string
  epicDisplayName: string
  handle: string
  cookie: {
    name: string
    value: string
    url: string
    httpOnly: boolean
    sameSite: "Lax"
  }
}
type ProviderState = {
  accounts: { accountId: string; displayName: string; accessToken: string }[]
  visibleAccountIds: string[]
  friendships: Record<string, string[]>
  outage: boolean
}
type Fixture = {
  baseURL: string
  actors: { a: Actor; b: Actor }
  providerPath: string
  provider: ProviderState
  sprites: { id: string; baseName: string; variant: string; rarity: string }[]
}

let fixture: Fixture
let teammateContext: BrowserContext
let teammate: Page
let errors: string[]
let expectedProviderOutage = false

test.setTimeout(120_000)

async function providerState(change: Partial<ProviderState> = {}) {
  const temporary = `${fixture.providerPath}.next`
  await writeFile(
    temporary,
    JSON.stringify({ ...fixture.provider, ...change }),
    { mode: 0o600 },
  )
  await rename(temporary, fixture.providerPath)
}

function monitor(page: Page) {
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message))
  page.on("console", (message) => {
    if (
      expectedProviderOutage &&
      message.text().includes("FortSprite request failed") &&
      message.text().includes("EpicApiError")
    )
      return
    if (message.type() === "error")
      errors.push(
        `${message.text()} (${message.location().url}:${message.location().lineNumber})`,
      )
  })
}

async function sharing(page: Page, friendId: string, action: string) {
  const response = await page.request.post(`/api/v1/friends/${friendId}`, {
    headers: { origin: fixture.baseURL },
    data: { action },
  })
  expect(response.status()).toBe(200)
}

async function setOwned(page: Page, spriteId: string, owned: boolean) {
  const response = await page.request.put(`/api/v1/collection/${spriteId}`, {
    headers: { origin: fixture.baseURL },
    data: { owned, mastered: false },
  })
  expect(response.status()).toBe(200)
}

async function collection(page: Page): Promise<CollectionSnapshot> {
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  return response.json()
}

async function acceptThroughApi(page: Page) {
  await sharing(page, fixture.actors.b.userId, "request")
  await sharing(teammate, fixture.actors.a.userId, "accept")
}

async function accessible(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
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
  await providerState()
  errors = []
  expectedProviderOutage = false
  await page.context().addCookies([fixture.actors.a.cookie])
  teammateContext = await browser.newContext({
    baseURL: fixture.baseURL,
    viewport: page.viewportSize(),
    isMobile: testInfo.project.name === "mobile",
    hasTouch: testInfo.project.name === "mobile",
  })
  await teammateContext.addCookies([fixture.actors.b.cookie])
  teammate = await teammateContext.newPage()
  monitor(page)
  monitor(teammate)
  await sharing(page, fixture.actors.b.userId, "unblock")
  await sharing(teammate, fixture.actors.a.userId, "unblock")
  await sharing(page, fixture.actors.b.userId, "remove")
  for (const [key, actorPage] of [
    ["a", page],
    ["b", teammate],
  ] as const) {
    const actor = fixture.actors[key]
    const profile = await actorPage.request.put("/api/v1/profile", {
      headers: { origin: fixture.baseURL },
      data: {
        displayName: actor.displayName,
        handle: actor.handle,
        fortniteDisplayName: null,
      },
    })
    expect(profile.status()).toBe(200)
    for (const [index, sprite] of fixture.sprites.entries())
      await setOwned(
        actorPage,
        sprite.id,
        key === "a" ? index === 0 : index === 1,
      )
    expect((await collection(actorPage)).friendAvailability.status).toBe(
      "ready",
    )
  }
})

test.afterEach(async () => {
  await teammateContext?.close()
  await providerState()
  expect(errors).toEqual([])
})

test("mutual UI sharing exposes unmastered captures and both comparison directions", async ({
  page,
}, testInfo) => {
  const [ours, theirs] = fixture.sprites
  await page.goto("/friends")
  const request = page.getByRole("button", {
    name: `Share collections with ${fixture.actors.b.displayName}`,
    exact: true,
  })
  await request.focus()
  await expect(request).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByText("Request sent", { exact: true })).toBeVisible()
  expect(
    (await collection(page)).items.find((item) => item.id === theirs!.id)
      ?.helpers,
  ).toEqual([])
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
  await page
    .getByRole("button", { name: "Refresh friends", exact: true })
    .click()
  await expect(
    page.getByRole("link", { name: "Compare", exact: true }),
  ).toBeVisible()
  await accessible(page)
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-friends.png`,
  })
  const current = await collection(page)
  expect(
    current.items
      .find((item) => item.id === theirs!.id)
      ?.helpers.map((friend) => friend.id),
  ).toEqual([fixture.actors.b.userId])
  const theirsSnapshot = await collection(teammate)
  expect(
    theirsSnapshot.items.find((item) => item.id === theirs!.id)?.mastered,
  ).toBe(false)
  await page.goto("/matches")
  await page
    .getByRole("combobox", { name: "Filter by friend availability" })
    .click()
  await page
    .getByRole("option", { name: "Friends can help", exact: true })
    .click()
  await expect(
    page
      .getByRole("region", { name: "Missing Sprites", exact: true })
      .locator("article"),
  ).toHaveCount(1)
  await expect(
    page.getByRole("link", { name: fixture.actors.b.displayName, exact: true }),
  ).toBeVisible()
  await page
    .getByRole("link", { name: fixture.actors.b.displayName, exact: true })
    .click()
  const forYou = page.getByRole("region", {
    name: "Sprites for you",
    exact: true,
  })
  const forFriend = page.getByRole("region", {
    name: "Sprites for your friend",
    exact: true,
  })
  await expect(
    forYou.getByRole("heading", {
      name: `${theirs!.variant} ${theirs!.baseName}`,
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    forFriend.getByRole("heading", {
      name: `${ours!.variant} ${ours!.baseName}`,
      exact: true,
    }),
  ).toBeVisible()
  await forYou
    .getByRole("textbox", { name: "Search Sprites for you" })
    .fill("no-sprite-here")
  await expect(
    forYou.getByText("No Sprites match these filters.", { exact: true }),
  ).toBeVisible()
  await expect(forFriend.locator("article")).toHaveCount(1)
  await forYou.getByRole("button", { name: "Clear filters" }).click()
  await forFriend
    .getByRole("combobox", { name: "Filter Sprites for your friend by rarity" })
    .click()
  await page.getByRole("option", { name: ours!.rarity, exact: true }).click()
  await expect(forFriend.locator("article")).toHaveCount(1)
  await forYou
    .getByRole("combobox", { name: "Filter Sprites for you by variant" })
    .click()
  await page.getByRole("option", { name: theirs!.variant, exact: true }).click()
  await expect(forYou.locator("article")).toHaveCount(1)
  await expect(forFriend.locator("article")).toHaveCount(1)
  await accessible(page)
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-comparison.png`,
  })
  await teammate.goto("/collection")
  await teammate
    .locator(`article[data-sprite-id="${theirs!.id}"]`)
    .getByRole("button", { name: /^Captured / })
    .click()
  await expect
    .poll(
      async () =>
        (await collection(teammate)).items.find(
          (item) => item.id === theirs!.id,
        )?.owned,
    )
    .toBe(false)
  await page.reload()
  await expect(
    forYou.getByText(
      "Your friend has no captured Sprites that you are missing right now.",
    ),
  ).toBeVisible()
})

test("blocking revokes both comparison directions and unblocking does not restore consent", async ({
  page,
}) => {
  await acceptThroughApi(page)
  const knownURL = `/friends/${fixture.actors.b.userId}`
  await page.goto(knownURL)
  await expect(
    page.getByRole("heading", {
      name: `You and ${fixture.actors.b.displayName}`,
    }),
  ).toBeVisible()
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
  ).toBeEnabled()
  expect(
    (
      await page.request.get(
        `/api/v1/friends/${fixture.actors.b.userId}/comparison`,
      )
    ).status(),
  ).toBe(404)
  expect(
    (
      await teammate.request.get(
        `/api/v1/friends/${fixture.actors.a.userId}/comparison`,
      )
    ).status(),
  ).toBe(404)
  expect(
    (await collection(page)).items.flatMap((item) => item.helpers),
  ).toEqual([])
  expect(
    (await collection(teammate)).items.flatMap((item) => item.helpers),
  ).toEqual([])
  await page.goto(knownURL)
  await expect(
    page.getByRole("heading", {
      name: "This collection is not shared with you",
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole("link", { name: "Back to friends", exact: true }).click()
  await page
    .getByRole("button", {
      name: `Unblock with ${fixture.actors.b.displayName}`,
      exact: true,
    })
    .click()
  await expect(
    page.getByRole("button", {
      name: `Share collections with ${fixture.actors.b.displayName}`,
      exact: true,
    }),
  ).toBeEnabled()
  expect(
    (
      await page.request.get(
        `/api/v1/friends/${fixture.actors.b.userId}/comparison`,
      )
    ).status(),
  ).toBe(404)
})

test("Accounts omission removes identities and helpers; Epic outage is recoverable", async ({
  page,
}, testInfo) => {
  await acceptThroughApi(page)
  await providerState({ visibleAccountIds: [fixture.actors.a.epicId] })
  const response = await page.request.get("/api/v1/friends")
  expect(response.status()).toBe(200)
  const sharingSnapshot: SharingSnapshot = await response.json()
  expect(sharingSnapshot.friends).toEqual([])
  expect(sharingSnapshot.unjoined).toEqual([])
  const privateSnapshot = await collection(page)
  expect(privateSnapshot.friendAvailability.status).toBe("ready")
  expect(privateSnapshot.items.flatMap((item) => item.helpers)).toEqual([])
  expect(
    (
      await page.request.get(
        `/api/v1/friends/${fixture.actors.b.userId}/comparison`,
      )
    ).status(),
  ).toBe(404)
  const serialized = JSON.stringify({ sharingSnapshot, privateSnapshot })
  for (const actor of Object.values(fixture.actors)) {
    expect(serialized).not.toContain(actor.epicId)
    expect(serialized).not.toContain(actor.accessToken)
  }
  expect(serialized).not.toContain("Fixture nickname")
  await page.goto("/friends")
  await expect(
    page.getByRole("heading", { name: "No visible friends yet", exact: true }),
  ).toBeVisible()
  expectedProviderOutage = true
  await providerState({ outage: true })
  await page
    .getByRole("button", { name: "Refresh friends", exact: true })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "Friends are temporarily unavailable",
      exact: true,
    }),
  ).toBeVisible()
  const unavailable = await collection(page)
  expect(unavailable.friendAvailability.status).toBe("unavailable")
  expect(
    unavailable.items.find((item) => item.id === fixture.sprites[0]!.id)?.owned,
  ).toBe(true)
  await page.goto("/matches")
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Friend availability could not be refreshed." }),
  ).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "Filter by friend availability" }),
  ).toBeDisabled()
  await accessible(page)
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-friend-outage.png`,
  })
  await providerState()
  await page.goto("/friends")
  await expect(
    page
      .getByRole("region", { name: "FortSprite friends" })
      .getByText("Sharing collections", { exact: true }),
  ).toBeVisible()
  expect((await collection(page)).friendAvailability.status).toBe("ready")
})

test("profile edits persist separately from Epic identity at desktop and narrow mobile widths", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 844 })
  await page.goto("/account")
  const localName = `Edited ${testInfo.project.name} collector`
  const handle = `edited_${fixture.actors.a.handle.slice(-8)}`
  await page
    .getByRole("textbox", { name: "FortSprite display name", exact: true })
    .fill(localName)
  await page
    .getByRole("textbox", { name: "FortSprite handle", exact: true })
    .fill(handle)
  await page
    .getByRole("textbox", {
      name: "Fortnite display name (optional)",
      exact: true,
    })
    .fill("Squad Captain")
  await page.getByRole("button", { name: "Save profile", exact: true }).click()
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Your profile has been saved." }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole("textbox", { name: "FortSprite display name", exact: true }),
  ).toHaveValue(localName)
  await expect(
    page.getByRole("textbox", { name: "FortSprite handle", exact: true }),
  ).toHaveValue(handle)
  const response = await page.request.get("/api/v1/me")
  expect(response.status()).toBe(200)
  const { viewer } = await response.json()
  expect(viewer.displayName).toBe(localName)
  expect(viewer.epicDisplayName).toBe(fixture.actors.a.epicDisplayName)
  expect(viewer.fortniteDisplayName).toBe("Squad Captain")
  await accessible(page)
  await page.screenshot({
    path: `/tmp/fortsprite-${testInfo.project.name}-account.png`,
  })
  const deleteRequests: string[] = []
  page.on("request", (request) => {
    if (request.method() === "DELETE") deleteRequests.push(request.url())
  })
  await page
    .getByRole("button", { name: "Delete FortSprite account", exact: true })
    .click()
  const confirmation = page.getByRole("alertdialog")
  await expect(
    confirmation.getByRole("button", {
      name: "Delete FortSprite account",
      exact: true,
    }),
  ).toBeDisabled()
  await confirmation
    .getByRole("textbox", { name: "Type your handle to confirm", exact: true })
    .fill("wrong-handle")
  await expect(
    confirmation.getByRole("button", {
      name: "Delete FortSprite account",
      exact: true,
    }),
  ).toBeDisabled()
  await confirmation
    .getByRole("textbox", { name: "Type your handle to confirm", exact: true })
    .fill(handle)
  await expect(
    confirmation.getByRole("button", {
      name: "Delete FortSprite account",
      exact: true,
    }),
  ).toBeEnabled()
  await accessible(page)
  await confirmation
    .getByRole("button", { name: "Keep my account", exact: true })
    .click()
  await expect(confirmation).toHaveCount(0)
  expect(deleteRequests).toEqual([])
  expect((await page.request.get("/api/v1/me")).status()).toBe(200)
})
