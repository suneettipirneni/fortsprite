import assert from "node:assert/strict"
import { test } from "node:test"
import { passkeyErrorMessage, withPasskeyCeremony } from "../lib/passkeys.ts"

test("a second ceremony cannot start before the first completes, and failures release it", async () => {
  let release!: () => void
  const barrier = new Promise<void>((resolve) => { release = resolve })
  const first = withPasskeyCeremony(async () => { await barrier })
  let started = false
  try {
    await assert.rejects(withPasskeyCeremony(async () => { started = true }), { code: "PASSKEY_IN_USE" })
    assert.equal(started, false)
  } finally {
    release()
    await first
  }
  await assert.rejects(withPasskeyCeremony(() => Promise.reject(new Error("cancelled"))), /cancelled/)
  assert.equal(await withPasskeyCeremony(() => Promise.resolve("retry")), "retry")
})

test("known passkey failures provide recovery guidance without exposing server messages", () => {
  assert.match(passkeyErrorMessage({ code: "CHALLENGE_NOT_FOUND" }, "fallback"), /expired or was replaced/)
  assert.match(passkeyErrorMessage({ code: "USER_VERIFICATION_REQUIRED" }, "fallback"), /fingerprint, face, or PIN/)
  assert.match(passkeyErrorMessage({ code: "PASSKEY_NOT_FOUND" }, "fallback"), /another saved passkey/)
  assert.match(passkeyErrorMessage({ status: 429 }, "fallback"), /Wait a minute/)
  assert.equal(passkeyErrorMessage({ message: "private upstream details" }, "fallback"), "fallback")
})
