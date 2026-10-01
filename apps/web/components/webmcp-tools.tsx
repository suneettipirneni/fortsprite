"use client"

import { startTransition, useEffect } from "react"
import { updateCollectionAction } from "@/app/actions/collection"
import { notifyOtherTabs } from "@/lib/cross-tab-refresh"
import { browserModelContext, createSpriteWebMcpTools, registerSpriteWebMcp, type CollectionSaver } from "@/lib/webmcp"

const saveCollection: CollectionSaver = (input) => new Promise((resolve, reject) => {
  startTransition(async () => {
    try {
      const result = await updateCollectionAction(input.spriteId, input.state)
      if (!result.ok) { reject(new Error(result.error)); return }
      notifyOtherTabs()
      resolve(result.data)
    } catch {
      reject(new Error("FortSprite could not save this collection change."))
    }
  })
})

function WebMcpTools({ session }: { session: boolean }) {
  useEffect(() => {
    const context = browserModelContext()
    if (!context) return
    const controller = new AbortController()
    const tools = createSpriteWebMcpTools({ session, signal: controller.signal, saveCollection })
    void registerSpriteWebMcp(context, tools, controller.signal).catch(() => {
      if (controller.signal.aborted) return
      controller.abort()
      console.warn("FortSprite browser tools could not be registered.")
    })
    return () => controller.abort()
  }, [session])
  return null
}

export function PublicWebMcpTools() { return <WebMcpTools session={false} /> }
export function SessionWebMcpTools() { return <WebMcpTools session={true} /> }
