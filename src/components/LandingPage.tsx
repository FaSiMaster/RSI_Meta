// Landing Page – Login-Screen ohne Navbar
// ZH Corporate Design, zweispaltig, mind. 14px Text, 32px Padding

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Eye, BarChart3, BookOpen, Settings, Shield } from 'lucide-react'
import { motion } from 'motion/react'
import LanguageSwitcher from './LanguageSwitcher'

interface Props {
  onStart: (username: string) => void
  onAdmin: () => void
}

export default function LandingPage({ onStart, onAdmin }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')

  const handleStart = () => {
    if (name.trim()) onStart(name.trim())
  }

  const features = [
    { icon: Eye,       label: t('landing.feature1') },
    { icon: BarChart3, label: t('landing.feature2') },
    { icon: BookOpen,  label: t('landing.feature3') },
  ]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--zh-color-bg)', color: 'var(--zh-color-text)' }}
    >
      {/* Top-Bar mit Sprache */}
      <div
        className="flex justify-end items-center px-8 py-3"
        style={{ borderBottom: '1px solid var(--zh-color-border)' }}
      >
        <LanguageSwitcher />
      </div>

      {/* Hauptbereich */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ padding: '0 var(--zh-padding-page)' }}
      >
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center py-16">

          {/* ── Linke Spalte: Tagline + Features ── */}
          <div className="space-y-12">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* KZH-Logo-Ersatz */}
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--zh-dunkelblau)' }}
                >
                  <Shield size={20} color="white" />
                </div>
                <div>
                  <p className="font-bold text-base leading-none">RSI-Immersive</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--zh-color-text-muted)' }}>
                    Fachstelle Verkehrssicherheit · Kanton Zürich
                  </p>
                </div>
              </div>

              <h1
                className="font-bold tracking-[-0.03em] leading-[0.92] mb-6"
                style={{ fontSize: 'clamp(44px,6vw,68px)', color: 'var(--zh-color-text)' }}
              >
                {t('landing.tagline1')} <br />
                <span style={{ color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
                  {t('landing.tagline2')}
                </span> <br />
                {t('landing.tagline3')}
              </h1>

              <p className="text-lg leading-relaxed max-w-md" style={{ color: 'var(--zh-color-text-muted)' }}>
                {t('onboarding.subtitle')}
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-5"
            >
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-4 group">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-accent)',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="font-medium" style={{ fontSize: '14px', color: 'var(--zh-color-text-secondary)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{ paddingTop: '24px', borderTop: '1px solid var(--zh-color-border)' }}
            >
              <button
                onClick={onAdmin}
                className="group flex items-center gap-3 transition-colors"
                style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--zh-color-text-disabled)' }}
              >
                <Settings size={12} className="group-hover:rotate-90 transition-transform duration-500" />
                {t('onboarding.systemAdmin')}
              </button>
            </motion.div>
          </div>

          {/* ── Rechte Spalte: Login-Card ── */}
          <motion.div
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            style={{
              borderRadius: '24px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              boxShadow: 'var(--zh-shadow-lg)',
              padding: '40px',
            }}
          >
            <div className="space-y-8">
              <div>
                <h2 className="font-bold mb-1" style={{ fontSize: '22px' }}>
                  {t('onboarding.welcome')}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
                  {t('onboarding.identifyRanking')}
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label
                    className="block font-bold mb-2"
                    style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--zh-color-text-muted)' }}
                  >
                    {t('landing.loginLabel')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStart()}
                    placeholder={t('onboarding.namePlaceholder')}
                    autoFocus
                    className="w-full bg-transparent focus:outline-none font-bold transition-colors"
                    style={{
                      fontSize: '20px',
                      paddingBottom: '12px',
                      borderBottom: '2px solid var(--zh-color-border)',
                      color: 'var(--zh-color-text)',
                      caretColor: 'var(--zh-color-accent)',
                    }}
                  />
                </div>

                {/* Status-Anzeige */}
                <div
                  className="flex items-center gap-3 rounded-xl"
                  style={{
                    padding: '12px 16px',
                    background: 'var(--zh-color-bg-secondary)',
                    border: '1px solid var(--zh-color-border)',
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full animate-pulse shrink-0"
                    style={{ background: 'var(--zh-gruen)' }}
                  />
                  <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-muted)' }}>
                    {t('onboarding.questReady')}
                  </p>
                </div>

                <button
                  onClick={handleStart}
                  disabled={!name.trim()}
                  className="w-full flex items-center justify-center gap-3 font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    fontSize: '16px',
                    padding: '16px 24px',
                    borderRadius: 'var(--zh-radius-btn)',
                    background: 'var(--zh-dunkelblau)',
                  }}
                >
                  {t('landing.startBtn')} <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center"
        style={{
          padding: '16px 32px',
          borderTop: '1px solid var(--zh-color-border)',
          fontSize: '11px',
          color: 'var(--zh-color-text-disabled)',
          fontWeight: 600,
          letterSpacing: '0.06em',
        }}
      >
        {t('landing.systemOnline')}
      </div>
    </div>
  )
}
