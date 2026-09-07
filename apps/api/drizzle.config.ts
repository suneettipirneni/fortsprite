import { fileURLToPath } from "node:url"

import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"

config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
  quiet: true,
})

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run Drizzle Kit")
}

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
})
