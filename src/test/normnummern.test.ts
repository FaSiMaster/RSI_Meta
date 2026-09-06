// normnummern.test.ts — Wächter über die Normnummern
//
// Anlass: 29 der 31 Defizite in der produktiven Datenbank verwiesen auf
// SN 641 723 — eine Nummer, die im Normenbestand seit dem 15. Juni 2026 als
// «veraltet» geführt wird. Gemerkt hat es niemand, weil niemand nachgeschaut
// hat.
//
// Was dieser Wächter kann: melden, wenn eine im Projekt verwendete Normnummer
// im Bestand als veraltet oder ausser Kraft geführt wird oder dort gar nicht
// vorkommt.
//
// Was er NICHT kann: beurteilen, ob eine Nummer den gemeinten Gegenstand
// trifft. Der Katalog führt «VSS 40 241 — Fussgaengerstreifen», der Bestand
// «Querungen für den Fussgänger- und leichten Zweiradverkehr» — dieselbe Sache
// unter zwei Titeln, ohne ein gemeinsames Wort. Für diese Zuordnung gibt es
// kein maschinelles Kriterium; sie ist fachlich. Siehe
// docs/NORMREFERENZEN_PRUEFUNG.md.
//
// Grundlage ist die Tracking-Datenbank des Projekts vss_Normen. Sie liegt
// ausserhalb dieses Repositoriums. Fehlt sie, überspringt sich der Test —
// aber sichtbar, mit Hinweis. Ein Wächter, der still grün meldet, ist
// schlimmer als keiner.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const WURZEL = process.cwd()
const lies = (p: string) => readFileSync(join(WURZEL, p), 'utf-8')

/** Pfad zur Tracking-Datenbank; über VSS_NORMEN_DB überschreibbar. */
const DB_PFAD =
  process.env.VSS_NORMEN_DB ??
  resolve(WURZEL, '..', 'vss_Normen', 'backend', 'data', 'normen_tracking.sqlite')

// ── Normnummern im Projekt einsammeln ───────────────────────────────────────

const QUELLEN = [
  'src/data/regelwerkKatalog.ts',
  'src/data/appData.ts',
  'src/components/admin/utils/adminHelpers.ts',
  'e2e/fixtures/seed.ts',
]

/**
 * «VSS 41 723», «SN 640 075», «VSS 40 263a» — Organisation plus Nummer.
 * Mindestens fünf Ziffern: «VSS 41 xxx» in einem Fliesstext hat zwei und ist
 * keine Normnummer. Ohne diese Schranke meldete der Wächter «VSS 41».
 */
const NORMNUMMER = /\b(VSS|SN|SNR)\s+(\d[\d ]*\d[a-zA-Z]?)/g
const MIND_ZIFFERN = 5

function verwendeteNummern(): Map<string, Set<string>> {
  const gefunden = new Map<string, Set<string>>()
  for (const datei of QUELLEN) {
    for (const m of lies(datei).matchAll(NORMNUMMER)) {
      if (m[2].replace(/\D/g, '').length < MIND_ZIFFERN) continue
      // «VSS SN 640 075»: das führende VSS ist ein Tippfehler, die Regex
      // greift dann auf «SN 640 075». Beides landet hier als Fundstelle.
      const schluessel = `${m[1]} ${m[2].trim()}`
      if (!gefunden.has(schluessel)) gefunden.set(schluessel, new Set())
      gefunden.get(schluessel)!.add(datei)
    }
  }
  return gefunden
}

// ── Bestand befragen ────────────────────────────────────────────────────────

interface Bestandseintrag {
  org: string
  nummer: string
  jahr: string | null
  titel: string | null
  gueltigkeit: string | null
}

function bestandLesen(): Map<string, Bestandseintrag> | null {
  if (!existsSync(DB_PFAD)) return null
  const db = new DatabaseSync(DB_PFAD, { readOnly: true })
  try {
    const zeilen = db
      .prepare(
        `select org, nummer, jahr, titel, gueltigkeit from norms
         order by case gueltigkeit when 'aktiv' then 0 else 1 end, jahr desc`,
      )
      .all() as unknown as Bestandseintrag[]
    // Schlüssel ist die Nummer ohne Leerzeichen; der erste Treffer gewinnt,
    // und die Sortierung stellt den aktiven Eintrag nach vorn.
    const nach = new Map<string, Bestandseintrag>()
    for (const z of zeilen) {
      const k = String(z.nummer).replace(/\s/g, '')
      if (!nach.has(k)) nach.set(k, z)
    }
    return nach
  } finally {
    db.close()
  }
}

/**
 * Stand vom 6. September 2026, mit Begründung. Der Bestand meldet diese
 * Nummern als veraltet oder ausser Kraft; sie bleiben vorerst bewusst stehen.
 * Jede NEUE Meldung lässt den Test anschlagen — das ist sein Zweck.
 */
const BEKANNT: Record<string, string> = {
  'VSS40241': 'Von der Fachstelle als zutreffend bestätigt (06.09.2026); Nachfolgeausgabe zu klären',
  'VSS40050': 'Titel weicht ab, fachlich offen — siehe docs/NORMREFERENZEN_PRUEFUNG.md 2.2',
  'VSS40202': 'Titel weicht ab, fachlich offen — 2.2',
  'VSS40212': 'Titel weicht ab, fachlich offen — 2.2',
  'VSS40263': 'Titel weicht ab, fachlich offen — 2.2',
  'VSS40281': 'Titel weicht ab, fachlich offen — 2.2',
  'VSS40360': 'Titel weicht ab, fachlich offen — 2.2',
  'SN640886': 'Titel weicht ab, ausser Kraft, fachlich offen — 2.2',
  'SN641723': 'Frühere Nummer der Inspektion; steht nur noch als Fundstelle «SN 641 723:2016 Abb. 2»',
  'SN641722': 'Frühere Nummer des Audits; steht nur im Kommentar als Vorgängernennung',
  'SN640852': 'Seed-Daten, im Bestand veraltet (Taktil-visuelle Markierungen) — zu ersetzen',
  'VSS41002': 'Themenverzeichnis, im Bestand ausser Kraft — im Kopfkommentar des Katalogs als Quelle genannt',
}

/** Im Bestand nicht auffindbar — der Bestand ist unvollständig, nicht die Norm falsch. */
const BEKANNT_FEHLEND: Record<string, string> = {
  'VSS41722': 'Nachfolger von SN 641 722; im Korpus nicht erfasst, Nachbezug offen',
  'VSS41723': 'Nachfolger von SN 641 723; im Korpus nicht erfasst, Nachbezug offen',
  'VSS40040': 'im Korpus nicht erfasst — 2.4',
  'VSS40080': 'im Korpus nicht erfasst — 2.4',
  'VSS40211': 'im Korpus nicht erfasst — 2.4',
  'VSS40263a': 'im Korpus nicht erfasst — 2.4',
  'VSS40290': 'im Korpus nicht erfasst — 2.4',
  'VSS40390': 'im Korpus nicht erfasst — 2.4',
  'VSS40869': 'im Korpus nicht erfasst — 2.4',
}

// ── Prüfungen ───────────────────────────────────────────────────────────────

const bestand = bestandLesen()

describe('Normnummern gegen den Normenbestand', () => {
  it('meldet, ob die Tracking-Datenbank erreichbar war', () => {
    if (!bestand) {
      console.warn(
        `[normnummern] Bestand NICHT geprüft — ${DB_PFAD} fehlt.\n` +
        '  Der Pfad lässt sich über die Umgebungsvariable VSS_NORMEN_DB setzen.',
      )
    } else {
      console.info(`[normnummern] Bestand geprüft: ${bestand.size} Normnummern.`)
    }
    expect(true).toBe(true)
  })

  it('findet Normnummern in den Projektdateien', () => {
    expect(verwendeteNummern().size).toBeGreaterThan(15)
  })

  it.skipIf(!bestand)('keine neue veraltete oder ausser Kraft gesetzte Norm', () => {
    const befunde: string[] = []
    for (const [nummer, dateien] of verwendeteNummern()) {
      const k = nummer.replace(/\s/g, '')
      const e = bestand!.get(k.replace(/^(VSS|SN|SNR)/, ''))
      if (!e) continue
      const g = e.gueltigkeit
      if (g !== 'veraltet' && g !== 'ausser_kraft') continue
      if (BEKANNT[k]) continue
      befunde.push(
        `${nummer} ist «${g}» (${e.org} ${e.nummer}:${e.jahr ?? '—'}` +
        `${e.titel ? `, ${e.titel.replace(/\s+/g, ' ').trim().slice(0, 50)}` : ''}) ` +
        `— verwendet in ${[...dateien].join(', ')}`,
      )
    }
    expect(befunde, `Neue veraltete Normnummer:\n${befunde.join('\n')}`).toEqual([])
  })

  it.skipIf(!bestand)('keine neue im Bestand unauffindbare Nummer', () => {
    const befunde: string[] = []
    for (const [nummer, dateien] of verwendeteNummern()) {
      const k = nummer.replace(/\s/g, '')
      if (bestand!.has(k.replace(/^(VSS|SN|SNR)/, ''))) continue
      if (BEKANNT_FEHLEND[k]) continue
      befunde.push(`${nummer} — im Bestand nicht auffindbar, verwendet in ${[...dateien].join(', ')}`)
    }
    expect(befunde, `Neue unauffindbare Normnummer:\n${befunde.join('\n')}`).toEqual([])
  })

  it.skipIf(!bestand)('erkennt eine veraltete Norm (Selbstprüfung des Wächters)', () => {
    // SN 641 723:2016 ist der belegte Fall, an dem der Wächter entstanden ist.
    const e = bestand!.get('641723')
    expect(e, 'SN 641 723 muss im Bestand liegen').toBeDefined()
    expect(e!.gueltigkeit).toBe('veraltet')
  })

  it.skipIf(!bestand)('die Ausnahmelisten enthalten nichts Erledigtes', () => {
    // Eine Ausnahme, die nicht mehr gebraucht wird, verdeckt künftige Befunde.
    const ueberfluessig: string[] = []
    for (const k of Object.keys(BEKANNT)) {
      const e = bestand!.get(k.replace(/^(VSS|SN|SNR)/, ''))
      if (!e || (e.gueltigkeit !== 'veraltet' && e.gueltigkeit !== 'ausser_kraft')) {
        ueberfluessig.push(`BEKANNT: ${k} ist im Bestand nicht (mehr) veraltet`)
      }
    }
    for (const k of Object.keys(BEKANNT_FEHLEND)) {
      if (bestand!.has(k.replace(/^(VSS|SN|SNR)/, ''))) {
        ueberfluessig.push(`BEKANNT_FEHLEND: ${k} liegt inzwischen im Bestand`)
      }
    }
    expect(ueberfluessig, `Ausnahme nicht mehr nötig:\n${ueberfluessig.join('\n')}`).toEqual([])
  })
})
