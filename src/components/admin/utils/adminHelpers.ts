// Helpers für AdminDashboard — reine Funktionen + Default-Fabriken.
// Aus AdminDashboard.tsx ausgelagert (Sprint 3, 2026-04-24).
//
// WICHTIG: recompute() ruft calcRelevanzSD / nacaToSchwere / calcUnfallrisiko
// aus scoringEngine.ts auf. Die Matrizen bleiben Sacred — hier nur Aufrufer.

import {
  getAllDeficits, getAllScenes, getNextSortOrder,
  type AppTopic, type AppScene, type AppDeficit, type Kurs,
} from '../../../data/appData'
import { generateSceneId, generateDeficitId } from '../../../data/idGenerator'
import { calcRelevanzSD, calcUnfallrisiko, nacaToSchwere } from '../../../data/scoringEngine'
import { alsBfu } from '../../../data/bewertung'
import type { RSIDimension } from '../../../types'

// ── Badge-Farben ──
// Alpha 0x22 = 13% Opazitaet. color-mix() bindet an das Token, damit der
// Badge-Hintergrund im Dark-Mode automatisch mit der Token-Variante wechselt.
// Marke für die Defizitliste im Admin.
//
// Seit v0.20.0 nimmt die Funktion auch `null`: ein Befund der Konvention mit der
// Art «gestaltung» hat keine Einstufung. Dann steht ein Strich statt einer
// Stufe, damit die Liste nicht «W» zeigt, wo nichts eingestuft wurde.
export function riskBg(w: RSIDimension | null): { bg: string; color: string; label: string } {
  if (w === 'gross')  return { bg: 'color-mix(in srgb, var(--rsi-rot) 13%, transparent)',    color: 'var(--rsi-rot)',    label: 'N' }
  if (w === 'mittel') return { bg: 'color-mix(in srgb, var(--rsi-orange) 13%, transparent)', color: 'var(--rsi-orange)', label: 'A' }
  if (w === 'klein')  return { bg: 'color-mix(in srgb, var(--rsi-gruen) 13%, transparent)',  color: 'var(--rsi-gruen)',  label: 'W' }
  return { bg: 'color-mix(in srgb, var(--rsi-color-text-disabled) 13%, transparent)', color: 'var(--rsi-color-text-secondary)', label: '–' }
}

export function emptyDeficit(sceneId: string, topicId: string): AppDeficit {
  return {
    id: generateDeficitId(getAllDeficits()),
    sceneId, topicId,
    nameI18n:        { de: '', fr: '', it: '', en: '' },
    beschreibungI18n:{ de: '', fr: '', it: '', en: '' },
    kriteriumId: 'fussgaengerstreifen',
    kontext: 'io',
    correctAssessment: {
      wichtigkeit: 'mittel', abweichung: 'mittel',
      relevanzSD: 'mittel', naca: 2,
      unfallschwere: 'mittel', unfallrisiko: 'mittel',
    },
    isPflicht: true, isBooster: false,
    // Vorgabe für ein neues Defizit: die Verfahrensnorm der Inspektion.
    // Nummer nach dem Gesamt-Normenverzeichnis VSS 41 001:2024-10; für
    // «VSS 41 723» gibt es dort keinen Eintrag.
    normRefs: ['SN 641 723'],
    verortung: null,
  }
}

export function emptyScene(topicId: string): AppScene {
  return {
    id: generateSceneId(getAllScenes()),
    topicId,
    nameI18n: { de: '', fr: '', it: '', en: '' },
    beschreibungI18n: { de: '', fr: '', it: '', en: '' },
    bemerkungI18n: { de: '', fr: '', it: '', en: '' },
    kontext: 'io',
    strassenmerkmale: [],
    vorschauBilder: [],
    vorschauBild1: null,
    vorschauBild2: null,
    panoramaBildUrl: null,
    startblick: null,
    isActive: true,
    createdAt: Date.now(),
  }
}

export function emptyTopic(parentTopicId: string | null = null): AppTopic {
  return {
    id: `tp-${Date.now()}`,
    nameI18n: { de: '', fr: '', it: '', en: '' },
    beschreibungI18n: { de: '', fr: '', it: '', en: '' },
    sortOrder: getNextSortOrder(parentTopicId),
    isActive: true,
    parentTopicId,
    createdAt: Date.now(),
  }
}

export function emptyKurs(): Kurs {
  return {
    id: `k-${Date.now()}`,
    name: '',
    datum: new Date().toISOString().slice(0, 10),
    zugangscode: '',
    topicIds: [],
    isActive: true,
    createdAt: Date.now(),
    gueltigVon: null,
    gueltigBis: null,
    passwort: null,
  }
}

export function generateKursCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `FK-RSI-${digits}`
}

// Automatisch Relevanz und Unfallrisiko neu berechnen
//
// Gilt nur für den Neunschrittpfad: die beiden Matrizen sind seine Schritte 5
// und 9. Eine Bewertung nach der Konvention der Unfallkommission hat keine
// abgeleiteten Felder und wird unverändert zurückgegeben.
export function recompute(d: AppDeficit): AppDeficit {
  const ca = alsBfu(d.correctAssessment)
  if (!ca) return d
  const rs = calcRelevanzSD(ca.wichtigkeit, ca.abweichung)
  const us = nacaToSchwere(ca.naca)
  const ur = calcUnfallrisiko(rs, us)
  return {
    ...d,
    correctAssessment: {
      ...ca,
      relevanzSD: rs,
      unfallschwere: us,
      unfallrisiko: ur,
    },
  }
}

export type VorschauModus = 'kein' | 'panorama' | 'upload'

export function getVorschauModus(val: string | null | undefined): VorschauModus {
  if (!val) return 'kein'
  if (val === 'panorama') return 'panorama'
  return 'upload'
}

export type AdminTab = 'defizite' | 'themen' | 'kurse' | 'rangliste' | 'zustaendigkeit'
