// Bewertung eines Defizits — je Verfahren eine eigene Form
//
// Bis v0.19.3 trug ein Defizit genau eine Bewertung: die sechs Felder des
// Neunschrittpfades aus dem Fachkurs FK RSI. Ein Befund nach der Konvention
// der deutschen Unfallkommission hat davon kein einziges Feld. Er kennt zwei
// Schritte: die Art des Befundes, und — nur wenn es ein Sicherheitsdefizit
// ist — seine Einstufung.
//
// Die beiden Formen stehen deshalb als Union nebeneinander, nicht als ein
// Gebilde mit optionalen Feldern. Ein Feld, das für ein Verfahren nie einen
// Wert hat, ist eine Unwahrheit im Datenmodell, und sie würde über Bericht,
// PDF und Rangliste weiterwandern.
//
// ── Warum der Diskriminator bei der Schweizer Form optional ist ─────────────
//
// Die Bestandsdaten liegen im localStorage jedes Geräts und in Supabase als
// JSON. Sie tragen kein Feld `verfahren`, und sie dürfen nicht angefasst
// werden. Also ist das Feld bei `BewertungBfu` optional; die Leseregel in
// appData.ts setzt es, und geschrieben wird es erst beim nächsten regulären
// Speichern. Dasselbe Muster wie beim Land seit v0.16.0.
//
// Verengt wird deshalb immer über `istUko` oder `istBfu`, nie über einen
// Vergleich auf das Feld. Ein fehlendes Feld heisst Schweiz.

import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import type { NacaRaw } from './scoringEngine'
import { VERFAHREN_BFU_ID } from '../i18n/verfahren.bfu'

/**
 * Kennung des deutschen Verfahrens.
 *
 * Sie steht hier und nicht in `verfahren.ts`, weil das Datenmodell sie braucht
 * und die Registry auf das Datenmodell aufbaut, nicht umgekehrt.
 */
export const VERFAHREN_UKO_ID = 'de-uko-2' as const

/**
 * Ergebnis von Schritt 1 der Konvention: Ist der Befund ein Sicherheitsdefizit
 * oder nicht?
 *
 * Die Werte sind Datenschlüssel und werden niemals angezeigt. Die Bezeichnung
 * des zweiten Falls ist fachlich noch nicht endgültig; sie läuft ausschliesslich
 * über i18n, damit eine Umbenennung keine Datenwanderung auslöst. Deshalb heisst
 * der Schlüssel `gestaltung` und nicht wie die heutige Bezeichnung.
 */
export type UkoBefundart = 'sicherheitsdefizit' | 'gestaltung'

/** Bewertung nach dem Neunschrittpfad FK RSI (Schweiz). */
export interface BewertungBfu {
  /** Fehlt in Altdaten. Die Leseregel setzt sie. */
  verfahren?: typeof VERFAHREN_BFU_ID
  wichtigkeit:   RSIDimension
  abweichung:    RSIDimension
  relevanzSD:    ResultDimension
  naca:          NacaRaw
  unfallschwere: NACADimension
  unfallrisiko:  ResultDimension
}

/**
 * Bewertung nach der Konvention der Unfallkommission (Deutschland).
 *
 * Schritt 1 trägt die Art, Schritt 2 die Einstufung. Bei einem Befund der Art
 * `gestaltung` entfällt Schritt 2 und `schritt2` ist `null` — nicht undefiniert
 * und nicht ein Ersatzwert, damit «entfällt» von «noch nicht erfasst»
 * unterscheidbar bleibt.
 */
export interface BewertungUko {
  verfahren: typeof VERFAHREN_UKO_ID
  schritt1: UkoBefundart
  schritt2: RSIDimension | null
}

/** Bewertung eines Defizits, je nach Verfahren. */
export type Bewertung = BewertungBfu | BewertungUko

/** Trägt die Bewertung das deutsche Verfahren? */
export function istUko(b: Bewertung): b is BewertungUko {
  return (b as BewertungUko).verfahren === VERFAHREN_UKO_ID
}

/** Trägt die Bewertung den Schweizer Neunschrittpfad? Ohne Feld: ja. */
export function istBfu(b: Bewertung): b is BewertungBfu {
  return !istUko(b)
}

/**
 * Die Bewertung als Neunschritt-Bewertung, oder null.
 *
 * Für jede Stelle, die die sechs Felder braucht und mit «gibt es hier nicht»
 * umgehen kann: Matrixherleitung, Lernkarte, Befundbericht, Admin-Formular.
 */
export function alsBfu(b: Bewertung): BewertungBfu | null {
  return istBfu(b) ? b : null
}

/** Die Bewertung als Bewertung der Unfallkommission, oder null. */
export function alsUko(b: Bewertung): BewertungUko | null {
  return istUko(b) ? b : null
}

/**
 * Setzt den Diskriminator, wo er fehlt. Wird von der Leseregel in appData.ts
 * aufgerufen und verändert eine Bewertung, die ihn schon trägt, nicht.
 */
export function mitVerfahren(b: Bewertung): Bewertung {
  if (istUko(b)) return b
  if (b.verfahren === VERFAHREN_BFU_ID) return b
  return { ...b, verfahren: VERFAHREN_BFU_ID }
}

/**
 * Die Stufe, die eine Listenansicht als Marke zeigt.
 *
 * Beim Neunschrittpfad ist das die Wichtigkeit, bei der Konvention die
 * Einstufung aus Schritt 2. Ein Befund der Art `gestaltung` hat keine Stufe und
 * liefert `null` — die aufrufende Ansicht zeigt dann ihre eigene Marke für
 * «keine Einstufung», statt einen Ersatzwert vorzutäuschen.
 */
export function anzeigeStufe(b: Bewertung): RSIDimension | null {
  return istUko(b) ? b.schritt2 : b.wichtigkeit
}

/**
 * Das Unfallrisiko für eine Listenansicht, oder null.
 *
 * Nur der Neunschrittpfad kennt ein Unfallrisiko; es ist das Ergebnis seiner
 * zweiten Matrix. Die Konvention der Unfallkommission hat kein Gegenstück, und
 * eines zu erfinden wäre eine fachliche Aussage, die niemand getroffen hat.
 */
export function anzeigeRisiko(b: Bewertung): ResultDimension | null {
  return istUko(b) ? null : b.unfallrisiko
}

/**
 * Eine leere Bewertung für ein neues Defizit des jeweiligen Verfahrens.
 *
 * Die Vorgabewerte sind bewusst die mildesten: Ein neu angelegtes Defizit soll
 * nicht versehentlich als schwerwiegend in einen Kurs gelangen, wenn jemand das
 * Formular ohne Beurteilung speichert.
 */
export function leereBewertung(verfahren: typeof VERFAHREN_UKO_ID): BewertungUko
export function leereBewertung(verfahren?: typeof VERFAHREN_BFU_ID): BewertungBfu
export function leereBewertung(
  verfahren: typeof VERFAHREN_BFU_ID | typeof VERFAHREN_UKO_ID = VERFAHREN_BFU_ID,
): Bewertung {
  if (verfahren === VERFAHREN_UKO_ID) {
    return { verfahren: VERFAHREN_UKO_ID, schritt1: 'sicherheitsdefizit', schritt2: 'klein' }
  }
  return {
    verfahren:     VERFAHREN_BFU_ID,
    wichtigkeit:   'klein',
    abweichung:    'klein',
    relevanzSD:    'gering',
    naca:          0,
    unfallschwere: 'leicht',
    unfallrisiko:  'gering',
  }
}
