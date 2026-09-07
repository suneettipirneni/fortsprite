import type { SharingAction, SharingSnapshot } from "@workspace/contracts"

export type SharingChange = { id: string; action: SharingAction }

export function projectSharing(
  snapshot: SharingSnapshot | null,
  { id, action }: SharingChange,
): SharingSnapshot | null {
  if (!snapshot) return null
  if (action === "unblock") {
    return {
      ...snapshot,
      friends: snapshot.friends.filter((friend) => friend.profile.id !== id),
      blocked: snapshot.blocked.filter((profile) => profile.id !== id),
    }
  }
  const friend = snapshot.friends.find((entry) => entry.profile.id === id)
  if (!friend) return snapshot
  if (action === "block") {
    return {
      ...snapshot,
      friends: snapshot.friends.filter((entry) => entry.profile.id !== id),
      blocked: snapshot.blocked.some((profile) => profile.id === id)
        ? snapshot.blocked
        : [...snapshot.blocked, friend.profile],
    }
  }
  const status =
    action === "request" && friend.status === "none"
      ? "outgoing"
      : action === "accept" && friend.status === "incoming"
        ? "accepted"
        : action === "remove" ||
            (action === "decline" && friend.status === "incoming")
          ? "none"
          : friend.status
  return {
    ...snapshot,
    friends: snapshot.friends.map((entry) =>
      entry.profile.id === id ? { ...entry, status } : entry,
    ),
  }
}
