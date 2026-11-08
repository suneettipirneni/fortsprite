import { type NextRequest, NextResponse } from "next/server"

function sessionUnavailable() {
  return new NextResponse(
    "FortSprite could not check your sign-in. Please reload in a moment.",
    {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "10" },
    },
  )
}

export async function proxy(request: NextRequest) {
  const signInUrl = new URL("/sign-in", request.url)
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  )

  try {
    // Proxy runs separately on Vercel. Keep database/auth execution in the API
    // function, where the same session is also checked for protected data.
    // Use the configured origin so request headers cannot redirect credentials.
    const response = await fetch(new URL("/api/auth/get-session", process.env.BETTER_AUTH_URL), {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) return sessionUnavailable()
    const session: unknown = await response.json()
    if (session !== null && (
      typeof session !== "object" ||
      !("user" in session) || !session.user ||
      !("session" in session) || !session.session
    )) return sessionUnavailable()

    const next = session ? NextResponse.next() : NextResponse.redirect(signInUrl)
    next.headers.set("Cache-Control", "no-store")
    for (const cookie of response.headers.getSetCookie()) {
      next.headers.append("set-cookie", cookie)
    }
    return next
  } catch {
    return sessionUnavailable()
  }
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|\\.well-known(?:/|$)|mcp/consent(?:/|$)|sign-in|terms|privacy|offline|manifest.webmanifest|sw.js|opengraph-image|twitter-image|_next/static|_next/image|.*\\.(?:avif|gif|ico|jpe?g|png|svg|webp)$|robots.txt|sitemap.xml).*)",
  ],
}
