import { serve } from "@hono/node-server"

import { app } from "./app.ts"

const port = Number.parseInt(process.env.PORT ?? "8787", 10)

serve({
  fetch: app.fetch,
  port,
})

console.log(`FortSprite API listening on http://localhost:${port}`)
