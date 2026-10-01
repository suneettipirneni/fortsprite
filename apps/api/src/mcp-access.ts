import { auth } from "./auth.ts"

export async function verifyMcpKey(
  headers: Headers,
): Promise<{ userId: string } | null> {
  const authorization = headers.get("authorization")
  const match = authorization?.match(/^Bearer (fs_mcp_[A-Za-z0-9_-]+)$/i)
  if (!match) return null
  const result = await auth.api.verifyApiKey({
    body: {
      configId: "mcp",
      key: match[1]!,
      permissions: { collection: ["read", "write"] },
    },
  })
  return result.valid && result.key
    ? { userId: result.key.referenceId }
    : null
}
