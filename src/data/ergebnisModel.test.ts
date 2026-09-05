// Tests für das gemeinsame Ergebnis-/Matrix-Modell (v0.9.1 — VR-Iter 5)
//
// Die Zellwerte-Pins entsprechen den normativen Matrizen aus dem Fachkurs FK RSI
// FK RSI V 16.09.2020 (dokumentiert in CLAUDE.md, implementiert in
// scoringEngine.ts). Ändert sich die Sacred-Engine, schlagen diese Tests an.

import { describe, it, expect } from 'vitest'
import {
  buildRelevanzMatrix,
  buildRisikoMatrix,
  deriveErgebnisse,
  RELEVANZ_ROWS,
  RELEVANZ_COLS,
  RISIKO_ROWS,
  RISIKO_COLS,
  type MatrixModel,
} from './ergebnisModel'

function cell(m: MatrixModel, row: string, col: string) {
  const c = m.cells.find(c => c.row === row && c.col === col)
  if (!c) throw new Error(`Zelle ${row}×${col} fehlt`)
  return c
}

describe('Zellwerte — Pins gegen die normativen Matrizen (FK RSI)', () => {
  it('Relevanz-Matrix (Wichtigkeit × Abweichung), alle 9 Zellen', () => {
    const m = buildRelevanzMatrix('gross', 'gross', 'gross', 'gross')
    expect(cell(m, 'gross',  'klein').value).toBe('gering')
    expect(cell(m, 'gross',  'mittel').value).toBe('mittel')
    expect(cell(m, 'gross',  'gross').value).toBe('hoch')
    expect(cell(m, 'mittel', 'klein').value).toBe('gering')
    expect(cell(m, 'mittel', 'mittel').value).toBe('mittel')
    expect(cell(m, 'mittel', 'gross').value).toBe('hoch')
    expect(cell(m, 'klein',  'klein').value).toBe('gering')
    expect(cell(m, 'klein',  'mittel').value).toBe('gering')
    expect(cell(m, 'klein',  'gross').value).toBe('mittel')
  })

  it('Unfallrisiko-Matrix (Relevanz SD × Unfallschwere), alle 9 Zellen', () => {
    const m = buildRisikoMatrix('hoch', 'leicht', 'hoch', 'leicht')
    expect(cell(m, 'hoch',   'leicht').value).toBe('mittel')
    expect(cell(m, 'hoch',   'mittel').value).toBe('hoch')
    expect(cell(m, 'hoch',   'schwer').value).toBe('hoch')
    expect(cell(m, 'mittel', 'leicht').value).toBe('gering')
    expect(cell(m, 'mittel', 'mittel').value).toBe('mittel')
    expect(cell(m, 'mittel', 'schwer').value).toBe('hoch')
    expect(cell(m, 'gering', 'leicht').value).toBe('gering')
    expect(cell(m, 'gering', 'mittel').value).toBe('gering')
    expect(cell(m, 'gering', 'schwer').value).toBe('mittel')
  })
})

describe('Marker-Semantik (identisch zur Browser-CompactMatrix)', () => {
  it('User korrekt: genau eine userCorrect-Zelle, kein correctMarker', () => {
    const m = buildRelevanzMatrix('gross', 'mittel', 'gross', 'mittel')
    expect(m.cells.filter(c => c.userCorrect)).toHaveLength(1)
    expect(m.cells.filter(c => c.userWrong)).toHaveLength(0)
    expect(m.cells.filter(c => c.correctMarker)).toHaveLength(0)
    expect(cell(m, 'gross', 'mittel').userCorrect).toBe(true)
  })

  it('User falsch: eine userWrong- und eine correctMarker-Zelle', () => {
    const m = buildRelevanzMatrix('klein', 'klein', 'gross', 'gross')
    expect(m.cells.filter(c => c.userWrong)).toHaveLength(1)
    expect(m.cells.filter(c => c.correctMarker)).toHaveLength(1)
    expect(cell(m, 'klein', 'klein').userWrong).toBe(true)
    expect(cell(m, 'gross', 'gross').correctMarker).toBe(true)
  })

  it('axisHighlight: User-Zeile und -Spalte ohne die Marker-Zellen', () => {
    const m = buildRelevanzMatrix('gross', 'mittel', 'gross', 'mittel')
    // 3×3: Zeile gross (3) + Spalte mittel (3) − Schnittpunkt (1, ist userCorrect) = 4
    expect(m.cells.filter(c => c.axisHighlight)).toHaveLength(4)
    expect(m.cells.filter(c => c.axisHighlight && c.userCorrect)).toHaveLength(0)
  })

  it('Marker-Zellen schliessen sich gegenseitig aus', () => {
    const m = buildRisikoMatrix('hoch', 'schwer', 'gering', 'leicht')
    for (const c of m.cells) {
      const marker = [c.userCorrect, c.userWrong, c.correctMarker].filter(Boolean)
      expect(marker.length).toBeLessThanOrEqual(1)
    }
  })

  it('User- und Korrekt-Positionen stehen im Modell', () => {
    const m = buildRisikoMatrix('mittel', 'leicht', 'hoch', 'schwer')
    expect(m.userRow).toBe('mittel')
    expect(m.userCol).toBe('leicht')
    expect(m.correctRow).toBe('hoch')
    expect(m.correctCol).toBe('schwer')
  })
})

describe('deriveErgebnisse (Schritte 5 und 9)', () => {
  it('leitet Relevanz SD und Unfallrisiko konsistent zur Engine ab', () => {
    // gross×gross → hoch; hoch×schwer → hoch
    expect(deriveErgebnisse('gross', 'gross', 'schwer')).toEqual({
      relevanzSD: 'hoch',
      unfallrisiko: 'hoch',
    })
    // klein×klein → gering; gering×leicht → gering
    expect(deriveErgebnisse('klein', 'klein', 'leicht')).toEqual({
      relevanzSD: 'gering',
      unfallrisiko: 'gering',
    })
    // klein×gross → mittel; mittel×mittel → mittel
    expect(deriveErgebnisse('klein', 'gross', 'mittel')).toEqual({
      relevanzSD: 'mittel',
      unfallrisiko: 'mittel',
    })
  })
})

describe('Achsen-Konstanten', () => {
  it('entsprechen der Browser-Matrix-Anordnung', () => {
    expect(RELEVANZ_ROWS).toEqual(['gross', 'mittel', 'klein'])
    expect(RELEVANZ_COLS).toEqual(['klein', 'mittel', 'gross'])
    expect(RISIKO_ROWS).toEqual(['hoch', 'mittel', 'gering'])
    expect(RISIKO_COLS).toEqual(['leicht', 'mittel', 'schwer'])
  })
})
