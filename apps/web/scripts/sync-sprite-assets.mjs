import { mkdir, rename, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import spriteCatalog from "../public/sprites/catalog.json" with { type: "json" }

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const sourceDirectory = path.join(appDirectory, "assets/sprites")
const force = process.argv.includes("--force")
const concurrency = 6

async function hasImage(filePath) {
  try {
    const file = await stat(filePath)
    return file.isFile() && file.size > 0
  } catch {
    return false
  }
}

async function downloadSprite(sprite) {
  if (
    !/^\/sprites\/[a-zA-Z0-9_/-]+\.(?:png|webp|jpg|jpeg|svg)$/.test(
      sprite.localPath,
    )
  ) {
    throw new Error(`${sprite.id}: unsafe local image path`)
  }
  const target = path.join(
    sourceDirectory,
    sprite.localPath.slice("/sprites/".length),
  )

  if (!force && (await hasImage(target))) return "skipped"

  const response = await fetch(sprite.sourceImage)

  if (!response.ok) {
    throw new Error(
      `${sprite.id}: image request failed with ${response.status}`,
    )
  }

  const contentType = response.headers.get("content-type")
  if (!contentType?.startsWith("image/")) {
    throw new Error(
      `${sprite.id}: expected an image, received ${contentType ?? "unknown"}`,
    )
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length === 0)
    throw new Error(`${sprite.id}: downloaded an empty image`)

  await mkdir(path.dirname(target), { recursive: true })
  const temporary = `${target}.download`
  await writeFile(temporary, bytes)
  await rename(temporary, target)
  return "downloaded"
}

let downloaded = 0
let skipped = 0

for (let index = 0; index < spriteCatalog.length; index += concurrency) {
  const results = await Promise.all(
    spriteCatalog.slice(index, index + concurrency).map(downloadSprite),
  )

  downloaded += results.filter((result) => result === "downloaded").length
  skipped += results.filter((result) => result === "skipped").length
}

console.log(
  `Sprite assets ready: ${downloaded} downloaded, ${skipped} already present.`,
)
