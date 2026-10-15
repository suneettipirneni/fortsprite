const ceremonyLock = "fortsprite-passkey-ceremony"
const busyMessage = "A passkey request is already open in another FortSprite tab. Finish or cancel it there, then try again."
let pending = false

class PasskeyBusyError extends Error {
  readonly code = "PASSKEY_IN_USE"

  constructor() {
    super(busyMessage)
  }
}

// Registration and sign-in share Better Auth's challenge cookie. Hold the lock
// from before generating options until verification finishes, across all tabs.
export async function withPasskeyCeremony<T>(operation: () => Promise<T>): Promise<T> {
  if (pending) throw new PasskeyBusyError()
  pending = true
  try {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request(ceremonyLock, { ifAvailable: true }, (lock) => {
        if (!lock) throw new PasskeyBusyError()
        return operation()
      })
    }
    return await operation()
  } finally {
    pending = false
  }
}

export function passkeyErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback
  const code = "code" in error ? error.code : undefined
  const status = "status" in error ? error.status : undefined
  if (status === 429) return "Too many passkey attempts. Wait a minute, then try again."
  switch (code) {
    case "PASSKEY_IN_USE":
      return busyMessage
    case "CHALLENGE_NOT_FOUND":
      return "Your passkey request expired or was replaced. Try again from this tab."
    case "USER_VERIFICATION_REQUIRED":
      return "Unlock your device or password manager with your fingerprint, face, or PIN, then try again."
    case "PASSKEY_NOT_FOUND":
      return "This passkey is no longer linked to a FortSprite account. Try another saved passkey."
    case "AUTH_CANCELLED":
    case "REGISTRATION_CANCELLED":
      return "The passkey request was cancelled or timed out. Please try again."
    case "AUTHENTICATION_FAILED":
      return "Your passkey could not be verified. Start a new sign-in attempt."
    default:
      return fallback
  }
}
