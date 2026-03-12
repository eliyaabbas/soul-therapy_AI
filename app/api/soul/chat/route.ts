import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import Anthropic from '@anthropic-ai/sdk'
import { sql } from '@vercel/postgres'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_BASE = `You are a wise spiritual guide deeply versed in "Jami' al-Sa'adat" (The Collector of Felicities) by Mulla Ahmad al-Naraqi, and the works of Al-Ghazali, Ibn Qayyim al-Jawziyyah, and classical Islamic ethics.

THE 4 POWERS OF THE SOUL:
1. 'Aql (Intellect) — virtue: Hikmah (Wisdom) | vice: Jahl (Ignorance), Jarbazah (cunning)
2. Ghadab (Anger) — virtue: Shaja'ah (Courage) | vice: Tahawwur (recklessness), Jubn (cowardice)
3. Shahwah (Desire) — virtue: 'Iffah (Temperance) | vice: Fujur (licentiousness), Khumud (suppression)
4. 'Adalah (Justice) — the balance of all three

MOTHER VICES: Kibr (arrogance), Hasad (envy), Riya' (ostentation), Nifaq (hypocrisy), Hubb al-Dunya (worldly attachment), Ghibah (backbiting), Kadhib (lying), Ujb (self-conceit), Hirs (greed), Bukhl (miserliness), Jubn (cowardice), Tahawwur (recklessness)

MOTHER VIRTUES: Hikmah, Shaja'ah, 'Iffah, 'Adalah, Tawadu' (Humility), Sabr (Patience), Shukr (Gratitude), Tawakkul (Trust), Ikhlas (Sincerity), Sidq (Truthfulness), Zuhd (Detachment)

THE 4 CYCLES:
1. MUSHARATAH (المشارطة) — Morning contract: stipulate with your soul against specific vices
2. MURAQABAH (المراقبة) — Watchfulness: vigilance through the day, Allah sees all
3. MUHASABAH (المحاسبة) — Evening reckoning: honest accounting of gains and losses
4. MU'ATABAH (المعاتبة) — Reproach & renewal: loving discipline, then renewed resolve

STYLE: Warm, Socratic, never preachy. One question at a time. Arabic terms with gentle translation. 2-4 sentences max unless giving a prescription. You are a listener and guide, not a lecturer.`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messages, phase, cycle, conversationId } = await req.json()
    const userId = session.user.id
    const userMsgCount = messages.filter((m: any) => m.role === 'user').length

    let systemExtra = ''

    if (phase === 'assessment') {
      if (userMsgCount <= 3) {
        systemExtra = `ASSESSMENT question ${userMsgCount + 1}. Ask ONE follow-up to understand their vices, triggers, and dominant soul-power. Be brief.`
      } else if (userMsgCount === 4) {
        systemExtra = `Ask one final question: which soul-power do they feel most imbalanced in — intellect ('Aql), anger (Ghadab), or desire (Shahwah)?`
      } else {
        systemExtra = `You have enough information. Do:
1. Reflect back their soul state warmly (2-3 sentences)
2. Name TOP 2 vices from the taxonomy (Arabic + English)
3. Name their strongest virtue
4. Tell them you'll guide them through the 4 cycles

End your message with EXACTLY this (raw JSON, no markdown):
SOUL_PROFILE:{"dominantPower":"Ghadab","vices":["Kibr","Hasad"],"viceArabic":["الكبر","الحسد"],"virtue":"Sabr","virtueArabic":"الصبر","aqlScore":55,"ghadabScore":30,"shahwahScore":60,"summary":"One sentence portrait of their soul."}`
      }
    } else if (phase === 'cycle') {
      const cycleNames: Record<string, string> = {
        musharatah: 'Musharatah (المشارطة) — The Morning Contract',
        muraqabah: 'Muraqabah (المراقبة) — Watchfulness',
        muhasabah: 'Muhasabah (المحاسبة) — The Evening Reckoning',
        muaqabah: "Mu'atabah (المعاتبة) — Reproach & Renewal",
      }
      systemExtra = `The user is in the ${cycleNames[cycle] || cycle} cycle of Jami al-Sa'adat. Guide them specifically through this practice. Reference their soul profile if relevant. Ask one focused question. 3-4 sentences max.`
    } else if (phase === 'cycle-open') {
      const cycleDesc: Record<string, string> = {
        musharatah: 'Help them set a specific, actionable soul contract for the day against their vices.',
        muraqabah: 'Help them reflect on moments of watchfulness or slippage today.',
        muhasabah: 'Guide them in an honest accounting of what the soul gained and lost today.',
        muaqabah: 'Help them face any breach with constructive reproach and plan renewal.',
      }
      systemExtra = `Open the ${cycle} cycle. 2 sentences: what this cycle is per Jami al-Sa'adat. Then: ${cycleDesc[cycle] || ''} One guiding question. Reference their known vices. Warm and brief.`
    } else if (phase === 'cycle-seal') {
      systemExtra = `Seal this cycle beautifully. 1 sentence: soul's accomplishment. 1 sentence: brief du'a or reflection. 1 sentence: what to carry forward. Poetic and warm.`
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: SYSTEM_BASE + (systemExtra ? '\n\n' + systemExtra : ''),
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract soul profile if present
    let profile = null
    if (text.includes('SOUL_PROFILE:')) {
      const [, jsonPart] = text.split('SOUL_PROFILE:')
      try {
        profile = JSON.parse(jsonPart.trim())
        // Save to DB
        await sql`
          INSERT INTO soul_profiles (user_id, dominant_power, vices, vice_arabic, virtue, virtue_arabic, aql_score, ghadab_score, shahwah_score, summary, assessment_completed)
          VALUES (
            ${userId},
            ${profile.dominantPower},
            ${JSON.stringify(profile.vices)},
            ${JSON.stringify(profile.viceArabic)},
            ${profile.virtue},
            ${profile.virtueArabic},
            ${profile.aqlScore},
            ${profile.ghadabScore},
            ${profile.shahwahScore},
            ${profile.summary},
            TRUE
          )
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
      } catch (e) {
        console.error('Profile parse error:', e)
      }
    }

    // Save conversation turn if conversationId
    if (conversationId) {
      await sql`
        UPDATE soul_conversations SET
          messages = messages || ${JSON.stringify([
            ...messages.slice(-2),
            { role: 'assistant', content: text, timestamp: new Date().toISOString() }
          ])}::jsonb,
          updated_at = NOW()
        WHERE id = ${conversationId} AND user_id = ${userId}
      `
    }

    return NextResponse.json({
      content: profile ? text.split('SOUL_PROFILE:')[0].trim() : text,
      profile,
    })
  } catch (e) {
    console.error('Soul API error:', e)
    return NextResponse.json({ error: 'The soul needs a moment. Please try again.' }, { status: 500 })
  }
}
