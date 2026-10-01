"use client"

import type { ApiErrorResponse, McpKeyCredential, McpKeySummary } from "@workspace/contracts"
import { CopyIcon, KeyRoundIcon, LoaderCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { notifyOtherTabs } from "@/lib/cross-tab-refresh"

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, credentials: "same-origin" })
  const body = await response.json().catch(() => null)
  if (!response.ok)
    throw new Error((body as ApiErrorResponse | null)?.error?.message ?? "The MCP key request failed. Please try again.")
  return body as T
}

export function McpKeyManager({ keys, endpoint, loading = false }: { keys: McpKeySummary[]; endpoint: string; loading?: boolean }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [credential, setCredential] = useState<McpKeyCredential | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null)

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending("create")
    setNotice(null)
    try {
      const result = await request<{ credential: McpKeyCredential }>("/api/v1/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      setCredential(result.credential)
      setName("")
      router.refresh()
      notifyOtherTabs()
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "The MCP key could not be created.", error: true })
    } finally {
      setPending(null)
    }
  }

  async function revokeKey(id: string) {
    setPending(id)
    setNotice(null)
    try {
      await request(`/api/v1/mcp-keys/${encodeURIComponent(id)}`, { method: "DELETE" })
      if (credential?.id === id) setCredential(null)
      setNotice({ message: "MCP key revoked.", error: false })
      router.refresh()
      notifyOtherTabs()
    } catch (error) {
      setNotice({ message: error instanceof Error ? error.message : "The MCP key could not be revoked.", error: true })
    } finally {
      setPending(null)
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice({ message: `${label} copied.`, error: false })
    } catch {
      setNotice({ message: "Copy failed. Select and copy the text manually.", error: true })
    }
  }

  return (
    <section aria-labelledby="mcp-access" aria-busy={loading} className="space-y-5 border-t border-border pt-6">
      <div>
        <h2 id="mcp-access" className="text-xl font-semibold">MCP access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect an AI assistant to read your collection and change owned or mastered status.
          Each key expires after 90 days. Revoke it here to stop access.
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">Use this remote MCP URL with an Authorization header containing Bearer followed by your key.</p>
        <div className="flex items-center gap-2">
          <Input aria-label="Remote MCP URL" readOnly value={endpoint} className="min-w-0 font-mono text-xs" />
          <Button variant="outline" disabled={loading} onClick={() => copy(endpoint, "MCP URL")} aria-label="Copy MCP URL"><CopyIcon /></Button>
        </div>
      </div>
      {credential ? (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Copy your new key now. FortSprite shows it only once.</p>
          <div className="flex items-center gap-2">
            <Input aria-label="New MCP key" readOnly value={credential.key} className="min-w-0 font-mono text-xs" />
            <Button variant="outline" onClick={() => copy(credential.key, "MCP key")} aria-label="Copy MCP key"><CopyIcon /></Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCredential(null)}>Done, hide key</Button>
        </div>
      ) : null}
      {keys.length ? (
        <div className="divide-y divide-border rounded-xl border border-border">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{key.start}…</span>
                  {key.expiresAt ? ` · Expires ${new Date(key.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}` : ""}
                </p>
              </div>
              <Button variant="outline" disabled={pending !== null} aria-label={`Revoke MCP key ${key.name}`} onClick={() => revokeKey(key.id)}>
                {pending === key.id ? <LoaderCircleIcon className="animate-spin" /> : null}
                Revoke
              </Button>
            </div>
          ))}
        </div>
      ) : <p role={loading ? "status" : undefined} className="flex min-h-20 items-center text-sm text-muted-foreground">{loading ? "Loading MCP keys…" : "No MCP keys created yet."}</p>}
      <form onSubmit={createKey} className="flex flex-col gap-3 sm:flex-row">
        <Input value={name} onChange={(event) => setName(event.target.value)} disabled={loading} maxLength={40} required placeholder="Key name, e.g. Desktop assistant" aria-label="MCP key name" />
        <Button type="submit" disabled={loading || pending !== null || !name.trim()}>
          {pending === "create" ? <LoaderCircleIcon className="animate-spin" /> : <KeyRoundIcon />}
          Create MCP key
        </Button>
      </form>
      {notice ? <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{notice.message}</p> : null}
    </section>
  )
}
