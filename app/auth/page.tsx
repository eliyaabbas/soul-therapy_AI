import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions'
import { redirect } from 'next/navigation'
import AuthClient from '@/components/auth/AuthClient'

export default async function AuthPage() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/cycles')
  return <AuthClient />
}
