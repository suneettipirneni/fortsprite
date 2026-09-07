import { type NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const signInUrl = new URL("/sign-in", request.url)
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  )

  try {
    const { app } = await import("@fortsprite/api/app")
    const response = await app.request("/api/auth/get-session", {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    })

    if (response.ok && (await response.json())) {
      const next = NextResponse.next()
      for (const cookie of response.headers.getSetCookie()) {
        next.headers.append("set-cookie", cookie)
      }
      return next
    }
  } catch {}

  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|sign-in|terms|privacy|_next/static|_next/image|.*\\.(?:avif|gif|ico|jpe?g|png|svg|webp)$|robots.txt|sitemap.xml).*)",
  ],
}
