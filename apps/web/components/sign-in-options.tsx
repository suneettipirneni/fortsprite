"use client"

import { useState } from "react"
import { FingerprintIcon, LoaderCircleIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { authClient } from "@/lib/auth-client"

type Provider = "apple" | "google"

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
  const [pending, setPending] = useState<Provider | "passkey" | null>(null)
  const [error, setError] = useState<string>()

  async function signInWith(provider: Provider) {
    setError(undefined)
    setPending(provider)
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: callbackUrl(),
        errorCallbackURL: `${window.location.origin}/sign-in?error=auth`,
      })
      if (result.error)
        setError(`${provider === "apple" ? "Apple" : "Google"} sign-in could not be started.`)
    } catch {
      setError("Sign-in could not be started. Please try again.")
    } finally {
      setPending(null)
    }
  }

  async function signInWithPasskey() {
    setError(undefined)
    setPending("passkey")
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
        onClick={() => signInWith("apple")}
        disabled={pending !== null}
      >
        {pending === "apple" ? <LoaderCircleIcon className="animate-spin" /> : null}
        Continue with Apple
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => signInWith("google")}
        disabled={pending !== null}
      >
        {pending === "google" ? <LoaderCircleIcon className="animate-spin" /> : null}
        Continue with Google
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={signInWithPasskey}
        disabled={pending !== null}
      >
        {pending === "passkey" ? (
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
