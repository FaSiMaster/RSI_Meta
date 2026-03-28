// Onboarding-Overlay: wird VOR dem VR-Einstieg angezeigt (2D-Webseite)
// Benutzer gibt Name ein, wählt Themenbereich und Szene → dann VR starten

import { useEffect, useState } from 'react'
import type { UserSession } from '../types'
import { PLACEHOLDER_TOPICS } from '../data/topics.placeholder'

interface OnboardingScreenProps {
  onStart: (session: UserSession) => void
}

const STORAGE_KEY = 'rsi-username'

// Farben passend zu App-Hintergrund #0f0f1a
const STYLES = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: '#0f0f1a',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    fontFamily: 'system-ui, Arial, sans-serif',
    padding: '1.5rem',
  },
  card: {
    background: '#151525',
    border: '1px solid #1e2a3a',
    borderRadius: '8px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '440px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '0.5rem',
  },
  kanton: {
    fontSize: '0.7rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#556677',
    marginBottom: '0.4rem',
  },
  title: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#FFFFFF',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.8rem',
    color: '#6677AA',
  },
  label: {
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#7788AA',
    marginBottom: '0.375rem',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    background: '#0f0f1a',
    border: '1px solid #2a3a4a',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontFamily: 'system-ui, Arial, sans-serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '0.625rem 0.875rem',
    background: '#0f0f1a',
    border: '1px solid #2a3a4a',
    borderRadius: '4px',
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontFamily: 'system-ui, Arial, sans-serif',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  selectDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  button: {
    padding: '0.875rem',
    background: '#003C71',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    fontFamily: 'system-ui, Arial, sans-serif',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  buttonDisabled: {
    background: '#1a2a3a',
    color: '#445566',
    cursor: 'not-allowed',
  },
  hint: {
    fontSize: '0.7rem',
    color: '#445566',
    textAlign: 'center' as const,
    marginTop: '0.25rem',
  },
}

export function OnboardingScreen({ onStart }: OnboardingScreenProps) {
  const [userName, setUserName] = useState('')
  const [topicId, setTopicId] = useState('')
  const [sceneId, setSceneId] = useState('')
  const [vrSupported, setVrSupported] = useState<boolean | null>(null)

  // Gespeicherten Namen aus localStorage laden
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setUserName(saved)
  }, [])

  // WebXR-Verfügbarkeit prüfen
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-vr')
        .then(setVrSupported)
        .catch(() => setVrSupported(false))
    } else {
      setVrSupported(false)
    }
  }, [])

  const selectedTopic = PLACEHOLDER_TOPICS.find((t) => t.id === topicId)
  const scenes = selectedTopic?.scenes ?? []

  // Szene zurücksetzen wenn Thema wechselt
  const handleTopicChange = (id: string) => {
    setTopicId(id)
    setSceneId('')
  }

  const canStart =
    userName.trim().length > 0 &&
    topicId !== '' &&
    sceneId !== '' &&
    vrSupported === true

  const handleStart = () => {
    if (!canStart) return
    localStorage.setItem(STORAGE_KEY, userName.trim())
    onStart({ userName: userName.trim(), topicId, sceneId })
  }

  return (
    <div style={STYLES.overlay}>
      <div style={STYLES.card}>
        {/* Header */}
        <div style={STYLES.header}>
          <p style={STYLES.kanton}>Fachstelle Verkehrssicherheit · Kanton Zürich</p>
          <h1 style={STYLES.title}>RSI VR Tool</h1>
          <p style={STYLES.subtitle}>Road Safety Inspection – Begehung vorbereiten</p>
        </div>

        {/* Name */}
        <div>
          <label style={STYLES.label}>Ihr Name</label>
          <input
            style={STYLES.input}
            type="text"
            placeholder="z.B. M. Müller"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Themenbereich */}
        <div>
          <label style={STYLES.label}>Themenbereich</label>
          <select
            style={STYLES.select}
            value={topicId}
            onChange={(e) => handleTopicChange(e.target.value)}
          >
            <option value="">— Themenbereich wählen —</option>
            {PLACEHOLDER_TOPICS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Szene */}
        <div>
          <label style={STYLES.label}>Szene</label>
          <select
            style={{
              ...STYLES.select,
              ...(topicId === '' ? STYLES.selectDisabled : {}),
            }}
            value={sceneId}
            onChange={(e) => setSceneId(e.target.value)}
            disabled={topicId === ''}
          >
            <option value="">— Szene wählen —</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* VR starten */}
        <button
          style={{
            ...STYLES.button,
            ...(canStart ? {} : STYLES.buttonDisabled),
          }}
          onClick={handleStart}
          disabled={!canStart}
        >
          VR-Begehung starten
        </button>

        {/* Hinweis WebXR */}
        <p style={STYLES.hint}>
          {vrSupported === null && 'WebXR wird geprüft...'}
          {vrSupported === false && 'Bitte im Meta Quest Browser öffnen'}
          {vrSupported === true && 'Meta Quest Browser erkannt'}
        </p>
      </div>
    </div>
  )
}
