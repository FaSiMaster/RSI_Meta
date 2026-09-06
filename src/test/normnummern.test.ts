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
    // Schlüssel ist die Nummer ohne Leerzeichen und in Grossbuchstaben; der
    // erste Treffer gewinnt, und die Sortierung stellt den aktiven Eintrag
    // nach vorn.
    //
    // Die Grossschreibung fehlte und kostete einen Fehlbefund: Der Bestand
    // führt die Sichtweitennorm als «40090B», das Projekt schreibt sie
    // «VSS 40 090b». Der Wächter meldete sie als unauffindbar, obwohl sie
    // im Bestand liegt — eine Meldung, die stimmt hätte aussehen können.
    const nach = new Map<string, Bestandseintrag>()
    for (const z of zeilen) {
      const k = String(z.nummer).replace(/\s/g, '').toUpperCase()
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
  // Aus SN 641 700:2022, Anhang G, Ziff. 16, Tab. 2. Die Grundnorm führt
  // diese Normen als sicherheitsrelevant und nennt sie ohne Ausgabe; der
  // Korpus hält eine Ausgabe, die er als veraltet führt. Ob eine neuere
  // Ausgabe besteht, ist am Original zu prüfen — der Katalog behauptet
  // darüber nichts.
  'SN640060': 'Tab. 2, Velolängsführung — Ausgabe 2000',
  'SN640064': 'Tab. 2, Velolängsführung und Ausrüstung — Ausgabe 2009',
  'SN640070': 'Tab. 2, Fussgängerlängsführung — Ausgabe 2014',
  'SN640250': 'Tab. 2, Knotengeometrie — Ausgabe 1998',
  'SN640660': 'Tab. 2, Anhalte- und Knotensichtweite — Ausgabe 2004',
  'SN640852': 'Tab. 2, Markierung; auch in den Seed-Daten',
  'VSS40022': 'Tab. 2, Knotengeometrie — Ausgabe 2019',
  'VSS40050': 'Tab. 2, Knotengeometrie (Grundstückzufahrten) — Ausgabe 2019',
  'VSS40052': 'Tab. 2, Querprofil — Ausgabe 2019',
  'VSS40110': 'Tab. 2, vertikale Linienführung und Anhaltesichtweite — 2019',
  'VSS40120': 'Tab. 2, Querprofil — Ausgabe 2019',
  'VSS40202': 'Tab. 2, Querprofil — Ausgabe 2021',
  'VSS40212': 'Tab. 2, Verkehrsfluss und Gestaltungselemente — Ausgabe 2019',
  'VSS40214': 'Tab. 2, farbliche Gestaltung — Ausgabe 2019',
  'VSS40215': 'Tab. 2, Gestaltungselemente — Ausgabe 2019',
  'VSS40240': 'Tab. 2, Fussgängerquerungen — Ausgabe 2019',
  'VSS40241': 'Tab. 2, Fussgängerquerungen; Ausgabe 2019 gilt, fachlich bestätigt 23.08.2026',
  'VSS40242': 'Tab. 2, Fussgängerquerungen — Ausgabe 2022',
  'VSS40252': 'Tab. 2, Knoten und Veloführung — Ausgabe 1994',
  'VSS40261': 'Tab. 2, Knotengeometrie — Ausgabe 2020',
  'VSS40262': 'Tab. 2, Knotengeometrie — Ausgabe 2019',
  'VSS40263': 'Tab. 2, Knotengeometrie (Kreisverkehr) — Ausgabe 2019',
  'VSS40303': 'Tab. 2, Verkehrsfluss und Gestaltungselemente — Ausgabe 2013',
  'VSS40350': 'Tab. 2, Entwässerung — Ausgabe 2019',
  'VSS40356': 'Tab. 2, Entwässerung — Ausgabe 2019',
  'VSS40512': 'Tab. 2, Anforderungen an die Strassenoberfläche — Ausgabe 2019',
  'VSS71512': 'Tab. 2, Ausrüstung bei Bahnübergängen — ausser Kraft, Ausgabe 2013',
  // Stehen nur noch im Kopfkommentar des Katalogs, als Beispiel für die
  // Titel, die dort früher falsch zugeordnet waren.
  'VSS40281': 'Nur im Kopfkommentar des Katalogs; früher als «Knoten mit LSA» geführt, richtig ist Parkieren',
  'VSS40360': 'Nur im Kopfkommentar des Katalogs; früher als «Markierungen» geführt, richtig ist Strassenentwässerung',
  // Die beiden Verfahrensnormen. Das Gesamt-Normenverzeichnis VSS 41 001,
  // Ausgabe 2024-10, führt sie unter diesen Nummern; für «VSS 41 723» gibt es
  // keinen Beleg. Der Bestand markiert sie als veraltet, was hier nichts über
  // eine Umnummerierung sagt.
  'SN641722': 'VSS 41 001:2024-10 führt das Audit unter dieser Nummer; Ausgabe 2017 laut Bestand',
  'SN641723': 'VSS 41 001:2024-10 führt die Inspektion unter dieser Nummer; Ausgabe 2016 laut Bestand',
}

/**
 * Im Bestand nicht auffindbar — der Bestand ist unvollständig, nicht die
 * Norm falsch. Alle Nummern stehen in SN 641 700:2022, Tab. 2.
 */
const BEKANNT_FEHLEND: Record<string, string> = {
  // Steht nur noch in zwei Kommentaren, als Schreibweise ohne Beleg: Das
  // Gesamt-Normenverzeichnis VSS 41 001:2024-10 kennt sie nicht, der
  // Normenbestand auch nicht.
  'VSS41723': 'Nur in Kommentaren, als nicht belegte Schreibweise benannt',
  'VSS40023': 'Tab. 2, Knotengeometrie — im Korpus nicht erfasst',
  'VSS40024': 'Tab. 2, Knotengeometrie — im Korpus nicht erfasst',
  'VSS40040': 'Tab. 2, Knotengeometrie — im Korpus nicht erfasst',
  'VSS40080': 'Tab. 2, Geschwindigkeit — im Korpus nicht erfasst',
  'VSS40090': 'Schreibweise der Tab. 2 ohne Ausgabesuffix; im Korpus liegt VSS 40 090b:2019',
  'VSS40100': 'Tab. 2, horizontale Linienführung — im Korpus nicht erfasst',
  'VSS40198': 'Tab. 2, horizontale Linienführung — im Korpus nicht erfasst',
  'VSS40200': 'Tab. 2, Querprofil — im Korpus nicht erfasst',
  'VSS40247': 'Tab. 2, Fussgängerquerungen — im Korpus nicht erfasst',
  'VSS40271': 'Tab. 2, Befahrbarkeit — im Korpus nicht erfasst',
  'VSS40693': 'Tab. 2, Wildzäune — im Korpus nicht erfasst',
  'VSS40845': 'Tab. 2, Signalisation — im Korpus nicht erfasst',
  'VSS40854': 'Tab. 2, Markierung — im Korpus nicht erfasst',
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
      const e = bestand!.get(k.replace(/^(VSS|SN|SNR)/, '').toUpperCase())
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
      if (bestand!.has(k.replace(/^(VSS|SN|SNR)/, '').toUpperCase())) continue
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

  it('die Ausnahmelisten führen nichts Unbenutztes', () => {
    // Der Kopf der bisherigen Prüfung sagte, eine nicht mehr gebrauchte
    // Ausnahme verdecke künftige Befunde — geprüft wurde aber nur, ob die
    // Nummer im Bestand noch veraltet ist, nicht, ob das Projekt sie
    // überhaupt noch nennt. Diese Prüfung schliesst die Lücke.
    const verwendet = new Set(
      [...verwendeteNummern().keys()].map(n => n.replace(/\s/g, '')),
    )
    const unbenutzt = [...Object.keys(BEKANNT), ...Object.keys(BEKANNT_FEHLEND)]
      .filter(k => !verwendet.has(k))
    expect(
      unbenutzt,
      'Ausnahme ohne Fundstelle im Projekt: ' + unbenutzt.join(', '),
    ).toEqual([])
  })

  it.skipIf(!bestand)('die Ausnahmelisten enthalten nichts Erledigtes', () => {
    // Eine Ausnahme, die nicht mehr gebraucht wird, verdeckt künftige Befunde.
    const ueberfluessig: string[] = []
    for (const k of Object.keys(BEKANNT)) {
      const e = bestand!.get(k.replace(/^(VSS|SN|SNR)/, '').toUpperCase())
      if (!e || (e.gueltigkeit !== 'veraltet' && e.gueltigkeit !== 'ausser_kraft')) {
        ueberfluessig.push(`BEKANNT: ${k} ist im Bestand nicht (mehr) veraltet`)
      }
    }
    for (const k of Object.keys(BEKANNT_FEHLEND)) {
      if (bestand!.has(k.replace(/^(VSS|SN|SNR)/, '').toUpperCase())) {
        ueberfluessig.push(`BEKANNT_FEHLEND: ${k} liegt inzwischen im Bestand`)
      }
    }
    expect(ueberfluessig, `Ausnahme nicht mehr nötig:\n${ueberfluessig.join('\n')}`).toEqual([])
  })
})
