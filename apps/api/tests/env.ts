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
  EPIC_OAUTH_CLIENT_ID: "fortsprite-test-client",
  EPIC_OAUTH_CLIENT_SECRET: "fortsprite-test-client-secret",
  EPIC_OAUTH_AUTHORIZATION_URL: "https://epic.example.test/authorize",
  EPIC_OAUTH_TOKEN_URL: "https://epic.example.test/token",
  EPIC_OAUTH_USER_INFO_URL: "https://epic.example.test/userInfo",
  EPIC_OAUTH_SCOPES: "basic_profile friends_list",
})
