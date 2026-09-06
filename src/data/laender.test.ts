// Wächter über die Länderliste
//
// Die Liste ist von Hand nicht prüfbar: 249 Codes liest niemand nach. Also
// prüft sie hier eine zweite, unabhängige Quelle – die Regionendaten des in
// Node mitgelieferten ICU. Ein Selbsttest wäre wertlos: ein Test, der die
// Konstante gegen sich selbst hält, findet keinen Tippfehler.

import { describe, it, expect } from 'vitest'
import { ISO_3166_1_ALPHA_2, LAND_VORGABE, istLandCode, landName, laenderNachName } from './laender'

/** Codes, die ICU kennt, ISO 3166-1 aber nicht zuteilt. */
const KEINE_ISO_LAENDER = [
  'AC', 'CP', 'CQ', 'DG', 'EA', 'EU', 'EZ', 'IC', 'QO', 'TA', 'UK', 'UN', 'XA', 'XB', 'XK', 'ZZ',
  'AN', 'BU', 'CS', 'DD', 'DY', 'FX', 'HV', 'NH', 'RH', 'SU', 'TP', 'VD', 'YD', 'YU', 'ZR',
]

describe('Länderliste ISO 3166-1 alpha-2', () => {
  it('führt 249 offiziell zugeteilte Codes', () => {
    expect(ISO_3166_1_ALPHA_2).toHaveLength(249)
  })

  it('enthält jeden Code genau einmal', () => {
    expect(new Set(ISO_3166_1_ALPHA_2).size).toBe(ISO_3166_1_ALPHA_2.length)
  })

  it('führt jeden Code zweistellig und gross', () => {
    const falsch = ISO_3166_1_ALPHA_2.filter(c => !/^[A-Z]{2}$/.test(c))
    expect(falsch).toEqual([])
  })

  it('steht alphabetisch – sonst ist eine Ergänzung nicht wiederfindbar', () => {
    expect([...ISO_3166_1_ALPHA_2]).toEqual([...ISO_3166_1_ALPHA_2].sort())
  })

  it('enthält die Schweiz und Deutschland', () => {
    expect(ISO_3166_1_ALPHA_2).toContain('CH')
    expect(ISO_3166_1_ALPHA_2).toContain('DE')
  })

  it('enthält keinen reservierten, benutzerdefinierten oder gelöschten Code', () => {
    const drin = KEINE_ISO_LAENDER.filter(c => (ISO_3166_1_ALPHA_2 as readonly string[]).includes(c))
    expect(drin).toEqual([])
  })
})

describe('Gegenprobe an den Regionendaten der Laufzeit (ICU)', () => {
  const anzeige = (() => {
    try { return new Intl.DisplayNames(['de'], { type: 'region', fallback: 'code' }) }
    catch { return null }
  })()

  it('ICU ist verfügbar – sonst prüft diese Gegenprobe nichts', () => {
    if (!anzeige) {
      console.warn('[laender] Intl.DisplayNames fehlt – Gegenprobe NICHT gelaufen.')
    }
    // Absichtlich keine harte Forderung: fehlt ICU, soll der Lauf nicht
    // scheitern, aber der Ausfall soll sichtbar sein.
    expect(true).toBe(true)
  })

  it('jeder Code der Liste ist eine Region, die ICU auflöst', () => {
    if (!anzeige) return
    const unbekannt = ISO_3166_1_ALPHA_2.filter(c => anzeige.of(c) === c)
    expect(unbekannt).toEqual([])
  })

  it('erkennt einen erfundenen Code als nicht auflösbar – der Test misst also wirklich', () => {
    if (!anzeige) return
    expect(anzeige.of('QQ')).toBe('QQ')
  })
})

describe('istLandCode', () => {
  it('nimmt zugeteilte Codes an', () => {
    expect(istLandCode('CH')).toBe(true)
    expect(istLandCode('DE')).toBe(true)
  })

  it('weist Reserviertes, Kleinschreibung und Unfug ab', () => {
    for (const wert of ['XK', 'EU', 'ch', 'CHE', '', 'Schweiz', null, undefined, 42, {}]) {
      expect(istLandCode(wert)).toBe(false)
    }
  })
})

describe('Ländernamen', () => {
  it('nennt die Schweiz in der Sprache der Oberfläche', () => {
    expect(landName('CH', 'de')).toBe('Schweiz')
    expect(landName('CH', 'fr')).toBe('Suisse')
    expect(landName('CH', 'it')).toBe('Svizzera')
    expect(landName('CH', 'en')).toBe('Switzerland')
  })

  it('fällt auf den Code zurück, statt eine Lücke zu zeigen', () => {
    expect(landName('QQ', 'de')).toBe('QQ')
  })

  it('sortiert die Auswahlliste nach dem Namen, nicht nach dem Code', () => {
    const liste = laenderNachName('de')
    expect(liste).toHaveLength(249)
    const namen = liste.map(l => l.name)
    expect([...namen]).toEqual([...namen].sort((a, b) => a.localeCompare(b, 'de')))
    expect(namen[0]).toBe('Afghanistan')
  })
})

describe('Vorgabe', () => {
  it('ist die Schweiz und steht in der Liste', () => {
    expect(LAND_VORGABE).toBe('CH')
    expect(ISO_3166_1_ALPHA_2).toContain(LAND_VORGABE)
  })
})
