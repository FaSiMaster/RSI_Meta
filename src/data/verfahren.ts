// Welches Beurteilungsverfahren gilt in welchem Land
//
// Die Zuordnung ist absichtlich klein und an einer Stelle. Heute trägt genau
// ein Land ein Verfahren: die Schweiz, mit dem Neunschrittpfad des Fachkurses
// FK RSI. Für jedes andere Land gibt es keines – und das ist kein Mangel,
// sondern der Zustand, den die Anwendung ehrlich anzeigen muss.
//
// Was hier NICHT steht: die Wörter des Verfahrens (die stehen in
// src/i18n/verfahren.bfu.ts) und seine Regeln (die stehen in
// src/data/scoringEngine.ts). Diese Datei sagt nur, welches Verfahren
// zuständig ist.
//
// Ein zweites Land kommt später über einen zweiten Eintrag hinzu. Bis dahin
// gilt: kein Verfahren heisst kein Ablauf, keine Punkte, kein Ersatz.

import { LAND_VORGABE, type LandCode } from './laender'
import { VERFAHREN_BFU_ID } from '../i18n/verfahren.bfu'

/** Kennung eines Beurteilungsverfahrens. */
export type VerfahrensId = typeof VERFAHREN_BFU_ID

/**
 * Land → Verfahren. Ein Land ohne Eintrag hat kein Verfahren.
 * Der i18next-Namensraum `verfahren` trägt heute die Bezeichnungen des
 * einzigen Eintrags; kommt ein zweites Verfahren dazu, wählt die Weiche auch
 * den Namensraum.
 */
export const VERFAHREN_JE_LAND: Readonly<Partial<Record<LandCode, VerfahrensId>>> = {
  CH: VERFAHREN_BFU_ID,
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
