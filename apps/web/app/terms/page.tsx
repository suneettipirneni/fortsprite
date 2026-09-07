import type { Metadata } from "next"

import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = { title: "Terms" }

const sections = [
  {
    heading: "Unofficial companion tool",
    body: "FortSprite is a fan-made collection and coordination tool. It is not affiliated with, endorsed by, or sponsored by Epic Games, and it does not represent an official Fortnite service.",
  },
  {
    heading: "User-provided information",
    body: "Ownership, mastery, and display names are provided by users. Friend availability follows ownership. FortSprite does not guarantee that a collection entry is accurate or that another player can help obtain an item.",
  },
  {
    heading: "No transfers or transactions",
    body: "FortSprite does not transfer in-game items, provide escrow, process payment, or promise any trade or gameplay outcome. Users coordinate outside the app and remain responsible for following Epic Games and Fortnite rules.",
  },
  {
    heading: "Account conduct",
    body: "Do not misuse discovery or friendship features to harass others, probe private data, automate abusive requests, or compromise another account. Access may be limited when needed to protect the service or its users.",
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="A clear boundary for coordination."
      introduction="These launch-draft terms describe FortSprite's intended product boundaries. They must receive legal review before production release."
      sections={sections}
    />
  )
}
