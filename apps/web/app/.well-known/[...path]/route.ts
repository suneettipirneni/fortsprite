import type { NextRequest } from "next/server"
import { handle } from "hono/vercel"

export async function GET(request: NextRequest) {
  const { app } = await import("@fortsprite/api/app")
  return handle(app)(request)
}
