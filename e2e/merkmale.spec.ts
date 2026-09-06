// merkmale.spec.ts – Strassenmerkmale in der Einstiegsansicht.
//
// Die Szenen vom 6. September 2026 tragen bis zu 20 Merkmale aus der
// Perimeterebene der RSI-Erfassung. Vorher trug keine Szene eines. Die Frage
// ist deshalb nicht, ob die Tabelle erscheint, sondern ob der Startknopf
// darunter noch erreichbar bleibt — auf dem Telefon wie am Bildschirm.

import { test, expect } from '@playwright/test'
import { SEED, KEYS, seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

// Die zwanzig Merkmale einer echten Szene (SZ_2026_112), Wert für Wert aus
// daten/merkmale_2026-09-06.json.
const MERKMALE = [
  ['Strassenklassierung', 'RVS'],
  ['Funktion der Strasse', 'verkehrsorientiert (Basisnetz)'],
  ['Haupt- oder Nebenstrasse', 'Nebenstrasse, vortrittsberichtigt'],
  ['Lage IO/AO', 'innerorts'],
  ['Ausnahmetransportroute', 'keine'],
  ['Verkehrslastklasse', 'T3'],
  ['Längsgefälle im Perimeter', '< 3 %'],
  ['Strassenbeleuchtung', 'ja, ganze Nacht'],
  ['Lichtsignalanlage (LSA)', 'nein'],
  ['Signalisierte Geschwindigkeit', '50 km/h'],
  ['Massgebender Begegnungsfall', 'LKW-PW'],
  ['Durchschnittlicher täglicher Verkehr (Fz/24 h)', '8729'],
  ['Trottoir', 'beidseitig lückenlos'],
  ['Fussgängerstreifen', 'nein'],
  ['Veloroute', 'ja'],
  ['Veloinfrastruktur', 'keine'],
  ['Buslinie', 'ja'],
  ['Bushaltestellen', 'nein'],
  ['Landwirtschaftsverkehr', 'keiner oder selten'],
  ['Strassenbahn', 'nein'],
]

async function seedeMitMerkmalen(page: import('@playwright/test').Page) {
  const szenen = JSON.parse(JSON.stringify(SEED.scenes))
  szenen[0].strassenmerkmale = MERKMALE.map(([label, wert]) => ({
    labelI18n: { de: label, fr: label, it: label, en: label },
    wertI18n: { de: wert, fr: wert, it: wert, en: wert },
  }))
  await page.addInitScript(
    ([key, wert]) => window.localStorage.setItem(key as string, wert as string),
    [KEYS.SCENES, JSON.stringify(szenen)] as const,
  )
}

async function bisZumEinstieg(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByPlaceholder(/Max Muster/).fill('E2E Tester')
  await page.getByRole('button', { name: /Training starten/ }).click()
  await page.getByText('E2E-Thema').first().click()
  // Die Szenenliste führt in den Einstieg über den Knopf der Szenenkarte,
  // nicht über den Namen der Szene.
  await page.getByRole('button', { name: /Training starten/ }).first().click()
  await expect(page.getByText('Strassenmerkmale')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
  await seedeMitMerkmalen(page)
})

test('Die Merkmalstabelle zeigt jedes Merkmal der Szene', async ({ page }) => {
  await bisZumEinstieg(page)
  const zeilen = page.locator('table tbody tr')
  await expect(zeilen).toHaveCount(MERKMALE.length)
  // Stichprobe auf den Wert, nicht nur auf die Zeilenzahl.
  await expect(page.getByText('beidseitig lückenlos')).toBeVisible()
})

for (const [breite, hoehe, name] of [
  [1440, 900, 'am Bildschirm'],
  [390, 844, 'auf dem Telefon'],
] as const) {
  test(`Der Startknopf bleibt erreichbar ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: hoehe })
    await bisZumEinstieg(page)

    const knopf = page.getByRole('button', { name: /Training starten/ }).last()
    await expect(knopf).toBeVisible()

    // Der Knopf steht unter der Tabelle. Gemessen wird, wie weit gescrollt
    // werden muss — nicht, ob er im Baum steht.
    // Nicht `document.body.scrollHeight`: Der Body scrollt hier gar nicht,
    // er ist immer so hoch wie das Fenster. Gescrollt wird ein inneres
    // Element, und nur dessen Höhe sagt etwas über den Weg zum Knopf.
    const gesamt = await page.evaluate(() => {
      const scroller = [...document.querySelectorAll<HTMLElement>('div')]
        .find(el => el.scrollHeight > el.clientHeight + 4
                    && ['auto', 'scroll'].includes(
                      getComputedStyle(el).overflowY))
      return scroller ? scroller.scrollHeight : document.body.scrollHeight
    })
    const kasten = await knopf.boundingBox()
    console.log(`  ${name}: Inhalt ${gesamt} px bei ${hoehe} px Fenster, `
                + `Knopf bei ${Math.round(kasten?.y ?? -1)} px, `
                + `Tabelle ${await page.locator('table tbody tr').count()} Zeilen`)
    expect(kasten).not.toBeNull()
    // Zwei Bildhöhen sind der Weg, den eine Leseansicht mit Bild, Hinweis,
    // Merkmalen und Defizitangaben rechtfertigt. Darüber sucht man den
    // Startknopf.
    expect(gesamt).toBeLessThan(hoehe * 2)
  })
}
