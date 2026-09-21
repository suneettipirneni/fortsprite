"use client"

import { useRef, useState } from "react"
import { CheckIcon, CircleIcon, CrownIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "@workspace/ui/components/drawer"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@workspace/ui/components/hover-card"
import { Toggle } from "@workspace/ui/components/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"

import type { CollectionChange } from "@/lib/collection-state"
import type { Sprite } from "@/lib/catalog-presentation"
import { FriendHelperList } from "@/components/friend-helper-list"
import { SpritePortrait } from "@/components/sprite-portrait"
import { SpriteRarityBadge } from "@/components/sprite-rarity-badge"

export type CollectionNotice = { spriteId: string; message: string }

const dustFormatter = new Intl.NumberFormat("en-US")
const verifiedDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

const collectionToggleClassName =
  "h-12 w-full justify-start gap-2 rounded-lg border-white/12 px-3 text-base font-medium text-foreground/75 hover:border-white/24 hover:bg-white/5 hover:text-foreground disabled:text-foreground/50 disabled:opacity-100 sm:h-10 sm:text-sm"

const quickToggleClassName =
  "h-11 w-full min-w-0 rounded-lg border-white/12 px-2 text-foreground/65 hover:border-white/24 hover:bg-white/5 hover:text-foreground disabled:text-foreground/35 disabled:opacity-100 focus-visible:ring-inset sm:h-9"

export function SpriteTile({
  sprite,
  view = "grid",
  onChange,
  pending,
  notice,
  onRemovedFocus,
  availabilityKnown,
  currentSeasonId,
}: {
  sprite: Sprite
  view?: "list" | "grid"
  pending: boolean
  availabilityKnown: boolean
  currentSeasonId: number | null
  notice: CollectionNotice | null
  onRemovedFocus: () => void
  onChange: (change: CollectionChange) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isMobile = useIsMobile()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const helpEligible =
    currentSeasonId !== null && sprite.sourceSeasonId === currentSeasonId
  const helperLabel = !availabilityKnown
    ? "Friend availability unavailable"
    : !helpEligible
      ? "Not eligible for friend help outside the current season"
      : sprite.helpers.length === 1
        ? "1 friend with this Sprite"
        : `${sprite.helpers.length} friends with this Sprite`
  const restoreTriggerFocus = (event: Event) => {
    event.preventDefault()
    if (triggerRef.current?.isConnected) triggerRef.current.focus()
    else onRemovedFocus()
  }

  return (
    <>
      <HoverCard
        open={!dialogOpen && previewOpen}
        onOpenChange={setPreviewOpen}
      >
        <article
          className={cn(
            "flex min-w-0 overflow-hidden rounded-xl bg-card/76 shadow-sm ring-1 ring-inset ring-white/10 backdrop-blur-sm",
            view === "list" ? "flex-row items-center" : "flex-col",
          )}
          data-sprite-id={sprite.id}
          data-mastered={sprite.mastered || undefined}
          aria-busy={pending}
        >
          <HoverCardTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              data-sprite-variant={sprite.variant}
              onFocus={() => setPreviewOpen(true)}
              onBlur={() => setPreviewOpen(false)}
              onClick={() => {
                setPreviewOpen(false)
                setDialogOpen(true)
              }}
              aria-label={`Open ${sprite.variant} ${sprite.baseName} details. ${sprite.rarity} rarity, ${sprite.owned ? "captured" : "missing"}, ${sprite.mastered ? "mastered" : "not mastered"}, ${helperLabel}.`}
              className={cn(
                "group w-full min-w-0 overflow-hidden text-left outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring",
                view === "list" ? "flex flex-1 items-center" : "block",
              )}
            >
              <div
                className={cn(
                  "relative shrink-0",
                  view === "list" ? "w-16 sm:w-20" : "w-full",
                )}
              >
                <SpritePortrait
                  variant={sprite.variant}
                  label={`${sprite.variant} ${sprite.baseName}`}
                  src={sprite.imagePath ?? undefined}
                  className={
                    view === "list"
                      ? "aspect-square w-full rounded-none"
                      : "aspect-[4/3] w-full rounded-none"
                  }
                  sizes={view === "list" ? "80px" : undefined}
                />
                {sprite.mastered ? (
                  <span
                    data-testid="mastered-crown"
                    className="pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-mastered text-mastered-foreground shadow-sm ring-1 ring-mastered"
                  >
                    <CrownIcon aria-hidden="true" className="size-3" />
                  </span>
                ) : null}
              </div>
              <div
                className={cn(
                  "min-w-0 p-2 sm:p-3",
                  view === "grid" && "border-t border-white/10",
                  view === "list" && "flex-1",
                )}
              >
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                  <h3
                    className={cn(
                      "min-w-0 flex-1 truncate font-semibold",
                      view === "grid" ? "text-sm" : "text-base sm:text-sm",
                    )}
                  >
                    {sprite.baseName}
                  </h3>
                  <SpriteRarityBadge
                    rarity={sprite.rarity}
                    className="shrink-0 px-1.5 py-0.5 text-xs"
                  />
                </div>
                <p
                  className={cn(
                    "truncate text-foreground/65",
                    view === "grid"
                      ? "text-xs sm:text-sm"
                      : "text-base sm:text-sm",
                  )}
                >
                  {sprite.variant}
                </p>
                {availabilityKnown &&
                helpEligible &&
                sprite.helpers.length > 0 &&
                !sprite.owned ? (
                  <p className="mt-1 text-base text-muted-foreground sm:text-sm">
                    {sprite.helpers.length} can help
                  </p>
                ) : null}
              </div>
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-72 max-w-[calc(100vw-2rem)]"
            side="top"
          >
            <div className="flex items-start gap-3">
              <SpritePortrait
                variant={sprite.variant}
                label={`${sprite.variant} ${sprite.baseName}`}
                src={sprite.imagePath ?? undefined}
                className="w-16 shrink-0"
                sizes="64px"
              />
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-semibold">
                  {sprite.variant} {sprite.baseName}
                </p>
                <p>
                  {sprite.rarity} ·{" "}
                  {sprite.mastered
                    ? "Mastered"
                    : sprite.owned
                      ? "Captured"
                      : "Missing"}
                </p>
                <p className="text-muted-foreground">
                  {!availabilityKnown
                    ? "Friend availability unavailable"
                    : !helpEligible
                      ? "Only current-season Sprites are eligible for friend help"
                      : sprite.helpers.length > 0
                        ? `Help from ${sprite.helpers.map((friend) => friend.displayName).join(", ")}`
                        : "No accepted friends have captured this Sprite yet"}
                </p>
              </div>
            </div>
          </HoverCardContent>
          <div
            className={
              view === "list"
                ? "w-28 shrink-0 px-2 sm:w-36 sm:px-3"
                : "mt-auto px-3 pb-3"
            }
          >
            {pending ? (
              <p className="sr-only" role="status">
                Saving changes…
              </p>
            ) : null}
            <div
              className="grid [--capture-size:2.75rem] transition-[grid-template-columns,gap] duration-[240ms] ease-out motion-reduce:transition-none sm:[--capture-size:2.25rem]"
              style={{
                gridTemplateColumns: sprite.owned
                  ? "minmax(0, var(--capture-size)) minmax(0, 1fr)"
                  : "minmax(0, 100%) minmax(0, 0fr)",
                gap: sprite.owned ? "0.5rem" : "0rem",
              }}
            >
              <div className="min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      variant="captured"
                      aria-label={`Captured ${sprite.variant} ${sprite.baseName}`}
                      pressed={sprite.owned}
                      onPressedChange={(checked) =>
                        onChange({ field: "owned", checked })
                      }
                      className={quickToggleClassName}
                    >
                      <CheckIcon aria-hidden="true" className="size-4" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={6}>
                    {sprite.owned ? "Remove capture" : "Mark as captured"}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div
                className="min-w-0 overflow-hidden transition-opacity duration-[240ms] ease-out motion-reduce:transition-none"
                style={{ opacity: sprite.owned ? 1 : 0 }}
                aria-hidden={!sprite.owned}
                inert={!sprite.owned}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      variant="mastered"
                      aria-label={`Mastered ${sprite.variant} ${sprite.baseName}`}
                      pressed={sprite.mastered}
                      disabled={!sprite.owned}
                      aria-disabled={!sprite.owned}
                      onPressedChange={(checked) =>
                        onChange({ field: "mastered", checked })
                      }
                      className={quickToggleClassName}
                    >
                      <CrownIcon aria-hidden="true" className="size-4" />
                    </Toggle>
                  </TooltipTrigger>
                  {sprite.owned ? (
                    <TooltipContent side="bottom" sideOffset={6}>
                      {sprite.mastered ? "Remove mastery" : "Mark as mastered"}
                    </TooltipContent>
                  ) : null}
                </Tooltip>
              </div>
            </div>
          </div>
        </article>
      </HoverCard>

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
            className="max-h-[calc(100dvh-2rem)] grid-rows-[minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
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
  sprite: Sprite
  pending: boolean
  availabilityKnown: boolean
  helpEligible: boolean
  notice: CollectionNotice | null
  onChange: (change: CollectionChange) => void
}) {
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
          {sprite.mastered ? (
            <span className="pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-mastered text-mastered-foreground shadow-sm ring-1 ring-mastered">
              <CrownIcon aria-hidden="true" className="size-3" />
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2.5 py-1 sm:py-2 lg:pr-10">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <SpriteRarityBadge rarity={sprite.rarity} />
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
        <dl className="grid grid-cols-2 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-inset ring-white/10 sm:grid-cols-3">
          <div className="order-1 min-w-0 p-4">
            <dt className="text-sm font-medium text-muted-foreground sm:text-xs">
              Sprite Dust
            </dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular-nums sm:text-base">
              {sprite.spriteDustValue === null
                ? "—"
                : dustFormatter.format(sprite.spriteDustValue)}
            </dd>
          </div>
          <div className="order-3 col-span-2 min-w-0 border-t border-white/10 p-4 sm:order-2 sm:col-span-1 sm:border-t-0 sm:border-l">
            <dt className="text-sm font-medium text-muted-foreground sm:text-xs">
              Drop chance
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums sm:text-sm">
              {sprite.dropChances.length > 0
                ? sprite.dropChances.map(({ source, percent }) => (
                    <div key={source} className="truncate">
                      {source} {percent}%
                    </div>
                  ))
                : sprite.dropChancePercent === null
                  ? "—"
                  : `${sprite.dropChancePercent}%`}
            </dd>
          </div>
          <div className="order-2 min-w-0 border-l border-white/10 p-4 sm:order-3">
            <dt className="text-sm font-medium text-muted-foreground sm:text-xs">
              Friends
            </dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular-nums sm:text-base">
              {!availabilityKnown
                ? "—"
                : helpEligible
                  ? sprite.helpers.length
                  : "N/A"}
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
          <section className="flex flex-col gap-3 rounded-xl bg-muted/25 p-5 ring-1 ring-inset ring-white/10 sm:p-4">
            <h3 className="font-semibold">About this Sprite</h3>
            <p className="text-pretty text-foreground/80">
              {sprite.description ??
                "No description is available for this Sprite."}
            </p>
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
            <p className="text-base text-muted-foreground sm:mt-auto sm:text-xs">
              {helpEligible
                ? "Current-season captures can help accepted friends."
                : "Older-season captures are tracked but cannot help friends."}
            </p>
          </section>
        </div>

        {availabilityKnown && helpEligible && sprite.helpers.length > 0 ? (
          <FriendHelperList friends={sprite.helpers} />
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
