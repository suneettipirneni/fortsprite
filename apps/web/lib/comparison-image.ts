import type { FriendComparison } from "@workspace/contracts"

import { readPalette, roundedRect, withImage } from "@/lib/image-export"

export type ComparisonImageInput = {
  viewerName: string
  friendName: string
  progress: FriendComparison["progress"]
  refreshedAt: string
}

const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 })

export async function renderComparisonImage(input: ComparisonImageInput, signal: AbortSignal): Promise<Blob> {
  await document.fonts.ready
  signal.throwIfAborted()
  const palette = readPalette()
  const font = getComputedStyle(document.body).fontFamily
  const canvas = document.createElement("canvas")
  canvas.width = 1200
  canvas.height = 720
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Image export is unavailable in this browser.")

  try {
    ctx.fillStyle = palette.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await withImage("/brand/fortsprite.svg", signal, "The FortSprite logo", (logo) => {
      ctx.drawImage(logo, 64, 48, 48, 48)
    })
    ctx.fillStyle = palette.foreground
    ctx.font = `600 26px ${font}`
    ctx.fillText("FortSprite", 128, 80)
    ctx.font = `600 40px ${font}`
    ctx.fillText("Collection comparison", 64, 160)
    ctx.fillStyle = palette.muted
    ctx.font = `400 20px ${font}`
    ctx.fillText("Current-season completion", 64, 195)

    const { total, viewerOwned, friendOwned, viewerMastered, friendMastered } = input.progress
    const players = [
      { name: input.viewerName, owned: viewerOwned, other: friendOwned, mastered: viewerMastered },
      { name: input.friendName, owned: friendOwned, other: viewerOwned, mastered: friendMastered },
    ]
    players.forEach((player, index) => {
      const x = index === 0 ? 64 : 648
      const columnWidth = 488
      // Keep full names legible; wrap at grapheme boundaries for long unbroken names.
      ctx.fillStyle = palette.foreground
      ctx.font = `500 26px ${font}`
      const segments = new Intl.Segmenter("en", { granularity: "grapheme" }).segment(player.name)
      const lines: string[] = []
      let line = ""
      for (const { segment } of segments) {
        if (line && ctx.measureText(line + segment).width > columnWidth) {
          lines.push(line)
          line = ""
        }
        line += segment
      }
      lines.push(line)
      lines.slice(0, 2).forEach((text, row) => {
        const displayed = row === 1 && lines.length > 2 ? `${text.slice(0, -1)}…` : text
        ctx.fillText(displayed, x, 268 + row * 32, columnWidth)
      })

      const metrics = [
        { label: "Captured", count: player.owned, color: player.owned > player.other ? palette.captured : palette.foreground },
        { label: "Mastered", count: player.mastered, color: palette.mastered },
      ]
      metrics.forEach((metric, row) => {
        const y = 329 + row * 164
        const ratio = total === 0 ? 0 : metric.count / total
        ctx.fillStyle = palette.muted
        ctx.font = `500 19px ${font}`
        ctx.fillText(metric.label, x, y)
        ctx.fillStyle = metric.color
        ctx.font = `600 64px ${font}`
        ctx.fillText(percent.format(ratio), x, y + 61)
        ctx.fillStyle = palette.foreground
        ctx.font = `500 21px ${font}`
        ctx.fillText(`${metric.count} of ${total} ${metric.label.toLowerCase()}`, x, y + 98)
        if (row === 0) {
          ctx.fillStyle = palette.muted
          ctx.font = `400 18px ${font}`
          ctx.textAlign = "right"
          ctx.fillText(`${total - player.owned} missing`, x + columnWidth, y + 98)
          ctx.textAlign = "left"
        }
        ctx.fillStyle = palette.card
        roundedRect(ctx, x, y + 116, columnWidth, 8, 4)
        ctx.fill()
        if (ratio > 0) {
          ctx.fillStyle = metric.color
          roundedRect(ctx, x, y + 116, columnWidth * ratio, 8, 4)
          ctx.fill()
        }
      })
    })

    ctx.fillStyle = palette.card
    ctx.fillRect(600, 245, 1, 372)
    ctx.fillRect(64, 646, 1072, 1)
    ctx.fillStyle = palette.muted
    ctx.font = `400 17px ${font}`
    ctx.fillText("fortsprite.net", 64, 684)
    ctx.textAlign = "right"
    ctx.fillText(new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(input.refreshedAt)), 1136, 684)
    signal.throwIfAborted()
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (signal.aborted) reject(signal.reason)
        else if (blob) resolve(blob)
        else reject(new Error("The image could not be generated. Retry the export."))
      }, "image/png")
    })
  } finally {
    canvas.width = canvas.height = 0
  }
}
