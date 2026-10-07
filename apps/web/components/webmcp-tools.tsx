"use client"

import { startTransition, useEffect } from "react"
import { updateCollectionAction } from "@/app/actions/collection"
import { notifyOtherTabs } from "@/lib/cross-tab-refresh"
import type { CollectionSaver, ModelContext } from "@/lib/webmcp"

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
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
    if (!context) return
    const controller = new AbortController()
    // Most browsers do not expose WebMCP. Keep its schemas and validation code
    // out of their initial bundle while retaining registration when supported.
    void import("@/lib/webmcp").then(({ createSpriteWebMcpTools, registerSpriteWebMcp }) => {
      if (controller.signal.aborted) return
      const tools = createSpriteWebMcpTools({ session, signal: controller.signal, saveCollection })
      return registerSpriteWebMcp(context, tools, controller.signal)
    }).catch(() => {
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
