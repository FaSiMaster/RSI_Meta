// abkuerzungen.test.ts — Wächter über den Abkürzungsbestand
//
// Anlass: «ISSI» stand an fünf Stellen und war überall falsch aufgelöst — als
// «In-Service Safety Inspection» statt als «Infrastruktur-Sicherheitsinstrumente»
// (ASTRA-Forschungsbericht 1730 «Velo-Infrastruktur-Sicherheitsinstrumente
// VISSI», September 2022, S. 7). Die Abkürzung fehlte zudem in beiden
// Glossaren. Ein Fehler, den niemand sieht, weil niemand systematisch
// nachzählt.
//
// Massgebend ist die Tabelle in public/glossar.html. GLOSSAR.md leitet sich
// davon ab. Geprüft wird:
//
//   1. Beide Glossare führen dieselben Kürzel mit derselben Auflösung.
//      Die Kontextspalte darf abweichen — sie ist Erläuterung, nicht Definition.
//   2. Jede Abkürzung, die in einem Benutzertext vorkommt, ist definiert.
//   3. Eine Abkürzung wird nirgends anders aufgelöst als im Glossar.
//   4. Sprachlich: Die Kürzel bleiben über alle vier Sprachen gleich, und die
//      landessprachlichen Varianten der bfu erscheinen in der richtigen Sprache.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const WURZEL = process.cwd()
const lies = (p: string) => readFileSync(join(WURZEL, p), 'utf-8')

// ── Glossare einlesen ───────────────────────────────────────────────────────

/** Kürzel → Auflösung aus der Tabelle in public/glossar.html. */
function glossarHtml(): Map<string, string> {
  const html = lies('public/glossar.html')
  const tabelle = /<h2>Abkürzungen<\/h2>\s*<table>([\s\S]*?)<\/table>/.exec(html)
  if (!tabelle) throw new Error('public/glossar.html: Abkürzungstabelle nicht gefunden')
  const eintraege = new Map<string, string>()
  for (const m of tabelle[1].matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g)) {
    eintraege.set(m[1].trim(), m[2].trim())
  }
  return eintraege
}

/** Kürzel → Auflösung aus der Tabelle in GLOSSAR.md. */
function glossarMd(): Map<string, string> {
  const md = lies('GLOSSAR.md')
  const eintraege = new Map<string, string>()
  for (const m of md.matchAll(/^\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \|$/gm)) {
    eintraege.set(m[1].trim(), m[2].trim())
  }
  return eintraege
}

/** «io / ao» und «UI / UX» definieren je zwei Kürzel. */
function einzelkuerzel(kuerzel: Iterable<string>): Set<string> {
  const alle = new Set<string>()
  for (const k of kuerzel) for (const teil of k.split('/')) alle.add(teil.trim())
  return alle
}

// ── Benutzertexte einsammeln ────────────────────────────────────────────────

const SPRACHEN = ['de', 'fr', 'it', 'en'] as const

function i18nWerte(lang: string): Array<{ pfad: string; text: string }> {
  const daten = JSON.parse(lies(`src/i18n/${lang}.json`))
  const aus: Array<{ pfad: string; text: string }> = []
  const gehe = (o: unknown, pfad: string): void => {
    if (typeof o === 'string') aus.push({ pfad, text: o })
    else if (o && typeof o === 'object')
      for (const [k, v] of Object.entries(o)) gehe(v, pfad ? `${pfad}.${k}` : k)
  }
  gehe(daten, '')
  return aus
}

const RECHTSSEITEN = [
  'public/impressum.html',
  'public/datenschutz.html',
  'public/glossar.html',
  'public/nutzungsbedingungen.html',
]

function benutzertexte(): Array<{ quelle: string; text: string }> {
  return [
    ...SPRACHEN.flatMap(l =>
      i18nWerte(l)
        .filter(w => !STATUSLABEL.test(w.pfad))
        .map(w => ({ quelle: `src/i18n/${l}.json → ${w.pfad}`, text: w.text }))),
    ...RECHTSSEITEN.map(p => ({ quelle: p, text: lies(p) })),
  ]
}

/**
 * Wörter, die aussehen wie eine Abkürzung, aber keine sind: Sprachcodes,
 * Web-Technik, Einheiten, Länderkürzel und deutsche/englische Wörter in
 * Grossschreibung. Bewusst als Liste geführt und nicht über eine Heuristik
 * geraten — jeder Eintrag ist ein Entscheid, den man nachlesen kann.
 */
const KEINE_ABKUERZUNG = new Set([
  // Sprach- und Länderkürzel
  'CH', 'DE', 'FR', 'IT', 'EN', 'EU', 'EWR', 'USA', 'US',
  // Web- und Dateitechnik
  'HTML', 'DOCTYPE', 'CSS', 'URL', 'API', 'JSON', 'CSV', 'PDF', 'PNG', 'JPG',
  'WEBP', 'GLTF', 'HTTP', 'HTTPS', 'TLS', 'SSL', 'UTF', 'XR', 'DOM', 'SW',
  // Masse und Einheiten
  'MB', 'KB', 'GB', 'KM', 'MM', 'CM',
  // Vertragsrecht, im Text ausgeschrieben
  'SCC',
  // Grossgeschriebene Wörter aus Benutzertexten
  'NICHT', 'NOT', 'NON', 'PASSED', 'OK', 'DS', 'SF', 'AA', 'VR', 'AR', 'ID',
])

/**
 * Abkürzungskandidaten: zwei bis sechs Grossbuchstaben am Stück, begrenzt
 * durch echte Wortgrenzen. Bewusst nicht mit \b — JavaScript zählt
 * akzentuierte Buchstaben nicht zu den Wortzeichen, weshalb «RÉUSSI» den
 * Scheinbefund «USSI» lieferte.
 */
const KANDIDAT = /(?<![\p{L}\p{N}_])(\p{Lu}{2,6})(?![\p{L}\p{N}_])/gu

/**
 * Mehrteilige Kürzel («FK RSI», «SHA-256», «io / ao») werden vor der
 * Einzelwortsuche maskiert. Sonst meldet der Wächter ihre Bestandteile —
 * «FK», «SHA» — als undefiniert.
 */
function ohneMehrteilige(text: string, kuerzel: Iterable<string>): string {
  let rest = text
  const mehrteilig = [...kuerzel]
    .filter(k => /[ \-/]/.test(k))
    .sort((a, b) => b.length - a.length)
  for (const k of mehrteilig) {
    // Trennzeichen flexibel: «FK RSI» maskiert auch «FK-RSI» im Kurscode.
    const muster = k.split(/[ \-/]+/).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[ \\-/]+')
    rest = rest.replace(new RegExp(muster, 'g'), ' ')
  }
  return rest
}

/**
 * Schlüssel, deren Wert ein durchgehend grossgeschriebenes Statuslabel ist
 * («BESTANDEN», «NON RÉUSSI»). Über den Pfad ausgenommen statt über eine
 * Wortliste, damit die Ausnahme nicht mit jeder Sprache mitwächst.
 */
const STATUSLABEL = /^bericht\.(nicht_)?bestanden$/

// ── Prüfungen ───────────────────────────────────────────────────────────────

describe('Abkürzungen', () => {
  const html = glossarHtml()
  const md = glossarMd()

  it('beide Glossare sind nicht leer', () => {
    expect(html.size).toBeGreaterThan(20)
    expect(md.size).toBe(html.size)
  })

  it('beide Glossare führen dieselben Kürzel', () => {
    const nurHtml = [...html.keys()].filter(k => !md.has(k))
    const nurMd = [...md.keys()].filter(k => !html.has(k))
    expect({ nurHtml, nurMd }).toEqual({ nurHtml: [], nurMd: [] })
  })

  it('beide Glossare lösen jedes Kürzel gleich auf', () => {
    const abweichend = [...html.entries()]
      .filter(([k, a]) => md.has(k) && md.get(k) !== a)
      .map(([k, a]) => `${k}: html «${a}» ≠ md «${md.get(k)}»`)
    expect(abweichend).toEqual([])
  })

  it('jede in einem Benutzertext verwendete Abkürzung ist definiert', () => {
    const definiert = einzelkuerzel(html.keys())
    const offen = new Map<string, Set<string>>()
    for (const { quelle, text } of benutzertexte()) {
      for (const m of ohneMehrteilige(text, html.keys()).matchAll(KANDIDAT)) {
        const k = m[1]
        if (definiert.has(k) || KEINE_ABKUERZUNG.has(k)) continue
        if (!offen.has(k)) offen.set(k, new Set())
        offen.get(k)!.add(quelle.split(' → ')[0])
      }
    }
    const befunde = [...offen.entries()].map(([k, q]) => `${k} — verwendet in ${[...q].join(', ')}`)
    expect(befunde, `Nicht definierte Abkürzung:\n${befunde.join('\n')}`).toEqual([])
  })

  it('keine bekannte Falschauflösung kommt zurück', () => {
    // Ein Wächter kann eine unbekannte Falschauflösung nicht erkennen — dazu
    // müsste er wissen, was richtig ist. Was er kann: verhindern, dass eine
    // einmal gefundene wiederkehrt. Jeder Eintrag hier war ein echter Fehler.
    const FALSCH: ReadonlyArray<{ text: RegExp; statt: string; fund: string }> = [
      {
        text: /In-Service Safety Inspection/i,
        statt: 'ISSI heisst Infrastruktur-Sicherheitsinstrumente',
        fund: 'stand bis v0.13.0 an fünf Stellen; belegt im ASTRA-Forschungsbericht 1730 (September 2022), S. 7',
      },
      {
        text: /VSS 41 ?72[23]/,
        statt: 'SN 641 722 (Audit) bzw. SN 641 723 (Inspektion)',
        fund: 'diese VSS-Nummern gibt es nicht; im Normenkorpus nicht auffindbar',
      },
    ]
    const befunde: string[] = []
    for (const { quelle, text } of benutzertexte()) {
      for (const { text: muster, statt, fund } of FALSCH) {
        const m = muster.exec(text)
        if (m) befunde.push(`${quelle}: «${m[0]}» — richtig ist ${statt} (${fund})`)
      }
    }
    expect(befunde, `Bekannte Falschauflösung:\n${befunde.join('\n')}`).toEqual([])
  })

  it('die Auflösung wird überall gleich geschrieben wie im Glossar', () => {
    // Fängt Schreibvarianten derselben Auflösung: fehlender Bindestrich,
    // anderer Numerus, zusammengeschrieben. Geprüft wird nur, was auch im
    // Glossar steht — eine Auflösung, die dort fehlt, fällt im Test darüber auf.
    const varianten = (auflösung: string): RegExp | null => {
      if (!/[\s-]/.test(auflösung)) return null
      // Trennzeichen zwischen den Wörtern freigeben, alles andere wörtlich.
      const teile = auflösung.split(/[\s-]+/).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      return new RegExp(teile.join('[\\s-]*'), 'gi')
    }
    const befunde: string[] = []
    for (const { quelle, text } of benutzertexte()) {
      const roh = text.replace(/<[^>]+>/g, '')
      for (const [kuerzel, auflösung] of html) {
        const muster = varianten(auflösung)
        if (!muster) continue
        for (const m of roh.matchAll(muster)) {
          if (m[0] !== auflösung) {
            befunde.push(`${quelle}: «${m[0]}» statt «${auflösung}» (${kuerzel})`)
          }
        }
      }
    }
    expect(befunde, `Abweichende Schreibweise:\n${befunde.join('\n')}`).toEqual([])
  })

  it('erkennt den ISSI-Fehler von damals (Selbstprüfung des Wächters)', () => {
    // Ohne diesen Fall wäre nicht belegt, dass die Verbotsliste greift.
    const damals = 'Das Tool bildet die In-Service Safety Inspection (ISSI) digital ab.'
    expect(/In-Service Safety Inspection/i.test(damals)).toBe(true)
    expect(/In-Service Safety Inspection/i.test(html.get('ISSI')!)).toBe(false)
  })

  it('ISSI ist als Infrastruktur-Sicherheitsinstrumente definiert', () => {
    // Belegt: ASTRA-Forschungsbericht 1730, September 2022, S. 7.
    expect(html.get('ISSI')).toBe('Infrastruktur-Sicherheitsinstrumente')
  })

  it('die bfu erscheint je Sprache unter ihrem Landeskürzel', () => {
    // bfu (de) · bpa (fr) · upi (it). Ein französischer Text, der «bfu»
    // schreibt, ist nicht falsch übersetzt, sondern gar nicht übersetzt.
    const erwartet: Record<string, string> = { fr: 'bpa', it: 'upi' }
    // Quellenangaben ausgenommen: «bfu-Bericht 73» ist der Titel eines
    // Dokuments. Ob der bpa denselben Bericht unter eigenem Kürzel führt, ist
    // hier nicht belegt — und ein Titel wird nicht übersetzt, weil er
    // übersetzbar aussieht.
    const QUELLENANGABE = /quellen|sources|fonti|literatur/i
    const befunde: string[] = []
    for (const [lang, kuerzel] of Object.entries(erwartet)) {
      const treffer = i18nWerte(lang)
        .filter(w => !QUELLENANGABE.test(w.pfad))
        .filter(w => /(?<![\p{L}])bfu(?![\p{L}])/u.test(w.text))
      for (const t of treffer) {
        if (!new RegExp(`(?<![\\p{L}])${kuerzel}(?![\\p{L}])`, 'u').test(t.text)) {
          befunde.push(`src/i18n/${lang}.json → ${t.pfad}: nennt «bfu» ohne «${kuerzel}»`)
        }
      }
    }
    expect(befunde, `Landeskürzel der bfu:\n${befunde.join('\n')}`).toEqual([])
  })

  it('die Kürzel selbst sind über alle vier Sprachen gleich', () => {
    // RSI, ISSI, NACA und FK RSI werden nicht übersetzt. Wer sie in einer
    // Sprache anders schreibt, bricht die Wiedererkennung.
    const fest = ['RSI', 'ISSI', 'NACA']
    const befunde: string[] = []
    for (const kuerzel of fest) {
      const proSprache = SPRACHEN.map(l =>
        i18nWerte(l).filter(w => new RegExp(`\\b${kuerzel}\\b`).test(w.text)).length)
      if (proSprache.some(n => n === 0) && proSprache.some(n => n > 0)) {
        befunde.push(`${kuerzel}: vorhanden in ${SPRACHEN.filter((_, i) => proSprache[i] > 0).join('/')}, fehlt in ${SPRACHEN.filter((_, i) => proSprache[i] === 0).join('/')}`)
      }
    }
    expect(befunde, `Kürzel nicht in allen Sprachen:\n${befunde.join('\n')}`).toEqual([])
  })
})
