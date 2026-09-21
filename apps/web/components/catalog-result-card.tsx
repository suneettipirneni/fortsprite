import { cn } from "@workspace/ui/lib/utils"
import { FriendHelperList } from "@/components/friend-helper-list"
import { SpritePortrait } from "@/components/sprite-portrait"
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
        "min-w-0 rounded-xl bg-card/72 p-3 shadow-sm ring-1 ring-white/10",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <SpritePortrait
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
        <div className="mt-3 border-t border-white/10 pt-3 text-sm">
          {!availabilityKnown ? (
            <p className="text-muted-foreground">
              Friend availability unavailable
            </p>
          ) : item.helpers?.length ? (
            <FriendHelperList friends={item.helpers} />
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
