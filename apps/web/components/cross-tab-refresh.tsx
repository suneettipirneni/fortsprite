"use client"

import { useEffect } from "react"

import { currentTabId, dataChangeChannel } from "@/lib/cross-tab-refresh"

export function CrossTabRefresh() {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(dataChangeChannel)
    channel.onmessage = (event: MessageEvent<string>) => {
      if (event.data !== currentTabId()) window.location.reload()
    }
    return () => channel.close()
  }, [])

  return null
}
