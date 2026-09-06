// verfahren.spec.ts – die Verfahrensbezeichnungen im echten Browser (v0.16.1)
//
// Seit dem Umzug in einen eigenen Namensraum entscheidet sich erst zur
// Laufzeit, ob die Wörter ankommen. Greift die Registrierung in
// src/i18n/index.ts nicht, zeigt die Anwendung statt «Relevanz-Matrix» den
// rohen Schlüssel «verfahren:methodik_relevanz_title» – und kein Unit-Test
// merkt davon etwas, weil die Datei ja vollständig ist.
//
// Geprüft wird deshalb das, was auf dem Bildschirm steht: in allen vier
// Sprachen, und mit der Gegenprobe, dass nirgends ein roher Schlüssel steht.
//
// Verglichen wird ohne Rücksicht auf Gross- und Kleinschreibung: die Karte
// setzt `text-transform: uppercase`, und `innerText` liefert den dargestellten
// Text, nicht den Wert aus der Datei. Ein Vergleich Zeichen für Zeichen würde
// hier einen Fehler melden, den es nicht gibt.
//
// Die erwarteten Wortlaute sind nicht abgetippt, sondern aus der
// Verfahrensdatei gelesen. Ein Test mit abgetippten Erwartungen prüft die
// Abschrift, nicht die Sache.

import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

type Sprache = 'de' | 'fr' | 'it' | 'en'

/** Text der Seite und erwarteter Wert, beide klein geschrieben. */
function enthaelt(seite: string, erwartet: string): boolean {
  return seite.toLocaleLowerCase('de').includes(erwartet.toLocaleLowerCase('de'))
}

/** Die Werte der Verfahrensdatei, direkt aus dem Quelltext gelesen. */
function verfahrensWerte(sprache: Sprache): Record<string, string> {
  const quelle = readFileSync(join(process.cwd(), 'src', 'i18n', 'verfahren.bfu.ts'), 'utf-8')
  const block = quelle.slice(quelle.indexOf(`  ${sprache}: {`)).split('\n  },')[0]
  const werte: Record<string, string> = {}
  for (const m of block.matchAll(/^\s*"([^"]+)": ("(?:[^"\\]|\\.)*"),?$/gm)) {
    werte[m[1]] = JSON.parse(m[2]) as string
  }
  return werte
}

const TEXTE: Record<Sprache, Record<string, string>> = {
  de: verfahrensWerte('de'), fr: verfahrensWerte('fr'),
  it: verfahrensWerte('it'), en: verfahrensWerte('en'),
}

/** Einstieg öffnen und die Methodik-Karte aufklappen. */
async function methodikOeffnen(page: Page, sprache: Sprache = 'de'): Promise<void> {
  await page.addInitScript(s => window.localStorage.setItem('rsi-lang', s), sprache)
  await page.goto('/')

  await page.getByPlaceholder(/Max Muster/).fill('E2E-Person')
  await page.locator('button').filter({ hasText: /Training|Start|Démarr|Avvia/ }).first().click()

  // Erst wenn der Einstieg wirklich steht, ist der Knopf da.
  await expect(page.getByText('E2E-Thema').first()).toBeVisible()

  const karte = page.locator('button').filter({ hasText: TEXTE[sprache].methodik_title })
  await karte.first().click()
  await expect(page.getByText(TEXTE[sprache].methodik_relevanz_title).first()).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
})

test('Die Methodik-Karte zeigt Wörter, keine Schlüssel', async ({ page }) => {
  await methodikOeffnen(page)
  const t = TEXTE.de

  for (const schluessel of [
    'methodik_relevanz_title', 'methodik_risiko_title', 'methodik_naca_title',
    'methodik_zeile_wichtigkeit', 'methodik_spalte_schwere', 'methodik_subtitle',
  ]) {
    await expect(page.getByText(t[schluessel]).first(), schluessel).toBeVisible()
  }
})

test('Die Matrixfelder tragen die Dimensionen des Verfahrens', async ({ page }) => {
  await methodikOeffnen(page)
  const t = TEXTE.de
  const seite = page.locator('body')

  for (const schluessel of [
    'dim_gross', 'dim_mittel', 'dim_klein',
    'result_hoch', 'result_gering', 'schwere_leicht', 'schwere_schwer',
  ]) {
    await expect(seite.getByText(t[schluessel], { exact: true }).first(), schluessel).toBeVisible()
  }
})

test('Nirgends steht ein roher Schlüssel auf dem Bildschirm', async ({ page }) => {
  await methodikOeffnen(page)

  const sichtbar = await page.locator('body').innerText()
  expect(sichtbar).not.toMatch(/verfahren:/)
  expect(sichtbar).not.toMatch(/\bscoring\.[a-zA-Z]/)
  expect(sichtbar).not.toMatch(/\bmethodik\.[a-zA-Z]/)

  // Gegenprobe: der geprüfte Bereich ist wirklich offen.
  expect(enthaelt(sichtbar, TEXTE.de.methodik_relevanz_title)).toBe(true)
})

for (const sprache of ['fr', 'it', 'en'] as const) {
  test(`Der Namensraum trägt auch ${sprache}`, async ({ page }) => {
    await methodikOeffnen(page, sprache)

    const sichtbar = await page.locator('body').innerText()
    expect(sichtbar).not.toMatch(/verfahren:/)
    expect(enthaelt(sichtbar, TEXTE[sprache].methodik_relevanz_title), 'Relevanz-Matrix').toBe(true)
    expect(enthaelt(sichtbar, TEXTE[sprache].methodik_risiko_title), 'Unfallrisiko-Matrix').toBe(true)
  })
}

test('Die Quellenangabe der Methodik-Karte steht am Bildschirm', async ({ page }) => {
  await methodikOeffnen(page)
  const sichtbar = await page.locator('body').innerText()

  // Nur die Überschrift kommt aus dem Namensraum. Die drei Quellen selbst
  // stehen hartkodiert im JSX von TopicDashboard und sind deshalb in jeder
  // Sprache deutsch – festgehalten, nicht in diesem Schritt geändert.
  expect(enthaelt(sichtbar, TEXTE.de.methodik_quellen), 'Überschrift Quellen').toBe(true)
  for (const teil of ['Fachkurs FK RSI (V 16.09.2020)', 'bfu-Bericht 73 (NACA)', 'SN 641 723:2016 Abb. 2']) {
    expect(enthaelt(sichtbar, teil), teil).toBe(true)
  }
})

test('Die Quellenzeile des Bewertungsflusses trägt ihren eigenen Wortlaut', () => {
  // Befund, hier nur festgehalten: `quellen` im Namensraum nennt den
  // «TBA-Fachkurs», die Karte am Einstieg dagegen den «Fachkurs». Zwei
  // Angaben derselben Quelle, seit dem Rückbau der Behördenbezüge (v0.12.0)
  // auseinandergelaufen. Der Wortlaut bleibt in diesem Schritt unverändert.
  expect(TEXTE.de.quellen).toContain('FK RSI')
  expect(TEXTE.de.quellen).toContain('NACA')
})
