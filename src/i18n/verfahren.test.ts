// Wächter über die Verfahrensbezeichnungen
//
// Seit v0.16.1 stehen die Wörter des Beurteilungsverfahrens nicht mehr in den
// allgemeinen Sprachdateien, sondern in einer eigenen Datei je Verfahren. Der
// Umzug kann auf drei Arten still schiefgehen: ein Schlüssel fehlt in einer
// Sprache, ein Aufruf im Code zeigt ins Leere, oder ein verschobener Schlüssel
// bleibt zusätzlich in der alten Datei stehen und niemand merkt, welcher von
// beiden gilt. Das prüft diese Datei.
//
// Was sie NICHT kann: beurteilen, ob ein Wortlaut fachlich richtig ist. Dafür
// gibt es nur den Fachkurs.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { VERFAHREN_BFU, VERFAHREN_BFU_ID } from './verfahren.bfu'
// Achtung bei den Namen: `it` ist hier die Prüfungsfunktion aus vitest.
// Die italienische Sprachdatei muss deshalb anders heissen, sonst überdeckt
// der Import die Funktion und keine einzige Prüfung läuft mehr.
import deutsch from './de.json'
import franzoesisch from './fr.json'
import italienisch from './it.json'
import englisch from './en.json'

const SPRACHEN = ['de', 'fr', 'it', 'en'] as const
const ALLGEMEIN: Record<string, Record<string, Record<string, string>>> = {
  de: deutsch as never, fr: franzoesisch as never,
  it: italienisch as never, en: englisch as never,
}

/** Alle Quelldateien unter src/, ohne die Sprachdateien selbst. */
function quelldateien(verzeichnis = join(process.cwd(), 'src')): string[] {
  const treffer: string[] = []
  for (const eintrag of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, eintrag)
    if (statSync(pfad).isDirectory()) {
      treffer.push(...quelldateien(pfad))
    } else if (/\.tsx?$/.test(eintrag) && !/\.test\.tsx?$/.test(eintrag) && !pfad.includes(join('src', 'i18n'))) {
      treffer.push(pfad)
    }
  }
  return treffer
}

/** Jeder im Code aufgerufene Schlüssel des Namensraums, mit Fundstelle. */
function aufrufeImCode(): Map<string, string[]> {
  const gefunden = new Map<string, string[]>()
  for (const datei of quelldateien()) {
    const inhalt = readFileSync(datei, 'utf-8')
    for (const m of inhalt.matchAll(/['"`]verfahren:([A-Za-zäöüÄÖÜ_0-9]+)['"`]/g)) {
      const liste = gefunden.get(m[1]) ?? []
      liste.push(datei.replace(process.cwd(), '').replace(/\\/g, '/'))
      gefunden.set(m[1], liste)
    }
  }
  return gefunden
}

// Schlüssel ohne Aufruf im Code. Vor dem Umzug lagen sie ebenso ungenutzt in
// den Sprachdateien; entfernt werden sie hier nicht, weil dieser Schritt keinen
// Wortlaut anfassen soll. Jeder NEUE ungenutzte Schlüssel lässt den Test
// anschlagen – das ist sein Zweck.
const BEKANNT_UNGENUTZT = new Set([
  'stepOf', 'step1Title', 'step2Title', 'step3Title', 'step4Title', 'step5Title',
  'step6Title', 'step7Title', 'step8Title', 'step9Title',
  'step1SubIo', 'step1SubAo', 'step2Sub', 'step3Sub', 'step4Sub', 'step5Sub',
  'step6Sub', 'step7Sub', 'step8Sub', 'step9Sub',
  'wichtigkeitHint', 'abweichungHint', 'nacaHint', 'nacaSource',
  'nacaLeicht', 'nacaMittel', 'nacaSchwer', 'allSteps', 'phase_e', 'schritt_von',
  'wichtigkeit_titel', 'abweichung_titel', 'relevanz_titel', 'naca_titel',
  'relevanz_proxy', 'wie_schwer', 'übertrag_auto',
])

describe('Verfahrensdatei bfu', () => {
  it('trägt eine Kennung', () => {
    expect(VERFAHREN_BFU_ID).toBe('bfu-fk-rsi-2020')
  })

  it('führt alle vier Sprachen', () => {
    expect(Object.keys(VERFAHREN_BFU).sort()).toEqual([...SPRACHEN].sort())
  })

  it('führt in jeder Sprache dieselben Schlüssel', () => {
    const deutsch = Object.keys(VERFAHREN_BFU.de).sort()
    for (const sprache of SPRACHEN) {
      expect(Object.keys(VERFAHREN_BFU[sprache]).sort(), `Sprache ${sprache}`).toEqual(deutsch)
    }
  })

  it('führt 104 Schlüssel', () => {
    expect(Object.keys(VERFAHREN_BFU.de)).toHaveLength(104)
  })

  it('hat keinen leeren Wert', () => {
    const leer: string[] = []
    for (const sprache of SPRACHEN) {
      for (const [k, v] of Object.entries(VERFAHREN_BFU[sprache])) {
        if (typeof v !== 'string' || v.trim() === '') leer.push(`${sprache}.${k}`)
      }
    }
    expect(leer).toEqual([])
  })
})

describe('Trennung von der Bedienung', () => {
  it('kein verschobener Schlüssel steht noch in den allgemeinen Sprachdateien', () => {
    const doppelt: string[] = []
    for (const sprache of SPRACHEN) {
      const scoring = ALLGEMEIN[sprache].scoring ?? {}
      for (const k of Object.keys(VERFAHREN_BFU.de)) {
        const alterName = k.startsWith('methodik_') ? k.slice('methodik_'.length) : k
        if (k in scoring) doppelt.push(`${sprache}.scoring.${k}`)
        if (k.startsWith('methodik_') && alterName in (ALLGEMEIN[sprache].methodik ?? {})) {
          doppelt.push(`${sprache}.methodik.${alterName}`)
        }
      }
    }
    expect(doppelt).toEqual([])
  })

  it('der Block methodik ist aus allen Sprachdateien verschwunden', () => {
    for (const sprache of SPRACHEN) {
      expect(ALLGEMEIN[sprache].methodik, `Sprache ${sprache}`).toBeUndefined()
    }
  })

  it('die Bedienung bleibt: 23 Schlüssel unter scoring, in jeder Sprache', () => {
    for (const sprache of SPRACHEN) {
      expect(Object.keys(ALLGEMEIN[sprache].scoring), `Sprache ${sprache}`).toHaveLength(23)
    }
  })
})

describe('Aufrufe im Code', () => {
  const aufrufe = aufrufeImCode()

  it('der Code ruft den Namensraum überhaupt auf', () => {
    expect(aufrufe.size).toBeGreaterThan(50)
  })

  it('jeder aufgerufene Schlüssel steht in der Verfahrensdatei', () => {
    const fehlend: string[] = []
    for (const [schluessel, orte] of aufrufe) {
      if (!(schluessel in VERFAHREN_BFU.de)) fehlend.push(`${schluessel} (${orte.join(', ')})`)
    }
    expect(fehlend).toEqual([])
  })

  it('kein Schlüssel liegt ungenutzt herum ausser den bekannten', () => {
    const neuUngenutzt = Object.keys(VERFAHREN_BFU.de)
      .filter(k => !aufrufe.has(k) && !BEKANNT_UNGENUTZT.has(k))
    expect(neuUngenutzt).toEqual([])
  })

  it('ein Schlüssel, den es nicht gibt, würde auffallen', () => {
    // Gegenprobe: die Prüfung oben misst wirklich.
    expect('gibtesnicht' in VERFAHREN_BFU.de).toBe(false)
  })
})
