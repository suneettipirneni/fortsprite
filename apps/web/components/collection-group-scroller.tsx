"use client"

import { useId, useRef, useState, type CSSProperties } from "react"
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
  const lastTarget = useRef<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragBounds, setDragBounds] = useState<{ top: number; height: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const index = Math.min(dragIndex ?? activeIndex, groups.length - 1)
  const dragging = dragIndex !== null
  const progress = index / (groups.length - 1)
  const tickCount = Math.min(groups.length, 17)
  const group = groups[index]

  if (groups.length < 2 || (!visible && !dragging && !focused)) return null

  function scrub(element: HTMLDivElement, clientY: number) {
    const bounds = element.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (clientY - bounds.top - 20) / Math.max(1, bounds.height - 40)))
    const next = Math.round(fraction * (groups.length - 1))
    setDragIndex(next)
    if (lastTarget.current !== next) {
      lastTarget.current = next
      onJump(next)
    }
  }

  function endDrag() {
    pointerId.current = null
    lastTarget.current = null
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
      <p id={hintId} className="sr-only">Hold and drag to jump between variant groups. Use arrow keys, Home, or End with a keyboard.</p>
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
          // Keep the rail under the pointer even as the first jump scrolls
          // the collection toolbar out of the viewport.
          const bounds = event.currentTarget.getBoundingClientRect()
          setDragBounds({ top: bounds.top, height: bounds.height })
          pointerId.current = event.pointerId
          event.currentTarget.setPointerCapture(event.pointerId)
          scrub(event.currentTarget, event.clientY)
        }}
        onPointerMove={(event) => {
          if (pointerId.current === event.pointerId) scrub(event.currentTarget, event.clientY)
        }}
        onPointerUp={(event) => {
          if (pointerId.current !== event.pointerId) return
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
                      <span>{previewGroup.items.length} {previewGroup.items.length === 1 ? "variant" : "variants"}</span>
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
