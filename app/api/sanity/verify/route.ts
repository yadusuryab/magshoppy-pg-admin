// app/api/sanity/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/sanity'

export async function POST(request: NextRequest) {
  try {
    // Test if the configured client can connect
    const testQuery = '*[_type == "shoe"][0...1]{_id}'
    await client.fetch(testQuery)
    
    return NextResponse.json({ verified: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
}