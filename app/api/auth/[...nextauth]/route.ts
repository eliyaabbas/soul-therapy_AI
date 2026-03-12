import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import FacebookProvider from 'next-auth/providers/facebook'
import AppleProvider from 'next-auth/providers/apple'
import CredentialsProvider from 'next-auth/providers/credentials'
import { sql } from '@vercel/postgres'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth',
    error: '/auth?error=true',
  },

  providers: [
    // ── Google ──────────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: { params: { prompt: 'consent', access_type: 'offline', response_type: 'code' } },
    }),

    // ── Facebook (also covers Instagram business login) ─────────────────────
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),

    // ── Apple ───────────────────────────────────────────────────────────────
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: {
        appleId: process.env.APPLE_ID!,
        teamId: process.env.APPLE_TEAM_ID!,
        privateKey: process.env.APPLE_PRIVATE_KEY!,
        keyId: process.env.APPLE_KEY_ID!,
      } as any,
    }),

    // ── Email / Password ────────────────────────────────────────────────────
    CredentialsProvider({
      id: 'email-password',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const { rows } = await sql`
            SELECT * FROM users WHERE email = ${credentials.email} LIMIT 1
          `
          const user = rows[0]
          if (!user || !user.password_hash) return null
          const valid = await bcrypt.compare(credentials.password, user.password_hash)
          if (!valid) return null
          return { id: user.id, name: user.name, email: user.email, image: user.image }
        } catch { return null }
      },
    }),

    // ── Phone / OTP ─────────────────────────────────────────────────────────
    CredentialsProvider({
      id: 'phone-otp',
      name: 'Phone',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null
        try {
          // Verify OTP from DB
          const { rows: tokens } = await sql`
            SELECT * FROM verification_tokens
            WHERE identifier = ${credentials.phone}
            AND token = ${credentials.otp}
            AND expires > NOW()
            LIMIT 1
          `
          if (!tokens[0]) return null

          // Delete used token
          await sql`
            DELETE FROM verification_tokens WHERE identifier = ${credentials.phone}
          `

          // Upsert user
          const { rows } = await sql`
            INSERT INTO users (phone, phone_verified)
            VALUES (${credentials.phone}, NOW())
            ON CONFLICT (phone) DO UPDATE SET phone_verified = NOW(), updated_at = NOW()
            RETURNING *
          `
          const user = rows[0]
          return { id: user.id, name: user.name, email: user.email, image: user.image }
        } catch { return null }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return true
      if (account.provider === 'credentials') return true

      try {
        // Upsert OAuth user
        const email = user.email
        let userId: string

        if (email) {
          const { rows } = await sql`
            INSERT INTO users (email, name, image, email_verified)
            VALUES (${email}, ${user.name}, ${user.image}, NOW())
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              image = EXCLUDED.image,
              updated_at = NOW()
            RETURNING id
          `
          userId = rows[0].id
        } else {
          const { rows } = await sql`
            INSERT INTO users (name, image)
            VALUES (${user.name}, ${user.image})
            RETURNING id
          `
          userId = rows[0].id
        }

        // Upsert OAuth account link
        await sql`
          INSERT INTO accounts (user_id, provider, provider_account_id, access_token, refresh_token, expires_at)
          VALUES (
            ${userId},
            ${account.provider},
            ${account.providerAccountId},
            ${account.access_token ?? null},
            ${account.refresh_token ?? null},
            ${account.expires_at ?? null}
          )
          ON CONFLICT (provider, provider_account_id) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = EXCLUDED.refresh_token,
            expires_at = EXCLUDED.expires_at
        `

        user.id = userId
      } catch (e) {
        console.error('SignIn DB error:', e)
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) token.uid = user.id
      return token
    },

    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
