// keine-affiliation.test.ts — Wächter gegen Behördenbezüge
//
// Das RSI VR Tool ist ein privates Projekt von Stevan Skeledzic. Es darf
// nirgends als Erzeugnis der Fachstelle Verkehrssicherheit, des Tiefbauamts
// oder des Kantons Zürich auftreten — weder als Absender, noch über
// Kontaktangaben, Organisationszeilen, Signete oder Design-Tokens.
//
// Zwei Dinge sind ausdrücklich erlaubt und stehen unten in der Liste
// ERLAUBTE_QUELLENANGABEN:
//   Die fachliche Quelle darf genannt bleiben. Der TBA-Fachkurs FK RSI ist
//   die Herkunft der Wichtigkeits-Tabelle und der beiden Bewertungsmatrizen;
//   eine Quelle, die man nicht identifizieren kann, ist keine Quelle. Weg
//   muss die Behörde als Absender, nicht als belegte Fundstelle.
//
// Geprüft wird der Quellbaum UND das gebaute dist/. Der Quellbaum allein
// genügt nicht: Ein Bezug kann über Build-Konfiguration, Manifest oder
// kopierte public/-Dateien im Erzeugnis landen, ohne im src/ zu stehen.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const WURZEL = process.cwd()
const DIST = join(WURZEL, 'dist')

/** Wörtlich erlaubte Quellenangaben — vor der Prüfung aus dem Text entfernt. */
const ERLAUBTE_QUELLENANGABEN = [
  'TBA-Fachkurs FK RSI',
  'Cours TBA FK RSI',
  'Corso TBA FK RSI',
  'TBA course FK RSI',
  '<tr><td>TBA</td><td>Tiefbauamt</td><td>Herausgeber des Fachkurses FK RSI (Quellenangabe)</td></tr>',
]

/** Muster, die auf eine Zugehörigkeit oder einen amtlichen Absender deuten. */
const VERBOTEN: ReadonlyArray<{ name: string; muster: RegExp }> = [
  { name: 'Fachstelle Verkehrssicherheit', muster: /Fachstelle\s+Verkehrssicherheit/i },
  { name: 'Kürzel FaSi',                   muster: /\bFaSi\b/ },
  { name: 'Kanton Zürich',                 muster: /Kantons?\s+Zürich/i },
  { name: 'Canton de Zurich',              muster: /Canton\s+de\s+Zurich/i },
  { name: 'Cantone Zurigo',                muster: /Cantone\s+(?:di\s+)?Zurigo/i },
  { name: 'Canton of Zurich',              muster: /Canton\s+of\s+Zurich/i },
  { name: 'Baudirektion',                  muster: /Baudirektion/i },
  { name: 'Tiefbauamt',                    muster: /Tiefbauamt/i },
  { name: 'Kürzel KZH / KTZH',             muster: /\b(?:KZH|KTZH)\b/ },
  { name: 'Domain zh.ch',                  muster: /\bzh\.ch\b/i },
  { name: 'Dienstadresse Walcheplatz',     muster: /Walcheplatz/i },
  { name: 'Dienst-Telefonnummer',          muster: /\+41\s*43\s*259/ },
  { name: 'kantonaler Datenschutz',        muster: /\bdatenschutz\.ch\b/i },
  { name: 'Amtsbezeichnung fr',            muster: /Service\s+de\s+la\s+sécurité\s+routière|Office\s+des\s+ponts\s+et\s+chaussées/i },
  { name: 'Amtsbezeichnung it',            muster: /Servizio\s+(?:della\s+)?sicurezza\s+stradale|Ufficio\s+del\s+genio\s+civile/i },
  { name: 'Amtsbezeichnung en',            muster: /Road\s+Safety\s+(?:Office|Unit)|Civil\s+Engineering\s+Office/i },
  { name: 'Design-Token --zh-',            muster: /--zh-/ },
  { name: 'ISSI-Ausbildungslogo',          muster: /issi-logo|IssiLogo/i },
]

const TEXT_ENDUNGEN = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.json',
  '.webmanifest', '.txt', '.svg',
])

function dateienSammeln(verzeichnis: string, aus: string[] = []): string[] {
  for (const eintrag of readdirSync(verzeichnis)) {
    if (eintrag === 'node_modules' || eintrag === '.git') continue
    const pfad = join(verzeichnis, eintrag)
    if (statSync(pfad).isDirectory()) dateienSammeln(pfad, aus)
    else if (TEXT_ENDUNGEN.has(extname(eintrag).toLowerCase())) aus.push(pfad)
  }
  return aus
}

/** Entfernt die erlaubten Quellenangaben, damit nur echte Befunde übrig bleiben. */
function ohneQuellenangaben(inhalt: string): string {
  let rest = inhalt
  for (const erlaubt of ERLAUBTE_QUELLENANGABEN) rest = rest.split(erlaubt).join('')
  return rest
}

/** Diese Datei selbst — sie führt die Muster im Klartext und träfe sonst sich selbst. */
const EIGENE_DATEI = 'keine-affiliation.test.ts'

function pruefe(dateien: string[]): string[] {
  const befunde: string[] = []
  for (const datei of dateien) {
    if (datei.endsWith(EIGENE_DATEI)) continue
    const zeilen = ohneQuellenangaben(readFileSync(datei, 'utf-8')).split('\n')
    zeilen.forEach((zeile, i) => {
      for (const { name, muster } of VERBOTEN) {
        const treffer = muster.exec(zeile)
        if (!treffer) continue
        // Kontext um die Fundstelle, nicht der Zeilenanfang: in einem
        // minifizierten Bündel ist eine Zeile die ganze Datei, und der
        // Zeilenanfang sagt über den Treffer nichts aus.
        const von = Math.max(0, treffer.index - 60)
        const bis = Math.min(zeile.length, treffer.index + treffer[0].length + 60)
        const kontext = (von > 0 ? '…' : '') + zeile.slice(von, bis).trim() + (bis < zeile.length ? '…' : '')
        const relativ = datei.slice(WURZEL.length + 1).replace(/\\/g, '/')
        befunde.push(`${relativ}:${i + 1}:${treffer.index} — ${name}: ${kontext}`)
      }
    })
  }
  return befunde
}

describe('Keine Behördenbezüge im Quellbaum', () => {
  const dateien = [
    ...dateienSammeln(join(WURZEL, 'src')),
    ...dateienSammeln(join(WURZEL, 'public')),
    join(WURZEL, 'index.html'),
    join(WURZEL, 'vite.config.ts'),
  ]

  it('findet Dateien zum Prüfen', () => {
    expect(dateien.length).toBeGreaterThan(50)
  })

  it('enthält keinen Absender- oder Zugehörigkeitsbezug', () => {
    const befunde = pruefe(dateien)
    expect(befunde, `Behördenbezug gefunden:\n${befunde.join('\n')}`).toEqual([])
  })

  it('erkennt einen eingebauten Fehler (Selbstprüfung des Wächters)', () => {
    // Ohne diesen Fall wäre nicht belegt, dass die Muster überhaupt greifen.
    const zeilen = ohneQuellenangaben('Herausgeber: Fachstelle Verkehrssicherheit, Tiefbauamt Kanton Zürich')
    const treffer = VERBOTEN.filter(({ muster }) => muster.test(zeilen))
    expect(treffer.map(t => t.name)).toEqual(
      expect.arrayContaining(['Fachstelle Verkehrssicherheit', 'Tiefbauamt', 'Kanton Zürich']),
    )
  })

  it('lässt die belegte Quellenangabe stehen', () => {
    expect(pruefe.length).toBeGreaterThan(0)
    const quelle = 'Quellen: TBA-Fachkurs FK RSI (V 16.09.2020), bfu-Bericht 73 (NACA)'
    const rest = ohneQuellenangaben(quelle)
    expect(VERBOTEN.filter(({ muster }) => muster.test(rest))).toEqual([])
  })
})

describe('Keine Behördenbezüge im Bauergebnis (dist/)', () => {
  const gebaut = existsSync(DIST)

  it('dist/ ist gebaut — sonst prüft nur der Quellbaum', () => {
    // Bewusst ein harter Hinweis statt eines stillen Skip: ein Wächter, der
    // ungeprüft grün meldet, ist schlimmer als keiner. Vor dem Ausliefern
    // «npm run build» ausführen.
    if (!gebaut) {
      console.warn('[keine-affiliation] dist/ fehlt — Bauergebnis NICHT geprüft.')
    }
    expect(true).toBe(true)
  })

  it.skipIf(!gebaut)('enthält keinen Absender- oder Zugehörigkeitsbezug', () => {
    const befunde = pruefe(dateienSammeln(DIST))
    expect(befunde, `Behördenbezug im Bauergebnis:\n${befunde.join('\n')}`).toEqual([])
  })
})
