import { readFileSync } from "node:fs"
import { test, expect } from "@playwright/test"
import type { ProfileUpdate, ViewerResponse } from "@workspace/contracts"

type Fixture = {
  baseURL: string
  actors: Record<
    "a" | "b",
    {
      cookie: {
        name: string
        value: string
        url: string
        httpOnly: boolean
        sameSite: "Lax"
      }
    }
  >
}

let fixture: Fixture
let original: ProfileUpdate

test.beforeEach(async ({ page }) => {
  fixture = JSON.parse(
    readFileSync(
      process.env.BROWSER_FIXTURE_PATH ??
        "/tmp/fortsprite-browser-fixture.json",
      "utf8",
    ),
  )
  await page.context().addCookies([fixture.actors.a.cookie])
  const response = await page.request.get("/api/v1/me")
  expect(response.status()).toBe(200)
  const { viewer } = (await response.json()) as ViewerResponse
  original = {
    handle: viewer.handle,
    displayName: viewer.displayName,
    fortniteDisplayName: viewer.fortniteDisplayName,
  }
})

test.afterEach(async ({ page }) => {
  const response = await page.request.put("/api/v1/profile", {
    headers: { origin: fixture.baseURL },
    data: original,
  })
  expect(response.status()).toBe(200)
})

test("profile action preserves rejected edits and refreshes the header after a pending retry", async ({
  page,
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const teammateCookie = fixture.actors.b.cookie
  const teammateResponse = await page.request.get("/api/v1/me", {
    headers: { cookie: `${teammateCookie.name}=${teammateCookie.value}` },
  })
  expect(teammateResponse.status()).toBe(200)
  const { viewer: teammate } = (await teammateResponse.json()) as ViewerResponse

  await page.goto("/account")
  const name = page.getByLabel("FortSprite display name", { exact: true })
  const handle = page.getByLabel("FortSprite handle", { exact: true })
  const fortniteName = page.getByLabel("Fortnite display name (optional)", {
    exact: true,
  })
  const draftName = "Action retry collector"
  await name.fill(draftName)
  await handle.fill(teammate.handle)
  await fortniteName.fill("Action retry Fortnite")
  await page.getByRole("button", { name: "Save profile", exact: true }).click()
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "That handle is already taken",
  )
  await expect(name).toHaveValue(draftName)
  await expect(handle).toHaveValue(teammate.handle)
  await expect(fortniteName).toHaveValue("Action retry Fortnite")
  const rejected = await page.request.get("/api/v1/me")
  expect(((await rejected.json()) as ViewerResponse).viewer.displayName).toBe(
    original.displayName,
  )

  await handle.fill(original.handle)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route("**/account", async (route) => {
    const request = route.request()
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await gate
    }
    await route.continue()
  })
  try {
    await Promise.all([
      page.waitForRequest(
        (request) =>
          new URL(request.url()).pathname === "/account" &&
          request.method() === "POST" &&
          Boolean(request.headers()["next-action"]),
      ),
      page.getByRole("button", { name: "Save profile", exact: true }).click(),
    ])
    await expect(
      page.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled()
    await expect(name).toBeDisabled()
    await expect(name).toHaveValue(draftName)
    await expect(
      page.getByText("Your profile has been saved.", { exact: true }),
    ).toHaveCount(0)
  } finally {
    release()
  }
  await expect(page.locator("form").getByRole("status")).toContainText(
    "Your profile has been saved.",
  )
  await expect(
    page.getByRole("button", { name: "Account menu", exact: true }),
  ).toContainText(draftName)
  await expect(name).toBeEnabled()
  const saved = await page.request.get("/api/v1/me")
  expect(((await saved.json()) as ViewerResponse).viewer).toMatchObject({
    displayName: draftName,
    handle: original.handle,
    fortniteDisplayName: "Action retry Fortnite",
  })
  expect(errors).toEqual([])
})
