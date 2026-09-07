import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const publicDirectory = path.join(appDirectory, "public")
const sourceDirectory = path.join(appDirectory, "assets/sprites")
const catalogPath = path.join(publicDirectory, "sprites/catalog.json")
const metadataPath = path.join(publicDirectory, "sprites/catalog-meta.json")
const catalog = JSON.parse(await readFile(catalogPath, "utf8"))
const metadata = JSON.parse(await readFile(metadataPath, "utf8"))
const errors = []
const stableKeys = new Set()
const slugs = new Set()

for (const [index, sprite] of catalog.entries()) {
  const label = sprite.id || `record ${index}`
  const requiredStrings = [
    "id",
    "stableKey",
    "name",
    "slug",
    "baseName",
    "variant",
    "sourceVariant",
    "rarity",
    "releaseStatus",
    "season",
    "localPath",
    "sourcePage",
    "sourceImage",
    "sourceVerifiedAt",
  ]

  for (const field of requiredStrings) {
    if (typeof sprite[field] !== "string" || sprite[field].length === 0) {
      errors.push(`${label}: ${field} must be a non-empty string`)
    }
  }

  if (!Number.isInteger(sprite.displayOrder) || sprite.displayOrder !== index) {
    errors.push(`${label}: displayOrder must match catalog position ${index}`)
  }
  if (!Number.isInteger(sprite.sourceSeasonId)) {
    errors.push(`${label}: sourceSeasonId must be an integer`)
  }
  if (stableKeys.has(sprite.stableKey))
    errors.push(`${label}: duplicate stableKey`)
  if (slugs.has(sprite.slug)) errors.push(`${label}: duplicate slug`)
  stableKeys.add(sprite.stableKey)
  slugs.add(sprite.slug)

  if (
    typeof sprite.localPath !== "string" ||
    !/^\/sprites\/[a-zA-Z0-9_/-]+\.(?:png|webp|jpg|jpeg|svg)$/.test(
      sprite.localPath,
    )
  ) {
    errors.push(`${label}: invalid local image path`)
    continue
  }
  const assetPath = path.join(
    sourceDirectory,
    sprite.localPath.slice("/sprites/".length),
  )
  try {
    const asset = await stat(assetPath)
    if (!asset.isFile() || asset.size === 0) {
      errors.push(`${label}: empty or invalid asset ${sprite.localPath}`)
    }
  } catch {
    errors.push(`${label}: missing asset ${sprite.localPath}`)
  }
}

const latestVerificationDate = catalog.reduce(
  (latest, sprite) =>
    sprite.sourceVerifiedAt > latest ? sprite.sourceVerifiedAt : latest,
  "",
)
const catalogSeasons = [
  ...new Map(
    catalog.map((sprite) => [
      sprite.sourceSeasonId,
      { label: sprite.season, sourceSeasonId: sprite.sourceSeasonId },
    ]),
  ).values(),
].toSorted((left, right) => right.sourceSeasonId - left.sourceSeasonId)

if (metadata.releasedCount !== catalog.length) {
  errors.push("catalog-meta.json: releasedCount does not match the catalog")
}
if (metadata.sourceVerifiedAt !== latestVerificationDate) {
  errors.push(
    "catalog-meta.json: sourceVerifiedAt is not the latest record date",
  )
}
if (JSON.stringify(metadata.seasons) !== JSON.stringify(catalogSeasons)) {
  errors.push("catalog-meta.json: seasons do not match the catalog")
}

if (errors.length > 0) {
  console.error(errors.join("\n"))
  process.exitCode = 1
} else {
  const seasons = [...new Set(catalog.map((sprite) => sprite.season))]
  console.log(
    `Validated ${catalog.length} Sprites across ${seasons.join(", ")}.`,
  )
}
