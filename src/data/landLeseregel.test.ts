// Tests zur Leseregel Land (v0.16.0)
//
// Die Regel muss zwei Dinge zugleich leisten: einem Bestand ohne Feld beim
// Lesen die Schweiz zuweisen, und dabei nichts anderes verändern. Der zweite
// Teil ist der wichtigere – auf den Geräten laufen Kurse.
//
// Der Supabase-Abgleich ist ersetzt: er hält einen eigenen Zwischenspeicher im
// Modul, und der überdeckte sonst je nach Reihenfolge der Tests den
// localStorage. Geprüft wird die Leseregel, nicht der Abgleich.

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
  getTopics, saveTopic, getAllScenes, saveScene, getKurse, saveKurs,
  getRanking, saveRankingEntry, getAllSceneResults, saveSceneResult,
  getTopicCountry, filterSichtbareTopics,
  type AppTopic, type AppScene, type Kurs, type RankingEntry, type SceneResult,
} from './appData'

// Bestandsdaten, wie sie heute auf den Geräten liegen: ohne Feld `country`.
const OBERTHEMA = {
  id: 'fuss', nameI18n: { de: 'Fussverkehr', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  sortOrder: 1, isActive: true,
} as AppTopic

const UNTERTHEMA = {
  id: 'fuss-quer', parentTopicId: 'fuss',
  nameI18n: { de: 'Querungen', fr: '', it: '', en: '' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  sortOrder: 1, isActive: true,
} as AppTopic

const SZENE = {
  id: 'SZ_2026_001', topicId: 'fuss',
  nameI18n: { de: 'Kreuzung', fr: '', it: '', en: '' },
  kontext: 'io', isActive: true,
} as AppScene

const KURS = {
  id: 'k1', name: 'FK RSI', datum: '2026-09-06', zugangscode: 'FK-RSI-123456',
  topicIds: ['fuss'], isActive: true, createdAt: 0, gueltigVon: null, gueltigBis: null,
} as Kurs

const RANGEINTRAG = {
  id: 'r1', username: 'Testperson', score: 300, scenesCount: 1,
  timestamp: '2026-09-06T10:00:00Z', kursId: null, stunde: '2026-09-06',
} as RankingEntry

const ERGEBNIS = {
  id: 'e1', sceneId: 'SZ_2026_001', topicId: 'fuss', username: 'Testperson',
  punkte: 300, maxPunkte: 400, prozent: 75, gefunden: 3, total: 4, versuch: 1,
  timestamp: '2026-09-06T10:00:00Z', dauerSekunden: 120, kursId: null,
  defizitResults: [],
} as SceneResult

function bestandLegen(): void {
  localStorage.clear()
  localStorage.setItem('rsi-v3-init-v3', '1')
  localStorage.setItem('rsi-v3-schema', '2')
  localStorage.setItem('rsi-v3-topics', JSON.stringify([OBERTHEMA, UNTERTHEMA]))
  localStorage.setItem('rsi-v3-scenes', JSON.stringify([SZENE]))
  localStorage.setItem('rsi-v3-kurse', JSON.stringify([KURS]))
  localStorage.setItem('rsi-v3-ranking', JSON.stringify([RANGEINTRAG]))
  localStorage.setItem('rsi-v3-scene-results', JSON.stringify([ERGEBNIS]))
}

beforeEach(bestandLegen)

describe('Lesen: Bestand ohne Feld gilt als schweizerisch', () => {
  it('oberstes Thema', () => {
    expect(getTopics().find(t => t.id === 'fuss')?.country).toBe('CH')
  })

  it('Szene', () => {
    expect(getAllScenes()[0].country).toBe('CH')
  })

  it('Kurs', () => {
    expect(getKurse()[0].country).toBe('CH')
  })

  it('Ranglisteneintrag', () => {
    expect(getRanking()[0].country).toBe('CH')
  })

  it('Ergebnis einer Szene', () => {
    expect(getAllSceneResults()[0].country).toBe('CH')
  })

  it('ein unbekannter Wert im Bestand wird ebenso zu CH', () => {
    localStorage.setItem('rsi-v3-scenes', JSON.stringify([{ ...SZENE, country: 'XX' }]))
    expect(getAllScenes()[0].country).toBe('CH')
  })

  it('ein gesetztes Land bleibt unangetastet', () => {
    localStorage.setItem('rsi-v3-scenes', JSON.stringify([{ ...SZENE, country: 'DE' }]))
    expect(getAllScenes()[0].country).toBe('DE')
  })
})

describe('Vererbung: untergeordnete Themen tragen kein eigenes Feld', () => {
  it('das Unterthema bekommt beim Lesen keines angehängt', () => {
    const unter = getTopics().find(t => t.id === 'fuss-quer')
    expect(unter?.country).toBeUndefined()
  })

  it('sein Land ergibt sich aus dem obersten Thema', () => {
    expect(getTopicCountry('fuss-quer')).toBe('CH')
  })

  it('und folgt ihm, wenn das oberste Thema ein anderes Land trägt', () => {
    localStorage.setItem('rsi-v3-topics',
      JSON.stringify([{ ...OBERTHEMA, country: 'DE' }, UNTERTHEMA]))
    expect(getTopicCountry('fuss-quer')).toBe('DE')
    expect(getTopicCountry('fuss')).toBe('DE')
  })

  it('ein Verweis auf sich selbst läuft nicht in eine Endlosschleife', () => {
    localStorage.setItem('rsi-v3-topics',
      JSON.stringify([{ ...UNTERTHEMA, parentTopicId: 'fuss-quer' }]))
    expect(getTopicCountry('fuss-quer')).toBe('CH')
  })

  it('ein unbekanntes Thema gilt als schweizerisch', () => {
    expect(getTopicCountry('gibtesnicht')).toBe('CH')
  })
})

describe('Schreiben: beim nächsten Speichern steht das Land im Bestand', () => {
  it('Themen', () => {
    saveTopic({ ...OBERTHEMA, sortOrder: 2 })
    const roh = JSON.parse(localStorage.getItem('rsi-v3-topics') ?? '[]') as AppTopic[]
    expect(roh.find(t => t.id === 'fuss')?.country).toBe('CH')
  })

  it('Szenen', () => {
    saveScene({ ...SZENE, isActive: false })
    const roh = JSON.parse(localStorage.getItem('rsi-v3-scenes') ?? '[]') as AppScene[]
    expect(roh[0].country).toBe('CH')
  })

  it('Kurse', async () => {
    await saveKurs({ ...KURS, name: 'FK RSI 2027' })
    const roh = JSON.parse(localStorage.getItem('rsi-v3-kurse') ?? '[]') as Kurs[]
    expect(roh[0].country).toBe('CH')
  })

  it('Ranglisteneinträge', () => {
    saveRankingEntry({ ...RANGEINTRAG, id: 'r2', username: 'Zweite Person', kursId: 'k1' })
    const roh = JSON.parse(localStorage.getItem('rsi-v3-ranking') ?? '[]') as RankingEntry[]
    expect(roh.every(r => r.country === 'CH')).toBe(true)
  })

  it('Ergebnisse', () => {
    saveSceneResult({ ...ERGEBNIS, id: 'e2' })
    const roh = JSON.parse(localStorage.getItem('rsi-v3-scene-results') ?? '[]') as SceneResult[]
    expect(roh.every(r => r.country === 'CH')).toBe(true)
  })
})

describe('Nichts anderes verändert sich', () => {
  it('kein Feld geht verloren und keines kommt hinzu ausser country', () => {
    const gelesen = getAllScenes()[0] as unknown as Record<string, unknown>
    const erwartet = new Set([...Object.keys(SZENE), 'country'])
    expect(new Set(Object.keys(gelesen))).toEqual(erwartet)
  })

  it('die Werte bleiben, wie sie waren', () => {
    const gelesen = getAllScenes()[0]
    const { country, ...ohneLand } = gelesen
    expect(country).toBe('CH')
    expect(ohneLand).toEqual(SZENE)
  })

  it('die Sichtbarkeit von Themen urteilt wie zuvor', () => {
    const themen = getTopics()
    expect(filterSichtbareTopics(themen, null).map(t => t.id)).toEqual(['fuss', 'fuss-quer'])
  })

  it('die Rangliste sortiert unverändert nach Punkten', () => {
    saveRankingEntry({ ...RANGEINTRAG, id: 'r3', username: 'Beste Person', score: 900, kursId: 'k9' })
    expect(getRanking().map(r => r.score)).toEqual([900, 300])
  })
})
