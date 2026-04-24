// Navbar – 52px, ZH Corporate Design
// Links: Logo | Mitte: Nav-Links | Rechts: Score + Live + Sprache + Dark-Toggle + Avatar
// Avatar-Klick öffnet User-Popover (Name, Kurs, Score, Abmelden, Reset)

import { LayoutDashboard, BarChart3, Settings, Sun, Moon, Trophy, LogOut, RotateCcw, MessageSquare, FileText, ShieldCheck, ShieldOff, BookOpen } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import LanguageSwitcher from './LanguageSwitcher'
import FeedbackModal from './FeedbackModal'
import IssiLogo from './IssiLogo'
import { useTranslation } from 'react-i18next'
import { getSupabaseStatus, onStatusChange } from '../lib/supabase'

type View = 'topics' | 'scenes' | 'einstieg' | 'viewer' | 'scoring' | 'szenenabschluss' | 'admin' | 'ranking'

interface Props {
  view: string
  username: string
  score: number
  theme: 'light' | 'dark'
  kursName: string | null
  onNavigate: (v: View) => void
  onToggleTheme: () => void
  onLogout: () => void
  onAdminLogout?: () => void
}

export default function Navbar({ view, username, score, theme, kursName, onNavigate, onToggleTheme, onLogout, onAdminLogout }: Props) {
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  // Supabase Live-Indikator
  const [sbStatus, setSbStatus] = useState(getSupabaseStatus())
  useEffect(() => onStatusChange(() => setSbStatus(getSupabaseStatus())), [])

  // Avatar-Popover
  const [showPopover, setShowPopover] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Feedback-Modal
  const [showFeedback, setShowFeedback] = useState(false)

  // Klick ausserhalb schliesst Popover
  useEffect(() => {
    if (!showPopover) return
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPopover])

  // Admin nur anzeigen wenn in dieser Session authentifiziert
  const isAdminAuth = sessionStorage.getItem('rsi-admin-auth') === '1'

  const navItems: { key: View; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { key: 'topics',  label: t('nav.dashboard'), icon: <LayoutDashboard size={15} /> },
    { key: 'ranking', label: t('nav.ranking'),   icon: <BarChart3 size={15} />      },
    { key: 'admin',   label: t('nav.admin'),     icon: <Settings size={15} />, hidden: !isAdminAuth },
  ]

  function isActive(key: View) {
    return view === key || (key === 'topics' && (view === 'scenes' || view === 'scoring' || view === 'einstieg'))
  }

  // App komplett zurücksetzen
  async function handleResetApp() {
    if (!window.confirm(t('landing.resetConfirm'))) return
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  return (
    <header
      style={{
        height: 'var(--zh-navbar-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--zh-color-border)',
        background: isDark ? 'rgba(0,0,0,0.75)' : 'var(--zh-color-bg)',
        backdropFilter: isDark ? 'blur(16px)' : 'none',
        flexShrink: 0,
        zIndex: 50,
        fontFamily: 'var(--zh-font)',
      }}
    >
      {/* Logo: TBA ISSI-Ausbildungslogo + Wortmarke */}
      <button
        onClick={() => onNavigate('topics')}
        aria-label={t('nav.dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <IssiLogo height={32} />
        <div style={{ lineHeight: 1.2, textAlign: 'left' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--zh-color-text)' }}>RSI VR Tool</div>
          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--zh-color-text-disabled)' }}>
            Fachstelle Verkehrssicherheit
          </div>
        </div>
      </button>

      {/* Nav-Links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navItems.filter(n => !n.hidden).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
              background: isActive(key) ? 'var(--zh-color-bg-tertiary)' : 'transparent',
              color: isActive(key) ? 'var(--zh-color-accent)' : 'var(--zh-color-text-muted)',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </nav>

      {/* Rechts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Score-Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--zh-color-accent)', background: isDark ? 'rgba(122,182,226,0.1)' : 'rgba(0,118,189,0.06)', color: 'var(--zh-color-accent)', fontSize: '13px', fontWeight: 700 }}>
          <Trophy size={12} />
          {score.toLocaleString('de-CH')} Pkt.
        </div>

        {/* Live-Indikator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, color: sbStatus === 'live' ? 'var(--zh-gruen)' : 'var(--zh-color-text-disabled)' }} title={sbStatus === 'live' ? 'Supabase Live' : 'Nur localStorage'}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sbStatus === 'live' ? 'var(--zh-gruen)' : 'var(--zh-color-text-disabled)' }} />
          {sbStatus === 'live' ? t('status.live') : t('status.offline')}
        </div>

        <LanguageSwitcher />

        {/* Dark-Toggle — 44x44 fuer WCAG 2.5.5 AA Touch-Target */}
        <button
          onClick={onToggleTheme}
          aria-label={isDark ? t('theme.light', 'Helles Design') : t('theme.dark', 'Dunkles Design')}
          style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>

        {/* Avatar mit Popover */}
        {username && (
          <div ref={popoverRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPopover(v => !v)}
              aria-label={t('popover.ariaLabel', { name: username, defaultValue: `Menü für ${username}` })}
              aria-expanded={showPopover}
              aria-haspopup="menu"
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'var(--zh-dunkelblau)', color: 'white',
                fontSize: '15px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: showPopover ? '2px solid var(--zh-blau)' : '2px solid transparent',
                cursor: 'pointer', transition: 'border-color 0.15s', flexShrink: 0,
              }}
            >
              {username.charAt(0).toUpperCase()}
            </button>

            {/* Popover */}
            {showPopover && (
              <div
                style={{
                  position: 'absolute', top: '40px', right: 0,
                  width: '260px',
                  background: 'var(--zh-color-surface)',
                  border: '1px solid var(--zh-color-border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--zh-shadow-lg)',
                  padding: '16px',
                  zIndex: 100,
                  fontFamily: 'var(--zh-font)',
                }}
              >
                {/* User-Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'var(--zh-dunkelblau)', color: 'white',
                    fontSize: '16px', fontWeight: 800, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--zh-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {username}
                    </div>
                    {kursName && (
                      <div style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {kursName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px',
                  background: 'var(--zh-color-bg-secondary)',
                  marginBottom: '12px',
                }}>
                  <Trophy size={14} style={{ color: 'var(--zh-color-accent)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
                      {score.toLocaleString('de-CH')} {t('score.points')}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)' }}>
                      {t('completion.gesamtscore')}
                    </div>
                  </div>
                </div>

                {/* Trennlinie */}
                <div style={{ height: '1px', background: 'var(--zh-color-border)', margin: '4px 0' }} />

                {/* Aktionen */}
                <button
                  onClick={() => { setShowPopover(false); setShowFeedback(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '10px 8px', marginTop: '4px',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 500, color: 'var(--zh-color-text-muted)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <MessageSquare size={14} />
                  {t('popover.feedback')}
                </button>

                {isAdminAuth && onAdminLogout && (
                  <button
                    onClick={() => { setShowPopover(false); onAdminLogout() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '10px 8px', marginTop: '4px',
                      background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px',
                      fontSize: '13px', fontWeight: 600, color: 'var(--zh-color-accent)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <ShieldOff size={14} />
                    {t('popover.admin_logout', 'Admin-Rolle ablegen')}
                  </button>
                )}

                <button
                  onClick={() => { setShowPopover(false); onLogout() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '10px 8px', marginTop: '4px',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 500, color: 'var(--zh-color-text-muted)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <LogOut size={14} />
                  {t('popover.logout')}
                </button>

                <button
                  onClick={() => { setShowPopover(false); handleResetApp() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '10px 8px',
                    background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 500, color: 'var(--zh-color-text-disabled)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  {t('landing.resetApp')}
                </button>

                {/* Trennlinie */}
                <div style={{ height: '1px', background: 'var(--zh-color-border)', margin: '8px 0 4px' }} />

                {/* Rechtliche Links (nDSG/DSGVO — auch nach Login erreichbar) */}
                <a
                  href="/impressum.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '8px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 500, color: 'var(--zh-color-text-muted)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <FileText size={13} aria-hidden="true" />
                  {t('footer.impressum', 'Impressum')}
                </a>
                <a
                  href="/datenschutz.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '8px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 500, color: 'var(--zh-color-text-muted)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <ShieldCheck size={13} aria-hidden="true" />
                  {t('footer.datenschutz', 'Datenschutz')}
                </a>
                <a
                  href="/glossar.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '8px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: 500, color: 'var(--zh-color-text-muted)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--zh-color-bg-secondary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <BookOpen size={13} aria-hidden="true" />
                  {t('footer.glossar', 'Glossar')}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <FeedbackModal
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
        context={`View: ${view}${kursName ? ' · Kurs: ' + kursName : ''}`}
      />
    </header>
  )
}
