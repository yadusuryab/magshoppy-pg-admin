// app/api/products/[id]/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@sanity/client'
import { verifySession } from '@/lib/auth'

// Create a server-side Sanity client with write token
const serverSanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN, // needs write token - add to .env.local
  useCdn: false,
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify authentication
    const token = request.cookies.get('admin_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await verifySession(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('image') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload image asset to Sanity
    const imageAsset = await serverSanityClient.assets.upload('image', buffer, {
      filename: file.name,
      contentType: file.type,
    })

    // Patch the shoe document with the new image
    await serverSanityClient
      .patch(id)
      .set({
        images: [
          {
            _type: 'image',
            _key: crypto.randomUUID(),
            asset: {
              _type: 'reference',
              _ref: imageAsset._id,
            },
          },
        ],
      })
      .commit()

    return NextResponse.json({
      success: true,
      imageRef: imageAsset._id,
    })
  } catch (error: unknown) {
    console.error('Image upload error:', error)
    const message = error instanceof Error ? error.message : 'Failed to upload image'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}