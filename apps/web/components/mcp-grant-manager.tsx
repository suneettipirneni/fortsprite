"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CopyIcon, LoaderCircleIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { notifyOtherTabs } from "@/lib/cross-tab-refresh"
import { mcpScopeLabels, type McpOAuthGrant } from "@/lib/mcp-oauth"

export function McpGrantManager({ grants, endpoint, loading = false }: { grants: McpOAuthGrant[]; endpoint: string; loading?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ error: boolean; message: string }>()

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(endpoint)
      setNotice({ error: false, message: "Assistant MCP URL copied." })
    } catch {
      setNotice({ error: true, message: "Copy failed. Select and copy the URL manually." })
    }
  }

  async function disconnect(grant: McpOAuthGrant) {
    setPending(grant.id)
    setNotice(undefined)
    try {
      const response = await fetch(`/api/v1/mcp-oauth/grants/${encodeURIComponent(grant.id)}`, { method: "DELETE", credentials: "same-origin" })
      if (!response.ok) throw new Error("This assistant could not be disconnected. Please try again.")
      setNotice({ error: false, message: `${grant.clientName} disconnected.` })
      router.refresh()
      notifyOtherTabs()
    } catch (error) {
      setNotice({ error: true, message: error instanceof Error ? error.message : "This assistant could not be disconnected." })
    } finally {
      setPending(null)
    }
  }

  return (
    <section aria-labelledby="mcp-assistants" aria-busy={loading} className="space-y-5 border-t border-border pt-6">
      <div>
        <h2 id="mcp-assistants" className="text-xl font-semibold">Connected assistants</h2>
        <p className="mt-1 text-sm text-muted-foreground">Connect ChatGPT or Claude using FortSprite&apos;s MCP URL and OAuth sign-in. Review each request before granting access.</p>
      </div>
      <div className="flex items-center gap-2">
        <Input aria-label="Assistant MCP URL" readOnly value={endpoint} className="min-w-0 font-mono text-xs" />
        <Button variant="outline" disabled={loading} onClick={copyEndpoint} aria-label="Copy assistant MCP URL"><CopyIcon /></Button>
      </div>
      {grants.length ? (
        <div className="divide-y divide-border rounded-xl border border-border">
          {grants.map((grant) => (
            <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="break-words font-medium">{grant.clientName}</p>
                <p className="text-xs text-muted-foreground">{grant.scopes.map((scope) => mcpScopeLabels[scope] ?? scope).join(" · ")}</p>
              </div>
              <Button variant="outline" disabled={pending !== null} aria-label={`Disconnect assistant ${grant.clientName}`} onClick={() => disconnect(grant)}>
                {pending === grant.id ? <LoaderCircleIcon className="animate-spin" /> : null}
                Disconnect
              </Button>
            </div>
          ))}
        </div>
      ) : <p role={loading ? "status" : undefined} className="flex min-h-20 items-center text-sm text-muted-foreground">{loading ? "Loading connected assistants…" : "No assistants connected yet."}</p>}
      {notice ? <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{notice.message}</p> : null}
    </section>
  )
}
