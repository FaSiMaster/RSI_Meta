// Navbar – 52px, ZH Corporate Design
// Links: Logo | Mitte: Nav-Links | Rechts: Score + Live + Sprache + Dark-Toggle + Avatar
// Admin-Link nur sichtbar wenn in dieser Session authentifiziert

import { LayoutDashboard, BarChart3, Settings, Sun, Moon, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { getSupabaseStatus, onStatusChange } from '../lib/supabase'

type View = 'topics' | 'scenes' | 'einstieg' | 'viewer' | 'scoring' | 'szenenabschluss' | 'admin' | 'ranking'

interface Props {
  view: string
  username: string
  score: number
  theme: 'light' | 'dark'
  onNavigate: (v: View) => void
  onToggleTheme: () => void
}

export default function Navbar({ view, username, score, theme, onNavigate, onToggleTheme }: Props) {
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  // Supabase Live-Indikator
  const [sbStatus, setSbStatus] = useState(getSupabaseStatus())
  useEffect(() => onStatusChange(() => setSbStatus(getSupabaseStatus())), [])

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
      {/* Logo */}
      <button onClick={() => onNavigate('topics')} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--zh-dunkelblau)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L4 7v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-4z" fill="white" />
          </svg>
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--zh-color-text)' }}>RSI-Immersive</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, color: sbStatus === 'live' ? '#1A7F1F' : 'var(--zh-color-text-disabled)' }} title={sbStatus === 'live' ? 'Supabase Live' : 'Nur localStorage'}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sbStatus === 'live' ? '#1A7F1F' : 'var(--zh-color-text-disabled)' }} />
          {sbStatus === 'live' ? t('status.live') : t('status.offline')}
        </div>

        <LanguageSwitcher />

        {/* Dark-Toggle */}
        <button
          onClick={onToggleTheme}
          style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Avatar */}
        {username && (
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--zh-dunkelblau)', color: 'white', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
