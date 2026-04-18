import { StrictMode } from 'react'
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

function ErrorFallback() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', padding: '32px', fontFamily: 'var(--zh-font)',
      background: 'var(--zh-color-bg)', color: 'var(--zh-color-text)', textAlign: 'center',
    }}>
      <h1 style={{ color: 'var(--zh-dunkelblau)', marginBottom: '12px' }}>Es ist ein Fehler aufgetreten</h1>
      <p style={{ color: 'var(--zh-color-text-muted)', maxWidth: '480px', marginBottom: '24px' }}>
        Bitte laden Sie die Seite neu. Falls der Fehler erneut auftritt, melden Sie ihn bitte an die Fachstelle Verkehrssicherheit.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 24px', borderRadius: '8px', background: 'var(--zh-dunkelblau)',
          color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Seite neu laden
      </button>
    </div>
  )
}
