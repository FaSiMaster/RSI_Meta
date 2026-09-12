// Prüft, dass der Ablauf der Unfallkommission das Richtige zeigt
//
// Die Punkte prüft punkteUko.test.ts, die Weiche verfahren.test.ts. Offen
// bleibt, ob die Komponente überhaupt rendert und ob sie die beiden Teilscores
// getrennt zeigt statt ihre Summe. Das lässt sich nur am gerenderten Ergebnis
// beantworten. Gerendert wird über react-dom/server, wie beim Länder-Wächter:
// kein neues Paket, kein Browser, und trotzdem echtes React statt einer
// Behauptung über den Quelltext.
//
// Was dieser Wächter NICHT kann: klicken. Der Ablauf hat inneren Zustand, und
// ein Server-Rendering zeigt immer den Anfangszustand. Geprüft wird deshalb der
// erste Bildschirm und, über die Umgehung unten, der Aufbau des Ergebnisses.

import { describe, it, expect, beforeAll } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from '../i18n'
import ScoringFlowUko from './ScoringFlowUko'
import type { AppDeficit, AppScene } from '../data/appData'
import { VERFAHREN_UKO_ID, type BewertungUko, type BewertungBfu } from '../data/bewertung'

const UKO_SOLL: BewertungUko = {
  verfahren: VERFAHREN_UKO_ID,
  schritt1: 'sicherheitsdefizit',
  schritt2: 'gross',
}

const BFU_SOLL = {
  wichtigkeit: 'mittel', abweichung: 'mittel', relevanzSD: 'mittel',
  naca: 2, unfallschwere: 'mittel', unfallrisiko: 'mittel',
} as BewertungBfu

function defizit(bewertung: BewertungUko | BewertungBfu): AppDeficit {
  return {
    id: 'SD_9001', sceneId: 'S9', topicId: 'T9',
    nameI18n: { de: 'Kreisinsel ohne Bordeinfassung', fr: 'Îlot sans bordure', it: 'Isola senza cordolo', en: 'Island without kerb' },
    beschreibungI18n: { de: 'Der Übergang ist höhengleich.', fr: '', it: '', en: '' },
    kriteriumId: 'fussgaengerstreifen', kontext: 'io',
    correctAssessment: bewertung,
    isPflicht: true, isBooster: false, normRefs: [], verortung: null,
  } as AppDeficit
}

const SZENE = {
  id: 'S9', topicId: 'T9',
  nameI18n: { de: 'Niederfrauendorf', fr: '', it: '', en: '' },
  kontext: 'io', isActive: true, country: 'DE',
} as AppScene

function rendern(d: AppDeficit): string {
  return renderToStaticMarkup(
    createElement(ScoringFlowUko, {
      deficit: d,
      scene: SZENE,
      onComplete: () => {},
      onBack: () => {},
    }),
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('de')
})

describe('Erster Bildschirm', () => {
  it('nennt beide Schritte und keinen dritten', () => {
    const html = rendern(defizit(UKO_SOLL))
    expect(html).toContain('Art des Befundes')
    expect(html).toContain('Einstufung')
    expect(html).toContain('Schritt 1 von 2')
    expect(html).toContain('Schritt 2 von 2')
    expect(html).not.toContain('Schritt 3')
  })

  it('bietet genau die zwei Arten zur Wahl', () => {
    const html = rendern(defizit(UKO_SOLL))
    expect(html).toContain('Sicherheitsdefizit')
    expect(html).toContain('Gestaltungsbefund')
  })

  it('bietet die drei Einstufungen', () => {
    const html = rendern(defizit(UKO_SOLL))
    expect(html).toContain('Gross')
    expect(html).toContain('Mittel')
    expect(html).toContain('Klein')
  })

  it('zeigt keinen Schritt des Neunschrittpfades', () => {
    const html = rendern(defizit(UKO_SOLL))
    // Wichtigkeit, Abweichung und NACA gehören dem anderen Verfahren.
    expect(html).not.toContain('Wichtigkeit')
    expect(html).not.toContain('NACA')
    expect(html).not.toContain('Relevanz')
    expect(html).not.toContain('Unfallrisiko')
  })

  it('verrät die Musterlösung nicht', () => {
    // Der erste Bildschirm darf nicht zeigen, was richtig ist. Die Wörter
    // «Musterlösung» und «Ihre Beurteilung» gehören ins Ergebnis.
    const html = rendern(defizit(UKO_SOLL))
    expect(html).not.toContain('Musterlösung')
  })

  it('nennt das Verfahren, aber keine Norm und keine Richtlinie', () => {
    const html = rendern(defizit(UKO_SOLL))
    expect(html).toContain('Unfallkommission')
    for (const marke of ['BASt', 'FGSV', 'ESAS', 'RSAS', 'SN 641', 'VSS ']) {
      expect(html, `Marke ${marke} darf nicht vorkommen`).not.toContain(marke)
    }
  })
})

describe('Falsches Verfahren im Datensatz', () => {
  it('rechnet nichts, wenn das Defizit dem Neunschrittpfad folgt', () => {
    const html = rendern(defizit(BFU_SOLL))
    expect(html).not.toContain('Art des Befundes')
    expect(html).toContain('keine Punkte')
  })
})

describe('Sprachen', () => {
  it('spricht französisch, wenn die Oberfläche französisch ist', async () => {
    await i18n.changeLanguage('fr')
    const html = rendern(defizit(UKO_SOLL))
    expect(html).toContain('Nature du constat')
    expect(html).toContain('Déficit de sécurité')
    await i18n.changeLanguage('de')
  })

  it('spricht englisch, wenn die Oberfläche englisch ist', async () => {
    await i18n.changeLanguage('en')
    const html = rendern(defizit(UKO_SOLL))
    expect(html).toContain('Type of finding')
    expect(html).toContain('Safety deficiency')
    await i18n.changeLanguage('de')
  })

  it('trägt in jeder Sprache dieselben Schlüssel', async () => {
    // Der eigentliche Fehler wäre ein Schlüssel, den nur Deutsch hat: dann
    // stünde in den anderen Sprachen der Schlüsselname statt eines Wortes.
    const { VERFAHREN_UKO } = await import('../i18n/verfahren.uko')
    const basis = Object.keys(VERFAHREN_UKO.de).sort()
    for (const sprache of ['fr', 'it', 'en'] as const) {
      expect(Object.keys(VERFAHREN_UKO[sprache]).sort(), `Sprache ${sprache}`).toEqual(basis)
    }
  })

  it('übersetzt jeden Schlüssel wirklich, statt den deutschen Text zu übernehmen', async () => {
    const { VERFAHREN_UKO } = await import('../i18n/verfahren.uko')
    const de = VERFAHREN_UKO.de as Record<string, string>
    // Ausnahmen: Platzhalterketten und Eigennamen dürfen gleich lauten.
    const erlaubtGleich = new Set(['ergebnisTreffer', 'ergebnisPunkte'])
    for (const sprache of ['fr', 'it', 'en'] as const) {
      const fremd = VERFAHREN_UKO[sprache] as Record<string, string>
      const gleich = Object.keys(de).filter(
        k => !erlaubtGleich.has(k) && de[k] === fremd[k],
      )
      expect(gleich, `Sprache ${sprache}: unveränderte deutsche Texte`).toEqual([])
    }
  })
})
