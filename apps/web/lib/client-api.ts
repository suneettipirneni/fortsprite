export async function deleteProfile(confirmation: string): Promise<void> {
  let response: Response
  try {
    response = await fetch("/api/v1/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ confirmation }),
    })
  } catch {
    throw new Error(
      "The connection was interrupted. Check your connection and try again.",
    )
  }
  const body: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : "Your changes could not be saved. Please try again."
    throw new Error(message)
  }
}
