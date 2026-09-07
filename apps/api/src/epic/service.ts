import type {
  EpicFriend,
  EpicFriendsResponse,
  Viewer,
} from "@workspace/contracts"

import { auth, EPIC_PROVIDER_ID } from "../auth.ts"
import { consumeDiscoveryLimit } from "../rate-limit.ts"
import { getVisibleEpicFriends } from "./client.ts"

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.")
    this.name = "AuthenticationRequiredError"
  }
}

export class EpicPermissionRequiredError extends Error {
  constructor() {
    super("Epic Games friends permission is required.")
    this.name = "EpicPermissionRequiredError"
  }
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return initials || "EP"
}

async function getEpicSessionContext(headers: Headers) {
  const session = await auth.api.getSession({ headers })

  if (!session) {
    throw new AuthenticationRequiredError()
  }

  const accounts = await auth.api.listUserAccounts({ headers })
  const epicAccount = accounts.find(
    (account) => account.providerId === EPIC_PROVIDER_ID,
  )

  if (!epicAccount) {
    throw new AuthenticationRequiredError()
  }

  return {
    accountId: epicAccount.accountId,
    scopes: new Set(epicAccount.scopes),
    user: session.user,
  }
}

export async function getViewer(headers: Headers): Promise<Viewer> {
  const context = await getEpicSessionContext(headers)
  const displayName = context.user.appDisplayName ?? context.user.name

  return {
    displayName,
    epicDisplayName: context.user.name,
    fortniteDisplayName: context.user.fortniteDisplayName ?? null,
    handle: context.user.handle,
    initials: getInitials(displayName),
    epicPermissions: {
      basicProfile: context.scopes.has("basic_profile"),
      friendsList: context.scopes.has("friends_list"),
    },
  }
}

export async function getConsentedEpicFriends(headers: Headers) {
  const context = await getEpicSessionContext(headers)
  await consumeDiscoveryLimit(context.user.id)

  if (!context.scopes.has("friends_list")) {
    throw new EpicPermissionRequiredError()
  }

  const token = await auth.api.getAccessToken({
    headers,
    body: { providerId: EPIC_PROVIDER_ID },
  })

  return getVisibleEpicFriends(token.accessToken, context.accountId)
}

export async function getEpicFriends(
  headers: Headers,
): Promise<EpicFriendsResponse> {
  const visibleFriends = await getConsentedEpicFriends(headers)
  const friends = visibleFriends
    .map((friend): EpicFriend => ({
      displayName: friend.displayName,
      nickname: friend.nickname,
      initials: getInitials(friend.displayName),
      friendsSince: friend.created,
      favorite: friend.favorite,
    }))
    .sort((left, right) =>
      left.displayName.localeCompare(right.displayName, undefined, {
        sensitivity: "base",
      }),
    )

  return {
    friends,
    total: friends.length,
    source: "epic-games",
  }
}
