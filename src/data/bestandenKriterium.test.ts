// Tests fuer das Bestanden-Kriterium (v0.9.7)
// Default: alle Pflichtdefizite gefunden UND >= 60 % der Punkte.

import { describe, it, expect } from 'vitest'
import { BESTANDEN_DEFAULT, istBestanden, kriteriumFuerSzene } from './bestandenKriterium'

describe('BESTANDEN_DEFAULT', () => {
  it('verlangt alle Pflichtdefizite und 60 %', () => {
    expect(BESTANDEN_DEFAULT).toEqual({ allePflicht: true, minProzent: 60 })
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

  it('Szene ohne Pflichtdefizite: nur die Prozent-Schwelle zaehlt', () => {
    expect(istBestanden(60, 0, 0)).toBe(true)
    expect(istBestanden(59, 0, 0)).toBe(false)
  })
})

describe('istBestanden (Szenen-Override)', () => {
  it('minProzent null: nur Pflichtdefizite zaehlen', () => {
    const krit = { allePflicht: true, minProzent: null }
    expect(istBestanden(10, 7, 7, krit)).toBe(true)
    expect(istBestanden(100, 6, 7, krit)).toBe(false)
  })

  it('allePflicht false: nur die Prozent-Schwelle zaehlt', () => {
    const krit = { allePflicht: false, minProzent: 80 }
    expect(istBestanden(80, 0, 7, krit)).toBe(true)
    expect(istBestanden(79, 7, 7, krit)).toBe(false)
  })
})

describe('kriteriumFuerSzene', () => {
  it('ohne Override gilt der Default', () => {
    expect(kriteriumFuerSzene(null)).toEqual(BESTANDEN_DEFAULT)
    expect(kriteriumFuerSzene({ bestandenKriterium: undefined })).toEqual(BESTANDEN_DEFAULT)
  })

  it('Teil-Override: nur gesetzte Felder ueberschreiben den Default', () => {
    expect(kriteriumFuerSzene({ bestandenKriterium: { minProzent: 80 } }))
      .toEqual({ allePflicht: true, minProzent: 80 })
    expect(kriteriumFuerSzene({ bestandenKriterium: { allePflicht: false } }))
      .toEqual({ allePflicht: false, minProzent: 60 })
  })

  it('minProzent null bleibt null (keine Schwelle), faellt nicht auf 60 zurueck', () => {
    expect(kriteriumFuerSzene({ bestandenKriterium: { minProzent: null } }))
      .toEqual({ allePflicht: true, minProzent: null })
  })
})
