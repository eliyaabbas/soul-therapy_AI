import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { z } from 'zod'

const SendSchema = z.object({ phone: z.string().min(8) })
const VerifySchema = z.object({ phone: z.string(), otp: z.string().length(6) })

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP via Twilio
async function sendSMS(to: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !from) {
    // Dev mode: log OTP instead
    console.log(`[DEV] OTP for ${to}: ${code}`)
    return
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `Your SoulTherapy verification code: ${code}\n\nThis code expires in 10 minutes.\n\n"The strong person is one who controls himself." — Prophet ﷺ`,
  })

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  // ── Send OTP ──────────────────────────────────────────────────────────────
  if (action === 'send') {
    const parse = SendSchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    const { phone } = parse.data

    // Rate limit: max 3 OTPs per phone per 10 min
    const { rows } = await sql`
      SELECT COUNT(*) as count FROM verification_tokens
      WHERE identifier = ${phone} AND created_at > NOW() - INTERVAL '10 minutes'
    `
    if (parseInt(rows[0].count) >= 3) {
      return NextResponse.json({ error: 'Too many attempts. Wait 10 minutes.' }, { status: 429 })
    }

    const otp = generateOTP()
    const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    // Store token
    await sql`
      DELETE FROM verification_tokens WHERE identifier = ${phone}
    `
    await sql`
      INSERT INTO verification_tokens (identifier, token, expires)
      VALUES (${phone}, ${otp}, ${expires.toISOString()})
    `

    await sendSMS(phone, otp)
    return NextResponse.json({ success: true, message: 'OTP sent' })
  }

  // ── Verify OTP (just check, actual auth happens in NextAuth) ──────────────
  if (action === 'verify') {
    const parse = VerifySchema.safeParse(body)
    if (!parse.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    const { phone, otp } = parse.data

    const { rows } = await sql`
      SELECT * FROM verification_tokens
      WHERE identifier = ${phone} AND token = ${otp} AND expires > NOW()
      LIMIT 1
    `
    if (!rows[0]) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
