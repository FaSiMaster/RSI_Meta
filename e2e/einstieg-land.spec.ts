// einstieg-land.spec.ts – Gruppierung, Filter und Zuständigkeit (v0.16.3)
//
// Drei Zusicherungen, die nur am laufenden Programm zu prüfen sind: dass der
// Filter ausblendet statt zu sperren, dass die zuletzt getroffene Wahl den
// Neustart überlebt, und dass die Anwendung ohne Eintrag ehrlich sagt, dass
// niemand bestimmt ist – für jedes Land, auch für die Schweiz.

import { test, expect, type Page } from '@playwright/test'
import { KEYS, SEED, seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

/** Zwei oberste Themen in zwei Ländern. */
async function zweiLaender(page: Page): Promise<void> {
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
}

async function zumEinstieg(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByPlaceholder(/Max Muster/).fill('E2E-Person')
  await page.getByRole('button', { name: /Training starten/ }).click()
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
})

test('Ein einziges Land: keine Gruppenüberschrift, kein Filter', async ({ page }) => {
  await zumEinstieg(page)

  await expect(page.getByText('E2E-Thema').first()).toBeVisible()
  // Eine Überschrift, die in jeder Zeile dasselbe sagt, gehört nicht hin.
  await expect(page.getByRole('button', { name: 'Alle Länder' })).toBeHidden()
})

test('Zwei Länder: beide Gruppen sichtbar, Vorgabe ist alle', async ({ page }) => {
  await zweiLaender(page)
  await zumEinstieg(page)

  await expect(page.getByRole('heading', { name: 'Schweiz', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Deutschland', exact: true })).toBeVisible()
  await expect(page.getByText('E2E-Thema').first()).toBeVisible()
  await expect(page.getByText('DE-Thema').first()).toBeVisible()

  const alle = page.getByRole('button', { name: 'Alle Länder' })
  await expect(alle).toBeVisible()
  await expect(alle).toHaveAttribute('aria-pressed', 'true')
})

test('Der Filter blendet aus, er sperrt nicht', async ({ page }) => {
  await zweiLaender(page)
  await zumEinstieg(page)

  await page.getByRole('button', { name: 'Deutschland', exact: true }).click()
  await expect(page.getByText('DE-Thema').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Schweiz', exact: true })).toBeHidden()

  // Zurück auf alle: nichts ist verloren.
  await page.getByRole('button', { name: 'Alle Länder' }).click()
  await expect(page.getByRole('heading', { name: 'Schweiz', exact: true })).toBeVisible()
})

test('Die zuletzt getroffene Wahl überlebt den Neustart', async ({ page }) => {
  await zweiLaender(page)
  await zumEinstieg(page)

  await page.getByRole('button', { name: 'Deutschland', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Schweiz', exact: true })).toBeHidden()

  await page.reload()
  await page.getByPlaceholder(/Max Muster/).fill('E2E-Person')
  await page.getByRole('button', { name: /Training starten/ }).click()

  await expect(page.getByRole('button', { name: 'Deutschland', exact: true }))
    .toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { name: 'Schweiz', exact: true })).toBeHidden()
})

test('Ohne Eintrag sagt die Anwendung, dass niemand bestimmt ist', async ({ page }) => {
  await zumEinstieg(page)

  const karte = page.getByRole('region', { name: 'Zuständigkeit' }).first()
  await expect(karte).toBeVisible()
  await expect(karte).toContainText('noch nicht bestimmt')
  await expect(karte).toContainText('keine Freigabe durch eine Stelle dieses Landes')
  await expect(karte).toContainText('nur zu Trainingszwecken')
})

test('Das gilt auch für die Schweiz', async ({ page }) => {
  await zweiLaender(page)
  await zumEinstieg(page)

  const karten = page.getByRole('region', { name: 'Zuständigkeit' })
  await expect(karten).toHaveCount(2)
  for (let i = 0; i < 2; i++) {
    await expect(karten.nth(i)).toContainText('noch nicht bestimmt')
  }
})

test('Ein Eintrag ersetzt den Vorläufigkeitshinweis', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('rsi-v3-zustaendigkeiten', JSON.stringify([{
      country: 'CH',
      organisation: 'Prüfstelle Muster',
      grundlage: 'Fachkurs FK RSI, V 16.09.2020, nach VSS 41 723 (früher SN 641 723)',
      stand: '6. September 2026',
      hinweis: 'Trainingsinstrument',
    }]))
  })
  await zumEinstieg(page)

  const karte = page.getByRole('region', { name: 'Zuständigkeit' }).first()
  await expect(karte).toContainText('Prüfstelle Muster')
  await expect(karte).toContainText('VSS 41 723')
  await expect(karte).not.toContainText('noch nicht bestimmt')
})

test('Der Administrationsbereich führt einen Reiter zum Pflegen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()

  await page.getByRole('button', { name: 'Zuständigkeit', exact: true }).click()
  await expect(page.getByLabel('Verantwortliche Stelle')).toBeVisible()
  await expect(page.getByLabel('Fachliche Grundlage')).toBeVisible()
  await expect(page.getByLabel('Stand')).toBeVisible()
  await expect(page.getByLabel('Hinweis')).toBeVisible()

  // Der Hinweis auf die Gerätebindung gehört sichtbar dazu.
  await expect(page.getByText(/liegen auf diesem Gerät/)).toBeVisible()
})

test('Eingetragene Angaben erscheinen nach dem Speichern am Einstieg', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.getByRole('button', { name: 'Zuständigkeit', exact: true }).click()

  await page.getByLabel('Verantwortliche Stelle').fill('Prüfstelle E2E')
  await page.getByLabel('Fachliche Grundlage').fill('Fachkurs FK RSI, V 16.09.2020')
  await page.getByRole('button', { name: /Speichern/ }).first().click()

  await zumEinstieg(page)
  const karte = page.getByRole('region', { name: 'Zuständigkeit' }).first()
  await expect(karte).toContainText('Prüfstelle E2E')
  await expect(karte).not.toContainText('noch nicht bestimmt')
})
