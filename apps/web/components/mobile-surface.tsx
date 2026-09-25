"use client"

import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { MotionConfig, motion, useReducedMotion } from "motion/react"

import { appTabs } from "@/components/app-tabs"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { cn } from "@workspace/ui/lib/utils"

function MobileTabDock({ segment }: { segment?: string | null }) {
  const reducedMotion = useReducedMotion()
  const activeIndex = appTabs.findIndex((tab) => tab.segment === segment)

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(5.25rem+max(0.5rem,calc(env(safe-area-inset-bottom)-0.25rem)))] lg:hidden"
      />
      <MotionConfig reducedMotion="user">
        <motion.nav
          layoutRoot
          aria-label="Mobile primary"
          data-mobile-tab-dock
          className="fixed inset-x-2 bottom-[max(0.5rem,calc(env(safe-area-inset-bottom)-0.25rem))] z-40 mx-auto max-w-[23rem] lg:hidden"
        >
          <div className="grid h-[4.25rem] grid-cols-5 items-stretch gap-1 rounded-full border border-white/8 bg-background/85 p-2 shadow-[0_10px_28px_rgba(0,10,28,0.3)] backdrop-blur-2xl">
            {activeIndex >= 0 ? (
              <motion.span
                layout="position"
                initial={false}
                data-tab-indicator
                aria-hidden="true"
                style={{ gridColumn: activeIndex + 1, gridRow: 1 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 42 }
                }
                className="pointer-events-none z-0 m-auto h-[3.125rem] w-full max-w-14 rounded-full bg-[#9cfab5]/20"
              />
            ) : null}
            {appTabs.map(({ href, mobileLabel, Icon }, index) => {
              const active = index === activeIndex

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={mobileLabel}
                  aria-current={active ? "page" : undefined}
                  style={{ gridColumn: index + 1, gridRow: 1 }}
                  className={cn(
                    "relative z-10 flex min-h-12 min-w-12 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#9cfab5] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active ? "text-[#9cfab5]" : "text-[#b4c8dc]",
                  )}
                >
                  <Icon aria-hidden="true" className="size-6 stroke-[1.8]" />
                </Link>
              )
            })}
          </div>
        </motion.nav>
      </MotionConfig>
    </>
  )
}

export function MobileSurfaceFallback() {
  return (
    <>
      <PwaInstallPrompt raisedAboveDock />
      <MobileTabDock />
    </>
  )
}

export function MobileSurface() {
  const segment = useSelectedLayoutSegment()
  const showDock =
    segment === "help" || appTabs.some((tab) => tab.segment === segment)

  return (
    <>
      <PwaInstallPrompt raisedAboveDock={showDock} />
      {showDock ? <MobileTabDock segment={segment} /> : null}
    </>
  )
}
