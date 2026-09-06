// Wächter über die Landbindung des Kurses und die gefilterte Rangliste
//
// Zwei Regeln, die aus der Länderweiche folgen: Ein Kurs gehört zu genau einem
// Land, und die Gesamtrangliste darf sich auf ein Land einschränken lassen.
// Die zweite ist die heiklere – vor v0.16.2 summierte sie über alle Themen und
// damit über alle Länder zu einer einzigen Zahl.

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./supabaseSync', () => ({
  getTopicsSync: () => [],
  getScenesSync: () => [],
  getDeficitsSync: () => [],
  saveTopicSupabase: async () => {},
  deleteTopicSupabase: async () => {},
  saveSceneSupabase: async () => {},
  deleteSceneSupabase: async () => {},
  saveDeficitSupabase: async () => {},
  deleteDeficitSupabase: async () => {},
  saveKursSupabase: async () => {},
  deleteKursSupabase: async () => {},
}))

import {
  getTopicCountry, getGesamtRanking, getGesamtRankingFuerSzenen,
  type AppTopic, type AppScene, type SceneResult,
} from './appData'

const THEMA_CH = { id: 'ch1', country: 'CH', sortOrder: 1, isActive: true,
  nameI18n: { de: 'Schweiz', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' } } as AppTopic

const UNTERTHEMA_CH = { id: 'ch1-a', parentTopicId: 'ch1', sortOrder: 1, isActive: true,
  nameI18n: { de: 'Unterthema', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' } } as AppTopic

const THEMA_DE = { id: 'de1', country: 'DE', sortOrder: 2, isActive: true,
  nameI18n: { de: 'Deutschland', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' } } as AppTopic

const SZENE_CH = { id: 'S-CH', topicId: 'ch1', country: 'CH', kontext: 'io', isActive: true,
  nameI18n: { de: 'CH-Szene', fr: '', it: '', en: '' } } as AppScene
const SZENE_DE = { id: 'S-DE', topicId: 'de1', country: 'DE', kontext: 'io', isActive: true,
  nameI18n: { de: 'DE-Szene', fr: '', it: '', en: '' } } as AppScene

function ergebnis(id: string, sceneId: string, username: string, punkte: number): SceneResult {
  return {
    id, sceneId, topicId: sceneId === 'S-CH' ? 'ch1' : 'de1', username,
    punkte, maxPunkte: 400, prozent: Math.round((punkte / 400) * 100),
    gefunden: 1, total: 1, versuch: 1, timestamp: '2026-09-06T10:00:00Z',
    dauerSekunden: 60, kursId: null, defizitResults: [],
  } as SceneResult
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('rsi-v3-init-v3', '1')
  localStorage.setItem('rsi-v3-schema', '2')
  localStorage.setItem('rsi-v3-topics', JSON.stringify([THEMA_CH, UNTERTHEMA_CH, THEMA_DE]))
  localStorage.setItem('rsi-v3-scenes', JSON.stringify([SZENE_CH, SZENE_DE]))
  localStorage.setItem('rsi-v3-scene-results', JSON.stringify([
    ergebnis('e1', 'S-CH', 'Anna', 300),
    ergebnis('e2', 'S-DE', 'Anna', 200),
    ergebnis('e3', 'S-CH', 'Bruno', 250),
    ergebnis('e4', 'S-DE', 'Chiara', 400),
  ]))
})

describe('Land eines Themas', () => {
  it('das oberste Thema trägt es selbst', () => {
    expect(getTopicCountry('ch1')).toBe('CH')
    expect(getTopicCountry('de1')).toBe('DE')
  })

  it('das Unterthema erbt es', () => {
    expect(getTopicCountry('ch1-a')).toBe('CH')
  })
})

describe('Gesamtrangliste ohne Filter', () => {
  it('fasst wie bisher über alle Länder zusammen', () => {
    const alle = getGesamtRanking()
    // Anna: 300 aus der Schweiz plus 200 aus Deutschland. Genau diese Summe
    // ist der Grund für den Filter — sie mischt zwei Verfahren in einer Zahl.
    expect(alle.find(r => r.username === 'Anna')?.score).toBe(500)
    expect(alle.map(r => r.username)).toEqual(['Anna', 'Chiara', 'Bruno'])
  })

  it('ohne Einschränkung liefert die gefilterte Fassung dasselbe', () => {
    expect(getGesamtRankingFuerSzenen(null)).toEqual(getGesamtRanking())
  })
})

describe('Gesamtrangliste je Land', () => {
  it('die Schweiz zählt nur schweizerische Szenen', () => {
    const ch = getGesamtRankingFuerSzenen(new Set(['S-CH']))
    expect(ch.map(r => `${r.username}:${r.score}`)).toEqual(['Anna:300', 'Bruno:250'])
    expect(ch.find(r => r.username === 'Chiara')).toBeUndefined()
  })

  it('Deutschland zählt nur deutsche Szenen', () => {
    const de = getGesamtRankingFuerSzenen(new Set(['S-DE']))
    expect(de.map(r => `${r.username}:${r.score}`)).toEqual(['Chiara:400', 'Anna:200'])
  })

  it('die Reihenfolge kann sich zwischen den Ländern umkehren', () => {
    // Anna führt gesamthaft und in der Schweiz, in Deutschland führt Chiara.
    // Das ist der Punkt: eine Rangliste über zwei Länder beantwortet keine
    // Frage, die jemand gestellt hat.
    const ch = getGesamtRankingFuerSzenen(new Set(['S-CH']))
    const de = getGesamtRankingFuerSzenen(new Set(['S-DE']))
    expect(ch[0].username).toBe('Anna')
    expect(de[0].username).toBe('Chiara')
  })

  it('eine leere Menge ergibt eine leere Rangliste, keinen Fehler', () => {
    expect(getGesamtRankingFuerSzenen(new Set())).toEqual([])
  })
})
