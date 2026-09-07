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
