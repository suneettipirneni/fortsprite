"use client"

import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { MotionConfig, motion, useReducedMotion } from "motion/react"

import { appTabs } from "@/components/app-tabs"
import { PwaInstallPrompt } from "@/components/pwa-install-prompt"
import { cn } from "@workspace/ui/lib/utils"

function MobileTabDock({ segment }: { segment?: string | null }) {
  const reducedMotion = useReducedMotion()

  return (
    <>
      <div
        aria-hidden="true"
        className="h-[calc(5.5rem+env(safe-area-inset-bottom))] lg:hidden"
      />
      <MotionConfig reducedMotion="user">
        <nav
          aria-label="Mobile primary"
          data-mobile-tab-dock
          className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-80 lg:hidden"
        >
          <div className="flex h-14 items-stretch gap-1 rounded-full border border-white/10 bg-[#081b35]/94 p-1.5 shadow-[0_10px_28px_rgba(0,10,28,0.3)] backdrop-blur-xl">
            {appTabs.map(({ segment: tabSegment, href, mobileLabel, Icon }) => {
              const active = segment === tabSegment

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={mobileLabel}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 min-w-11 flex-1 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#9cfab5] focus-visible:ring-offset-2 focus-visible:ring-offset-[#081b35]",
                    active ? "text-[#9cfab5]" : "text-[#b4c8dc]",
                  )}
                >
                  <span className="relative flex h-10 w-11 items-center justify-center">
                    {active ? (
                      <motion.span
                        data-tab-indicator
                        layoutId="mobile-tab-active-pill"
                        initial={false}
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 440, damping: 38 }
                        }
                        className="absolute inset-0 rounded-full bg-[#9cfab5]/18 ring-1 ring-inset ring-[#9cfab5]/25"
                      />
                    ) : null}
                    <Icon
                      aria-hidden="true"
                      className="relative size-5 stroke-[1.8]"
                    />
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
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
