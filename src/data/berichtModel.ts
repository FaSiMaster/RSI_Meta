// berichtModel.ts — reine Aufbereitung der Berichtsdaten (v0.11.0)
//
// Trennt die Datenlogik vom PDF-Rendering: hier entstehen die Zeilen, die
// `utils/pdfExport.ts` nur noch setzt. Keine React-, keine pdfmake-Abhaengigkeit,
// damit die Aufbereitung testbar bleibt (Vorbild: ergebnisModel.ts).
//
// Die normativen Matrizen kommen unveraendert aus scoringEngine.ts (Sacred) —
// hier wird nur aufgerufen, nie nachgebildet.

import { calcRelevanzSD, calcUnfallrisiko } from './scoringEngine'
import { KRITERIUM_LABELS } from './kriteriumLabels'
import { MAX_PUNKTE_PRO_DEFIZIT } from './scoreCalc'
import { ml, type AppDeficit, type AppScene, type DefizitResult, type SceneResult } from './appData'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// ── Eine Beurteilungskette (Wichtigkeit → Abweichung → Relevanz → Schwere → Risiko) ──
export interface Beurteilung {
  wichtigkeit:   RSIDimension
  abweichung:    RSIDimension
  relevanzSD:    ResultDimension
  unfallschwere: NACADimension
  unfallrisiko:  ResultDimension
  naca?:         number
}

export interface BerichtDefizit {
  nr:             number
  deficitId:      string
  name:           string
  beschreibung:   string
  kriteriumLabel: string
  kontext:        'io' | 'ao'
  normRefs:       string[]
  isPflicht:      boolean
  gefunden:       boolean
  /** Sollbeurteilung gemaess Musterloesung. */
  soll:           Beurteilung
  /**
   * Beurteilung des Teilnehmers. Fehlt, wenn das Defizit nicht gefunden wurde
   * oder wenn das Resultat vor v0.11.0 entstand (damals wurde nur gespeichert,
   * OB die Antwort stimmte, nicht welche).
   */
  ist:            Beurteilung | null
  kategorieRichtig: boolean | null
  punkteFinal:    number | null
  punkteMax:      number
  hintAbzug:      number
}

export interface TeilnehmerBericht {
  teilnehmer:      string
  szene:           string
  szeneBeschreibung: string
  thema:           string | null
  kurs:            string | null
  datumIso:        string
  dauerSekunden:   number
  versuch:         number
  punkte:          number
  maxPunkte:       number
  prozent:         number
  bestanden:       boolean | null
  gefunden:        number
  total:           number
  pflichtGefunden: number | null
  pflichtTotal:    number | null
  defizite:        BerichtDefizit[]
}

/** Beurteilungskette aus den drei Eingaben ableiten (Schritte 5 und 9 automatisch). */
export function ketteAus(
  wichtigkeit: RSIDimension,
  abweichung: RSIDimension,
  unfallschwere: NACADimension,
  naca?: number,
): Beurteilung {
  const relevanzSD = calcRelevanzSD(wichtigkeit, abweichung)
  return {
    wichtigkeit,
    abweichung,
    relevanzSD,
    unfallschwere,
    unfallrisiko: calcUnfallrisiko(relevanzSD, unfallschwere),
    naca,
  }
}

/**
 * Baut die Befundliste einer Szene: alle Defizite, gefundene zuerst,
 * innerhalb der Gruppe in der Reihenfolge der Bewertung.
 */
export function baueDefizitListe(
  deficits: AppDeficit[],
  defizitResults: DefizitResult[],
  lang: string,
): BerichtDefizit[] {
  const resultMap = new Map(defizitResults.map(r => [r.deficitId, r]))
  // Reihenfolge: erst wie bewertet, dann die nicht gefundenen in Datenreihenfolge
  const reihenfolge = [
    ...defizitResults.map(r => r.deficitId).filter(id => deficits.some(d => d.id === id)),
    ...deficits.filter(d => !resultMap.has(d.id)).map(d => d.id),
  ]

  return reihenfolge.map((id, i) => {
    const d = deficits.find(x => x.id === id)!
    const r = resultMap.get(id) ?? null
    const ca = d.correctAssessment

    // Ist-Kette nur, wenn der Teilnehmer das Defizit gefunden UND das Resultat
    // die abgegebenen Werte gespeichert hat (ab v0.11.0).
    const hatIst = r != null
      && r.userWichtigkeit != null
      && r.userAbweichung != null
      && r.userUnfallschwere != null

    return {
      nr:             i + 1,
      deficitId:      d.id,
      name:           ml(d.nameI18n, lang),
      beschreibung:   ml(d.beschreibungI18n, lang),
      kriteriumLabel: KRITERIUM_LABELS[d.kriteriumId] ?? d.kriteriumId,
      kontext:        d.kontext,
      normRefs:       d.normRefs ?? [],
      isPflicht:      d.isPflicht,
      gefunden:       r != null,
      soll: {
        wichtigkeit:   ca.wichtigkeit,
        abweichung:    ca.abweichung,
        relevanzSD:    ca.relevanzSD,
        unfallschwere: ca.unfallschwere,
        unfallrisiko:  ca.unfallrisiko,
        naca:          ca.naca,
      },
      ist: hatIst
        ? ketteAus(r!.userWichtigkeit!, r!.userAbweichung!, r!.userUnfallschwere!)
        : null,
      kategorieRichtig: r ? r.kategorieRichtig : null,
      punkteFinal:      r ? r.punkteFinal : null,
      punkteMax:        MAX_PUNKTE_PRO_DEFIZIT,
      hintAbzug:        r ? (r.hintAbzug ?? (r.hintPenalty ? 25 : 0)) : 0,
    }
  })
}

/** Vollstaendiger Bericht aus einem lokalen SceneResult. */
export function baueTeilnehmerBericht(
  result: SceneResult,
  scene: AppScene,
  deficits: AppDeficit[],
  lang: string,
  themaName: string | null,
  kursName: string | null,
): TeilnehmerBericht {
  return {
    teilnehmer:        result.username,
    szene:             ml(scene.nameI18n, lang),
    szeneBeschreibung: ml(scene.beschreibungI18n, lang),
    thema:             themaName,
    kurs:              kursName,
    datumIso:          result.timestamp,
    dauerSekunden:     result.dauerSekunden,
    versuch:           result.versuch,
    punkte:            result.punkte,
    maxPunkte:         result.maxPunkte,
    prozent:           result.prozent,
    bestanden:         result.bestanden ?? null,
    gefunden:          result.gefunden,
    total:             result.total,
    pflichtGefunden:   result.pflichtGefunden ?? null,
    pflichtTotal:      result.pflichtTotal ?? null,
    defizite:          baueDefizitListe(deficits, result.defizitResults, lang),
  }
}

// ── Formatierung ────────────────────────────────────────────────────────────

/** Schweizer Zahlenformat mit Apostroph-Tausendertrennung. */
export function fmtZahl(n: number): string {
  return n.toLocaleString('de-CH')
}

export function fmtDauer(sekunden: number): string {
  const min = Math.floor(sekunden / 60)
  const sek = sekunden % 60
  return min === 0 ? `${sek} s` : `${min} min ${sek} s`
}

export function fmtDatum(iso: string, lang: string): string {
  const locale = lang === 'fr' ? 'fr-CH' : lang === 'it' ? 'it-CH' : lang === 'en' ? 'en-GB' : 'de-CH'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
