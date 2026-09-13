import assert from "node:assert/strict"
import { test } from "node:test"
import { spawnSync } from "node:child_process"
import nextConfig from "../next.config"

test("security headers restrict framing, active content and browser capabilities", async () => {
  const routes = await nextConfig.headers!()
  const headers = new Map(
    routes[0]!.headers.map(({ key, value }) => [key, value]),
  )
  const csp = headers.get("Content-Security-Policy")!
  assert.ok(csp.includes("frame-ancestors 'none'"))
  assert.ok(csp.includes("object-src 'none'"))
  assert.ok(csp.includes("base-uri 'self'"))
  assert.ok(csp.includes("form-action 'self'"))
  assert.ok(!csp.includes("'unsafe-eval'"))
  assert.equal(headers.get("X-Frame-Options"), "DENY")
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff")
  assert.equal(nextConfig.experimental?.serverActions?.bodySizeLimit, "16kb")
})

test("production testing APIs fail closed outside the isolated local harness", () => {
  const check = (environment: Partial<NodeJS.ProcessEnv>) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "--eval", "import('./next.config.ts')"],
      {
        env: { ...process.env, EXPOSE_TESTING_API: "1", ...environment },
        encoding: "utf8",
      },
    )
  assert.notEqual(check({ VERCEL: "1" }).status, 0)
  assert.notEqual(
    check({
      VERCEL: "",
      FORTSPRITE_DIST_DIR: ".next",
      WEB_ORIGIN: "https://fortsprite.net",
    }).status,
    0,
  )
  assert.equal(
    check({
      VERCEL: "",
      FORTSPRITE_DIST_DIR: ".next-instant",
      TEST_DATABASE_URL: "postgresql://localhost/isolated_test",
      WEB_ORIGIN: "https://localhost:3002",
    }).status,
    0,
  )
})
