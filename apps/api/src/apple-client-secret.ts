import { importPKCS8, SignJWT } from "jose"

export interface AppleCredentialConfig {
  clientId: string
  teamId: string
  keyId: string
  privateKey: string
}

export async function createAppleClientSecret(
  config: AppleCredentialConfig,
  issuedAt = Math.floor(Date.now() / 1000),
) {
  const key = await importPKCS8(config.privateKey, "ES256")
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: config.keyId })
    .setIssuer(config.teamId)
    .setSubject(config.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + 30 * 24 * 60 * 60)
    .sign(key)
}
