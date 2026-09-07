import "server-only"

import { cookies, headers } from "next/headers"
import type { ApiErrorResponse } from "@workspace/contracts"
import type { ActionResult } from "./action-result"

export async function mutateApi<T>(
  path: string,
  method: "PUT" | "POST",
  data: unknown,
): Promise<ActionResult<T>> {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ])
  const { app } = await import("@fortsprite/api/app")
  const response = await app.request(path, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: cookieStore.toString(),
      origin: requestHeaders.get("origin") ?? "",
      "sec-fetch-site": requestHeaders.get("sec-fetch-site") ?? "",
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse
    return { ok: false, error: body.error.message }
  }
  return { ok: true, data: (await response.json()) as T }
}
