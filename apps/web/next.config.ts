import type { NextConfig } from "next"

// Nonce CSP is incompatible with Cache Components' static shells. Use the
// documented static policy, restricting origins and framing while allowing hydration.
const isDevelopment = process.env.NODE_ENV === "development"
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://rsms.me",
  "font-src 'self' https://rsms.me",
  "img-src 'self' data: blob:",
  `connect-src 'self' https://rsms.me/inter/${isDevelopment ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

// Production-like testing is allowed only for the isolated local test harness.
const exposeTestingApi = process.env.EXPOSE_TESTING_API === "1"
if (
  exposeTestingApi &&
  (process.env.VERCEL ||
    process.env.FORTSPRITE_DIST_DIR !== ".next-instant" ||
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.includes("test") ||
    process.env.WEB_ORIGIN !== "https://localhost:3002")
)
  throw new Error(
    "Next testing APIs are restricted to the isolated local test harness",
  )

const nextConfig: NextConfig = {
  distDir: process.env.FORTSPRITE_DIST_DIR ?? ".next",
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    exposeTestingApiInProductionBuild: exposeTestingApi,
    serverActions: { bodySizeLimit: "16kb" },
  },
  transpilePackages: [
    "@workspace/ui",
    "@fortsprite/api",
    "@workspace/contracts",
  ],
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ]
  },
}

export default nextConfig
