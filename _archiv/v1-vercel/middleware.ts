import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths: login page and auth API
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const password = process.env.DASHBOARD_PASSWORD
  // If no password is configured, allow access (useful during setup)
  if (!password) return NextResponse.next()

  const authCookie = request.cookies.get('auth')?.value
  if (authCookie === password) return NextResponse.next()

  // Redirect to login
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
