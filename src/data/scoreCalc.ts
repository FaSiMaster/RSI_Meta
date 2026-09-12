// scoreCalc.ts – Punkteberechnung als Pure Function (P3-4)
// Ausgelagert aus ScoringFlow.tsx, nutzt STEP_WEIGHTS aus scoringEngine.ts

import { STEP_WEIGHTS, STEP_WEIGHT_UNIT, KATEGORIE_PUNKTE } from './scoringEngine'
import { alsUko, type Bewertung } from './bewertung'
import { ukoMaxPunkte } from './punkteUko'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import { calcRelevanzSD, calcUnfallrisiko } from './scoringEngine'

// Punkteberechnung: 9 Schritte, Schritte 2/4/6/8 sind Übertraege (immer korrekt)
export function calcScore(correct: boolean[]): number {
  let total = 0
  STEP_WEIGHTS.forEach((w, i) => { if (correct[i]) total += w * STEP_WEIGHT_UNIT })
  return Math.round(total)
}

// Convenience: Punkte aus Benutzer-Auswahlen berechnen
export function calcScoreFromChoices(
  userW: RSIDimension,
  userA: RSIDimension,
  userN: NACADimension,
  correctW: RSIDimension,
  correctA: RSIDimension,
  correctR: ResultDimension,
  correctN: NACADimension,
  correctUR: ResultDimension,
): number {
  const userR = calcRelevanzSD(userW, userA)
  const userUR = calcUnfallrisiko(userR, userN)
  const correct = [
    userW === correctW,     // Schritt 1
    true,                    // Schritt 2 (auto)
    userA === correctA,     // Schritt 3
    true,                    // Schritt 4 (auto)
    userR === correctR,     // Schritt 5 (auto-abgeleitet)
    true,                    // Schritt 6 (auto)
    userN === correctN,     // Schritt 7
    true,                    // Schritt 8 (auto)
    userUR === correctUR,   // Schritt 9 (auto-abgeleitet)
  ]
  return calcScore(correct)
}

// Max erreichbare Punktzahl pro Defizit
export const MAX_PUNKTE_PRO_DEFIZIT = Math.round(
  STEP_WEIGHTS.reduce((s: number, w) => s + w, 0) * STEP_WEIGHT_UNIT
) + KATEGORIE_PUNKTE

// ── Punkte-Oekonomie (v0.10.0, Entscheid Fachverantwortung 2026-07-29) ──
// Bewusst NICHT in scoringEngine.ts (Sacred File): Die normativen Matrizen
// und Schritt-Gewichte bleiben dort unberuehrt — Teilpunkte und Hinweis-
// Kosten sind App-Design.
//
// Falsche Kategorie gibt neu 15 der 25 Kategorie-Punkte («gefunden, aber
// falsch einsortiert») statt 0 — die Kategorisierung ist Schritt 0, nicht
// Teil der normativen 9-Schritte-Methodik, und die Kategorien ueberlappen.
export const KATEGORIE_TEILPUNKTE = 15

// Zweistufiger Hinweis (Review R-18): Stufe 1 «Standort-Hinweis» zeigt nur, an
// welchen Standorten noch unentdeckte Defizite liegen (−10 pro Fund);
// Stufe 2 «Hotspots» blendet die Marker im Bild ein (−25 pro Fund).
// Massgebend ist die beim Fund aktive Stufe — nicht additiv.
// Begriff v0.10.2: vorher «Wegweiser» — kollidierte mit dem Signal-Kriterium
// «Signale / Wegweiser» (SSV/VSS), deshalb umbenannt.
export const HINT_ABZUG_STANDORT  = 10
export const HINT_ABZUG_HOTSPOTS  = 25

// ── Verfahrensuebergreifend (v0.20.0) ───────────────────────────────────────
//
// Das Maximum einer Szene war bis hierhin `anzahl * MAX_PUNKTE_PRO_DEFIZIT`.
// Das gilt nur, solange jedes Defizit denselben Weg durchlaeuft. Ein Befund
// nach der Konvention der Unfallkommission traegt 100 Punkte als
// Sicherheitsdefizit und 60 als Gestaltungsbefund, weil er dann nur Schritt 1
// durchlaeuft. Die Zahl haengt also am Datensatz, nicht an der Anzahl.

/** Erreichbare Punkte eines Defizits, je nach Verfahren seiner Bewertung. */
export function maxPunkteFuerDefizit(bewertung: Bewertung): number {
  const uko = alsUko(bewertung)
  return uko ? ukoMaxPunkte(uko.schritt1) : MAX_PUNKTE_PRO_DEFIZIT
}

/** Erreichbare Punkte einer ganzen Szene. */
export function szenenMaxPunkte(bewertungen: Bewertung[]): number {
  return bewertungen.reduce((s, b) => s + maxPunkteFuerDefizit(b), 0)
}
