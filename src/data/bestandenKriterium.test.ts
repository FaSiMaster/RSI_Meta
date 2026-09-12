// Tests fuer das Bestanden-Kriterium (v0.9.7)
// Default: alle Pflichtdefizite gefunden UND >= 60 % der Punkte.

import { describe, it, expect } from 'vitest'
import { BESTANDEN_DEFAULT, istBestanden, kriteriumFuerSzene, gestaltungStand } from './bestandenKriterium'
import { VERFAHREN_UKO_ID } from './bewertung'

describe('BESTANDEN_DEFAULT', () => {
  it('verlangt alle Pflichtdefizite und 60 %', () => {
    expect(BESTANDEN_DEFAULT).toEqual({ allePflicht: true, minProzent: 60, gestaltungErkannt: true })
  })
})

describe('istBestanden (Default-Kriterium)', () => {
  it('bestanden bei allen Pflichtdefiziten und genau 60 %', () => {
    expect(istBestanden(60, 7, 7)).toBe(true)
  })

  it('nicht bestanden bei 59 % trotz aller Pflichtdefizite', () => {
    expect(istBestanden(59, 7, 7)).toBe(false)
  })

  it('nicht bestanden bei fehlendem Pflichtdefizit trotz 100 %', () => {
    expect(istBestanden(100, 6, 7)).toBe(false)
  })

  it('bestanden bei 100 % und allen Pflichtdefiziten', () => {
    expect(istBestanden(100, 7, 7)).toBe(true)
  })

  it('Szene ohne Pflichtdefizite: nur die Prozent-Schwelle zählt', () => {
    expect(istBestanden(60, 0, 0)).toBe(true)
    expect(istBestanden(59, 0, 0)).toBe(false)
  })
})

describe('istBestanden (Szenen-Override)', () => {
  it('minProzent null: nur Pflichtdefizite zählen', () => {
    const krit = { allePflicht: true, minProzent: null, gestaltungErkannt: false }
    expect(istBestanden(10, 7, 7, krit)).toBe(true)
    expect(istBestanden(100, 6, 7, krit)).toBe(false)
  })

  it('allePflicht false: nur die Prozent-Schwelle zählt', () => {
    const krit = { allePflicht: false, minProzent: 80, gestaltungErkannt: false }
    expect(istBestanden(80, 0, 7, krit)).toBe(true)
    expect(istBestanden(79, 7, 7, krit)).toBe(false)
  })
})

describe('kriteriumFuerSzene', () => {
  it('ohne Override gilt der Default', () => {
    expect(kriteriumFuerSzene(null)).toEqual(BESTANDEN_DEFAULT)
    expect(kriteriumFuerSzene({ bestandenKriterium: undefined })).toEqual(BESTANDEN_DEFAULT)
  })

  it('Teil-Override: nur gesetzte Felder überschreiben den Vorgabewert', () => {
    expect(kriteriumFuerSzene({ bestandenKriterium: { minProzent: 80 } }))
      .toEqual({ allePflicht: true, minProzent: 80, gestaltungErkannt: true })
    expect(kriteriumFuerSzene({ bestandenKriterium: { allePflicht: false } }))
      .toEqual({ allePflicht: false, minProzent: 60, gestaltungErkannt: true })
  })

  it('minProzent null bleibt null (keine Schwelle), fällt nicht auf 60 zurück', () => {
    expect(kriteriumFuerSzene({ bestandenKriterium: { minProzent: null } }))
      .toEqual({ allePflicht: true, minProzent: null, gestaltungErkannt: true })
  })
})

// ── Dritte Bedingung: Gestaltungsbefunde erkennen (v0.20.0, Befund B-5) ────

describe('gestaltungErkannt', () => {
  const krit = { allePflicht: false, minProzent: null, gestaltungErkannt: true }

  it('lässt durch, wenn jeder Gestaltungsbefund erkannt ist', () => {
    expect(istBestanden(0, 0, 0, krit, { total: 2, erkannt: 2 })).toBe(true)
  })

  it('hält zurück, wenn einer verkannt wurde — auch bei voller Punktzahl', () => {
    expect(istBestanden(100, 0, 0, krit, { total: 2, erkannt: 1 })).toBe(false)
    expect(istBestanden(100, 0, 0, krit, { total: 2, erkannt: 0 })).toBe(false)
  })

  it('ist ohne Gestaltungsbefunde erfüllt — der Schweizer Pfad bleibt unberührt', () => {
    expect(istBestanden(60, 7, 7, krit, { total: 0, erkannt: 0 })).toBe(true)
    // Und ohne das Argument überhaupt, wie jeder Aufruf vor v0.20.0.
    expect(istBestanden(60, 7, 7, krit)).toBe(true)
  })

  it('lässt sich je Szene abschalten', () => {
    const aus = { ...krit, gestaltungErkannt: false }
    expect(istBestanden(60, 0, 0, aus, { total: 2, erkannt: 0 })).toBe(true)
  })

  it('wirkt neben den beiden anderen Bedingungen, nicht statt ihnen', () => {
    const alle = { allePflicht: true, minProzent: 60, gestaltungErkannt: true }
    // Alles erfüllt
    expect(istBestanden(60, 3, 3, alle, { total: 1, erkannt: 1 })).toBe(true)
    // Je eine Bedingung verletzt
    expect(istBestanden(59, 3, 3, alle, { total: 1, erkannt: 1 })).toBe(false)
    expect(istBestanden(60, 2, 3, alle, { total: 1, erkannt: 1 })).toBe(false)
    expect(istBestanden(60, 3, 3, alle, { total: 1, erkannt: 0 })).toBe(false)
  })
})

describe('gestaltungStand', () => {
  const gestaltung = {
    id: 'D1',
    correctAssessment: { verfahren: VERFAHREN_UKO_ID, schritt1: 'gestaltung', schritt2: null },
  } as const
  const defizit = {
    id: 'D2',
    correctAssessment: { verfahren: VERFAHREN_UKO_ID, schritt1: 'sicherheitsdefizit', schritt2: 'gross' },
  } as const
  const schweizerisch = {
    id: 'D3',
    correctAssessment: {
      wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch',
      naca: 7, unfallschwere: 'schwer', unfallrisiko: 'hoch',
    },
  } as const

  it('zählt nur Gestaltungsbefunde, nicht Sicherheitsdefizite', () => {
    const stand = gestaltungStand(
      [gestaltung, defizit],
      [{ deficitId: 'D1', ukoSchritt1Korrekt: true }, { deficitId: 'D2', ukoSchritt1Korrekt: true }],
    )
    expect(stand).toEqual({ total: 1, erkannt: 1 })
  })

  it('zählt einen Befund ohne Resultat nicht als erkannt', () => {
    expect(gestaltungStand([gestaltung], [])).toEqual({ total: 1, erkannt: 0 })
  })

  it('zählt einen verkannten Befund nicht als erkannt', () => {
    expect(gestaltungStand([gestaltung], [{ deficitId: 'D1', ukoSchritt1Korrekt: false }]))
      .toEqual({ total: 1, erkannt: 0 })
  })

  it('sieht in einer Schweizer Szene keine Gestaltungsbefunde', () => {
    expect(gestaltungStand([schweizerisch], [])).toEqual({ total: 0, erkannt: 0 })
  })

  it('verlangt ausdrücklich true, nicht bloss einen wahren Wert', () => {
    // Ein Resultat vor v0.20.0 trägt das Feld nicht. undefined heisst nicht
    // erkannt, sonst zählte jedes Altresultat als Erfolg.
    expect(gestaltungStand([gestaltung], [{ deficitId: 'D1', ukoSchritt1Korrekt: undefined }]))
      .toEqual({ total: 1, erkannt: 0 })
  })
})
