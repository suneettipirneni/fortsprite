"use client"

import type { CredentialSummary } from "@workspace/contracts"
import { FingerprintIcon, LoaderCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { authClient } from "@/lib/auth-client"

export function CredentialManager({
  credentials,
}: {
  credentials: CredentialSummary[]
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState<{
    message: string
    error: boolean
  } | null>(null)
  const passkeys = credentials

  function finish(message: string) {
    setNotice({ message, error: false })
    setPending(null)
    router.refresh()
  }

  function fail(message: string) {
    setNotice({ message, error: true })
    setPending(null)
  }

  async function addPasskey() {
    setNotice(null)
    setPending("add-passkey")
    try {
      const result = await authClient.passkey.addPasskey({
        name: name.trim() || undefined,
      })
      if (result.error) {
        fail("The passkey could not be added. Please try again.")
        return
      }
      setName("")
      finish("Passkey added.")
    } catch {
      fail("The passkey could not be added. Please try again.")
    }
  }

  async function removePasskey(id: string) {
    setNotice(null)
    setPending(id)
    try {
      const result = await authClient.passkey.deletePasskey({ id })
      if (result.error) {
        fail("The passkey could not be removed.")
        return
      }
      finish("Passkey removed.")
    } catch {
      fail("The passkey could not be removed.")
    }
  }

  return (
    <section aria-labelledby="sign-in-methods" className="space-y-5 border-t border-border pt-6">
      <div>
        <h2 id="sign-in-methods" className="text-xl font-semibold">
          Sign-in methods
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          FortSprite uses passkeys only. Add a second passkey on another device
          or password manager so you can still sign in if one is lost.
        </p>
      </div>
      <div className="space-y-3">
        <h3 className="font-medium">Passkeys</h3>
        {passkeys.length ? (
          <div className="divide-y divide-border rounded-xl border border-border">
            {passkeys.map((credential) => (
              <div key={credential.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FingerprintIcon className="size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {credential.name || "Passkey"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {credential.backedUp ? "Synced passkey" : "Device passkey"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  disabled={pending !== null || passkeys.length === 1}
                  aria-label={`Remove passkey ${credential.name || "Passkey"}`}
                  onClick={() => removePasskey(credential.id)}
                >
                  {pending === credential.id ? <LoaderCircleIcon className="animate-spin" /> : null}
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No passkeys added yet.</p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="Passkey name, optional"
            aria-label="Passkey name"
          />
          <Button disabled={pending !== null} onClick={addPasskey}>
            {pending === "add-passkey" ? <LoaderCircleIcon className="animate-spin" /> : <FingerprintIcon />}
            Add passkey
          </Button>
        </div>
      </div>
      {notice ? (
        <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {notice.message}
        </p>
      ) : null}
      <p className="text-xs leading-5 text-muted-foreground">
        FortSprite cannot recover your account if every passkey is lost. The
        final passkey can only be removed by deleting the account.
      </p>
    </section>
  )
}
