import { asc, eq, gt } from "drizzle-orm"
import {
  symmetricDecrypt,
  symmetricEncrypt,
  type SecretConfig,
} from "better-auth/crypto"
import { db } from "./db/client.ts"
import { account } from "./db/auth-schema.ts"

async function encryptLegacyToken(
  token: string | null,
  key: SecretConfig | string,
) {
  if (!token) return token
  if (token.startsWith("$ba$")) {
    // Never silently double-encrypt unreadable ciphertext (e.g. a missing key).
    await symmetricDecrypt({ key, data: token })
    return token
  }
  if (
    token.length >= 80 &&
    token.length % 2 === 0 &&
    /^[0-9a-f]+$/i.test(token)
  ) {
    try {
      const plaintext = await symmetricDecrypt({ key, data: token })
      return typeof key === "string"
        ? token
        : symmetricEncrypt({ key, data: plaintext })
    } catch {
      // Historical Epic tokens may themselves be hexadecimal plaintext.
    }
  }
  return symmetricEncrypt({ key, data: token })
}

// Bounded transactions and row locks allow safe retries alongside sign-in/refresh.
// No token values are logged or included in errors by the CLI.
export async function encryptStoredOAuthTokens(
  key: SecretConfig | string,
  database = db,
) {
  let cursor: string | undefined
  let updated = 0
  while (true) {
    const batch = await database.transaction(async (transaction) => {
      const rows = await transaction
        .select()
        .from(account)
        .where(cursor === undefined ? undefined : gt(account.id, cursor))
        .orderBy(asc(account.id))
        .limit(100)
        .for("update")
      let changed = 0
      for (const row of rows) {
        const accessToken = await encryptLegacyToken(row.accessToken, key)
        const refreshToken = await encryptLegacyToken(row.refreshToken, key)
        if (
          accessToken === row.accessToken &&
          refreshToken === row.refreshToken
        )
          continue
        await transaction
          .update(account)
          .set({ accessToken, refreshToken })
          .where(eq(account.id, row.id))
        changed++
      }
      return { count: rows.length, cursor: rows.at(-1)?.id, changed }
    })
    updated += batch.changed
    if (batch.count < 100) return { updated }
    cursor = batch.cursor
  }
}
