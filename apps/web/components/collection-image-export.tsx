"use client"

import dynamic from "next/dynamic"
import { useState, type ComponentProps } from "react"
import { ImageIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

const ExportContent = dynamic(() => import("./collection-image-export-content").then((module) => module.CollectionImageExportContent), {
  loading: () => <Button type="button" variant="outline" className="sm:ml-auto" disabled aria-busy="true"><ImageIcon aria-hidden="true" />Export image</Button>,
})

export function CollectionImageExport(props: Omit<ComponentProps<typeof ExportContent>, "initialOpen">) {
  const [activated, setActivated] = useState(false)
  return activated ? <ExportContent {...props} initialOpen /> : (
    <Button type="button" variant="outline" className="sm:ml-auto" aria-haspopup="dialog" aria-expanded="false" onClick={() => setActivated(true)}>
      <ImageIcon aria-hidden="true" />Export image
    </Button>
  )
}
