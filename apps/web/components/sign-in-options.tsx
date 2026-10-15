"use client"

import { useState, type FormEvent } from "react"
import { FingerprintIcon, LoaderCircleIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { authClient } from "@/lib/auth-client"
import { passkeyErrorMessage, withPasskeyCeremony } from "@/lib/passkeys"

const usernamePattern = /^[A-Za-z0-9_-]{3,24}$/

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

function signInDestination(data: unknown) {
  if (data && typeof data === "object" && "redirect" in data && data.redirect === true &&
    "url" in data && typeof data.url === "string") return data.url
  return callbackUrl()
}

export function SignInOptions() {
  const [username, setUsername] = useState("")
  const [pending, setPending] = useState<"register" | "sign-in" | null>(null)
  const [error, setError] = useState<string>()
  const normalizedUsername = username.trim()
  const validUsername = usernamePattern.test(username)

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validUsername) return
    setError(undefined)
    setPending("register")
    try {
      const result = await withPasskeyCeremony(() => authClient.passkey.addPasskey({
        context: normalizedUsername,
        createSession: true,
      }))
      if (result.error) {
        setError(
          result.error.status === 409
            ? "That username is already taken. Choose another."
            : passkeyErrorMessage(result.error, "Your account could not be created. Please try again."),
        )
        return
      }
      window.location.assign(signInDestination(result.data))
    } catch (error) {
      setError(passkeyErrorMessage(error, "Your account could not be created. Please try again."))
    } finally {
      setPending(null)
    }
  }

  async function signInWithPasskey() {
    setError(undefined)
    setPending("sign-in")
    try {
      const result = await withPasskeyCeremony(() => authClient.signIn.passkey())
      if (result.error) {
        setError(passkeyErrorMessage(result.error, "We could not sign you in. Please try again."))
        return
      }
      window.location.assign(signInDestination(result.data))
    } catch (error) {
      setError(passkeyErrorMessage(error, "We could not sign you in. Please try again."))
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={(event) => { void createAccount(event) }} className="flex flex-col gap-3">
        <Field data-disabled={pending !== null || undefined}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_\-]{3,24}"
            aria-describedby="username-help"
            disabled={pending !== null}
            required
          />
          <FieldDescription id="username-help">
            3–24 letters, numbers, underscores, or hyphens. Usernames are
            unique regardless of capitalization.
          </FieldDescription>
        </Field>
        <Button
          type="submit"
          size="lg"
          disabled={pending !== null || !validUsername}
        >
          {pending === "register" ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <FingerprintIcon />
          )}
          Create account
        </Button>
      </form>
      <Button
        type="button"
        size="lg"
        variant="outline"
        onClick={() => { void signInWithPasskey() }}
        disabled={pending !== null}
      >
        {pending === "sign-in" ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <FingerprintIcon />
        )}
        Sign in
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
