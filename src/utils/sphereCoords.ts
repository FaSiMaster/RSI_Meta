// sphereCoords.ts – Sphärische Koordinaten-Hilfsfunktionen fuer 360°-Viewer
// Konvention: theta=0 = Blick nach vorne (-Z), phi=90 = Horizont

import { Vector3 } from 'three'

export interface SphericalPos {
  theta: number // Horizontalwinkel in Grad (0–360), 0 = vorne (-Z-Achse)
  phi:   number // Vertikalwinkel in Grad (0–180), 90 = Horizont (Aequator)
}

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

// Prueft ob ein Klick innerhalb des Toleranz-Radius eines Defizits liegt
export function isInTolerance(click: SphericalPos, deficitPos: SphericalPos, tolerance: number): boolean {
  return sphericalDistance(click, deficitPos) <= tolerance
}
