// Landing Page – Zweispaltig, ZH Corporate Design
// Links: Logo + Taglines + Features | Rechts: Login-Card mit Kurs-Auswahl
// Responsive: 1-spaltig auf Mobile (<640px), 2-spaltig ab sm

import { useState } from 'react'
import { Shield, Eye, BarChart3, BookOpen, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import { getSession, getKurseZeitlichAktiv, type Kurs } from '../data/appData'

interface Props {
  onStart: (username: string, kursCode: string | null, kursName: string | null) => void
  onAdmin: () => void
}

export default function LandingPage({ onStart, onAdmin }: Props) {
  const { t } = useTranslation()
  const saved = getSession()

  const [name, setName] = useState(saved.username ?? '')
  const [selectedKursId, setSelectedKursId] = useState<string>('')
  const [passwortInput, setPasswortInput] = useState('')
  const [passwortFehler, setPasswortFehler] = useState(false)
  const [showPasswort, setShowPasswort] = useState(false)

  // Nur zeitlich gueltige und aktive Kurse im Dropdown anzeigen
  const kurse: Kurs[] = getKurseZeitlichAktiv()
  const selectedKurs = kurse.find(k => k.id === selectedKursId) ?? null
  const kursHatPasswort = selectedKurs?.passwort != null && selectedKurs.passwort.trim().length > 0

  // "Training starten" aktiv wenn:
  // - Name ausgefuellt
  // - kein Kurs gewaehlt ODER Kurs ohne Passwort ODER Passwort korrekt eingegeben
  const passwortKorrekt = !kursHatPasswort || passwortInput === (selectedKurs?.passwort ?? '')
  const canStart = name.trim().length > 0 && passwortKorrekt

  function handleStart() {
    if (!name.trim()) return
    if (kursHatPasswort && passwortInput !== (selectedKurs?.passwort ?? '')) {
      setPasswortFehler(true)
      return
    }
    setPasswortFehler(false)
    const kursCode = selectedKurs?.zugangscode ?? null
    const kursName = selectedKurs?.name ?? null
    onStart(name.trim(), kursCode, kursName)
  }

  function handleKursChange(id: string) {
    setSelectedKursId(id)
    setPasswortInput('')
    setPasswortFehler(false)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--zh-color-bg)', fontFamily: 'var(--zh-font)' }} className="flex flex-col">
      {/* Top-Bar */}
      <div className="flex items-center justify-end gap-4 px-4 sm:px-8 py-4" style={{ borderBottom: '1px solid var(--zh-color-border)' }}>
        <LanguageSwitcher />
        <button onClick={onAdmin} style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Admin</button>
      </div>

      {/* Zweispaltig (responsive) */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16 items-center w-full max-w-[1100px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
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
              <div key={tag} className="text-2xl sm:text-4xl" style={{ fontWeight: 900, lineHeight: 1.15, color: i === 0 ? 'var(--zh-dunkelblau)' : i === 1 ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)' }}>
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
        <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '40px 36px', boxShadow: 'var(--zh-shadow-md)' }} className="w-full">
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '6px' }}>Willkommen.</h2>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', marginBottom: '28px' }}>Identifizieren Sie sich für das Ranking.</p>

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

          {/* Kurs-Auswahl (Dropdown) */}
          <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '8px' }}>
            {t('kurs.waehlen')}
          </label>
          <select
            value={selectedKursId}
            onChange={e => handleKursChange(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '15px', marginBottom: '20px', outline: 'none', fontFamily: 'var(--zh-font)', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            <option value="">{t('kurs.kein')}</option>
            {kurse.map(k => (
              <option key={k.id} value={k.id}>
                {k.name}{k.datum ? ` (${k.datum})` : ''}
              </option>
            ))}
          </select>

          {/* Passwort-Feld – erscheint nur wenn Kurs mit Passwort gewaehlt */}
          {selectedKurs && kursHatPasswort && (
            <div style={{ marginBottom: passwortFehler ? '6px' : '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '8px' }}>
                {t('kurs.passwort_eingeben')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswort ? 'text' : 'password'}
                  value={passwortInput}
                  onChange={e => { setPasswortInput(e.target.value); setPasswortFehler(false) }}
                  onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
                  placeholder={t('kurs.passwort')}
                  style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: '8px', border: passwortFehler ? '1px solid #D40053' : '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '15px', outline: 'none', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswort(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  {showPasswort ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Passwort-Fehlermeldung */}
          {passwortFehler && (
            <p style={{ fontSize: '12px', color: '#D40053', marginBottom: '14px', marginTop: '2px' }}>
              {t('kurs.passwort_falsch')}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!canStart}
            style={{ width: '100%', padding: '13px', borderRadius: 'var(--zh-radius-btn)', background: canStart ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)', color: canStart ? 'white' : 'var(--zh-color-text-disabled)', fontWeight: 700, fontSize: '15px', cursor: canStart ? 'pointer' : 'not-allowed', border: 'none', fontFamily: 'var(--zh-font)' }}
          >
            {t('landing.startBtn')} →
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 sm:px-8 py-3.5" style={{ borderTop: '1px solid var(--zh-color-border)', fontSize: '12px', color: 'var(--zh-color-text-disabled)' }}>
        <span style={{ color: '#1A7F1F', fontWeight: 800 }}>●</span>
        {t('landing.systemOnline')} · V3.0 · Fachstelle Verkehrssicherheit · Kanton Zürich
      </div>
    </div>
  )
}
