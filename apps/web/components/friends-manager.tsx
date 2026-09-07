"use client"

import type {
  PublicProfile,
  SharingAction,
  SharingSnapshot,
} from "@workspace/contracts"
import { useOptimistic, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { updateSharing } from "@/app/actions/sharing"
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
  const unjoined = optimisticSnapshot?.unjoined.filter(matches) ?? []
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

  return (
    <div className="space-y-6">
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
            Your collection is still saved. Refresh friends to try again. If
            Friends permission was not approved, sign out and reconnect Epic
            Games.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Refreshed{" "}
            <time dateTime={snapshot.refreshedAt}>
              {new Date(snapshot.refreshedAt).toLocaleString("en-US", {
                timeZone: "UTC",
              })}
            </time>
            . Epic friendship and mutual sharing are required for collection
            access.
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
          {unjoined.length > 0 ? (
            <section aria-labelledby="unjoined-friends">
              <h2 id="unjoined-friends" className="text-xl font-semibold">
                Other Epic friends
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These friends have no available FortSprite collection to share.
              </p>
              <div className="mt-3 divide-y divide-border">
                {unjoined.map((friend, index) => (
                  <div
                    key={`${friend.displayName}-${index}`}
                    className="flex items-center gap-3 py-4"
                  >
                    <Avatar>
                      <AvatarFallback>{friend.initials}</AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 truncate">{friend.displayName}</p>
                  </div>
                ))}
              </div>
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
          {friends.length + unjoined.length + blocked.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <h2 className="text-xl font-semibold">
                {search ? "No matching friends" : "No visible friends yet"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? "Try a different name or clear your search."
                  : "Epic only shows friends who granted this app Basic Profile consent. Share collections after your friends join FortSprite."}
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
        These controls change FortSprite collection sharing only. Manage Epic
        friendships and Epic blocks in your Epic Games account or Fortnite.
      </p>
    </div>
  )
}
