import type { NextRequest } from "next/server"
import { handle } from "hono/vercel"

async function handler(request: NextRequest) {
  const { app } = await import("@fortsprite/api/app")
  return handle(app)(request)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
