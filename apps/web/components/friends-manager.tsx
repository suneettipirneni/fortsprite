"use client"

import type {
  PublicProfile,
  SharingAction,
  SharingSnapshot,
} from "@workspace/contracts"
import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { requestSharing, updateSharing } from "@/app/actions/sharing"
import { FriendRow } from "@/components/friend-row"
import { projectSharing } from "@/lib/sharing-state"

const actionMessages: Record<SharingAction, string> = {
  request: "Sharing request sent.",
  accept: "Collection sharing is now active.",
  decline: "Sharing request declined.",
  remove: "Collection sharing stopped.",
  block: "User blocked in FortSprite. Collection sharing is off.",
  unblock: "User unblocked. Collection sharing remains off.",
}

export function FriendsManager({
  snapshot,
}: {
  snapshot: SharingSnapshot | null
}) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const [pending, startSaving] = useTransition()
  const [optimisticSnapshot, applySharing] = useOptimistic(
    snapshot,
    projectSharing,
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [handle, setHandle] = useState("")
  const [notice, setNotice] = useState<{
    message: string
    error: boolean
  } | null>(null)
  const busy = saving !== null || pending || refreshing
  const search = query.trim().toLowerCase()
  const matches = (profile: { displayName: string; handle?: string }) =>
    `${profile.displayName} ${profile.handle ?? ""}`
      .toLowerCase()
      .includes(search)
  const friends =
    optimisticSnapshot?.friends.filter(
      (friend) => friend.status !== "blocked" && matches(friend.profile),
    ) ?? []
  const blocked = optimisticSnapshot?.blocked.filter(matches) ?? []

  const confirmedSharingIds = new Set(
    snapshot?.friends
      .filter((friend) => friend.status === "accepted")
      .map((friend) => friend.profile.id),
  )

  function change(profile: PublicProfile, action: SharingAction) {
    if (busy) return
    setSaving(profile.id)
    setNotice(null)
    startSaving(async () => {
      applySharing({ id: profile.id, action })
      const result = await updateSharing(profile.id, action).catch(() => ({
        ok: false,
        error: "Your sharing settings could not be saved. Please try again.",
      }))
      setNotice(
        result.ok
          ? {
              message: `${profile.displayName}. ${actionMessages[action]}`,
              error: false,
            }
          : { message: result.error, error: true },
      )
      setSaving(null)
    })
  }

  function requestFriend() {
    if (busy || !handle.trim()) return
    setSaving("request")
    setNotice(null)
    startSaving(async () => {
      const result = await requestSharing(handle.trim()).catch(() => ({
        ok: false,
        error: "The friend request could not be sent. Please try again.",
      }))
      setNotice(
        result.ok
          ? { message: `Request sent to @${handle.trim()}.`, error: false }
          : { message: result.error, error: true },
      )
      if (result.ok) {
        setHandle("")
        router.refresh()
      }
      setSaving(null)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-3 rounded-xl bg-card/60 p-4 ring-1 ring-white/10 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          requestFriend()
        }}
      >
        <Input
          aria-label="FortSprite username"
          placeholder="Exact FortSprite username"
          value={handle}
          onChange={(event) => setHandle(event.target.value.replace(/^@/, ""))}
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_-]{3,24}"
        />
        <Button type="submit" disabled={busy || !handle.trim()}>
          {saving === "request" ? "Sending…" : "Send request"}
        </Button>
      </form>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          aria-label="Search friends"
          placeholder="Search friends"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 sm:max-w-sm"
        />
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => startRefresh(() => router.refresh())}
          className="min-h-11"
        >
          {refreshing ? "Refreshing…" : "Refresh friends"}
        </Button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {notice ? (
          <p
            role={notice.error ? "alert" : "status"}
            className={
              notice.error
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {notice.message}
          </p>
        ) : null}
      </div>
      {!snapshot ? (
        <div
          className="rounded-xl border border-destructive/40 p-6"
          role="alert"
        >
          <h2 className="text-xl font-semibold">
            Friends are temporarily unavailable
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your collection is still saved. Refresh friends to try again.
          </p>
        </div>
      ) : (
        <>
          <p className="text-base text-muted-foreground sm:text-sm">
            Refreshed{" "}
            <time dateTime={snapshot.refreshedAt}>
              {new Date(snapshot.refreshedAt).toLocaleString("en-US", {
                timeZone: "UTC",
              })}
            </time>
            . Mutual FortSprite sharing is required for collection access.
          </p>
          {friends.length > 0 ? (
            <section aria-labelledby="sharing-friends">
              <h2 id="sharing-friends" className="text-xl font-semibold">
                FortSprite friends
              </h2>
              {friends.map(({ profile, status }) => (
                <FriendRow
                  key={profile.id}
                  profile={profile}
                  status={status}
                  saving={saving === profile.id}
                  busy={busy}
                  confirmedSharing={confirmedSharingIds.has(profile.id)}
                  onChange={change}
                />
              ))}
            </section>
          ) : null}
          {blocked.length > 0 ? (
            <section aria-labelledby="blocked-friends">
              <h2 id="blocked-friends" className="text-xl font-semibold">
                Blocked in FortSprite
              </h2>
              {blocked.map((profile) => (
                <FriendRow
                  key={profile.id}
                  profile={profile}
                  status="blocked"
                  saving={saving === profile.id}
                  busy={busy}
                  confirmedSharing={false}
                  onChange={change}
                />
              ))}
            </section>
          ) : null}
          {friends.length + blocked.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <h2 className="text-xl font-semibold">
                {search ? "No matching friends" : "No FortSprite friends yet"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? "Try a different name or clear your search."
                  : "Send a request using your friend's exact FortSprite username."}
              </p>
              {search ? (
                <Button
                  className="mt-4 min-h-11"
                  variant="outline"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
      <p className="border-t border-border pt-5 text-sm text-muted-foreground">
        Friend requests and blocks apply only inside FortSprite.
      </p>
    </div>
  )
}
