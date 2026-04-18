// Landing Page – Modernes zweispaltiges Layout, ZH Corporate Design
// Responsive: 1-spaltig auf Mobile (<640px), 2-spaltig ab sm
// Enthält Datenschutzhinweis (DSGVO) und Admin-Zugang via PIN

import { useState } from 'react'
import { Shield, Eye, BarChart3, BookOpen, EyeOff, Lock, ChevronRight, RotateCcw } from 'lucide-react'
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
  const [resetting, setResetting] = useState(false)
  const [nameFehlend, setNameFehlend] = useState(false)

  // Admin-PIN
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPin, setAdminPin] = useState('')
  const [adminPinFehler, setAdminPinFehler] = useState(false)
  const configuredPin = import.meta.env.VITE_ADMIN_PIN as string | undefined

  // Kurse
  const kurse: Kurs[] = getKurseZeitlichAktiv()
  const selectedKurs = kurse.find(k => k.id === selectedKursId) ?? null
  const kursHatPasswort = selectedKurs?.passwort != null && selectedKurs.passwort.trim().length > 0
  const passwortKorrekt = !kursHatPasswort || passwortInput === (selectedKurs?.passwort ?? '')
  const canStart = name.trim().length > 0 && passwortKorrekt

  function handleStart() {
    if (!name.trim()) {
      setNameFehlend(true)
      return
    }
    setNameFehlend(false)
    if (kursHatPasswort && passwortInput !== (selectedKurs?.passwort ?? '')) {
      setPasswortFehler(true)
      return
    }
    setPasswortFehler(false)
    onStart(name.trim(), selectedKurs?.zugangscode ?? null, selectedKurs?.name ?? null)
  }

  function handleKursChange(id: string) {
    setSelectedKursId(id)
    setPasswortInput('')
    setPasswortFehler(false)
  }

  function handleAdminSubmit() {
    if (!configuredPin) { onAdmin(); return }
    if (adminPin === configuredPin) {
      sessionStorage.setItem('rsi-admin-auth', '1')
      setShowAdminModal(false)
      setAdminPin('')
      onAdmin()
    } else {
      setAdminPinFehler(true)
    }
  }

  function handleAdminClick() {
    // Bereits authentifiziert in dieser Session?
    if (sessionStorage.getItem('rsi-admin-auth') === '1') {
      onAdmin()
      return
    }
    // Keine PIN konfiguriert → direkt rein
    if (!configuredPin) { onAdmin(); return }
    setShowAdminModal(true)
    setAdminPin('')
    setAdminPinFehler(false)
  }

  // App komplett zurücksetzen: Service Worker + Caches + localStorage
  async function handleResetApp() {
    if (!window.confirm(t('landing.resetConfirm'))) return
    setResetting(true)

    // 1. Service Worker deregistrieren
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(r => r.unregister()))
    }

    // 2. Alle Caches löschen (Workbox + sonstige)
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }

    // 3. localStorage komplett leeren
    localStorage.clear()

    // 4. sessionStorage leeren
    sessionStorage.clear()

    // 5. Seite neu laden (Server-Fetch erzwingen)
    window.location.reload()
  }

  // Gemeinsame Input-Styles
  const inputClass = 'w-full rounded-lg text-[15px] outline-none transition-colors'

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: 'var(--zh-color-bg)', fontFamily: 'var(--zh-font)' }}>

      {/* ── Top-Bar ── */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-3" style={{ borderBottom: '1px solid var(--zh-color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--zh-dunkelblau)' }}>
            <Shield size={14} color="white" />
          </div>
          <span className="text-sm font-extrabold" style={{ color: 'var(--zh-color-text)' }}>RSI-Immersive</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={handleAdminClick}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
            style={{ color: 'var(--zh-color-text-disabled)', background: 'transparent', border: '1px solid var(--zh-color-border)' }}
          >
            <Lock size={11} /> Admin
          </button>
        </div>
      </div>

      {/* ── Haupt-Bereich: 2-spaltig ── */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8 sm:py-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-16 w-full max-w-[1060px] items-center">

          {/* ── Links: Branding + Features ── */}
          <div className="flex flex-col gap-8">
            {/* Taglines */}
            <div>
              {([t('landing.tagline1'), t('landing.tagline2'), t('landing.tagline3')] as const).map((tag, i) => (
                <div
                  key={tag}
                  className="text-3xl sm:text-[42px] leading-[1.1] tracking-tight"
                  style={{
                    fontWeight: 900,
                    color: i === 0 ? 'var(--zh-dunkelblau)' : i === 1 ? 'var(--zh-blau)' : 'var(--zh-color-text-disabled)',
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>

            {/* Untertitel */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--zh-color-text-muted)', maxWidth: '400px' }}>
              {t('landing.subtitle', 'Entwickeln Sie den geschulten Blick für das Wesentliche. Road Safety Inspection — immersiv.')}
            </p>

            {/* Feature-Liste */}
            <div className="flex flex-col gap-4">
              {([
                { icon: <BookOpen size={16} />, text: '9-Schritt FaSi/bfu-Bewertungsflow nach TBA-Fachkurs FK RSI' },
                { icon: <Eye size={16} />,      text: 'Bewertungsmatrizen — Wichtigkeit × Abweichung × NACA' },
                { icon: <BarChart3 size={16} />, text: 'Live-Ranking und persönlicher Fortschritt' },
              ] as const).map(({ icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--zh-blau)' }}>{icon}</div>
                  <span className="text-[13px] leading-relaxed" style={{ color: 'var(--zh-color-text-muted)' }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Institutionelle Herkunft */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1" style={{ background: 'var(--zh-color-border)' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--zh-color-text-disabled)' }}>
                Fachstelle Verkehrssicherheit · Kanton Zürich
              </span>
              <div className="h-px flex-1" style={{ background: 'var(--zh-color-border)' }} />
            </div>
          </div>

          {/* ── Rechts: Login-Card ── */}
          <div
            className="w-full"
            style={{
              borderRadius: '16px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              padding: '36px 32px',
              boxShadow: 'var(--zh-shadow-lg)',
            }}
          >
            <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--zh-color-text)' }}>
              {t('onboarding.welcome')}
            </h2>
            <p className="text-sm mb-7" style={{ color: 'var(--zh-color-text-muted)' }}>
              {t('onboarding.identifyRanking')}
            </p>

            {/* Name */}
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--zh-color-text-muted)' }}>
              {t('landing.loginLabel')}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); if (e.target.value.trim()) setNameFehlend(false) }}
              onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
              placeholder="z.B. Max Muster"
              autoFocus
              className={inputClass}
              style={{ padding: '11px 14px', border: nameFehlend ? '1px solid #D40053' : '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontFamily: 'var(--zh-font)', marginBottom: nameFehlend ? '4px' : '16px', boxSizing: 'border-box' }}
            />
            {nameFehlend && (
              <p className="text-xs mb-3" style={{ color: '#D40053' }}>{t('landing.nameRequired')}</p>
            )}

            {/* Kurs */}
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--zh-color-text-muted)' }}>
              {t('kurs.wählen')}
            </label>
            <select
              value={selectedKursId}
              onChange={e => handleKursChange(e.target.value)}
              className={inputClass}
              style={{ padding: '11px 14px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontFamily: 'var(--zh-font)', marginBottom: '16px', boxSizing: 'border-box', cursor: 'pointer' }}
            >
              <option value="">{t('kurs.kein')}</option>
              {kurse.map(k => (
                <option key={k.id} value={k.id}>{k.name}{k.datum ? ` (${k.datum})` : ''}</option>
              ))}
            </select>

            {/* Kurs-Passwort */}
            {selectedKurs && kursHatPasswort && (
              <div style={{ marginBottom: passwortFehler ? '6px' : '16px' }}>
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--zh-color-text-muted)' }}>
                  {t('kurs.passwort_eingeben')}
                </label>
                <div className="relative">
                  <input
                    type={showPasswort ? 'text' : 'password'}
                    value={passwortInput}
                    onChange={e => { setPasswortInput(e.target.value); setPasswortFehler(false) }}
                    onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
                    placeholder={t('kurs.passwort')}
                    className={inputClass}
                    style={{ padding: '11px 44px 11px 14px', border: passwortFehler ? '1px solid #D40053' : '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswort(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: 0 }}
                  >
                    {showPasswort ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {passwortFehler && (
              <p className="text-xs mb-3" style={{ color: '#D40053' }}>{t('kurs.passwort_falsch')}</p>
            )}

            {/* Start-Button */}
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 rounded-lg text-[15px] font-bold transition-all"
              style={{
                padding: '13px',
                background: canStart ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
                color: canStart ? 'white' : 'var(--zh-color-text-disabled)',
                cursor: 'pointer',
                border: 'none', fontFamily: 'var(--zh-font)',
              }}
            >
              {t('landing.startBtn')} <ChevronRight size={16} />
            </button>

            {/* Datenschutzhinweis */}
            <p className="text-[10px] leading-relaxed mt-4 text-center" style={{ color: 'var(--zh-color-text-disabled)' }}>
              {t('datenschutz.hinweis')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between gap-2 px-5 sm:px-8 py-3" style={{ borderTop: '1px solid var(--zh-color-border)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--zh-color-text-disabled)' }}>
          <span style={{ color: '#1A7F1F', fontWeight: 800 }}>●</span>
          {t('landing.systemOnline')} · V3.1
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetApp}
            disabled={resetting}
            className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
            style={{
              color: 'var(--zh-color-text-disabled)',
              background: 'none',
              border: 'none',
              cursor: resetting ? 'wait' : 'pointer',
              padding: 0,
              opacity: resetting ? 0.5 : 1,
            }}
            title={t('landing.resetApp')}
          >
            <RotateCcw size={10} />
            {resetting ? t('landing.resetDone') : t('landing.resetApp')}
          </button>
          <span className="text-[10px]" style={{ color: 'var(--zh-color-border)' }}>|</span>
          <span className="text-[10px] font-semibold" style={{ color: 'var(--zh-color-text-disabled)' }}>
            © {new Date().getFullYear()} Tiefbauamt Kanton Zürich
          </span>
        </div>
      </div>

      {/* ── Admin-PIN-Modal ── */}
      {showAdminModal && (
        <div
          onClick={() => setShowAdminModal(false)}
          className="fixed inset-0 flex items-center justify-center z-[1000]"
          style={{ background: 'rgba(0,0,0,0.5)', padding: '20px' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-[340px]"
            style={{
              background: 'var(--zh-color-bg)',
              borderRadius: '16px',
              border: '1px solid var(--zh-color-border)',
              padding: '32px 28px',
              boxShadow: 'var(--zh-shadow-lg)',
              fontFamily: 'var(--zh-font)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,64,124,0.1)' }}>
                <Lock size={18} style={{ color: 'var(--zh-dunkelblau)' }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--zh-color-text)' }}>{t('admin.pin_titel')}</h3>
                <p className="text-xs" style={{ color: 'var(--zh-color-text-muted)' }}>{t('admin.pin_hinweis')}</p>
              </div>
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={adminPin}
              onChange={e => { setAdminPin(e.target.value); setAdminPinFehler(false) }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdminSubmit() }}
              placeholder="PIN"
              autoFocus
              className="w-full rounded-lg text-center text-2xl font-bold tracking-[0.3em] outline-none"
              style={{
                padding: '14px',
                border: adminPinFehler ? '2px solid #D40053' : '1px solid var(--zh-color-border)',
                background: 'var(--zh-color-bg-secondary)',
                color: 'var(--zh-color-text)',
                fontFamily: 'var(--zh-font)',
                marginBottom: adminPinFehler ? '6px' : '16px',
                boxSizing: 'border-box',
              }}
            />

            {adminPinFehler && (
              <p className="text-xs mb-3 text-center" style={{ color: '#D40053' }}>{t('admin.pin_falsch')}</p>
            )}

            <button
              onClick={handleAdminSubmit}
              className="w-full rounded-lg text-sm font-bold"
              style={{ padding: '12px', background: 'var(--zh-dunkelblau)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
            >
              {t('admin.pin_bestätigen')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
