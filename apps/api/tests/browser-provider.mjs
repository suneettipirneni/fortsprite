import { readFile, rename, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"

const nativeFetch = globalThis.fetch
const providerPath =
  process.env.BROWSER_PROVIDER_STATE_PATH ??
  "/tmp/fortsprite-browser-provider.json"

globalThis.fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  )
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    return nativeFetch(input, init)
  if (
    !["https://api.epicgames.dev", "https://epic.example.test"].includes(
      url.origin,
    )
  )
    throw new Error(
      `Unexpected external browser-test request to ${url.origin}${url.pathname}`,
    )
  const state = JSON.parse(await readFile(providerPath, "utf8"))
  if (state.outage)
    return Response.json(
      { error: "Deterministic Epic outage" },
      { status: 503 },
    )
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  )
  if (url.href === process.env.EPIC_OAUTH_TOKEN_URL) {
    const basic = Buffer.from(
      `${process.env.EPIC_OAUTH_CLIENT_ID}:${process.env.EPIC_OAUTH_CLIENT_SECRET}`,
    ).toString("base64")
    const body = new URLSearchParams(
      String(
        init?.body ??
          (input instanceof Request ? await input.clone().text() : ""),
      ),
    )
    const grant = state.oauthCodes?.[body.get("code")]
    const challenge = createHash("sha256")
      .update(body.get("code_verifier") ?? "")
      .digest("base64url")
    if (
      headers.get("authorization") !== `Basic ${basic}` ||
      body.get("grant_type") !== "authorization_code" ||
      !grant ||
      grant.used ||
      grant.challenge !== challenge
    )
      return Response.json({ error: "invalid_grant" }, { status: 400 })
    const account = state.accounts.find(
      (account) => account.accountId === grant.accountId,
    )
    if (!account)
      return Response.json({ error: "invalid_grant" }, { status: 400 })
    grant.used = true
    const temporary = `${providerPath}.oauth-next`
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600 })
    await rename(temporary, providerPath)
    return Response.json({
      access_token: account.accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope: "basic_profile friends_list",
    })
  }
  const actor = state.accounts.find(
    (account) =>
      headers.get("authorization") === `Bearer ${account.accessToken}`,
  )
  if (!actor)
    return Response.json(
      { error: "Unknown browser fixture credential" },
      { status: 401 },
    )
  if (url.href === process.env.EPIC_OAUTH_USER_INFO_URL)
    return Response.json({
      sub: actor.accountId,
      preferred_username: actor.displayName,
    })
  const prefix = "/epic/friends/v1/"
  if (url.pathname.startsWith(prefix)) {
    const requestedActor = decodeURIComponent(url.pathname.slice(prefix.length))
    if (requestedActor !== actor.accountId)
      return Response.json({ error: "Wrong token owner" }, { status: 403 })
    return Response.json({
      friends: (state.friendships[actor.accountId] ?? []).map((accountId) => ({
        accountId,
        created: "2026-09-01T00:00:00Z",
        favorite: false,
        nickname: "Fixture nickname must not bypass account consent",
      })),
    })
  }
  if (url.pathname === "/epic/id/v2/accounts") {
    const requested = url.searchParams.getAll("accountId")
    if (requested.length > 50)
      throw new Error("Epic account batch exceeds fifty IDs")
    return Response.json(
      state.accounts
        .filter(
          (account) =>
            requested.includes(account.accountId) &&
            state.visibleAccountIds.includes(account.accountId),
        )
        .map(({ accountId, displayName }) => ({ accountId, displayName })),
    )
  }
  throw new Error(`Unexpected Epic browser-test request to ${url.pathname}`)
}
