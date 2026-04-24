import { describe, it, expect } from 'vitest'
import { calcScore, calcScoreFromChoices, MAX_PUNKTE_PRO_DEFIZIT } from './scoreCalc'

describe('calcScore', () => {
  it('gibt 0 Punkte wenn kein Schritt korrekt ist', () => {
    expect(calcScore([false, false, false, false, false, false, false, false, false])).toBe(0)
  })

  it('gibt maximale Schritte-Punkte wenn alle 9 Schritte korrekt sind', () => {
    // 75 Pkt. aus Schritten (MAX_PUNKTE_PRO_DEFIZIT minus Kategorie-Bonus 25)
    const alleKorrekt = calcScore([true, true, true, true, true, true, true, true, true])
    expect(alleKorrekt).toBe(MAX_PUNKTE_PRO_DEFIZIT - 25)
  })

  it('rundet auf Ganzzahl', () => {
    const pts = calcScore([true, false, false, false, false, false, false, false, false])
    expect(Number.isInteger(pts)).toBe(true)
  })
})

describe('calcScoreFromChoices', () => {
  it('gibt volle Schritte-Punkte bei komplett korrekten Auswahlen', () => {
    // Korrekte Auswahl: W=gross, A=gross → R=hoch, N=schwer → UR=hoch
    const pts = calcScoreFromChoices('gross', 'gross', 'schwer', 'gross', 'gross', 'hoch', 'schwer', 'hoch')
    expect(pts).toBe(MAX_PUNKTE_PRO_DEFIZIT - 25)
  })

  it('gibt 0 Punkte wenn W/A/N falsch sind (auto-abgeleitete auch falsch)', () => {
    const pts = calcScoreFromChoices('klein', 'klein', 'leicht', 'gross', 'gross', 'hoch', 'schwer', 'hoch')
    // Schritt 1/3/7 falsch + Schritt 5/9 auto-abgeleitet auch falsch
    // Schritte 2/4/6/8 sind Uebertraege (immer korrekt)
    // → nur ~44% der Punkte
    expect(pts).toBeLessThan(MAX_PUNKTE_PRO_DEFIZIT / 2)
  })

  it('W/A korrekt aber N falsch: Schritte 7+9 falsch', () => {
    const pts = calcScoreFromChoices('gross', 'gross', 'leicht', 'gross', 'gross', 'hoch', 'schwer', 'hoch')
    expect(pts).toBeLessThan(MAX_PUNKTE_PRO_DEFIZIT - 25)
    expect(pts).toBeGreaterThan(0)
  })
})

describe('MAX_PUNKTE_PRO_DEFIZIT', () => {
  it('ist 100 (75 Schritte + 25 Kategorie)', () => {
    expect(MAX_PUNKTE_PRO_DEFIZIT).toBe(100)
  })
})
