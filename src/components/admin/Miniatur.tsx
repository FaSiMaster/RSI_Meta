// Miniatur.tsx — Vorschaukachel für ein Panorama.
//
// Eine blosse <img>-Einbindung genügt hier nicht. Am Bestand gemessen
// (7. September 2026): ein Panorama ist 9,6 MB gross, der
// Verkleinerungsdienst des Bildspeichers antwortet mit 403, und der
// Bildspeicher schickt «Cache-Control: no-cache» — der Browser behält also
// nichts. Ein Ordner mit sechs Standorten wären 58 MB bei jedem Öffnen, für
// Kacheln von 200 Bildpunkten.
//
// Deshalb:
//  1. geladen wird erst, wenn die Kachel im Sichtfeld steht,
//  2. höchstens zwei Bilder gleichzeitig,
//  3. jedes Bild wird einmal im Browser verkleinert und behalten
//     (siehe lib/miniaturSpeicher.ts); ab dem zweiten Mal ist es sofort da,
//  4. es ist sichtbar, ob geladen wird oder ob ein Bild fehlt — eine leere
//     schwarze Fläche sagt beides zugleich und damit nichts.
//
// Zu sehen ist das ganze Bild (objectFit contain), nicht der bildfüllende
// Ausschnitt: Bei der Wahl zwischen sechs Standorten derselben Stelle
// entscheidet der Rand, nicht die Mitte.

import { useEffect, useRef, useState } from 'react'
import { ImageOff } from 'lucide-react'
import {
  leseMiniatur,
  schreibeMiniatur,
  verkleinere,
  inWarteschlange,
} from '../../lib/miniaturSpeicher'

interface Props {
  url: string | null | undefined
  /** Breite der abgelegten Fassung in Bildpunkten. */
  breite?: number
  /** Beschriftung für Vorleseprogramme; leer lassen, wenn daneben schon Text steht. */
  alt?: string
  /** Bildfüllend statt vollständig — nur wo der Ausschnitt genügt. */
  fuellend?: boolean
}

type Zustand = 'wartet' | 'laedt' | 'fertig' | 'fehler'

export function Miniatur({ url, breite = 320, alt = '', fuellend = false }: Props) {
  const rahmenRef = useRef<HTMLDivElement>(null)
  const [sichtbar, setSichtbar] = useState(false)
  const [quelle, setQuelle] = useState<string | null>(null)
  const [zustand, setZustand] = useState<Zustand>('wartet')

  // ── Erst laden, wenn die Kachel gebraucht wird ──
  useEffect(() => {
    const el = rahmenRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setSichtbar(true)
      return
    }
    const beobachter = new IntersectionObserver(
      eintraege => {
        if (eintraege.some(e => e.isIntersecting)) {
          setSichtbar(true)
          beobachter.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [])

  useEffect(() => {
    if (!url) {
      setQuelle(null)
      setZustand('fehler')
      return
    }
    if (!sichtbar) {
      setZustand('wartet')
      return
    }

    let abgebrochen = false
    let objektUrl: string | null = null

    async function hole(bildUrl: string) {
      setZustand('laedt')

      // 1. Vorrat
      const vorhanden = await leseMiniatur(bildUrl, breite)
      if (abgebrochen) return
      if (vorhanden) {
        objektUrl = URL.createObjectURL(vorhanden)
        setQuelle(objektUrl)
        setZustand('fertig')
        return
      }

      // 2. Sonst das Original holen, verkleinern, ablegen
      await inWarteschlange(
        () =>
          new Promise<void>(fertig => {
            const bild = new Image()
            bild.crossOrigin = 'anonymous'
            bild.onload = async () => {
              if (abgebrochen) return fertig()
              const klein = await verkleinere(bild, breite)
              if (abgebrochen) return fertig()
              if (klein) {
                void schreibeMiniatur(bildUrl, breite, klein)
                objektUrl = URL.createObjectURL(klein)
                setQuelle(objektUrl)
              } else {
                // Verkleinern ging nicht — dann eben das Original zeigen.
                setQuelle(bildUrl)
              }
              setZustand('fertig')
              fertig()
            }
            bild.onerror = () => {
              if (!abgebrochen) setZustand('fehler')
              fertig()
            }
            bild.src = bildUrl
          }),
      )
    }

    void hole(url)

    return () => {
      abgebrochen = true
      if (objektUrl) URL.revokeObjectURL(objektUrl)
    }
  }, [url, breite, sichtbar])

  const rahmen: React.CSSProperties = {
    position: 'relative',
    width: '100%', height: '100%',
    background: '#111',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  }

  return (
    <div ref={rahmenRef} style={rahmen} data-testid="miniatur" data-zustand={zustand}>
      {quelle && (
        <img
          src={quelle}
          alt={alt}
          style={{
            width: '100%', height: '100%',
            objectFit: fuellend ? 'cover' : 'contain',
            opacity: zustand === 'fertig' ? 1 : 0,
            transition: 'opacity 0.15s',
          }}
        />
      )}
      {(zustand === 'wartet' || zustand === 'laedt') && (
        <span style={{
          position: 'absolute', fontSize: '9px', letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
        }}>
          {zustand === 'laedt' ? 'lädt …' : ''}
        </span>
      )}
      {zustand === 'fehler' && (
        <span style={{
          position: 'absolute', display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '9px', color: 'var(--rsi-orange, #B87300)', pointerEvents: 'none',
        }}>
          <ImageOff size={11} /> {url ? 'nicht ladbar' : 'kein Bild'}
        </span>
      )}
    </div>
  )
}

export default Miniatur
