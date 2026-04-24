// admin.spec.ts – Admin-Flow nach dem Modal-Split-Refactor (Sprint 3, v0.6.x).
// Validiert: PIN-Modal → Token-Austausch → AdminDashboard mit 4 Tabs.
// Smoke-Tests pro Modal: Defizit, Szene, Thema, Kurs oeffnen + Formular sichtbar.

import { test, expect } from '@playwright/test'
import { seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

async function openAdminDashboard(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()

  // PIN-Modal
  await expect(page.getByText('Admin-Zugang')).toBeVisible()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()

  // Admin-Dashboard: Tab-Navigation muss erscheinen
  await expect(page.getByRole('button', { name: 'Defizite', exact: true })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
})

test('PIN-Modal akzeptiert korrekten PIN und oeffnet Admin-Dashboard', async ({ page }) => {
  await openAdminDashboard(page)

  // Alle 4 Tabs sichtbar
  await expect(page.getByRole('button', { name: 'Defizite', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Themenbereiche$/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kurse', exact: true })).toBeVisible()
})

test('Falscher PIN zeigt Fehlermeldung', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()

  await page.getByPlaceholder('PIN').fill('9999')
  await page.getByRole('button', { name: 'Anmelden' }).click()

  await expect(page.getByText('PIN ist nicht korrekt.')).toBeVisible()
})

test('DefizitModal oeffnet sich mit Formular-Feldern', async ({ page }) => {
  await openAdminDashboard(page)

  // Seed-Thema + Seed-Szene sollten automatisch selektiert sein.
  // Neues Defizit anlegen
  await page.getByRole('button', { name: /Neues Defizit/ }).click()

  // Modal-Header erkennbar an der Section-Ueberschrift "Bezeichnung"
  await expect(page.getByText('Bezeichnung').first()).toBeVisible()
  // Speichern + Abbrechen vorhanden
  await expect(page.getByRole('button', { name: /^Speichern$/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Abbrechen$/ }).first()).toBeVisible()

  // ESC schliesst das Modal
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /Neues Defizit/ })).toBeVisible()
})

test('SzeneModal oeffnet sich und laesst sich schliessen', async ({ page }) => {
  await openAdminDashboard(page)

  await page.getByRole('button', { name: /Neue Szene/ }).click()
  await expect(page.getByText('Szenenname')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByText('Szenenname')).toBeHidden()
})

test('ThemaModal oeffnet sich beim Tab-Wechsel', async ({ page }) => {
  await openAdminDashboard(page)

  await page.getByRole('button', { name: /^Themenbereiche$/ }).first().click()
  await page.getByRole('button', { name: /Neues Thema/ }).click()

  await expect(page.getByText('Bezeichnung').first()).toBeVisible()
  await expect(page.getByText('Typ')).toBeVisible()

  await page.keyboard.press('Escape')
})

test('KursModal oeffnet sich mit Zugangscode-Feld', async ({ page }) => {
  await openAdminDashboard(page)

  await page.getByRole('button', { name: 'Kurse', exact: true }).click()
  await page.getByRole('button', { name: /Neuer Kurs/ }).click()

  await expect(page.getByText('Kursname')).toBeVisible()
  await expect(page.getByText('Zugangscode', { exact: true })).toBeVisible()

  await page.keyboard.press('Escape')
})
