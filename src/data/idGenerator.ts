// ID-Generatoren fuer Szenen und Defizite
//
// Konventionen (siehe memory/project_architektur_entscheidungen.md):
//   Szene:   SZ_YYYY_NNN   (Jahr + 3-stellige laufende Nummer pro Jahr)
//   Defizit: SD_NNNN       (4-stellig global durchnummeriert)
//
// Bestandsdaten mit Legacy-IDs (sc1, def1, sc-1774780651056, ...) bleiben
// unangetastet — neue Eintraege bekommen das neue Format. Migration via
// Admin-UI separat (Re-Import / manuelles Umbenennen).

import type { AppScene, AppDeficit } from './appData'

const SCENE_ID_PATTERN   = /^SZ_(\d{4})_(\d{3})$/
const DEFICIT_ID_PATTERN = /^SD_(\d{4})$/

// Naechste freie Szene-ID fuer das aktuelle Jahr.
// Sucht im uebergebenen Bestand nach hoechstem laufendem Index dieses Jahres.
export function generateSceneId(existing: AppScene[]): string {
  const year = new Date().getFullYear()
  const yearPrefix = `SZ_${year}_`

  let max = 0
  for (const scene of existing) {
    const m = scene.id.match(SCENE_ID_PATTERN)
    if (m && m[1] === String(year)) {
      const n = parseInt(m[2], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `${yearPrefix}${String(max + 1).padStart(3, '0')}`
}

// Naechste freie Defizit-ID, global durchnummeriert ueber alle Jahre.
export function generateDeficitId(existing: AppDeficit[]): string {
  let max = 0
  for (const def of existing) {
    const m = def.id.match(DEFICIT_ID_PATTERN)
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `SD_${String(max + 1).padStart(4, '0')}`
}

// Pruefen ob eine ID dem neuen Format entspricht (fuer Anzeige/Filterung).
export function isNewSceneId(id: string): boolean {
  return SCENE_ID_PATTERN.test(id)
}

export function isNewDeficitId(id: string): boolean {
  return DEFICIT_ID_PATTERN.test(id)
}

// Aus Szene-ID den Storage-Pfad-Prefix bauen.
// Wird im BildUpload genutzt um Pfad `panoramas/{szeneId}/` aufzubauen.
export function sceneIdToBucketFolder(szeneId: string): string {
  // Sicherheits-Sanitization: nur ASCII, Zahlen, Underscore erlauben
  return szeneId.replace(/[^A-Za-z0-9_-]/g, '_')
}
