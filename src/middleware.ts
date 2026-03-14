import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get("authorization")
  const user = process.env.ADMIN_BASIC_USER?.trim()
  const pass = process.env.ADMIN_BASIC_PASSWORD?.trim()

  if (!user || !pass) {
    return new NextResponse("Admin auth not configured (ADMIN_BASIC_USER / ADMIN_BASIC_PASSWORD).", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  if (!authHeader?.startsWith("Basic ")) {
    return new NextResponse("Basic authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin"',
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  }

  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8")
    const [u, p] = decoded.split(":", 2)
    if (u === user && p === pass) {
      return NextResponse.next()
    }
  } catch {
    // invalid base64
  }

  return new NextResponse("Invalid credentials.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
