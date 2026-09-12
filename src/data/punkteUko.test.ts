// Wächter für die Punkte der Konvention der Unfallkommission (B2, v0.20.0)
//
// Geprüft wird, was schiefgehen kann, ohne aufzufallen:
// – Die vier Zahlen stammen aus Entscheiden. Ein Test hält sie fest, damit eine
//   Änderung auffällt, statt stillschweigend durchzugehen.
// – Schritt 2 darf nur zählen, wenn Schritt 1 stimmt. Sonst würde die Übung den
//   Folgefehler belohnen.
// – Die Normierung muss je Befund auf sein eigenes Maximum gehen, sonst steht
//   ein Gestaltungsbefund besser da als ein Sicherheitsdefizit.
// – Das Nullmodell der echten Szene ist mitgerechnet. Es ist der Befund B-5 aus
//   dem Entscheidjournal, und er soll nicht in Vergessenheit geraten.

import { describe, it, expect } from 'vitest'
import {
  UKO_SCHRITT1_RICHTIG, UKO_SCHRITT1_FALSCH, UKO_SCHRITT2_RICHTIG,
  ukoMaxPunkte, bewerteUko, ukoProzent, ukoTeilscores,
  type UkoAntwort, type UkoErgebnis,
} from './punkteUko'
import { VERFAHREN_UKO_ID, type BewertungUko, type BewertungBfu } from './bewertung'
import { szenenMaxPunkte, MAX_PUNKTE_PRO_DEFIZIT } from './scoreCalc'
import type { RSIDimension } from '../types'

function sd(stufe: RSIDimension): BewertungUko {
  return { verfahren: VERFAHREN_UKO_ID, schritt1: 'sicherheitsdefizit', schritt2: stufe }
}
const gestaltung: BewertungUko = {
  verfahren: VERFAHREN_UKO_ID, schritt1: 'gestaltung', schritt2: null,
}

describe('Die Zahlen stammen aus Entscheiden', () => {
  it('hält Schritt 1 auf 60 und Schritt 2 auf 40 (E-7a)', () => {
    expect(UKO_SCHRITT1_RICHTIG).toBe(60)
    expect(UKO_SCHRITT2_RICHTIG).toBe(40)
  })

  it('lässt eine falsche Art Punkte kosten (F-006)', () => {
    expect(UKO_SCHRITT1_FALSCH).toBe(-60)
    expect(UKO_SCHRITT1_FALSCH).toBeLessThan(0)
  })

  it('gewichtet einen Gestaltungsbefund mit 60 gegen 100 (E-7b)', () => {
    expect(ukoMaxPunkte('sicherheitsdefizit')).toBe(100)
    expect(ukoMaxPunkte('gestaltung')).toBe(60)
  })

  it('bevorzugt Schritt 1 gegenüber Schritt 2', () => {
    expect(UKO_SCHRITT1_RICHTIG).toBeGreaterThan(UKO_SCHRITT2_RICHTIG)
  })
})

describe('Bewertung eines Befundes', () => {
  it('gibt beide Teile, wenn beide Schritte stimmen', () => {
    const e = bewerteUko(sd('gross'), { schritt1: 'sicherheitsdefizit', schritt2: 'gross' })
    expect(e.schritt1Punkte).toBe(60)
    expect(e.schritt2Punkte).toBe(40)
    expect(e.summe).toBe(100)
    expect(e.schritt1Korrekt).toBe(true)
    expect(e.schritt2Korrekt).toBe(true)
  })

  it('gibt Schritt 1, aber nicht Schritt 2, wenn nur die Einstufung falsch ist', () => {
    const e = bewerteUko(sd('gross'), { schritt1: 'sicherheitsdefizit', schritt2: 'klein' })
    expect(e.schritt1Punkte).toBe(60)
    expect(e.schritt2Punkte).toBe(0)
    expect(e.schritt2Korrekt).toBe(false)
    expect(e.summe).toBe(60)
  })

  it('zieht bei falscher Art ab und stellt Schritt 2 nicht', () => {
    const e = bewerteUko(gestaltung, { schritt1: 'sicherheitsdefizit', schritt2: 'gross' })
    expect(e.schritt1Punkte).toBe(-60)
    expect(e.schritt2Punkte).toBe(0)
    expect(e.schritt2Korrekt).toBeNull()
    expect(e.summe).toBe(-60)
  })

  it('belohnt den Folgefehler nicht: eine zufällig richtige Einstufung zählt nicht', () => {
    // Der Fall, auf den es ankommt: Die Musterlösung IST ein Sicherheitsdefizit
    // und wäre «gross». Wer den Befund für einen Gestaltungsbefund hält, hat
    // ihn verkannt — die Einstufung «gross» daneben ist dann keine Leistung,
    // sondern ein Zufall, und darf nichts einbringen.
    //
    // Dieser Test ersetzt eine frühere Fassung, die dasselbe behauptete und
    // nichts prüfte: sie setzte eine Musterlösung mit der Art «gestaltung»
    // ein, und dort bleibt Schritt 2 auch ohne die Sperre bei null. Gefunden
    // hat das der Nachweis mit eingebautem Fehler, nicht das Auge.
    const e = bewerteUko(sd('gross'), { schritt1: 'gestaltung', schritt2: 'gross' })
    expect(e.schritt1Korrekt).toBe(false)
    expect(e.schritt2Korrekt).toBeNull()
    expect(e.schritt2Punkte).toBe(0)
    expect(e.summe).toBe(-60)
  })

  it('stellt Schritt 2 auch dann nicht, wenn die Musterlösung ein Gestaltungsbefund ist', () => {
    const e = bewerteUko(gestaltung, { schritt1: 'sicherheitsdefizit', schritt2: 'gross' })
    expect(e.schritt2Korrekt).toBeNull()
    expect(e.schritt2Punkte).toBe(0)
  })

  it('gibt für einen richtig erkannten Gestaltungsbefund die volle Punktzahl', () => {
    const e = bewerteUko(gestaltung, { schritt1: 'gestaltung', schritt2: null })
    expect(e.schritt1Punkte).toBe(60)
    expect(e.maxPunkte).toBe(60)
    expect(e.summe).toBe(e.maxPunkte)
    expect(e.schritt2Korrekt).toBeNull()
  })

  it('weist eine Musterlösung ab, die nicht dieser Konvention folgt', () => {
    const bfu = {
      wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch',
      naca: 7, unfallschwere: 'schwer', unfallrisiko: 'hoch',
    } as BewertungBfu
    expect(() => bewerteUko(bfu, { schritt1: 'sicherheitsdefizit', schritt2: 'gross' })).toThrow()
  })
})

describe('Normierung', () => {
  it('gibt 100 Prozent, wenn alles stimmt, auch bei gemischten Befundarten', () => {
    const e = [
      bewerteUko(sd('gross'), { schritt1: 'sicherheitsdefizit', schritt2: 'gross' }),
      bewerteUko(gestaltung, { schritt1: 'gestaltung', schritt2: null }),
    ]
    expect(ukoProzent(e)).toBe(100)
  })

  it('stellt einen Gestaltungsbefund nicht besser als ein Sicherheitsdefizit', () => {
    // Beide vollständig richtig: beide erreichen ihr eigenes Maximum, also je
    // 100 Prozent. Der Unterschied liegt im Gewicht, nicht in der Quote.
    const nurGestaltung = [bewerteUko(gestaltung, { schritt1: 'gestaltung', schritt2: null })]
    const nurDefizit = [bewerteUko(sd('mittel'), { schritt1: 'sicherheitsdefizit', schritt2: 'mittel' })]
    expect(ukoProzent(nurGestaltung)).toBe(100)
    expect(ukoProzent(nurDefizit)).toBe(100)
    expect(nurGestaltung[0].maxPunkte).toBeLessThan(nurDefizit[0].maxPunkte)
  })

  it('stellt eine negative Summe auf null', () => {
    const e = [bewerteUko(gestaltung, { schritt1: 'sicherheitsdefizit', schritt2: null })]
    expect(e[0].summe).toBeLessThan(0)
    expect(ukoProzent(e)).toBe(0)
  })

  it('gibt null zurück, wenn es nichts zu erreichen gibt', () => {
    expect(ukoProzent([])).toBe(0)
  })
})

describe('Teilscores', () => {
  it('führt beide Schritte getrennt und zählt Schritt 2 nur, wo er anstand', () => {
    const e = [
      bewerteUko(sd('gross'),  { schritt1: 'sicherheitsdefizit', schritt2: 'gross' }),
      bewerteUko(sd('mittel'), { schritt1: 'sicherheitsdefizit', schritt2: 'gross' }),
      bewerteUko(gestaltung,   { schritt1: 'gestaltung',         schritt2: null }),
    ]
    const ts = ukoTeilscores(e)
    expect(ts.anzahl).toBe(3)
    expect(ts.schritt1Treffer).toBe(3)
    expect(ts.schritt1Punkte).toBe(180)
    expect(ts.schritt1Max).toBe(180)
    // Schritt 2 stand nur bei den zwei Sicherheitsdefiziten an, einer stimmte.
    expect(ts.schritt2Gestellt).toBe(2)
    expect(ts.schritt2Max).toBe(80)
    expect(ts.schritt2Treffer).toBe(1)
    expect(ts.schritt2Punkte).toBe(40)
  })

  it('zählt Schritt 2 nicht mit, wenn die Szene nur Gestaltungsbefunde hat', () => {
    const ts = ukoTeilscores([bewerteUko(gestaltung, { schritt1: 'gestaltung', schritt2: null })])
    expect(ts.schritt2Gestellt).toBe(0)
    expect(ts.schritt2Max).toBe(0)
  })
})

describe('Szenenmaximum über beide Verfahren', () => {
  it('rechnet je Defizit nach seinem Verfahren, nicht nach der Anzahl', () => {
    const bfu = {
      wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch',
      naca: 7, unfallschwere: 'schwer', unfallrisiko: 'hoch',
    } as BewertungBfu
    expect(szenenMaxPunkte([bfu])).toBe(MAX_PUNKTE_PRO_DEFIZIT)
    expect(szenenMaxPunkte([sd('gross'), gestaltung])).toBe(160)
    expect(szenenMaxPunkte([])).toBe(0)
  })
})

describe('Nullmodell der Szene Niederfrauendorf (Befund B-5)', () => {
  // Die Musterlösung aus dem Entscheidjournal, Lauf vom 12. September 2026:
  // sieben Sicherheitsdefizite, davon fünf gross und zwei mittel, dazu zwei
  // Gestaltungsbefunde.
  const szene: BewertungUko[] = [
    sd('gross'), sd('gross'), sd('gross'), sd('gross'), sd('gross'),
    sd('mittel'), sd('mittel'),
    gestaltung, gestaltung,
  ]

  function spiele(schritt1: 'immer_sd' | 'richtig', schritt2: RSIDimension | 'richtig'): number {
    const ergebnisse: UkoErgebnis[] = szene.map(soll => {
      const art = schritt1 === 'richtig' ? soll.schritt1 : 'sicherheitsdefizit'
      const stufe: RSIDimension | null = schritt2 === 'richtig' ? soll.schritt2 : schritt2
      const antwort: UkoAntwort = { schritt1: art, schritt2: stufe }
      return bewerteUko(soll, antwort)
    })
    return ukoProzent(ergebnisse)
  }

  it('hat ein Maximum von 820 Punkten', () => {
    expect(szenenMaxPunkte(szene)).toBe(820)
  })

  it('lässt blosses Raten in Schritt 2 durchfallen', () => {
    // «immer klein» trifft keinen der sieben Befunde.
    expect(spiele('immer_sd', 'klein')).toBeCloseTo(300 / 820 * 100, 1)
    expect(spiele('immer_sd', 'klein')).toBeLessThan(60)
  })

  it('BEFUND B-5: «immer Sicherheitsdefizit, immer gross» besteht knapp', () => {
    // Fünf der sieben Einstufungen sind gross, also trifft die Strategie fünf.
    // 7*60 − 2*60 + 5*40 = 500 von 820 = 61,0 %. Die Schwelle liegt bei 60 %.
    // Dieser Test hält den Befund fest, er billigt ihn nicht. Behoben wird er
    // bei B4, entweder durch einen Befund mit der Einstufung «klein» oder durch
    // eine höhere Schwelle für diese Szene.
    const anteil = spiele('immer_sd', 'gross')
    expect(anteil).toBeCloseTo(500 / 820 * 100, 1)
    expect(anteil).toBeGreaterThan(60)
    expect(anteil).toBeLessThan(62)
  })

  it('lässt jemanden, der Schritt 1 beherrscht und Schritt 2 nicht, bestehen', () => {
    // 9*60 + 5*40 = 740 von 820 = 90,2 %; mit «immer klein» 540 von 820 = 65,9 %.
    expect(spiele('richtig', 'gross')).toBeCloseTo(740 / 820 * 100, 1)
    expect(spiele('richtig', 'klein')).toBeGreaterThan(60)
  })

  it('gibt für alles richtig genau 100 Prozent', () => {
    expect(spiele('richtig', 'richtig')).toBe(100)
  })
})
