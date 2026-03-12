'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthMode = 'choose' | 'email-login' | 'email-register' | 'phone-entry' | 'phone-otp'
type SocialProvider = 'google' | 'facebook' | 'apple'

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
  padding: '13px 16px', color: '#DDD5C4', fontSize: 15,
  fontFamily: 'var(--font-serif)', transition: 'all 0.2s',
}

function SocialButton({ provider, label, icon, color, bg, onClick, loading }: {
  provider: SocialProvider, label: string, icon: React.ReactNode
  color: string, bg: string, onClick: () => void, loading?: boolean
}) {
  return (
    <button onClick={onClick} disabled={loading}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 20px', background: bg, border: `1px solid ${color}33`, borderRadius: 10, color: '#DDD5C4', fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s', opacity: loading ? 0.6 : 1 }}>
      {icon}
      <span>{loading ? 'Connecting…' : label}</span>
    </button>
  )
}

function Divider({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

// ─── OTP Boxes ────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const digits = value.padEnd(6, ' ').split('')
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input key={i} type="text" inputMode="numeric" maxLength={1}
          value={digits[i].trim()}
          onChange={e => {
            const d = e.target.value.replace(/\D/g, '').slice(-1)
            const arr = value.padEnd(6, '').split('')
            arr[i] = d
            onChange(arr.join('').trim())
            // Auto-focus next
            if (d && i < 5) {
              const next = document.getElementById(`otp-${i + 1}`)
              next?.focus()
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
              document.getElementById(`otp-${i - 1}`)?.focus()
            }
          }}
          id={`otp-${i}`}
          style={{ width: 46, height: 54, textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#DDD5C4', fontSize: 22, fontFamily: 'var(--font-mono)', transition: 'all 0.2s' }}
        />
      ))}
    </div>
  )
}

// ─── Country selector + phone input ──────────────────────────────────────────
const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'SA' },
  { code: '+92', flag: '🇵🇰', name: 'PK' },
  { code: '+91', flag: '🇮🇳', name: 'IN' },
  { code: '+60', flag: '🇲🇾', name: 'MY' },
  { code: '+62', flag: '🇮🇩', name: 'ID' },
  { code: '+20', flag: '🇪🇬', name: 'EG' },
  { code: '+90', flag: '🇹🇷', name: 'TR' },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthClient() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('choose')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Email fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Phone fields
  const [countryCode, setCountryCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  function clearError() { setError('') }

  // ── Social Sign In ──────────────────────────────────────────────────────────
  async function socialSignIn(provider: SocialProvider) {
    setLoading(provider); setError('')
    await signIn(provider, { callbackUrl: '/cycles' })
  }

  // ── Email Register ──────────────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading('email')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(null); return }
      // Auto-login
      const result = await signIn('email-password', { email, password, redirect: false })
      if (result?.ok) router.push('/cycles')
      else setError('Login failed after registration')
    } catch { setError('Network error') }
    setLoading(null)
  }

  // ── Email Login ─────────────────────────────────────────────────────────────
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading('email')
    const result = await signIn('email-password', { email, password, redirect: false })
    setLoading(null)
    if (result?.ok) router.push('/cycles')
    else setError('Invalid email or password')
  }

  // ── Phone: Send OTP ─────────────────────────────────────────────────────────
  async function sendOTP() {
    if (!phone.trim()) { setError('Enter your phone number'); return }
    setLoading('otp-send'); setError('')
    const fullPhone = countryCode + phone.replace(/\D/g, '')
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone: fullPhone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(null); return }
      setOtpSent(true); setMode('phone-otp')
      // Countdown
      let t = 60
      setResendTimer(t)
      const interval = setInterval(() => { t--; setResendTimer(t); if (t <= 0) clearInterval(interval) }, 1000)
    } catch { setError('Failed to send OTP') }
    setLoading(null)
  }

  // ── Phone: Verify OTP ───────────────────────────────────────────────────────
  async function verifyOTP() {
    if (otp.length < 6) { setError('Enter the 6-digit code'); return }
    setLoading('otp-verify'); setError('')
    const fullPhone = countryCode + phone.replace(/\D/g, '')
    const result = await signIn('phone-otp', { phone: fullPhone, otp, redirect: false })
    setLoading(null)
    if (result?.ok) router.push('/cycles')
    else setError('Invalid or expired code')
  }

  const S = {
    wrap: { minHeight: '100vh', background: '#070709', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '20px 20px 60px', position: 'relative' as const, overflow: 'hidden' },
    glow: { position: 'fixed' as const, inset: 0, background: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(184,134,11,0.18), transparent 65%)', pointerEvents: 'none' as const, zIndex: 0 },
    card: { position: 'relative' as const, zIndex: 2, width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', backdropFilter: 'blur(12px)' },
    header: { textAlign: 'center' as const, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: 400, letterSpacing: -0.5, color: '#DDD5C4', marginBottom: 4 },
    sub: { fontSize: 13, color: 'rgba(221,213,196,0.4)', fontFamily: 'var(--font-mono)' },
    label: { display: 'block' as const, fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase' as const },
    field: { marginBottom: 16 },
    btn: (bg = '#B8860B', outline = false): React.CSSProperties => ({ width: '100%', padding: '14px 20px', background: outline ? 'transparent' : bg, border: `1.5px solid ${bg}`, color: outline ? bg : '#070709', borderRadius: 10, fontSize: 13, fontWeight: 700, letterSpacing: 1.2, cursor: 'pointer', fontFamily: 'var(--font-serif)', textTransform: 'uppercase' as const, transition: 'all 0.2s' }),
    error: { background: 'rgba(139,58,58,0.15)', border: '1px solid rgba(139,58,58,0.35)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#E09090', marginBottom: 16 },
    back: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono)', padding: '0 0 20px', letterSpacing: 1 },
    link: { background: 'none', border: 'none', color: '#B8860B', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-serif)', textDecoration: 'underline', textDecorationColor: 'rgba(184,134,11,0.3)' },
  }

  // ── CHOOSE MODE ─────────────────────────────────────────────────────────────
  if (mode === 'choose') return (
    <div style={S.wrap}>
      <div className="grain-overlay" />
      <div style={S.glow} />
      <div style={S.card} className="animate-fade-up">
        <div style={S.header}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>☽</div>
          <h1 style={S.title}>SoulTherapy</h1>
          <p style={{ ...S.sub, marginTop: 6 }}>Begin your journey of self-purification</p>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Social Providers */}
          <SocialButton provider="google" label="Continue with Google" bg="rgba(66,133,244,0.08)" color="#4285F4" loading={loading === 'google'} onClick={() => socialSignIn('google')}
            icon={<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
          />

          <SocialButton provider="facebook" label="Continue with Facebook" bg="rgba(24,119,242,0.08)" color="#1877F2" loading={loading === 'facebook'} onClick={() => socialSignIn('facebook')}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
          />

          {/* Instagram note */}
          <div style={{ background: 'rgba(131,58,180,0.06)', border: '1px solid rgba(131,58,180,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'rgba(221,213,196,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>
            <span style={{ color: 'rgba(131,58,180,0.8)' }}>📸 Instagram</span> — uses Facebook Login. Select your Instagram-linked Facebook account above.
          </div>

          <SocialButton provider="apple" label="Continue with Apple" bg="rgba(255,255,255,0.04)" color="rgba(255,255,255,0.3)" loading={loading === 'apple'} onClick={() => socialSignIn('apple')}
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="#DDD5C4"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>}
          />

          <Divider text="or" />

          {/* Email */}
          <button onClick={() => { setMode('email-login'); clearError() }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 20px', background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 10, color: '#B8860B', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s' }}>
            <span>✉</span> Continue with Email
          </button>

          {/* Phone */}
          <button onClick={() => { setMode('phone-entry'); clearError() }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 20px', background: 'rgba(46,107,94,0.06)', border: '1px solid rgba(46,107,94,0.2)', borderRadius: 10, color: '#2E6B5E', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-serif)', transition: 'all 0.2s' }}>
            <span>📱</span> Continue with Phone
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 20, lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>
          By continuing, you agree to our Terms of Service<br />and Privacy Policy
        </p>
      </div>
    </div>
  )

  // ── EMAIL LOGIN ─────────────────────────────────────────────────────────────
  if (mode === 'email-login') return (
    <div style={S.wrap}>
      <div className="grain-overlay" />
      <div style={S.glow} />
      <div style={S.card} className="animate-fade-up">
        <button style={S.back} onClick={() => { setMode('choose'); clearError() }}>← Back</button>
        <div style={S.header}>
          <h2 style={S.title}>Welcome back</h2>
          <p style={S.sub}>Sign in to your soul's journey</p>
        </div>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleEmailLogin}>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inputStyle} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading === 'email'} style={S.btn()}>
            {loading === 'email' ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
          New soul?{' '}
          <button style={S.link} onClick={() => { setMode('email-register'); clearError() }}>Create account</button>
        </p>
      </div>
    </div>
  )

  // ── EMAIL REGISTER ──────────────────────────────────────────────────────────
  if (mode === 'email-register') return (
    <div style={S.wrap}>
      <div className="grain-overlay" />
      <div style={S.glow} />
      <div style={S.card} className="animate-fade-up">
        <button style={S.back} onClick={() => { setMode('choose'); clearError() }}>← Back</button>
        <div style={S.header}>
          <h2 style={S.title}>Begin your journey</h2>
          <p style={S.sub}>Create your soul's account</p>
        </div>
        {error && <div style={S.error}>{error}</div>}
        <form onSubmit={handleRegister}>
          <div style={S.field}>
            <label style={S.label}>Your Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required minLength={2} style={inputStyle} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={inputStyle} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} style={{ ...inputStyle, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
            {password && <div style={{ marginTop: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: password.length >= 8 ? '#2E6B5E' : 'rgba(255,255,255,0.25)' }}>
              {password.length >= 8 ? '✓ Strong enough' : `${8 - password.length} more characters`}
            </div>}
          </div>
          <button type="submit" disabled={loading === 'email'} style={S.btn()}>
            {loading === 'email' ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>
          Already registered?{' '}
          <button style={S.link} onClick={() => { setMode('email-login'); clearError() }}>Sign in</button>
        </p>
      </div>
    </div>
  )

  // ── PHONE ENTRY ─────────────────────────────────────────────────────────────
  if (mode === 'phone-entry') return (
    <div style={S.wrap}>
      <div className="grain-overlay" />
      <div style={S.glow} />
      <div style={S.card} className="animate-fade-up">
        <button style={S.back} onClick={() => { setMode('choose'); clearError() }}>← Back</button>
        <div style={S.header}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📱</div>
          <h2 style={S.title}>Your Phone</h2>
          <p style={S.sub}>We'll send a 6-digit verification code</p>
        </div>
        {error && <div style={S.error}>{error}</div>}
        <div style={S.field}>
          <label style={S.label}>Country</label>
          <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code} style={{ background: '#0E0E12', color: '#DDD5C4' }}>
                {c.flag} {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Phone Number</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ ...inputStyle, width: 70, flexShrink: 0, textAlign: 'center', color: 'rgba(221,213,196,0.5)', fontSize: 14 }}>{countryCode}</div>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="5551234567" style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>
        <button onClick={sendOTP} disabled={loading === 'otp-send' || !phone.trim()} style={S.btn('#2E6B5E')}>
          {loading === 'otp-send' ? 'Sending…' : 'Send Verification Code →'}
        </button>
      </div>
    </div>
  )

  // ── PHONE OTP ───────────────────────────────────────────────────────────────
  if (mode === 'phone-otp') return (
    <div style={S.wrap}>
      <div className="grain-overlay" />
      <div style={S.glow} />
      <div style={S.card} className="animate-fade-up">
        <button style={S.back} onClick={() => { setMode('phone-entry'); clearError(); setOtp('') }}>← Back</button>
        <div style={S.header}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <h2 style={S.title}>Verify Code</h2>
          <p style={S.sub}>Sent to {countryCode} {phone}</p>
        </div>
        {error && <div style={S.error}>{error}</div>}
        <div style={{ marginBottom: 24 }}>
          <OTPInput value={otp} onChange={setOtp} />
        </div>
        <button onClick={verifyOTP} disabled={loading === 'otp-verify' || otp.length < 6} style={S.btn('#2E6B5E')}>
          {loading === 'otp-verify' ? 'Verifying…' : 'Verify & Continue →'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {resendTimer > 0 ? (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>Resend in {resendTimer}s</span>
          ) : (
            <button style={S.link} onClick={() => { setMode('phone-entry'); sendOTP() }}>Resend code</button>
          )}
        </div>
        <div style={{ background: 'rgba(184,134,11,0.06)', border: '1px solid rgba(184,134,11,0.15)', borderRadius: 8, padding: '10px 14px', marginTop: 16, fontSize: 12, color: 'rgba(221,213,196,0.45)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          💡 In development mode, the code is logged to the server console. In production, it's sent via Twilio SMS.
        </div>
      </div>
    </div>
  )

  return null
}
