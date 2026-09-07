import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as applicationSchema from "./schema.ts"
import * as authSchema from "./auth-schema.ts"
import { env } from "../env.ts"

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: true,
})

export const databaseSchema = {
  ...applicationSchema,
  ...authSchema,
}

export const db = drizzle({
  client: pool,
  schema: databaseSchema,
})
