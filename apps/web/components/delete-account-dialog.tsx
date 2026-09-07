"use client"

import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { deleteProfile } from "@/lib/client-api"

export function DeleteAccountDialog({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteAccount() {
    if (pending || confirmation !== handle) return
    setPending(true)
    setError(null)
    try {
      await deleteProfile(confirmation)
      // A full navigation discards cached private data after account deletion.
      window.location.assign(new URL("/sign-in", window.location.origin).href)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your account could not be deleted. Please try again.",
      )
      setPending(false)
    }
  }

  return (
    <section
      aria-labelledby="delete-account-heading"
      className="space-y-3 border-t border-border pt-6"
    >
      <h2 id="delete-account-heading" className="text-xl font-semibold">
        Delete your FortSprite account
      </h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Permanently delete your FortSprite profile, collection, sharing
        relationships, and sign-in sessions. Your Epic Games account and
        Fortnite progress remain unchanged.
      </p>
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (pending) return
          setOpen(nextOpen)
          setConfirmation("")
          setError(null)
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="min-h-11">
            Delete FortSprite account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your FortSprite account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your FortSprite data and cannot be
              undone. It does not delete or change your Epic Games account or
              Fortnite progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="delete-account-confirmation">
              Type your handle to confirm
            </FieldLabel>
            <Input
              id="delete-account-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={24}
              disabled={pending}
              aria-describedby="delete-account-handle"
              className="h-11"
            />
            <FieldDescription id="delete-account-handle">
              Enter{" "}
              <strong className="font-semibold text-foreground">
                {handle}
              </strong>{" "}
              exactly.
            </FieldDescription>
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending} className="min-h-11">
              Keep my account
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="min-h-11"
              disabled={pending || confirmation !== handle}
              onClick={(event) => {
                event.preventDefault()
                void deleteAccount()
              }}
            >
              {pending ? "Deleting…" : "Delete FortSprite account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
