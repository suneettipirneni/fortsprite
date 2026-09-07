import assert from "node:assert/strict"
import { test } from "node:test"

import {
  EpicApiError,
  getEpicAccounts,
  getEpicFriendRelationships,
  getEpicUserInfo,
  getVisibleEpicFriends,
} from "../src/epic/client.js"

const accountId = "9626f441055349ce8cb7d7d5a483eaa2"
const userInfoUrl = "https://api.epicgames.dev/epic/oauth/v2/userInfo"
const token = "test-access-token"

function jsonFetcher(body: unknown): typeof fetch {
  return async () => Response.json(body)
}

function isSafeEpicError(error: unknown) {
  assert.ok(error instanceof EpicApiError)
  assert.equal(error.status, 502)
  assert.equal(error.message.includes(token), false)
  return true
}

test("user info uses the configured authenticated endpoint and validates identity", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), userInfoUrl)
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`)
    assert.equal(init?.redirect, "error")
    assert.ok(init?.signal instanceof AbortSignal)
    return Response.json({
      sub: accountId,
      preferred_username: "Player One",
      email: "untrusted@example.com",
      email_verified: true,
    })
  }

  assert.deepEqual(await getEpicUserInfo(token, userInfoUrl, fetcher), {
    id: accountId,
    name: "Player One",
    email: `${accountId}@accounts.epic.invalid`,
    emailVerified: false,
  })
})

test("user info rejects a missing token without a request", async () => {
  await assert.rejects(
    getEpicUserInfo(undefined, userInfoUrl, async () => {
      assert.fail("missing-token requests must not reach Epic")
    }),
    isSafeEpicError,
  )
})

test("user info rejects malformed subjects and missing display names", async () => {
  for (const profile of [
    null,
    [],
    { id: accountId, preferred_username: "Player" },
    { sub: 42, preferred_username: "Player" },
    { sub: "not-an-account-id", preferred_username: "Player" },
    { sub: accountId },
    { sub: accountId, preferred_username: "  " },
    { sub: accountId, preferred_username: 42 },
  ]) {
    await assert.rejects(getEpicUserInfo(token, userInfoUrl, jsonFetcher(profile)), isSafeEpicError)
  }
})

test("accounts requests deduplicate IDs and respect Epic's 50-account limit", async () => {
  const ids = Array.from({ length: 101 }, (_, index) => `account-${index}`)
  const batches: string[][] = []
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    assert.equal(url.origin + url.pathname, "https://api.epicgames.dev/epic/id/v2/accounts")
    const batch = url.searchParams.getAll("accountId")
    batches.push(batch)
    return Response.json(batch.map((id) => ({ accountId: id, displayName: id })))
  }

  const accounts = await getEpicAccounts(token, [...ids, ids[0]!], fetcher)
  assert.deepEqual(batches.map((batch) => batch.length), [50, 50, 1])
  assert.deepEqual(accounts.map((account) => account.accountId), ids)
})

test("an empty accounts query makes no request", async () => {
  assert.deepEqual(await getEpicAccounts(token, [], async () => {
    assert.fail("empty account queries must not reach Epic")
  }), [])
})

test("malformed account responses are errors, while consent omissions are valid", async () => {
  for (const body of [{}, null, [null], [{ accountId }], [{ accountId, displayName: " " }]]) {
    await assert.rejects(getEpicAccounts(token, [accountId], jsonFetcher(body)), isSafeEpicError)
  }
  assert.deepEqual(await getEpicAccounts(token, [accountId], jsonFetcher([])), [])
})

test("visible friends omit unresolved accounts even when a nickname is present", async () => {
  const fetcher: typeof fetch = async (input) => {
    const url = new URL(String(input))
    if (url.pathname.includes("/friends/")) {
      return Response.json({ friends: [
        { accountId: "consented", nickname: "Buddy", favorite: true, created: "2026-09-01T00:00:00Z" },
        { accountId: "omitted", nickname: "Private name", favorite: true },
      ] })
    }
    assert.deepEqual(url.searchParams.getAll("accountId"), ["consented", "omitted"])
    return Response.json([{ accountId: "consented", displayName: "Player Two" }])
  }

  assert.deepEqual(await getVisibleEpicFriends(token, accountId, fetcher), [{
    accountId: "consented",
    displayName: "Player Two",
    nickname: "Buddy",
    favorite: true,
    created: "2026-09-01T00:00:00Z",
  }])
})

test("friends reject malformed lists and encode the viewer's account ID", async () => {
  const fetcher: typeof fetch = async (input) => {
    assert.equal(new URL(String(input)).pathname, "/epic/friends/v1/account%2Fid")
    return Response.json({ friends: [] })
  }
  assert.deepEqual(await getEpicFriendRelationships(token, "account/id", fetcher), [])
  for (const body of [{}, { friends: null }, { friends: [null] }, { friends: [{}] }]) {
    await assert.rejects(getEpicFriendRelationships(token, accountId, jsonFetcher(body)), isSafeEpicError)
  }
})

test("upstream errors never propagate provider text or bearer tokens", async () => {
  await assert.rejects(
    getEpicAccounts(token, [accountId], async () => Response.json({
      errorMessage: `Invalid authorization ${token}`,
      errorCode: token,
    }, { status: 401 })),
    (error) => {
      assert.ok(error instanceof EpicApiError)
      assert.equal(error.status, 401)
      assert.equal(error.message, "Epic Games could not complete the request.")
      assert.equal(JSON.stringify(error).includes(token), false)
      return true
    },
  )
  await assert.rejects(getEpicAccounts(token, [accountId], async () => {
    throw new Error(`Network failed with ${token}`)
  }), isSafeEpicError)
  await assert.rejects(getEpicAccounts(token, [accountId], async () => new Response("invalid JSON")), isSafeEpicError)
})

test("Epic requests use a bounded abort signal", async (context) => {
  const timeout = context.mock.method(AbortSignal, "timeout", (delay: number) => {
    assert.equal(delay, 10_000)
    return AbortSignal.abort(new DOMException("Expired", "TimeoutError"))
  })
  const fetcher: typeof fetch = async (_input, init) => {
    assert.ok(init?.signal?.aborted)
    throw init.signal.reason
  }

  await assert.rejects(getEpicAccounts(token, [accountId], fetcher), isSafeEpicError)
  assert.equal(timeout.mock.callCount(), 1)
})
