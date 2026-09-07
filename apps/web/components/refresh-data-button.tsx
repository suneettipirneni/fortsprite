"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"

export function RefreshDataButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      className="min-h-11"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Try again"}
    </Button>
  )
}
