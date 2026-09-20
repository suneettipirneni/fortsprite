"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, ShareIcon, XIcon } from "lucide-react"
import Image from "next/image"

import { Button } from "@workspace/ui/components/button"

const DISMISSED_AT_KEY = "fortsprite:pwa-install-dismissed-at"
const PROMPT_AGAIN_AFTER_MS = 14 * 24 * 60 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY))
  return Number.isFinite(dismissedAt)
    ? Date.now() - dismissedAt < PROMPT_AGAIN_AFTER_MS
    : false
}

function isIosSafari() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone
  const iosDevice =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const safari =
    /Safari/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)

  return iosDevice && safari && !navigatorWithStandalone.standalone
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      wasRecentlyDismissed()
    )
      return

    const iosPromptTimer = window.setTimeout(() => {
      if (isIosSafari()) {
        setShowIosInstructions(true)
        setVisible(true)
      }
    }, 0)

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    const handleInstalled = () => {
      setVisible(false)
      setInstallEvent(null)
      window.localStorage.removeItem(DISMISSED_AT_KEY)
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt)
    window.addEventListener("appinstalled", handleInstalled)

    return () => {
      window.clearTimeout(iosPromptTimer)
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt)
      window.removeEventListener("appinstalled", handleInstalled)
    }
  }, [])

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return

    void navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .catch(() => undefined)
  }, [])

  function dismiss() {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    setVisible(false)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    if (choice.outcome === "accepted") setVisible(false)
  }

  if (!visible) return null

  return (
    <aside
      aria-label="Install FortSprite"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl border border-white/15 bg-popover/96 p-4 text-popover-foreground shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <div className="flex items-start gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install FortSprite</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showIosInstructions
              ? "For quick access, tap Share, then Add to Home Screen."
              : "Keep your collection one tap away in a full-screen app."}
          </p>
          {installEvent ? (
            <Button type="button" size="sm" className="mt-3" onClick={install}>
              <DownloadIcon />
              Install app
            </Button>
          ) : showIosInstructions ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium">
              <ShareIcon className="size-4" aria-hidden="true" />
              Share → Add to Home Screen
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss install suggestion"
          onClick={dismiss}
          className="-mt-1 -mr-1 shrink-0"
        >
          <XIcon />
        </Button>
      </div>
    </aside>
  )
}
