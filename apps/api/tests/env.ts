import { generateKeyPairSync } from "node:crypto"

const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.includes("test")) {
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated PostgreSQL test database",
  )
}

const { privateKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
})

Object.assign(process.env, {
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: "fortsprite-local-test-secret-never-use-in-production",
  BETTER_AUTH_URL: "http://localhost:3000",
  WEB_ORIGIN: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "fortsprite-google-test-client",
  GOOGLE_CLIENT_SECRET: "fortsprite-google-test-secret",
  APPLE_CLIENT_ID: "net.fortsprite.web.test",
  APPLE_TEAM_ID: "FORTSPRITETEST",
  APPLE_KEY_ID: "TESTKEY123",
  APPLE_PRIVATE_KEY: privateKey,
  PASSKEY_RP_ID: "localhost",
  PASSKEY_ORIGIN: "http://localhost:3000",
})
