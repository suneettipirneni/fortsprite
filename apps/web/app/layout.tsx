import type { Metadata } from "next"

import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import "@workspace/ui/globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  metadataBase: new URL("https://fortsprite.net"),
  title: {
    default: "FortSprite",
    template: "%s · FortSprite",
  },
  description:
    "Track your Fortnite Sprite collection and see which friends can help fill the gaps.",
  openGraph: {
    description:
      "Track your Fortnite Sprite collection and see which friends can help fill the gaps.",
    siteName: "FortSprite",
    title: "FortSprite",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Track your Fortnite Sprite collection and see which friends can help fill the gaps.",
    title: "FortSprite",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scheme-only-dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
