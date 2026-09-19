import { readFile } from "node:fs/promises"
import {
  test,
  expect,
  type BrowserContext,
  type Page,
  type Route,
} from "@playwright/test"
import type { SharingSnapshot } from "@workspace/contracts"

type Actor = {
  userId: string
  displayName: string
  handle: string
  cookies: Record<
    "desktop" | "mobile",
    Parameters<BrowserContext["addCookies"]>[0][number]
  >
}
type Fixture = {
  baseURL: string
  actors: { a: Actor; b: Actor }
}

let fixture: Fixture
let teammate: BrowserContext
let errors: string[]
let expectedActionFailure = false

test.setTimeout(120_000)

async function setSharing(context: BrowserContext, id: string, action: string) {
  const response = await context.request.post(`/api/v1/friends/${id}`, {
    headers: { origin: fixture.baseURL },
    data: { action },
  })
  expect(response.status()).toBe(200)
}

async function sharingStatus(page: Page) {
  const response = await page.request.get("/api/v1/friends")
  expect(response.status()).toBe(200)
  const snapshot: SharingSnapshot = await response.json()
  return snapshot.friends.find(
    (friend) => friend.profile.id === fixture.actors.b.userId,
  )?.status
}

async function holdSharingAction(page: Page) {
  let held: Route | undefined
  let requests = 0
  await page.route("**/friends", async (route) => {
    const request = route.request()
    if (request.method() === "POST" && request.headers()["next-action"]) {
      requests += 1
      if (!held) {
        held = route
        return
      }
    }
    await route.continue()
  })
  return {
    count: () => requests,
    async release(fail = false) {
      await expect.poll(() => held !== undefined).toBe(true)
      if (fail)
        await held!.fulfill({
          status: 500,
          contentType: "text/plain",
          body: "Temporary test transport failure",
        })
      else await held!.continue()
    },
  }
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
  teammate = await browser.newContext({ baseURL: fixture.baseURL })
  await teammate.addCookies([fixture.actors.b.cookies[project]])
  errors = []
  expectedActionFailure = false
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() !== "error") return
    if (
      expectedActionFailure &&
      message.text().includes("Failed to load resource") &&
      message.text().includes("500")
    )
      return
    errors.push(message.text())
  })
  await setSharing(page.context(), fixture.actors.b.userId, "unblock")
  await setSharing(teammate, fixture.actors.a.userId, "unblock")
  await setSharing(page.context(), fixture.actors.b.userId, "remove")
  for (const [context, actor] of [
    [page.context(), fixture.actors.a],
    [teammate, fixture.actors.b],
  ] as const) {
    const response = await context.request.put("/api/v1/profile", {
      headers: { origin: fixture.baseURL },
      data: {
        displayName: actor.displayName,
        handle: actor.handle,
        fortniteDisplayName: null,
      },
    })
    expect(response.status()).toBe(200)
  }
  expect(await sharingStatus(page)).toBeUndefined()
})

test.afterEach(async () => {
  await teammate?.close()
  expect(errors).toEqual([])
})

test("optimistic acceptance cannot navigate to a comparison before server confirmation", async ({
  page,
}) => {
  await setSharing(teammate, fixture.actors.a.userId, "request")
  await page.goto("/friends")
  const held = await holdSharingAction(page)
  await page
    .getByRole("button", {
      name: `Accept with ${fixture.actors.b.displayName}`,
      exact: true,
    })
    .click()
  await expect(
    page.getByText("Sharing collections", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Compare", exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole("link", { name: "Compare", exact: true }),
  ).toHaveCount(0)
  await expect.poll(held.count).toBe(1)
  expect(await sharingStatus(page)).toBe("incoming")
  const before = await page.request.get(
    `/api/v1/friends/${fixture.actors.b.userId}/comparison`,
  )
  expect(before.status()).toBe(404)
  await held.release()
  const compare = page.getByRole("link", { name: "Compare", exact: true })
  await expect(compare).toBeVisible()
  expect(await sharingStatus(page)).toBe("accepted")
  await compare.click()
  await expect(
    page.getByRole("heading", {
      name: `You and ${fixture.actors.b.displayName}`,
      exact: true,
    }),
  ).toBeVisible()
})
