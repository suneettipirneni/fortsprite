import { resolve } from "node:path"

import { config } from "dotenv"

if (process.env.NODE_ENV !== "production") {
  config({
    path: [resolve(".env"), resolve("apps/api/.env"), resolve("../api/.env")],
    quiet: true,
  })
}

const requiredNames = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "WEB_ORIGIN",
  "EPIC_OAUTH_CLIENT_ID",
  "EPIC_OAUTH_CLIENT_SECRET",
  "EPIC_OAUTH_AUTHORIZATION_URL",
  "EPIC_OAUTH_TOKEN_URL",
  "EPIC_OAUTH_USER_INFO_URL",
  "EPIC_OAUTH_SCOPES",
] as const

type RequiredName = (typeof requiredNames)[number]

const values = Object.fromEntries(
  requiredNames.map((name) => [name, process.env[name]?.trim()]),
) as Record<RequiredName, string | undefined>

const missingNames = requiredNames.filter((name) => {
  const value = values[name]
  return !value || value.startsWith("replace-with-")
})

if (missingNames.length > 0) {
  throw new Error(
    `Missing or placeholder API configuration: ${missingNames.join(", ")}. Copy apps/api/.env.example to apps/api/.env and replace every placeholder.`,
  )
}

function required(name: RequiredName) {
  return values[name] as string
}

function requiredUrl(name: RequiredName, protocols: string[]) {
  const value = required(name)

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${name} must be a valid absolute URL`)
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}`)
  }

  return url.toString().replace(/\/$/, "")
}

const betterAuthSecret = required("BETTER_AUTH_SECRET")

if (betterAuthSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters")
}

function requiredOrigin(name: "BETTER_AUTH_URL" | "WEB_ORIGIN") {
  const value = requiredUrl(
    name,
    process.env.NODE_ENV === "production" ? ["https:"] : ["http:", "https:"],
  )
  const url = new URL(value)
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      `${name} must be an origin without a path, credentials, query, or fragment`,
    )
  return url.origin
}

const epicScopes = required("EPIC_OAUTH_SCOPES").split(/\s+/).filter(Boolean)
if (
  epicScopes.length !== 2 ||
  new Set(epicScopes).size !== 2 ||
  !epicScopes.includes("basic_profile") ||
  !epicScopes.includes("friends_list")
)
  throw new Error(
    "EPIC_OAUTH_SCOPES must be exactly basic_profile friends_list",
  )
const betterAuthUrl = requiredOrigin("BETTER_AUTH_URL")
const webOrigin = requiredOrigin("WEB_ORIGIN")
if (process.env.NODE_ENV === "production" && betterAuthUrl !== webOrigin)
  throw new Error(
    "BETTER_AUTH_URL and WEB_ORIGIN must match for the single-origin deployment",
  )

export const env = {
  databaseUrl: requiredUrl("DATABASE_URL", ["postgresql:", "postgres:"]),
  betterAuthSecret,
  betterAuthUrl,
  webOrigin,
  betterAuthCookieDomain: process.env.BETTER_AUTH_COOKIE_DOMAIN?.trim(),
  epicClientId: required("EPIC_OAUTH_CLIENT_ID"),
  epicClientSecret: required("EPIC_OAUTH_CLIENT_SECRET"),
  epicAuthorizationUrl: requiredUrl("EPIC_OAUTH_AUTHORIZATION_URL", ["https:"]),
  epicTokenUrl: requiredUrl("EPIC_OAUTH_TOKEN_URL", ["https:"]),
  epicUserInfoUrl: requiredUrl("EPIC_OAUTH_USER_INFO_URL", ["https:"]),
  epicScopes,
} as const
