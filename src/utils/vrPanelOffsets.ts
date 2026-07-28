// VR-Panel-Offsets — Persistenz für verschiebbare VR-Panels (v0.9.0)
//
// Jedes verschiebbare Panel hat eine stabile ID. Gespeichert wird der Offset
// im Kamera-Koordinatensystem zum Mount-Zeitpunkt (nicht in Weltkoordinaten):
// So erscheint das Panel in jeder Szene und Session an derselben Stelle
// relativ zur Blickrichtung des Users — unabhängig davon, wohin er beim
// Öffnen gerade schaut.

export type PanelOffset = [number, number, number]

const STORAGE_KEY = 'rsi-v3-vr-panel-offsets'

// Grenzen in Metern relativ zur Blickachse beim Mount. Verhindert, dass ein
// Panel ausserhalb der Reichweite oder hinter dem User landet. Z bleibt frei
// im Bereich vor dem User (Capture-View-Plane hält die Distanz ohnehin
// konstant, der Clamp ist ein Sicherheitsnetz).
export const OFFSET_GRENZEN = {
  x: 1.6,
  y: 1.1,
  zMin: -3.0,
  zMax: -0.5,
} as const

function istPanelOffset(v: unknown): v is PanelOffset {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(n => typeof n === 'number' && Number.isFinite(n))
  )
}

/** Offset auf den erlaubten Bereich begrenzen. */
export function clampOffset(o: PanelOffset): PanelOffset {
  return [
    Math.min(OFFSET_GRENZEN.x, Math.max(-OFFSET_GRENZEN.x, o[0])),
    Math.min(OFFSET_GRENZEN.y, Math.max(-OFFSET_GRENZEN.y, o[1])),
    Math.min(OFFSET_GRENZEN.zMax, Math.max(OFFSET_GRENZEN.zMin, o[2])),
  ]
}

/** Alle gespeicherten Offsets laden. Defensiv: Müll im Storage ergibt {}. */
export function loadVRPanelOffsets(): Record<string, PanelOffset> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const result: Record<string, PanelOffset> = {}
    for (const [id, offset] of Object.entries(parsed)) {
      if (istPanelOffset(offset)) result[id] = clampOffset(offset)
    }
    return result
  } catch {
    return {}
  }
}

/** Gespeicherten Offset eines Panels holen (null wenn keiner existiert). */
export function getVRPanelOffset(id: string): PanelOffset | null {
  return loadVRPanelOffsets()[id] ?? null
}

/** Offset eines Panels speichern (wird vor dem Schreiben geclampt). */
export function saveVRPanelOffset(id: string, offset: PanelOffset): void {
  try {
    const alle = loadVRPanelOffsets()
    alle[id] = clampOffset(offset)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alle))
  } catch {
    // Storage voll oder blockiert — Verschieben funktioniert weiter,
    // nur die Persistenz über die Session hinaus entfällt.
  }
}

/** Offset eines Panels löschen (Panel kehrt zur Default-Position zurück). */
export function clearVRPanelOffset(id: string): void {
  try {
    const alle = loadVRPanelOffsets()
    if (!(id in alle)) return
    delete alle[id]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alle))
  } catch {
    // siehe saveVRPanelOffset
  }
}
