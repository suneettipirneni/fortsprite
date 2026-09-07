import { fileURLToPath } from "node:url"
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"
import reactHooks from "eslint-plugin-react-hooks"

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/.next-e2e/**",
    "**/.next-instant/**",
    "**/next-env.d.ts",
    ".audit/**",
  ]),
  {
    files: [
      "apps/web/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}",
      "packages/ui/src/**/*.{ts,tsx}",
    ],
    extends: [...nextVitals, ...nextTypeScript],
    settings: {
      next: { rootDir: fileURLToPath(new URL("./apps/web/", import.meta.url)) },
    },
    rules: Object.fromEntries(
      Object.entries(reactHooks.configs.recommended.rules).map(
        ([rule, value]) => [
          rule,
          Array.isArray(value) ? ["error", ...value.slice(1)] : "error",
        ],
      ),
    ),
  },
])
