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
//
// ── Dritte Bedingung: Gestaltungsbefunde erkennen (v0.20.0, Befund B-5) ────
//
// Die Konvention der Unfallkommission hat zwei Schritte, und der erste ist der
// wichtigere: erkennen, ob ein Befund überhaupt sicherheitsrelevant ist. Genau
// dort war die Szene Niederfrauendorf zu bestehen, ohne den Schritt zu
// beherrschen. Gerechnet: Wer in Schritt 1 immer «Sicherheitsdefizit» und in
// Schritt 2 immer «gross» antwortet, erreicht 61,0 % von 820 Punkten und liegt
// acht Punkte über der Schwelle. Ursache ist die Verteilung der Einstufungen,
// fünfmal gross gegen zweimal mittel: «immer gross» trifft fünf von sieben.
//
// Zwei Wege standen im Entscheidjournal, und beide sind schlechter. Eine höhere
// Schwelle wäre eine Zahl ohne Begründung und träfe auch den, der Schritt 1
// beherrscht. Ein weiterer Befund mit der Einstufung «klein» wirkt kaum: er
// bringt selbst Schritt-1-Punkte mit, und gerechnet ergibt er 60,9 % — das
// Nullmodell bestünde weiter.
//
// Diese Bedingung trifft die Ursache: Wer einen Gestaltungsbefund für ein
// Sicherheitsdefizit hält, hat ihn verkannt, und dann ist die Szene nicht
// bestanden, unabhängig von der Punktzahl. Für das Nullmodell heisst das null
// von zwei erkannt, also durchgefallen; wer Schritt 1 beherrscht, erfüllt sie
// von selbst.
//
// Für Szenen des Schweizer Neunschrittpfades ändert sie nichts: dort gibt es
// keine Gestaltungsbefunde, und eine Bedingung über eine leere Menge ist
// erfüllt. Deshalb steht sie im Default und nicht nur bei einer Szene.

import type { AppScene, AppDeficit, DefizitResult } from './appData'
import { alsUko } from './bewertung'

export interface BestandenKriterium {
  allePflicht: boolean
  minProzent: number | null
  /**
   * Jeder Gestaltungsbefund muss in Schritt 1 als solcher erkannt sein.
   * Ohne Gestaltungsbefunde in der Szene ohne Wirkung.
   */
  gestaltungErkannt: boolean
}

export const BESTANDEN_DEFAULT: BestandenKriterium = {
  allePflicht: true,
  minProzent: 60,
  gestaltungErkannt: true,
}

/** Effektives Kriterium einer Szene: Default, überschrieben durch Szenen-Override. */
export function kriteriumFuerSzene(scene: Pick<AppScene, 'bestandenKriterium'> | null | undefined): BestandenKriterium {
  const o = scene?.bestandenKriterium
  return {
    allePflicht: o?.allePflicht ?? BESTANDEN_DEFAULT.allePflicht,
    minProzent: o?.minProzent === undefined ? BESTANDEN_DEFAULT.minProzent : o.minProzent,
    gestaltungErkannt: o?.gestaltungErkannt ?? BESTANDEN_DEFAULT.gestaltungErkannt,
  }
}

/**
 * Stand der Gestaltungsbefunde einer Szene.
 *
 * `total` zählt die Befunde, deren Musterlösung «gestaltung» ist; `erkannt`
 * jene, bei denen Schritt 1 stimmte. Ein Befund, der nicht gefunden wurde,
 * zählt nicht als erkannt — genau wie ein Pflichtdefizit, das niemand fand.
 */
export interface GestaltungStand {
  total: number
  erkannt: number
}

export const OHNE_GESTALTUNG: GestaltungStand = { total: 0, erkannt: 0 }

/**
 * Stand der Gestaltungsbefunde aus Defiziten und Einzelresultaten.
 *
 * Gezählt wird die Musterlösung, nicht die Antwort: `total` sind die Befunde,
 * deren Art «gestaltung» ist. Als erkannt gilt nur, wessen Resultat Schritt 1
 * ausdrücklich als richtig führt — ein Befund ohne Resultat wurde nicht
 * gefunden und ist damit auch nicht erkannt.
 */
export function gestaltungStand(
  deficits: Pick<AppDeficit, 'id' | 'correctAssessment'>[],
  results: Pick<DefizitResult, 'deficitId' | 'ukoSchritt1Korrekt'>[],
): GestaltungStand {
  const nachId = new Map(results.map(r => [r.deficitId, r]))
  let total = 0
  let erkannt = 0
  for (const d of deficits) {
    const uko = alsUko(d.correctAssessment)
    if (!uko || uko.schritt1 !== 'gestaltung') continue
    total++
    if (nachId.get(d.id)?.ukoSchritt1Korrekt === true) erkannt++
  }
  return { total, erkannt }
}

/** Bestanden-Prüfung. Bei pflichtTotal 0 zählt nur die Prozent-Schwelle. */
export function istBestanden(
  prozent: number,
  pflichtGefunden: number,
  pflichtTotal: number,
  kriterium: BestandenKriterium = BESTANDEN_DEFAULT,
  gestaltung: GestaltungStand = OHNE_GESTALTUNG,
): boolean {
  if (kriterium.allePflicht && pflichtGefunden < pflichtTotal) return false
  if (kriterium.minProzent != null && prozent < kriterium.minProzent) return false
  if (kriterium.gestaltungErkannt && gestaltung.erkannt < gestaltung.total) return false
  return true
}
