// Wächter für das Bewertungsmodell (B1, v0.20.0)
//
// Geprüft wird das, was schiefgehen kann und nicht auffällt:
// – Ein Bestandsdefizit ohne Diskriminator muss als Schweizer Bewertung
//   gelesen werden, und seine sechs Felder dürfen sich dabei nicht ändern.
// – Die Verengung muss beide Richtungen treffen. Ein Wächter, der nur den
//   Normalfall prüft, meldet nichts.
// – Der Trefferradius im flachen Bild muss ein Kreis sein. Rechnet man in
//   normalisierten Koordinaten ohne das Seitenverhältnis, wird er zum Oval,
//   und niemand sieht es, weil der Marker rund gezeichnet wird.

import { describe, it, expect } from 'vitest'
import {
  VERFAHREN_UKO_ID, istUko, istBfu, alsBfu, alsUko, mitVerfahren,
  anzeigeStufe, anzeigeRisiko, leereBewertung,
  type Bewertung, type BewertungBfu, type BewertungUko,
} from './bewertung'
import { VERFAHREN_BFU_ID } from '../i18n/verfahren.bfu'
import { trefferImBild, type DefizitVerortung } from '../utils/sphereCoords'

/** Eine Bewertung, wie sie in Bestandsdaten liegt: ohne Diskriminator. */
const altbestand = {
  wichtigkeit:   'gross',
  abweichung:    'mittel',
  relevanzSD:    'mittel',
  naca:          4,
  unfallschwere: 'schwer',
  unfallrisiko:  'hoch',
} as BewertungBfu

const uko: BewertungUko = {
  verfahren: VERFAHREN_UKO_ID,
  schritt1:  'sicherheitsdefizit',
  schritt2:  'gross',
}

const ukoGestaltung: BewertungUko = {
  verfahren: VERFAHREN_UKO_ID,
  schritt1:  'gestaltung',
  schritt2:  null,
}

describe('Leseregel Verfahren', () => {
  it('liest eine Bewertung ohne Diskriminator als Schweizer Bewertung', () => {
    expect(istBfu(altbestand)).toBe(true)
    expect(istUko(altbestand)).toBe(false)
    expect(alsBfu(altbestand)).not.toBeNull()
    expect(alsUko(altbestand)).toBeNull()
  })

  it('ergänzt den Diskriminator, ohne einen Wert der sechs Felder zu ändern', () => {
    const ergaenzt = mitVerfahren(altbestand) as BewertungBfu
    expect(ergaenzt.verfahren).toBe(VERFAHREN_BFU_ID)
    // Jedes Feld einzeln, nicht als Objektvergleich: ein Objektvergleich würde
    // ein zusätzlich erfundenes Feld nicht melden.
    expect(ergaenzt.wichtigkeit).toBe('gross')
    expect(ergaenzt.abweichung).toBe('mittel')
    expect(ergaenzt.relevanzSD).toBe('mittel')
    expect(ergaenzt.naca).toBe(4)
    expect(ergaenzt.unfallschwere).toBe('schwer')
    expect(ergaenzt.unfallrisiko).toBe('hoch')
    expect(Object.keys(ergaenzt).sort()).toEqual(
      ['abweichung', 'naca', 'relevanzSD', 'unfallrisiko', 'unfallschwere', 'verfahren', 'wichtigkeit'],
    )
  })

  it('lässt eine Bewertung, die den Diskriminator trägt, unverändert', () => {
    const schonGesetzt: BewertungBfu = { ...altbestand, verfahren: VERFAHREN_BFU_ID }
    expect(mitVerfahren(schonGesetzt)).toBe(schonGesetzt)
    expect(mitVerfahren(uko)).toBe(uko)
  })

  it('erkennt die deutsche Bewertung und verengt in beide Richtungen', () => {
    expect(istUko(uko)).toBe(true)
    expect(istBfu(uko)).toBe(false)
    expect(alsUko(uko)?.schritt1).toBe('sicherheitsdefizit')
    expect(alsBfu(uko)).toBeNull()
  })
})

describe('Anzeigehelfer', () => {
  it('zeigt beim Neunschrittpfad die Wichtigkeit, bei der Konvention die Einstufung', () => {
    expect(anzeigeStufe(altbestand)).toBe('gross')
    expect(anzeigeStufe(uko)).toBe('gross')
  })

  it('hat für einen Gestaltungsbefund keine Stufe und kein Risiko', () => {
    expect(anzeigeStufe(ukoGestaltung)).toBeNull()
    expect(anzeigeRisiko(ukoGestaltung)).toBeNull()
    expect(anzeigeRisiko(uko)).toBeNull()
  })

  it('liefert das Unfallrisiko nur für den Neunschrittpfad', () => {
    expect(anzeigeRisiko(altbestand)).toBe('hoch')
  })
})

describe('leereBewertung', () => {
  it('gibt für den Neunschrittpfad die mildesten Werte', () => {
    const b = leereBewertung()
    expect(b.verfahren).toBe(VERFAHREN_BFU_ID)
    expect(b.wichtigkeit).toBe('klein')
    expect(b.unfallrisiko).toBe('gering')
  })

  it('gibt für die Konvention einen Befund ohne Vorentscheid zur Schwere', () => {
    const b = leereBewertung(VERFAHREN_UKO_ID)
    expect(b.verfahren).toBe(VERFAHREN_UKO_ID)
    expect(b.schritt1).toBe('sicherheitsdefizit')
    expect(b.schritt2).toBe('klein')
  })
})

describe('Trefferprüfung im flachen Bild', () => {
  const mitte: DefizitVerortung = { typ: 'bild', x: 0.5, y: 0.5, r: 0.05 }

  it('trifft in der Mitte und daneben nicht', () => {
    expect(trefferImBild({ x: 0.5, y: 0.5 }, mitte, 16 / 9)).toBe(true)
    expect(trefferImBild({ x: 0.9, y: 0.5 }, mitte, 16 / 9)).toBe(false)
  })

  it('bleibt bei einem breiten Bild ein Kreis und kein Oval', () => {
    // 16:9. Der Radius ist 0,05 Bildbreiten. In y entspricht das
    // 0,05 * 16/9 = 0,0889 der Bildhöhe. Ein Punkt 0,08 Bildhöhen über der
    // Mitte liegt also drin, einer 0,10 darüber nicht.
    expect(trefferImBild({ x: 0.5, y: 0.5 - 0.08 }, mitte, 16 / 9)).toBe(true)
    expect(trefferImBild({ x: 0.5, y: 0.5 - 0.10 }, mitte, 16 / 9)).toBe(false)
    // Waagrecht gilt der Radius unverändert.
    expect(trefferImBild({ x: 0.5 + 0.049, y: 0.5 }, mitte, 16 / 9)).toBe(true)
    expect(trefferImBild({ x: 0.5 + 0.051, y: 0.5 }, mitte, 16 / 9)).toBe(false)
  })

  it('weist ein unbrauchbares Seitenverhältnis ab, statt zu rechnen', () => {
    expect(trefferImBild({ x: 0.5, y: 0.5 }, mitte, 0)).toBe(false)
    expect(trefferImBild({ x: 0.5, y: 0.5 }, mitte, -2)).toBe(false)
  })

  it('trifft eine Gruppe, wenn eines ihrer Elemente trifft', () => {
    const gruppe: DefizitVerortung = {
      typ: 'gruppe',
      elemente: [mitte, { typ: 'bild', x: 0.1, y: 0.1, r: 0.03 }],
    }
    expect(trefferImBild({ x: 0.1, y: 0.1 }, gruppe, 1.5)).toBe(true)
    expect(trefferImBild({ x: 0.8, y: 0.8 }, gruppe, 1.5)).toBe(false)
  })

  it('trifft eine Kugelverortung im Bildraum nicht', () => {
    const kugel: DefizitVerortung = {
      typ: 'punkt', position: { theta: 180, phi: 90 }, toleranz: 15,
    }
    expect(trefferImBild({ x: 0.5, y: 0.5 }, kugel, 2)).toBe(false)
  })
})

describe('Union über beide Verfahren', () => {
  it('führt jede Bewertung in genau einen der beiden Zweige', () => {
    const alle: Bewertung[] = [altbestand, uko, ukoGestaltung]
    for (const b of alle) {
      expect(istBfu(b) !== istUko(b)).toBe(true)
    }
  })
})
