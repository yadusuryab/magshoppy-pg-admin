// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret')
const adminEmail = process.env.ADMIN_EMAIL || 'admin@shoes.com'
const adminPassword =  '$2b$10$K4j1xE/B6XiyOy3qPvdSj.0K7uGGgzqtKzTCSJ3mbP0HkaCcYHuO2'

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string) {
    console.log(password, hashedPassword)
  return await bcrypt.compare(password, hashedPassword)
}

export async function createSession(email: string) {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
  
  return token
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function authenticate(email: string, password: string) {
  // In production, you'd fetch from database
  // For now, check against environment variables
  if (email !== adminEmail) {
    return null
  }
  
  if (!adminPassword) {
    // First time setup - create password hash
    const hashed = await hashPassword(password)
    console.log('Set this in ADMIN_PASSWORD:', hashed)
    return null
  }
  
  const isValid = await verifyPassword(password, adminPassword)
  return isValid ? email : null
}