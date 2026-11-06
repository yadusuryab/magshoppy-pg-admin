// app/api/auth/sanity/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.redirect(new URL('/login?error=no_session', request.url))
    }

    // Verify the session with Sanity (simplified - in production, you'd make an API call)
    // For now, we'll store the session ID in cookies
    
    const response = NextResponse.redirect(new URL('/admin', request.url))
    
    // Set secure HTTP-only cookie
    response.cookies.set({
      name: 'sanity_session',
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
    
    return response
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
  }
}