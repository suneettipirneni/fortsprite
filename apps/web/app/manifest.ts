import type { MetadataRoute } from "next"
import { PWA_BACKGROUND } from "@/lib/pwa"

const description =
  "Track your Fortnite Sprite collection and see which friends can help fill the gaps."

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FortSprite",
    short_name: "FortSprite",
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: PWA_BACKGROUND,
    theme_color: PWA_BACKGROUND,
    categories: ["games", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "My collection",
        short_name: "Collection",
        description: "Open your Sprite collection.",
        url: "/collection",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Friends who can help",
        short_name: "Matches",
        description: "See which friends have the Sprites you need.",
        url: "/matches",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  }
}
