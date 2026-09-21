import { ImageResponse } from "next/og"

import { FortSpriteIcon } from "@/components/fortsprite-icon"

export const alt =
  "FortSprite — track your Sprite collection and find friends who can help"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const collectionCards = [
  { background: "#915f2a", color: "#ffe19a", label: "MISSING" },
  { background: "#44409b", color: "#d5c7ff", label: "MASTERED" },
  { background: "#086aa3", color: "#9cfab5", label: "CAPTURED" },
] as const

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        backgroundColor: "#061947",
        backgroundImage:
          "radial-gradient(circle at 82% 34%, rgba(16, 171, 221, 0.62) 0%, rgba(16, 171, 221, 0) 38%), radial-gradient(circle at 12% 4%, rgba(74, 82, 214, 0.54) 0%, rgba(74, 82, 214, 0) 32%)",
        color: "#f8fbff",
        display: "flex",
        height: "100%",
        overflow: "hidden",
        padding: "64px 72px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 42,
          display: "flex",
          height: 760,
          position: "absolute",
          right: -310,
          top: -375,
          transform: "rotate(-12deg)",
          width: 760,
        }}
      />
      <div
        style={{
          border: "1px solid rgba(255, 255, 255, 0.09)",
          borderRadius: 42,
          bottom: -470,
          display: "flex",
          height: 760,
          left: 160,
          position: "absolute",
          transform: "rotate(18deg)",
          width: 760,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          width: 690,
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 18,
          }}
        >
          <FortSpriteIcon color="#9cfab5" size={72} />
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            FortSprite
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              color: "#9cfab5",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
            }}
          >
            COLLECTION COMMAND
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              fontWeight: 750,
              letterSpacing: -3.6,
              lineHeight: 0.98,
            }}
          >
            <div style={{ display: "flex" }}>Track every Sprite.</div>
            <div style={{ color: "#9cfab5", display: "flex" }}>
              Find who can help.
            </div>
          </div>
          <div
            style={{
              color: "rgba(238, 247, 255, 0.72)",
              display: "flex",
              fontSize: 25,
              lineHeight: 1.35,
              width: 610,
            }}
          >
            Your Fortnite Sprite collection, organized and connected with
            friends.
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            color: "rgba(238, 247, 255, 0.64)",
            display: "flex",
            fontSize: 18,
            fontWeight: 600,
            gap: 12,
            letterSpacing: 1.2,
          }}
        >
          <div
            style={{
              backgroundColor: "#9cfab5",
              borderRadius: 999,
              display: "flex",
              height: 8,
              width: 8,
            }}
          />
          fortsprite.net
        </div>
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          marginLeft: "auto",
          position: "relative",
          width: 360,
        }}
      >
        {collectionCards.map((card, index) => (
          <div
            key={card.label}
            style={{
              backgroundColor: card.background,
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: 28,
              boxShadow: "0 28px 70px rgba(0, 8, 35, 0.36)",
              display: "flex",
              flexDirection: "column",
              height: 356,
              justifyContent: "space-between",
              left: 44 + index * 26,
              overflow: "hidden",
              padding: "32px 28px 26px",
              position: "absolute",
              top: 86 + index * 8,
              transform: `rotate(${-10 + index * 8}deg)`,
              width: 270,
            }}
          >
            <div
              style={{
                alignItems: "center",
                display: "flex",
                height: 205,
                justifyContent: "center",
              }}
            >
              <FortSpriteIcon color={card.color} size={150} />
            </div>
            <div
              style={{
                borderTop: "1px solid rgba(255, 255, 255, 0.15)",
                color: "rgba(255, 255, 255, 0.88)",
                display: "flex",
                fontSize: 17,
                fontWeight: 750,
                justifyContent: "space-between",
                letterSpacing: 2.2,
                paddingTop: 22,
              }}
            >
              {card.label}
              <div
                style={{
                  backgroundColor: card.color,
                  borderRadius: 999,
                  display: "flex",
                  height: 10,
                  width: 10,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>,
    size,
  )
}
