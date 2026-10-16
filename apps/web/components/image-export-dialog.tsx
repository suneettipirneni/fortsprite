"use client"

import type { ReactNode } from "react"
import { XIcon } from "lucide-react"
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
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"

export function ImageExportDialog({ open, onOpenChange, trigger, title, description, children, actions }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  title: string
  description: string
  children: ReactNode
  actions: ReactNode
}) {
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} handleOnly>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="overflow-hidden data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-var(--safe-area-top)-1rem)]">
          <DrawerHeader className="relative shrink-0 gap-2 pl-[max(1rem,var(--safe-area-left))] pr-[calc(max(1rem,var(--safe-area-right))+2.5rem)] text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              {description}
            </DrawerDescription>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon-sm" className="absolute top-3 right-[max(0.5rem,var(--safe-area-right))]">
                <XIcon aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div data-slot="export-scroll-content" className="min-h-0 overflow-y-auto overscroll-contain pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pb-5">
            {children}
          </div>
          <DrawerFooter className="mt-0 shrink-0 flex-row flex-wrap justify-end border-t border-border pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pb-[calc(var(--safe-area-bottom)+1rem)]">
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)_auto] gap-5 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="pr-7">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div data-slot="export-scroll-content" className="min-h-0 overflow-y-auto overscroll-contain">
          {children}
        </div>
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      </DialogContent>
    </Dialog>
  )
}
