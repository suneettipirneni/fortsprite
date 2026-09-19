import type { Metadata } from "next"

import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = { title: "Privacy Policy" }

const sections = [
  {
    heading: "Account sign-in",
    body: "You create and access a FortSprite account with passkeys. FortSprite stores the public credential and related device metadata needed to verify sign-in, never the private key, biometric, or device PIN.",
  },
  {
    heading: "Collection and friendship data",
    body: "FortSprite stores Sprite ownership, mastery, profile settings, friend requests, blocks, and collection-sharing choices. Friends connect using exact FortSprite usernames, and both people must accept before either collection is shared. Collection entries are self-reported.",
  },
  {
    heading: "Authentication and security",
    body: "Authentication sessions are handled by the server-side authentication system and are not exposed through collection or friendship APIs. We retain security logs only as needed to protect accounts and diagnose failures.",
  },
  {
    heading: "Your choices",
    body: "You can update your profile, collection, and passkeys at any time. Account deletion removes or irreversibly anonymizes FortSprite data according to the documented retention process; it does not delete or alter your Fortnite account.",
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Your collection stays yours."
      introduction="This launch-draft policy explains the data boundaries FortSprite is designed to enforce. It must receive legal review before production release."
      sections={sections}
    />
  )
}
