// Navbar – 52px, ZH Corporate Design
// Links: Logo | Mitte: Nav-Links | Rechts: Score + Sprache + Dark-Toggle + Avatar

import { useTranslation } from 'react-i18next'
import { LayoutDashboard, BarChart3, Settings, Sun, Moon, Trophy } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'

type View = 'topics' | 'scenes' | 'scoring' | 'admin' | 'ranking'

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

  const navItems: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'topics',  label: t('nav.dashboard'), icon: <LayoutDashboard size={15} /> },
    { key: 'ranking', label: t('nav.ranking'),   icon: <BarChart3 size={15} />      },
    { key: 'admin',   label: t('nav.admin'),     icon: <Settings size={15} />       },
  ]

  return (
    <header
      className="flex items-center justify-between px-6 shrink-0 z-50"
      style={{
        height: 'var(--zh-navbar-h)',
        borderBottom: '1px solid var(--zh-color-border)',
        background: isDark ? 'rgba(0,0,0,0.7)' : 'var(--zh-color-bg)',
        backdropFilter: isDark ? 'blur(16px)' : 'none',
        fontFamily: 'var(--zh-font)',
      }}
    >
      {/* ── Logo ── */}
      <button
        onClick={() => onNavigate('topics')}
        className="flex items-center gap-2.5 group"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--zh-dunkelblau)' }}
        >
          {/* Shield SVG */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L4 7v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-4z" fill="white"/>
          </svg>
        </div>
        <div className="leading-none">
          <span className="font-bold" style={{ fontSize: '14px', color: 'var(--zh-color-text)' }}>
            RSI-Immersive
          </span>
          <p
            style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--zh-color-text-disabled)', marginTop: '2px' }}
          >
            Fachstelle Verkehrssicherheit · Kanton Zürich
          </p>
        </div>
      </button>

      {/* ── Nav-Links (Mitte) ── */}
      <nav className="flex items-center gap-1">
        {navItems.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="flex items-center gap-1.5 rounded-lg transition-colors"
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              background: (view === key || (view === 'scenes' && key === 'topics') || (view === 'scoring' && key === 'topics'))
                ? 'var(--zh-color-bg-tertiary)' : 'transparent',
              color: (view === key || (view === 'scenes' && key === 'topics') || (view === 'scoring' && key === 'topics'))
                ? 'var(--zh-color-accent)' : 'var(--zh-color-text-muted)',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </nav>

      {/* ── Rechts: Score + Controls ── */}
      <div className="flex items-center gap-3">
        {/* Score-Pill */}
        <div
          className="flex items-center gap-1.5 rounded-full"
          style={{
            padding: '4px 12px',
            border: '1px solid var(--zh-color-accent)',
            background: isDark ? 'rgba(122,182,226,0.1)' : 'rgba(0,118,189,0.06)',
            color: 'var(--zh-color-accent)',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          <Trophy size={12} />
          {score.toLocaleString('de-CH')} {t('score.points')}
        </div>

        {/* Sprache */}
        <LanguageSwitcher />

        {/* Dark-Toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center justify-center rounded-full transition-colors"
          style={{
            width: '30px',
            height: '30px',
            border: '1px solid var(--zh-color-border)',
            background: 'var(--zh-color-bg-secondary)',
            color: 'var(--zh-color-text-muted)',
          }}
          title={isDark ? t('onboarding.lightMode') : t('onboarding.darkMode')}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Avatar */}
        {username && (
          <div
            className="flex items-center justify-center rounded-full font-bold shrink-0"
            style={{
              width: '30px',
              height: '30px',
              background: 'var(--zh-dunkelblau)',
              color: 'white',
              fontSize: '12px',
            }}
            title={username}
          >
            {username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
