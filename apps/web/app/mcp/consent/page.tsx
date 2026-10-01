import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { cookies } from "next/headers"
import { io } from "next/cache"
import { FortSpriteIcon } from "@/components/fortsprite-icon"
import { McpConsent } from "@/components/mcp-consent"
import type { McpOAuthConsent } from "@/lib/mcp-oauth"

export const metadata: Metadata = { title: "Connect assistant" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function ConsentPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="locker-stage auth-safe-area flex min-h-dvh items-center justify-center px-6 py-12">
      <section className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-background/90 p-6 shadow-xl backdrop-blur-sm sm:p-8">
        <Link href="/" aria-label="FortSprite homepage" className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <FortSpriteIcon size={32} className="text-[#9cfab5]" />
          FortSprite
        </Link>
        <Suspense fallback={<p role="status" className="min-h-60 text-sm text-muted-foreground">Loading connection request…</p>}>
          <ConsentRequest searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  )
}

async function ConsentRequest({ searchParams }: { searchParams: SearchParams }) {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(name, item)
  }
  const cookieStore = await cookies()
  await io()
  const { app } = await import("@fortsprite/api/app")
  const response = await app.request(`/api/v1/mcp-oauth/consent?${new URLSearchParams({ oauth_query: params.toString() })}`, {
    headers: { cookie: cookieStore.toString() },
  })
  if (!response.ok) return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold tracking-tight">Connection request unavailable</h1>
      <p className="text-pretty text-sm text-muted-foreground">This request has expired or could not be verified. Start the connection again from your assistant and sign in to FortSprite.</p>
    </div>
  )
  return <McpConsent request={await response.json() as McpOAuthConsent} />
}
