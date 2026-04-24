// landing.spec.ts – Golden-Path der LandingPage
// Deckt: App-Start, Name-Pflicht, Kurs-Select (ohne Kurs vs. mit Kurs),
// Uebergang zum TopicDashboard.

import { test, expect } from '@playwright/test'
import { seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
})

test('LandingPage rendert mit Logo, Taglines und Login-Card', async ({ page }) => {
  await page.goto('/')

  // Kern-Branding sichtbar
  await expect(page.getByText('RSI VR Tool').first()).toBeVisible()
  await expect(page.getByText('Willkommen.')).toBeVisible()

  // Name-Input + Start-Button vorhanden
  await expect(page.getByPlaceholder('z.B. Max Muster')).toBeVisible()
  await expect(page.getByRole('button', { name: /Training starten/ })).toBeVisible()
})

test('Start ohne Namen zeigt Fehlermeldung', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Training starten/ }).click()

  await expect(page.getByText('Bitte geben Sie Ihren Namen ein.')).toBeVisible()
})

test('Start mit Namen ohne Kurs fuehrt ins TopicDashboard', async ({ page }) => {
  await page.goto('/')

  await page.getByPlaceholder('z.B. Max Muster').fill('E2E Tester')
  await page.getByRole('button', { name: /Training starten/ }).click()

  // TopicDashboard: das geseedete Thema muss sichtbar sein.
  // Mehrere Treffer moeglich (Sidebar + Grid) — first() reicht fuer Smoke.
  await expect(page.getByText('E2E-Thema').first()).toBeVisible()
})

test('Kurs-Select zeigt geseedeten Kurs in der Dropdown-Liste', async ({ page }) => {
  await page.goto('/')

  const select = page.locator('select').first()
  await expect(select).toBeVisible()

  // Option mit Kurs-Name muss vorhanden sein
  const optionTexts = await select.locator('option').allTextContents()
  expect(optionTexts.some(t => t.includes('E2E-Kurs'))).toBe(true)
})
