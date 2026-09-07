import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "./db/client.ts"
import { user } from "./db/auth-schema.ts"

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
