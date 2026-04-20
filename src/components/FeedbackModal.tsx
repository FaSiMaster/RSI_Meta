// FeedbackModal — einfacher Bug-Report / Feedback-Kanal via mailto.
// Kein Backend nötig; öffnet den Standard-Mailclient mit vorausgefülltem Body.

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Send, MessageSquare } from 'lucide-react'
import { useFocusTrap } from '../lib/useFocusTrap'

const SUPPORT_EMAIL = 'sicherheit.tba@bd.zh.ch'

interface Props {
  open: boolean
  onClose: () => void
  context?: string   // z.B. 'Szene: Kreuzung Hauptstrasse / Schritt: NACA-Eingabe'
}

export default function FeedbackModal({ open, onClose, context }: Props) {
  const { t } = useTranslation()
  const [kategorie, setKategorie] = useState<'bug' | 'idee' | 'frage'>('bug')
  const [betreff, setBetreff] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)

  // ESC schliesst das Modal (WCAG 2.1.2 No-Keyboard-Trap)
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // E-7: Focus-Trap
  useFocusTrap(dialogRef, open)

  if (!open) return null

  function handleSenden() {
    const ua = navigator.userAgent
    const url = window.location.href
    const time = new Date().toISOString()
    const version = import.meta.env.VITE_APP_VERSION ?? '0.4.0'

    const subjLabel = kategorie === 'bug'
      ? t('feedback.subjBug')
      : kategorie === 'idee'
        ? t('feedback.subjIdee')
        : t('feedback.subjFrage')

    // Defensive Hygiene: CR/LF im Betreff entfernen (Header-Injection-Schutz
    // fuer Mailclients, die mailto-Parameter ohne Re-Encoding verarbeiten)
    const cleanBetreff = betreff.replace(/[\r\n]+/g, ' ').slice(0, 160)
    const subject = `[RSI] ${subjLabel}${cleanBetreff ? ': ' + cleanBetreff : ''}`

    const body = [
      `--- ${t('feedback.mailAuf')} ---`,
      '',
      beschreibung || t('feedback.mailDefault'),
      '',
      '',
      `--- ${t('feedback.mailTech')} ---`,
      `${t('feedback.mailKategorie')}: ${subjLabel}`,
      `${t('feedback.mailZeit')}: ${time}`,
      `${t('feedback.mailUrl')}: ${url}`,
      `${t('feedback.mailVersion')}: ${version}`,
      `${t('feedback.mailBrowser')}: ${ua}`,
      context ? `${t('feedback.mailKontext')}: ${context}` : '',
    ].filter(Boolean).join('\n')

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    onClose()
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
    >
      <div
        ref={dialogRef}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px',
          borderRadius: '14px',
          background: 'var(--zh-color-surface)',
          border: '1px solid var(--zh-color-border)',
          boxShadow: 'var(--zh-shadow-lg)',
          fontFamily: 'var(--zh-font)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--zh-color-border)',
          background: 'var(--zh-color-bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={16} style={{ color: 'var(--zh-blau)' }} />
            <h2 id="feedback-modal-title" style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--zh-color-text)' }}>
              {t('feedback.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: '4px' }}
            aria-label={t('feedback.closeAria')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px' }}>
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: 0, marginBottom: '14px' }}>
            {t('feedback.intro')}
          </p>

          {/* Kategorie */}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-muted)', marginBottom: '6px' }}>
            {t('feedback.katLabel')}
          </label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {([
              { key: 'bug',   label: t('feedback.katBug') },
              { key: 'idee',  label: t('feedback.katIdee') },
              { key: 'frage', label: t('feedback.katFrage') },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setKategorie(key)}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: '8px',
                  border: kategorie === key ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
                  background: kategorie === key ? 'rgba(0,118,189,0.12)' : 'var(--zh-color-bg-secondary)',
                  color: kategorie === key ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--zh-font)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Betreff */}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-muted)', marginBottom: '6px' }}>
            {t('feedback.betreffLabel')}
          </label>
          <input
            value={betreff}
            onChange={e => setBetreff(e.target.value)}
            placeholder={t('feedback.betreffPlaceholder')}
            style={{
              width: '100%', padding: '9px 11px', marginBottom: '14px',
              borderRadius: '8px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              color: 'var(--zh-color-text)',
              fontSize: '13px', fontFamily: 'var(--zh-font)',
              outline: 'none',
            }}
          />

          {/* Beschreibung */}
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-muted)', marginBottom: '6px' }}>
            {t('feedback.beschreibungLabel')}
          </label>
          <textarea
            value={beschreibung}
            onChange={e => setBeschreibung(e.target.value)}
            placeholder={t('feedback.beschreibungPlaceholder')}
            rows={6}
            style={{
              width: '100%', padding: '9px 11px',
              borderRadius: '8px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              color: 'var(--zh-color-text)',
              fontSize: '13px', fontFamily: 'var(--zh-font)',
              outline: 'none', resize: 'vertical', minHeight: '80px',
            }}
          />

          {context && (
            <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginTop: '10px', marginBottom: 0 }}>
              {t('feedback.kontextLabel')} <em>{context}</em>
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '8px',
          padding: '12px 18px',
          borderTop: '1px solid var(--zh-color-border)',
          background: 'var(--zh-color-bg-secondary)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid var(--zh-color-border)',
              background: 'transparent', color: 'var(--zh-color-text-muted)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--zh-font)',
            }}
          >
            {t('feedback.abbrechen')}
          </button>
          <button
            onClick={handleSenden}
            disabled={!beschreibung.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 18px', borderRadius: '8px',
              background: beschreibung.trim() ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
              color: beschreibung.trim() ? 'white' : 'var(--zh-color-text-disabled)',
              border: 'none', fontSize: '12px', fontWeight: 700,
              cursor: beschreibung.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--zh-font)',
            }}
          >
            <Send size={13} /> {t('feedback.senden')}
          </button>
        </div>
      </div>
    </div>
  )
}
