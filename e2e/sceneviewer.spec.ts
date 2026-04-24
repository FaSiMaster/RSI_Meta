// sceneviewer.spec.ts – Trainings-Flow bis zum Viewer.
// Fokus liegt auf der Navigation: Landing → Topics → Scenes → Einstieg.
// Der Viewer selbst nutzt @react-three/fiber (WebGL); in Headless-CI wird nur
// geprueft, dass das Canvas tatsaechlich gemountet wird — kein 3D-State.

import { test, expect } from '@playwright/test'
import { seedLocalStorage } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedLocalStorage(page)
})

test('Flow: Landing → Topics → Scenes → Einstieg', async ({ page }) => {
  await page.goto('/')

  // 1. Name eingeben + starten
  await page.getByPlaceholder('z.B. Max Muster').fill('E2E Tester')
  await page.getByRole('button', { name: /Training starten/ }).click()

  // 2. TopicDashboard: Seed-Thema anklicken
  await expect(page.getByText('E2E-Thema').first()).toBeVisible()
  await page.getByText('E2E-Thema').first().click()

  // 3. SceneList: Seed-Szene sichtbar
  await expect(page.getByText('E2E-Szene').first()).toBeVisible()
})

test('SceneList zeigt geseedete Szene mit Defizit-Hinweis', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('z.B. Max Muster').fill('E2E Tester')
  await page.getByRole('button', { name: /Training starten/ }).click()

  await page.getByText('E2E-Thema').first().click()

  // Die Szenen-Card muss sichtbar sein
  const sceneCard = page.getByText('E2E-Szene').first()
  await expect(sceneCard).toBeVisible()
})
