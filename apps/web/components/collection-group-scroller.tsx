"use client"

import { useEffect, useId, useRef, useState, type CSSProperties } from "react"
import { SpritePortrait } from "@/components/sprite-portrait"
import styles from "./collection-group-scroller.module.css"

type CollectionGroupScrollerProps = {
  groups: { baseName: string; items: unknown[]; baseImagePath: string | null | undefined }[]
  activeIndex: number
  controls: string
  contentTop: number
  visible: boolean
  onJump: (index: number) => void
}

/** An index-based scrubber: every group gets equal travel, regardless of its height. */
export function CollectionGroupScroller({
  groups,
  activeIndex,
  controls,
  contentTop,
  visible,
  onJump,
}: CollectionGroupScrollerProps) {
  const hintId = useId()
  const pointerId = useRef<number | null>(null)
  const touchDrag = useRef(false)
  const lastTarget = useRef<number | null>(null)
  const pendingTarget = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const boundsRef = useRef<{ top: number; height: number } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragBounds, setDragBounds] = useState<{ top: number; height: number; touch: boolean } | null>(null)
  const [focused, setFocused] = useState(false)
  const index = Math.min(dragIndex ?? activeIndex, groups.length - 1)
  const dragging = dragIndex !== null
  const progress = index / (groups.length - 1)
  const tickCount = Math.min(groups.length, 17)
  const group = groups[index]

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  if (groups.length < 2 || (!visible && !dragging && !focused)) return null

  function flushTarget() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    const next = pendingTarget.current
    pendingTarget.current = null
    if (next === null || next === lastTarget.current) return
    lastTarget.current = next
    setDragIndex(next)
    // On touch, keep expensive virtualized page jumps out of the gesture.
    // The lightweight preview tracks the finger; release commits the choice.
    if (!touchDrag.current) onJump(next)
  }

  function scrub(clientY: number) {
    // Measure once at pointer-down; reading layout after each virtualized jump
    // forces the browser to finish laying out the newly mounted groups.
    const bounds = boundsRef.current
    if (!bounds) return
    const fraction = Math.max(0, Math.min(1, (clientY - bounds.top - 20) / Math.max(1, bounds.height - 40)))
    const position = fraction * (groups.length - 1)
    const previous = pendingTarget.current ?? lastTarget.current
    // Retain the selection slightly past the rounding boundary. Tiny finger
    // tremors otherwise alternate between groups several screens apart.
    const next = previous !== null && Math.abs(position - previous) < 0.7
      ? previous
      : Math.round(position)
    pendingTarget.current = next
    // Coalesce high-frequency pointer events into one preview update per frame.
    if (frame.current === null) frame.current = requestAnimationFrame(flushTarget)
  }

  function endDrag() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    pendingTarget.current = null
    pointerId.current = null
    touchDrag.current = false
    lastTarget.current = null
    boundsRef.current = null
    setDragIndex(null)
    setDragBounds(null)
  }

  return (
    <div
      className="fixed right-[max(0px,var(--safe-area-right))] z-30 flex w-11 items-center lg:right-[max(0.25rem,var(--safe-area-right))]"
      style={{
        top: dragBounds?.top ?? `max(calc(var(--safe-area-top) + var(--app-header-content-height) + 1.5rem), ${contentTop + 16}px)`,
        bottom: dragBounds ? undefined : "calc(var(--mobile-tab-clearance) + var(--safe-area-bottom) + 1.5rem)",
        height: dragBounds?.height,
        pointerEvents: "none",
      }}
    >
      <p id={hintId} className="sr-only">Drag to choose a variant group. On touch screens, lift your finger to jump. Use arrow keys, Home, or End with a keyboard.</p>
      <div
        role="scrollbar"
        aria-label="Jump to variant group"
        aria-controls={controls}
        aria-describedby={hintId}
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={groups.length}
        aria-valuenow={index + 1}
        aria-valuetext={`${groups[index]?.baseName}, group ${index + 1} of ${groups.length}`}
        tabIndex={0}
        data-dragging={dragging}
        className={`${styles.rail} relative h-full max-h-80 w-11 touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring`}
        style={{ pointerEvents: "auto", cursor: dragging ? "grabbing" : "grab" }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          event.preventDefault()
          // Freeze the geometry for the gesture, including viewport changes
          // caused by mobile browser chrome appearing or disappearing.
          const bounds = event.currentTarget.getBoundingClientRect()
          boundsRef.current = { top: bounds.top, height: bounds.height }
          setDragBounds({ top: bounds.top, height: bounds.height, touch: event.pointerType === "touch" })
          pointerId.current = event.pointerId
          touchDrag.current = event.pointerType === "touch"
          event.currentTarget.setPointerCapture(event.pointerId)
          scrub(event.clientY)
        }}
        onPointerMove={(event) => {
          if (pointerId.current === event.pointerId) scrub(event.clientY)
        }}
        onPointerUp={(event) => {
          if (pointerId.current !== event.pointerId) return
          // A quick release can arrive before the queued frame. Commit the
          // final position now so it cannot be lost or replayed after release.
          scrub(event.clientY)
          flushTarget()
          if (touchDrag.current && lastTarget.current !== null) onJump(lastTarget.current)
          event.currentTarget.releasePointerCapture(event.pointerId)
          endDrag()
        }}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(event) => {
          const targets: Record<string, number> = {
            ArrowDown: index + 1,
            ArrowRight: index + 1,
            ArrowUp: index - 1,
            ArrowLeft: index - 1,
            PageDown: index + 5,
            PageUp: index - 5,
            Home: 0,
            End: groups.length - 1,
          }
          const target = targets[event.key]
          if (target === undefined) return
          event.preventDefault()
          onJump(Math.max(0, Math.min(groups.length - 1, target)))
        }}
      >
        <span aria-hidden="true" className={styles.track}>
          {Array.from({ length: tickCount }, (_, tick) => (
            <span key={tick} className={styles.tick} data-active={tick === Math.round(progress * (tickCount - 1))} />
          ))}
        </span>
        {(dragging || focused) && group && (
          <div
            aria-hidden="true"
            data-testid="group-scroll-preview"
            className={styles.preview}
            style={{ top: `clamp(100px, calc(${progress * 100}% + ${20 - progress * 40}px), calc(100% - 100px))` }}
          >
            {groups.slice(Math.max(0, index - 2), index + 3).map((previewGroup, offset) => {
              const groupIndex = Math.max(0, index - 2) + offset
              const slot = groupIndex - index
              // Keep one invisible card on either side so adjacent groups
              // retain their DOM identity as they roll into and out of view.
              return (
                <div
                  key={previewGroup.baseName}
                  className={styles.previewCard}
                  data-position={slot === 0 ? "current" : slot === -1 ? "previous" : slot === 1 ? "next" : "buffer"}
                  style={{ "--slot": slot, "--distance": Math.abs(slot), zIndex: 3 - Math.abs(slot) } as CSSProperties}
                >
                  <SpritePortrait
                    variant="Base"
                    label={`Base ${previewGroup.baseName}`}
                    src={previewGroup.baseImagePath ?? undefined}
                    sizes="56px"
                    className={styles.portrait}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug font-semibold">{previewGroup.baseName}</p>
                    <div className={styles.previewMeta}>
                      <span>{slot === 0 && dragBounds?.touch ? "Release to jump" : `${previewGroup.items.length} ${previewGroup.items.length === 1 ? "variant" : "variants"}`}</span>
                      <span className={styles.position}><strong>{groupIndex + 1}</strong> / {groups.length}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
