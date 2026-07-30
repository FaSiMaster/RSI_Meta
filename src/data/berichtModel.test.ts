// Tests fuer die Berichtsaufbereitung (v0.11.0)
// Pruefen vor allem die Faelle, in denen Daten fehlen duerfen:
// nicht gefundene Defizite und Resultate aus der Zeit vor v0.11.0.

import { describe, it, expect } from 'vitest'
import { ketteAus, baueDefizitListe, fmtZahl, fmtDauer, fmtDatum } from './berichtModel'
import type { AppDeficit, DefizitResult } from './appData'

function defizit(id: string, over: Partial<AppDeficit> = {}): AppDeficit {
  return {
    id,
    sceneId: 'SZ_TEST',
    topicId: 'tp-test',
    nameI18n:         { de: `Defizit ${id}`, fr: '', it: '', en: '' },
    beschreibungI18n: { de: 'Beschreibung', fr: '', it: '', en: '' },
    kriteriumId: 'fussgaengerstreifen',
    kontext: 'io',
    correctAssessment: {
      wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch',
      naca: 7, unfallschwere: 'schwer', unfallrisiko: 'hoch',
    },
    isPflicht: true,
    isBooster: false,
    normRefs: ['VSS 40 241'],
    verortung: null,
    ...over,
  } as AppDeficit
}

function resultat(id: string, over: Partial<DefizitResult> = {}): DefizitResult {
  return {
    deficitId: id,
    kategorieRichtig: true,
    hintPenalty: false,
    punkteRoh: 75,
    punkteFinal: 100,
    dauerSekunden: 42,
    wichtigkeitKorrekt: true,
    abweichungKorrekt: true,
    nacaKorrekt: true,
    ...over,
  }
}

describe('ketteAus', () => {
  it('leitet Relevanz und Unfallrisiko aus den Matrizen ab', () => {
    const k = ketteAus('gross', 'gross', 'schwer', 7)
    expect(k.relevanzSD).toBe('hoch')
    expect(k.unfallrisiko).toBe('hoch')
    expect(k.naca).toBe(7)
  })

  it('behandelt Wichtigkeit gross und mittel gleich (Matrix-Zeilen identisch)', () => {
    const a = ketteAus('gross', 'gross', 'schwer')
    const b = ketteAus('mittel', 'gross', 'schwer')
    expect(b.relevanzSD).toBe(a.relevanzSD)
    expect(b.unfallrisiko).toBe(a.unfallrisiko)
  })

  it('klein senkt die Relevanz gegenueber mittel', () => {
    expect(ketteAus('klein', 'mittel', 'schwer').relevanzSD).toBe('gering')
    expect(ketteAus('mittel', 'mittel', 'schwer').relevanzSD).toBe('mittel')
  })
})

describe('baueDefizitListe', () => {
  it('stellt bewertete Defizite vor die nicht gefundenen', () => {
    const deficits = [defizit('A'), defizit('B'), defizit('C')]
    const results  = [resultat('C'), resultat('A')]
    const liste = baueDefizitListe(deficits, results, 'de')
    expect(liste.map(d => d.deficitId)).toEqual(['C', 'A', 'B'])
    expect(liste.map(d => d.nr)).toEqual([1, 2, 3])
  })

  it('markiert nicht gefundene Defizite ohne Ist-Kette und ohne Punkte', () => {
    const liste = baueDefizitListe([defizit('A')], [], 'de')
    expect(liste[0].gefunden).toBe(false)
    expect(liste[0].ist).toBeNull()
    expect(liste[0].punkteFinal).toBeNull()
    expect(liste[0].hintAbzug).toBe(0)
  })

  it('baut die Ist-Kette aus den abgegebenen Werten', () => {
    const results = [resultat('A', {
      userWichtigkeit: 'klein', userAbweichung: 'mittel', userUnfallschwere: 'leicht',
      wichtigkeitKorrekt: false, abweichungKorrekt: false, nacaKorrekt: false,
    })]
    const liste = baueDefizitListe([defizit('A')], results, 'de')
    expect(liste[0].ist).not.toBeNull()
    expect(liste[0].ist!.wichtigkeit).toBe('klein')
    // klein/mittel -> gering, mit leicht -> gering
    expect(liste[0].ist!.relevanzSD).toBe('gering')
    expect(liste[0].ist!.unfallrisiko).toBe('gering')
    expect(liste[0].soll.unfallrisiko).toBe('hoch')
  })

  it('laesst die Ist-Kette weg, wenn das Resultat aelter als v0.11.0 ist', () => {
    // Legacy: gefunden, aber ohne gespeicherte Auswahl
    const liste = baueDefizitListe([defizit('A')], [resultat('A')], 'de')
    expect(liste[0].gefunden).toBe(true)
    expect(liste[0].ist).toBeNull()
    expect(liste[0].punkteFinal).toBe(100)
  })

  it('faellt beim Hinweis-Abzug auf den Legacy-Wert 25 zurueck', () => {
    const liste = baueDefizitListe([defizit('A')], [resultat('A', { hintPenalty: true })], 'de')
    expect(liste[0].hintAbzug).toBe(25)
  })

  it('uebernimmt den gestuften Abzug, wenn vorhanden', () => {
    const liste = baueDefizitListe([defizit('A')], [resultat('A', { hintPenalty: true, hintAbzug: 10 })], 'de')
    expect(liste[0].hintAbzug).toBe(10)
  })

  it('ignoriert Resultate zu Defiziten, die es nicht mehr gibt', () => {
    const liste = baueDefizitListe([defizit('A')], [resultat('GELOESCHT'), resultat('A')], 'de')
    expect(liste).toHaveLength(1)
    expect(liste[0].deficitId).toBe('A')
  })
})

describe('Formatierung', () => {
  it('setzt den Apostroph als Tausendertrennzeichen', () => {
    expect(fmtZahl(1234)).toBe("1'234")
    expect(fmtZahl(800)).toBe('800')
  })

  it('formatiert Dauern mit Minuten und Sekunden', () => {
    expect(fmtDauer(45)).toBe('45 s')
    expect(fmtDauer(125)).toBe('2 min 5 s')
  })

  it('gibt einen ungueltigen Zeitstempel unveraendert zurueck', () => {
    expect(fmtDatum('kein-datum', 'de')).toBe('kein-datum')
  })
})
