import { Trophy } from "lucide-react"
import type { FriendComparison } from "@workspace/contracts"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

const percentFormat = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
})

export function ComparisonScoreboard({ friendName = "Your friend", progress }: {
  friendName?: string
  progress?: FriendComparison["progress"]
}) {
  const lead = progress ? progress.viewerOwned - progress.friendOwned : 0
  const players = [
    { id: "viewer", label: "You", owned: progress?.viewerOwned, leading: lead > 0 },
    { id: "friend", label: friendName, owned: progress?.friendOwned, leading: lead < 0 },
  ]

  return (
    <section aria-labelledby="comparison-progress-heading" aria-busy={!progress}>
      <h2 id="comparison-progress-heading" className="sr-only">Friendly rivalry</h2>
      <p className="text-xs text-muted-foreground">Current-season completion</p>
      <div className="mt-2">
        <dl className="grid grid-cols-2 gap-x-6 sm:gap-x-8">
          {players.map(({ id, label, owned, leading }, index) => {
            const percent = progress?.total ? ((owned ?? 0) / progress.total) * 100 : 0
            return (
              <div key={id} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="min-w-0 truncate" title={label}>{label}</span>
                  {leading ? <Trophy aria-label="In the lead" className="size-3 shrink-0 text-amber-300" /> : null}
                </dt>
                <dd className="mt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {progress ? (
                      <span className={cn("text-xl font-semibold tracking-tight tabular-nums", leading && "text-primary")}>{percentFormat.format(percent / 100)}</span>
                    ) : <Skeleton aria-label={`Loading ${label.toLowerCase()} completion`} className="h-7 w-14" />}
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {progress ? `${owned} of ${progress.total} captured` : <Skeleton className="h-4 w-24 max-w-full" />}
                    </div>
                  </div>
                  {progress ? (
                    <Progress value={percent} aria-label={index === 0 ? "Your collection completion" : `${label}'s collection completion`} className="mt-1.5 h-1" />
                  ) : <Skeleton className="mt-1.5 h-1 w-full rounded-full" />}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}
