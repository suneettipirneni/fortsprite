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

const imagePaths = [...byPath.keys()]
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
