"use client"

import { CheckIcon, CircleIcon, CrownIcon, FlaskRoundIcon } from "lucide-react"
import type { CatalogItem } from "@workspace/contracts"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { Toggle } from "@workspace/ui/components/toggle"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@workspace/ui/components/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerTitle } from "@workspace/ui/components/drawer"
import { SpriteTracking, TrackingSkeleton, useCollectionControls, useSpritePending } from "@/components/collection-tracking"
import { FriendHelperList } from "@/components/friend-helper-list"
import { SpritePortrait } from "@/components/sprite-portrait"
import { SpriteRarityBadge } from "@/components/sprite-rarity-badge"
import type { CollectionNotice, SpriteDetailsOverlayProps } from "@/components/collection-sprite-tile"
import type { CollectionChange } from "@/lib/collection-state"
import { spriteAbilities } from "@/lib/sprite-abilities"
import { variantStyle } from "@/lib/variant-style"

const dustFormatter = new Intl.NumberFormat("en-US")
const verifiedDateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })
const collectionToggleClassName =
  "h-12 w-full justify-start gap-2 rounded-lg border-white/12 px-3 text-base font-medium text-foreground/75 hover:border-white/24 hover:bg-white/5 hover:text-foreground disabled:text-foreground/50 disabled:opacity-100 sm:h-10 sm:text-sm"

export function SpriteDetailsOverlay({
  selection,
  dialogOpen,
  setDialogOpen,
  onClosed,
  availabilityKnown,
  currentSeasonId,
  onRemovedFocus,
  onChange: changeSprite,
}: SpriteDetailsOverlayProps) {
  const { notice: collectionNotice } = useCollectionControls()
  const { sprite, mobile: isMobile, trigger } = selection
  const pending = useSpritePending(sprite.id)
  const notice = collectionNotice?.spriteId === sprite.id ? collectionNotice : null
  const helpEligible = currentSeasonId !== null && sprite.sourceSeasonId === currentSeasonId
  const onChange = (change: CollectionChange) => {
    const { leavesFilter } = changeSprite(sprite, change)
    if (leavesFilter) setDialogOpen(false)
  }
  const restoreTriggerFocus = (event: Event) => {
    event.preventDefault()
    if (trigger.isConnected) trigger.focus()
    else onRemovedFocus()
    onClosed()
  }

  return (
    <>
      {isMobile ? (
        <Drawer open={dialogOpen} onOpenChange={setDialogOpen}>
          <DrawerContent
            aria-busy={pending}
            onCloseAutoFocus={restoreTriggerFocus}
            className="overflow-hidden data-[vaul-drawer-direction=bottom]:max-h-[92dvh]"
          >
            <DrawerTitle className="sr-only">
              {sprite.variant} {sprite.baseName}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Sprite details and collection controls.
            </DrawerDescription>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              <SpriteDetails
                sprite={sprite}
                pending={pending}
                availabilityKnown={availabilityKnown}
                helpEligible={helpEligible}
                notice={notice}
                onChange={onChange}
              />
            </div>
            <DrawerFooter className="shrink-0 border-t border-white/10 bg-popover px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Done
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            aria-busy={pending}
            onCloseAutoFocus={restoreTriggerFocus}
            className="grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
          >
            <DialogTitle className="sr-only">
              {sprite.variant} {sprite.baseName}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Sprite details and collection controls.
            </DialogDescription>
            <div className="min-h-0 overflow-y-auto overscroll-contain">
              <SpriteDetails
                sprite={sprite}
                pending={pending}
                availabilityKnown={availabilityKnown}
                helpEligible={helpEligible}
                notice={notice}
                onChange={onChange}
              />
            </div>
            <DialogFooter className="m-0 shrink-0 rounded-none px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function SpriteDetails({
  sprite,
  pending,
  availabilityKnown,
  helpEligible,
  notice,
  onChange,
}: {
  sprite: CatalogItem
  pending: boolean
  availabilityKnown: boolean
  helpEligible: boolean
  notice: CollectionNotice | null
  onChange: (change: CollectionChange) => void
}) {
  const { variantAbility, baseAbilities } = spriteAbilities(sprite)
  return (
    <>
      <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 border-b border-white/10 bg-muted/25 p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6 sm:p-6">
        <div className="relative shrink-0 overflow-hidden rounded-[min(2vw,var(--radius-xl))] bg-background/35 outline-1 -outline-offset-1 outline-white/10">
          <SpritePortrait
            variant={sprite.variant}
            label={`${sprite.variant} ${sprite.baseName}`}
            src={sprite.imagePath ?? undefined}
            sizes="(min-width: 640px) 160px, 104px"
            className="aspect-square w-full rounded-none"
          />
          <SpriteTracking spriteId={sprite.id} fallback={null}>
                  {({ sprite }) => (
                    <>
                      {sprite.mastered ? (
                        <span className="pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-mastered text-mastered-foreground shadow-sm ring-1 ring-mastered">
                          <CrownIcon aria-hidden="true" className="size-3" />
                        </span>
                      ) : null}
                    </>
                  )}
                </SpriteTracking>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2.5 py-1 sm:py-2 lg:pr-10">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <SpriteRarityBadge rarity={sprite.rarity} />
            <SpriteTracking spriteId={sprite.id} fallback={<TrackingSkeleton className="h-6 w-24" />}>
              {({ sprite }) => (
                <>
                  <Badge
                    variant={sprite.owned ? "captured" : "outline"}
                    className={!sprite.owned ? "bg-background/35" : undefined}
                  >
                    {sprite.owned ? (
                      <CheckIcon aria-hidden="true" data-icon="inline-start" />
                    ) : (
                      <CircleIcon aria-hidden="true" data-icon="inline-start" />
                    )}
                    {sprite.owned ? "Captured" : "Missing"}
                  </Badge>
                  {sprite.mastered ? (
                    <Badge variant="mastered">
                      <CrownIcon aria-hidden="true" data-icon="inline-start" />
                      Mastered
                    </Badge>
                  ) : null}
                </>
              )}
            </SpriteTracking>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {sprite.baseName}
            </h2>
            <p className="truncate text-base text-foreground/65">
              {sprite.variant}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 sm:p-6">
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-inset ring-white/10">
          <div className="order-1 min-w-0 p-4">
            <dt className="flex items-center gap-1 text-sm font-medium text-muted-foreground sm:text-xs">
              <FlaskRoundIcon aria-hidden="true" className="size-3.5 shrink-0" />
              Resummon cost
            </dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular-nums sm:text-base">
              {sprite.spriteDustValue === null
                ? "—"
                : dustFormatter.format(sprite.spriteDustValue)}
            </dd>
          </div>
          <div className="order-2 min-w-0 border-l border-white/10 p-4">
            <dt className="text-sm font-medium text-muted-foreground sm:text-xs">
              Friends
            </dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular-nums sm:text-base">
              <SpriteTracking spriteId={sprite.id}>
                {({ sprite }) => (
                  <>
                    {!availabilityKnown
                      ? "—"
                      : helpEligible
                        ? sprite.helpers.length
                        : "N/A"}
                  </>
                )}
              </SpriteTracking>
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
          <section className="flex flex-col gap-3 rounded-xl bg-muted/25 p-5 ring-1 ring-inset ring-white/10 sm:p-4">
            {variantAbility ? (
              <div
                data-slot="variant-ability"
                className="flex flex-col gap-3 rounded-lg p-4 text-white ring-1 ring-inset ring-white/15"
                style={variantStyle(sprite.variant).frame}
              >
                <h3 className="font-semibold">{sprite.variant}</h3>
                <p className="text-pretty text-white/90">{variantAbility.description}</p>
              </div>
            ) : null}
            <h3 className="font-semibold">{sprite.baseName} abilities</h3>
            {baseAbilities.length > 0 ? baseAbilities.map((ability) => (
              <p key={ability} className="text-pretty text-foreground/80">{ability}</p>
            )) : (
              <p className="text-pretty text-muted-foreground">No base ability description is available for this Sprite.</p>
            )}
            {sprite.levelProgression ? (
              <p className="text-pretty text-muted-foreground">
                {sprite.levelProgression}
              </p>
            ) : null}
            <Separator />
            <div className="flex flex-col gap-1 text-base text-muted-foreground sm:text-sm">
              {sprite.location ? (
                <p className="text-pretty">Found at {sprite.location}.</p>
              ) : null}
              <p>
                Source checked{" "}
                <a
                  href={sprite.sourcePage}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {verifiedDateFormatter.format(
                    new Date(sprite.sourceVerifiedAt),
                  )}
                </a>
                .
              </p>
              {sprite.spriteDustSource ? (
                <p>
                  Resummon costs: {" "}
                  <a
                    href={sprite.spriteDustSource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {sprite.spriteDustSource.name}
                  </a>
                  {" "}· checked {verifiedDateFormatter.format(new Date(sprite.spriteDustSource.verifiedAt))}.
                </p>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-background/35 p-5 ring-1 ring-inset ring-white/10 sm:p-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">Your collection</h3>
              <p className="text-base text-muted-foreground sm:text-xs">
                Update this Sprite without leaving the details view.
              </p>
            </div>
            {pending ? (
              <p
                role="status"
                className="text-base text-muted-foreground sm:text-sm"
              >
                Saving changes…
              </p>
            ) : null}
            <SpriteTracking spriteId={sprite.id} onChange={onChange} fallback={<>
              <TrackingSkeleton className="h-12 w-full rounded-lg sm:h-10" />
              <TrackingSkeleton className="h-12 w-full rounded-lg sm:h-10" />
            </>}>
              {({ sprite, onChange }) => (
                <>
                  <Toggle
                    variant="captured"
                    aria-label={`Captured ${sprite.variant} ${sprite.baseName}`}
                    pressed={sprite.owned}
                    onPressedChange={(checked) =>
                      onChange({ field: "owned", checked })
                    }
                    className={collectionToggleClassName}
                  >
                    {sprite.owned ? (
                      <CheckIcon aria-hidden="true" />
                    ) : (
                      <CircleIcon aria-hidden="true" />
                    )}
                    Captured
                  </Toggle>
                  <Toggle
                    variant="mastered"
                    aria-label={`Mastered ${sprite.variant} ${sprite.baseName}`}
                    aria-describedby={
                      !sprite.owned ? `dialog-hint-${sprite.id}` : undefined
                    }
                    pressed={sprite.mastered}
                    disabled={!sprite.owned}
                    aria-disabled={!sprite.owned}
                    onPressedChange={(checked) =>
                      onChange({ field: "mastered", checked })
                    }
                    className={collectionToggleClassName}
                  >
                    <CrownIcon aria-hidden="true" />
                    Mastered
                  </Toggle>
                  {!sprite.owned ? (
                    <p
                      id={`dialog-hint-${sprite.id}`}
                      className="text-base text-muted-foreground sm:text-xs"
                    >
                      Capture first to mark mastery.
                    </p>
                  ) : null}
                </>
              )}
            </SpriteTracking>
            <p className="text-base text-muted-foreground sm:mt-auto sm:text-xs">
              {helpEligible
                ? "Current-season captures can help accepted friends."
                : "Older-season captures are tracked but cannot help friends."}
            </p>
          </section>
        </div>

        {availabilityKnown && helpEligible ? (
          <SpriteTracking spriteId={sprite.id} fallback={<TrackingSkeleton className="h-5 w-44" />}>
            {({ sprite }) => (
              <>
                {availabilityKnown && helpEligible && sprite.helpers.length > 0 ? (
                  <FriendHelperList friends={sprite.helpers} />
                ) : null}
              </>
            )}
          </SpriteTracking>
        ) : null}

        {notice ? (
          <p role="alert" className="text-sm text-destructive">
            {notice.message}
          </p>
        ) : null}
      </div>
    </>
  )
}
