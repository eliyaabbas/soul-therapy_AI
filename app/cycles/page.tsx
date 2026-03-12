import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { redirect } from 'next/navigation'
import { sql } from '@vercel/postgres'
import CyclesClient from '@/components/soul/CyclesClient'

export default async function CyclesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/auth')

  // Load existing soul profile
  let profile = null
  try {
    const { rows } = await sql`
      SELECT * FROM soul_profiles WHERE user_id = ${session.user.id} LIMIT 1
    `
    if (rows[0]) profile = rows[0]
  } catch {
    // DB not set up yet — still works in dev
  }

  return (
    <CyclesClient
      user={{ id: session.user.id!, name: session.user.name, email: session.user.email, image: session.user.image }}
      initialProfile={profile as any}
    />
  )
}
