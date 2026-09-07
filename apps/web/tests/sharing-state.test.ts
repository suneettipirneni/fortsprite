import assert from "node:assert/strict"
import test from "node:test"
import type { PublicProfile, SharingSnapshot } from "@workspace/contracts"
import { projectSharing } from "../lib/sharing-state"

function profile(id: string): PublicProfile {
  return {
    id,
    handle: id,
    displayName: id,
    initials: id[0]!,
    fortniteDisplayName: null,
  }
}

function snapshot(): SharingSnapshot {
  return {
    friends: [
      { profile: profile("available"), status: "none" },
      { profile: profile("incoming"), status: "incoming" },
      { profile: profile("accepted"), status: "accepted" },
    ],
    blocked: [profile("blocked")],
    unjoined: [],
    refreshedAt: "2026-09-06T00:00:00Z",
  }
}

test("requests and acceptance project only the intended relationship without mutating confirmed state", () => {
  const confirmed = snapshot()
  const requested = projectSharing(confirmed, {
    id: "available",
    action: "request",
  })!
  assert.equal(requested.friends[0]!.status, "outgoing")
  assert.equal(confirmed.friends[0]!.status, "none")
  assert.equal(requested.friends[1], confirmed.friends[1])
  assert.equal(requested.refreshedAt, confirmed.refreshedAt)
  const accepted = projectSharing(confirmed, {
    id: "incoming",
    action: "accept",
  })!
  assert.equal(accepted.friends[1]!.status, "accepted")
  assert.equal(confirmed.friends[1]!.status, "incoming")
  assert.equal(
    projectSharing(confirmed, { id: "available", action: "accept" })!
      .friends[0]!.status,
    "none",
  )
})

test("blocking moves an existing identity out of friends once and preserves unrelated profiles", () => {
  const confirmed = snapshot()
  const projected = projectSharing(confirmed, {
    id: "accepted",
    action: "block",
  })!
  assert.deepEqual(
    projected.friends.map((friend) => friend.profile.id),
    ["available", "incoming"],
  )
  assert.deepEqual(
    projected.blocked.map((friend) => friend.id),
    ["blocked", "accepted"],
  )
  assert.equal(projected.blocked[1], confirmed.friends[2]!.profile)
  assert.equal(projected.unjoined, confirmed.unjoined)
  assert.deepEqual(
    projectSharing(projected, { id: "accepted", action: "block" }),
    projected,
  )
  assert.equal(confirmed.friends.length, 3)
  assert.equal(confirmed.blocked.length, 1)
})

test("unblock removes exclusion without inventing rediscovered friends or restoring sharing", () => {
  const confirmed = snapshot()
  confirmed.friends.push({ profile: profile("blocked"), status: "blocked" })
  const projected = projectSharing(confirmed, {
    id: "blocked",
    action: "unblock",
  })!
  assert.equal(projected.blocked.length, 0)
  assert.equal(
    projected.friends.some((friend) => friend.profile.id === "blocked"),
    false,
  )
  assert.equal(confirmed.blocked.length, 1)
})

test("decline and stop-sharing remove projected access without changing unrelated relationships", () => {
  const confirmed = snapshot()
  for (const [id, action] of [
    ["incoming", "decline"],
    ["accepted", "remove"],
  ] as const) {
    const projected = projectSharing(confirmed, { id, action })!
    assert.equal(
      projected.friends.find((friend) => friend.profile.id === id)!.status,
      "none",
    )
    assert.equal(projected.blocked, confirmed.blocked)
  }
})

test("unavailable snapshots and unknown identities cannot manufacture optimistic data", () => {
  assert.equal(projectSharing(null, { id: "unknown", action: "accept" }), null)
  const confirmed = snapshot()
  assert.equal(
    projectSharing(confirmed, { id: "unknown", action: "block" }),
    confirmed,
  )
  assert.equal(
    projectSharing(confirmed, { id: "unknown", action: "accept" }),
    confirmed,
  )
})
