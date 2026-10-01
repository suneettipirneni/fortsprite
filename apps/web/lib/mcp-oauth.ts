export interface McpOAuthConsent {
  client: { id: string; name: string; redirectHost: string }
  scopes: string[]
  oauthQuery: string
  viewer: { handle: string }
}

export interface McpOAuthGrant {
  id: string
  clientId: string
  clientName: string
  scopes: string[]
  createdAt: string
}

export const mcpScopeLabels: Record<string, string> = {
  "collection:read": "Read your collection and progress",
  "collection:write": "Change owned and mastered status",
  offline_access: "Keep this assistant connected between sessions",
}
