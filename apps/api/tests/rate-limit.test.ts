import "./env.js"
import { after, test } from "node:test"
import assert from "node:assert/strict"
import { like } from "drizzle-orm"
const { db, pool } = await import("../src/db/client.ts")
const { rateLimit } = await import("../src/db/auth-schema.ts")
const { app } = await import("../src/app.ts")
const ip = `198.18.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`

after(async () => {
  await db.delete(rateLimit).where(like(rateLimit.key, `${ip}|%`))
  await pool.end()
})

test("social sign-in rate limit is enforced by Better Auth with a retry header", async () => {
  let last: Response | undefined
  for (let i = 0; i < 11; i++) {
    last = await app.request("/api/auth/sign-in/social", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "x-real-ip": ip,
        "content-type": "application/json",
      },
      body: JSON.stringify({ provider: "google" }),
    })
  }
  assert.equal(last?.status, 429)
  assert.ok(Number(last?.headers.get("x-retry-after")) > 0)
})
