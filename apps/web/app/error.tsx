"use client"

import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"

export default function PageError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl items-center p-4 sm:p-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            <h1 className="text-2xl font-semibold tracking-tight">
              This page could not load
            </h1>
          </EmptyTitle>
          <EmptyDescription>
            FortSprite could not finish the request. Try loading the page again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" onClick={reset} className="h-11 px-4">
            Try again
          </Button>
          <Button variant="ghost" asChild className="h-11 px-4">
            <Link href="/">Back to home</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
