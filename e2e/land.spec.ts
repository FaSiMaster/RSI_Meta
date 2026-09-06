// land.spec.ts – die Leseregel Land im echten Browser (v0.16.0)
//
// Diese Prüfung gibt es, weil man von der Sache nichts sieht. Das Feld
// `country` erscheint in keiner Ansicht; wer die Anwendung öffnet, kann nicht
// feststellen, ob die Regel greift oder ob sie fehlt. Also prüft der Browser
// selbst nach: was im Speicher des Geräts steht, was an den Server geht, und
// dass am Bildschirm alles bleibt, wie es war.

import { test, expect, type Page } from '@playwright/test'
import { seedLocalStorage, KEYS, SEED } from './fixtures/seed'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'

async function adminOeffnen(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByRole('button', { name: 'Defizite', exact: true })).toBeVisible()
}

async function themenTab(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Themenbereiche$/ }).first().click()
}

/** Liest eine Liste aus dem localStorage des Browsers. */
async function ausSpeicher<T>(page: Page, key: string): Promise<T[]> {
  const roh = await page.evaluate(k => window.localStorage.getItem(k), key)
  return JSON.parse(roh ?? '[]') as T[]
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
})

test('Bestand ohne Feld: die Anwendung startet, als wäre nichts geschehen', async ({ page }) => {
  await installSupabaseStub(page)
  await seedLocalStorage(page)

  await page.goto('/')
  await expect(page.getByText('RSI VR Tool').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Training starten/ })).toBeVisible()

  // Der Bestand im Speicher ist unangetastet: das Lesen schreibt nichts.
  const themen = await ausSpeicher<Record<string, unknown>>(page, KEYS.TOPICS)
  expect(themen).toHaveLength(1)
  expect('country' in themen[0]).toBe(false)
})

test('Das Land steht im Speicher, sobald ein Thema gespeichert wird', async ({ page }) => {
  const anDenServer: unknown[] = []
  await installSupabaseStub(page, { onAdminWrite: body => anDenServer.push(body) })
  await seedLocalStorage(page)

  await adminOeffnen(page)
  await themenTab(page)

  await page.getByRole('button', { name: /Bearbeiten/ }).first().click()
  await page.getByRole('button', { name: /^Speichern$/ }).first().click()

  // Im Speicher des Geräts
  await expect.poll(async () => {
    const themen = await ausSpeicher<{ country?: string }>(page, KEYS.TOPICS)
    return themen[0]?.country
  }).toBe('CH')

  // Und im Aufruf an den Server – sonst trüge es nur der lokale Bestand.
  await expect.poll(() => {
    const schreiben = anDenServer.find(b => {
      const o = b as { table?: string; rows?: Array<{ data?: { country?: string } }> }
      return o?.table === 'rsi_topics' && o.rows?.[0]?.data?.country !== undefined
    })
    const o = schreiben as { rows?: Array<{ data?: { country?: string } }> } | undefined
    return o?.rows?.[0]?.data?.country
  }).toBe('CH')
})

test('Alles andere am Thema bleibt Zeichen für Zeichen, wie es war', async ({ page }) => {
  await installSupabaseStub(page)
  await seedLocalStorage(page)

  await adminOeffnen(page)
  await themenTab(page)
  await page.getByRole('button', { name: /Bearbeiten/ }).first().click()
  await page.getByRole('button', { name: /^Speichern$/ }).first().click()

  await expect.poll(async () => {
    const themen = await ausSpeicher<{ country?: string }>(page, KEYS.TOPICS)
    return themen[0]?.country
  }).toBe('CH')

  const [gespeichert] = await ausSpeicher<Record<string, unknown>>(page, KEYS.TOPICS)
  const { country, ...ohneLand } = gespeichert
  expect(country).toBe('CH')
  expect(ohneLand).toEqual(SEED.topics[0])
})

test('Ein anderes Land wird nicht überschrieben', async ({ page }) => {
  await installSupabaseStub(page)
  await seedLocalStorage(page)
  await page.addInitScript(
    ({ key, thema }) => {
      window.localStorage.setItem(key, JSON.stringify([{ ...thema, country: 'DE' }]))
    },
    { key: KEYS.TOPICS, thema: SEED.topics[0] },
  )

  await adminOeffnen(page)
  await themenTab(page)
  await page.getByRole('button', { name: /Bearbeiten/ }).first().click()
  await page.getByRole('button', { name: /^Speichern$/ }).first().click()

  await page.waitForTimeout(300)
  const themen = await ausSpeicher<{ country?: string }>(page, KEYS.TOPICS)
  expect(themen[0].country).toBe('DE')
})

test('Ein unbekannter Wert im Bestand wird zur Schweiz', async ({ page }) => {
  await installSupabaseStub(page)
  await seedLocalStorage(page)
  await page.addInitScript(
    ({ key, thema }) => {
      window.localStorage.setItem(key, JSON.stringify([{ ...thema, country: 'XX' }]))
    },
    { key: KEYS.TOPICS, thema: SEED.topics[0] },
  )

  await adminOeffnen(page)
  await themenTab(page)
  await page.getByRole('button', { name: /Bearbeiten/ }).first().click()
  await page.getByRole('button', { name: /^Speichern$/ }).first().click()

  await expect.poll(async () => {
    const themen = await ausSpeicher<{ country?: string }>(page, KEYS.TOPICS)
    return themen[0]?.country
  }).toBe('CH')
})

test('Das Feld erscheint nirgends am Bildschirm', async ({ page }) => {
  await installSupabaseStub(page)
  await seedLocalStorage(page)

  await adminOeffnen(page)
  await themenTab(page)

  // Weder der Feldname noch der Code stehen im sichtbaren Text. Das ist die
  // Zusicherung dieser Fassung: die Grundlage liegt, die Oberfläche schweigt.
  const sichtbar = await page.locator('body').innerText()
  expect(sichtbar).not.toMatch(/\bcountry\b/i)
  expect(sichtbar).not.toMatch(/\bLand\b/)
  expect(sichtbar).not.toMatch(/\bCH\b/)

  // Gegenprobe: dass hier überhaupt Text steht, den man lesen könnte.
  expect(sichtbar).toMatch(/E2E-Thema/)
})

test('Die Themenkarten am Einstieg bleiben unverändert', async ({ page }) => {
  await installSupabaseStub(page)
  await seedLocalStorage(page)

  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await themenTab(page)

  await expect(page.getByText('E2E-Thema').first()).toBeVisible()
  const zeilen = await page.getByText('E2E-Thema').count()
  expect(zeilen).toBeGreaterThan(0)
})
