import type { Metadata } from "next"

import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = { title: "Privacy Policy" }

const sections = [
  {
    heading: "Epic Games sign-in",
    body: "Epic Games is the only identity provider for FortSprite. We use Basic Profile to create your account and Friends List to show Epic friends who are visible under Epic's consent rules. FortSprite never receives your Epic password.",
  },
  {
    heading: "Collection and friendship data",
    body: "Epic provides the visible friend identities shown in FortSprite. We separately store Sprite ownership, mastery, profile settings, and any FortSprite collection-sharing choices you make. An Epic friendship alone does not grant access to collection data, and Epic does not verify collection entries.",
  },
  {
    heading: "Provider tokens and security",
    body: "Authentication tokens are handled by the server-side authentication system and are not exposed through collection or friendship APIs. We retain security logs only as needed to protect accounts and diagnose failures.",
  },
  {
    heading: "Your choices",
    body: "You can update your profile and collection at any time. Account deletion removes or irreversibly anonymizes FortSprite data according to the documented retention process; it does not delete your Epic Games account.",
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
