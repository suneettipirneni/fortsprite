import { sql } from "drizzle-orm"
import { db } from "./db/client.ts"
import { rateLimit } from "./db/auth-schema.ts"

export class DiscoveryRateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super("Friend data was refreshed too often. Please wait a minute.")
  }
}

export async function consumeDiscoveryLimit(userId: string, database = db) {
  const now = Date.now()
  const cutoff = now - 60_000
  const [counter] = await database
    .insert(rateLimit)
    .values({
      id: crypto.randomUUID(),
      key: `friend-discovery:${userId}`,
      count: 1,
      lastRequest: now,
    })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${rateLimit.lastRequest} <= ${cutoff} then 1 else least(${rateLimit.count} + 1, 121) end`,
        lastRequest: sql`case when ${rateLimit.lastRequest} <= ${cutoff} then ${now} else ${rateLimit.lastRequest} end`,
      },
    })
    .returning()
  if (counter && counter.count > 120)
    throw new DiscoveryRateLimitError(
      Math.max(1, Math.ceil((counter.lastRequest + 60_000 - now) / 1000)),
    )
}
