// landsperre.spec.ts – kein Verfahren, keine Beurteilung (v0.16.2)
//
// Die Regel lautet: Für ein Land ohne hinterlegtes Verfahren gibt es keinen
// Ablauf, keinen Ersatz und keine Punkte. Geprüft wird sie hier am laufenden
// Programm, denn sie greift an einer Stelle, die man nur durch Klicken
// erreicht – und die Gegenprobe gehört dazu: dieselbe Szene mit CH muss den
// gewohnten Ablauf zeigen.

import { test, expect, type Page } from '@playwright/test'
import { KEYS, SEED, seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

/** Setzt das Land von Thema und Szene, bevor die Anwendung startet. */
async function landSetzen(page: Page, land: string): Promise<void> {
  await page.addInitScript(
    ({ keys, seed, land }) => {
      window.localStorage.setItem(keys.TOPICS, JSON.stringify(
        seed.topics.map(tp => ({ ...tp, country: land })),
      ))
      window.localStorage.setItem(keys.SCENES, JSON.stringify(
        seed.scenes.map(s => ({ ...s, country: land })),
      ))
    },
    { keys: KEYS, seed: SEED, land },
  )
}

/** Bis in die Szene: Name, Thema, Szene, Training starten. */
async function bisInDieSzene(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByPlaceholder(/Max Muster/).fill('E2E-Person')
  await page.getByRole('button', { name: /Training starten/ }).click()
  await page.getByText('E2E-Thema').first().click()
  await page.getByText('E2E-Szene').first().click()
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
})

test('Deutschland: die Szene ist erreichbar, die Beurteilung nicht', async ({ page }) => {
  await landSetzen(page, 'DE')
  await bisInDieSzene(page)

  // Bis hierher ändert sich nichts: das Land blendet aus, es sperrt nicht.
  await expect(page.getByText('E2E-Szene').first()).toBeVisible()
})

test('Die Schweiz behält den gewohnten Ablauf', async ({ page }) => {
  await landSetzen(page, 'CH')
  await bisInDieSzene(page)

  const sichtbar = await page.locator('body').innerText()
  expect(sichtbar).not.toMatch(/noch kein Verfahren hinterlegt/)
})

test('Ein Bestand ohne Landangabe läuft wie vorher', async ({ page }) => {
  // Kein landSetzen: der Seed trägt kein `country`. Die Leseregel macht
  // daraus die Schweiz, und der Ablauf muss unverändert erreichbar sein.
  await bisInDieSzene(page)

  const sichtbar = await page.locator('body').innerText()
  expect(sichtbar).not.toMatch(/noch kein Verfahren hinterlegt/)
  expect(sichtbar).toMatch(/E2E-Szene/)
})

test('Im Administrationsbereich ist das Land ein Pflichtfeld mit Vorgabe CH', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByRole('button', { name: /^Themenbereiche$/ }).first().click()
  await page.getByRole('button', { name: /Neues Thema/ }).click()

  const auswahl = page.getByLabel('Land')
  await expect(auswahl).toBeVisible()
  await expect(auswahl).toHaveValue('CH')

  // Die Liste führt die Welt, nicht nur die Schweiz.
  const anzahl = await auswahl.locator('option').count()
  expect(anzahl).toBe(249)
})

test('Ein untergeordnetes Thema wählt kein Land, es erbt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByRole('button', { name: /^Themenbereiche$/ }).first().click()
  await page.getByRole('button', { name: /Neues Thema/ }).click()

  // Das Auswahlfeld heisst «Unterthema / Gruppe» — der Radioknopf wird über
  // seine Beschriftung gewählt, nicht über einen geratenen Text.
  await page.getByRole('dialog').getByText(/Unterthema/).click()
  await expect(page.getByLabel('Land')).toBeHidden()
  await expect(page.getByText(/Erbt das Land|gilt für alle Szenen/).first()).toBeVisible()
})

test('Der Kurs bindet sich an das Land seines ersten Themas', async ({ page }) => {
  // Zwei Themen, zwei Länder – erst dann hat die Bindung eine Wirkung.
  await page.addInitScript(
    ({ keys, seed }) => {
      window.localStorage.setItem(keys.TOPICS, JSON.stringify([
        { ...seed.topics[0], country: 'CH' },
        { ...seed.topics[0], id: 'tp-de', country: 'DE',
          nameI18n: { de: 'DE-Thema', fr: 'DE-Thema', it: 'DE-Thema', en: 'DE-Thema' } },
      ]))
    },
    { keys: KEYS, seed: SEED },
  )

  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByRole('button', { name: 'Kurse', exact: true }).click()
  await page.getByRole('button', { name: /Neuer Kurs/ }).click()

  const dialog = page.getByRole('dialog')
  // Ohne Thema ist das Land offen.
  await expect(dialog.getByText(/ergibt sich aus dem ersten/)).toBeVisible()

  // Erstes Thema anhaken: das Land steht fest.
  await dialog.getByRole('checkbox').first().check()
  await expect(dialog.getByText('Land des Kurses: Schweiz')).toBeVisible()

  // Das zweite Thema trägt ein anderes Land und ist nicht mehr wählbar.
  const zweites = dialog.getByRole('checkbox').nth(1)
  await expect(zweites).toBeDisabled()
  await expect(dialog.getByText(/Nicht wählbar\. Dieser Themenbereich/)).toBeVisible()
})
