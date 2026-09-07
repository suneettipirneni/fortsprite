"use server"

import type { ProfileUpdate } from "@workspace/contracts"
import { refresh } from "next/cache"

import { mutateApi } from "@/lib/server-mutation"

export async function saveProfile(profile: ProfileUpdate) {
  const result = await mutateApi<{ profile: ProfileUpdate }>(
    "/api/v1/profile",
    "PUT",
    profile,
  )
  if (result.ok) refresh()
  return result
}
