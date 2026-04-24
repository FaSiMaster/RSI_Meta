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
import type { RSIDimension } from '../../../types'

// ── Badge-Farben ──
// Alpha 0x22 = 13% Opazitaet. color-mix() bindet an das Token, damit der
// Badge-Hintergrund im Dark-Mode automatisch mit der Token-Variante wechselt.
export function riskBg(w: RSIDimension): { bg: string; color: string; label: string } {
  if (w === 'gross')  return { bg: 'color-mix(in srgb, var(--zh-rot) 13%, transparent)',    color: 'var(--zh-rot)',    label: 'N' }
  if (w === 'mittel') return { bg: 'color-mix(in srgb, var(--zh-orange) 13%, transparent)', color: 'var(--zh-orange)', label: 'A' }
  return { bg: 'color-mix(in srgb, var(--zh-gruen) 13%, transparent)', color: 'var(--zh-gruen)', label: 'W' }
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
export function recompute(d: AppDeficit): AppDeficit {
  const rs = calcRelevanzSD(d.correctAssessment.wichtigkeit, d.correctAssessment.abweichung)
  const us = nacaToSchwere(d.correctAssessment.naca)
  const ur = calcUnfallrisiko(rs, us)
  return {
    ...d,
    correctAssessment: {
      ...d.correctAssessment,
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

export type AdminTab = 'defizite' | 'themen' | 'kurse' | 'rangliste'
