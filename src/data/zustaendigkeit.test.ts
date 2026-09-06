// Wächter über die Zuständigkeit je Land
//
// Die wichtigste Eigenschaft ist nicht das Speichern, sondern das Schweigen:
// Solange nichts eingetragen ist, muss die Anwendung sagen, dass niemand
// bestimmt ist – und zwar für jedes Land, auch für die Schweiz. Ein
// Datensatz, der stillschweigend eine Trägerschaft behauptet, wäre schlimmer
// als gar keiner.

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getZustaendigkeit, getZustaendigkeiten, saveZustaendigkeit,
  deleteZustaendigkeit, setZustaendigkeiten, leereZustaendigkeit, istLeer,
  type Zustaendigkeit,
} from './zustaendigkeit'

// Bewusst ein erfundener Name: Der Wächter über die Behördenbezüge prüft den
// ganzen Quellbaum, Testdaten eingeschlossen. Er hat diese Stelle beim ersten
// Lauf gefunden – und damit gezeigt, dass er auch dort greift, wo man ihn
// nicht erwartet.
const EINTRAG: Zustaendigkeit = {
  country: 'CH',
  organisation: 'Prüfstelle Muster',
  grundlage: 'Fachkurs FK RSI, V 16.09.2020, nach VSS 41 723 (früher SN 641 723)',
  stand: '6. September 2026',
  hinweis: 'Trainingsinstrument',
}

beforeEach(() => localStorage.clear())

describe('Leerer Zustand', () => {
  it('ohne Eintrag gibt es keinen Datensatz', () => {
    expect(getZustaendigkeiten()).toEqual([])
    expect(getZustaendigkeit('CH')).toBeNull()
  })

  it('auch die Schweiz ist nicht vorbelegt', () => {
    // Bewusst so: Eine im Code vorbelegte Trägerschaft stünde im Quellbaum,
    // und den hält der Wächter über Behördenbezüge frei.
    expect(getZustaendigkeit('CH')).toBeNull()
    expect(istLeer(getZustaendigkeit('CH'))).toBe(true)
  })

  it('ein Datensatz ohne einzige Angabe gilt als leer', () => {
    expect(istLeer(leereZustaendigkeit('DE'))).toBe(true)
    expect(istLeer({ ...leereZustaendigkeit('DE'), organisation: '   ' })).toBe(true)
    expect(istLeer({ ...leereZustaendigkeit('DE'), organisation: 'x' })).toBe(false)
  })

  it('null und undefined gelten als leer', () => {
    expect(istLeer(null)).toBe(true)
    expect(istLeer(undefined)).toBe(true)
  })
})

describe('Eintragen und Lesen', () => {
  it('speichert und liest je Land', () => {
    saveZustaendigkeit(EINTRAG)
    const gelesen = getZustaendigkeit('CH')
    expect(gelesen?.organisation).toBe('Prüfstelle Muster')
    expect(gelesen?.grundlage).toContain('VSS 41 723')
    expect(istLeer(gelesen)).toBe(false)
  })

  it('hält den Zeitpunkt der Änderung fest', () => {
    saveZustaendigkeit(EINTRAG)
    expect(getZustaendigkeit('CH')?.geaendertAm).toBeTypeOf('number')
  })

  it('ein zweites Speichern ersetzt, es verdoppelt nicht', () => {
    saveZustaendigkeit(EINTRAG)
    saveZustaendigkeit({ ...EINTRAG, organisation: 'Andere Stelle' })
    expect(getZustaendigkeiten()).toHaveLength(1)
    expect(getZustaendigkeit('CH')?.organisation).toBe('Andere Stelle')
  })

  it('zwei Länder stören sich nicht', () => {
    saveZustaendigkeit(EINTRAG)
    saveZustaendigkeit({ ...leereZustaendigkeit('DE'), organisation: 'Deutsche Stelle' })
    expect(getZustaendigkeit('CH')?.organisation).toBe('Prüfstelle Muster')
    expect(getZustaendigkeit('DE')?.organisation).toBe('Deutsche Stelle')
  })

  it('entfernt einen Eintrag, ohne die anderen zu berühren', () => {
    saveZustaendigkeit(EINTRAG)
    saveZustaendigkeit({ ...leereZustaendigkeit('DE'), organisation: 'Deutsche Stelle' })
    deleteZustaendigkeit('CH')
    expect(getZustaendigkeit('CH')).toBeNull()
    expect(getZustaendigkeit('DE')).not.toBeNull()
  })
})

describe('Kein Datensatz ohne gültiges Land', () => {
  it('ein erfundener Code wird nicht gespeichert', () => {
    saveZustaendigkeit({ ...leereZustaendigkeit('CH'), country: 'XX' as never, organisation: 'x' })
    expect(getZustaendigkeiten()).toEqual([])
  })

  it('ein unbrauchbarer Bestand wird beim Lesen übergangen', () => {
    localStorage.setItem('rsi-v3-zustaendigkeiten', JSON.stringify([
      { country: 'CH', organisation: 'gültig', grundlage: '', stand: '', hinweis: '' },
      { country: 'ZZ', organisation: 'ungültig', grundlage: '', stand: '', hinweis: '' },
    ]))
    expect(getZustaendigkeiten().map(z => z.country)).toEqual(['CH'])
  })

  it('kaputtes JSON ergibt eine leere Liste, keinen Absturz', () => {
    localStorage.setItem('rsi-v3-zustaendigkeiten', '{kein json')
    expect(getZustaendigkeiten()).toEqual([])
  })
})

describe('Ausfuhr und Einfuhr', () => {
  it('setzt den Bestand vollständig und wirft Ungültiges weg', () => {
    saveZustaendigkeit(EINTRAG)
    setZustaendigkeiten([
      { ...leereZustaendigkeit('DE'), organisation: 'Neue Stelle' },
      { ...leereZustaendigkeit('CH'), country: 'QQ' as never },
    ])
    expect(getZustaendigkeiten().map(z => z.country)).toEqual(['DE'])
    expect(getZustaendigkeit('CH')).toBeNull()
  })
})
