import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  try {
    // This creates a Supabase client that specifically works with
    // Middleware and Server Components. It reads available cookies
    // and returns modified response object with updated cookies.
    const { supabase, response } = createClient(request)

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
    const { data: { session } } = await supabase.auth.getSession()

    const { pathname } = request.nextUrl;

    // If user is not logged in and tries to access dashboard, redirect to login
    if (!session && pathname.startsWith('/dashboard')) {
      const url = new URL('/auth/login', request.url);
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }

    // If user is logged in and tries to access login page, redirect to dashboard
    if (session && pathname === '/auth/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // IMPORTANT: Avoid writing handling logic here. Ensure response is returned unmodified.
    return response
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely due to missing environment variables.
    // Check your .env file and ensure they are present.
    console.error("Error in middleware:", e)
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // Apply middleware to auth routes as well to handle redirection if logged in
    '/auth/login',
  ],
} 