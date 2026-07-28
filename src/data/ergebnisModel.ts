// ergebnisModel.ts — Gemeinsames Ergebnis-/Matrix-Modell für Browser und VR
//
// Pure Functions ohne UI. Eine einzige Quelle für die Matrix-Darstellung und
// die Marker-Semantik (User-Schnittpunkt, korrekte Zelle, Achsen-Highlight),
// damit HTML-Ansicht (ScoringFlow.CompactMatrix) und VR-Panels nicht
// auseinanderdriften. Die Zellwerte kommen ausschliesslich aus scoringEngine
// (Sacred File — hier nur importiert, nie verändert).

import { calcRelevanzSD, calcUnfallrisiko } from './scoringEngine'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// Achsen-Reihenfolgen identisch zur Browser-Matrix (ScoringFlow.tsx)
export const RELEVANZ_ROWS: readonly RSIDimension[]  = ['gross', 'mittel', 'klein']   // Wichtigkeit (Y)
export const RELEVANZ_COLS: readonly RSIDimension[]  = ['klein', 'mittel', 'gross']   // Abweichung (X)
export const RISIKO_ROWS:   readonly ResultDimension[] = ['hoch', 'mittel', 'gering'] // Relevanz SD (Y)
export const RISIKO_COLS:   readonly NACADimension[]   = ['leicht', 'mittel', 'schwer'] // Unfallschwere (X)

export interface MatrixCell {
  row:   string
  col:   string
  value: ResultDimension
  /** User-Schnittpunkt und korrekt */
  userCorrect: boolean
  /** User-Schnittpunkt, aber falsch */
  userWrong: boolean
  /** Korrekte Zelle, wenn der User daneben liegt */
  correctMarker: boolean
  /** Zelle liegt auf der User-Zeile oder -Spalte (ohne die Marker-Zellen) */
  axisHighlight: boolean
}

export interface MatrixModel {
  type: 'relevanz' | 'unfallrisiko'
  rows: readonly string[]
  cols: readonly string[]
  userRow:    string
  userCol:    string
  correctRow: string
  correctCol: string
  /** row-major, rows.length × cols.length */
  cells: MatrixCell[]
}

// Marker-Semantik identisch zu ScoringFlow.CompactMatrix (Browser):
// isIntersect = User-Zeile × User-Spalte; isCorrect = korrekte Zelle;
// axisHighlight nur ausserhalb der beiden Marker.
function buildMatrix(
  type: MatrixModel['type'],
  rows: readonly string[],
  cols: readonly string[],
  cellVal: (row: string, col: string) => ResultDimension,
  userRow: string,
  userCol: string,
  correctRow: string,
  correctCol: string,
): MatrixModel {
  const cells: MatrixCell[] = []
  for (const row of rows) {
    for (const col of cols) {
      const isIntersect = row === userRow && col === userCol
      const isCorrect   = row === correctRow && col === correctCol
      cells.push({
        row,
        col,
        value:         cellVal(row, col),
        userCorrect:   isIntersect && isCorrect,
        userWrong:     isIntersect && !isCorrect,
        correctMarker: isCorrect && !isIntersect,
        axisHighlight: !isIntersect && !(isCorrect && !isIntersect) && (row === userRow || col === userCol),
      })
    }
  }
  return { type, rows, cols, userRow, userCol, correctRow, correctCol, cells }
}

/** Relevanz-Matrix (Wichtigkeit × Abweichung) mit User- und Korrekt-Markern. */
export function buildRelevanzMatrix(
  userW: RSIDimension,
  userA: RSIDimension,
  correctW: RSIDimension,
  correctA: RSIDimension,
): MatrixModel {
  return buildMatrix(
    'relevanz',
    RELEVANZ_ROWS,
    RELEVANZ_COLS,
    (row, col) => calcRelevanzSD(row as RSIDimension, col as RSIDimension),
    userW, userA, correctW, correctA,
  )
}

/** Unfallrisiko-Matrix (Relevanz SD × Unfallschwere) mit User- und Korrekt-Markern. */
export function buildRisikoMatrix(
  userR: ResultDimension,
  userN: NACADimension,
  correctR: ResultDimension,
  correctN: NACADimension,
): MatrixModel {
  return buildMatrix(
    'unfallrisiko',
    RISIKO_ROWS,
    RISIKO_COLS,
    (row, col) => calcUnfallrisiko(row as ResultDimension, col as NACADimension),
    userR, userN, correctR, correctN,
  )
}

export interface AbgeleiteteErgebnisse {
  relevanzSD:   ResultDimension
  unfallrisiko: ResultDimension
}

/** Die automatischen Schritte 5 und 9 aus den drei User-Eingaben ableiten. */
export function deriveErgebnisse(
  w: RSIDimension,
  a: RSIDimension,
  n: NACADimension,
): AbgeleiteteErgebnisse {
  const relevanzSD = calcRelevanzSD(w, a)
  return { relevanzSD, unfallrisiko: calcUnfallrisiko(relevanzSD, n) }
}
