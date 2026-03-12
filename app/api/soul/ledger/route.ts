import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sql } from '@vercel/postgres'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const { rows } = await sql`
    SELECT * FROM soul_ledger
    WHERE user_id = ${session.user.id} AND date = ${date}
    ORDER BY created_at ASC
  `
  return NextResponse.json({ entries: rows })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cycle, conversation, sealNote, completed } = await req.json()

  await sql`
    INSERT INTO soul_ledger (user_id, cycle, conversation, seal_note, cycle_completed, sealed_at)
    VALUES (
      ${session.user.id},
      ${cycle},
      ${JSON.stringify(conversation)}::jsonb,
      ${sealNote || null},
      ${completed || false},
      ${completed ? new Date().toISOString() : null}
    )
    ON CONFLICT DO NOTHING
  `

  return NextResponse.json({ success: true })
}
