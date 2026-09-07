import Link from "next/link"
import { SupportContact } from "@/components/support-contact"
import { ArrowLeftIcon, CommandIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"

type LegalSection = {
  heading: string
  body: string
}

export function LegalPage({
  eyebrow,
  title,
  introduction,
  sections,
}: {
  eyebrow: string
  title: string
  introduction: string
  sections: LegalSection[]
}) {
  return (
    <main className="isolate min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/sign-in"
            aria-label="FortSprite sign in"
            className="flex items-center gap-2 font-mono text-sm font-semibold tracking-wide"
          >
            <CommandIcon className="size-4 shrink-0 stroke-primary" />
            FORTSPRITE
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </header>
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-[68ch] text-pretty text-base text-muted-foreground">
            {introduction}
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated September 6, 2026
          </p>
        </div>
        <Separator />
        <div className="flex flex-col gap-9">
          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="text-balance text-xl font-semibold">
                {section.heading}
              </h2>
              <p className="max-w-[72ch] text-pretty text-base leading-7 text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>
        <SupportContact />
      </article>
    </main>
  )
}
