// Wächter über die Verfahrensweiche
//
// Die Weiche entscheidet, ob eine Szene überhaupt beurteilt werden kann. Sie
// muss in beide Richtungen stimmen: die Schweiz hat ein Verfahren, und jedes
// andere Land hat keines – auch dann nicht, wenn der Code irgendwo einen
// stillen Rückfall auf die Schweiz einbaut. Genau dieser Rückfall wäre der
// gefährliche Fehler: Er sähe aus wie Nachsicht und wäre eine falsche
// Beurteilung nach fremdem Massstab.

import { describe, it, expect } from 'vitest'
import { hatVerfahren, verfahrenFuerLand, laenderMitVerfahren, VERFAHREN_JE_LAND } from './verfahren'
import { VERFAHREN_BFU_ID } from '../i18n/verfahren.bfu'
import { ISO_3166_1_ALPHA_2 } from './laender'

describe('Verfahren je Land', () => {
  it('die Schweiz trägt den Neunschrittpfad', () => {
    expect(verfahrenFuerLand('CH')).toBe(VERFAHREN_BFU_ID)
    expect(hatVerfahren('CH')).toBe(true)
  })

  it('heute trägt genau ein Land ein Verfahren', () => {
    expect(laenderMitVerfahren()).toEqual(['CH'])
    expect(Object.keys(VERFAHREN_JE_LAND)).toHaveLength(1)
  })

  it('kein anderes Land hat eines – geprüft an allen 249 Codes', () => {
    const mitVerfahren = ISO_3166_1_ALPHA_2.filter(code => code !== 'CH' && hatVerfahren(code))
    expect(mitVerfahren).toEqual([])
  })

  it('Deutschland hat keines', () => {
    expect(hatVerfahren('DE')).toBe(false)
    expect(verfahrenFuerLand('DE')).toBeNull()
  })

  it('ein unbekannter Code hat keines', () => {
    expect(hatVerfahren('XX')).toBe(false)
    expect(hatVerfahren('ch')).toBe(false)
  })

  it('ein fehlendes Land gilt als Schweiz – so wie die Leseregel', () => {
    // Bestandsdaten ohne Feld sind schweizerisch. Die Weiche muss dasselbe
    // sagen wie die Leseregel, sonst bricht eine Szene ab, die vor dem Umbau
    // lief.
    expect(hatVerfahren(undefined)).toBe(true)
    expect(hatVerfahren(null)).toBe(true)
    expect(hatVerfahren('')).toBe(true)
  })
})
