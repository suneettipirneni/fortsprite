import { z } from "zod"

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,24}$/)
