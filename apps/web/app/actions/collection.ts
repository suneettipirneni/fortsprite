"use server"

import type {
  CollectionMutationResponse,
  CollectionState,
} from "@workspace/contracts"
import { mutateApi } from "@/lib/server-mutation"
import { refresh } from "next/cache"
import type { ActionResult } from "@/lib/action-result"

export async function updateCollectionAction(
  spriteId: string,
  state: CollectionState,
): Promise<ActionResult<CollectionMutationResponse>> {
  if (typeof spriteId !== "string")
    return { ok: false, error: "Choose a valid Sprite." }
  const result = await mutateApi<CollectionMutationResponse>(
    `/api/v1/collection/${encodeURIComponent(spriteId)}`,
    "PUT",
    state,
  )
  if (result.ok) refresh()
  return result
}
