"use client"

import type { CollectionItem } from "@workspace/contracts"
import { CheckIcon, DownloadIcon, ImageIcon, LoaderCircleIcon, StarIcon, XIcon } from "lucide-react"
import { use, useEffect, useId, useRef, useState } from "react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { Switch } from "@workspace/ui/components/switch"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"

import { filterCollection, type CollectionFilters } from "@/lib/collection-filter"
import {
  renderCollectionImage,
  type CollectionImageInput,
  type CollectionImageItem,
  type CollectionImageLayout,
} from "@/lib/collection-image"

type ExportScope = "collection" | "filters"
type ExportState =
  | { status: "idle" }
  | { status: "rendering"; input: CollectionImageInput }
  | { status: "ready"; input: CollectionImageInput; url: string; filename: string }
  | { status: "error"; message: string }

const fullCollectionFilters: CollectionFilters = {
  query: "",
  capture: null,
  mastery: null,
  variants: [],
  rarities: [],
  seasons: [],
  sort: "catalog",
}

function freezeItems(items: CollectionItem[]): readonly CollectionImageItem[] {
  return Object.freeze(items.map((item): CollectionImageItem => {
    const artwork = {
      id: item.id,
      baseName: item.baseName,
      variant: item.variant,
      imagePath: item.imagePath,
    }
    return Object.freeze(item.owned
      ? { ...artwork, owned: true, mastered: item.mastered }
      : { ...artwork, owned: false, mastered: false })
  }))
}

export function CollectionImageExport({ items, filters, usernamePromise }: {
  items: CollectionItem[]
  filters: CollectionFilters
  usernamePromise: Promise<string>
}) {
  const isMobile = useIsMobile()
  const username = use(usernamePromise)
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<ExportScope>("filters")
  const [layout, setLayout] = useState<CollectionImageLayout>("grouped")
  const [includeUsername, setIncludeUsername] = useState(false)
  const [state, setState] = useState<ExportState>({ status: "idle" })
  const job = useRef<AbortController | null>(null)
  const previewUrl = useRef<string | null>(null)
  const scopeId = useId()
  const layoutId = useId()
  const usernameId = useId()
  const selected = filterCollection(items, scope === "collection" ? fullCollectionFilters : filters)
  const summaryItems = state.status === "rendering" || state.status === "ready"
    ? state.input.items
    : selected
  const captured = summaryItems.filter((item) => item.owned).length
  const mastered = summaryItems.filter((item) => item.mastered).length
  const busy = state.status === "rendering"

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

  function changeOpen(nextOpen: boolean) {
    clearArtifact()
    setState({ status: "idle" })
    setOpen(nextOpen)
  }

  function changeScope(nextScope: ExportScope) {
    clearArtifact()
    setState({ status: "idle" })
    setScope(nextScope)
  }

  function changeLayout(grouped: boolean) {
    clearArtifact()
    setState({ status: "idle" })
    setLayout(grouped ? "grouped" : "grid")
  }

  function changeUsername(included: boolean) {
    clearArtifact()
    setState({ status: "idle" })
    setIncludeUsername(included)
  }

  async function generate() {
    clearArtifact()
    const controller = new AbortController()
    job.current = controller
    const seasons = new Set(selected.map((item) => item.season))
    const seasonLabel = seasons.size === 1 ? selected[0]?.season : null
    const input: CollectionImageInput = {
      items: freezeItems(selected),
      scopeLabel: scope === "collection" ? "Full collection" : seasonLabel ?? "Current filters",
      layout,
      username: includeUsername ? username : null,
      generatedAt: new Date(),
      signal: controller.signal,
    }
    setState({ status: "rendering", input })
    try {
      const blob = await renderCollectionImage(input)
      if (controller.signal.aborted || job.current !== controller) return
      const url = URL.createObjectURL(blob)
      previewUrl.current = url
      setState({
        status: "ready",
        input,
        url,
        filename: `fortsprite-${scope === "collection" ? "collection" : "filtered-collection"}-${input.generatedAt.toISOString().slice(0, 10)}${layout === "grouped" ? "-grouped" : ""}.png`,
      })
    } catch (error) {
      if (controller.signal.aborted || job.current !== controller) return
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "The image could not be generated. Retry the export.",
      })
    } finally {
      if (job.current === controller) job.current = null
    }
  }

  const trigger = (
    <Button type="button" variant="outline" className="sm:ml-auto">
      <ImageIcon aria-hidden="true" />
      Export image
    </Button>
  )
  const options = (
    <div className="space-y-5">
      <fieldset disabled={busy} className="min-w-0">
        <legend className="mb-2 font-medium">Include</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            { value: "filters", label: "Current filters", description: "Matching Sprites in your current view." },
            { value: "collection", label: "Full collection", description: "All released Sprites, including missing ones." },
          ] as const).map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background/40 p-3 has-checked:border-primary/50 has-disabled:cursor-default has-disabled:opacity-60">
              <input
                type="radio"
                name={scopeId}
                value={option.value}
                checked={scope === option.value}
                onChange={() => changeScope(option.value)}
                aria-label={option.label}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <label htmlFor={layoutId} className="cursor-pointer text-sm font-medium">Group by Sprite type</label>
          <p className="text-xs text-muted-foreground">Keep each Sprite and its variants together.</p>
        </div>
        <Switch id={layoutId} checked={layout === "grouped"} onCheckedChange={changeLayout} disabled={busy} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <label htmlFor={usernameId} className="cursor-pointer text-sm font-medium">Include username</label>
          <p className="text-xs text-muted-foreground">Show @{username} on the image.</p>
        </div>
        <Switch id={usernameId} checked={includeUsername} onCheckedChange={changeUsername} disabled={busy} />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm tabular-nums" aria-live="polite">
        <p className="flex items-center gap-2"><CheckIcon aria-hidden="true" className="size-4 shrink-0 text-captured" /><span>{captured} of {summaryItems.length} captured</span></p>
        <p className="flex items-center gap-2"><StarIcon aria-hidden="true" className="size-4 shrink-0 text-mastered" /><span>{mastered} of {summaryItems.length} mastered</span></p>
      </div>
      {selected.length === 0 && state.status === "idle" ? (
        <p className="text-sm text-muted-foreground">No Sprites match this export. Choose a broader scope or clear your filters.</p>
      ) : null}
      {busy ? (
        <div role="status" className="flex min-h-40 items-center justify-center gap-2 rounded-lg border border-border bg-background text-muted-foreground">
          <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          Generating your image...
        </div>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.message}</p>
      ) : null}
      {state.status === "ready" ? (
        <div className="space-y-2">
          <div className="max-h-[45dvh] overflow-y-auto rounded-xl border border-border bg-background">
            <img src={state.url} alt="Collection image preview" className="block h-auto w-full" />
          </div>
          <p className="text-xs text-muted-foreground">Regenerate the preview to include later collection changes.</p>
        </div>
      ) : null}
    </div>
  )
  const actions = (
    <>
      <Button
        type="button"
        variant={state.status === "ready" ? "outline" : "default"}
        onClick={generate}
        disabled={busy || selected.length === 0}
        className="grow sm:grow-0"
      >
        {state.status === "error" ? "Retry" : state.status === "ready" ? "Generate again" : "Generate preview"}
      </Button>
      {state.status === "ready" ? (
        <Button asChild className="grow sm:grow-0">
          <a href={state.url} download={state.filename}>
            <DownloadIcon aria-hidden="true" />
            Download PNG
          </a>
        </Button>
      ) : null}
    </>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={changeOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="overflow-hidden data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-var(--safe-area-top)-1rem)]">
          <DrawerHeader className="relative shrink-0 gap-2 pl-[max(1rem,var(--safe-area-left))] pr-[calc(max(1rem,var(--safe-area-right))+2.5rem)] text-left">
            <DrawerTitle>Export collection image</DrawerTitle>
            <DrawerDescription>
              Preview your Sprites and progress, then download the PNG.
            </DrawerDescription>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-[max(0.5rem,var(--safe-area-right))]">
                <XIcon aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div data-slot="export-scroll-content" className="min-h-0 overflow-y-auto overscroll-contain pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pb-5">
            {options}
          </div>
          <DrawerFooter className="mt-0 shrink-0 flex-row flex-wrap justify-end border-t border-border pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pb-[calc(var(--safe-area-bottom)+1rem)]">
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] gap-5 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="pr-7">
          <DialogTitle>Export collection image</DialogTitle>
          <DialogDescription>
            Preview your Sprites and progress, then download the PNG.
          </DialogDescription>
        </DialogHeader>
        <div data-slot="export-scroll-content" className="min-h-0 overflow-y-auto overscroll-contain">
          {options}
        </div>
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      </DialogContent>
    </Dialog>
  )
}
