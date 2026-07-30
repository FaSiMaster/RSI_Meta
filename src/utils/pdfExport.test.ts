// Tests fuer die PDF-Dokumentdefinition (v0.11.0)
// pdfmake selbst wird hier nicht geladen — geprueft wird die Struktur, die
// ihm uebergeben wird. Das Rendern wurde separat gegen den Node-Build von
// pdfmake verifiziert (Font-Registrierung, Tabellen, colSpan, Umlaute).

import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import { baueTeilnehmerDoc, baueKursDoc, dateiname } from './pdfExport'
import type { TeilnehmerBericht } from '../data/berichtModel'

// Minimaler t-Ersatz: gibt den Schluessel zurueck, damit fehlende Keys auffallen.
const t = ((key: string) => key) as unknown as TFunction

function bericht(over: Partial<TeilnehmerBericht> = {}): TeilnehmerBericht {
  return {
    teilnehmer: 'Testperson',
    szene: 'Fussgängerstreifen',
    szeneBeschreibung: 'Beschreibung',
    thema: 'Querungsstellen',
    kurs: 'FK-RSI-123456',
    datumIso: '2026-07-30T10:15:00.000Z',
    dauerSekunden: 724,
    versuch: 1,
    punkte: 287,
    maxPunkte: 800,
    prozent: 36,
    bestanden: true,
    gefunden: 3,
    total: 8,
    pflichtGefunden: 3,
    pflichtTotal: 7,
    defizite: [{
      nr: 1,
      deficitId: 'SD_0001',
      name: 'Sichtweite',
      beschreibung: 'Text',
      kriteriumLabel: 'Fussgaengerstreifen',
      kontext: 'io',
      normRefs: ['VSS 40 241'],
      isPflicht: true,
      gefunden: true,
      soll: { wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch', unfallschwere: 'schwer', unfallrisiko: 'hoch', naca: 7 },
      ist:  { wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch', unfallschwere: 'schwer', unfallrisiko: 'hoch' },
      kategorieRichtig: true,
      punkteFinal: 100,
      punkteMax: 100,
      hintAbzug: 0,
    }],
    ...over,
  }
}

describe('baueTeilnehmerDoc', () => {
  it('setzt A4, Roboto und einen Titel', () => {
    const doc = baueTeilnehmerDoc(bericht(), t, 'de')
    expect(doc.pageSize).toBe('A4')
    expect(doc.defaultStyle?.font).toBe('Roboto')
    expect(doc.info?.title).toContain('Fussgängerstreifen')
  })

  it('enthaelt Auswertung und Befunde, wenn Defizite vorliegen', () => {
    const doc = baueTeilnehmerDoc(bericht(), t, 'de')
    const json = JSON.stringify(doc.content)
    expect(json).toContain('bericht.abschnitt_auswertung')
    expect(json).toContain('bericht.abschnitt_befunde')
  })

  it('zeigt statt der Tabellen einen Hinweis, wenn keine Detaildaten vorliegen', () => {
    const doc = baueTeilnehmerDoc(bericht({ defizite: [] }), t, 'de')
    const json = JSON.stringify(doc.content)
    expect(json).toContain('bericht.keine_details')
    expect(json).not.toContain('bericht.abschnitt_befunde')
  })

  it('kommt ohne Thema und Kurs aus', () => {
    const doc = baueTeilnehmerDoc(bericht({ thema: null, kurs: null }), t, 'de')
    expect(JSON.stringify(doc.content)).not.toContain('bericht.thema')
  })

  it('laesst den Status weg, wenn kein Bestanden-Wert vorliegt', () => {
    const doc = baueTeilnehmerDoc(bericht({ bestanden: null }), t, 'de')
    const json = JSON.stringify(doc.content)
    expect(json).not.toContain('bericht.nicht_bestanden')
  })
})

describe('baueKursDoc', () => {
  const zeile = {
    teilnehmer: 'a1b2c3d4e5…', szene: 'Szene', datumIso: '2026-07-30T10:15:00.000Z',
    punkte: 287, maxPunkte: 800, prozent: 36, dauerSekunden: 700, bestanden: true,
  }

  it('nutzt Querformat und zeigt den Anonymisierungshinweis', () => {
    const doc = baueKursDoc({ kursName: 'FK-RSI-1', zeilen: [zeile], anonymisiert: true }, t, 'de')
    expect(doc.pageOrientation).toBe('landscape')
    expect(JSON.stringify(doc.content)).toContain('bericht.anonym_hinweis')
  })

  it('laesst den Hinweis bei Klarnamen weg', () => {
    const doc = baueKursDoc({ kursName: 'FK-RSI-1', zeilen: [zeile], anonymisiert: false }, t, 'de')
    expect(JSON.stringify(doc.content)).not.toContain('bericht.anonym_hinweis')
  })

  it('bleibt bei leerer Teilnehmerliste stabil', () => {
    const doc = baueKursDoc({ kursName: 'Leer', zeilen: [], anonymisiert: true }, t, 'de')
    expect(doc.content).toBeDefined()
  })
})

describe('dateiname', () => {
  it('ersetzt Umlaute und Sonderzeichen', () => {
    expect(dateiname(['RSI', 'Fussgängerstreifen / Schulweg', 'Hans Müller'], '2026-07-30T10:15:00.000Z'))
      .toBe('RSI_Fussgangerstreifen_Schulweg_Hans_Muller_2026-07-30.pdf')
  })

  it('verwirft leere Bestandteile', () => {
    expect(dateiname(['RSI', '', '---'], '2026-07-30T00:00:00.000Z')).toBe('RSI_2026-07-30.pdf')
  })
})
