import type { CatalogItem, CollectionState } from "@workspace/contracts"

import { completionPercent } from "@/lib/catalog-presentation"

export type CollectionImageItem = Readonly<
  Pick<CatalogItem, "id" | "baseName" | "variant" | "imagePath"> & CollectionState
>

export type CollectionImageLayout = "grid" | "grouped"

export type CollectionImageInput = {
  items: readonly CollectionImageItem[]
  scopeLabel: string
  layout: CollectionImageLayout
  username: string | null
  generatedAt: Date
  signal: AbortSignal
}

type Palette = {
  background: string
  foreground: string
  card: string
  muted: string
  captured: string
  capturedForeground: string
  mastered: string
  masteredForeground: string
}

type ImageSection = {
  title: string | null
  items: readonly CollectionImageItem[]
  x: number
  y: number
  width: number
  columns: number
  tileSize: number
  gap: number
  height: number
}

type ImageLayout = {
  sections: ImageSection[]
  bottom: number
  height: number
}

const width = 1440
const margin = 80
const innerWidth = width - margin * 2
const gridTop = 376
const maxPixels = 16_000_000

function makeSection(
  items: readonly CollectionImageItem[],
  title: string | null,
  x: number,
  y: number,
  sectionWidth: number,
): ImageSection {
  const columns = sectionWidth === innerWidth
    ? items.length <= 12 ? 6 : items.length <= 48 ? 8 : 12
    : 6
  const gap = columns <= 8 && sectionWidth === innerWidth ? 16 : 12
  const tileSize = (sectionWidth - (columns - 1) * gap) / columns
  const rows = Math.ceil(items.length / columns)
  return {
    title,
    items,
    x,
    y,
    width: sectionWidth,
    columns,
    tileSize,
    gap,
    height: (title === null ? 0 : 42) + rows * (tileSize + gap) - gap,
  }
}

function imageLayout(items: readonly CollectionImageItem[], layout: CollectionImageLayout): ImageLayout {
  if (layout === "grid") {
    const section = makeSection(items, null, margin, gridTop, innerWidth)
    const bottom = section.y + section.height
    return { sections: [section], bottom, height: Math.ceil(bottom + 128) }
  }
  const groups = new Map<string, CollectionImageItem[]>()
  for (const item of items) {
    const group = groups.get(item.baseName) ?? []
    group.push(item)
    groups.set(item.baseName, group)
  }
  const groupEntries = [...groups]
  const groupColumns = groupEntries.length === 1 ? 1 : 2
  const sectionWidth = (innerWidth - (groupColumns - 1) * 32) / groupColumns
  const sections: ImageSection[] = []
  let y = gridTop
  for (let index = 0; index < groupEntries.length; index += groupColumns) {
    const row = groupEntries.slice(index, index + groupColumns).map(([title, groupItems], column) =>
      makeSection(groupItems, title, margin + column * (sectionWidth + 32), y, sectionWidth),
    )
    sections.push(...row)
    y += Math.max(...row.map((section) => section.height)) + 32
  }
  const bottom = y - 32
  return { sections, bottom, height: Math.ceil(bottom + 128) }
}

function readPalette(): Palette {
  const probe = document.createElement("span")
  probe.hidden = true
  document.body.append(probe)
  const color = (token: string) => {
    if (!getComputedStyle(probe).getPropertyValue(token).trim()) {
      throw new Error("FortSprite colors could not load. Refresh the page and retry.")
    }
    probe.style.color = `var(${token})`
    return getComputedStyle(probe).color
  }
  try {
    return {
      background: color("--background"),
      foreground: color("--foreground"),
      card: color("--card"),
      muted: color("--muted-foreground"),
      captured: color("--captured"),
      capturedForeground: color("--captured-foreground"),
      mastered: color("--mastered"),
      masteredForeground: color("--mastered-foreground"),
    }
  } finally {
    probe.remove()
  }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, rectWidth: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, rectWidth, height, radius)
}

function drawMarker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  mastered: boolean,
  palette: Palette,
) {
  context.fillStyle = palette.background
  roundedRect(context, x - 11, y - 11, 22, 22, 7)
  context.fill()
  drawStatusIcon(context, x, y, mastered, mastered ? palette.mastered : palette.captured)
}

function drawStatusIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  mastered: boolean,
  color: string,
) {
  context.strokeStyle = color
  context.lineWidth = 1.75
  context.lineCap = "round"
  context.lineJoin = "round"
  context.beginPath()
  if (mastered) {
    for (let point = 0; point < 10; point++) {
      const angle = -Math.PI / 2 + point * Math.PI / 5
      const radius = point % 2 === 0 ? 7 : 3.3
      const px = x + Math.cos(angle) * radius
      const py = y + Math.sin(angle) * radius
      if (point === 0) context.moveTo(px, py)
      else context.lineTo(px, py)
    }
    context.closePath()
  } else {
    context.moveTo(x - 5, y)
    context.lineTo(x - 1.3, y + 3.7)
    context.lineTo(x + 5.5, y - 3.7)
  }
  context.stroke()
}

function drawGroupHeading(
  context: CanvasRenderingContext2D,
  section: ImageSection & { title: string },
  fontFamily: string,
  palette: Palette,
) {
  const stats = [
    { count: section.items.filter((item) => item.owned).length, mastered: false },
    { count: section.items.filter((item) => item.mastered).length, mastered: true },
  ]
  context.font = `500 16px ${fontFamily}`
  const badges = stats.map((stat) => {
    const text = `${stat.count} / ${section.items.length}`
    return { ...stat, text, width: context.measureText(text).width + 44 }
  })
  const badgesWidth = badges.reduce((total, badge) => total + badge.width, 0) + 8
  context.fillStyle = palette.foreground
  context.font = `600 22px ${fontFamily}`
  const titleWidth = Math.min(context.measureText(section.title).width, section.width - badgesWidth - 14)
  context.fillText(section.title, section.x, section.y + 23, titleWidth)
  let x = section.x + titleWidth + 14
  for (const badge of badges) {
    const color = badge.mastered ? palette.mastered : palette.captured
    const foreground = badge.mastered ? palette.masteredForeground : palette.capturedForeground
    context.fillStyle = color
    roundedRect(context, x, section.y + 2, badge.width, 30, 15)
    context.fill()
    drawStatusIcon(context, x + 15, section.y + 17, badge.mastered, foreground)
    context.fillStyle = foreground
    context.font = `500 16px ${fontFamily}`
    context.fillText(badge.text, x + 30, section.y + 23)
    x += badge.width + 8
  }
}

async function withImage(
  path: string,
  signal: AbortSignal,
  description: string,
  draw: (image: HTMLImageElement) => void,
) {
  const source = new URL(path, window.location.href)
  if (source.origin !== window.location.origin) {
    throw new Error(`${description} must come from FortSprite.`)
  }
  const response = await fetch(source, { signal, credentials: "same-origin" })
  if (!response.ok) throw new Error(`${description} could not load. Retry the export.`)
  const url = URL.createObjectURL(await response.blob())
  const image = new Image()
  image.src = url
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => reject(signal.reason)
      signal.addEventListener("abort", abort, { once: true })
      image.decode().then(
        () => {
          signal.removeEventListener("abort", abort)
          resolve()
        },
        () => {
          signal.removeEventListener("abort", abort)
          reject(new Error(`${description} could not load. Retry the export.`))
        },
      )
      if (signal.aborted) abort()
    })
    signal.throwIfAborted()
    draw(image)
  } finally {
    image.src = ""
    URL.revokeObjectURL(url)
  }
}

async function drawArtwork(
  context: CanvasRenderingContext2D,
  item: CollectionImageItem,
  x: number,
  y: number,
  tileSize: number,
  fontFamily: string,
  signal: AbortSignal,
) {
  if (item.imagePath === null) {
    context.font = `500 ${Math.max(14, tileSize * 0.12)}px ${fontFamily}`
    context.textAlign = "center"
    context.fillText(item.baseName, x + tileSize / 2, y + tileSize * 0.48, tileSize - 16)
    context.font = `400 ${Math.max(12, tileSize * 0.1)}px ${fontFamily}`
    context.fillText(item.variant, x + tileSize / 2, y + tileSize * 0.66, tileSize - 16)
    context.textAlign = "left"
    return
  }
  await withImage(item.imagePath, signal, `Artwork for ${item.baseName}`, (image) => {
    const size = tileSize * 0.9
    const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight)
    const imageWidth = image.naturalWidth * scale
    const imageHeight = image.naturalHeight * scale
    context.drawImage(
      image,
      x + (tileSize - imageWidth) / 2,
      y + (tileSize - imageHeight) / 2,
      imageWidth,
      imageHeight,
    )
  })
}

export async function renderCollectionImage({
  items,
  scopeLabel,
  layout,
  username,
  generatedAt,
  signal,
}: CollectionImageInput): Promise<Blob> {
  signal.throwIfAborted()
  if (items.length === 0) throw new Error("No Sprites match this export. Choose a broader scope.")
  const geometry = imageLayout(items, layout)
  if (width * geometry.height > maxPixels) {
    throw new Error("This collection is too large for one image. Export current filters in smaller groups.")
  }
  await document.fonts.ready
  signal.throwIfAborted()
  const palette = readPalette()
  const fontFamily = getComputedStyle(document.body).fontFamily
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = geometry.height
  try {
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Image export is unavailable in this browser.")
    context.fillStyle = palette.background
    context.fillRect(0, 0, width, geometry.height)
    await withImage("/brand/fortsprite.svg", signal, "The FortSprite logo", (image) => {
      context.drawImage(image, margin - 6, 43, 48, 48)
    })
    context.fillStyle = palette.foreground
    context.font = `600 27px ${fontFamily}`
    context.fillText("FortSprite", margin + 47, 80)
    context.fillStyle = palette.muted
    context.font = `400 18px ${fontFamily}`
    context.textAlign = "right"
    context.fillText(new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }).format(generatedAt), width - margin, 80)
    if (username !== null) {
      context.font = `500 20px ${fontFamily}`
      context.fillText(`@${username}`, width - margin, 112)
    }
    context.textAlign = "left"
    context.fillStyle = palette.foreground
    context.font = `600 54px ${fontFamily}`
    context.fillText("Sprite collection", margin, 158)
    context.fillStyle = palette.muted
    context.font = `400 20px ${fontFamily}`
    context.fillText(`${scopeLabel} · ${items.length} Sprites${layout === "grouped" ? " · Grouped by type" : ""}`, margin, 196)

    const captured = items.filter((item) => item.owned).length
    const mastered = items.filter((item) => item.mastered).length
    const statWidth = (innerWidth - 64) / 2
    const stats = [
      { label: "Captured", count: captured, color: palette.captured, x: margin },
      { label: "Mastered", count: mastered, color: palette.mastered, x: margin + statWidth + 64 },
    ]
    context.strokeStyle = palette.muted
    context.globalAlpha = 0.15
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(width / 2, 242)
    context.lineTo(width / 2, 329)
    context.stroke()
    context.globalAlpha = 1
    for (const stat of stats) {
      context.fillStyle = palette.muted
      context.font = `500 18px ${fontFamily}`
      context.fillText(stat.label, stat.x, 248)
      context.fillStyle = palette.foreground
      context.font = `600 42px ${fontFamily}`
      const countText = String(stat.count)
      context.fillText(countText, stat.x, 299)
      const countWidth = context.measureText(countText).width
      context.fillStyle = palette.muted
      context.font = `400 25px ${fontFamily}`
      context.fillText(`/ ${items.length}`, stat.x + countWidth + 12, 299)
      context.fillStyle = stat.color
      context.textAlign = "right"
      context.font = `500 20px ${fontFamily}`
      context.fillText(`${completionPercent(stat.count, items.length)}%`, stat.x + statWidth, 299)
      context.textAlign = "left"
      context.fillStyle = palette.card
      roundedRect(context, stat.x, 321, statWidth, 5, 2.5)
      context.fill()
      if (stat.count > 0) {
        context.fillStyle = stat.color
        roundedRect(context, stat.x, 321, statWidth * stat.count / items.length, 5, 2.5)
        context.fill()
      }
    }

    for (const section of geometry.sections) {
      if (section.title !== null) {
        drawGroupHeading(context, { ...section, title: section.title }, fontFamily, palette)
      }
      for (const [index, item] of section.items.entries()) {
        signal.throwIfAborted()
        const row = Math.floor(index / section.columns)
        const rowCount = Math.min(section.columns, section.items.length - row * section.columns)
        const rowWidth = rowCount * (section.tileSize + section.gap) - section.gap
        const rowStart = section.title === null ? section.x + (section.width - rowWidth) / 2 : section.x
        const x = rowStart + index % section.columns * (section.tileSize + section.gap)
        const y = section.y + (section.title === null ? 0 : 42) + row * (section.tileSize + section.gap)
        context.fillStyle = palette.card
        roundedRect(context, x, y, section.tileSize, section.tileSize, 8)
        context.fill()
        context.strokeStyle = item.mastered ? palette.mastered : palette.foreground
        context.globalAlpha = item.mastered ? 0.3 : 0.08
        context.lineWidth = 1
        roundedRect(context, x + 0.5, y + 0.5, section.tileSize - 1, section.tileSize - 1, 8)
        context.stroke()
        context.globalAlpha = item.owned ? 1 : 0.45
        context.fillStyle = palette.foreground
        await drawArtwork(context, item, x, y, section.tileSize, fontFamily, signal)
        context.globalAlpha = 1
        if (item.owned) drawMarker(context, x + section.tileSize - 17, y + section.tileSize - 17, item.mastered, palette)
      }
    }

    context.strokeStyle = palette.muted
    context.globalAlpha = 0.15
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(margin, geometry.bottom + 40)
    context.lineTo(width - margin, geometry.bottom + 40)
    context.stroke()
    context.globalAlpha = 1
    const legendY = geometry.bottom + 79
    context.strokeStyle = palette.muted
    context.lineWidth = 1.5
    context.beginPath()
    context.arc(margin + 9, legendY, 7, 0, Math.PI * 2)
    context.stroke()
    context.fillStyle = palette.muted
    context.font = `400 17px ${fontFamily}`
    context.fillText("Missing", margin + 29, legendY + 6)
    drawMarker(context, margin + 149, legendY, false, palette)
    context.fillStyle = palette.muted
    context.fillText("Captured", margin + 169, legendY + 6)
    drawMarker(context, margin + 305, legendY, true, palette)
    context.fillStyle = palette.muted
    context.fillText("Mastered", margin + 325, legendY + 6)
    context.textAlign = "right"
    context.fillStyle = palette.foreground
    context.font = `500 18px ${fontFamily}`
    context.fillText("fortsprite.net", width - margin, legendY + 6)
    signal.throwIfAborted()
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (signal.aborted) reject(signal.reason)
        else if (blob) resolve(blob)
        else reject(new Error("The image could not be saved. Try a smaller export."))
      }, "image/png")
    })
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
