import Link from "next/link"
import { ArrowUpRightIcon } from "lucide-react"
import type { PublicProfile } from "@workspace/contracts"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

export function FriendHelperList({
  friends,
  className,
}: {
  friends: PublicProfile[]
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Friends who can help</p>
        <Badge variant="outline" className="tabular-nums">
          {friends.length}
        </Badge>
      </div>
      <ul className="grid gap-2">
        {friends.map((friend) => (
          <li key={friend.id}>
            <Link
              href={`/friends/${friend.id}`}
              className="group flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-border bg-background/45 p-2.5 outline-none transition-colors hover:bg-accent/45 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback>{friend.initials}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {friend.displayName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{friend.handle}
                </span>
                {friend.fortniteDisplayName ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    Fortnite (user-provided) · {friend.fortniteDisplayName}
                  </span>
                ) : null}
              </span>
              <ArrowUpRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
