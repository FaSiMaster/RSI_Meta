// scoreCalc.ts – Punkteberechnung als Pure Function (P3-4)
// Ausgelagert aus ScoringFlow.tsx, nutzt STEP_WEIGHTS aus scoringEngine.ts

import { STEP_WEIGHTS, STEP_WEIGHT_UNIT } from './scoringEngine'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import { calcRelevanzSD, calcUnfallrisiko } from './scoringEngine'

// Punkteberechnung: 9 Schritte, Schritte 2/4/6/8 sind Uebertraege (immer korrekt)
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
  STEP_WEIGHTS.reduce((s, w) => s + w, 0) * STEP_WEIGHT_UNIT
)
