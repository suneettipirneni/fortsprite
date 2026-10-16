"use client"

import { DownloadIcon, ImageIcon, LoaderCircleIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { ImageExportDialog } from "@/components/image-export-dialog"
import type { ComparisonImageInput } from "@/lib/comparison-image"

type ExportState =
  | { status: "idle" | "rendering" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string }

export function ComparisonImageExport({ input }: { input: ComparisonImageInput }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ExportState>({ status: "idle" })
  const job = useRef<AbortController | null>(null)
  const previewUrl = useRef<string | null>(null)

  useEffect(() => () => {
    job.current?.abort()
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  function clearArtifact() {
    job.current?.abort()
    job.current = null
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = null
  }

  async function generate() {
    clearArtifact()
    const controller = new AbortController()
    job.current = controller
    setState({ status: "rendering" })
    try {
      const { renderComparisonImage } = await import("@/lib/comparison-image")
      if (controller.signal.aborted) return
      const blob = await renderComparisonImage(input, controller.signal)
      if (controller.signal.aborted || job.current !== controller) return
      const url = URL.createObjectURL(blob)
      previewUrl.current = url
      setState({ status: "ready", url })
    } catch (error) {
      if (controller.signal.aborted || job.current !== controller) return
      setState({ status: "error", message: error instanceof Error ? error.message : "The image could not be generated. Retry the export." })
    } finally {
      if (job.current === controller) job.current = null
    }
  }

  function changeOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) void generate()
    else {
      clearArtifact()
      setState({ status: "idle" })
    }
  }

  return (
    <ImageExportDialog
      open={open}
      onOpenChange={changeOpen}
      title="Export comparison"
      description="Share both collections’ current-season stats as an image."
      trigger={<Button variant="outline"><ImageIcon aria-hidden="true" />Export comparison</Button>}
      actions={state.status === "ready" ? (
        <Button asChild className="grow sm:grow-0">
          <a href={state.url} download={`fortsprite-comparison-${input.refreshedAt.slice(0, 10)}.png`}>
            <DownloadIcon aria-hidden="true" />Download PNG
          </a>
        </Button>
      ) : state.status === "error" ? <Button onClick={() => { void generate() }}>Retry</Button> : null}
    >
      {state.status === "rendering" ? (
        <div role="status" className="flex min-h-40 items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />Generating your image...
        </div>
      ) : null}
      {state.status === "error" ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
      {state.status === "ready" ? (
        <img src={state.url} alt={`Current-season collection comparison: ${input.viewerName}, ${input.progress.viewerOwned} of ${input.progress.total} captured and ${input.progress.viewerMastered} of ${input.progress.total} mastered; ${input.friendName}, ${input.progress.friendOwned} of ${input.progress.total} captured and ${input.progress.friendMastered} of ${input.progress.total} mastered.`} className="block h-auto w-full rounded-lg" />
      ) : null}
    </ImageExportDialog>
  )
}
