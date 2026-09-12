// Wächter über den Szenentyp Bildserie (B3, v0.20.0)
//
// Die Bildwand rendert in einem WebGL-Kontext, den es im Test nicht gibt. Was
// sich ohne Browser prüfen lässt, ist die Logik davor und daneben, und genau
// dort sitzen die Fehler, die niemand sieht:
//
// – Die Zuordnung Bild zu Verortung. Der Schlüssel ist die Bild-URL. Greift sie
//   daneben, findet man in einem Bild Defizite, die zu einem anderen gehören.
// – Die unbewertete Vergleichsphase. Dort darf nichts zu finden sein, sonst
//   sammelt man Punkte in einem Zustand, für den es keine Musterlösung gibt.
// – Die Umrechnung von Texturkoordinaten in Bildkoordinaten. Sie kippt die
//   senkrechte Achse, und ein vergessenes «1 minus» spiegelt jedes Defizit an
//   der Bildmitte.
//
// Der letzte Punkt ist der heimtückischste: Ein gespiegelter Treffer liegt
// meistens noch im Bild, und die Anwendung verhält sich unauffällig falsch.
//
// Nicht hier, sondern in bewertung.test.ts steht der Wächter über das
// Seitenverhältnis der Trefferprüfung. Nachgewiesen ist er dort: wird die
// Division in trefferImBild entfernt, meldet jene Datei und diese nicht. Wer
// den Radius ändert, sucht also dort.

import { describe, it, expect } from 'vitest'
import { trefferImBild, type BildPos, type DefizitVerortung } from '../utils/sphereCoords'
import { szenentypVon, type AppScene, type BildPhase } from '../data/appData'

/** Dieselbe Umrechnung wie in der Bildwand: uv läuft von unten, Bilder von oben. */
function uvZuBild(uv: { x: number; y: number }): BildPos {
  return { x: uv.x, y: 1 - uv.y }
}

const PHASE_BEWERTET: BildPhase = {
  id: 'p2022',
  labelI18n: { de: 'Minikreisverkehr', fr: '', it: '', en: '' },
  zeitangabeI18n: { de: '12. Mai 2022', fr: '', it: '', en: '' },
  bilder: ['bild-a.jpg', 'bild-b.jpg'],
  bewertet: true,
}

const PHASE_VERGLEICH: BildPhase = {
  id: 'p2017',
  labelI18n: { de: 'Lichtsignalanlage', fr: '', it: '', en: '' },
  zeitangabeI18n: { de: '13. September 2017', fr: '', it: '', en: '' },
  bilder: ['bild-alt.jpg'],
  bewertet: false,
}

function szene(felder: Partial<AppScene> = {}): AppScene {
  return {
    id: 'S9', topicId: 'T9',
    nameI18n: { de: 'Niederfrauendorf', fr: '', it: '', en: '' },
    kontext: 'io', isActive: true, country: 'DE',
    szenentyp: 'bildserie',
    phasen: [PHASE_BEWERTET, PHASE_VERGLEICH],
    ...felder,
  } as AppScene
}

describe('Szenentyp', () => {
  it('erkennt die Bildserie und lässt alles andere Panorama sein', () => {
    expect(szenentypVon(szene())).toBe('bildserie')
    expect(szenentypVon(szene({ szenentyp: 'panorama' }))).toBe('panorama')
    expect(szenentypVon(szene({ szenentyp: undefined }))).toBe('panorama')
    expect(szenentypVon(null)).toBe('panorama')
    expect(szenentypVon(undefined)).toBe('panorama')
  })
})

describe('Phasen', () => {
  it('führt die bewertete Phase und die Vergleichsphase getrennt', () => {
    const s = szene()
    const bewertet = (s.phasen ?? []).filter(p => p.bewertet)
    const vergleich = (s.phasen ?? []).filter(p => !p.bewertet)
    expect(bewertet).toHaveLength(1)
    expect(vergleich).toHaveLength(1)
    expect(vergleich[0].zeitangabeI18n.de).toContain('2017')
  })

  it('trägt je Phase eine Zeitangabe, in jeder Sprache dieselben Schlüssel', () => {
    for (const p of szene().phasen ?? []) {
      expect(Object.keys(p.zeitangabeI18n).sort()).toEqual(['de', 'en', 'fr', 'it'])
      expect(p.zeitangabeI18n.de.length).toBeGreaterThan(0)
    }
  })
})

describe('Zuordnung Bild zu Verortung', () => {
  const verortungen: Record<string, DefizitVerortung> = {
    'bild-a.jpg': { typ: 'bild', x: 0.30, y: 0.60, r: 0.05 },
    'bild-b.jpg': { typ: 'bild', x: 0.70, y: 0.40, r: 0.05 },
  }

  it('findet ein Defizit nur in dem Bild, zu dem es gehört', () => {
    const klickAufA: BildPos = { x: 0.30, y: 0.60 }
    expect(trefferImBild(klickAufA, verortungen['bild-a.jpg'], 1.5)).toBe(true)
    expect(trefferImBild(klickAufA, verortungen['bild-b.jpg'], 1.5)).toBe(false)
  })

  it('findet nichts in einem Bild ohne Verortung', () => {
    expect(verortungen['bild-alt.jpg']).toBeUndefined()
  })
})

describe('Umrechnung der Texturkoordinaten', () => {
  it('kippt die senkrechte Achse', () => {
    // uv y=1 ist die Oberkante der Textur, im Bild ist das y=0.
    expect(uvZuBild({ x: 0.25, y: 1 })).toEqual({ x: 0.25, y: 0 })
    expect(uvZuBild({ x: 0.25, y: 0 })).toEqual({ x: 0.25, y: 1 })
    expect(uvZuBild({ x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 })
  })

  it('trifft ein Defizit im oberen Bilddrittel mit dem richtigen uv-Wert', () => {
    // Ein Defizit bei y=0.2 liegt im oberen Bilddrittel. Getroffen wird es mit
    // uv y=0.8, nicht mit uv y=0.2 — genau hier kippt ein vergessenes
    // «1 minus» den Treffer an die Bildmitte gespiegelt.
    const v: DefizitVerortung = { typ: 'bild', x: 0.5, y: 0.2, r: 0.04 }
    expect(trefferImBild(uvZuBild({ x: 0.5, y: 0.8 }), v, 1.5)).toBe(true)
    expect(trefferImBild(uvZuBild({ x: 0.5, y: 0.2 }), v, 1.5)).toBe(false)
  })

  it('lässt die Bildmitte unauffällig, wo die Spiegelung nichts ändert', () => {
    // Der Grund, warum dieser Fehler in einem Klicktest durchgeht: in der Mitte
    // stimmt beides. Deshalb prüft der Test oben ausdrücklich aussermittig.
    const mitte: DefizitVerortung = { typ: 'bild', x: 0.5, y: 0.5, r: 0.04 }
    expect(trefferImBild(uvZuBild({ x: 0.5, y: 0.5 }), mitte, 1.5)).toBe(true)
  })
})

describe('Markerlage auf der Wand', () => {
  /** Dieselbe Rechnung wie im Marker der Bildwand. */
  function wandLage(v: { x: number; y: number }, breite: number, hoehe: number) {
    return { x: (v.x - 0.5) * breite, y: (0.5 - v.y) * hoehe }
  }

  it('legt die Bildmitte in den Ursprung', () => {
    expect(wandLage({ x: 0.5, y: 0.5 }, 3.2, 2.0)).toEqual({ x: 0, y: 0 })
  })

  it('legt oben im Bild nach oben auf der Wand', () => {
    // y=0 ist die Oberkante des Bildes und muss auf der Wand positiv liegen.
    expect(wandLage({ x: 0.5, y: 0 }, 3.2, 2.0).y).toBeGreaterThan(0)
    expect(wandLage({ x: 0.5, y: 1 }, 3.2, 2.0).y).toBeLessThan(0)
  })

  it('legt links im Bild nach links auf der Wand', () => {
    expect(wandLage({ x: 0, y: 0.5 }, 3.2, 2.0).x).toBeLessThan(0)
    expect(wandLage({ x: 1, y: 0.5 }, 3.2, 2.0).x).toBeGreaterThan(0)
  })
})
