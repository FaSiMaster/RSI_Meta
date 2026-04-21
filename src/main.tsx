import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index'
import './index.css'
import App from './App'
import { initSentry, Sentry } from './lib/sentry'

initSentry()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root-Element #root nicht gefunden')

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog={false}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)

// Stale Service Worker + Precache sind die häufigste Ursache für
// wiederkehrende Crashes nach Deploy. Der zweite Button entfernt SW +
// CacheStorage (ohne localStorage zu löschen, User-Daten bleiben).
async function swAndCachesReset(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
    }
  } catch (e) {
    console.warn('[ErrorFallback] SW/Cache-Reset fehlgeschlagen', e)
  }
}

// ── Auto-Update-Recovery: bei neuem SW-Bundle sofort die Seite reloaden,
// damit Clients nicht ewig auf dem alten Precache hängen. Das passiert
// zusätzlich zum expliziten ErrorFallback-Reset.
if ('serviceWorker' in navigator) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}

function ErrorFallback() {
  const [resetting, setResetting] = useState(false)

  async function handleResetAndReload() {
    setResetting(true)
    await swAndCachesReset()
    window.location.reload()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', padding: '32px', fontFamily: 'var(--zh-font)',
      background: 'var(--zh-color-bg)', color: 'var(--zh-color-text)', textAlign: 'center',
    }}>
      <h1 style={{ color: 'var(--zh-dunkelblau)', marginBottom: '12px' }}>Es ist ein Fehler aufgetreten</h1>
      <p style={{ color: 'var(--zh-color-text-muted)', maxWidth: '480px', marginBottom: '24px' }}>
        Bitte laden Sie die Seite neu. Falls der Fehler erneut auftritt, nutzen Sie «Zurücksetzen &amp; neu laden».
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px', borderRadius: '8px', background: 'var(--zh-dunkelblau)',
            color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Seite neu laden
        </button>
        <button
          onClick={handleResetAndReload}
          disabled={resetting}
          style={{
            padding: '10px 24px', borderRadius: '8px', background: 'transparent',
            color: 'var(--zh-dunkelblau)', border: '2px solid var(--zh-dunkelblau)',
            fontWeight: 700, cursor: resetting ? 'wait' : 'pointer', opacity: resetting ? 0.6 : 1,
          }}
        >
          {resetting ? 'Wird zurückgesetzt…' : 'Zurücksetzen & neu laden'}
        </button>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', maxWidth: '480px', marginTop: '20px' }}>
        «Zurücksetzen» löscht Service Worker und Offline-Cache (PWA). Ihre lokalen Kurs- und Session-Daten bleiben erhalten.
      </p>
    </div>
  )
}
