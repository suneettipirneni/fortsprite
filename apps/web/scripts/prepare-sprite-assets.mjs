import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const publicDirectory = path.join(appDirectory, "public/sprites")
const sourceDirectory = path.join(appDirectory, "assets/sprites")
const production =
  process.argv.includes("--production") || process.env.NODE_ENV === "production"
const imagePathPattern =
  /^\/sprites\/[a-zA-Z0-9_/-]+\.(?:png|webp|jpg|jpeg|svg)$/
const imageExtensionPattern = /\.(?:png|webp|jpg|jpeg|svg)$/i

function exactObject(value, keys, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new Error(`${label} must contain exactly ${keys.join(", ")}`)
  }
}

function parseApprovals(value) {
  exactObject(value, ["assets"], "Artwork manifest")
  if (!Array.isArray(value.assets))
    throw new Error("Artwork manifest assets must be an array")
  const paths = new Set()
  for (const asset of value.assets) {
    exactObject(
      asset,
      ["imagePath", "sourceUrl", "usageBasis", "approvedAt"],
      "Artwork approval",
    )
    if (
      typeof asset.imagePath !== "string" ||
      !imagePathPattern.test(asset.imagePath)
    ) {
      throw new Error(
        "Artwork approval imagePath must be a safe /sprites/ image path",
      )
    }
    if (
      typeof asset.sourceUrl !== "string" ||
      !URL.canParse(asset.sourceUrl) ||
      new URL(asset.sourceUrl).protocol !== "https:"
    ) {
      throw new Error(
        `Artwork approval sourceUrl must use HTTPS for ${asset.imagePath}`,
      )
    }
    if (
      typeof asset.usageBasis !== "string" ||
      asset.usageBasis.trim().length < 10
    ) {
      throw new Error(
        `Artwork approval usageBasis is missing for ${asset.imagePath}`,
      )
    }
    if (
      typeof asset.approvedAt !== "string" ||
      !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(asset.approvedAt) ||
      Number.isNaN(Date.parse(asset.approvedAt))
    ) {
      throw new Error(
        `Artwork approval approvedAt is invalid for ${asset.imagePath}`,
      )
    }
    if (paths.has(asset.imagePath))
      throw new Error(`Duplicate artwork approval for ${asset.imagePath}`)
    paths.add(asset.imagePath)
  }
  return value.assets
}

const catalog = JSON.parse(
  await readFile(path.join(publicDirectory, "catalog.json"), "utf8"),
)
const byPath = new Map()
for (const item of catalog) {
  if (!item.localPath) continue
  if (!imagePathPattern.test(item.localPath))
    throw new Error(`Unsafe catalog image path for ${item.id}`)
  const previous = byPath.get(item.localPath)
  if (previous && previous.sourceImage !== item.sourceImage)
    throw new Error(`Conflicting image sources for ${item.localPath}`)
  byPath.set(item.localPath, item)
}

const manifestPath = process.env.CATALOG_ASSET_APPROVALS
const approvals = production
  ? parseApprovals(
      manifestPath
        ? JSON.parse(await readFile(path.resolve(manifestPath), "utf8"))
        : { assets: [] },
    )
  : []
for (const approval of approvals) {
  const item = byPath.get(approval.imagePath)
  if (!item || item.sourceImage !== approval.sourceUrl)
    throw new Error(
      `Artwork approval does not match catalog source for ${approval.imagePath}`,
    )
}
const imagePaths = production
  ? approvals.map((asset) => asset.imagePath)
  : [...byPath.keys()]
const temporary = await mkdtemp(path.join(appDirectory, ".sprite-assets-"))
const staged = path.join(temporary, "staged")
const previous = path.join(temporary, "previous")
let previousNeedsRecovery = false

try {
  await cp(publicDirectory, staged, {
    recursive: true,
    filter: (source) => !imageExtensionPattern.test(source),
  })
  for (const imagePath of imagePaths) {
    const relativePath = imagePath.slice("/sprites/".length)
    const target = path.join(staged, relativePath)
    await mkdir(path.dirname(target), { recursive: true })
    const source = path.join(sourceDirectory, relativePath)
    if ((await stat(source)).size === 0)
      throw new Error(`Source artwork is empty for ${imagePath}`)
    await copyFile(source, target)
  }
  await rename(publicDirectory, previous)
  previousNeedsRecovery = true
  try {
    await rename(staged, publicDirectory)
    previousNeedsRecovery = false
  } catch (error) {
    await rename(previous, publicDirectory)
    previousNeedsRecovery = false
    throw error
  }
} finally {
  if (!previousNeedsRecovery)
    await rm(temporary, { recursive: true, force: true })
}

console.log(
  `Prepared ${imagePaths.length} Sprite images for ${production ? "production" : "development"}.`,
)
