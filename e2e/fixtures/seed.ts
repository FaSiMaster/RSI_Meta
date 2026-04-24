// Seed-Fixtures fuer E2E-Tests.
// Saet einen minimalen Daten-Bestand direkt in localStorage, bevor die
// React-App mounten darf. Damit sind Tests unabhaengig vom Seed-Mechanismus
// in appData.ts und deterministisch gegen eine bekannte Datenlage.

import type { Page } from '@playwright/test'

// localStorage-Keys (Quelle: src/data/appData.ts — K_* Konstanten)
export const KEYS = {
  SCHEMA: 'rsi-v3-schema',
  TOPICS: 'rsi-v3-topics',
  SCENES: 'rsi-v3-scenes',
  DEFICITS: 'rsi-v3-deficits',
  SESSION: 'rsi-v3-session',
  RANKING: 'rsi-v3-ranking',
  INIT: 'rsi-v3-init-v3',
  SCENE_SESSION: 'rsi-v3-scene-session',
  KURSE: 'rsi-v3-kurse',
  SCENE_RESULTS: 'rsi-v3-scene-results',
} as const

// Minimaler Testdaten-Bestand: 1 Thema, 1 Szene, 1 Defizit, 1 Kurs (ohne Passwort).
// nameI18n deutsch = 'E2E-Test-...' damit die Specs eindeutige Selektoren haben.
export const SEED = {
  topics: [
    {
      id: 'tp-e2e',
      nameI18n: { de: 'E2E-Thema', fr: 'E2E-Thema', it: 'E2E-Thema', en: 'E2E-Thema' },
      beschreibungI18n: { de: '', fr: '', it: '', en: '' },
      sortOrder: 1,
      isActive: true,
      parentTopicId: null,
      createdAt: 1_700_000_000_000,
    },
  ],
  scenes: [
    {
      id: 'SZ_2026_E2E',
      topicId: 'tp-e2e',
      nameI18n: { de: 'E2E-Szene', fr: 'E2E-Szene', it: 'E2E-Szene', en: 'E2E-Szene' },
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
      createdAt: 1_700_000_000_000,
    },
  ],
  deficits: [
    {
      id: 'SD_0001',
      sceneId: 'SZ_2026_E2E',
      topicId: 'tp-e2e',
      nameI18n: { de: 'E2E-Defizit', fr: 'E2E-Defizit', it: 'E2E-Defizit', en: 'E2E-Defizit' },
      beschreibungI18n: { de: 'E2E-Beschreibung', fr: '', it: '', en: '' },
      kriteriumId: 'fussgaengerstreifen',
      kontext: 'io',
      correctAssessment: {
        wichtigkeit: 'mittel',
        abweichung: 'mittel',
        relevanzSD: 'mittel',
        naca: 2,
        unfallschwere: 'mittel',
        unfallrisiko: 'mittel',
      },
      isPflicht: true,
      isBooster: false,
      normRefs: ['SN 641 723'],
      verortung: null,
    },
  ],
  kurse: [
    {
      id: 'k-e2e',
      name: 'E2E-Kurs',
      datum: '2026-04-24',
      zugangscode: 'FK-RSI-E2E001',
      topicIds: ['tp-e2e'],
      isActive: true,
      createdAt: 1_700_000_000_000,
      gueltigVon: null,
      gueltigBis: null,
      passwort: null,
    },
  ],
} as const

/** Schreibt Seed-Daten in localStorage, bevor die App mountet. */
export async function seedLocalStorage(page: Page, opts: { includeKurs?: boolean } = {}): Promise<void> {
  const includeKurs = opts.includeKurs ?? true
  await page.addInitScript(
    ({ keys, seed, includeKurs }) => {
      // Muss mit SCHEMA_VERSION in src/data/appData.ts synchron sein,
      // sonst laeuft initIfNeeded() eine Migration und ueberschreibt unsere Seeds.
      window.localStorage.setItem(keys.SCHEMA, '2')
      window.localStorage.setItem(keys.INIT, '1')
      window.localStorage.setItem(keys.TOPICS, JSON.stringify(seed.topics))
      window.localStorage.setItem(keys.SCENES, JSON.stringify(seed.scenes))
      window.localStorage.setItem(keys.DEFICITS, JSON.stringify(seed.deficits))
      window.localStorage.setItem(keys.RANKING, '[]')
      window.localStorage.setItem(keys.KURSE, includeKurs ? JSON.stringify(seed.kurse) : '[]')
    },
    { keys: KEYS, seed: SEED, includeKurs },
  )
}
