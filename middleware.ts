import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporarily disabled auth middleware until database is set up
// TODO: Enable authentication after PostgreSQL setup
export function middleware(req: NextRequest) {
  // Allow all requests for now
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}
