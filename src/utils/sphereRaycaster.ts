import * as THREE from "three";

/**
 * Konvertiert einen 3D-Trefferpunkt auf der invertierten 360°-Sphere
 * zu sphärischen Grad-Werten.
 *
 * Verwendung im Admin-Defizit-Editor:
 *   const { theta, phi } = point3dToSpherical(intersection.point);
 *   // theta: Horizontalwinkel 0–360°
 *   // phi:   Vertikalwinkel   0–180° (0 = oben, 90 = Horizont, 180 = unten)
 */
export function point3dToSpherical(point: THREE.Vector3): { theta: number; phi: number } {
  const spherical = new THREE.Spherical().setFromVector3(point);
  return {
    theta: THREE.MathUtils.radToDeg(spherical.theta),
    phi:   THREE.MathUtils.radToDeg(spherical.phi),
  };
}

/**
 * Konvertiert sphärische Grad-Werte zurück zu einem 3D-Punkt
 * auf der Sphere (Standard-Radius 490 = knapp innerhalb der 500er Sphere).
 */
export function sphericalToPoint3d(
  theta: number,
  phi: number,
  radius = 490,
): THREE.Vector3 {
  const spherical = new THREE.Spherical(
    radius,
    THREE.MathUtils.degToRad(phi),
    THREE.MathUtils.degToRad(theta),
  );
  return new THREE.Vector3().setFromSpherical(spherical);
}

/**
 * Konvertiert sphärische Koordinaten zu normalisierten 2D-Bildkoordinaten [0–1].
 * Nützlich um Defizit-Marker auf einem equirektangularen Vorschaubild zu positionieren.
 *
 *   x = theta / 360
 *   y = phi   / 180
 */
export function sphericalToNormalized(theta: number, phi: number): [number, number] {
  return [theta / 360, phi / 180];
}

/**
 * Konvertiert normalisierte 2D-Bildkoordinaten [0–1] zu sphärischen Grad-Werten.
 */
export function normalizedToSpherical(x: number, y: number): { theta: number; phi: number } {
  return { theta: x * 360, phi: y * 180 };
}
