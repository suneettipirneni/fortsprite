"use server"

import type { SharingAction } from "@workspace/contracts"
import { refresh } from "next/cache"
import { mutateApi } from "@/lib/server-mutation"

export async function updateSharing(id: string, action: SharingAction) {
  if (typeof id !== "string")
    return { ok: false, error: "Choose a valid friend." } as const
  const result = await mutateApi<{ ok: true }>(
    `/api/v1/friends/${encodeURIComponent(id)}`,
    "POST",
    { action },
  )
  if (result.ok) refresh()
  return result
}

export async function requestSharing(handle: string) {
  if (typeof handle !== "string")
    return { ok: false, error: "Enter a valid FortSprite username." } as const
  const result = await mutateApi<{ friend: unknown }>(
    "/api/v1/friends",
    "POST",
    { handle },
  )
  if (result.ok) refresh()
  return result
}
