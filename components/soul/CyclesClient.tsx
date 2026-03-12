'use client'
import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'assessment' | 'cycles' | 'summary'
type Message = { role: 'user' | 'assistant'; content: string; phase?: string }
type SoulProfile = {
  dominantPower: string; vices: string[]; viceArabic: string[]
  virtue: string; virtueArabic: string
  aqlScore: number; ghadabScore: number; shahwahScore: number; summary: string
  assessment_completed?: boolean
}

interface Props {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null }
  initialProfile: SoulProfile | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CYCLES = [
  { id: 'musharatah', n: 1, arabic: 'المشارطة', name: 'Musharatah', subtitle: 'The Morning Contract', desc: 'Before the day begins, stipulate with your soul. What vice will you guard against today?', icon: '📜', color: '#B8860B', phase: 'Dawn' },
  { id: 'muraqabah', n: 2, arabic: 'المراقبة', name: 'Muraqabah', subtitle: 'Watchfulness', desc: 'Through the day, the soul stands as its own sentinel. Allah sees every thought.', icon: '👁', color: '#2E6B5E', phase: 'Day' },
  { id: 'muhasabah', n: 3, arabic: 'المحاسبة', name: 'Muhasabah', subtitle: 'The Evening Reckoning', desc: 'The merchant settles the books. Where did your soul gain today? Where did it lose?', icon: '⚖', color: '#5B3A8C', phase: 'Dusk' },
  { id: 'muaqabah', n: 4, arabic: 'المعاتبة', name: "Mu'atabah", subtitle: 'Reproach & Renewal', desc: 'Not punishment — refinement. Face your soul with love, then renew the contract.', icon: '🔄', color: '#8B3A3A', phase: 'Night' },
] as const

function suggestedCycle() {
  const h = new Date().getHours()
  return h < 12 ? 0 : h < 17 ? 1 : h < 21 ? 2 : 3
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function TypingDots({ color = '#B8860B' }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: color, opacity: 0.5,
          animation: `bounceDot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
      ))}
    </div>
  )
}

function ViceBar({ label, vice, virtue, value }: { label: string; vice: string; virtue: string; value: number }) {
  const pct = Math.max(5, Math.min(95, value))
  const color = pct > 60 ? '#2E6B5E' : pct < 40 ? '#8B3A3A' : '#B8860B'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#C07070', fontFamily: 'var(--font-mono)' }}>{vice}</span>
        <span style={{ fontSize: 10, color: 'rgba(221,213,196,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 10, color: '#70B090', fontFamily: 'var(--font-mono)' }}>{virtue}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 3, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: `linear-gradient(90deg, #8B3A3A44, ${color})`, borderRadius: 3, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
        <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid #070709', transform: 'translate(-50%,-50%)', boxShadow: `0 0 8px ${color}88`, transition: 'left 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  )
}

function CycleNode({ cycle, active, completed, onClick }: { cycle: typeof CYCLES[number]; active: boolean; completed: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '4px 2px', WebkitTapHighlightColor: 'transparent' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%',
        border: `2px solid ${active ? cycle.color : completed ? cycle.color + '55' : 'rgba(255,255,255,0.08)'}`,
        background: active ? `radial-gradient(circle, ${cycle.color}28, transparent)` : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, position: 'relative',
        boxShadow: active ? `0 0 16px ${cycle.color}44` : 'none',
        transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
        {completed && !active ? <span style={{ fontSize: 16, color: cycle.color }}>✓</span> : cycle.icon}
        {active && <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1px solid ${cycle.color}30`, animation: 'pulseGlow 2.5s infinite' }} />}
      </div>
      <div style={{ fontSize: 8, fontFamily: 'var(--font-mono)', letterSpacing: 1, color: active ? cycle.color : 'rgba(255,255,255,0.22)', textTransform: 'uppercase', transition: 'color 0.3s' }}>{cycle.name}</div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CyclesClient({ user, initialProfile }: Props) {
  const [phase, setPhase] = useState<Phase>(initialProfile?.assessment_completed ? 'cycles' : 'assessment' as any)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<SoulProfile | null>(initialProfile as any)
  const [activeCycle, setActiveCycle] = useState(suggestedCycle())
  const [completed, setCompleted] = useState<number[]>([])
  const [started, setStarted] = useState<Record<number, boolean>>({})
  const [showMenu, setShowMenu] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Auto-start assessment
  useEffect(() => {
    if (phase === 'assessment' && messages.length === 0) openAssessment()
  }, [phase])

  async function callSoul(msgs: Message[], phaseKey: string, cycleId?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/soul/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, phase: phaseKey, cycle: cycleId }),
      })
      const data = await res.json()
      if (data.profile) {
        setProfile(data.profile)
        setMessages(prev => [...prev, { role: 'assistant', content: data.content, phase: phaseKey }])
        setLoading(false)
        setTimeout(() => setPhase('cycles'), 2200)
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || data.error, phase: phaseKey }])
    } catch { setMessages(prev => [...prev, { role: 'assistant', content: 'The connection was interrupted. Please try again.', phase: phaseKey }]) }
    setLoading(false)
  }

  async function openAssessment() {
    setLoading(true)
    const msgs: Message[] = [{ role: 'user', content: "I am ready to begin working on my soul. Please greet me and ask your first question." }]
    await callSoul(msgs, 'assessment')
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)

    if (phase === 'assessment') {
      const userCount = next.filter(m => m.role === 'user').length
      const phaseKey = userCount > 5 ? 'assessment-final' : 'assessment'
      await callSoul(next, phaseKey)
    } else {
      const c = CYCLES[activeCycle]
      await callSoul(next, 'cycle', c.id)
    }
  }

  async function enterCycle(idx: number) {
    setActiveCycle(idx)
    if (started[idx]) return
    setStarted(prev => ({ ...prev, [idx]: true }))
    const c = CYCLES[idx]
    const ctx = messages.filter(m => ['assessment', 'profile'].includes(m.phase || '')).slice(-8)
    const msgs: Message[] = [...ctx, { role: 'user', content: `I am ready to enter ${c.name} — ${c.subtitle}.` }]
    await callSoul(msgs, 'cycle-open', c.id)
  }

  async function sealCycle() {
    if (loading) return
    const c = CYCLES[activeCycle]
    const ctx = messages.slice(-6)
    const msgs: Message[] = [...ctx, { role: 'user', content: `Please seal and close this ${c.name} cycle for me.` }]
    setLoading(true)
    const res = await fetch('/api/soul/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, phase: 'cycle-seal', cycle: c.id }),
    })
    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.content, phase: 'cycle-close' }])
    setCompleted(prev => {
      const next = Array.from(new Set([...prev, activeCycle]))
      if (next.length >= 4) setTimeout(() => setPhase('summary'), 1800)
      return next
    })
    // Save to ledger
    fetch('/api/soul/ledger', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycle: c.id, completed: true, conversation: msgs }),
    })
    setLoading(false)
  }

  const c = CYCLES[activeCycle]
  const userCount = messages.filter(m => m.role === 'user').length

  // Shared styles
  const inputSt: React.CSSProperties = { flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px 14px', color: '#DDD5C4', fontSize: 14, fontFamily: 'var(--font-serif)', resize: 'none', outline: 'none' }
  const sendBtnSt = (active: boolean, color: string): React.CSSProperties => ({ width: 42, height: 42, borderRadius: 11, background: active ? color : 'rgba(255,255,255,0.05)', border: 'none', cursor: active ? 'pointer' : 'default', fontSize: 18, flexShrink: 0, transition: 'all 0.2s', color: active ? '#070709' : 'rgba(255,255,255,0.15)' })

  // ── ASSESSMENT PHASE ────────────────────────────────────────────────────────
  if (phase === 'assessment') {
    const QUICK = ['I struggle with anger and impatience', 'I feel envious when others succeed', 'I seek others\' approval too much', 'I\'m too attached to dunya (worldly things)']
    return (
      <div style={{ minHeight: '100vh', background: '#070709', color: '#DDD5C4', fontFamily: 'var(--font-serif)', position: 'relative' }}>
        <style>{`@keyframes bounceDot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:.9}} @keyframes pulseGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.08)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div className="grain-overlay" />
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(184,134,11,0.18), transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Header */}
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,9,0.92)', backdropFilter: 'blur(14px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid rgba(184,134,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B8860B', fontSize: 15 }}>☽</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Soul Assessment</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>Understanding your nafs</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                {[0,1,2,3,4].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < userCount ? '#B8860B' : 'rgba(255,255,255,0.1)', transition: 'background 0.4s', boxShadow: i < userCount ? '0 0 6px #B8860B88' : 'none' }} />)}
              </div>
              <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 18, marginLeft: 8 }}>⋯</button>
            </div>
          </div>

          {/* Chat */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.4s both' }}>
                {m.role === 'assistant' && <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(184,134,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end', color: '#B8860B' }}>☽</div>}
                <div style={{ maxWidth: '84%', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? 'rgba(184,134,11,0.1)' : 'rgba(255,255,255,0.035)', border: `1px solid ${m.role === 'user' ? 'rgba(184,134,11,0.22)' : 'rgba(255,255,255,0.07)'}`, borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '12px 15px', fontSize: 14, lineHeight: 1.78 }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(184,134,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#B8860B' }}>☽</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px 18px 18px 4px' }}><TypingDots /></div>
              </div>
            )}
            {userCount === 0 && !loading && messages.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
                {QUICK.map(q => (
                  <button key={q} onClick={() => { setInput(q); setTimeout(() => sendMessage(), 80) }}
                    style={{ background: 'rgba(184,134,11,0.08)', border: '1px solid rgba(184,134,11,0.2)', borderRadius: 20, padding: '6px 13px', fontSize: 12, color: '#B8860B', cursor: 'pointer', fontFamily: 'var(--font-serif)' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 18px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,9,0.94)', backdropFilter: 'blur(14px)' }}>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Speak honestly to your soul's guide…" rows={2} style={inputSt} />
              <button type="submit" disabled={loading || !input.trim()} style={sendBtnSt(!!input.trim() && !loading, '#B8860B')}>→</button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── CYCLES PHASE ────────────────────────────────────────────────────────────
  if (phase === 'cycles') {
    const cycleMsgs = messages.filter(m => m.role === 'user' ? messages.indexOf(m) > messages.findLastIndex((x: Message) => x.phase === 'assessment') : (m.phase === `cycle-open` || m.phase === 'cycle' || m.phase === 'cycle-close'))

    return (
      <div style={{ minHeight: '100vh', background: '#070709', color: '#DDD5C4', fontFamily: 'var(--font-serif)', position: 'relative' }}>
        <style>{`@keyframes bounceDot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-5px);opacity:.9}} @keyframes pulseGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.08)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div className="grain-overlay" />
        <div style={{ position: 'fixed', inset: 0, background: `radial-gradient(ellipse 70% 45% at 50% -5%, ${c.color}1E, transparent 65%)`, pointerEvents: 'none', zIndex: 0, transition: 'background 1.5s ease' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Top nav */}
          <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,7,9,0.92)', backdropFilter: 'blur(14px)' }}>
            {/* Profile tags */}
            {profile && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
                <div style={{ flexShrink: 0, background: `${c.color}11`, border: `1px solid ${c.color}33`, borderRadius: 20, padding: '3px 10px', fontSize: 10, color: c.color, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>⚡ {profile.dominantPower}</div>
                {(profile.vices || []).map((v: string, i: number) => <div key={i} style={{ flexShrink: 0, background: 'rgba(139,58,58,0.12)', border: '1px solid rgba(139,58,58,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#C07878', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>✗ {v}</div>)}
                <div style={{ flexShrink: 0, background: 'rgba(46,107,94,0.1)', border: '1px solid rgba(46,107,94,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 10, color: '#70B090', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>✓ {profile.virtue}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              {CYCLES.map((cy, i) => <CycleNode key={cy.id} cycle={cy} active={i === activeCycle} completed={completed.includes(i)} onClick={() => enterCycle(i)} />)}
              <button onClick={() => signOut({ callbackUrl: '/' })} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 11, padding: '4px 8px', fontFamily: 'var(--font-mono)' }}>Out</button>
            </div>
          </div>

          {/* Cycle header */}
          <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28, lineHeight: 1 }}>{c.icon}</div>
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: `${c.color}88`, textTransform: 'uppercase', marginBottom: 1 }}>Cycle {c.n} of 4 · {c.phase}</div>
                <div style={{ fontSize: 19, fontWeight: 500, letterSpacing: -0.5 }}>{c.name} <span style={{ fontSize: 14, color: `${c.color}66`, fontWeight: 400 }}>{c.arabic}</span></div>
                <div style={{ fontSize: 12, color: 'rgba(221,213,196,0.38)', fontStyle: 'italic' }}>{c.subtitle}</div>
              </div>
            </div>
            {!started[activeCycle] && (
              <div style={{ marginTop: 12, padding: '12px 14px', background: `${c.color}08`, border: `1px solid ${c.color}20`, borderRadius: 10 }}>
                <p style={{ fontSize: 13, color: 'rgba(221,213,196,0.55)', lineHeight: 1.75, marginBottom: 12 }}>{c.desc}</p>
                <button onClick={() => enterCycle(activeCycle)} disabled={loading}
                  style={{ width: '100%', padding: '12px', background: c.color, border: `1.5px solid ${c.color}`, color: '#070709', borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, cursor: 'pointer', fontFamily: 'var(--font-serif)', textTransform: 'uppercase' }}>
                  Enter {c.name} →
                </button>
              </div>
            )}
          </div>

          {/* Soul bars - Muhasabah */}
          {activeCycle === 2 && profile && (
            <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 10, textTransform: 'uppercase' }}>Soul Balance · Today's Ledger</div>
              <ViceBar label="'Aql" vice="Jahl" virtue="Hikmah" value={profile.aqlScore} />
              <ViceBar label="Ghadab" vice="Tahawwur" virtue="Shaja'ah" value={profile.ghadabScore} />
              <ViceBar label="Shahwah" vice="Fujur" virtue="'Iffah" value={profile.shahwahScore} />
            </div>
          )}

          {/* Chat */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.filter(m => m.phase?.startsWith('cycle') || (m.role === 'user' && messages.indexOf(m) > messages.findLastIndex((x: Message) => x.phase === 'assessment'))).map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.4s both' }}>
                {m.role === 'assistant' && <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${c.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end' }}>{c.icon}</div>}
                <div style={{ maxWidth: '84%', background: m.role === 'user' ? 'rgba(184,134,11,0.1)' : 'rgba(255,255,255,0.035)', border: `1px solid ${m.role === 'user' ? 'rgba(184,134,11,0.22)' : m.phase === 'cycle-close' ? `${c.color}33` : 'rgba(255,255,255,0.07)'}`, borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '12px 15px', fontSize: 14, lineHeight: 1.78 }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${c.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{c.icon}</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px 18px 18px 4px' }}><TypingDots color={c.color} /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {started[activeCycle] && (
            <div style={{ padding: '10px 18px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(7,7,9,0.94)', backdropFilter: 'blur(14px)' }}>
              {!completed.includes(activeCycle) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button onClick={sealCycle} disabled={loading} style={{ background: 'transparent', border: `1px solid ${c.color}66`, color: c.color, borderRadius: 20, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>✦ Seal {c.name}</button>
                  {activeCycle < 3 && <button onClick={() => enterCycle(activeCycle + 1)} disabled={loading} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)', borderRadius: 20, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>Next →</button>}
                </div>
              )}
              <form onSubmit={sendMessage} style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={`Reflect on your ${c.name}…`} rows={2} style={inputSt} />
                <button type="submit" disabled={loading || !input.trim()} style={sendBtnSt(!!input.trim() && !loading, c.color)}>→</button>
              </form>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SUMMARY PHASE ───────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#DDD5C4', fontFamily: 'var(--font-serif)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px 80px', position: 'relative' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes pulseGlow{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.08)}}`}</style>
      <div className="grain-overlay" />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(46,107,94,0.2), transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, width: '100%' }}>
        <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 14, filter: 'drop-shadow(0 0 20px rgba(46,107,94,0.5))' }}>✦</div>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 4, color: 'rgba(46,107,94,0.7)', marginBottom: 8, textTransform: 'uppercase' }}>الحمد لله</div>
          <h2 style={{ fontSize: 32, fontWeight: 400, letterSpacing: -1, marginBottom: 6 }}>The Cycle is Complete</h2>
          <p style={{ color: 'rgba(221,213,196,0.38)', fontSize: 14, lineHeight: 1.7 }}>You have walked all 4 stations of the soul today.</p>
        </div>

        {profile && (
          <div className="glass-card animate-fade-up delay-1" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 2, color: 'rgba(255,255,255,0.25)', marginBottom: 12, textTransform: 'uppercase' }}>Your Soul's Portrait Today</div>
            <p style={{ fontSize: 14, lineHeight: 1.85, color: 'rgba(221,213,196,0.72)', marginBottom: 14, fontStyle: 'italic' }}>{profile.summary}</p>
            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(46,107,94,0.3),transparent)', margin: '14px 0' }} />
            <ViceBar label="'Aql" vice="Jahl" virtue="Hikmah" value={profile.aqlScore} />
            <ViceBar label="Ghadab" vice="Tahawwur" virtue="Shaja'ah" value={profile.ghadabScore} />
            <ViceBar label="Shahwah" vice="Fujur" virtue="'Iffah" value={profile.shahwahScore} />
          </div>
        )}

        <div className="animate-fade-up delay-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {CYCLES.map((cy, i) => (
            <div key={cy.id} className="glass-card" style={{ padding: 14, textAlign: 'center', borderColor: `${cy.color}33` }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{completed.includes(i) ? '✓' : cy.icon}</div>
              <div style={{ fontSize: 10, color: cy.color, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase' }}>{cy.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>{completed.includes(i) ? 'Sealed' : 'Partial'}</div>
            </div>
          ))}
        </div>

        <div className="glass-card animate-fade-up delay-3" style={{ padding: 20, marginBottom: 20 }}>
          <p style={{ textAlign: 'center', fontSize: 14, lineHeight: 1.9, color: 'rgba(221,213,196,0.68)', fontStyle: 'italic' }}>
            <em style={{ color: '#B8860B' }}>"Whoever knows his own soul knows his Lord."</em>
            <br /><span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.22)' }}>Attributed to the Prophet ﷺ</span>
          </p>
        </div>

        <button className="animate-fade-up delay-4"
          style={{ width: '100%', padding: '14px 20px', background: '#2E6B5E', border: '1.5px solid #2E6B5E', color: '#070709', borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1.2, cursor: 'pointer', fontFamily: 'var(--font-serif)', textTransform: 'uppercase' }}
          onClick={() => { setMessages([]); setCompleted([]); setStarted({}); setActiveCycle(suggestedCycle()); setPhase('cycles') }}>
          Begin Tomorrow's Journey
        </button>

        <button style={{ width: '100%', marginTop: 10, padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', borderRadius: 10, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
          onClick={() => signOut({ callbackUrl: '/' })}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
