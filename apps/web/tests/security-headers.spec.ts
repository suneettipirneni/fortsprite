import { expect, test } from "@playwright/test"

test("browser loads public pages under the security policy and rejects oversized API bodies", async ({
  page,
}) => {
  const violations: string[] = []
  page.on("console", (message) => {
    if (/content security policy|violates.*directive/i.test(message.text()))
      violations.push(message.text())
  })
  const response = await page.goto("/sign-in")
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  )
  expect(response?.headers()["x-frame-options"]).toBe("DENY")
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff")
  await expect(
    page.getByRole("button", { name: /Create account/ }),
  ).toBeVisible()
  await page.goto("/privacy")
  await expect(
    page.getByRole("link", { name: "Contact FortSprite support" }),
  ).toBeVisible()
  expect(violations).toEqual([])
  const oversized = await page.request.put("/api/v1/profile", {
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    data: " ".repeat(20000) + "{}",
  })
  expect(oversized.status()).toBe(413)
})
