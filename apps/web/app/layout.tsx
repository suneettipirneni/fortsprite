import type { Metadata, Viewport } from "next"
import { Suspense } from "react"

import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { TooltipProvider } from "@workspace/ui/components/tooltip"
import "@workspace/ui/globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import { MobileSurface, MobileSurfaceFallback } from "@/components/mobile-surface"

export const metadata: Metadata = {
  metadataBase: new URL("https://fortsprite.net"),
  applicationName: "FortSprite",
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FortSprite",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#061947",
  viewportFit: "cover",
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
          <footer className="border-t border-white/10 bg-background px-4 py-5 text-center text-xs leading-5 text-muted-foreground sm:px-6">
            <p className="mx-auto max-w-4xl">
              Portions of the materials used are trademarks and/or copyrighted
              works of Epic Games, Inc. All rights reserved by Epic. This
              material is not official and is not endorsed by Epic.
            </p>
          </footer>
        </ThemeProvider>
        <Suspense fallback={<MobileSurfaceFallback />}>
          <MobileSurface />
        </Suspense>
        {process.env.NODE_ENV === "production" ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  )
}
