import { isDeepStrictEqual } from "node:util"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"
import type { CatalogItem } from "@workspace/contracts"

import { db } from "./db/client.ts"
import { sprites } from "./db/schema.ts"

const percentSchema = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .refine((value) => Number(value) <= 100)
const sourceUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).protocol === "https:")
const sourceDateSchema = z
  .string()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
      !Number.isNaN(Date.parse(value)),
  )
const imagePathSchema = z
  .string()
  .regex(/^\/sprites\/[a-zA-Z0-9_/-]+\.(?:png|webp|jpg|jpeg|svg)$/)
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const defaultRarities = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legendary",
  "Mythic",
  "Special",
]
const raritySchema = z.string().trim().min(1).max(80)

export const catalogSourceSchema = z
  .object({
    id: slugSchema,
    slug: slugSchema,
    stableKey: z.string().min(1).max(200),
    name: z.string().min(1).max(200),
    baseName: z.string().min(1).max(120),
    variant: z.string().min(1).max(80),
    sourceVariant: z.string().min(1).max(80),
    rarity: raritySchema,
    releaseStatus: z.enum(["unreleased", "released", "retired"]),
    displayOrder: z.number().int().nonnegative(),
    season: z.string().min(1).nullable().optional(),
    sourceSeasonId: z.number().int().nonnegative().nullable().optional(),
    localPath: imagePathSchema.nullable().optional(),
    sourceImage: sourceUrlSchema.nullable().optional(),
    description: z.string().nullable().optional(),
    descriptionLines: z.array(z.string()).default([]),
    levelProgression: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    spriteDustValue: z.number().int().nonnegative().nullable().optional(),
    sourceSummonCost: z.string().nullable().optional(),
    dropChancePercent: percentSchema.nullable().optional(),
    dropChances: z
      .array(
        z
          .object({ source: z.string().min(1), percent: percentSchema })
          .strict(),
      )
      .default([]),
    sourcePage: sourceUrlSchema,
    sourceVerifiedAt: sourceDateSchema,
  })
  .strict()
  .refine((item) => item.id === item.slug, {
    message: "Source id and slug must match",
  })

export function catalogItem(row: typeof sprites.$inferSelect): CatalogItem {
  return {
    id: row.id,
    slug: row.slug,
    stableKey: row.stableKey,
    baseName: row.baseName,
    variant: row.variantName,
    sourceVariant: row.sourceVariant,
    rarity: row.rarity,
    releaseStatus: row.releaseStatus,
    displayOrder: row.displayOrder,
    season: row.season,
    sourceSeasonId: row.sourceSeasonId,
    imagePath: row.imageUrl,
    description: row.description,
    descriptionLines: row.descriptionLines,
    levelProgression: row.levelProgression,
    location: row.location,
    spriteDustValue: row.spriteDustValue,
    dropChancePercent: row.dropChancePercent,
    dropChances: row.dropChances,
    sourcePage: row.sourceUrl,
    sourceVerifiedAt: row.sourceVerifiedAt.toISOString(),
  }
}

export function parseCatalogSnapshot(
  input: unknown,
  allowedRarities: unknown = defaultRarities,
) {
  const rarities = z.array(raritySchema).min(1).max(100).parse(allowedRarities)
  const approvedRarities = new Set(rarities)
  if (approvedRarities.size !== rarities.length)
    throw new Error("Catalog rarities contain duplicate labels")
  const items = z.array(catalogSourceSchema).min(1).parse(input)
  const keys = new Set<string>()
  const slugs = new Set<string>()
  for (const item of items) {
    if (!approvedRarities.has(item.rarity))
      throw new Error(`Unapproved catalog rarity: ${item.rarity}`)
    if (keys.has(item.stableKey) || slugs.has(item.slug))
      throw new Error("Catalog snapshot contains duplicate identities")
    keys.add(item.stableKey)
    slugs.add(item.slug)
  }
  return items
}

export interface CatalogImportOptions {
  allowedRarities?: unknown
}

export async function importCatalogSnapshot(
  input: unknown,
  options: CatalogImportOptions = {},
  database = db,
) {
  const items = parseCatalogSnapshot(input, options.allowedRarities)
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext('fortsprite-catalog-import'))`,
    )
    const existingRows = await transaction.select().from(sprites)
    const byKey = new Map(existingRows.map((row) => [row.stableKey, row]))
    const bySlug = new Map(existingRows.map((row) => [row.slug, row]))
    const claimedIds = new Set<string>()
    const planned = items.map((item) => {
      const keyMatch = byKey.get(item.stableKey)
      const slugMatch = bySlug.get(item.slug)
      if (keyMatch && slugMatch && keyMatch.id !== slugMatch.id)
        throw new Error(`Catalog identity conflict for ${item.slug}`)
      const existing = keyMatch ?? slugMatch
      if (existing) {
        if (claimedIds.has(existing.id))
          throw new Error(`Multiple source items resolve to ${item.slug}`)
        claimedIds.add(existing.id)
      }
      const values = {
        stableKey: item.stableKey,
        slug: item.slug,
        baseName: item.baseName,
        variantName: item.variant,
        sourceVariant: item.sourceVariant,
        rarity: item.rarity,
        releaseStatus: item.releaseStatus,
        displayOrder: item.displayOrder,
        season: item.season ?? null,
        sourceSeasonId: item.sourceSeasonId ?? null,
        imageUrl: item.localPath ?? null,
        sourceName: item.name,
        sourceLocalPath: item.localPath ?? null,
        sourceImage: item.sourceImage ?? null,
        sourceSummonCost: item.sourceSummonCost ?? null,
        description: item.description ?? null,
        descriptionLines: item.descriptionLines,
        levelProgression: item.levelProgression ?? null,
        location: item.location ?? null,
        spriteDustValue: item.spriteDustValue ?? null,
        dropChancePercent: item.dropChancePercent ?? null,
        dropChances: item.dropChances,
        sourceUrl: item.sourcePage,
        sourceVerifiedAt: new Date(item.sourceVerifiedAt),
      }
      return { existing, values }
    })
    const result = {
      imported: items.length,
      inserted: 0,
      updated: 0,
      unchanged: 0,
    }
    for (const { existing, values } of planned) {
      if (!existing) {
        await transaction.insert(sprites).values(values)
        result.inserted++
        continue
      }
      const changed = Object.entries(values).some(
        ([key, value]) =>
          !isDeepStrictEqual(value, existing[key as keyof typeof existing]),
      )
      if (changed) {
        await transaction
          .update(sprites)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(sprites.id, existing.id))
        result.updated++
      } else result.unchanged++
    }
    return result
  })
}
