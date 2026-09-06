// Liest die Einfuhrdatei über die Oberfläche ein, gesteuert statt von Hand.
//
// Der Weg ist derselbe wie beim Einlesen im Browser: Anmeldung mit der PIN,
// Administrationsbereich, Dateifeld. Damit läuft die Einfuhr durch dieselbe
// Prüfung (`validateImport`), dieselbe Landesgrenze und dieselben
// save-Funktionen wie sonst. Ein Skript, das unmittelbar auf die Edge Function
// schriebe, umginge alle drei.
//
// Voraussetzungen:
//   1. `npm run build` — die Vorschau liefert das gebaute Bündel aus, und nur
//      das trägt die Zugangsdaten aus .env.local.
//   2. `npm run preview -- --port 4173` in einem zweiten Fenster.
//      Der Port ist nicht beliebig: Die Edge Functions erlauben als Herkunft
//      nur https://rsi-meta.vercel.app, localhost:5173 und localhost:4173.
//      Auf einem anderen Port scheitert schon die Anmeldung, und zwar an
//      CORS, nicht an der PIN.
//   3. Die Admin-PIN in der Umgebung, damit sie in keiner Datei steht.
//
// Aufruf:
//   RSI_ADMIN_PIN=… node daten/einlesen.mjs
//
// Das Skript schreibt in den localStorage des gesteuerten Browsers und über
// die Edge Function nach Supabase. Nur das Zweite bleibt; jedes andere Gerät
// holt den Stand beim nächsten Laden von dort.

import { chromium } from 'playwright'

const PIN = process.env.RSI_ADMIN_PIN
const DATEI = process.env.RSI_DATEI
  ?? new URL('./rsi-import_2026-09-06.json', import.meta.url).pathname.slice(1)
const ADRESSE = process.env.RSI_URL ?? 'http://localhost:4173'

if (!PIN) {
  console.error('RSI_ADMIN_PIN fehlt. Aufruf: RSI_ADMIN_PIN=… node daten/einlesen.mjs')
  process.exit(1)
}

const browser = await chromium.launch()
const kontext = await browser.newContext({
  locale: 'de-CH',
  timezoneId: 'Europe/Zurich',
  // Der Service Worker liefert sonst ein älteres Bündel aus.
  serviceWorkers: 'block',
})
const seite = await kontext.newPage()

const netzfehler = []
seite.on('response', r => {
  if (r.url().includes('/functions/v1/') && !r.ok()) {
    netzfehler.push(`${r.status()} ${r.url().split('/functions/v1/')[1]}`)
  }
})
seite.on('console', m => {
  if (m.type() === 'error') console.log('  [Browser]', m.text().slice(0, 160))
})

let fehlgeschlagen = false
try {
  await seite.goto(ADRESSE, { waitUntil: 'networkidle' })
  console.log('Startseite geladen')

  await seite.getByRole('button', { name: /Admin/ }).click()
  await seite.getByRole('textbox').last().fill(PIN)
  await seite.getByRole('button', { name: /Anmelden|Bestätigen|OK|Weiter/ })
    .last().click()
  await seite.getByRole('button', { name: /Importieren/ }).waitFor({ timeout: 15000 })
  console.log('Im Administrationsbereich')

  // Das Dateifeld ist versteckt; sonst löst es der Knopf aus.
  await seite.locator('input[type="file"]').setInputFiles(DATEI)
  const meldung = seite.getByText(/Import erfolgreich|Validierung fehlgeschlagen/)
  await meldung.waitFor({ timeout: 30000 })
  const text = (await meldung.textContent())?.trim() ?? ''
  console.log('Meldung:', text)
  if (!text.startsWith('Import erfolgreich')) fehlgeschlagen = true

  // Die save-Funktionen schreiben asynchron nach Supabase. Das Ende der
  // Meldung ist nicht das Ende der Schreibvorgänge.
  await seite.waitForTimeout(20000)
  console.log('Fehler an Edge Functions:', netzfehler.length || 'keine')
  for (const f of netzfehler) console.log('  ', f)
  if (netzfehler.length) fehlgeschlagen = true
} finally {
  await browser.close()
}

console.log(
  '\nGezählt wird das Ergebnis, nicht die Meldung: Stand in Supabase über die\n'
  + 'REST-Schnittstelle mit dem anon-Schlüssel nachzählen.',
)
process.exit(fehlgeschlagen ? 1 : 0)
