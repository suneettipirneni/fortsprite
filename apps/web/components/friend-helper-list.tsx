import Link from "next/link"
import { CrownIcon } from "lucide-react"
import type { SpriteHelper } from "@workspace/contracts"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"

export function FriendHelperList({
  friends,
  className,
}: {
  friends: SpriteHelper[]
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="font-medium">Friends who can help</p>
      <ul className="grid gap-2">
        {friends.map((friend) => (
          <li key={friend.id}>
            <Link
              href={`/friends/${friend.id}`}
              transitionTypes={["page-navigation"]}
              className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-border bg-background/45 p-2.5 outline-none transition-colors hover:bg-accent/45 focus-visible:ring-3 focus-visible:ring-ring/50"
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
              {friend.mastered ? (
                <Badge variant="mastered">
                  <CrownIcon aria-hidden="true" data-icon="inline-start" />
                  Mastered
                </Badge>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
