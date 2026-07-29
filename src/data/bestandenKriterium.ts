// bestandenKriterium.ts – Bestanden-Logik für Szenen (Review R-09, v0.9.7)
//
// Didaktische Setzung (Entscheid Fachverantwortung 2026-07-29):
// Eine Szene gilt als bestanden, wenn alle Pflichtdefizite gefunden sind
// UND mindestens 60 % der Punkte erreicht wurden. Der Default gilt app-weit;
// pro Szene kann er über scene.bestandenKriterium überschrieben werden
// (minProzent: null = keine Prozent-Schwelle, nur Pflichtdefizite).
//
// Bewusst getrennt von scoringEngine.ts (Sacred File): das Bestanden-
// Kriterium ist Didaktik, nicht Normlogik. Sterne und Punkteberechnung
// bleiben unverändert – Bestanden läuft parallel.

import type { AppScene } from './appData'

export interface BestandenKriterium {
  allePflicht: boolean
  minProzent: number | null
}

export const BESTANDEN_DEFAULT: BestandenKriterium = {
  allePflicht: true,
  minProzent: 60,
}

/** Effektives Kriterium einer Szene: Default, überschrieben durch Szenen-Override. */
export function kriteriumFuerSzene(scene: Pick<AppScene, 'bestandenKriterium'> | null | undefined): BestandenKriterium {
  const o = scene?.bestandenKriterium
  return {
    allePflicht: o?.allePflicht ?? BESTANDEN_DEFAULT.allePflicht,
    minProzent: o?.minProzent === undefined ? BESTANDEN_DEFAULT.minProzent : o.minProzent,
  }
}

/** Bestanden-Prüfung. Bei pflichtTotal 0 zählt nur die Prozent-Schwelle. */
export function istBestanden(
  prozent: number,
  pflichtGefunden: number,
  pflichtTotal: number,
  kriterium: BestandenKriterium = BESTANDEN_DEFAULT,
): boolean {
  if (kriterium.allePflicht && pflichtGefunden < pflichtTotal) return false
  if (kriterium.minProzent != null && prozent < kriterium.minProzent) return false
  return true
}
