import assert from "node:assert/strict"
import { after, before, mock, test } from "node:test"
import { NextRequest } from "next/server"

import { proxy } from "../proxy.ts"

const origin = "https://fortsprite.example.test"
const previousOrigin = process.env.BETTER_AUTH_URL
before(() => { process.env.BETTER_AUTH_URL = origin })
after(() => {
  if (previousOrigin === undefined) delete process.env.BETTER_AUTH_URL
  else process.env.BETTER_AUTH_URL = previousOrigin
})

test("the page guard checks the API at the configured origin and preserves refreshed cookies", async () => {
  const fetch = mock.method(globalThis, "fetch", async (url: URL, options: RequestInit) => {
    assert.equal(url.href, `${origin}/api/auth/get-session`)
    assert.equal(options.headers && new Headers(options.headers).get("cookie"), "session=private")
    assert.equal(options.cache, "no-store")
    assert.equal(options.redirect, "error")
    assert.ok(options.signal instanceof AbortSignal)
    const headers = new Headers()
    headers.append("set-cookie", "session=refreshed; HttpOnly; Secure")
    headers.append("set-cookie", "other=refreshed; HttpOnly; Secure")
    return Response.json({ user: { id: "test-user" }, session: { expiresAt: "2099-01-01" } }, { headers })
  })
  try {
    // A request-controlled host must never receive the session cookie.
    const response = await proxy(new NextRequest("https://untrusted.example/account", {
      headers: { cookie: "session=private" },
    }))
    assert.equal(response.headers.get("x-middleware-next"), "1")
    assert.equal(response.headers.get("cache-control"), "no-store")
    assert.equal(response.headers.getSetCookie().length, 2)
  } finally {
    fetch.mock.restore()
  }
})

test("only a successful empty session redirects to sign-in and clears expired cookies", async () => {
  const fetch = mock.method(globalThis, "fetch", async () => Response.json(null, {
    headers: { "set-cookie": "session=; Max-Age=0; HttpOnly; Secure" },
  }))
  try {
    const response = await proxy(new NextRequest(`${origin}/collection?season=43`))
    assert.equal(response.status, 307)
    assert.equal(response.headers.get("location"), `${origin}/sign-in?callbackUrl=%2Fcollection%3Fseason%3D43`)
    assert.match(response.headers.get("set-cookie")!, /Max-Age=0/)
    assert.equal(response.headers.get("cache-control"), "no-store")
  } finally {
    fetch.mock.restore()
  }
})

test("session service errors fail closed without a misleading sign-in redirect or cookie loss", async () => {
  for (const result of [
    () => Promise.reject(new Error("private upstream details")),
    () => Promise.resolve(new Response(null, { status: 500 })),
    () => Promise.resolve(new Response("malformed JSON")),
    () => Promise.resolve(Response.json({ error: "unexpected payload" })),
    () => Promise.resolve(Response.json(false)),
  ]) {
    const fetch = mock.method(globalThis, "fetch", result)
    try {
      const response = await proxy(new NextRequest(`${origin}/account`))
      assert.equal(response.status, 503)
      assert.equal(response.headers.get("location"), null)
      assert.equal(response.headers.get("set-cookie"), null)
      assert.equal(response.headers.get("cache-control"), "no-store")
      assert.equal(response.headers.get("retry-after"), "10")
      assert.match(await response.text(), /reload in a moment/)
    } finally {
      fetch.mock.restore()
    }
  }
})
