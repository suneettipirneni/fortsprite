"use client"

import { useState } from "react"
import { FingerprintIcon, LoaderCircleIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { authClient } from "@/lib/auth-client"

function callbackUrl() {
  const requested = new URLSearchParams(window.location.search).get(
    "callbackUrl",
  )
  const callback = new URL(
    requested?.startsWith("/") ? requested : "/",
    window.location.origin,
  )
  return callback.origin === window.location.origin
    ? callback.toString()
    : `${window.location.origin}/`
}

export function SignInOptions() {
  const [pending, setPending] = useState<"register" | "sign-in" | null>(null)
  const [error, setError] = useState<string>()

  async function createAccount() {
    setError(undefined)
    setPending("register")
    try {
      const result = await authClient.passkey.addPasskey({
        name: "Primary passkey",
        createSession: true,
      })
      if (result.error) {
        setError("Your passkey could not be created. Please try again.")
        return
      }
      window.location.assign(callbackUrl())
    } catch {
      setError("Your passkey could not be created. Please try again.")
    } finally {
      setPending(null)
    }
  }

  async function signInWithPasskey() {
    setError(undefined)
    setPending("sign-in")
    try {
      const result = await authClient.signIn.passkey()
      if (result.error) {
        setError("That passkey could not sign you in. Please try again.")
        return
      }
      window.location.assign(callbackUrl())
    } catch {
      setError("That passkey could not sign you in. Please try again.")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        size="lg"
        onClick={createAccount}
        disabled={pending !== null}
      >
        {pending === "register" ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <FingerprintIcon />
        )}
        Create account with a passkey
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={signInWithPasskey}
        disabled={pending !== null}
      >
        {pending === "sign-in" ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <FingerprintIcon />
        )}
        Sign in with a passkey
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
