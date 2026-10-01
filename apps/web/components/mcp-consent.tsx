"use client"

import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { authClient } from "@/lib/auth-client"
import { mcpScopeLabels, type McpOAuthConsent } from "@/lib/mcp-oauth"

export function McpConsent({ request }: { request: McpOAuthConsent }) {
  const [pending, setPending] = useState<"allow" | "deny" | null>(null)
  const [error, setError] = useState<string>()

  async function respond(accept: boolean) {
    setPending(accept ? "allow" : "deny")
    setError(undefined)
    try {
      const result = await authClient.oauth2.consent({ accept, oauth_query: request.oauthQuery })
      if (result.error || !result.data?.url) {
        setError("The connection could not be completed. Start again from your assistant.")
        return
      }
      window.location.assign(result.data.url)
    } catch {
      setError("The connection could not be completed. Start again from your assistant.")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-balance text-3xl font-semibold tracking-tight">Connect your assistant</h1>
        <p className="text-pretty text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{request.client.name}</span> is requesting access to <span className="font-medium text-foreground">@{request.viewer.handle}</span>&apos;s FortSprite collection.
        </p>
      </div>
      <ul className="space-y-3 rounded-xl border border-border p-4 text-sm">
        {request.scopes.map((scope) => <li key={scope}>{mcpScopeLabels[scope] ?? scope}</li>)}
      </ul>
      <p className="text-sm text-muted-foreground">
        You will return to <span className="break-all font-medium text-foreground">{request.client.redirectHost}</span>. Disconnect this assistant any time in Account settings.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="sm:flex-1" variant="outline" disabled={pending !== null} onClick={() => respond(false)}>
          {pending === "deny" ? <LoaderCircleIcon className="animate-spin" /> : null}
          Deny access
        </Button>
        <Button className="sm:flex-1" disabled={pending !== null} onClick={() => respond(true)}>
          {pending === "allow" ? <LoaderCircleIcon className="animate-spin" /> : null}
          Allow access
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
