// Logger-Wrapper — zentraler Ein-/Ausschaltpunkt und Sentry-Integration.
//
// Warum ein Wrapper:
// - info/debug-Logs sollen in Production stumm sein (kein User-Noise in Browser-
//   Console)
// - warn/error sollen zusaetzlich an Sentry gehen, wenn Sentry konfiguriert ist
// - Einheitliches [RSI]-Prefix erzwingen
//
// Verwendung:
//   import { logger } from '../lib/logger'
//   logger.info('Supabase geladen:', count)
//   logger.warn('Sync fehlgeschlagen:', err)
//   logger.error('Kritischer Fehler:', err)

const isProd = import.meta.env.PROD
const PREFIX = '[RSI]'

// Sentry wird dynamisch geladen, damit der Logger auch funktioniert wenn
// @sentry/react nicht installiert oder VITE_SENTRY_DSN nicht gesetzt ist.
type SentryLike = {
  captureMessage: (msg: string, level: 'warning' | 'error') => void
  captureException: (err: unknown) => void
}
let sentry: SentryLike | null = null

// Fire-and-forget Init — der Logger blockt nicht darauf
if (typeof window !== 'undefined' && import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(mod => {
    sentry = {
      captureMessage: (msg, level) => mod.captureMessage(msg, level),
      captureException: (err) => mod.captureException(err),
    }
  }).catch(() => { /* Sentry nicht verfuegbar, stumm */ })
}

function formatArgs(args: unknown[]): string {
  return args.map(a => {
    if (a instanceof Error) return `${a.name}: ${a.message}`
    if (typeof a === 'object') { try { return JSON.stringify(a) } catch { return String(a) } }
    return String(a)
  }).join(' ')
}

export const logger = {
  // info/debug: nur in Development in der Console sichtbar. In Production
  // stumm — verhindert dass Nutzer in DevTools technische Internals sehen.
  info(...args: unknown[]): void {
    if (!isProd) console.info(PREFIX, ...args)
  },

  debug(...args: unknown[]): void {
    if (!isProd) console.debug(PREFIX, ...args)
  },

  // warn: sichtbar in Dev + Prod (fuer Admins im DevTools), optional an Sentry
  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args)
    if (sentry) {
      try { sentry.captureMessage(`${PREFIX} ${formatArgs(args)}`, 'warning') } catch { /* noop */ }
    }
  },

  // error: sichtbar + Sentry. Bei Error-Instanzen captureException (mit
  // Stacktrace), sonst Text-Message.
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args)
    if (sentry) {
      try {
        const err = args.find(a => a instanceof Error)
        if (err) sentry.captureException(err)
        else sentry.captureMessage(`${PREFIX} ${formatArgs(args)}`, 'error')
      } catch { /* noop */ }
    }
  },
}
