"use client"

import { useState } from "react"
import { LogOutIcon } from "lucide-react"

import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu"
import { authClient } from "@/lib/auth-client"

export function SignOutMenuItem() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signOut() {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const result = await authClient.signOut()
      if (result.error) throw new Error("Sign-out failed")
      // Discard cached private pages after the session ends.
      window.location.assign(new URL("/sign-in", window.location.origin).href)
    } catch {
      setError("Sign out could not be completed. Please try again.")
      setPending(false)
    }
  }

  return (
    <>
      <DropdownMenuItem
        disabled={pending}
        onSelect={(event) => {
          event.preventDefault()
          void signOut()
        }}
      >
        <LogOutIcon />
        {pending ? "Signing out…" : "Sign out"}
      </DropdownMenuItem>
      {error ? (
        <DropdownMenuLabel className="whitespace-normal text-destructive">
          <span role="alert">{error}</span>
        </DropdownMenuLabel>
      ) : null}
    </>
  )
}
