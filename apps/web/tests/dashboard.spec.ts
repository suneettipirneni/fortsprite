import { readFileSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import type { CollectionItem, CollectionSnapshot } from "@workspace/contracts"

function metric(page: Page, label: string) {
  return page.getByRole("region", { name: "Collection progress" })
    .getByRole("term").filter({ hasText: new RegExp(`^${label}$`) })
    .locator("..").getByRole("definition")
}

async function expectProgress(page: Page, items: CollectionItem[]) {
  const owned = items.filter((item) => item.owned).length
  const mastered = items.filter((item) => item.mastered).length
  const percent = items.length === 0 ? 0 : Math.round(100 * owned / items.length)
  await expect(metric(page, "Collected")).toHaveText(String(owned))
  await expect(metric(page, "Mastered")).toHaveText(String(mastered))
  await expect(metric(page, "Completion")).toHaveText(`${percent}%`)
  await expect(page.getByRole("progressbar", { name: "Collection completion" })).toHaveAttribute("aria-valuenow", String(percent))
}

test("home stats default to current season and switch to past seasons and all time", async ({ page, baseURL }, testInfo) => {
  const fixture = JSON.parse(readFileSync(
    process.env.BROWSER_FIXTURE_PATH ?? "/tmp/fortsprite-browser-fixture.json", "utf8",
  ))
  await page.context().addCookies([fixture.cookies[testInfo.project.name === "desktop" ? "desktop" : "mobile"]])
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Content Security Policy")) errors.push(message.text())
  })
  const response = await page.request.get("/api/v1/collection")
  expect(response.status()).toBe(200)
  const snapshot: CollectionSnapshot = await response.json()
  const latest = Math.max(...snapshot.items.flatMap((item) => item.sourceSeasonId === null ? [] : [item.sourceSeasonId]))
  const current = snapshot.items.find((item) => item.sourceSeasonId === latest)!
  const past = snapshot.items.find((item) => item.sourceSeasonId !== null && item.sourceSeasonId !== latest)!
  // Different progress in each season catches all-time counts leaking into the default.
  for (const item of [current, past]) {
    const update = await page.request.put(`/api/v1/collection/${item.id}`, {
      headers: { origin: baseURL! }, data: { owned: true, mastered: true },
    })
    expect(update.status()).toBe(200)
    item.owned = true
    item.mastered = true
  }

  await page.goto("/")
  await expect(page).toHaveURL(baseURL! + "/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Good hunting,")
  const selector = page.getByRole("combobox", { name: "Stats season" })
  await expect(selector).toContainText(`Current season · ${current.season}`)
  await expectProgress(page, snapshot.items.filter((item) => item.sourceSeasonId === latest))
  const sharing = await metric(page, "Sharing friends").innerText()
  const gaps = await page.getByRole("heading", { name: /current-season gaps? within reach/ }).innerText()
  await page.screenshot({ path: `/tmp/fortsprite-dashboard-current-${testInfo.project.name}.png` })

  await selector.click()
  await page.getByRole("option", { name: past.season!, exact: true }).click()
  await expectProgress(page, snapshot.items.filter((item) => item.sourceSeasonId === past.sourceSeasonId))
  await expect(metric(page, "Sharing friends")).toHaveText(sharing)

  await selector.click()
  await page.getByRole("option", { name: "All time", exact: true }).click()
  await expectProgress(page, snapshot.items)
  await expect(metric(page, "Sharing friends")).toHaveText(sharing)
  await expect(page.getByRole("heading", { name: /current-season gaps? within reach/ })).toHaveText(gaps)
  await page.screenshot({ path: `/tmp/fortsprite-dashboard-all-time-${testInfo.project.name}.png` })

  await selector.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.keyboard.press("Home")
  await expect(page.getByRole("option", { name: `Current season · ${current.season}`, exact: true })).toBeFocused()
  await page.keyboard.press("Enter")
  await expectProgress(page, snapshot.items.filter((item) => item.sourceSeasonId === latest))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.locator("nextjs-dialog")).toHaveCount(0)
  expect(errors).toEqual([])
})
