import { and, asc, eq, inArray } from "drizzle-orm"
import type { CredentialSummary, Viewer } from "@workspace/contracts"
import { z } from "zod"
import { db } from "./db/client.ts"
import { account, passkey, user } from "./db/auth-schema.ts"

function initials(displayName: string) {
  return (
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FS"
  )
}

export async function readViewer(userId: string, database = db) {
  const [profile] = await database
    .select({
      name: user.name,
      appDisplayName: user.appDisplayName,
      handle: user.handle,
      fortniteDisplayName: user.fortniteDisplayName,
    })
    .from(user)
    .where(eq(user.id, userId))
  if (!profile) return null
  const displayName = profile.appDisplayName ?? profile.name
  return {
    displayName,
    handle: profile.handle,
    fortniteDisplayName: profile.fortniteDisplayName,
    initials: initials(displayName),
  } satisfies Viewer
}

export async function readCredentials(
  userId: string,
  database = db,
): Promise<CredentialSummary[]> {
  const [socialAccounts, passkeys] = await Promise.all([
    database
      .select({
        id: account.id,
        provider: account.providerId,
        createdAt: account.createdAt,
      })
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          inArray(account.providerId, ["apple", "google"]),
        ),
      )
      .orderBy(asc(account.createdAt)),
    database
      .select({
        id: passkey.id,
        name: passkey.name,
        deviceType: passkey.deviceType,
        backedUp: passkey.backedUp,
        createdAt: passkey.createdAt,
      })
      .from(passkey)
      .where(eq(passkey.userId, userId))
      .orderBy(asc(passkey.createdAt)),
  ])
  return [
    ...socialAccounts.map(
      (credential): CredentialSummary => ({
        id: credential.id,
        kind: "social",
        provider: credential.provider as "apple" | "google",
        createdAt: credential.createdAt.toISOString(),
      }),
    ),
    ...passkeys.map(
      (credential): CredentialSummary => ({
        id: credential.id,
        kind: "passkey",
        name: credential.name,
        deviceType: credential.deviceType,
        backedUp: credential.backedUp,
        createdAt: credential.createdAt?.toISOString() ?? null,
      }),
    ),
  ]
}

const displayName = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    "Control characters are not allowed.",
  )
export const profileSchema = z
  .object({
    handle: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,24}$/),
    displayName,
    fortniteDisplayName: displayName.nullable(),
  })
  .strict()

export async function updateProfile(
  userId: string,
  input: z.infer<typeof profileSchema>,
  database = db,
) {
  const [profile] = await database
    .update(user)
    .set({
      handle: input.handle,
      appDisplayName: input.displayName,
      fortniteDisplayName: input.fortniteDisplayName,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId))
    .returning({
      handle: user.handle,
      displayName: user.appDisplayName,
      fortniteDisplayName: user.fortniteDisplayName,
    })
  return profile
}
