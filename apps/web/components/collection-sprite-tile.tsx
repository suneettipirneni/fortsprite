"use client"

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { CheckIcon, CrownIcon, FlaskRoundIcon, UserRoundIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { Badge } from "@workspace/ui/components/badge"
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
import type { CatalogItem } from "@workspace/contracts"
import {
  SpriteTracking,
  TrackingSkeleton,
  useSpritePending,
} from "@/components/collection-tracking"
import { SpritePortrait } from "@/components/sprite-portrait"
import { SpriteRarityBadge } from "@/components/sprite-rarity-badge"

export type CollectionNotice = { spriteId: string; message: string }

const dustFormatter = new Intl.NumberFormat("en-US")
const SpriteDetailsOverlay = dynamic(() => import("./sprite-details-overlay").then((module) => module.SpriteDetailsOverlay), {
  loading: () => <p role="status" className="sr-only">Loading Sprite details…</p>,
})

const quickToggleClassName =
  "h-11 w-full min-w-0 rounded-lg border-white/12 px-2 text-foreground/65 hover:border-white/24 hover:bg-white/5 hover:text-foreground disabled:text-foreground/35 disabled:opacity-100 focus-visible:ring-inset sm:h-9"

export function SpriteTile({
  sprite,
  view = "grid",
  onChange,
  availabilityKnown,
  currentSeasonId,
}: {
  sprite: CatalogItem
  view?: "list" | "grid"
  availabilityKnown: boolean
  currentSeasonId: number | null
  onChange: (change: CollectionChange) => void
}) {
  const details = useContext(SpriteDetailsContext)
  if (!details) throw new Error("Sprite details require their collection provider")
  const [previewOpen, setPreviewOpen] = useState(false)
  const pending = useSpritePending(sprite.id)
  const helpEligible =
    currentSeasonId !== null && sprite.sourceSeasonId === currentSeasonId

  return (
    <>
      <HoverCard
        open={details.activeSpriteId !== sprite.id && previewOpen}
        onOpenChange={setPreviewOpen}
      >
        <article
          className={cn(
            "flex min-w-0 overflow-hidden rounded-xl bg-card/76 shadow-sm ring-1 ring-inset ring-white/10 backdrop-blur-sm",
            view === "list" ? "flex-row items-center" : "flex-col",
          )}
          data-sprite-id={sprite.id}
          aria-busy={pending}
        >
          <HoverCardTrigger asChild>
            <button
              type="button"
              data-sprite-variant={sprite.variant}
              onFocus={() => {
                if (details.activeSpriteId !== sprite.id) setPreviewOpen(true)
              }}
              onBlur={() => setPreviewOpen(false)}
              onClick={(event) => {
                setPreviewOpen(false)
                details.openDetails(sprite, event.currentTarget)
              }}
              aria-label={`Open ${sprite.variant} ${sprite.baseName} details. ${sprite.rarity} rarity.`}
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
                  sizes={view === "list" ? "(min-width: 640px) 80px, 64px" : undefined}
                />
                <SpriteTracking spriteId={sprite.id} fallback={null}>
                  {({ sprite }) => (
                    <>
                      {sprite.mastered ? (
                        <span
                          data-testid="mastered-crown"
                          className="pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-mastered text-mastered-foreground shadow-sm ring-1 ring-mastered"
                        >
                          <CrownIcon aria-hidden="true" className="size-3" />
                        </span>
                      ) : null}
                      {availabilityKnown && helpEligible && !sprite.owned && sprite.helpers.length > 0 ? (
                        <Badge
                          variant="captured"
                          role="img"
                          aria-label={`${sprite.helpers.length} ${sprite.helpers.length === 1 ? "friend has" : "friends have"} captured this Sprite`}
                          className="pointer-events-none absolute top-1.5 right-1.5 h-6 gap-1 px-2 tabular-nums shadow-sm"
                        >
                          <UserRoundIcon aria-hidden="true" />
                          {sprite.helpers.length}
                        </Badge>
                      ) : null}
                    </>
                  )}
                </SpriteTracking>
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
                <p className="flex items-center gap-1 text-muted-foreground tabular-nums">
                  <FlaskRoundIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  {sprite.spriteDustValue === null
                    ? "—"
                    : dustFormatter.format(sprite.spriteDustValue)}{" "}
                  Sprite Dust
                </p>
                <p>
                  {sprite.rarity} ·{" "}
                  <SpriteTracking spriteId={sprite.id}>
                    {({ sprite }) => (
                      <>
                        {sprite.mastered
                          ? "Mastered"
                          : sprite.owned
                            ? "Captured"
                            : "Missing"}
                      </>
                    )}
                  </SpriteTracking>
                </p>
                <p className="text-muted-foreground">
                  <SpriteTracking spriteId={sprite.id} fallback={<TrackingSkeleton className="h-4 w-40" />}>
                    {({ sprite }) => (
                      <>
                        {!availabilityKnown
                          ? "Friend availability unavailable"
                          : !helpEligible
                            ? "Only current-season Sprites are eligible for friend help"
                            : sprite.helpers.length > 0
                              ? `Help from ${sprite.helpers.map((friend) => `${friend.displayName}${friend.mastered ? " (mastered)" : ""}`).join(", ")}`
                              : "No accepted friends have captured this Sprite yet"}
                      </>
                    )}
                  </SpriteTracking>
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
            <SpriteTracking spriteId={sprite.id} onChange={onChange} fallback={<TrackingSkeleton className="h-11 w-full rounded-lg sm:h-9" />}>
              {({ sprite, onChange }) => (
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
              )}
            </SpriteTracking>
          </div>
        </article>
      </HoverCard>
    </>
  )
}

type SpriteDetailsSelection = {
  sprite: CatalogItem
  trigger: HTMLButtonElement
  mobile: boolean
}

const SpriteDetailsContext = createContext<{
  openDetails: (sprite: CatalogItem, trigger: HTMLButtonElement) => void
  activeSpriteId: string | null
} | null>(null)

type SpriteDetailsProviderProps = {
  children: ReactNode
  availabilityKnown: boolean
  currentSeasonId: number | null
  onRemovedFocus: () => void
  onChange: (sprite: CatalogItem, change: CollectionChange) => { leavesFilter: boolean }
}

export function SpriteDetailsProvider({
  children,
  ...overlayProps
}: SpriteDetailsProviderProps) {
  const isMobile = useIsMobile()
  const [selection, setSelection] = useState<SpriteDetailsSelection | null>(null)
  const [open, setOpen] = useState(false)
  const openDetails = useCallback((sprite: CatalogItem, trigger: HTMLButtonElement) => {
    setSelection({ sprite, trigger, mobile: isMobile })
    setOpen(true)
  }, [isMobile])
  const activeSpriteId = selection?.sprite.id ?? null
  const context = useMemo(() => ({ openDetails, activeSpriteId }), [openDetails, activeSpriteId])

  return (
    <SpriteDetailsContext value={context}>
      {children}
      {selection ? (
        <SpriteDetailsOverlay
          {...overlayProps}
          selection={selection}
          dialogOpen={open}
          setDialogOpen={setOpen}
          onClosed={() => setSelection((current) => current === selection ? null : current)}
        />
      ) : null}
    </SpriteDetailsContext>
  )
}

export type SpriteDetailsOverlayProps = Omit<SpriteDetailsProviderProps, "children"> & {
  selection: SpriteDetailsSelection
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  onClosed: () => void
}
