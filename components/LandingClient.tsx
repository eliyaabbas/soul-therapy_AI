'use client'
import Link from 'next/link'

const CYCLES = [
  { icon: '📜', name: 'Musharatah', phase: 'Dawn', color: '#B8860B' },
  { icon: '👁', name: 'Muraqabah', phase: 'Day', color: '#2E6B5E' },
  { icon: '⚖', name: 'Muhasabah', phase: 'Dusk', color: '#5B3A8C' },
  { icon: '🔄', name: "Mu'atabah", phase: 'Night', color: '#8B3A3A' },
]

export default function LandingClient() {
  return (
    <div style={{ minHeight: '100vh', background: '#070709', color: '#DDD5C4', fontFamily: 'var(--font-serif)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px 80px' }}>
      <div className="grain-overlay" />
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse 70% 45% at 50% -5%, rgba(184,134,11,0.2), transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Orb */}
        <div className="animate-fade-up" style={{ position: 'relative', width: 72, height: 72, marginBottom: 24 }}>
          <div className="animate-pulse-glow" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(184,134,11,0.35)' }} />
          <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px solid rgba(184,134,11,0.2)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#B8860B' }}>☽</div>
        </div>

        {/* Title */}
        <div className="animate-fade-up delay-1" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 5, color: 'rgba(184,134,11,0.5)', marginBottom: 10, textTransform: 'uppercase' }}>جامع السعادات</div>
          <h1 style={{ fontSize: 48, fontWeight: 400, letterSpacing: -2, lineHeight: 1, marginBottom: 8 }}>
            Soul<span style={{ color: '#B8860B', fontStyle: 'italic' }}>Therapy</span>
          </h1>
          <div style={{ fontSize: 12, color: 'rgba(221,213,196,0.3)', letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            The Collector of Felicities
          </div>
        </div>

        {/* Hadith */}
        <div className="glass-card animate-fade-up delay-2" style={{ padding: '20px', marginBottom: 28, width: '100%' }}>
          <p style={{ textAlign: 'center', lineHeight: 1.9, color: 'rgba(221,213,196,0.72)', fontSize: 15 }}>
            <em style={{ color: '#B8860B' }}>"The most excellent jihad is the conquest of one's own soul."</em>
            <br /><span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>— The Prophet ﷺ</span>
          </p>
        </div>

        {/* 4 Cycles */}
        <div className="animate-fade-up delay-3" style={{ width: '100%', marginBottom: 32 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: 3, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase' }}>The 4 Stations of Purification</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {CYCLES.map(c => (
              <div key={c.name} style={{ textAlign: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', border: `1px solid ${c.color}44`, background: `${c.color}09`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 7px' }}>{c.icon}</div>
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: `${c.color}88`, letterSpacing: 1, textTransform: 'uppercase' }}>{c.name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.18)', marginTop: 2 }}>{c.phase}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="animate-fade-up delay-4" style={{ width: '100%' }}>
          <Link href="/auth" style={{ display: 'block', width: '100%', padding: '15px 20px', background: '#B8860B', border: '1.5px solid #B8860B', color: '#070709', borderRadius: 10, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textAlign: 'center', textDecoration: 'none', textTransform: 'uppercase', fontFamily: 'var(--font-serif)', transition: 'all 0.2s' }}>
            Begin Your Soul's Journey →
          </Link>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 16, lineHeight: 1.8, fontFamily: 'var(--font-mono)' }}>
            Al-Naraqi · Al-Ghazali · Ibn Qayyim al-Jawziyyah
          </p>
        </div>
      </div>
    </div>
  )
}
