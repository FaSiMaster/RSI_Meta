// verortung-bilder.spec.ts — Bildauswahl bei vielen Standorten je Szene.
//
// Hintergrund: seit den infra3d-Panoramen führt eine Szene bis zu sechs
// Standorte, im Bestand einzelne mehr. Die frühere Standortleiste im
// BildEditor war eine einzeilige Flexbox ohne Umbruch und ohne Überlauf —
// die hinteren Standorte lagen ausserhalb des Modals und waren nicht
// anklickbar. Diese Prüfungen messen genau das: dass jeder Standort
// erreichbar ist, und dass im SzeneModal immer nur eine Perspektive
// geöffnet ist.

import { test, expect } from '@playwright/test'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'
import { KEYS } from './fixtures/seed'

// 1×1-GIF als Bildquelle — der Streifen hängt an der Datenlage, nicht an der Auflösung.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// Zwölf Standorte mit sprechenden, langen Labels. Der Bestand führt heute
// bis zu sechs je Szene; geprüft wird über dem Normalfall, damit der
// Streifen im Laptop-Fenster sicher überläuft und die Prüfung die Sache
// misst und nicht bloss den bequemen Fall.
const PERSPEKTIVEN = [
  'Fahrtrichtung 15 m davor',
  'Fahrtrichtung am Standort',
  'Fahrtrichtung 15 m danach',
  'Gegenrichtung 15 m davor',
  'Gegenrichtung am Standort',
  'Gegenrichtung 15 m danach',
  'Nebenstrasse Einmündung',
  'Fussweg Querungsstelle',
  'Knoten Nordarm',
  'Knoten Südarm',
  'Bushaltestelle Ostseite',
  'Radstreifen Westseite',
].map((label, i) => ({
  id: `persp-e2e-${i + 1}`,
  label,
  bildUrl: PIXEL,
  startblick: null,
  standortPosition: null,
  navMarker: null,
}))

const TOPIC = {
  id: 'tp-bilder',
  nameI18n: { de: 'Bilder-Thema', fr: 'Bilder-Thema', it: 'Bilder-Thema', en: 'Bilder-Thema' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  sortOrder: 1,
  isActive: true,
  parentTopicId: null,
  createdAt: 1_700_000_000_000,
}

const SCENE = {
  id: 'SZ_2026_BILD',
  topicId: 'tp-bilder',
  nameI18n: { de: 'Bilder-Szene', fr: 'Bilder-Szene', it: 'Bilder-Szene', en: 'Bilder-Szene' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  bemerkungI18n: { de: '', fr: '', it: '', en: '' },
  kontext: 'io',
  strassenmerkmale: [],
  vorschauBilder: [],
  vorschauBild1: null,
  vorschauBild2: null,
  panoramaBildUrl: PIXEL,
  startblick: null,
  perspektiven: PERSPEKTIVEN,
  isActive: true,
  createdAt: 1_700_000_000_000,
}

const DEFICITS = [1, 2, 3].map(n => ({
  id: `SD_900${n}`,
  sceneId: 'SZ_2026_BILD',
  topicId: 'tp-bilder',
  nameI18n: { de: `Bilder-Defizit ${n}`, fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  kriteriumId: 'fussgaengerstreifen',
  kontext: 'io',
  correctAssessment: {
    wichtigkeit: 'mittel', abweichung: 'mittel', relevanzSD: 'mittel',
    naca: 2, unfallschwere: 'mittel', unfallrisiko: 'mittel',
  },
  isPflicht: true,
  isBooster: false,
  normRefs: [],
  verortung: null,
}))

// Laptop-Fenster: dort ist der Platz knapp, und genau dort wurden die
// hinteren Standorte früher unerreichbar.
test.use({ viewport: { width: 1024, height: 720 } })

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await page.addInitScript(({ keys, topic, scene, deficits }) => {
    window.localStorage.setItem(keys.SCHEMA, '2')
    window.localStorage.setItem(keys.INIT, '1')
    window.localStorage.setItem(keys.TOPICS, JSON.stringify([topic]))
    window.localStorage.setItem(keys.SCENES, JSON.stringify([scene]))
    window.localStorage.setItem(keys.DEFICITS, JSON.stringify(deficits))
    window.localStorage.setItem(keys.RANKING, '[]')
    window.localStorage.setItem(keys.KURSE, '[]')
  }, { keys: KEYS, topic: TOPIC, scene: SCENE, deficits: DEFICITS })
})

async function streifenMasse(page: import('@playwright/test').Page) {
  return page.getByTestId('standort-streifen').evaluate(el => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    overflowX: window.getComputedStyle(el).overflowX,
  }))
}

async function openSzeneModal(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByRole('button', { name: 'Defizite', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Bearbeiten/ }).first().click()
  await expect(page.getByText('Szenenname')).toBeVisible()
}

test('SzeneModal zeigt alle zwölf Perspektiven, aber nur eine offen', async ({ page }) => {
  await openSzeneModal(page)

  const koepfe = page.getByTestId('perspektive-kopf')
  await expect(koepfe).toHaveCount(12)

  // Im Ausgangszustand ist keine offen — keine Bildbibliothek lädt.
  await expect(page.getByTestId('perspektive-inhalt')).toHaveCount(0)

  // Erste öffnen
  await koepfe.nth(0).click()
  await expect(page.getByTestId('perspektive-inhalt')).toHaveCount(1)

  // Eine andere öffnen schliesst die erste — nie zwei zugleich.
  await koepfe.nth(5).click()
  await expect(page.getByTestId('perspektive-inhalt')).toHaveCount(1)
  await expect(koepfe.nth(5)).toHaveAttribute('aria-expanded', 'true')
  await expect(koepfe.nth(0)).toHaveAttribute('aria-expanded', 'false')

  // Nochmals auf dieselbe klicken schliesst sie.
  await koepfe.nth(5).click()
  await expect(page.getByTestId('perspektive-inhalt')).toHaveCount(0)
})

test('Verortungs-Editor: jeder der dreizehn Standorte ist anklickbar', async ({ page }) => {
  await openSzeneModal(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Verortungs-Editor öffnen' }).click()

  const kacheln = page.getByTestId('standort-kachel')
  // Haupt-Panorama + zwölf Perspektiven
  await expect(kacheln).toHaveCount(13)

  // Der Streifen muss tatsächlich überlaufen — sonst prüft der Rest nichts.
  const masse = await streifenMasse(page)
  expect(masse.scrollWidth).toBeGreaterThan(masse.clientWidth)
  // ... und er muss von Hand scrollbar sein. Ein blosses «hidden» liesse
  // sich zwar von einem Skript scrollen, für die Bedienung aber nicht.
  expect(['auto', 'scroll']).toContain(masse.overflowX)

  const streifen = page.getByTestId('standort-streifen')
  await expect(streifen).toBeVisible()

  // Kernprüfung: jede Kachel lässt sich erreichen und wählen — auch die
  // letzte. Ohne Überlauf im Streifen läge sie ausserhalb des Modals und
  // der Klick liefe in die Zeitüberschreitung.
  for (let i = 0; i < 13; i++) {
    await kacheln.nth(i).click({ timeout: 4000 })
    await expect(kacheln.nth(i)).toHaveAttribute('aria-current', 'true')
  }

  // Jede Kachel liegt waagrecht innerhalb des Streifens — und damit
  // innerhalb des Modals, das seinerseits abschneidet.
  const box = await streifen.boundingBox()
  const modal = await page.locator('[data-testid="standort-streifen"]').locator('xpath=ancestor::*[contains(@style,"overflow: hidden")][1]').boundingBox()
  expect(box).not.toBeNull()
  expect(modal).not.toBeNull()
  for (let i = 0; i < 13; i++) {
    await kacheln.nth(i).scrollIntoViewIfNeeded()
    const k = await kacheln.nth(i).boundingBox()
    expect(k).not.toBeNull()
    expect(k!.x).toBeGreaterThanOrEqual(box!.x - 1)
    expect(k!.x + k!.width).toBeLessThanOrEqual(box!.x + box!.width + 1)
    expect(k!.x).toBeGreaterThanOrEqual(modal!.x - 1)
    expect(k!.x + k!.width).toBeLessThanOrEqual(modal!.x + modal!.width + 1)
  }
})

test('Bildstreifen lässt sich einklappen und wieder ausklappen', async ({ page }) => {
  await openSzeneModal(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Verortungs-Editor öffnen' }).click()

  await expect(page.getByTestId('standort-streifen')).toBeVisible()
  await page.getByRole('button', { name: 'Einklappen' }).click()
  await expect(page.getByTestId('standort-streifen')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ausklappen' }).click()
  await expect(page.getByTestId('standort-kachel')).toHaveCount(13)
})
