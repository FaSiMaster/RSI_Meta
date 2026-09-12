// Wächter über die Beispielszene Niederfrauendorf (B4, v0.20.0)
//
// Die Einfuhrdatei trägt die Musterlösung einer Prüfungsszene. Ändert jemand
// dort einen Wert, ändert er eine Freigabe, und das darf nicht unbemerkt
// geschehen. Dieser Wächter hält jeden Wert gegen den Entscheid, aus dem er
// stammt, und rechnet die Folgen nach.
//
// Die Entscheide stehen in .claude/entscheide/JOURNAL.md, Lauf vom
// 12. September 2026. Wer eine Zahl hier ändern muss, braucht vorher einen
// neuen Entscheid — nicht umgekehrt.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  ukoMaxPunkte, bewerteUko, ukoProzent,
  type UkoErgebnis,
} from '../data/punkteUko'
import { VERFAHREN_UKO_ID, type BewertungUko } from '../data/bewertung'
import type { RSIDimension } from '../types'

const DATEI = join(process.cwd(), 'daten', 'rsi-import_niederfrauendorf_2026-09-12.json')

interface Einfuhr {
  version: string
  topics: { id: string; country?: string; nameI18n: Record<string, string> }[]
  scenes: {
    id: string
    topicId: string
    country?: string
    szenentyp?: string
    phasen?: { id: string; bilder: string[]; bewertet: boolean; labelI18n: Record<string, string>; zeitangabeI18n: Record<string, string> }[]
    nameI18n: Record<string, string>
  }[]
  deficits: {
    id: string
    sceneId: string
    topicId: string
    isPflicht: boolean
    normRefs: string[]
    nameI18n: Record<string, string>
    beschreibungI18n: Record<string, string>
    erklaerungI18n?: Record<string, string>
    correctAssessment: { verfahren?: string; schritt1?: string; schritt2?: RSIDimension | null }
    verortungen?: Record<string, { typ: string; x: number; y: number; r: number }>
  }[]
}

const vorhanden = existsSync(DATEI)
const daten: Einfuhr | null = vorhanden ? JSON.parse(readFileSync(DATEI, 'utf-8')) : null

// Die Musterlösung, wie sie freigegeben wurde. Reihenfolge nach Defizitnummer
// des Auditberichts, damit sie gegen das Journal lesbar bleibt.
const FREIGEGEBEN: { nr: number; id: string; art: 'sicherheitsdefizit' | 'gestaltung'; stufe: RSIDimension | null; entscheid: string }[] = [
  { nr: 4,  id: 'SD_0102', art: 'sicherheitsdefizit', stufe: 'gross',  entscheid: 'F-013' },
  { nr: 8,  id: 'SD_0104', art: 'gestaltung',         stufe: null,     entscheid: 'E-5' },
  { nr: 9,  id: 'SD_0103', art: 'sicherheitsdefizit', stufe: 'gross',  entscheid: 'F-011' },
  { nr: 10, id: 'SD_0106', art: 'sicherheitsdefizit', stufe: 'gross',  entscheid: 'F-012' },
  { nr: 12, id: 'SD_0108', art: 'sicherheitsdefizit', stufe: 'gross',  entscheid: 'F-010' },
  { nr: 13, id: 'SD_0105', art: 'gestaltung',         stufe: null,     entscheid: 'F-002' },
  { nr: 14, id: 'SD_0109', art: 'sicherheitsdefizit', stufe: 'mittel', entscheid: 'F-014' },
  { nr: 15, id: 'SD_0101', art: 'sicherheitsdefizit', stufe: 'mittel', entscheid: 'F-015' },
  { nr: 17, id: 'SD_0107', art: 'sicherheitsdefizit', stufe: 'gross',  entscheid: 'F-009' },
]

describe.skipIf(!vorhanden)('Einfuhrdatei Niederfrauendorf', () => {
  it('liegt vor und trägt die erwartete Fassung', () => {
    expect(daten).not.toBeNull()
    expect(daten!.version).toBe('rsi-v3')
  })

  it('legt ein deutsches Thema mit genau einer Szene an', () => {
    expect(daten!.topics).toHaveLength(1)
    expect(daten!.topics[0].country).toBe('DE')
    expect(daten!.scenes).toHaveLength(1)
    expect(daten!.scenes[0].country).toBe('DE')
    expect(daten!.scenes[0].topicId).toBe(daten!.topics[0].id)
  })

  it('ist eine Bildserie mit einer bewerteten und einer Vergleichsphase', () => {
    const s = daten!.scenes[0]
    expect(s.szenentyp).toBe('bildserie')
    expect(s.phasen).toHaveLength(2)
    expect(s.phasen!.filter(p => p.bewertet)).toHaveLength(1)
    expect(s.phasen!.filter(p => !p.bewertet)).toHaveLength(1)
    // Die Vergleichsphase liegt zeitlich davor, und das muss man ihr ansehen.
    expect(s.phasen![1].zeitangabeI18n.de).toContain('2017')
    expect(s.phasen![0].zeitangabeI18n.de).toContain('2022')
  })

  it('trägt jede Phase in vier Sprachen', () => {
    for (const p of daten!.scenes[0].phasen ?? []) {
      for (const feld of [p.labelI18n, p.zeitangabeI18n]) {
        expect(Object.keys(feld).sort()).toEqual(['de', 'en', 'fr', 'it'])
        for (const sprache of ['de', 'fr', 'it', 'en']) {
          expect(feld[sprache].trim().length, `${p.id} ${sprache}`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe.skipIf(!vorhanden)('Musterlösung gegen die Entscheide', () => {
  it('führt genau die neun freigegebenen Befunde', () => {
    expect(daten!.deficits).toHaveLength(FREIGEGEBEN.length)
    expect(daten!.deficits.map(d => d.id).sort()).toEqual(FREIGEGEBEN.map(f => f.id).sort())
  })

  it.each(FREIGEGEBEN)('Defizit $nr trägt die Werte aus $entscheid', ({ nr, id, art, stufe }) => {
    const d = daten!.deficits.find(x => x.id === id)
    expect(d, `Defizit ${nr} (${id}) fehlt`).toBeDefined()
    expect(d!.correctAssessment.verfahren).toBe(VERFAHREN_UKO_ID)
    expect(d!.correctAssessment.schritt1).toBe(art)
    expect(d!.correctAssessment.schritt2).toBe(stufe)
  })

  it('gibt einem Gestaltungsbefund keine Einstufung', () => {
    for (const d of daten!.deficits) {
      if (d.correctAssessment.schritt1 === 'gestaltung') {
        expect(d.correctAssessment.schritt2, d.id).toBeNull()
      }
    }
  })

  it('lässt normRefs leer, weil der Wächter dort Schweizer Normen erwartet', () => {
    for (const d of daten!.deficits) {
      expect(d.normRefs, d.id).toEqual([])
    }
  })

  it('erklärt jeden Befund in vier Sprachen', () => {
    for (const d of daten!.deficits) {
      for (const feld of [d.nameI18n, d.beschreibungI18n, d.erklaerungI18n]) {
        expect(feld, d.id).toBeDefined()
        expect(Object.keys(feld!).sort()).toEqual(['de', 'en', 'fr', 'it'])
        for (const sprache of ['de', 'fr', 'it', 'en']) {
          expect(feld![sprache].trim().length, `${d.id} ${sprache}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('übernimmt in keiner Sprache den deutschen Text unverändert', () => {
    for (const d of daten!.deficits) {
      for (const sprache of ['fr', 'it', 'en']) {
        expect(d.nameI18n[sprache], `${d.id} ${sprache}`).not.toBe(d.nameI18n.de)
      }
    }
  })
})

describe.skipIf(!vorhanden)('Verortungen', () => {
  it('verortet jeden Befund in genau einem Bild', () => {
    for (const d of daten!.deficits) {
      const v = Object.entries(d.verortungen ?? {})
      expect(v, d.id).toHaveLength(1)
      expect(v[0][1].typ).toBe('bild')
    }
  })

  it('hält jede Verortung im Bild, mit brauchbarem Radius', () => {
    for (const d of daten!.deficits) {
      for (const [bild, v] of Object.entries(d.verortungen ?? {})) {
        expect(v.x, `${d.id} x`).toBeGreaterThan(0)
        expect(v.x, `${d.id} x`).toBeLessThan(1)
        expect(v.y, `${d.id} y`).toBeGreaterThan(0)
        expect(v.y, `${d.id} y`).toBeLessThan(1)
        expect(v.r, `${d.id} r`).toBeGreaterThan(0.02)
        expect(v.r, `${d.id} r`).toBeLessThan(0.2)
        expect(bild.startsWith('http'), `${d.id} Bildadresse`).toBe(true)
      }
    }
  })

  it('verortet nur in Bildern der bewerteten Phase', () => {
    const bewertet = new Set(
      (daten!.scenes[0].phasen ?? []).filter(p => p.bewertet).flatMap(p => p.bilder),
    )
    for (const d of daten!.deficits) {
      for (const bild of Object.keys(d.verortungen ?? {})) {
        expect(bewertet.has(bild), `${d.id} verortet ausserhalb der bewerteten Phase`).toBe(true)
      }
    }
  })

  it('lässt keine zwei Befunde im selben Bild übereinanderliegen', () => {
    // Sonst trifft ein Klick immer denselben, und der zweite ist nicht zu
    // finden. Gerechnet wie in trefferImBild, mit dem Seitenverhältnis der
    // Bilddatei; 16:9 für alle bis auf das erste, das 2048 mal 923 misst.
    const sv = (bild: string) => (bild.includes('nfd_2022_01') ? 2048 / 923 : 2048 / 1152)
    const nachBild = new Map<string, { id: string; x: number; y: number; r: number }[]>()
    for (const d of daten!.deficits) {
      for (const [bild, v] of Object.entries(d.verortungen ?? {})) {
        const liste = nachBild.get(bild) ?? []
        liste.push({ id: d.id, ...v })
        nachBild.set(bild, liste)
      }
    }
    for (const [bild, liste] of nachBild) {
      for (let i = 0; i < liste.length; i++) {
        for (let j = i + 1; j < liste.length; j++) {
          const a = liste[i]
          const b = liste[j]
          const abstand = Math.hypot(a.x - b.x, (a.y - b.y) / sv(bild))
          expect(abstand, `${a.id} und ${b.id} in ${bild.split('/').pop()}`).toBeGreaterThan(a.r + b.r)
        }
      }
    }
  })
})

describe.skipIf(!vorhanden)('Folgen der Musterlösung', () => {
  function bewertung(f: typeof FREIGEGEBEN[number]): BewertungUko {
    return { verfahren: VERFAHREN_UKO_ID, schritt1: f.art, schritt2: f.stufe }
  }

  it('ergibt ein Szenenmaximum von 820 Punkten', () => {
    const max = FREIGEGEBEN.reduce((s, f) => s + ukoMaxPunkte(f.art), 0)
    expect(max).toBe(820)
  })

  it('gibt bei durchweg richtigen Antworten genau 100 Prozent', () => {
    const e: UkoErgebnis[] = FREIGEGEBEN.map(f =>
      bewerteUko(bewertung(f), { schritt1: f.art, schritt2: f.stufe }),
    )
    expect(ukoProzent(e)).toBe(100)
  })

  it('BEFUND B-5: die Strategie «immer Sicherheitsdefizit, immer gross» besteht mit 61,0 Prozent', () => {
    // Fünf der sieben Sicherheitsdefizite sind gross, also trifft die Strategie
    // fünf Einstufungen. Der Wächter hält den Befund fest; behoben ist er
    // nicht. Wege: ein Befund mit der Einstufung klein, oder eine höhere
    // Schwelle für diese Szene über scene.bestandenKriterium.
    const e: UkoErgebnis[] = FREIGEGEBEN.map(f =>
      bewerteUko(bewertung(f), { schritt1: 'sicherheitsdefizit', schritt2: 'gross' }),
    )
    const anteil = ukoProzent(e)
    expect(anteil).toBeCloseTo(61.0, 1)
    expect(anteil, 'Wenn das hier unter 60 fällt, ist B-5 behoben und der Test anzupassen').toBeGreaterThan(60)
  })

  it('lässt blosses Raten in Schritt 2 durchfallen', () => {
    // «immer klein» trifft keine der sieben Einstufungen.
    const e: UkoErgebnis[] = FREIGEGEBEN.map(f =>
      bewerteUko(bewertung(f), { schritt1: 'sicherheitsdefizit', schritt2: 'klein' }),
    )
    expect(ukoProzent(e)).toBeLessThan(60)
  })

  it('führt fünf Pflichtbefunde, nämlich die mit der Einstufung gross', () => {
    const pflicht = daten!.deficits.filter(d => d.isPflicht)
    expect(pflicht).toHaveLength(5)
    for (const d of pflicht) {
      expect(d.correctAssessment.schritt2, d.id).toBe('gross')
    }
  })
})
