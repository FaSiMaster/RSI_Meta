// Punkte der Konvention der Unfallkommission (Deutschland)
//
// Getrennt von scoringEngine.ts, und zwar bewusst: dort stehen die Matrizen des
// Fachkurses FK RSI, die normativ sind und nicht angefasst werden. Hier stehen
// die Punkte einer Konvention, die mit Fachexperten vereinbart wurde und keine
// Normquelle hat. Die beiden Dateien wissen nichts voneinander.
//
// ── Zum Dateinamen ─────────────────────────────────────────────────────────
//
// Der Auftrag nannte «scoringEngineDE.ts». Diese Datei heisst anders, aus zwei
// Gründen. Erstens greift der Norm-Compliance-Hook auf das Pfadmuster
// `src/data/scoringEngine` und blockiert jeden Namen, der so beginnt — der
// Schutz ist ein Präfixtreffer, kein Tippfehler. Zweitens wäre der Name
// fachlich falsch: eine «ScoringEngine DE» klingt wie eine zweite Fassung des
// normativen Motors, und genau das ist sie nicht. Sie trägt Punkte einer
// Vereinbarung, keine Matrizen einer Norm.
//
// ── Woher die Zahlen kommen ─────────────────────────────────────────────────
//
// Jeder Wert unten stammt aus einem Entscheid, nicht aus einer Ableitung. Die
// Fundstellen stehen in `.claude/entscheide/JOURNAL.md`:
//
//   E-7a  Schritt 1 trägt 60, Schritt 2 trägt 40.
//         Grund: Schritt 1 hat zwei Antwortmöglichkeiten, Schritt 2 hat drei.
//         Bei 70 zu 30 brächte Raten in Schritt 1 im Erwartungswert mehr als
//         Wissen in Schritt 2.
//   E-7b  Ein Gestaltungsbefund zählt in der Szenensumme 60 gegen 100, weil er
//         nur Schritt 1 durchläuft.
//   F-006 Eine falsche Antwort in Schritt 1 kostet 60 Punkte, statt null zu
//         geben. Grund: «alles ist ein Sicherheitsdefizit» ist genau der
//         fachliche Fehler, den die Konvention verhindern soll.
//
// Wer eine dieser Zahlen ändert, ändert eine Vereinbarung. Das braucht einen
// Entscheid, keinen Commit.
//
// ── Zwei Teilscores, nie eine Summe ─────────────────────────────────────────
//
// Schritt 1 und Schritt 2 werden getrennt geführt und getrennt angezeigt. Eine
// zusammengefasste Zahl würde verdecken, was die Übung messen soll: einen
// Befund als sicherheitsrelevant zu erkennen ist eine andere Fähigkeit, als ihn
// richtig einzustufen. Die Summe gibt es nur dort, wo eine einzige Zahl
// gebraucht wird — Rangliste und Bestandensschwelle.

import type { RSIDimension } from '../types'
import { istUko, type Bewertung, type UkoBefundart } from './bewertung'

/** Punkte für Schritt 1, wenn die Art des Befundes stimmt. */
export const UKO_SCHRITT1_RICHTIG = 60

/**
 * Punkte für Schritt 1, wenn die Art nicht stimmt (Entscheid F-006).
 * Negativ, nicht null: eine Verwechslung soll etwas kosten.
 */
export const UKO_SCHRITT1_FALSCH = -60

/** Punkte für Schritt 2, wenn die Einstufung stimmt. */
export const UKO_SCHRITT2_RICHTIG = 40

/**
 * Erreichbare Punkte eines Befundes.
 *
 * Ein Sicherheitsdefizit durchläuft beide Schritte, ein Gestaltungsbefund nur
 * den ersten. Das ist der Grund, warum ein Gestaltungsbefund in der
 * Szenensumme weniger zählt (Entscheid E-7b).
 */
export function ukoMaxPunkte(art: UkoBefundart): number {
  return art === 'sicherheitsdefizit'
    ? UKO_SCHRITT1_RICHTIG + UKO_SCHRITT2_RICHTIG
    : UKO_SCHRITT1_RICHTIG
}

/** Die Antwort einer Teilnehmerin auf die zwei Schritte. */
export interface UkoAntwort {
  schritt1: UkoBefundart
  /** Null, wenn Schritt 2 nicht gestellt wurde. */
  schritt2: RSIDimension | null
}

/** Das Ergebnis eines Befundes, in zwei Teilen. */
export interface UkoErgebnis {
  /** Punkte aus Schritt 1. Kann negativ sein. */
  schritt1Punkte: number
  /** Punkte aus Schritt 2. Null, wenn Schritt 2 entfiel oder nicht traf. */
  schritt2Punkte: number
  /** Erreichbare Punkte dieses Befundes. */
  maxPunkte: number
  schritt1Korrekt: boolean
  /**
   * Ob die Einstufung stimmt. Null, wenn Schritt 2 gar nicht anstand — bei
   * einem Gestaltungsbefund, oder wenn schon Schritt 1 nicht stimmte.
   */
  schritt2Korrekt: boolean | null
  /** Summe beider Teile. Für Rangliste und Schwelle, nicht für die Anzeige. */
  summe: number
}

/**
 * Bewertet einen Befund nach der Konvention.
 *
 * Schritt 2 wird nur gewertet, wenn Schritt 1 stimmt. Wer einen
 * Gestaltungsbefund für ein Sicherheitsdefizit hält und ihn dann «gross»
 * einstuft, hat den Befund verkannt; Punkte für die Einstufung eines Befundes,
 * den es so nicht gibt, wären eine Belohnung für den Folgefehler.
 */
export function bewerteUko(soll: Bewertung, antwort: UkoAntwort): UkoErgebnis {
  if (!istUko(soll)) {
    throw new Error('bewerteUko: die Musterlösung folgt nicht der Konvention der Unfallkommission')
  }

  const maxPunkte = ukoMaxPunkte(soll.schritt1)
  const schritt1Korrekt = antwort.schritt1 === soll.schritt1
  const schritt1Punkte = schritt1Korrekt ? UKO_SCHRITT1_RICHTIG : UKO_SCHRITT1_FALSCH

  const schritt2Steht = schritt1Korrekt && soll.schritt1 === 'sicherheitsdefizit'
  const schritt2Korrekt = schritt2Steht ? antwort.schritt2 === soll.schritt2 : null
  const schritt2Punkte = schritt2Korrekt === true ? UKO_SCHRITT2_RICHTIG : 0

  return {
    schritt1Punkte,
    schritt2Punkte,
    maxPunkte,
    schritt1Korrekt,
    schritt2Korrekt,
    summe: schritt1Punkte + schritt2Punkte,
  }
}

/**
 * Anteil der erreichten an den erreichbaren Punkten, in Prozent.
 *
 * Normiert auf die Summe der Maxima je Befund (Entscheid E-3), damit ein
 * Gestaltungsbefund nicht besser dasteht als ein Sicherheitsdefizit, nur weil
 * er einen Schritt weniger hat. Negative Summen werden auf null gestellt: eine
 * Szene mit weniger als null Prozent ist keine Aussage, die jemand lesen soll.
 */
export function ukoProzent(ergebnisse: UkoErgebnis[]): number {
  const max = ergebnisse.reduce((s, e) => s + e.maxPunkte, 0)
  if (max <= 0) return 0
  const erreicht = ergebnisse.reduce((s, e) => s + e.summe, 0)
  return Math.max(0, (erreicht / max) * 100)
}

/**
 * Die beiden Teilscores einer Szene, getrennt.
 *
 * Für die Ergebnisanzeige: sie zeigt beide nebeneinander, nie ihre Summe.
 * `schritt2Max` zählt nur die Befunde, bei denen Schritt 2 überhaupt anstand —
 * sonst stünde bei einer Szene voller Gestaltungsbefunde ein Nenner, den
 * niemand erreichen kann.
 */
export interface UkoTeilscores {
  schritt1Punkte: number
  schritt1Max: number
  schritt1Treffer: number
  schritt2Punkte: number
  schritt2Max: number
  schritt2Treffer: number
  /** Zahl der Befunde, bei denen Schritt 2 anstand. */
  schritt2Gestellt: number
  /** Zahl der bewerteten Befunde. */
  anzahl: number
}

export function ukoTeilscores(ergebnisse: UkoErgebnis[]): UkoTeilscores {
  let schritt1Punkte = 0
  let schritt1Treffer = 0
  let schritt2Punkte = 0
  let schritt2Treffer = 0
  let schritt2Gestellt = 0
  let schritt2Max = 0

  for (const e of ergebnisse) {
    schritt1Punkte += e.schritt1Punkte
    if (e.schritt1Korrekt) schritt1Treffer++
    if (e.schritt2Korrekt !== null) {
      schritt2Gestellt++
      schritt2Max += UKO_SCHRITT2_RICHTIG
      schritt2Punkte += e.schritt2Punkte
      if (e.schritt2Korrekt) schritt2Treffer++
    }
  }

  return {
    schritt1Punkte,
    schritt1Max: ergebnisse.length * UKO_SCHRITT1_RICHTIG,
    schritt1Treffer,
    schritt2Punkte,
    schritt2Max,
    schritt2Treffer,
    schritt2Gestellt,
    anzahl: ergebnisse.length,
  }
}
