import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;
  
  console.log(`[Middleware] Processing request for: ${pathname}`);
  
  // Check if it's a dashboard route
  if (pathname.startsWith('/dashboard')) {
    // Get auth session token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    
    console.log(`[Middleware] Auth token for dashboard route: ${authToken ? 'Present' : 'Missing'}`);
    
    // If no token, redirect to login
    if (!authToken) {
      const url = new URL('/auth/login', request.url);
      // Add redirectTo param to redirect back after login
      url.searchParams.set('redirectTo', pathname);
      console.log(`[Middleware] Redirecting to: ${url.toString()}`);
      return NextResponse.redirect(url);
    }
    
    console.log(`[Middleware] User authenticated, proceeding to dashboard`);
  }

  // Continue the request for public routes or if authenticated
  return NextResponse.next();
}

// Add dashboard routes to middleware matcher
export const config = {
  matcher: [
    /*
     * Match all dashboard paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (Static assets)
     * 4. /favicon.ico, /site.webmanifest, etc.
     * 5. /auth routes
     */
    '/dashboard/:path*',
  ],
}; 