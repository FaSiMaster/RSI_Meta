// bildwand.spec.ts – der Szenentyp Bildserie im echten Browser (v0.20.0)
//
// Diese Prüfung gibt es wegen eines Fehlers, der stumm war. Der Canvas der
// Bildwand stand mit `flex: 1` in einem Kasten ohne eigene Höhe, und React
// Three Fiber fällt dann auf 150 Bildpunkte zurück, ohne etwas zu melden. Das
// Bild sass als Streifen am oberen Rand. Kein Test fiel um: tsc war grün, der
// Build war grün, und die Unit-Prüfungen kannten die Frage nicht — sie rechnen
// Koordinaten und rendern kein WebGL.
//
// Geprüft wird deshalb am laufenden Bündel:
//   1. Der Canvas hat die Grösse des Fensters, nicht irgendeine.
//   2. Ein Klick setzt eine Marke; erst das Bestaetigen prueft die Stelle.
//   3. Ein Klick daneben findet nichts, und an der gespiegelten Stelle liegt
//      nichts.
//   4. In der unbewerteten Vergleichsphase ist nichts zu finden.
//   5. Die Hinweise kosten, was sie kosten sollen, und der Zaehler je Bild
//      erscheint erst mit der ersten Stufe.
//
// Seit v0.20.1 fuehrt ein Klick nicht mehr unmittelbar in die Bewertung. Drei
// Pruefungen dieser Datei sind deshalb nachgezogen; sie waren gruen und haetten
// den neuen Ablauf nicht bemerkt.
//
// Zur Messung: Die helle Fläche aus dem Canvas zu lesen geht nicht. Ein
// WebGL-Zeichenpuffer ist nach dem Rendern leer, und `drawImage` liefert immer
// Schwarz — das war beim Bauen der erste falsche Befund. Gemessen wird die
// Geometrie des Canvas, gesehen wird mit einem Bildschirmfoto.

import { test, expect, type Page } from '@playwright/test'
import { installSupabaseStub } from './fixtures/supabaseStub'
import { disableAnimations } from './fixtures/noAnimations'
import { TESTBILD, BILDSERIE_VERORTUNG, seedBildserie } from './fixtures/bildserieSeed'

/** Seitenverhältnis des Testbildes, 320 zu 180. */
const SV = 320 / 180
/** Anteil des Sichtfelds, den die Bildwand einnimmt (RANDANTEIL dort). */
const RAND = 0.94

/** Weg vom Einstieg bis in die Bildwand. */
async function bisZurBildwand(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByPlaceholder(/Max Muster/).fill('E2E')
  await page.getByRole('button', { name: /Training starten/ }).click()

  // Themenuebersicht
  await expect(page.getByText('E2E-Knoten DE').first()).toBeVisible()
  await page.getByText('E2E-Knoten DE').first().click()

  // Szenenliste
  await expect(page.getByText('E2E-Bildserie').first()).toBeVisible()
  await page.getByRole('button', { name: /Training starten/ }).first().click()

  // Trainingseinstieg. Auf ihn muss gewartet werden, sonst trifft der naechste
  // Klick noch den Knopf der Szenenliste — daran ist der erste Anlauf dieser
  // Pruefung gescheitert, und zwar stumm: die Seite blieb einfach stehen.
  await expect(page.getByText(/Diese Szene enthält/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: /Training starten/ }).first().click()

  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 })
  // Die Textur muss geladen sein, bevor die Wand ihre Grösse kennt: solange
  // sie fehlt, rechnet die Wand mit einem Ersatzverhältnis, und ein Klick
  // landet dann neben der Verortung. Gewartet wird deshalb, bis die
  // Canvas-Grösse zweimal denselben Wert zeigt, statt auf eine feste Zeit.
  let vorher = ''
  for (let i = 0; i < 20; i++) {
    const c = await page.locator('canvas').boundingBox()
    const jetzt = `${Math.round(c?.width ?? 0)}x${Math.round(c?.height ?? 0)}`
    if (jetzt === vorher && jetzt !== '0x0') break
    vorher = jetzt
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(1200)
}

/**
 * Lage des Bildes im Canvas, gerechnet wie in der Bildwand: «contain» mit
 * Randanteil, Seitenverhältnis aus dem Testbild.
 */
async function bildkasten(page: Page) {
  const c = await page.locator('canvas').boundingBox()
  if (!c) throw new Error('kein Canvas')
  const b = Math.min(c.width * RAND, c.height * RAND * SV)
  const h = b / SV
  return { c, b, h, x0: c.x + c.width / 2 - b / 2, y0: c.y + c.height / 2 - h / 2 }
}

/**
 * Setzt die Marke an einer Bildstelle und bestaetigt sie.
 *
 * Zwei Anlaeufe, und das hat einen Grund: Die Marke verfaellt nach fuenf
 * Sekunden von selbst, wie im Panorama-Viewer. Bei acht gleichzeitigen
 * Browsern liegt zwischen Klick und Bestaetigen gelegentlich mehr Zeit, und
 * dann ist der Knopf weg. Der erste Lauf dieser Datei war gruen, der zweite
 * rot — an einem anderen Test. Ein Waechter, der so flackert, ist keiner.
 */
async function klickenUndBestaetigen(page: Page, ax: number, ay: number): Promise<void> {
  const { b, h, x0, y0 } = await bildkasten(page)
  const knopf = page.getByRole('button', { name: /Bestätigen/ })
  for (let versuch = 0; versuch < 3; versuch++) {
    await page.mouse.click(x0 + ax * b, y0 + ay * h)
    try {
      await knopf.click({ timeout: 3000 })
      return
    } catch {
      // Marke verfallen. Noch einmal setzen.
    }
  }
  throw new Error('Marke liess sich dreimal nicht bestaetigen')
}

test.beforeEach(async ({ page }) => {
  await disableAnimations(page)
  await installSupabaseStub(page)
  await seedBildserie(page, TESTBILD)
})

test('der Canvas hat die Grösse des Fensters, nicht 150 Bildpunkte', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  const c = await page.locator('canvas').boundingBox()
  expect(c).not.toBeNull()
  // 150 ist der Rückfallwert von React Three Fiber und der Fehler, den diese
  // Prüfung fangen soll. Deshalb steht die Zahl hier ausdrücklich.
  expect(c!.height).not.toBe(150)
  expect(c!.height).toBeGreaterThan(600)
  expect(c!.width).toBeGreaterThan(1200)
})

test('der Canvas folgt einer anderen Fenstergrösse', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 620 })
  await bisZurBildwand(page)
  const c = await page.locator('canvas').boundingBox()
  expect(c!.height).toBeGreaterThan(450)
  expect(c!.height).toBeLessThanOrEqual(620)
})

test('die Phasenleiste nennt beide Zeitangaben und kennzeichnet den Vergleich', async ({ page }) => {
  await bisZurBildwand(page)
  await expect(page.getByText('12. Mai 2022')).toBeVisible()
  await expect(page.getByText('13. September 2017')).toBeVisible()
  // Ohne Rücksicht auf die Schreibung: die Grossschreibung kommt aus dem
  // Stilblatt, und innerText liefert den dargestellten Text.
  await expect(page.getByText(/nur vergleich/i)).toBeVisible()
  await expect(page.getByText(/Bild 1 von 1/)).toBeVisible()
})

test('ein Klick setzt erst eine Marke, die Bewertung kommt nicht von selbst', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  const { b, h, x0, y0 } = await bildkasten(page)

  await page.mouse.click(x0 + BILDSERIE_VERORTUNG.x * b, y0 + BILDSERIE_VERORTUNG.y * h)

  // Die Marke steht, und die Bewertung ist noch nicht da. Genau das war der
  // Fehler der ersten Fassung: ein Klick fuehrte unmittelbar hinein, und wer
  // genug klickte, traf.
  await expect(page.getByRole('button', { name: /Bestätigen/ })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Art des Befundes')).toHaveCount(0)
})

test('das Abbrechen verwirft die Marke, ohne etwas zu finden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  const { b, h, x0, y0 } = await bildkasten(page)

  await page.mouse.click(x0 + BILDSERIE_VERORTUNG.x * b, y0 + BILDSERIE_VERORTUNG.y * h)
  await expect(page.getByRole('button', { name: /Bestätigen/ })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /Abbrechen/ }).click()

  await expect(page.getByRole('button', { name: /Bestätigen/ })).toHaveCount(0)
  await expect(page.getByText('Art des Befundes')).toHaveCount(0)
})

test('erst das Bestaetigen startet den Ablauf der Konvention', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  await klickenUndBestaetigen(page, BILDSERIE_VERORTUNG.x, BILDSERIE_VERORTUNG.y)

  await expect(page.getByText('Art des Befundes')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Schritt 1 von 2/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sicherheitsdefizit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Gestaltungsbefund', exact: true })).toBeVisible()
  // Kein Schritt des Neunschrittpfades.
  await expect(page.getByText(/Wichtigkeit/)).toHaveCount(0)
  await expect(page.getByText(/NACA/)).toHaveCount(0)
})

test('ein Klick daneben startet nichts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  const { b, h, x0, y0 } = await bildkasten(page)

  // Gegenüberliegende Ecke, weit ausserhalb des Radius von 0,10.
  await page.mouse.click(x0 + 0.85 * b, y0 + 0.8 * h)
  await page.getByRole('button', { name: /Bestätigen/ }).click()

  // Zuerst die Rueckmeldung: sie verschwindet nach zwei Sekunden von selbst,
  // und ein festes Warten davor laesst den Test unter Last flackern. Genau das
  // ist beim ersten Lauf passiert — einzeln gruen, zu acht rot.
  await expect(page.getByText(/Kein Sicherheitsdefizit an dieser Stelle/)).toBeVisible()
  await expect(page.getByText('Art des Befundes')).toHaveCount(0)
})

test('an der gespiegelten Stelle liegt nichts', async ({ page }) => {
  // 0,25 senkrecht gespiegelt ist 0,75. Wäre die Achsenkippung vergessen,
  // träfe dieser Klick das Defizit und der obige nicht.
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  const { b, h, x0, y0 } = await bildkasten(page)

  await page.mouse.click(x0 + BILDSERIE_VERORTUNG.x * b, y0 + (1 - BILDSERIE_VERORTUNG.y) * h)
  await page.getByRole('button', { name: /Bestätigen/ }).click()
  await page.waitForTimeout(1200)
  await expect(page.getByText('Art des Befundes')).toHaveCount(0)
})

test('der Trefferradius bleibt ein Kreis, auch auf einem breiten Bild', async ({ page }) => {
  // Der Radius ist 0,10 Bildbreiten. Bei 16:9 sind das 0,178 Bildhöhen. Ein
  // Klick 0,14 Bildhöhen unter der Verortung liegt also drin — aber nur, wenn
  // die Trefferprüfung das Seitenverhältnis berücksichtigt. Rechnet sie in
  // rohen Anteilen, sind 0,14 mehr als 0,10 und der Klick geht daneben.
  //
  // Ohne diesen Fall meldet die Browserprüfung eine fehlende Division nicht;
  // ein Klick genau auf die Verortung trifft ja in beiden Fassungen.
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  const { b, h, x0, y0 } = await bildkasten(page)

  await klickenUndBestaetigen(page, BILDSERIE_VERORTUNG.x, BILDSERIE_VERORTUNG.y + 0.14)
  await expect(page.getByText('Art des Befundes')).toBeVisible({ timeout: 10_000 })
})

test('der ganze Ablauf läuft durch und zeigt zwei getrennte Teilscores', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await bisZurBildwand(page)
  await klickenUndBestaetigen(page, BILDSERIE_VERORTUNG.x, BILDSERIE_VERORTUNG.y)

  await expect(page.getByText('Art des Befundes')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Sicherheitsdefizit', exact: true }).click()
  await page.getByRole('button', { name: 'Gross', exact: true }).click()
  await page.getByRole('button', { name: /Auswerten/ }).click()

  // Beide Teilscores stehen nebeneinander. Beides richtig heisst 60 von 60 und
  // 40 von 40; eine Summe von 100 darf nirgends stehen.
  await expect(page.getByText(/60 von 60/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/40 von 40/)).toBeVisible()
  await expect(page.getByText(/Musterlösung/).first()).toBeVisible()
})

test('in der Vergleichsphase ist nichts zu finden', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await bisZurBildwand(page)
  // Auf die unbewertete Phase wechseln: dasselbe Bild, dieselbe Stelle.
  await page.getByRole('tab', { name: /Frueher/ }).click()
  await page.waitForTimeout(2500)
  const { b, h, x0, y0 } = await bildkasten(page)

  await page.mouse.click(x0 + BILDSERIE_VERORTUNG.x * b, y0 + BILDSERIE_VERORTUNG.y * h)
  await page.waitForTimeout(1200)
  // In einer unbewerteten Phase entsteht nicht einmal eine Marke.
  await expect(page.getByRole('button', { name: /Bestätigen/ })).toHaveCount(0)
  await expect(page.getByText('Art des Befundes')).toHaveCount(0)
})

// ── Hinweise und Zaehler (v0.20.1) ────────────────────────────────────────

test('ohne Hinweis steht keine Zahl am Bildwahlknopf', async ({ page }) => {
  await bisZurBildwand(page)
  // Der Knopf traegt seine Nummer und sonst nichts. «Bild 1 von 1» ist dabei
  // seine gewoehnliche Beschriftung und kein Hinweis — geprueft wird, dass die
  // Zahl der Befunde fehlt.
  await expect(page.getByRole('button', { name: /Bild 1 von 1/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Befunden offen/ })).toHaveCount(0)
  await expect(page.getByText(/Bilderhinweis aktiv/)).toHaveCount(0)
})

test('der Bilderhinweis kostet und nennt seinen Preis vorher', async ({ page }) => {
  await bisZurBildwand(page)
  await page.getByRole('button', { name: /Bilder mit Befunden/ }).click()
  // Die Rueckfrage nennt den Abzug, bevor irgendetwas geschieht.
  await expect(page.getByText(/10 Punkte abgezogen/)).toBeVisible()
  await page.getByRole('button', { name: /Trotzdem einblenden/ }).click()
  // Jetzt steht die Zahl am Knopf, und der Hinweis ist als aktiv gekennzeichnet.
  await expect(page.getByText(/Bilderhinweis aktiv/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Befunden offen/ })).toBeVisible()
})

test('das Abbrechen der Rueckfrage aktiviert den Hinweis nicht', async ({ page }) => {
  await bisZurBildwand(page)
  await page.getByRole('button', { name: /Bilder mit Befunden/ }).click()
  await expect(page.getByText(/10 Punkte abgezogen/)).toBeVisible()
  await page.getByRole('button', { name: /Abbrechen/ }).click()
  await expect(page.getByText(/Bilderhinweis aktiv/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Bilder mit Befunden/ })).toBeVisible()
})

test('der Markenhinweis nennt den hoeheren Abzug', async ({ page }) => {
  await bisZurBildwand(page)
  await page.getByRole('button', { name: /Marken einblenden/ }).click()
  await expect(page.getByText(/25 Punkte abgezogen/)).toBeVisible()
})

test('in der Vergleichsphase gibt es keine Hinweisknoepfe', async ({ page }) => {
  await bisZurBildwand(page)
  await page.getByRole('tab', { name: /Frueher/ }).click()
  await page.waitForTimeout(1500)
  await expect(page.getByRole('button', { name: /Bilder mit Befunden/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Marken einblenden/ })).toHaveCount(0)
})
