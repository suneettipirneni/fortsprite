const EPIC_ACCOUNTS_URL = "https://api.epicgames.dev/epic/id/v2/accounts"
const EPIC_FRIENDS_URL = "https://api.epicgames.dev/epic/friends/v1"
const MAX_ACCOUNT_IDS_PER_REQUEST = 50
const EPIC_REQUEST_TIMEOUT_MS = 10_000

type JsonRecord = Record<string, unknown>

export interface EpicAccount {
  accountId: string
  displayName: string
}

export interface EpicFriendRelationship {
  accountId: string
  created: string | null
  favorite: boolean
  nickname: string | null
}

export class EpicApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "EpicApiError"
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(record: JsonRecord, key: string) {
  const value = record[key]
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined
}

async function fetchEpicJson(
  url: URL,
  accessToken: string,
  fetcher: typeof fetch,
) {
  let response: Response
  let body: unknown

  try {
    response = await fetcher(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      redirect: "error",
      signal: AbortSignal.timeout(EPIC_REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      throw new EpicApiError(
        "Epic Games could not complete the request.",
        response.status,
      )
    }
    body = await response.json()
  } catch (error) {
    if (error instanceof EpicApiError) {
      throw error
    }
    throw new EpicApiError(
      "Epic Games returned an unavailable or invalid response.",
      502,
    )
  }

  return body
}

export async function getEpicUserInfo(
  accessToken: string | undefined,
  userInfoUrl: string,
  fetcher: typeof fetch = fetch,
) {
  if (!accessToken) {
    throw new EpicApiError("Epic Games did not provide an access token.", 502)
  }
  const profile = await fetchEpicJson(
    new URL(userInfoUrl),
    accessToken,
    fetcher,
  )
  const accountId = isRecord(profile) ? readString(profile, "sub") : undefined
  const displayName = isRecord(profile)
    ? readString(profile, "preferred_username")
    : undefined

  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !displayName) {
    throw new EpicApiError("Epic Games returned an invalid user profile.", 502)
  }

  return {
    id: accountId,
    email: `${accountId}@accounts.epic.invalid`,
    emailVerified: false,
    name: displayName,
  }
}

function parseEpicAccount(value: unknown): EpicAccount {
  const accountId = isRecord(value) ? readString(value, "accountId") : undefined
  const displayName = isRecord(value)
    ? readString(value, "displayName")
    : undefined

  if (!accountId || !displayName) {
    throw new EpicApiError(
      "Epic Games returned an invalid account profile.",
      502,
    )
  }

  return { accountId, displayName }
}

export async function getEpicAccounts(
  accessToken: string,
  accountIds: string[],
  fetcher: typeof fetch = fetch,
) {
  const uniqueAccountIds = [...new Set(accountIds)]
  const urls: URL[] = []

  for (
    let index = 0;
    index < uniqueAccountIds.length;
    index += MAX_ACCOUNT_IDS_PER_REQUEST
  ) {
    const accountIdChunk = uniqueAccountIds.slice(
      index,
      index + MAX_ACCOUNT_IDS_PER_REQUEST,
    )
    const url = new URL(EPIC_ACCOUNTS_URL)
    for (const accountId of accountIdChunk) {
      url.searchParams.append("accountId", accountId)
    }
    urls.push(url)
  }

  const accounts = await Promise.all(
    urls.map(async (url) => {
      const body = await fetchEpicJson(url, accessToken, fetcher)
      if (!Array.isArray(body)) {
        throw new EpicApiError(
          "Epic Games returned an invalid accounts list.",
          502,
        )
      }
      return body.map(parseEpicAccount)
    }),
  )

  return accounts.flat()
}

export async function getEpicFriendRelationships(
  accessToken: string,
  accountId: string,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(`${EPIC_FRIENDS_URL}/${encodeURIComponent(accountId)}`)
  const body = await fetchEpicJson(url, accessToken, fetcher)

  if (!isRecord(body) || !Array.isArray(body.friends)) {
    throw new EpicApiError("Epic Games returned an invalid friends list.", 502)
  }

  return body.friends.map((value): EpicFriendRelationship => {
    const friendAccountId = isRecord(value)
      ? readString(value, "accountId")
      : undefined
    if (!isRecord(value) || !friendAccountId) {
      throw new EpicApiError(
        "Epic Games returned an invalid friend relationship.",
        502,
      )
    }

    return {
      accountId: friendAccountId,
      created: readString(value, "created") ?? null,
      favorite: value.favorite === true,
      nickname: readString(value, "nickname") ?? null,
    }
  })
}

export async function getVisibleEpicFriends(
  accessToken: string,
  accountId: string,
  fetcher: typeof fetch = fetch,
) {
  const relationships = await getEpicFriendRelationships(
    accessToken,
    accountId,
    fetcher,
  )
  const accounts = await getEpicAccounts(
    accessToken,
    relationships.map((relationship) => relationship.accountId),
    fetcher,
  )
  const accountsById = new Map(
    accounts.map((account) => [account.accountId, account]),
  )

  return relationships.flatMap((relationship) => {
    const account = accountsById.get(relationship.accountId)
    return account
      ? [{ ...relationship, displayName: account.displayName }]
      : []
  })
}
