import type {
  PublicProfile,
  SharingAction,
  SharingSnapshot,
} from "@workspace/contracts"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export type SharingStatus = SharingSnapshot["friends"][number]["status"]
const statusLabels: Record<SharingStatus, string> = {
  none: "Not sharing",
  incoming: "Wants to share",
  outgoing: "Request sent",
  accepted: "Sharing collections",
  blocked: "Blocked in FortSprite",
}
const statusActions: Record<
  SharingStatus,
  { action: SharingAction; label: string }[]
> = {
  none: [
    { action: "request", label: "Share collections" },
    { action: "block", label: "Block" },
  ],
  incoming: [
    { action: "accept", label: "Accept" },
    { action: "decline", label: "Decline" },
    { action: "block", label: "Block" },
  ],
  outgoing: [
    { action: "remove", label: "Cancel request" },
    { action: "block", label: "Block" },
  ],
  accepted: [
    { action: "remove", label: "Stop sharing" },
    { action: "block", label: "Block" },
  ],
  blocked: [{ action: "unblock", label: "Unblock" }],
}
export function FriendRow({
  profile,
  status,
  saving,
  busy,
  confirmedSharing,
  onChange,
  className,
}: {
  profile: PublicProfile
  status: SharingStatus
  saving: boolean
  busy: boolean
  confirmedSharing: boolean
  onChange: (profile: PublicProfile, action: SharingAction) => void
  className?: string
}) {
  return (
    <article
      aria-busy={saving}
      className={cn(
        "flex min-w-0 flex-col gap-4 border-b border-border py-5 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback>{profile.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{profile.displayName}</h3>
          <p className="truncate text-sm text-muted-foreground">
            @{profile.handle}
          </p>
          <Badge variant="outline" className="mt-1">
            {statusLabels[status]}
          </Badge>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {status === "accepted" ? (
          confirmedSharing && !busy ? (
            <Button asChild className="min-h-11">
              <Link href={`/friends/${profile.id}`}>Compare</Link>
            </Button>
          ) : (
            <Button disabled className="min-h-11">
              Compare
            </Button>
          )
        ) : null}
        {statusActions[status].map(({ action, label }) => (
          <Button
            key={action}
            variant={
              action === "accept" || action === "request"
                ? "default"
                : "outline"
            }
            className="min-h-11"
            disabled={busy}
            aria-label={`${label} with ${profile.displayName}`}
            onClick={() => onChange(profile, action)}
          >
            {saving ? "Saving…" : label}
          </Button>
        ))}
      </div>
    </article>
  )
}
