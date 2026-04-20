// Regelwerk-Katalog (RSI-relevante VSS- und SN-Normen) — Referenz-Liste
// Stand 2024-10. Quellen: VSS 41 001 (Gesamt-Normenverzeichnis nach Nummern),
// VSS 41 002 (nach Themen), bfu-Werkzeugkasten.
//
// Hinweis: Diese Datei enthaelt keine normative Logik (keine Punkte, Matrizen
// oder Bewertungen) — sie ist eine reine Referenz-/Suchhilfe fuer das
// Norm-Refs-Suchfeld im Defizit-Editor (D-8). Bei Aenderungen genuegt
// fachliche Plausibilitaetspruefung, keine Fachkurs-Verifikation noetig.
//
// Erweitern bei Bedarf. Format identisch zu den im Defizit-Editor
// gespeicherten string-Eintraegen ("VSS 40 263 — Strassengeometrie ...").

export interface RegelwerkEintrag {
  nummer: string  // z.B. "VSS 40 263" oder "SN 641 723"
  titel:  string  // Kurztitel
  themen: string[]  // Schluesselwoerter fuer Suche
}

export const REGELWERK_KATALOG: RegelwerkEintrag[] = [
  // ── Kern-Normen RSI / ISSI ─────────────────────────────────────
  { nummer: 'SN 641 723',  titel: 'In-Service Safety Inspection (ISSI) / Road Safety Inspection (RSI) — Verfahren',
    themen: ['rsi', 'issi', 'inspektion', 'sicherheit', 'verfahren'] },
  { nummer: 'VSS 41 722',  titel: 'Strassenverkehrsunfaelle — Erfassung, Aufbereitung, Auswertung',
    themen: ['unfall', 'erfassung', 'auswertung', 'naca'] },
  { nummer: 'VSS 41 723',  titel: 'Sicherheitsbeurteilung von Verkehrsanlagen',
    themen: ['beurteilung', 'sicherheit', 'verkehrsanlage'] },

  // ── Querschnitt / Geometrie ────────────────────────────────────
  { nummer: 'VSS 40 040',  titel: 'Projektierung — Grundlagen',
    themen: ['projektierung', 'grundlagen', 'geometrie'] },
  { nummer: 'VSS 40 050',  titel: 'Strassenraum — Grundabmessungen',
    themen: ['strassenraum', 'querschnitt', 'abmessungen'] },
  { nummer: 'VSS 40 080',  titel: 'Linienfuehrung — Bemessungsgrundlagen',
    themen: ['linienfuehrung', 'kurv', 'trassierung', 'bemessung'] },
  { nummer: 'VSS 40 138',  titel: 'Geometrisches Normalprofil',
    themen: ['normalprofil', 'querschnitt', 'fahrbahn'] },
  { nummer: 'VSS 40 263',  titel: 'Strassengeometrie — Querschnitt von Hauptverkehrsstrassen',
    themen: ['querschnitt', 'hauptstrasse', 'geometrie'] },
  { nummer: 'VSS 40 273',  titel: 'Knoten — Grundlagen',
    themen: ['knoten', 'kreuzung', 'grundlagen'] },
  { nummer: 'VSS 40 281',  titel: 'Knoten mit Lichtsignalanlagen',
    themen: ['knoten', 'lichtsignal', 'lsa', 'ampel'] },
  { nummer: 'VSS 40 290',  titel: 'Kreisel — Geometrie und Verkehrsablauf',
    themen: ['kreisel', 'rotonda', 'kreisverkehr'] },

  // ── Sichtweiten ────────────────────────────────────────────────
  { nummer: 'VSS 40 263a', titel: 'Sichtweiten — Anhalte-, Ueberhol- und Knotensichtweite',
    themen: ['sicht', 'sichtweite', 'anhalte', 'ueberhol'] },
  { nummer: 'SN 640 080',  titel: 'Sichtfreiheit auf Hochleistungsstrassen',
    themen: ['sicht', 'autobahn', 'hls'] },

  // ── Fussverkehr ────────────────────────────────────────────────
  { nummer: 'VSS 40 201',  titel: 'Fussverkehr — Grundnorm',
    themen: ['fuss', 'fussgang', 'gehweg', 'pieton'] },
  { nummer: 'VSS 40 202',  titel: 'Fussverkehr — Gehwegbreite und Querungen',
    themen: ['fuss', 'gehweg', 'breite', 'querung'] },
  { nummer: 'VSS 40 241',  titel: 'Fussgaengerstreifen',
    themen: ['fussgaengerstreifen', 'zebrastreifen', 'querung'] },
  { nummer: 'SN 640 075',  titel: 'Hindernisfreier Verkehrsraum',
    themen: ['hindernisfrei', 'barrierefrei', 'gehweg'] },

  // ── Veloverkehr ────────────────────────────────────────────────
  { nummer: 'VSS 40 211',  titel: 'Veloverkehr — Grundnorm',
    themen: ['velo', 'rad', 'fahrrad'] },
  { nummer: 'VSS 40 212',  titel: 'Veloverkehr — Radwege und Radstreifen',
    themen: ['velo', 'radweg', 'radstreifen'] },
  { nummer: 'VSS 40 213',  titel: 'Veloverkehr — Fuehrung an Knoten',
    themen: ['velo', 'knoten', 'kreuzung'] },

  // ── Signalisation und Markierung ───────────────────────────────
  { nummer: 'SSV',         titel: 'Signalisationsverordnung — Bund (SR 741.21)',
    themen: ['signalisation', 'verordnung', 'ssv'] },
  { nummer: 'VSS 40 360',  titel: 'Verkehrsfuehrung in Knoten — Markierungen',
    themen: ['markierung', 'knoten', 'verkehrsfuehrung'] },
  { nummer: 'VSS 40 372',  titel: 'Wegweisung — Grundnorm',
    themen: ['wegweisung', 'beschilderung'] },

  // ── Strassenausstattung / Strassenrand ─────────────────────────
  { nummer: 'VSS 40 380',  titel: 'Passive Sicherheit — Anpralldaempfer und Schutzplanken',
    themen: ['passive sicherheit', 'leitplanke', 'schutzplanke', 'anprall'] },
  { nummer: 'VSS 40 384',  titel: 'Strassenausruestung — Leiteinrichtungen',
    themen: ['leiteinrichtung', 'leitpfosten', 'strassenrand'] },
  { nummer: 'VSS 40 390',  titel: 'Strassenbeleuchtung',
    themen: ['beleuchtung', 'lampe', 'lichtsignal'] },

  // ── Baustellen / Temporaere Verkehrsfuehrung ───────────────────
  { nummer: 'VSS 40 869',  titel: 'Baustellen — Verkehrsfuehrung und Signalisation',
    themen: ['baustelle', 'temporaer', 'signalisation'] },
  { nummer: 'SN 640 886',  titel: 'Sicherheit in Strassentunneln — Baustellen',
    themen: ['baustelle', 'tunnel'] },

  // ── Strassenzustand ────────────────────────────────────────────
  { nummer: 'SN 640 521',  titel: 'Strassenzustand — Erfassung und Beurteilung',
    themen: ['zustand', 'beurteilung', 'erfassung'] },
  { nummer: 'SN 640 312',  titel: 'Griffigkeit von Fahrbahnoberflaechen',
    themen: ['griffigkeit', 'fahrbahn', 'belag'] },

  // ── bfu-Werkzeugkasten (referenziell) ──────────────────────────
  { nummer: 'bfu R 9928',  titel: 'Werkzeugkasten Road Safety Inspection',
    themen: ['bfu', 'werkzeugkasten', 'rsi'] },
  { nummer: 'bfu Bericht 73', titel: 'NACA-Skala — Verletzungsschwere',
    themen: ['bfu', 'naca', 'unfall', 'schwere'] },
]

// Suche durch Nummer + Titel + Themen-Schluesselwoerter (case-insensitive,
// Umlaute reduziert).
export function searchRegelwerk(query: string, limit = 12): RegelwerkEintrag[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const norm = (s: string) => s.toLowerCase()
    .replace(/[äàáâ]/g, 'a').replace(/[öòóô]/g, 'o').replace(/[üùúû]/g, 'u')
    .replace(/[éèê]/g, 'e').replace(/ß/g, 'ss')
  const qn = norm(q)

  const scored: { item: RegelwerkEintrag; score: number }[] = []
  for (const n of REGELWERK_KATALOG) {
    let score = 0
    if (norm(n.nummer).includes(qn)) score += 10
    if (norm(n.titel).includes(qn)) score += 5
    for (const t of n.themen) {
      if (norm(t).includes(qn)) score += 2
    }
    if (score > 0) scored.push({ item: n, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.item)
}

// String → fuer Speicherung/Anzeige formatieren
export function formatRegelwerkString(n: RegelwerkEintrag): string {
  return `${n.nummer} — ${n.titel}`
}
