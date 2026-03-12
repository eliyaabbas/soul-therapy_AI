-- ─── SoulTherapy Database Schema ─────────────────────────────────────────────
-- Run this in Vercel Postgres SQL editor or via: vercel env pull && psql $POSTGRES_URL < schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50) UNIQUE,
  email_verified TIMESTAMPTZ,
  phone_verified TIMESTAMPTZ,
  image TEXT,
  password_hash TEXT, -- NULL for OAuth users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,        -- 'google' | 'facebook' | 'apple' | 'instagram'
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions (for NextAuth database strategy)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

-- Verification tokens (email/phone OTP)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,    -- email or phone
  token VARCHAR(20) NOT NULL,          -- OTP code
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (identifier, token)
);

-- Soul profiles (one per user, updated over time)
CREATE TABLE IF NOT EXISTS soul_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dominant_power VARCHAR(50),          -- 'Aql' | 'Ghadab' | 'Shahwah'
  vices TEXT[],                        -- array of vice names
  vice_arabic TEXT[],
  virtue VARCHAR(100),
  virtue_arabic VARCHAR(100),
  aql_score INT DEFAULT 50,            -- 0=pure vice, 100=pure virtue
  ghadab_score INT DEFAULT 50,
  shahwah_score INT DEFAULT 50,
  summary TEXT,
  assessment_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily soul ledger entries
CREATE TABLE IF NOT EXISTS soul_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  cycle VARCHAR(20) NOT NULL,          -- 'musharatah' | 'muraqabah' | 'muhasabah' | 'muaqabah'
  cycle_completed BOOLEAN DEFAULT FALSE,
  conversation JSONB DEFAULT '[]',     -- [{role, content, timestamp}]
  seal_note TEXT,                      -- closing reflection
  sealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Soul conversations (full AI chat history per session)
CREATE TABLE IF NOT EXISTS soul_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(20) NOT NULL,   -- 'assessment' | 'cycle'
  cycle VARCHAR(20),
  messages JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_soul_ledger_user_date ON soul_ledger(user_id, date);
CREATE INDEX IF NOT EXISTS idx_soul_conversations_user ON soul_conversations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
