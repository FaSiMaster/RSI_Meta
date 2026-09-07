// miniaturSpeicher.ts — eigener Vorrat an Vorschaubildern im Browser.
//
// Warum es ihn braucht, am Bestand gemessen (7. September 2026):
//
//   • Ein Panorama im Bildspeicher ist 9,6 MB gross (8192 × 4096).
//   • Der Verkleinerungsdienst des Anbieters antwortet mit 403 — er ist im
//     Tarif nicht enthalten. Es gibt also keine kleine Fassung zu holen.
//   • Der Bildspeicher liefert «Cache-Control: no-cache». Der Browser behält
//     nichts; jedes Öffnen der Bibliothek lädt alles noch einmal.
//
// Ein Ordner mit sechs Standorten sind damit 58 MB je Ansicht, für Kacheln von
// 200 Bildpunkten. Deshalb wird jedes Bild einmal geladen, im Browser auf die
// gebrauchte Breite verkleinert und hier behalten. Ab dem zweiten Mal kommt es
// aus diesem Vorrat.
//
// Abgelegt wird in IndexedDB, nicht im localStorage: Dort liegen Zeichenketten
// mit einem Vorrat von wenigen Megabyte, hier liegen Bilddaten.

import { logger } from './logger'

const DB_NAME = 'rsi-miniaturen'
const DB_VERSION = 1
const STORE = 'bilder'

// Ein Eintrag altert nach dreissig Tagen. Ein Panorama wird unter derselben
// Adresse nicht überschrieben (der Bildspeicher lässt das nicht zu), aber ein
// Vorrat, der nie vergisst, wächst unbegrenzt.
const HALTBARKEIT_MS = 30 * 24 * 60 * 60 * 1000

interface Eintrag {
  schluessel: string
  blob: Blob
  erzeugt: number
}

let dbVersprechen: Promise<IDBDatabase | null> | null = null

function oeffneDb(): Promise<IDBDatabase | null> {
  if (dbVersprechen) return dbVersprechen
  dbVersprechen = new Promise(aufloesen => {
    if (typeof indexedDB === 'undefined') {
      aufloesen(null)
      return
    }
    try {
      const anfrage = indexedDB.open(DB_NAME, DB_VERSION)
      anfrage.onupgradeneeded = () => {
        const db = anfrage.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'schluessel' })
        }
      }
      anfrage.onsuccess = () => aufloesen(anfrage.result)
      anfrage.onerror = () => {
        logger.warn('Miniaturspeicher nicht verfügbar:', anfrage.error?.message)
        aufloesen(null)
      }
    } catch (e) {
      logger.warn('Miniaturspeicher nicht verfügbar:', String(e))
      aufloesen(null)
    }
  })
  return dbVersprechen
}

function schluesselFuer(url: string, breite: number): string {
  return `${breite}|${url}`
}

export async function leseMiniatur(url: string, breite: number): Promise<Blob | null> {
  const db = await oeffneDb()
  if (!db) return null
  return new Promise(aufloesen => {
    try {
      const tx = db.transaction(STORE, 'readonly')
      const anfrage = tx.objectStore(STORE).get(schluesselFuer(url, breite))
      anfrage.onsuccess = () => {
        const e = anfrage.result as Eintrag | undefined
        if (!e) return aufloesen(null)
        if (Date.now() - e.erzeugt > HALTBARKEIT_MS) return aufloesen(null)
        aufloesen(e.blob)
      }
      anfrage.onerror = () => aufloesen(null)
    } catch {
      aufloesen(null)
    }
  })
}

export async function schreibeMiniatur(url: string, breite: number, blob: Blob): Promise<void> {
  const db = await oeffneDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ schluessel: schluesselFuer(url, breite), blob, erzeugt: Date.now() } as Eintrag)
  } catch (e) {
    logger.warn('Miniatur konnte nicht abgelegt werden:', String(e))
  }
}

export async function leereMiniaturen(): Promise<void> {
  const db = await oeffneDb()
  if (!db) return
  try {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
  } catch { /* ohne Vorrat geht es auch, nur langsamer */ }
}

// ── Verkleinern ──
// Das Seitenverhältnis bleibt erhalten; ein Panorama ist 2:1, ein
// Vorschaubild muss es nicht sein.
export function verkleinere(bild: HTMLImageElement, breite: number): Promise<Blob | null> {
  return new Promise(aufloesen => {
    const w = Math.min(breite, bild.naturalWidth || breite)
    const h = Math.max(1, Math.round(w * (bild.naturalHeight / Math.max(1, bild.naturalWidth))))
    try {
      const leinwand = document.createElement('canvas')
      leinwand.width = w
      leinwand.height = h
      const ctx = leinwand.getContext('2d')
      if (!ctx) return aufloesen(null)
      ctx.drawImage(bild, 0, 0, w, h)
      leinwand.toBlob(b => aufloesen(b), 'image/jpeg', 0.72)
    } catch (e) {
      // Ein fremdes Bild ohne CORS-Freigabe macht die Leinwand unlesbar.
      logger.warn('Verkleinern fehlgeschlagen:', String(e))
      aufloesen(null)
    }
  })
}

// ── Warteschlange ──
// Ohne Begrenzung starten alle Kacheln eines Ordners gleichzeitig; bei sechs
// Bildern sind das 58 MB auf einmal, und keines wird zuerst fertig.
const MAX_GLEICHZEITIG = 2
let laufend = 0
const wartend: (() => void)[] = []

export function inWarteschlange<T>(arbeit: () => Promise<T>): Promise<T> {
  return new Promise((aufloesen, ablehnen) => {
    const starte = () => {
      laufend++
      arbeit()
        .then(aufloesen, ablehnen)
        .finally(() => {
          laufend--
          const naechste = wartend.shift()
          if (naechste) naechste()
        })
    }
    if (laufend < MAX_GLEICHZEITIG) starte()
    else wartend.push(starte)
  })
}
