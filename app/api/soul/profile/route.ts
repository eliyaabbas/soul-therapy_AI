import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { sql } from '@vercel/postgres'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows } = await sql`
    SELECT * FROM soul_profiles WHERE user_id = ${session.user.id} LIMIT 1
  `
  return NextResponse.json({ profile: rows[0] || null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { dominantPower, vices, viceArabic, virtue, virtueArabic, aqlScore, ghadabScore, shahwahScore, summary } = body

  await sql`
    INSERT INTO soul_profiles (user_id, dominant_power, vices, vice_arabic, virtue, virtue_arabic, aql_score, ghadab_score, shahwah_score, summary, assessment_completed)
    VALUES (${session.user.id}, ${dominantPower}, ${JSON.stringify(vices)}, ${JSON.stringify(viceArabic)}, ${virtue}, ${virtueArabic}, ${aqlScore}, ${ghadabScore}, ${shahwahScore}, ${summary}, TRUE)
    ON CONFLICT (user_id) DO UPDATE SET
      dominant_power = EXCLUDED.dominant_power,
      vices = EXCLUDED.vices,
      vice_arabic = EXCLUDED.vice_arabic,
      virtue = EXCLUDED.virtue,
      virtue_arabic = EXCLUDED.virtue_arabic,
      aql_score = EXCLUDED.aql_score,
      ghadab_score = EXCLUDED.ghadab_score,
      shahwah_score = EXCLUDED.shahwah_score,
      summary = EXCLUDED.summary,
      assessment_completed = TRUE,
      updated_at = NOW()
  `
  return NextResponse.json({ success: true })
}
