// Landing Page – Zweispaltig, ZH Corporate Design
// Links: Logo + Taglines + Features | Rechts: Login-Card mit optionalem Kurs-Code

import { useState } from 'react'
import { Shield, Eye, BarChart3, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { getSession, getKurse } from '../data/appData'

interface Props {
  onStart: (username: string, kursCode: string | null) => void
  onAdmin: () => void
}

export default function LandingPage({ onStart, onAdmin }: Props) {
  const { t } = useTranslation()
  const saved = getSession()
  const [name, setName] = useState(saved.username ?? '')
  const [kursCode, setKursCode] = useState('')
  const [kursError, setKursError] = useState(false)

  function handleStart() {
    const trimmed = name.trim()
    if (!trimmed) return

    if (kursCode.trim()) {
      // Kurs-Code validieren
      const kurse = getKurse()
      const found = kurse.find(k => k.zugangscode === kursCode.trim() && k.isActive)
      if (!found) {
        setKursError(true)
        return
      }
      setKursError(false)
      onStart(trimmed, kursCode.trim())
    } else {
      setKursError(false)
      onStart(trimmed, null)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--zh-color-bg)', fontFamily: 'var(--zh-font)', display: 'flex', flexDirection: 'column' }}>
      {/* Top-Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 32px', borderBottom: '1px solid var(--zh-color-border)', gap: '16px' }}>
        <LanguageSwitcher />
        <button onClick={onAdmin} style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Admin</button>
      </div>

      {/* Zweispaltig */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '48px 32px', gap: '64px', alignItems: 'center' }}>
        {/* Links */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--zh-dunkelblau)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={20} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--zh-color-text)', lineHeight: 1.2 }}>RSI-Immersive</div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--zh-color-text-disabled)' }}>
                Fachstelle Verkehrssicherheit · Kanton Zürich
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            {([t('landing.tagline1'), t('landing.tagline2'), t('landing.tagline3')] as const).map((tag, i) => (
              <div key={tag} style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1.15, color: i === 0 ? 'var(--zh-dunkelblau)' : i === 1 ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)' }}>
                {tag}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {([
              { icon: <BookOpen size={16} />, text: '9-Schritt FaSi/bfu-Bewertungsflow nach TBA-Fachkurs FK RSI' },
              { icon: <Eye size={16} />,      text: 'Bewertungsmatrizen — Wichtigkeit × Abweichung × NACA' },
              { icon: <BarChart3 size={16} />, text: 'Persoenliches Ranking und Fortschritt' },
            ] as const).map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ color: 'var(--zh-blau)', flexShrink: 0, marginTop: '2px' }}>{icon}</div>
                <span style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rechts: Login-Card */}
        <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '40px 36px', boxShadow: 'var(--zh-shadow-md)' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '6px' }}>Willkommen.</h2>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', marginBottom: '28px' }}>Identifizieren Sie sich fuer das Ranking.</p>

          {/* Name */}
          <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '8px' }}>
            {t('landing.loginLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
            placeholder="z.B. Max Muster"
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '15px', marginBottom: '20px', outline: 'none', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
          />

          {/* Kurs-Code */}
          <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '8px' }}>
            {t('login.kurs_code')}
          </label>
          <input
            type="text"
            value={kursCode}
            onChange={e => { setKursCode(e.target.value); setKursError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
            placeholder={t('login.kurs_placeholder')}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: kursError ? '1px solid #D40053' : '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '15px', marginBottom: kursError ? '6px' : '20px', outline: 'none', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
          />
          {kursError && (
            <p style={{ fontSize: '12px', color: '#D40053', marginBottom: '14px', marginTop: '2px' }}>
              {t('login.kurs_ungueltig')}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!name.trim()}
            style={{ width: '100%', padding: '13px', borderRadius: 'var(--zh-radius-btn)', background: name.trim() ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)', color: name.trim() ? 'white' : 'var(--zh-color-text-disabled)', fontWeight: 700, fontSize: '15px', cursor: name.trim() ? 'pointer' : 'not-allowed', border: 'none', fontFamily: 'var(--zh-font)' }}
          >
            {t('landing.startBtn')} →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--zh-color-border)', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--zh-color-text-disabled)' }}>
        <span style={{ color: '#1A7F1F', fontWeight: 800 }}>●</span>
        {t('landing.systemOnline')} · V3.0 · Fachstelle Verkehrssicherheit · Kanton Zürich
      </div>
    </div>
  )
}
