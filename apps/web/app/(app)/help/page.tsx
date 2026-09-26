import type { Metadata } from "next"

import { SupportContact } from "@/components/support-contact"
import { PageHeader } from "@/components/page-header"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion"

export const metadata: Metadata = { title: "Help" }

export default function HelpPage() {
  return (
    <div className="app-page space-y-8">
      <PageHeader
        eyebrow="Help"
        title="Clear answers before you squad up."
        description="FortSprite coordinates collectors. It does not connect to or modify a Fortnite account."
      />
      <div className="app-columns">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
          <Accordion type="single" collapsible>
            <AccordionItem value="availability">
              <AccordionTrigger>
                What does “available to help” mean?
              </AccordionTrigger>
              <AccordionContent>
                It means an accepted friend has marked that Sprite as captured.
                Captured Sprites from the current season are automatically
                available to friends, whether mastered or not. Older Sprites
                remain in your collection but are not shown as available help.
                It is not a guaranteed trade or transfer.
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
      </div>
    </div>
  )
}
