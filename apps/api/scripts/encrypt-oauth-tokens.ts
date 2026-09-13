import { auth } from "../src/auth.ts"
import { pool } from "../src/db/client.ts"
import { encryptStoredOAuthTokens } from "../src/token-migration.ts"

try {
  const { secretConfig } = await auth.$context
  const result = await encryptStoredOAuthTokens(secretConfig)
  console.log(`Encrypted OAuth credentials for ${result.updated} accounts.`)
} catch {
  console.error(
    "OAuth token migration failed. Verify database access and encryption keys before retrying.",
  )
  process.exitCode = 1
} finally {
  await pool.end()
}
