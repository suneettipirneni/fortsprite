const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl || !new URL(databaseUrl).pathname.includes("test")) {
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated PostgreSQL test database",
  )
}

Object.assign(process.env, {
  DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: "fortsprite-local-test-secret-never-use-in-production",
  BETTER_AUTH_URL: "http://localhost:3000",
  WEB_ORIGIN: "http://localhost:3000",
  PASSKEY_RP_ID: "localhost",
  PASSKEY_ORIGIN: "http://localhost:3000",
})
