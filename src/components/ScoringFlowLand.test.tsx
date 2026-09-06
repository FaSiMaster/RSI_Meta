// Prüft, dass der Bewertungsfluss die Länderweiche wirklich beachtet
//
// Die Entscheidung selbst prüft verfahren.test.ts. Offen bleibt die Frage, ob
// ScoringFlow sie auch anwendet – und die lässt sich nur am gerenderten
// Ergebnis beantworten. Gerendert wird über react-dom/server: kein neues
// Paket, kein Browser, und trotzdem echtes React statt einer Behauptung über
// den Quelltext.

import { describe, it, expect, beforeAll } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import i18n from '../i18n'
import ScoringFlow from './ScoringFlow'
import type { AppDeficit, AppScene } from '../data/appData'

const DEFIZIT = {
  id: 'SD_0001', sceneId: 'S1', topicId: 'T1',
  nameI18n: { de: 'Testdefizit', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  kriteriumId: 'fussgaengerstreifen', kontext: 'io',
  correctAssessment: {
    wichtigkeit: 'mittel', abweichung: 'mittel', relevanzSD: 'mittel',
    naca: 2, unfallschwere: 'mittel', unfallrisiko: 'mittel',
  },
  isPflicht: true, isBooster: false, normRefs: [], verortung: null,
} as AppDeficit

function szene(country?: string): AppScene {
  return {
    id: 'S1', topicId: 'T1',
    nameI18n: { de: 'Testszene', fr: '', it: '', en: '' },
    kontext: 'io', isActive: true, country,
  } as AppScene
}

function rendern(scene: AppScene): string {
  return renderToStaticMarkup(
    createElement(ScoringFlow, {
      deficit: DEFIZIT,
      scene,
      onComplete: () => {},
      onBack: () => {},
    }),
  )
}

beforeAll(async () => {
  if (!i18n.isInitialized) await i18n.init()
  await i18n.changeLanguage('de')
})

describe('Land ohne Verfahren', () => {
  it('zeigt den Hinweis statt des Bewertungsflusses', () => {
    const html = rendern(szene('DE'))
    expect(html).toContain('Für dieses Land ist noch kein Verfahren hinterlegt')
    expect(html).toContain('Deutschland')
  })

  it('sagt ausdrücklich, dass es keine Punkte gibt', () => {
    const html = rendern(szene('DE'))
    expect(html).toContain('Es werden keine Punkte vergeben')
  })

  it('zeigt keinen einzigen Bewertungsschritt', () => {
    const html = rendern(szene('DE'))
    // Nichts vom Ablauf darf erscheinen: keine Eingabe, kein Tabellenwert,
    // keine Auswahl.
    expect(html).not.toContain('Gemäss Tabelle')
    expect(html).not.toContain('Wie funktioniert die Bewertung?')
    expect(html).not.toContain('Unfallschwere')
  })

  it('bietet nur den Rückweg an', () => {
    const html = rendern(szene('DE'))
    expect(html).toContain('Zurück zur Szene')
  })

  it('gilt für jedes Land ohne Verfahren, nicht nur für Deutschland', () => {
    for (const land of ['AT', 'FR', 'IT', 'US', 'JP']) {
      expect(rendern(szene(land)), land).toContain('kein Verfahren hinterlegt')
    }
  })
})

describe('Die Schweiz', () => {
  it('bekommt den gewohnten Ablauf: drei Eingaben, Tabellenwert, Erklärung', () => {
    const html = rendern(szene('CH'))
    expect(html).not.toContain('kein Verfahren hinterlegt')
    for (const stueck of ['Wichtigkeit', 'Abweichung', 'Unfallschwere',
                          'Gemäss Tabelle', 'Wie funktioniert die Bewertung?']) {
      expect(html, stueck).toContain(stueck)
    }
  })

  it('ein Bestand ohne Landangabe ebenso', () => {
    const html = rendern(szene(undefined))
    expect(html).not.toContain('kein Verfahren hinterlegt')
    expect(html).toContain('Gemäss Tabelle')
    expect(html).toContain('Wie funktioniert die Bewertung?')
  })

  it('ein unbekannter Code fällt auf den Hinweis, nicht auf den Ablauf', () => {
    // Die Leseregel macht aus einem unbekannten Wert beim Lesen CH. Kommt er
    // trotzdem bis hierher – etwa aus einem Datensatz, der nicht durch die
    // Getter lief –, gilt: lieber anhalten als nach fremdem Massstab werten.
    const html = rendern(szene('XX'))
    expect(html).toContain('kein Verfahren hinterlegt')
  })
})

describe('Der Hinweis spricht die Sprache der Oberfläche', () => {
  it('französisch', async () => {
    await i18n.changeLanguage('fr')
    const html = rendern(szene('DE'))
    expect(html).toContain('Aucune méthode')
    expect(html).toContain('Allemagne')
    await i18n.changeLanguage('de')
  })

  it('italienisch', async () => {
    await i18n.changeLanguage('it')
    const html = rendern(szene('DE'))
    expect(html).toContain('non è ancora definito alcun metodo')
    expect(html).toContain('Germania')
    await i18n.changeLanguage('de')
  })

  it('englisch', async () => {
    await i18n.changeLanguage('en')
    const html = rendern(szene('DE'))
    expect(html).toContain('No procedure is defined')
    expect(html).toContain('Germany')
    await i18n.changeLanguage('de')
  })
})
