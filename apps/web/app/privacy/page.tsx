import type { Metadata } from "next"

import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = { title: "Privacy Policy" }

const sections = [
  {
    heading: "Account sign-in",
    body: "You can create a FortSprite account with Apple or Google and add passkeys after signing in. FortSprite never receives your provider password. For passkeys, we store the public credential and related device metadata needed to verify sign-in, never a private key.",
  },
  {
    heading: "Collection and friendship data",
    body: "FortSprite stores Sprite ownership, mastery, profile settings, friend requests, blocks, and collection-sharing choices. Friends connect using exact FortSprite handles, and both people must accept before either collection is shared. Collection entries are self-reported.",
  },
  {
    heading: "Provider tokens and security",
    body: "Authentication tokens are handled by the server-side authentication system and are not exposed through collection or friendship APIs. We retain security logs only as needed to protect accounts and diagnose failures.",
  },
  {
    heading: "Your choices",
    body: "You can update your profile, collection, linked providers, and passkeys at any time. Account deletion removes or irreversibly anonymizes FortSprite data according to the documented retention process; it does not delete your Apple, Google, or Fortnite accounts.",
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
