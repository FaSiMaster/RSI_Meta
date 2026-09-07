// bibliothek.spec.ts — die Bildwahl im Bildspeicher.
//
// Der Befund vom 7. September 2026, an einem Bildschirmfoto gefunden: Die
// Bibliothek listet die Szenenordner in einem Flex-Kasten mit begrenzter
// Höhe. Ein Flex-Kind darf standardmässig schrumpfen — und tat es: Bei
// siebzehn Ordnern standen sechzehn davon als graue Streifen von wenigen
// Bildpunkten da, unbeschriftet und nicht anwählbar, während der geöffnete
// Ordner den Rest bekam und trotzdem nur zwei seiner sechs Bilder zeigte.
// Der Kasten scrollte nicht, er quetschte.
//
// Geprüft wird deshalb nicht, ob die Ordner im Baum stehen, sondern ob sie
// eine bedienbare Höhe haben.

import { test, expect } from '@playwright/test'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'
import { KEYS } from './fixtures/seed'

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

// Siebzehn Szenenordner, der aktuelle mit sechs Bildern — der Bestand führte
// am Befundtag siebzehn Ordner und 97 Bilder.
const BILDSPEICHER: Record<string, string[]> = {
  SZ_2026_107: [
    'haupt.webp',
    'persp_001_Fahrtrichtung_am_Standort.webp',
    'persp_002_Fahrtrichtung_15_m_danach.webp',
    'persp_003_Gegenrichtung_15_m_davor.webp',
    'persp_004_Gegenrichtung_am_Standort.webp',
    'persp_005_Gegenrichtung_15_m_danach.webp',
  ],
}
for (let i = 1; i <= 16; i++) {
  const nr = String(i).padStart(3, '0')
  BILDSPEICHER[`SZ_2026_${nr}`] = ['haupt.webp', 'persp_001_Standort.webp', 'persp_002_Standort.webp']
}

const TOPIC = {
  id: 'tp-bib',
  nameI18n: { de: 'Bibliothek-Thema', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  sortOrder: 1,
  isActive: true,
  parentTopicId: null,
  createdAt: 1_700_000_000_000,
}

const SCENE = {
  id: 'SZ_2026_107',
  topicId: 'tp-bib',
  nameI18n: { de: 'Bibliothek-Szene', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  bemerkungI18n: { de: '', fr: '', it: '', en: '' },
  kontext: 'io',
  strassenmerkmale: [],
  vorschauBilder: [],
  vorschauBild1: null,
  vorschauBild2: null,
  panoramaBildUrl: PIXEL,
  startblick: null,
  // Eine Perspektive ohne Bild: nur dort steht die Bildwahl offen da, ohne
  // dass zuerst «Anderes Bild wählen» gedrückt werden müsste.
  perspektiven: [{ id: 'persp-leer', label: 'Standort 6', bildUrl: '', startblick: null, standortPosition: null, navMarker: null }],
  isActive: true,
  createdAt: 1_700_000_000_000,
}

test.use({ viewport: { width: 1024, height: 900 } })

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page, { bildspeicher: BILDSPEICHER })
  await page.addInitScript(({ keys, topic, scene }) => {
    window.localStorage.setItem(keys.SCHEMA, '2')
    window.localStorage.setItem(keys.INIT, '1')
    window.localStorage.setItem(keys.TOPICS, JSON.stringify([topic]))
    window.localStorage.setItem(keys.SCENES, JSON.stringify([scene]))
    window.localStorage.setItem(keys.DEFICITS, '[]')
    window.localStorage.setItem(keys.RANKING, '[]')
    window.localStorage.setItem(keys.KURSE, '[]')
  }, { keys: KEYS, topic: TOPIC, scene: SCENE })
})

async function oeffneBibliothek(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Admin/ }).click()
  await page.getByPlaceholder('PIN').fill('5004')
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page.getByRole('button', { name: 'Defizite', exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Bearbeiten/ }).first().click()
  await expect(page.getByText('Szenenname')).toBeVisible()

  // Die Perspektive ohne Bild aufklappen — dort steht die Bibliothek offen.
  await page.getByTestId('perspektive-kopf').first().click()
  await expect(page.getByText(/^Bilder im Bucket/)).toBeVisible()
  await expect(page.getByTestId('bibliothek-ordner').first()).toBeVisible()
}

test('Jeder Szenenordner bleibt bedienbar hoch', async ({ page }) => {
  await oeffneBibliothek(page)

  const ordner = page.getByTestId('bibliothek-ordner')
  await expect(ordner).toHaveCount(17)

  // Die Kopfzeile eines Ordners trägt Text mit 12 Bildpunkten und 8 Punkten
  // Innenabstand oben und unten. Alles unter 28 Bildpunkten ist gequetscht.
  const anzahl = await ordner.count()
  for (let i = 0; i < anzahl; i++) {
    const kasten = await ordner.nth(i).boundingBox()
    expect(kasten, `Ordner ${i} hat keine Ausdehnung`).not.toBeNull()
    expect(kasten!.height, `Ordner ${i} ist auf ${kasten!.height} Bildpunkte gequetscht`)
      .toBeGreaterThanOrEqual(28)
  }
})

test('Der geöffnete Ordner zeigt alle seine Bilder', async ({ page }) => {
  await oeffneBibliothek(page)

  // SZ_2026_107 ist die aktuelle Szene und deshalb offen.
  const kacheln = page.getByTestId('bibliothek-kachel')
  await expect(kacheln).toHaveCount(6)

  // Alle Kacheln sind gleich hoch — ein Bild, das nicht 2:1 ist (eine
  // Drohnenaufnahme etwa), darf die Zeile nicht auseinanderziehen.
  const hoehen: number[] = []
  for (let i = 0; i < 6; i++) {
    const k = await kacheln.nth(i).boundingBox()
    expect(k).not.toBeNull()
    hoehen.push(Math.round(k!.height))
  }
  expect(Math.max(...hoehen) - Math.min(...hoehen)).toBeLessThanOrEqual(1)
})

test('Ein anderer Ordner lässt sich öffnen und schliesst den ersten', async ({ page }) => {
  await oeffneBibliothek(page)

  // Der letzte Ordner der Liste — genau der, der vorher ein Streifen war.
  const ordner = page.getByTestId('bibliothek-ordner')
  const letzter = ordner.nth(16)
  await letzter.scrollIntoViewIfNeeded()
  await letzter.getByRole('button').first().click()

  // Er hat drei Bilder; der vorher offene Ordner ist zu.
  await expect(page.getByTestId('bibliothek-kachel')).toHaveCount(3)
})
