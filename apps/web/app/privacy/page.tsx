import type { Metadata } from "next"

import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = { title: "Privacy Policy" }

const sections = [
  {
    heading: "Information we collect",
    body: "When you create an account, FortSprite stores your username, optional display names, account timestamps, and an internal non-deliverable email identifier used by the authentication system. We also store the collection entries, profile settings, friend requests, friendships, blocks, and collection-sharing choices you provide. Collection entries are self-reported.",
  },
  {
    heading: "Passkeys and sessions",
    body: "You create and access your account with passkeys. FortSprite stores the public credential and technical details needed to verify it, such as its credential ID, device type, backup status, transports, and sign-in counter. FortSprite never receives your private key, biometric, or device PIN. Session records may include an IP address, browser user-agent, and expiration time, and an essential secure cookie keeps you signed in.",
  },
  {
    heading: "How we use information",
    body: "We use this information to provide and secure FortSprite, authenticate you, save your collection, operate friendship and sharing features, prevent abuse, diagnose failures, and improve reliability and performance. We do not sell your personal information or use it for targeted advertising.",
  },
  {
    heading: "Sharing and visibility",
    body: "People can use an exact FortSprite username to send a friend request. Your profile and collection are shared through FortSprite's friendship features only as the service describes, and blocking or removing a friend revokes that access. Service providers that host or operate FortSprite process data on our behalf, including Vercel for hosting, logs, analytics, and performance measurement, and Neon for database hosting. We may also disclose information when required by law or necessary to protect the service, its users, or others.",
  },
  {
    heading: "Analytics and external resources",
    body: "FortSprite uses Vercel Web Analytics to collect aggregated page-view information such as pages visited, referrers, approximate location, browser, operating system, and device type without analytics cookies. Vercel Speed Insights collects real-user performance measurements such as loading, responsiveness, and visual-stability metrics. Your browser also connects to rsms.me to load the Inter typeface, which necessarily exposes request information such as your IP address and user-agent to that provider.",
  },
  {
    heading: "Retention and deletion",
    body: "We keep account and collection information while your account is active and retain temporary authentication, rate-limit, security, and operational records only as needed for their purpose. Deleting your account removes your account and linked sessions, passkeys, collection entries, friendships, and blocks from the active application database. Deletion does not alter a Fortnite account, and residual copies may remain temporarily in infrastructure backups or security logs until those systems expire or overwrite them.",
  },
  {
    heading: "Your choices and contact",
    body: "You can update your profile and collection, manage your passkeys and friendships, or delete your account from the account page. You can block analytics scripts with browser privacy tools, although essential authentication cookies are required to sign in. Contact FortSprite support below with a privacy question or request. We may update this policy as the service changes and will revise the date shown above.",
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Your collection stays yours."
      introduction="This Privacy Policy explains what information FortSprite collects, how it is used and shared, and the choices available to you when you use the production service at fortsprite.net."
      lastUpdated="September 22, 2026"
      sections={sections}
    />
  )
}
