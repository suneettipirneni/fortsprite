"use client"

import { useState } from "react"
import { ArrowRightIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { authClient } from "@/lib/auth-client"

export function EpicSignInButton() {
  const [error, setError] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  async function signIn() {
    setError(undefined)
    setIsPending(true)

    const requestedCallback = new URLSearchParams(window.location.search).get(
      "callbackUrl",
    )
    const callback = new URL(
      requestedCallback?.startsWith("/") ? requestedCallback : "/",
      window.location.origin,
    )
    const callbackURL =
      callback.origin === window.location.origin
        ? callback.toString()
        : `${window.location.origin}/`

    try {
      const result = await authClient.signIn.oauth2({
        providerId: "epic-games",
        callbackURL,
        errorCallbackURL: `${window.location.origin}/sign-in?error=oauth`,
      })

      if (!result.error) {
        return
      }

      setError("Epic Games sign-in could not be started. Please try again.")
    } catch {
      setError("Epic Games sign-in could not be started. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" onClick={signIn} disabled={isPending}>
        {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
        Continue with Epic Games
        {!isPending ? <ArrowRightIcon data-icon="inline-end" /> : null}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
