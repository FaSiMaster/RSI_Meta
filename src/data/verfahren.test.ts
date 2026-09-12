// Wächter über die Verfahrensweiche
//
// Die Weiche entscheidet, ob eine Szene überhaupt beurteilt werden kann, und
// nach welchem Verfahren. Sie muss in beide Richtungen stimmen: die beiden
// eingetragenen Länder tragen je ihr Verfahren, und jedes andere trägt keines –
// auch dann nicht, wenn der Code irgendwo einen stillen Rückfall einbaut.
// Genau dieser Rückfall wäre der gefährliche Fehler: Er sähe aus wie Nachsicht
// und wäre eine falsche Beurteilung nach fremdem Massstab.
//
// Seit v0.20.0 kommt ein zweiter Fehler dazu, der ebenso still wäre: dass ein
// Land das Verfahren des anderen bekommt. Deshalb prüft jeder Test nicht nur,
// DASS ein Verfahren da ist, sondern WELCHES.

import { describe, it, expect } from 'vitest'
import {
  hatVerfahren, verfahrenFuerLand, laenderMitVerfahren, VERFAHREN_JE_LAND,
  namensraumFuer, istNeunschritt, istUkoLand,
} from './verfahren'
import { VERFAHREN_BFU_ID } from '../i18n/verfahren.bfu'
import { VERFAHREN_UKO_ID } from './bewertung'
import { ISO_3166_1_ALPHA_2 } from './laender'

describe('Verfahren je Land', () => {
  it('die Schweiz trägt den Neunschrittpfad', () => {
    expect(verfahrenFuerLand('CH')).toBe(VERFAHREN_BFU_ID)
    expect(hatVerfahren('CH')).toBe(true)
  })

  it('Deutschland trägt die Konvention der Unfallkommission', () => {
    expect(verfahrenFuerLand('DE')).toBe(VERFAHREN_UKO_ID)
    expect(hatVerfahren('DE')).toBe(true)
  })

  it('die beiden Verfahren werden nicht verwechselt', () => {
    expect(verfahrenFuerLand('CH')).not.toBe(verfahrenFuerLand('DE'))
    expect(istNeunschritt('CH')).toBe(true)
    expect(istNeunschritt('DE')).toBe(false)
    expect(istUkoLand('DE')).toBe(true)
    expect(istUkoLand('CH')).toBe(false)
  })

  it('jedes Verfahren trägt seinen eigenen Namensraum', () => {
    expect(namensraumFuer(VERFAHREN_BFU_ID)).toBe('verfahren')
    expect(namensraumFuer(VERFAHREN_UKO_ID)).toBe('verfahrenUko')
  })

  it('heute tragen genau zwei Länder ein Verfahren', () => {
    expect(laenderMitVerfahren().sort()).toEqual(['CH', 'DE'])
    expect(Object.keys(VERFAHREN_JE_LAND)).toHaveLength(2)
  })

  it('kein weiteres Land hat eines – geprüft an allen 249 Codes', () => {
    const weitere = ISO_3166_1_ALPHA_2.filter(
      code => code !== 'CH' && code !== 'DE' && hatVerfahren(code),
    )
    expect(weitere).toEqual([])
  })

  it('Österreich hat keines – das Nachbarland erbt nichts', () => {
    expect(hatVerfahren('AT')).toBe(false)
    expect(verfahrenFuerLand('AT')).toBeNull()
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
