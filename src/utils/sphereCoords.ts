// sphereCoords.ts – Sphärische Koordinaten-Hilfsfunktionen für 360°-Viewer
// Konvention: theta=0 = Blick nach vorne (-Z), phi=90 = Horizont

import { Vector3 } from 'three'

export interface SphericalPos {
  theta: number // Horizontalwinkel in Grad (0–360), 0 = vorne (-Z-Achse)
  phi:   number // Vertikalwinkel in Grad (0–180), 90 = Horizont (Aequator)
}

// Alias-Typ für SphericalPos
export type SphereCoord = SphericalPos

// Defizit-Verortung Union-Typ
export type DefizitVerortung =
  | { typ: 'punkt';   position: SphereCoord; toleranz: number }
  | { typ: 'polygon'; punkte: SphereCoord[];  toleranz: number }
  | { typ: 'gruppe';  elemente: DefizitVerortung[]; label?: string }

// Klick-Punkt auf Sphere-Oberflaeche → sphärische Koordinaten
// Eingabe: Vector3 Schnittpunkt auf Sphere (Radius beliebig)
export function clickToSpherical(point: Vector3): SphericalPos {
  const n = point.clone().normalize()
  // phi: Winkel von der positiven Y-Achse (oben) nach unten
  const phi = Math.acos(Math.max(-1, Math.min(1, n.y))) * (180 / Math.PI)
  // theta: Azimutwinkel, 0 = -Z (vorne), 90 = +X (rechts)
  let theta = Math.atan2(n.x, -n.z) * (180 / Math.PI)
  if (theta < 0) theta += 360
  return { theta, phi }
}

// Alias für clickToSpherical
export function vector3ToSpherical(point: Vector3): SphericalPos {
  return clickToSpherical(point)
}

// Sphärische Koordinaten → Vector3 auf Sphere mit gegebenem Radius
export function sphericalToVector3(pos: SphericalPos, radius: number): Vector3 {
  const thetaRad = pos.theta * Math.PI / 180
  const phiRad   = pos.phi   * Math.PI / 180
  return new Vector3(
     radius * Math.sin(phiRad) * Math.sin(thetaRad),
     radius * Math.cos(phiRad),
    -radius * Math.sin(phiRad) * Math.cos(thetaRad),
  )
}

// Winkelabstand zwischen zwei sphärischen Positionen (Bogensekunden-Formel)
// Gibt Abstand in Grad zurück
export function sphericalDistance(a: SphericalPos, b: SphericalPos): number {
  const toRad = (d: number) => d * Math.PI / 180
  // Umrechnung: phi=0 = Nordpol, phi=90 = Aequator → Breitengrad = 90 - phi
  const lat1  = toRad(90 - a.phi)
  const lat2  = toRad(90 - b.phi)
  const dLon  = toRad(b.theta - a.theta)
  const cos = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI)
}

// Prüft ob ein Klick innerhalb des Toleranz-Radius eines Defizits liegt
export function isInTolerance(click: SphericalPos, deficitPos: SphericalPos, tolerance: number): boolean {
  return sphericalDistance(click, deficitPos) <= tolerance
}

// Equirectangulaere Pixel-Koordinate zu sphärischer Position
export function pixelToSpherical(x: number, y: number, bildBreite: number, bildHoehe: number): SphericalPos {
  const theta = (x / bildBreite) * 360
  const phi   = (y / bildHoehe)  * 180
  return { theta, phi }
}

// Sphärische Position zu equirectangulären Pixel-Koordinaten
export function sphericalToPixel(coord: SphericalPos, bildBreite: number, bildHoehe: number): { x: number; y: number } {
  const x = (coord.theta / 360) * bildBreite
  const y = (coord.phi   / 180) * bildHoehe
  return { x, y }
}

// Ray-Casting Algorithmus im equirectangulären (theta/phi) Raum
export function punktInPolygon(punkt: SphericalPos, polygon: SphericalPos[]): boolean {
  const n = polygon.length
  if (n < 3) return false
  let inside = false
  const px = punkt.theta
  const py = punkt.phi
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].theta
    const yi = polygon[i].phi
    const xj = polygon[j].theta
    const yj = polygon[j].phi
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Trefferprüfung für alle Verortungstypen
export function trefferprüfung(klick: SphericalPos, verortung: DefizitVerortung): boolean {
  if (verortung.typ === 'punkt') {
    return sphericalDistance(klick, verortung.position) <= verortung.toleranz
  }
  if (verortung.typ === 'polygon') {
    if (punktInPolygon(klick, verortung.punkte)) return true
    // Auch Treffer wenn in Naehe eines Eckpunkts
    return verortung.punkte.some(p => sphericalDistance(klick, p) <= verortung.toleranz)
  }
  if (verortung.typ === 'gruppe') {
    return verortung.elemente.some(el => trefferprüfung(klick, el))
  }
  return false
}

// ── Deutsche Alias-Funktionen für sphereCoords ──
// Erlauben deutschen Bezeichnungen in deutschen Komponenten

export const pixelZuSphaerisch    = pixelToSpherical
export const sphaerischZuPixel    = sphericalToPixel
export const winkelAbstand        = sphericalDistance
export const trefferPrüfung      = trefferprüfung
export const vector3ZuSphaerisch  = vector3ToSpherical
