import type { Metadata } from "next"
import { SupportContact } from "@/components/support-contact"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"

import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"

export const metadata: Metadata = { title: "Help" }

export default function HelpPage() {
  return (
    <AuthenticatedAppShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <div>
          <p className="font-mono text-sm uppercase tracking-wide text-muted-foreground">
            Help
          </p>
          <h1 className="max-w-[22ch] text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Clear answers before you squad up.
          </h1>
          <p className="max-w-[62ch] text-pretty text-base text-muted-foreground sm:text-sm">
            FortSprite coordinates collectors. It does not connect to or modify
            a Fortnite account.
          </p>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="availability">
            <AccordionTrigger>
              What does “available to help” mean?
            </AccordionTrigger>
            <AccordionContent>
              It means an accepted friend has marked that Sprite as captured.
              Captured Sprites are automatically available to friends, whether
              mastered or not. It is not a guaranteed trade or transfer.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="privacy">
            <AccordionTrigger>Who can see my collection?</AccordionTrigger>
            <AccordionContent>
              Only accepted friends can view collection and availability data.
              Pending requests and unrelated users cannot.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="verification">
            <AccordionTrigger>Are collections verified?</AccordionTrigger>
            <AccordionContent>
              No. Ownership, mastery, and Fortnite display names are
              user-provided. Availability follows ownership and friendship.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <SupportContact />
      </div>
    </AuthenticatedAppShell>
  )
}
