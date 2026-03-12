import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parse = RegisterSchema.safeParse(body)
    if (!parse.success) {
      return NextResponse.json({ error: parse.error.errors[0].message }, { status: 400 })
    }
    const { name, email, password } = parse.data

    // Check if user exists
    const { rows: existing } = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `
    if (existing[0]) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const { rows } = await sql`
      INSERT INTO users (name, email, password_hash, email_verified)
      VALUES (${name}, ${email}, ${hash}, NOW())
      RETURNING id, name, email
    `
    return NextResponse.json({ success: true, user: rows[0] })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
