"use client"

import type { ProfileUpdate, Viewer } from "@workspace/contracts"
import { useActionState, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { saveProfile } from "@/app/actions/profile"
import type { ActionResult } from "@/lib/action-result"

export function ProfileEditor({ viewer }: { viewer: Viewer }) {
  const [draft, setDraft] = useState({
    handle: viewer.handle,
    displayName: viewer.displayName,
    fortniteDisplayName: viewer.fortniteDisplayName ?? "",
  })
  const [result, formAction, pending] = useActionState<
    ActionResult<{ profile: ProfileUpdate }> | null,
    FormData
  >(async (_previous, data) => {
    const profile = {
      handle: String(data.get("handle") ?? "").trim(),
      displayName: String(data.get("displayName") ?? "").trim(),
      fortniteDisplayName:
        String(data.get("fortniteDisplayName") ?? "").trim() || null,
    }
    try {
      return await saveProfile(profile)
    } catch {
      return {
        ok: false,
        error:
          "The connection was interrupted. Check your connection and try again.",
      }
    }
  }, null)

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <fieldset disabled={pending}>
        <legend className="sr-only">Edit your FortSprite profile</legend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="display-name">
              FortSprite display name
            </FieldLabel>
            <Input
              id="display-name"
              name="displayName"
              autoComplete="nickname"
              value={draft.displayName}
              onChange={(event) =>
                setDraft({ ...draft, displayName: event.target.value })
              }
              required
              maxLength={60}
              aria-describedby="display-name-help"
              className="h-11"
            />
            <FieldDescription id="display-name-help">
              The name your sharing friends see. Up to 60 characters.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="handle">FortSprite handle</FieldLabel>
            <Input
              id="handle"
              name="handle"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={draft.handle}
              onChange={(event) =>
                setDraft({ ...draft, handle: event.target.value })
              }
              required
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_\-]+"
              aria-describedby="handle-help"
              className="h-11"
            />
            <FieldDescription id="handle-help">
              3–24 letters, numbers, underscores or hyphens. Handles are unique
              regardless of capitalization.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="fortnite-name">
              Fortnite display name (optional)
            </FieldLabel>
            <Input
              id="fortnite-name"
              name="fortniteDisplayName"
              value={draft.fortniteDisplayName}
              onChange={(event) =>
                setDraft({ ...draft, fortniteDisplayName: event.target.value })
              }
              maxLength={60}
              aria-describedby="fortnite-name-help"
              className="h-11"
            />
            <FieldDescription id="fortnite-name-help">
              Shared with accepted friends so you can coordinate in Fortnite.
              This name is user-provided.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </fieldset>
      <Button type="submit" className="min-h-11" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
      {result && !pending ? (
        <p
          role={!result.ok ? "alert" : "status"}
          className={
            !result.ok
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {result.ok ? "Your profile has been saved." : result.error}
        </p>
      ) : null}
    </form>
  )
}
