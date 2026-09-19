import assert from "node:assert/strict"
import { generateKeyPairSync } from "node:crypto"
import test from "node:test"
import { importSPKI, jwtVerify } from "jose"
import { createAppleClientSecret } from "../src/apple-client-secret.ts"

test("Apple client secret has the required issuer, audience, subject and key", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  })
  const issuedAt = new Date("2026-09-18T12:00:00Z")
  const token = await createAppleClientSecret(
    {
      clientId: "net.fortsprite.web",
      teamId: "TEAM123456",
      keyId: "KEY1234567",
      privateKey,
    },
    Math.floor(issuedAt.getTime() / 1000),
  )
  const verified = await jwtVerify(token, await importSPKI(publicKey, "ES256"), {
    audience: "https://appleid.apple.com",
    issuer: "TEAM123456",
    subject: "net.fortsprite.web",
    currentDate: issuedAt,
  })
  assert.equal(verified.protectedHeader.kid, "KEY1234567")
  assert.equal(verified.payload.exp! - verified.payload.iat!, 30 * 24 * 60 * 60)
})
