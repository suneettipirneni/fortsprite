import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"
import { SpritePortrait } from "@/components/sprite-portrait"
import { spriteTone } from "@/lib/catalog-presentation"
import type { CatalogResult } from "@/lib/catalog-filter"

export function CatalogResultCard({
  item,
  showAvailability,
  availabilityKnown,
  className,
}: {
  item: CatalogResult
  showAvailability: boolean
  availabilityKnown: boolean
  className?: string
}) {
  return (
    <article
      className={cn(
        "min-w-0 rounded-xl border border-border bg-card p-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <SpritePortrait
          tone={spriteTone(item.variant)}
          variant={item.variant}
          label={`${item.variant} ${item.baseName}`}
          src={item.imagePath ?? undefined}
          sizes="80px"
          className="aspect-square w-20 shrink-0"
        />
        <div className="min-w-0">
          <h3 className="break-words font-semibold">
            {item.variant} {item.baseName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.rarity}</p>
        </div>
      </div>
      {showAvailability ? (
        <div className="mt-3 border-t border-border pt-3 text-sm">
          {!availabilityKnown ? (
            <p className="text-muted-foreground">
              Friend availability unavailable
            </p>
          ) : item.helpers?.length ? (
            <ul className="space-y-2">
              {item.helpers.map((friend) => (
                <li key={friend.id}>
                  <Link
                    href={`/friends/${friend.id}`}
                    className="inline-flex min-h-11 max-w-full items-center break-all underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {friend.displayName}
                  </Link>
                  {friend.fortniteDisplayName ? (
                    <p className="break-words text-xs text-muted-foreground">
                      Fortnite name (user-provided) ·{" "}
                      {friend.fortniteDisplayName}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              No sharing friend has captured this Sprite yet.
            </p>
          )}
        </div>
      ) : null}
    </article>
  )
}
