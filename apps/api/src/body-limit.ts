import { bodyLimit } from "hono/body-limit"
import { createMiddleware } from "hono/factory"

export function limitBody(maxSize: number) {
  const tooLarge = () =>
    Response.json(
      {
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "This request is too large.",
        },
      },
      { status: 413 },
    )
  const limit = bodyLimit({ maxSize, onError: tooLarge })
  return createMiddleware(async (context, next) => {
    const request = context.req.raw
    if (Number(request.headers.get("content-length")) > maxSize)
      return tooLarge()
    if (request.body && request.headers.has("content-length")) {
      // Hono trusts Content-Length when present. At our Fetch boundary, validate
      // the actual stream too, including internally constructed server-action requests.
      const headers = new Headers(request.headers)
      headers.delete("content-length")
      context.req.raw = new Request(request.url, {
        method: request.method,
        headers,
        body: request.body,
        duplex: "half",
      } as RequestInit)
    }
    return limit(context, next)
  })
}
