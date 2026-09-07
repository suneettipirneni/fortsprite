"use client"

import { useRef, useState } from "react"
import { CheckIcon, CircleIcon, SparklesIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
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

import type { CollectionChange } from "@/lib/collection-state"
import type { Sprite } from "@/lib/catalog-presentation"
import { SpritePortrait } from "@/components/sprite-portrait"

export type CollectionNotice = { spriteId: string; message: string }

const dustFormatter = new Intl.NumberFormat("en-US")
const verifiedDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
})

const collectionToggleClassName =
  "h-12 w-full justify-start gap-2 rounded-md border-white/15 px-3 text-base font-medium text-foreground/75 hover:border-white/30 hover:bg-white/5 hover:text-foreground aria-pressed:bg-foreground/95 data-[state=on]:border-transparent data-[state=on]:bg-foreground/95 data-[state=on]:text-background data-[state=on]:hover:bg-foreground disabled:text-foreground/50 disabled:opacity-100 sm:text-sm"

const quickToggleClassName =
  "h-11 w-full min-w-0 rounded-md border-white/15 px-2 text-foreground/65 hover:border-white/30 hover:bg-white/5 hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-foreground/95 data-[state=on]:bg-foreground/95 aria-pressed:text-background aria-pressed:hover:bg-foreground disabled:text-foreground/35 disabled:opacity-100 focus-visible:ring-inset sm:h-9"

export function SpriteTile({
  sprite,
  view = "grid",
  onChange,
  pending,
  notice,
  onRemovedFocus,
  availabilityKnown,
}: {
  sprite: Sprite
  view?: "list" | "grid"
  pending: boolean
  availabilityKnown: boolean
  notice: CollectionNotice | null
  onRemovedFocus: () => void
  onChange: (change: CollectionChange) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const helperLabel = !availabilityKnown
    ? "Friend availability unavailable"
    : sprite.helpers.length === 1
      ? "1 friend with this Sprite"
      : `${sprite.helpers.length} friends with this Sprite`

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <HoverCard
        open={!dialogOpen && previewOpen}
        onOpenChange={setPreviewOpen}
      >
        <article
          className={cn("flex min-w-0 overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-inset ring-white/15", view === "list" ? "flex-row items-center" : "flex-col")}
          data-sprite-id={sprite.id}
          data-mastered={sprite.mastered || undefined}
          aria-busy={pending}
          style={
            sprite.mastered
              ? { outline: "2px solid var(--primary)", outlineOffset: "2px" }
              : undefined
          }
        >
          <HoverCardTrigger asChild>
            <DialogTrigger asChild>
              <button
                ref={triggerRef}
                type="button"
                data-sprite-variant={sprite.variant}
                onFocus={() => setPreviewOpen(true)}
                onBlur={() => setPreviewOpen(false)}
                onClick={() => setPreviewOpen(false)}
                aria-label={`Open ${sprite.variant} ${sprite.baseName} details. ${sprite.rarity} rarity, ${sprite.owned ? "captured" : "missing"}, ${sprite.mastered ? "mastered" : "not mastered"}, ${helperLabel}.`}
                className={cn("group w-full min-w-0 overflow-hidden text-left outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring", view === "list" ? "flex flex-1 items-center" : "block")}
              >
                <SpritePortrait
                  tone={sprite.tone}
                  variant={sprite.variant}
                  label={`${sprite.variant} ${sprite.baseName}`}
                  src={sprite.imagePath ?? undefined}
                  className={view === "list" ? "aspect-square w-16 shrink-0 rounded-none sm:w-20" : "aspect-[4/3] w-full rounded-none"}
                  sizes={view === "list" ? "80px" : undefined}
                />
                <div className={cn("min-w-0 p-2 sm:p-3", view === "grid" && "border-t border-white/10", view === "list" && "flex-1")}>
                  <div className="flex items-center justify-between gap-1 sm:gap-2">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">
                      {sprite.baseName}
                    </h3>
                    <Badge
                      variant="outline"
                      className="shrink-0 border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground/65 sm:text-[11px]"
                    >
                      {sprite.rarity}
                    </Badge>
                  </div>
                  <p className="truncate text-base text-foreground/65 sm:text-sm">
                    {sprite.variant}
                  </p>
                  {availabilityKnown &&
                  sprite.helpers.length > 0 &&
                  !sprite.owned ? (
                    <p className="mt-1 text-base text-muted-foreground sm:text-sm">
                      {sprite.helpers.length} can help
                    </p>
                  ) : null}
                </div>
              </button>
            </DialogTrigger>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-72 max-w-[calc(100vw-2rem)]"
            side="top"
          >
            <div className="flex items-start gap-3">
              <SpritePortrait
                tone={sprite.tone}
                variant={sprite.variant}
                label={`${sprite.variant} ${sprite.baseName}`}
                src={sprite.imagePath ?? undefined}
                className="w-16 shrink-0"
                sizes="64px"
              />
              <div className="space-y-1 text-sm">
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
                    : sprite.helpers.length > 0
                      ? `Help from ${sprite.helpers.map((friend) => friend.displayName).join(", ")}`
                      : "No accepted friends have captured this Sprite yet"}
                </p>
              </div>
            </div>
          </HoverCardContent>
          <div className={view === "list" ? "w-28 shrink-0 px-2 sm:w-36 sm:px-3" : "mt-auto px-3 pb-3"}>
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
                      variant="outline"
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
                      variant="outline"
                      aria-label={`Mastered ${sprite.variant} ${sprite.baseName}`}
                      pressed={sprite.mastered}
                      disabled={!sprite.owned}
                      aria-disabled={!sprite.owned}
                      onPressedChange={(checked) =>
                        onChange({ field: "mastered", checked })
                      }
                      className={quickToggleClassName}
                    >
                      <SparklesIcon aria-hidden="true" className="size-4" />
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

      <DialogContent
        aria-busy={pending}
        onCloseAutoFocus={(event) => {
          if (!triggerRef.current?.isConnected) {
            event.preventDefault()
            onRemovedFocus()
          }
        }}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>
            {sprite.variant} {sprite.baseName}
          </DialogTitle>
          <DialogDescription>
            Review catalog metadata and update this Sprite’s collection state.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
          <SpritePortrait
            tone={sprite.tone}
            variant={sprite.variant}
            label={`${sprite.variant} ${sprite.baseName}`}
            src={sprite.imagePath ?? undefined}
            sizes="144px"
            className="aspect-square"
          />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-muted p-3 text-base sm:text-sm">
            <div className="min-w-0">
              <dt className="font-medium text-foreground">Variant</dt>
              <dd className="truncate text-muted-foreground">
                {sprite.variant}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-foreground">Rarity</dt>
              <dd className="truncate text-muted-foreground">
                {sprite.rarity}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-foreground">Sprite Dust</dt>
              <dd className="tabular-nums text-muted-foreground">
                {sprite.spriteDustValue === null
                  ? "Unavailable"
                  : dustFormatter.format(sprite.spriteDustValue)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-foreground">Drop chance</dt>
              <dd className="text-muted-foreground tabular-nums">
                {sprite.dropChances.length > 0
                  ? sprite.dropChances.map(({ source, percent }) => (
                      <div key={source}>
                        {source}: {percent}%
                      </div>
                    ))
                  : sprite.dropChancePercent === null
                    ? "Unavailable"
                    : `${sprite.dropChancePercent}%`}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-foreground">
                Friends with this Sprite
              </dt>
              <dd className="tabular-nums text-muted-foreground">
                {availabilityKnown ? sprite.helpers.length : "Unavailable"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-medium text-foreground">Status</dt>
              <dd className="truncate text-muted-foreground">
                {sprite.owned ? "Captured" : "Missing"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
          <p className="text-pretty">
            {sprite.description ??
              "No description is available for this Sprite."}
          </p>
          {sprite.levelProgression ? (
            <p className="text-pretty text-muted-foreground">
              {sprite.levelProgression}
            </p>
          ) : null}
          {sprite.location ? (
            <p className="text-pretty text-muted-foreground">
              Location: {sprite.location}.
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Source checked{" "}
            <a
              href={sprite.sourcePage}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {verifiedDateFormatter.format(new Date(sprite.sourceVerifiedAt))}
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {pending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Saving changes…
            </p>
          ) : null}
          <Toggle
            variant="outline"
            aria-label={`Captured ${sprite.variant} ${sprite.baseName}`}
            pressed={sprite.owned}
            onPressedChange={(checked) => onChange({ field: "owned", checked })}
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
            variant="outline"
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
            {sprite.mastered ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CircleIcon aria-hidden="true" />
            )}
            Mastered
          </Toggle>
          {!sprite.owned ? (
            <p
              id={`dialog-hint-${sprite.id}`}
              className="text-sm text-muted-foreground"
            >
              Capture first to mark mastery.
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Once captured, your accepted friends will see that you may be able
            to help.
          </p>
        </div>

        {availabilityKnown && sprite.helpers.length > 0 ? (
          <p className="text-pretty text-base text-muted-foreground sm:text-sm">
            Available from{" "}
            {sprite.helpers.map((friend) => friend.displayName).join(", ")}.
          </p>
        ) : null}

        {notice ? (
          <p role="alert" className="text-sm text-destructive">
            {notice.message}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
