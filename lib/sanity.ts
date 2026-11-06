/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/sanity.ts
import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: false, // Set to false for authenticated requests
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
})

const builder = imageUrlBuilder(client)

export function urlFor(source: any) {
  return builder.image(source)
}

// Shoe Schema Type
export interface Shoe {
  _id: string
  _type: 'shoe'
  orderNumber: number
  productName: string
  shoeBrand: string
  category: string
  sizes: number[]
  colorVariants: string[]
  tags: string[]
  images: any[]
  description: string
  madeIn: string
  price: number
  isOffer: boolean
  offerPrice?: number
  buyOneGetOne: boolean
  stock: number
  isDisabled: boolean
  disableReason?: string
}

// API Functions
export async function getAllShoes(): Promise<Shoe[]> {
  return await client.fetch(`
    *[_type == "shoe"] | order(orderNumber asc) {
      _id,
      _type,
      orderNumber,
      productName,
      shoeBrand,
      category,
      sizes,
      colorVariants,
      tags,
      images,
      description,
      madeIn,
      price,
      isOffer,
      offerPrice,
      buyOneGetOne,
      stock,
      isDisabled,
      disableReason
    }
  `)
}

export async function getShoe(id: string): Promise<Shoe> {
  return await client.fetch(`
    *[_type == "shoe" && _id == $id][0] {
      _id,
      _type,
      orderNumber,
      productName,
      shoeBrand,
      category,
      sizes,
      colorVariants,
      tags,
      images,
      description,
      madeIn,
      price,
      isOffer,
      offerPrice,
      buyOneGetOne,
      stock,
      isDisabled,
      disableReason
    }
  `, { id })
}

export async function createShoe(shoe: Omit<Shoe, '_id' | '_type'>) {
  return await client.create({
    _type: 'shoe',
    ...shoe,
  })
}

export async function updateShoe(id: string, data: Partial<Shoe>) {
  return await client
    .patch(id)
    .set(data)
    .commit()
}

export async function deleteShoe(id: string) {
  return await client.delete(id)
}

// lib/sanity.ts - Add this function
export async function uploadImage(file: File) {
  try {
    const asset = await client.assets.upload('image', file, {
      filename: file.name,
    })
    
    return {
      _type: 'image',
      asset: {
        _type: 'reference',
        _ref: asset._id,
      },
    }
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}