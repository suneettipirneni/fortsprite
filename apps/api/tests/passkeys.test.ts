import "./env.js"
import { after, before, mock, test } from "node:test"
import assert from "node:assert/strict"
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto"
import { eq, like } from "drizzle-orm"

const { app } = await import("../src/app.ts")
const { db, pool } = await import("../src/db/client.ts")
const { user, passkey, rateLimit } = await import("../src/db/auth-schema.ts")
const userId = randomUUID()
const credentialID = randomBytes(32).toString("base64url")
const ip = `198.18.72.${Math.floor(Math.random() * 254) + 1}`
const headers = { origin: "http://localhost:3000", "x-real-ip": ip }
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
const jwk = publicKey.export({ format: "jwk" })
const cose = Buffer.concat([
  Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
  Buffer.from(jwk.x!, "base64url"),
  Buffer.from([0x22, 0x58, 0x20]),
  Buffer.from(jwk.y!, "base64url"),
])
let counter = 0

before(async () => {
  await db.insert(user).values({
    id: userId, name: "Passkey regression", email: `${userId}@example.test`,
    handle: `passkey_${randomBytes(5).toString("hex")}`,
  })
  await db.insert(passkey).values({
    id: randomUUID(), userId, credentialID, publicKey: cose.toString("base64"),
    counter: 0, deviceType: "singleDevice", backedUp: false, transports: "usb",
  })
})

after(async () => {
  await db.delete(user).where(eq(user.id, userId))
  await db.delete(rateLimit).where(like(rateLimit.key, `${ip}|%`))
  await pool.end()
})

async function generate() {
  const response = await app.request("/api/auth/passkey/generate-authenticate-options", { headers })
  assert.equal(response.status, 200)
  const options = await response.json() as { challenge: string; userVerification: string }
  const cookie = response.headers.get("set-cookie")?.split(";")[0]
  assert.ok(cookie)
  assert.equal(response.headers.get("cache-control"), "no-store")
  return { options, cookie }
}

function assertion(challenge: string, verified: boolean) {
  const clientData = Buffer.from(JSON.stringify({
    type: "webauthn.get", challenge, origin: headers.origin, crossOrigin: false,
  }))
  const authenticatorData = Buffer.alloc(37)
  createHash("sha256").update("localhost").digest().copy(authenticatorData)
  authenticatorData[32] = verified ? 0x05 : 0x01
  authenticatorData.writeUInt32BE(++counter, 33)
  const signature = sign("sha256", Buffer.concat([
    authenticatorData, createHash("sha256").update(clientData).digest(),
  ]), privateKey)
  return {
    id: credentialID, rawId: credentialID, type: "public-key",
    response: {
      clientDataJSON: clientData.toString("base64url"),
      authenticatorData: authenticatorData.toString("base64url"),
      signature: signature.toString("base64url"), userHandle: null,
    },
    clientExtensionResults: {},
  }
}

function verify(cookie: string, response: ReturnType<typeof assertion>) {
  return app.request("/api/auth/passkey/verify-authentication", {
    method: "POST", headers: { ...headers, cookie, "content-type": "application/json" },
    body: JSON.stringify({ response }),
  })
}

test("sign-in requests required user verification and preserves its challenge cookie", async () => {
  const { options, cookie } = await generate()
  assert.equal(options.userVerification, "required")
  const response = await verify(cookie, assertion(options.challenge, true))
  assert.equal(response.status, 200)
  assert.ok(response.headers.get("set-cookie")?.includes("session_token="))
})

test("a correctly signed passkey without user verification still cannot sign in", async () => {
  const { options, cookie } = await generate()
  const response = await verify(cookie, assertion(options.challenge, false))
  assert.equal(response.status, 401)
  assert.equal((await response.json()).code, "USER_VERIFICATION_REQUIRED")
  assert.ok(!response.headers.get("set-cookie")?.includes("session_token="))
})

test("verification remains single-use and the same credential works with a fresh challenge", async () => {
  const { options, cookie } = await generate()
  const signed = assertion(options.challenge, true)
  assert.equal((await verify(cookie, signed)).status, 200)
  const replay = await verify(cookie, signed)
  assert.equal(replay.status, 400)
  assert.equal((await replay.json()).code, "CHALLENGE_NOT_FOUND")
  const fresh = await generate()
  assert.equal((await verify(fresh.cookie, assertion(fresh.options.challenge, true))).status, 200)
})

test("passkey diagnostics contain only the route, status, error code, and request ID", async () => {
  const log = mock.method(console, "warn", () => {})
  try {
    const response = await app.request("/api/auth/passkey/verify-authentication", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json", "x-request-id": "passkey-regression" },
      body: JSON.stringify({ response: assertion("missing-challenge", true) }),
    })
    assert.equal(response.status, 400)
    const entry = log.mock.calls.find(({ arguments: args }) => args[0] === "FortSprite passkey request failed")
    assert.deepEqual(entry?.arguments, ["FortSprite passkey request failed", {
      path: "/passkey/verify-authentication", status: 400,
      code: "CHALLENGE_NOT_FOUND", requestId: "passkey-regression",
    }])
  } finally {
    log.mock.restore()
  }
})
