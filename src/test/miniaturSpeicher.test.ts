// miniaturSpeicher.test.ts — die Warteschlange der Vorschaubilder.
//
// Ohne Begrenzung starten alle Kacheln eines Ordners gleichzeitig. Am
// Bestand gemessen sind das bei sechs Standorten 58 MB auf einmal, und keines
// wird zuerst fertig. Geprüft wird deshalb die Zusage, die den Unterschied
// macht: nie mehr als zwei zugleich.

import { describe, it, expect } from 'vitest'
import { inWarteschlange } from '../lib/miniaturSpeicher'

function warte(ms: number): Promise<void> {
  return new Promise(a => setTimeout(a, ms))
}

describe('Warteschlange der Vorschaubilder', () => {
  it('lässt nie mehr als zwei Ladevorgänge gleichzeitig laufen', async () => {
    let gleichzeitig = 0
    let hoechstwert = 0

    const arbeiten = Array.from({ length: 8 }, (_, i) =>
      inWarteschlange(async () => {
        gleichzeitig++
        hoechstwert = Math.max(hoechstwert, gleichzeitig)
        await warte(5 + (i % 3) * 3)
        gleichzeitig--
        return i
      }),
    )

    const ergebnis = await Promise.all(arbeiten)
    expect(ergebnis).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(hoechstwert).toBeLessThanOrEqual(2)
    // Und sie läuft auch wirklich parallel — sonst wäre die Begrenzung
    // trivial erfüllt und die Prüfung wertlos.
    expect(hoechstwert).toBe(2)
    expect(gleichzeitig).toBe(0)
  })

  it('gibt einen Platz auch dann frei, wenn eine Arbeit scheitert', async () => {
    const fehler = inWarteschlange(async () => {
      throw new Error('Bild nicht ladbar')
    })
    await expect(fehler).rejects.toThrow('Bild nicht ladbar')

    // Nach acht Fehlschlägen darf die Schlange nicht verstopft sein.
    for (let i = 0; i < 8; i++) {
      await inWarteschlange(async () => { throw new Error('x') }).catch(() => undefined)
    }
    const danach = await inWarteschlange(async () => 'geht noch')
    expect(danach).toBe('geht noch')
  })
})
