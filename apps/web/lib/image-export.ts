export type Palette = {
  background: string
  foreground: string
  card: string
  muted: string
  captured: string
  capturedForeground: string
  mastered: string
  masteredForeground: string
}


export function readPalette(): Palette {
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

export function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, rectWidth: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, rectWidth, height, radius)
}


export async function withImage(
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

