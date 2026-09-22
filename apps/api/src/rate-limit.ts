import { sql } from "drizzle-orm"
import { db } from "./db/client.ts"
import { rateLimit } from "./db/auth-schema.ts"

export class RateLimitError extends Error {
  constructor(
    readonly retryAfter: number,
    message = "Too many requests. Please wait a minute.",
  ) {
    super(message)
  }
}

export const mutationBudgets = {
  collection: 120,
  profile: 30,
  sharing: 60,
  privacy: 120,
  deletion: 10,
} as const

export const readBudgets = {
  collection: 120,
  sharing: 120,
  comparison: 60,
} as const

export type MutationBudget = keyof typeof mutationBudgets
export type ReadBudget = keyof typeof readBudgets

// One atomic upsert across all instances; rejected requests do not extend the window.
async function consumeLimit(key: string, max: number, database = db) {
  const now = Date.now()
  const cutoff = now - 60_000
  const [counter] = await database
    .insert(rateLimit)
    .values({ id: crypto.randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${rateLimit.lastRequest} <= ${cutoff} then 1 else least(${rateLimit.count} + 1, ${max + 1}) end`,
        lastRequest: sql`case when ${rateLimit.lastRequest} <= ${cutoff} then ${now} else ${rateLimit.lastRequest} end`,
      },
    })
    .returning()
  if (!counter) throw new Error("Rate limit counter was not persisted")
  if (counter.count > max)
    throw new RateLimitError(
      Math.max(1, Math.ceil((counter.lastRequest + 60_000 - now) / 1000)),
    )
}

export function mutationLimitKey(userId: string, budget: MutationBudget) {
  return `mutation:${budget}:${userId}`
}

export function userRateLimitKeys(userId: string) {
  return [
    ...Object.keys(mutationBudgets).map((budget) =>
      mutationLimitKey(userId, budget as MutationBudget),
    ),
    ...Object.keys(readBudgets).map((budget) =>
      readLimitKey(userId, budget as ReadBudget),
    ),
  ]
}

export function readLimitKey(userId: string, budget: ReadBudget) {
  return `read:${budget}:${userId}`
}

export function consumeReadLimit(
  userId: string,
  budget: ReadBudget,
  database = db,
) {
  return consumeLimit(readLimitKey(userId, budget), readBudgets[budget], database)
}

export function consumeMutationLimit(
  userId: string,
  budget: MutationBudget,
  database = db,
) {
  return consumeLimit(
    mutationLimitKey(userId, budget),
    mutationBudgets[budget],
    database,
  )
}
