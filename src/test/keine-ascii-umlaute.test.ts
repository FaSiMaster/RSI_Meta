// keine-ascii-umlaute.test.ts — Wächter gegen «waehlen», «loeschen», «fuer».
//
// Schweizer Hochdeutsch schreibt ä, ö, ü. Nur das ß fehlt, dafür steht ss.
// In der Oberfläche standen trotzdem «Anderes Bild waehlen», «Aus Bucket
// loeschen» und «Der Kurs ist aktuell NUR auf diesem Geraet verfuegbar» —
// gefunden hat sie nicht eine Prüfung, sondern der Benutzer am Bildschirm.
//
// Geprüft werden sichtbare Texte, nicht der ganze Quellbaum:
//   • Zeichenketten mit einem Leerzeichen darin (also Sätze, keine Namen)
//   • Text zwischen zwei Markierungen (JSX-Textknoten)
//
// Der Text eines Knopfes steht im Quelltext fast immer auf einer eigenen
// Zeile, zwischen der öffnenden und der schliessenden Markierung. Eine
// zeilenweise Suche findet ihn deshalb nicht — die erste Fassung dieses
// Wächters blieb grün, als «Anderes Bild waehlen» absichtlich wieder
// eingesetzt wurde, weil sie nur ihre eigene einzeilige Probe traf. Gesucht
// wird darum über die ganze Datei.
//
// Ausgenommen bleiben ASCII-Bezeichner, denn die sind Konvention:
// CSS-Eigenschaften wie --rsi-gruen, i18n-Schlüssel wie admin.gueltig_von,
// Variablennamen wie bildHoehe innerhalb von ${…}.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Wortstämme, die in der Oberfläche einen Umlaut tragen müssen.
const STAEMME = [
  'fuer', 'ueber', 'waehl', 'loesch', 'pruef', 'gehoer', 'ueblich', 'zurueck',
  'groess', 'aendern', 'verfueg', 'gueltig', 'moegl', 'noetig', 'koenn',
  'muess', 'naechst', 'zusaetz', 'waehr', 'spaet', 'traeg', 'enthaelt',
  'laesst', 'faellt', 'haelt', 'staerk', 'schwaech', 'urspruen', 'erklaer',
  'ausfuehr', 'durchfuehr', 'einfuehr', 'auswaehl', 'erhoeh', 'oeffn',
  'schoen', 'foerder', 'stoer', 'verstoess', 'fuenf', 'wuensch',
  'unterstuetz', 'beruecksicht', 'laeuft', 'raeum', 'aufwaerts', 'bestaetig',
  'gekuerzt', 'gefuellt', 'hoeher', 'kuenftig', 'taeglich', 'jaehrl',
  'gemaess', 'zaehl', 'erhaelt', 'behaelt', 'anhaeng', 'abhaeng', 'zugehoer',
  'unguelt', 'ungefaehr', 'aehnlich', 'flaeche', 'zustaend', 'vollstaend',
  'bestaend', 'verstaend', 'auftraeg', 'geraet', 'erlaeuter', 'ueberschreib',
  'ueberpruef', 'maessig', 'gaeng', 'laeng', 'laend', 'waesser', 'rueck',
  'fuehr', 'schraenk', 'geringfueg', 'toedlich', 'stationaer', 'aeltere',
  'oeffent', 'gefaell', 'aendlich', 'abwaerts', 'vertraeg',
]
const MUSTER = new RegExp(STAEMME.join('|'), 'i')

// Diese Dateien tragen normativen Text und dürfen nur mit ausdrücklicher
// Freigabe geändert werden (siehe CLAUDE.md, Sacred Files).
// scoringEngine.ts stand hier bis zum 7. September 2026; die Schreibweise
// ist seither mit Freigabe berichtigt, die Datei wird also mitgeprüft.
const AUSGENOMMEN = [
  'i18n/verfahren.bfu.ts',
  // Diese Datei selbst: sie führt die eingebauten Fehler als Probe.
  'test/keine-ascii-umlaute.test.ts',
]

function alleQuelldateien(wurzel: string): string[] {
  const aus: string[] = []
  for (const eintrag of readdirSync(wurzel)) {
    const pfad = join(wurzel, eintrag)
    if (statSync(pfad).isDirectory()) {
      aus.push(...alleQuelldateien(pfad))
    } else if (/\.(ts|tsx)$/.test(eintrag)) {
      aus.push(pfad)
    }
  }
  return aus
}

export interface Fund {
  zeile: number
  wort: string
  text: string
}

/** Kommentare durch Leerzeichen ersetzen, Zeilenumbrüche behalten. */
function ohneKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, vor) => vor + ' '.repeat(m.length - vor.length))
}

function zeileVon(quelle: string, offset: number): number {
  let n = 1
  for (let i = 0; i < offset && i < quelle.length; i++) {
    if (quelle[i] === '\n') n++
  }
  return n
}

/**
 * Sieht der Kandidat nach Code aus statt nach Text? Zwischen zwei spitzen
 * Klammern steht in TypeScript oft ein Typparameter und danach Code
 * (`useState<Foo>(bar) ... <Baz>`), nicht der Text eines Knopfes.
 */
function nachCode(text: string): boolean {
  if (/[={};]/.test(text)) return true
  if (/\b(const|let|return|function|import|export|select|from|where)\b/.test(text)) return true
  return false
}

/** Sichtbare Texte einer ganzen Datei, mit Zeilennummer. */
export function sichtbareTexte(quelle: string): { text: string; offset: number }[] {
  const rein = ohneKommentare(quelle)
  const aus: { text: string; offset: number }[] = []

  // Zeichenketten mit Leerzeichen — einzeilig, wie im Quelltext üblich.
  // Mehrzeilige Zeichenketten tragen meist SQL oder Auszeichnungssprache.
  const zeichenketten = rein.matchAll(/'([^'\\\n]{4,})'|"([^"\n\\]{4,})"|`([^`\\\n]{4,})`/g)
  for (const m of zeichenketten) {
    const wert = m[1] ?? m[2] ?? m[3] ?? ''
    // Ein Satz, oder ein einzelnes Wort in der Form eines Anzeigetextes:
    // grossgeschrieben, ohne Unterstrich und ohne Binnengrossbuchstaben.
    // Genau so stehen die Bezeichnungen der Sicherheitskriterien da
    // («Fussgängerstreifen»), und genau die fielen sonst durch.
    const einWort = !wert.includes(' ')
    if (einWort && !/^[A-ZÄÖÜ][a-zäöüß]+$/.test(wert.trim())) continue
    if (wert.trim().startsWith('--')) continue // CSS-Eigenschaft
    // Ein durchgehend kleingeschriebener Wert ist ein Schlüssel, kein
    // Anzeigetext: die Suchmuster in topicIcons («fuehrung», «gefaelle») und
    // die Themenwörter in regelwerkKatalog («horizontale linienfuehrung»)
    // müssen ASCII bleiben, sonst greifen sie auf ASCII-Daten nicht mehr.
    if (!/[A-ZÄÖÜ]/.test(wert)) continue
    const text = wert.replace(/^\s*\[[^\]]*\]\s*/, '').replace(/\$\{[^}]*\}/g, ' ')
    if (nachCode(text)) continue
    aus.push({ text, offset: m.index ?? 0 })
  }

  // JSX-Textknoten, einzeilig: >Text<
  for (const m of rein.matchAll(/>([^<>{}\r\n]{4,})</g)) {
    const wert = m[1].trim()
    if (wert.length < 4 || nachCode(wert)) continue
    aus.push({ text: wert, offset: m.index ?? 0 })
  }

  // JSX-Textknoten, mehrzeilig: die Markierung endet die Zeile, der Text
  // steht auf eigenen Zeilen. Genau diese Form hat die erste Fassung dieses
  // Wächters übersehen — und die zweite scheiterte am Zeilenende: Die
  // Dateien dieses Projekts enden mit CRLF, das Muster erwartete LF. Ein
  // Wächter, der auf dem Betriebssystem seines Projekts nicht greift,
  // meldet nichts und sieht trotzdem grün aus.
  for (const m of rein.matchAll(/>[ \t]*\r?\n([^<>{}]{4,}?)\r?\n[ \t]*</g)) {
    const wert = m[1].trim()
    if (wert.length < 4 || nachCode(wert)) continue
    const vorlauf = m[0].indexOf('\n')
    aus.push({ text: wert, offset: (m.index ?? 0) + vorlauf + 1 })
  }

  return aus
}

export function pruefeQuelle(quelle: string): Fund[] {
  const funde: Fund[] = []
  for (const { text, offset } of sichtbareTexte(quelle)) {
    const treffer = text.match(MUSTER)
    if (treffer) {
      funde.push({
        zeile: zeileVon(quelle, offset),
        wort: treffer[0],
        text: text.replace(/\s+/g, ' ').trim().slice(0, 70),
      })
    }
  }
  return funde
}

describe('Sichtbare Texte tragen echte Umlaute', () => {
  const dateien = alleQuelldateien('src')
    .filter(p => !AUSGENOMMEN.some(a => p.replace(/\\/g, '/').includes(a)))

  it('findet keine ASCII-Ersatzschreibung in der Oberfläche', () => {
    const befunde: string[] = []
    for (const pfad of dateien) {
      for (const f of pruefeQuelle(readFileSync(pfad, 'utf-8'))) {
        befunde.push(`${pfad}:${f.zeile} «${f.wort}» in: ${f.text}`)
      }
    }
    expect(befunde, `ASCII-Ersatzschreibungen gefunden:\n${befunde.join('\n')}`).toEqual([])
  })

  it('meldet einen mehrzeiligen Knopftext — genau die Form, die er zuerst übersah', () => {
    const probe = [
      '<button',
      '  onClick={handle}',
      '  style={btnSekundaerStyle}',
      '>',
      '  Anderes Bild waehlen',
      '</button>',
    ].join('\n')
    const funde = pruefeQuelle(probe)
    expect(funde).toHaveLength(1)
    expect(funde[0].wort.toLowerCase()).toBe('waehl')
    expect(funde[0].zeile).toBe(5)
  })

  it('meldet eine Zeichenkette und lässt Bezeichner in Ruhe', () => {
    const probe = [
      `const meldung = 'Bild konnte nicht geladen werden. URL pruefen.'`,
      `const ok = 'alles in Ordnung'`,
      `const farbe = '--rsi-gruen 20%'`,
      'const groesse = `${bildHoehe} Pixel`',
      `const schluessel = t('admin.gueltig_von')`,
    ].join('\n')
    const funde = pruefeQuelle(probe)
    expect(funde.map(f => f.wort.toLowerCase())).toEqual(['pruef'])
  })

  it('übergeht Kommentare — dort steht die Begründung, nicht die Oberfläche', () => {
    const probe = '// hier wird das Bild geprueft und ausgewaehlt\nconst x = 1'
    expect(pruefeQuelle(probe)).toEqual([])
  })
})
