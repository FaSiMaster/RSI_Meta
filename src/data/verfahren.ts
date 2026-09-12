// Welches Beurteilungsverfahren gilt in welchem Land
//
// Die Zuordnung ist absichtlich klein und an einer Stelle. Zwei Länder tragen
// ein Verfahren: die Schweiz den Neunschrittpfad des Fachkurses FK RSI,
// Deutschland die Konvention der Unfallkommission. Für jedes andere Land gibt
// es keines – und das ist kein Mangel, sondern der Zustand, den die Anwendung
// ehrlich anzeigen muss.
//
// Was hier NICHT steht: die Wörter eines Verfahrens (die stehen in
// src/i18n/verfahren.bfu.ts und src/i18n/verfahren.uko.ts) und seine Regeln
// (die stehen in src/data/scoringEngine.ts und src/data/punkteUko.ts). Diese
// Datei sagt nur, welches Verfahren zuständig ist.
//
// Ein weiteres Land kommt über einen weiteren Eintrag hinzu. Für alle ohne
// Eintrag gilt: kein Verfahren heisst kein Ablauf, keine Punkte, kein Ersatz.

import { LAND_VORGABE, type LandCode } from './laender'
import { VERFAHREN_BFU_ID } from '../i18n/verfahren.bfu'
import { VERFAHREN_UKO_ID } from './bewertung'

/** Kennung eines Beurteilungsverfahrens. */
export type VerfahrensId = typeof VERFAHREN_BFU_ID | typeof VERFAHREN_UKO_ID

/**
 * Land → Verfahren. Ein Land ohne Eintrag hat kein Verfahren.
 *
 * Seit v0.20.0 zwei Einträge. Deutschland trägt die Konvention der
 * Unfallkommission: zwei Schritte, keine Normquelle, eigene Punkte. Sie ist
 * kein Ersatz und keine Variante des Neunschrittpfades, sondern ein eigenes
 * Verfahren neben ihm.
 */
export const VERFAHREN_JE_LAND: Readonly<Partial<Record<LandCode, VerfahrensId>>> = {
  CH: VERFAHREN_BFU_ID,
  DE: VERFAHREN_UKO_ID,
}

/**
 * Der i18next-Namensraum, der die Wörter eines Verfahrens trägt.
 *
 * Die Bedienung steht im Namensraum `translation` und bleibt dieselbe; nur die
 * Wörter des Verfahrens wechseln mit dem Land.
 */
export function namensraumFuer(verfahren: VerfahrensId): 'verfahren' | 'verfahrenUko' {
  return verfahren === VERFAHREN_UKO_ID ? 'verfahrenUko' : 'verfahren'
}

/** Ob für ein Land der Schweizer Neunschrittpfad gilt. */
export function istNeunschritt(land: string | undefined | null): boolean {
  return verfahrenFuerLand(land) === VERFAHREN_BFU_ID
}

/** Ob für ein Land die Konvention der Unfallkommission gilt. */
export function istUkoLand(land: string | undefined | null): boolean {
  return verfahrenFuerLand(land) === VERFAHREN_UKO_ID
}

/** Das Verfahren eines Landes, oder null. */
export function verfahrenFuerLand(land: string | undefined | null): VerfahrensId | null {
  if (!land) return VERFAHREN_JE_LAND[LAND_VORGABE] ?? null
  return VERFAHREN_JE_LAND[land as LandCode] ?? null
}

/** Ob für ein Land ein Verfahren hinterlegt ist. */
export function hatVerfahren(land: string | undefined | null): boolean {
  return verfahrenFuerLand(land) !== null
}

/** Alle Länder mit Verfahren. Für Hinweise und Prüfungen. */
export function laenderMitVerfahren(): LandCode[] {
  return Object.keys(VERFAHREN_JE_LAND) as LandCode[]
}
