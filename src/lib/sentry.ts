// Sentry-Initialisierung — optional, wird nur aktiv wenn VITE_SENTRY_DSN gesetzt ist.
// Ohne DSN macht diese Datei nichts, kein Laufzeit-Overhead.
import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `rsi-meta@${import.meta.env.VITE_APP_VERSION ?? '0.4.0'}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.3,
    beforeSend(event) {
      // Klartext-Namen entfernen, falls versehentlich in Breadcrumbs landen
      if (event.user?.username) {
        delete event.user.username
      }
      return event
    },
  })
}

export { Sentry }
