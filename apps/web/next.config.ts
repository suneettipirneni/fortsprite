import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: process.env.FORTSPRITE_DIST_DIR ?? ".next",
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  },
  transpilePackages: [
    "@workspace/ui",
    "@fortsprite/api",
    "@workspace/contracts",
  ],
  serverExternalPackages: ["pg"],
}

export default nextConfig
