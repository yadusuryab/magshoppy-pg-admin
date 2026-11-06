/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/sanity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, params, mutation, document } = body
    
    // Verify user is authenticated via cookies
    const session = request.cookies.get('sanity_session')
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Create authenticated Sanity client
    const client = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      apiVersion: '2024-01-01',
      useCdn: false,
      token: process.env.SANITY_API_TOKEN,
    })
    
    let result
    
    if (query) {
      // Fetch data
      result = await client.fetch(query, params || {})
    } else if (mutation) {
      // Apply mutation
      if (mutation === 'create') {
        result = await client.create(document)
      } else if (mutation === 'patch') {
        const { id, set, inc, dec } = document
        const patch = client.patch(id)
        
        if (set) patch.set(set)
        if (inc) patch.inc(inc)
        if (dec) patch.dec(dec)
        
        result = await patch.commit()
      } else if (mutation === 'delete') {
        result = await client.delete(document.id)
      }
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Sanity API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}