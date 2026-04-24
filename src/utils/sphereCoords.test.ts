import { describe, it, expect } from 'vitest'
import { punktInPolygon, sphericalDistance, isInTolerance } from './sphereCoords'

describe('punktInPolygon', () => {
  const quadrat = [
    { theta: 10, phi: 70 },
    { theta: 20, phi: 70 },
    { theta: 20, phi: 80 },
    { theta: 10, phi: 80 },
  ]

  it('erkennt Punkt im Inneren', () => {
    expect(punktInPolygon({ theta: 15, phi: 75 }, quadrat)).toBe(true)
  })

  it('erkennt Punkt ausserhalb', () => {
    expect(punktInPolygon({ theta: 5, phi: 75 }, quadrat)).toBe(false)
    expect(punktInPolygon({ theta: 30, phi: 75 }, quadrat)).toBe(false)
    expect(punktInPolygon({ theta: 15, phi: 90 }, quadrat)).toBe(false)
  })

  it('gibt false bei Polygonen mit <3 Punkten zurueck', () => {
    expect(punktInPolygon({ theta: 15, phi: 75 }, [{ theta: 10, phi: 70 }, { theta: 20, phi: 70 }])).toBe(false)
    expect(punktInPolygon({ theta: 15, phi: 75 }, [])).toBe(false)
  })

  it('behandelt 0/360-Umbruch korrekt', () => {
    // Polygon um den Wrap-Around-Bereich (theta 350-10)
    const umbruchQuadrat = [
      { theta: 350, phi: 70 },
      { theta: 10,  phi: 70 },
      { theta: 10,  phi: 80 },
      { theta: 350, phi: 80 },
    ]
    // Punkt bei theta=0 (innerhalb des Umbruch-Bereichs)
    expect(punktInPolygon({ theta: 0, phi: 75 }, umbruchQuadrat)).toBe(true)
    // Punkt bei theta=180 (diagonal gegenueber, ausserhalb)
    expect(punktInPolygon({ theta: 180, phi: 75 }, umbruchQuadrat)).toBe(false)
  })
})

describe('sphericalDistance', () => {
  it('ist 0 bei identischen Punkten', () => {
    expect(sphericalDistance({ theta: 45, phi: 90 }, { theta: 45, phi: 90 })).toBeCloseTo(0, 2)
  })

  it('gibt positive Distanz zwischen verschiedenen Punkten', () => {
    const d = sphericalDistance({ theta: 0, phi: 90 }, { theta: 90, phi: 90 })
    expect(d).toBeGreaterThan(0)
  })

  it('ist symmetrisch', () => {
    const a = { theta: 10, phi: 70 }
    const b = { theta: 50, phi: 110 }
    expect(sphericalDistance(a, b)).toBeCloseTo(sphericalDistance(b, a), 5)
  })
})

describe('isInTolerance', () => {
  it('true wenn Distanz < Toleranz', () => {
    const a = { theta: 45, phi: 90 }
    const b = { theta: 46, phi: 91 }
    expect(isInTolerance(a, b, 5)).toBe(true)
  })

  it('false wenn Distanz > Toleranz', () => {
    const a = { theta: 0, phi: 90 }
    const b = { theta: 90, phi: 90 }
    expect(isInTolerance(a, b, 5)).toBe(false)
  })
})
