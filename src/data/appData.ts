// localStorage-basierter Datenspeicher – RSI VR Tool Phase 2/3
// Typen gemaess Spezifikation TBA-Fachkurs FK RSI

import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import type { NacaRaw } from './scoringEngine'
import type { DefizitVerortung } from '../utils/sphereCoords'

// ── Typen ──

export interface MultiLang { de: string; fr: string; it: string; en: string }

export type DefizitKategorie =
  | 'verkehrsfuehrung'
  | 'sicht'
  | 'ausruestung'
  | 'zustand'
  | 'strassenrand'
  | 'verkehrsablauf'
  | 'baustelle'

export interface StrassenMerkmal {
  id?: string
  labelI18n: MultiLang
  wertI18n: MultiLang
}

export interface AppTopic {
  id: string
  nameI18n: MultiLang
  beschreibungI18n: MultiLang
  iconKey?: 'walk' | 'bike' | 'junction' | 'construction'
  sortOrder: number
  isActive: boolean
  parentTopicId?: string | null
  gruppenId?: string | null
  createdAt?: number
}

// Perspektive innerhalb einer Szene (mehrere Blickwinkel auf dieselben Defizite)
export interface Perspektive {
  id: string
  label: string                    // z.B. "Standort A", "Gegenrichtung"
  bildUrl: string                  // Panorama-URL fuer diese Perspektive
  startblick?: { theta: number; phi: number } | null
}

export interface AppScene {
  id: string
  topicId: string
  nameI18n: MultiLang
  beschreibungI18n?: MultiLang
  kontext: 'io' | 'ao'
  bildUrl?: string
  strassenmerkmale?: StrassenMerkmal[]
  // Legacy-Feld (array); neue Felder vorschauBild1/2 haben Vorrang
  vorschauBilder?: string[]
  // Vorschaubilder: null = kein Bild, 'panorama' = Panoramabild uebernehmen, sonst URL/base64
  vorschauBild1?: string | null
  vorschauBild2?: string | null
  panoramaBildUrl?: string | null
  startblick?: { theta: number; phi: number } | null
  // Perspektiven: mehrere Panorama-Bilder pro Szene (Standortwechsel)
  perspektiven?: Perspektive[]
  isActive: boolean
}

export interface AppDeficit {
  id: string
  sceneId: string
  topicId: string
  nameI18n: MultiLang
  beschreibungI18n: MultiLang
  kriteriumId: string
  kontext: 'io' | 'ao'
  correctAssessment: {
    wichtigkeit:   RSIDimension
    abweichung:    RSIDimension
    relevanzSD:    ResultDimension
    naca:          NacaRaw
    unfallschwere: NACADimension
    unfallrisiko:  ResultDimension
  }
  isPflicht:  boolean
  isBooster:  boolean
  normRefs:   string[]
  // Sphärische Position im 360°-Bild (theta=0–360, phi=0–180)
  position?:  { theta: number; phi: number }
  tolerance?: number          // Trefferradius in Grad (default: 15)
  kategorie?: DefizitKategorie
  verortung?: DefizitVerortung | null
  // Verortung pro Perspektive (Key = Perspektive.id)
  verortungen?: Record<string, DefizitVerortung> | null
}

export interface UserSession {
  username: string
  score: number
  completedScenes: string[]
  kursId?: string | null
  kursName?: string | null
}

export interface RankingEntry {
  id?: string
  username: string
  score: number
  scenesCount: number
  timestamp: string
  kursId?: string | null
  stunde?: string | null
}

// Gefundenes Defizit innerhalb einer Szenen-Session
export interface FoundDeficit {
  deficitId:        string
  kategorieRichtig: boolean
  pointsEarned:     number
  hintPenalty:      boolean
}

// ── Neues Punktesystem: SceneResult (Best-of) ──

// Einzelnes Defizit-Resultat innerhalb eines Versuchs
export interface DefizitResult {
  deficitId:           string
  kategorieRichtig:    boolean
  hintPenalty:         boolean
  punkteRoh:           number    // Vor Strafen
  punkteFinal:         number    // Nach Strafen (Kategorie + Hint)
  dauerSekunden:       number    // Zeit für diese Bewertung
  wichtigkeitKorrekt:  boolean
  abweichungKorrekt:   boolean
  nacaKorrekt:         boolean
}

// Gesamtergebnis eines Szenen-Durchlaufs
export interface SceneResult {
  id:              string
  sceneId:         string
  topicId:         string
  username:        string
  punkte:          number       // Summe punkteFinal aller Defizite
  maxPunkte:       number       // Maximale erreichbare Punkte
  prozent:         number       // 0–100
  gefunden:        number       // Anzahl gefundene Defizite
  total:           number       // Anzahl Defizite in Szene
  versuch:         number       // Versuchsnummer (1-basiert)
  timestamp:       string       // ISO
  dauerSekunden:   number       // Gesamtdauer der Szene
  kursId:          string | null
  defizitResults:  DefizitResult[]
}

// Sterne-Berechnung (1-3 basierend auf Prozent)
export function berechneSterne(prozent: number): 1 | 2 | 3 {
  if (prozent >= 90) return 3
  if (prozent >= 60) return 2
  return 1
}

// Laufende Szenen-Session (fuer Wiederherstellung bei Browser-Reload)
export interface SceneSession {
  sceneId:       string
  startedAt:     number
  hintUsed:      boolean
  foundDeficits: FoundDeficit[]
  totalScore:    number
  completed:     boolean
}

// Kurs
export interface Kurs {
  id: string
  name: string
  datum: string
  zugangscode: string
  topicIds: string[]
  isActive: boolean
  createdAt: number
  gueltigVon: number | null
  gueltigBis: number | null
  passwort:   string | null
}

// Topic-Hierarchie-Knoten
export interface TopicNode {
  topic: AppTopic
  children: AppTopic[]
}

// ── Schema-Version (bei Breaking Changes erhoehen) ──
// Wird beim Start geprueft. Bei Mismatch: Seed-Daten neu schreiben,
// User-Daten (SceneResults, Session) bleiben erhalten.
const SCHEMA_VERSION  = 2
const K_SCHEMA        = 'rsi-v3-schema'

// ── Storage-Keys ──
const K_TOPICS        = 'rsi-v3-topics'
const K_SCENES        = 'rsi-v3-scenes'
const K_DEFICITS      = 'rsi-v3-deficits'
const K_SESSION       = 'rsi-v3-session'
const K_RANKING       = 'rsi-v3-ranking'
const K_INIT          = 'rsi-v3-init-v3'
const K_SCENE_SESSION = 'rsi-v3-scene-session'
const K_KURSE         = 'rsi-v3-kurse'
const K_SCENE_RESULTS = 'rsi-v3-scene-results'

// ── Platzhalter-Daten ──
const DEFAULT_TOPICS: AppTopic[] = [
  {
    "id": "fuss",
    "iconKey": "walk",
    "sortOrder": 1,
    "isActive": true,
    "nameI18n": {
      "de": "Fussverkehr",
      "fr": "Piétons",
      "it": "Pedoni",
      "en": "Pedestrians"
    },
    "beschreibungI18n": {
      "de": "Gehwege, Querungen und Fussgängerbereiche.",
      "fr": "Trottoirs et traversées.",
      "it": "Marciapiedi e attraversamenti.",
      "en": "Footpaths and crossings."
    }
  },
  {
    "id": "velo",
    "iconKey": "bike",
    "sortOrder": 2,
    "isActive": true,
    "nameI18n": {
      "de": "Veloverkehr",
      "fr": "Cyclistes",
      "it": "Ciclisti",
      "en": "Cyclists"
    },
    "beschreibungI18n": {
      "de": "Radwege, Radstreifen und Knotenpunkte.",
      "fr": "Pistes et bandes cyclables.",
      "it": "Piste e corsie ciclabili.",
      "en": "Cycle paths and lanes."
    }
  },
  {
    "id": "knoten",
    "iconKey": "junction",
    "sortOrder": 3,
    "isActive": true,
    "nameI18n": {
      "de": "Knotenpunkte",
      "fr": "Carrefours",
      "it": "Incroci",
      "en": "Junctions"
    },
    "beschreibungI18n": {
      "de": "Sichtweiten und Vorfahrtsregelungen.",
      "fr": "Visibilité et priorités.",
      "it": "Visibilità e precedenze.",
      "en": "Sight lines and priority."
    }
  },
  {
    "id": "bau",
    "iconKey": "construction",
    "sortOrder": 99,
    "isActive": true,
    "nameI18n": {
      "de": "Baustellen",
      "fr": "Chantiers",
      "it": "Cantieri",
      "en": "Construction"
    },
    "beschreibungI18n": {
      "de": "Absicherung und temporäre Führung.",
      "fr": "Sécurisation et guidage temporaire.",
      "it": "Sicurezza e guida temporanea.",
      "en": "Safety and temporary guidance."
    }
  },
  {
    "id": "tp-1774780651056",
    "nameI18n": { "de": "MIV", "fr": "", "it": "", "en": "" },
    "beschreibungI18n": {
      "de": "Motorisierter Individualverkehr im Innerorts oder Aussertorts",
      "fr": "", "it": "", "en": ""
    },
    "sortOrder": 4,
    "isActive": true,
    "parentTopicId": null,
    "createdAt": 1774780651056
  }
]

const DEFAULT_SCENES: AppScene[] = [
  {
    "id": "sc1",
    "topicId": "fuss",
    "kontext": "io",
    "isActive": true,
    "nameI18n": {
      "de": "Innerorts – Gehweg mit Querung",
      "fr": "Localité – Trottoir avec traversée",
      "it": "Zona abitata – Marciapiede con attraversamento",
      "en": "Built-up – Footpath with crossing"
    },
    "strassenmerkmale": [],
    "vorschauBilder": [],
    "vorschauBild1": null,
    "vorschauBild2": null,
    "panoramaBildUrl": "/textures/street-360.jpg"
  },
  {
    "id": "sc2",
    "topicId": "velo",
    "kontext": "ao",
    "isActive": true,
    "nameI18n": {
      "de": "Ausserorts – Hauptstrasse mit Radstreifen",
      "fr": "Hors localité – Route principale avec piste cyclable",
      "it": "Fuori zona – Strada principale con corsia ciclabile",
      "en": "Rural – Main road with cycle lane"
    },
    "strassenmerkmale": [],
    "vorschauBilder": [],
    "vorschauBild1": null,
    "vorschauBild2": null,
    "panoramaBildUrl": null
  },
  {
    "id": "sc3",
    "topicId": "knoten",
    "kontext": "io",
    "isActive": true,
    "nameI18n": {
      "de": "Kreuzung – eingeschränkte Sichtweite",
      "fr": "Carrefour – visibilité réduite",
      "it": "Incrocio – visibilità ridotta",
      "en": "Junction – restricted sight line"
    },
    "strassenmerkmale": [],
    "vorschauBilder": [],
    "vorschauBild1": null,
    "vorschauBild2": null,
    "panoramaBildUrl": null
  },
  {
    "id": "sc4",
    "topicId": "bau",
    "kontext": "ao",
    "isActive": true,
    "nameI18n": {
      "de": "Baustelle – temporäre Verkehrsführung",
      "fr": "Chantier – guidage temporaire",
      "it": "Cantiere – guida temporanea",
      "en": "Construction – temp traffic guidance"
    },
    "strassenmerkmale": [],
    "vorschauBilder": [],
    "vorschauBild1": null,
    "vorschauBild2": null,
    "panoramaBildUrl": null
  },
  {
    "id": "sc-1774784383797",
    "topicId": "fuss",
    "nameI18n": { "de": "Test_Voreinbau", "fr": "", "it": "", "en": "" },
    "beschreibungI18n": { "de": "", "fr": "", "it": "", "en": "" },
    "kontext": "io",
    "strassenmerkmale": [],
    "vorschauBilder": [],
    "vorschauBild1": null,
    "vorschauBild2": null,
    "panoramaBildUrl": "/textures/test-voreinbau.webp",
    "startblick": null,
    "isActive": true
  }
]

const DEFAULT_DEFICITS: AppDeficit[] = [
  {
    "id": "def1",
    "sceneId": "sc1",
    "topicId": "fuss",
    "kriteriumId": "fussgaengerfuehrung_geometrie",
    "kontext": "io",
    "isPflicht": true,
    "isBooster": false,
    "normRefs": ["VSS SN 640 075", "SN 641 723"],
    "nameI18n": {
      "de": "Fehlende Absenkung",
      "fr": "Abaissement absent",
      "it": "Abbassamento mancante",
      "en": "Missing kerb drop"
    },
    "beschreibungI18n": {
      "de": "Bordstein an Querungsstelle nicht abgesenkt — Barrierefreiheit verletzt.",
      "fr": "Bordure non abaissée à la traversée.",
      "it": "Cordolo non ribassato all'attraversamento.",
      "en": "Kerb not dropped at crossing."
    },
    "correctAssessment": {
      "wichtigkeit": "mittel", "abweichung": "gross", "relevanzSD": "hoch",
      "naca": 2, "unfallschwere": "mittel", "unfallrisiko": "hoch"
    },
    "verortung": {
      "typ": "punkt",
      "position": { "theta": 134.11226153702032, "phi": 115.1599900810341 },
      "toleranz": 15
    }
  },
  {
    "id": "def2",
    "sceneId": "sc1",
    "topicId": "fuss",
    "kriteriumId": "erkennungsdistanz",
    "kontext": "io",
    "isPflicht": true,
    "isBooster": false,
    "normRefs": ["SN 640 273", "SN 641 723"],
    "nameI18n": {
      "de": "Sichtbehinderung Hecke",
      "fr": "Obstruction par haie",
      "it": "Ostacolo alla visibilità",
      "en": "Visibility obstruction – hedge"
    },
    "beschreibungI18n": {
      "de": "Hecke ragt in Sichtraum, Fahrzeuge werden zu spaat erkannt.",
      "fr": "Haie dans la zone de visibilité.",
      "it": "Siepe nella zona di visibilità.",
      "en": "Hedge intrudes into sight zone."
    },
    "correctAssessment": {
      "wichtigkeit": "mittel", "abweichung": "mittel", "relevanzSD": "mittel",
      "naca": 3, "unfallschwere": "mittel", "unfallrisiko": "mittel"
    },
    "verortung": {
      "typ": "polygon",
      "punkte": [
        { "theta": 243.91863827686265, "phi": 105.63321265598167 },
        { "theta": 261.96900157656273, "phi": 122.17972081528326 },
        { "theta": 271.99698118750723, "phi": 112.15153405207016 },
        { "theta": 255.95221380999604, "phi": 98.61348192173249 },
        { "theta": 243.41723929631544, "phi": 102.62475662701773 },
        { "theta": 243.41723929631544, "phi": 102.62475662701773 }
      ],
      "toleranz": 15
    }
  },
  {
    "id": "def3",
    "sceneId": "sc2",
    "topicId": "velo",
    "kriteriumId": "velolaengsfuehrung_art",
    "kontext": "ao",
    "isPflicht": true,
    "isBooster": false,
    "normRefs": ["SN 640 238", "SN 641 723"],
    "nameI18n": {
      "de": "Unterbrochener Radstreifen",
      "fr": "Piste cyclable interrompue",
      "it": "Corsia ciclabile interrotta",
      "en": "Interrupted cycle lane"
    },
    "beschreibungI18n": {
      "de": "Radstreifen endet vor Kreuzung ohne Weiterführung.",
      "fr": "Piste cyclable interrompue avant le carrefour.",
      "it": "Corsia ciclabile interrotta prima dell'incrocio.",
      "en": "Cycle lane ends before junction."
    },
    "correctAssessment": {
      "wichtigkeit": "gross", "abweichung": "gross", "relevanzSD": "hoch",
      "naca": 3, "unfallschwere": "mittel", "unfallrisiko": "hoch"
    }
  },
  {
    "id": "def4",
    "sceneId": "sc3",
    "topicId": "knoten",
    "kriteriumId": "markierung",
    "kontext": "io",
    "isPflicht": false,
    "isBooster": true,
    "normRefs": ["SN 640 852", "SN 641 723"],
    "nameI18n": {
      "de": "Fehlende Wartelinie",
      "fr": "Ligne d'attente manquante",
      "it": "Linea d'attesa mancante",
      "en": "Missing stop line"
    },
    "beschreibungI18n": {
      "de": "Keine Wartelinie vor Knotenpunkt erkennbar.",
      "fr": "Aucune ligne d'attente visible avant le carrefour.",
      "it": "Nessuna linea d'attesa prima dell'incrocio.",
      "en": "No stop line visible before junction."
    },
    "correctAssessment": {
      "wichtigkeit": "mittel", "abweichung": "mittel", "relevanzSD": "mittel",
      "naca": 2, "unfallschwere": "mittel", "unfallrisiko": "mittel"
    }
  },
  {
    "id": "d-1774784423874",
    "sceneId": "sc-1774784383797",
    "topicId": "fuss",
    "nameI18n": { "de": "Test1", "fr": "", "it": "", "en": "" },
    "beschreibungI18n": { "de": "", "fr": "", "it": "", "en": "" },
    "kriteriumId": "visuelle_linienfuehrung",
    "kontext": "io",
    "correctAssessment": {
      "wichtigkeit": "gross", "abweichung": "gross", "relevanzSD": "hoch",
      "naca": 7, "unfallschwere": "schwer", "unfallrisiko": "hoch"
    },
    "isPflicht": true,
    "isBooster": true,
    "normRefs": ["SN 641 723"],
    "verortung": {
      "typ": "punkt",
      "position": { "theta": 271.99698118750723, "phi": 132.0718240138629 },
      "toleranz": 15
    }
  },
  {
    "id": "d-1774784555731",
    "sceneId": "sc-1774784383797",
    "topicId": "fuss",
    "nameI18n": { "de": "Test 2", "fr": "", "it": "", "en": "" },
    "beschreibungI18n": { "de": "Test 2", "fr": "", "it": "", "en": "" },
    "kriteriumId": "angebot_vertraeglichkeit",
    "kontext": "io",
    "correctAssessment": {
      "wichtigkeit": "gross", "abweichung": "gross", "relevanzSD": "hoch",
      "naca": 7, "unfallschwere": "schwer", "unfallrisiko": "hoch"
    },
    "isPflicht": true,
    "isBooster": false,
    "normRefs": ["SN 641 723"],
    "verortung": {
      "typ": "polygon",
      "punkte": [
        { "theta": 27.815677661008575, "phi": 79.13005278615879 },
        { "theta": 57.39821751329486, "phi": 133.09650345697978 },
        { "theta": 125.58847886771748, "phi": 130.70558475637375 },
        { "theta": 151.15982687562598, "phi": 102.69767997784642 },
        { "theta": 252.9438199267127, "phi": 101.33144072035728 },
        { "theta": 266.4815924014878, "phi": 80.49629204364793 },
        { "theta": 223.86267905497363, "phi": 64.44298076815055 },
        { "theta": 122.58008498443414, "phi": 66.49233965438425 },
        { "theta": 69.43179304642827, "phi": 57.270224666332574 },
        { "theta": 30.322672563744703, "phi": 77.42225371429737 },
        { "theta": 30.322672563744703, "phi": 77.42225371429737 }
      ],
      "toleranz": 15
    }
  }
]

const DEFAULT_KURSE_SEED: Kurs[] = [
  {
    "id": "k-1774780717922",
    "name": "FK RSI 03/2027",
    "datum": "2026-03-29",
    "zugangscode": "FaSi4safety",
    "topicIds": ["fuss", "velo", "knoten", "bau", "tp-1774780651056"],
    "isActive": true,
    "createdAt": 1774780717922,
    "gueltigVon": null,
    "gueltigBis": null,
    "passwort": null
  }
]

const DEFAULT_RANKING: RankingEntry[] = [
  { id: 'seed-1', username: 'RSI_Expert',     score: 1500, scenesCount: 4, timestamp: '2026-01-10T10:00:00Z', kursId: null, stunde: '2026-01-10' },
  { id: 'seed-2', username: 'Max Muster',     score: 1250, scenesCount: 3, timestamp: '2026-01-11T09:30:00Z', kursId: null, stunde: '2026-01-11' },
  { id: 'seed-3', username: 'SicherheitsPro', score: 980,  scenesCount: 2, timestamp: '2026-01-12T14:20:00Z', kursId: null, stunde: '2026-01-12' },
]

// ── Hilfsfunktionen ──
function initIfNeeded(): void {
  // Schema-Versionscheck: bei Mismatch Seed-Daten neu schreiben
  const storedVersion = parseInt(localStorage.getItem(K_SCHEMA) ?? '0', 10)
  if (storedVersion < SCHEMA_VERSION) {
    console.info(`[RSI] Schema-Migration: v${storedVersion} → v${SCHEMA_VERSION}`)
    // Seed-Daten neu schreiben (nur wenn noch nie initialisiert oder Schema veraltet)
    if (!localStorage.getItem(K_INIT)) {
      localStorage.setItem(K_TOPICS,   JSON.stringify(DEFAULT_TOPICS))
      localStorage.setItem(K_SCENES,   JSON.stringify(DEFAULT_SCENES))
      localStorage.setItem(K_DEFICITS, JSON.stringify(DEFAULT_DEFICITS))
      localStorage.setItem(K_RANKING,  JSON.stringify(DEFAULT_RANKING))
      localStorage.setItem(K_KURSE,    JSON.stringify(DEFAULT_KURSE_SEED))
      localStorage.setItem(K_INIT, '1')
    }
    // Schema-Version aktualisieren
    localStorage.setItem(K_SCHEMA, String(SCHEMA_VERSION))
    return
  }

  // Normale Initialisierung (erste Nutzung)
  if (localStorage.getItem(K_INIT)) return
  localStorage.setItem(K_TOPICS,   JSON.stringify(DEFAULT_TOPICS))
  localStorage.setItem(K_SCENES,   JSON.stringify(DEFAULT_SCENES))
  localStorage.setItem(K_DEFICITS, JSON.stringify(DEFAULT_DEFICITS))
  localStorage.setItem(K_RANKING,  JSON.stringify(DEFAULT_RANKING))
  localStorage.setItem(K_KURSE,    JSON.stringify(DEFAULT_KURSE_SEED))
  localStorage.setItem(K_INIT, '1')
  localStorage.setItem(K_SCHEMA, String(SCHEMA_VERSION))
}

function readJSON<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : fallback
  } catch { return fallback }
}

function writeJSON<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error(`[RSI] localStorage-Fehler beim Speichern von "${key}":`, e)
    // Fehlermeldung als DOM-Toast statt alert() (Quest-kompatibel)
    const toast = document.createElement('div')
    toast.textContent = `Speichern fehlgeschlagen — localStorage ist voll. Bilder als URL statt Upload verwenden.`
    Object.assign(toast.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#D40053', color: 'white', padding: '12px 20px', borderRadius: '8px',
      fontSize: '13px', fontWeight: '700', zIndex: '9999', maxWidth: '90vw', textAlign: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    })
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 6000)
  }
}

export function ml(text: MultiLang, lang: string): string {
  return text[lang as keyof MultiLang] ?? text.de
}

// Verortung eines Defizits fuer eine bestimmte Perspektive ermitteln
// Bei aktiver Perspektive: NUR perspektivenspezifische Verortung (kein Fallback)
// Bei Haupt-Panorama (null): verortung als Fallback
export function getVerortungFuerPerspektive(
  deficit: AppDeficit,
  perspektivenId: string | null,
): DefizitVerortung | null {
  if (perspektivenId) {
    // Nur die perspektivenspezifische Verortung — kein Fallback auf Haupt
    return deficit.verortungen?.[perspektivenId] ?? null
  }
  return deficit.verortung ?? null
}

// ── Topics ──
export function getTopics(): AppTopic[] {
  initIfNeeded()
  return readJSON<AppTopic>(K_TOPICS, DEFAULT_TOPICS)
}
export function saveTopic(t: AppTopic): void {
  const list = getTopics()
  const i = list.findIndex(x => x.id === t.id)
  if (i >= 0) list[i] = t; else list.push(t)
  writeJSON(K_TOPICS, list)
}
export function deleteTopic(id: string): void {
  writeJSON(K_TOPICS, getTopics().filter(t => t.id !== id))
}

export function getOberthemen(): AppTopic[] {
  return getTopics().filter(t => !t.parentTopicId)
}

export function getUnterthemen(parentId: string): AppTopic[] {
  return getTopics().filter(t => t.parentTopicId === parentId)
}

export function getTopicsTree(): TopicNode[] {
  const all = getTopics()
  const oberthemen = all.filter(t => !t.parentTopicId)
  return oberthemen.map(ot => ({
    topic: ot,
    children: all.filter(t => t.parentTopicId === ot.id).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

// ── Scenes ──
export function getScenes(topicId: string): AppScene[] {
  initIfNeeded()
  return readJSON<AppScene>(K_SCENES, DEFAULT_SCENES).filter(s => s.topicId === topicId)
}
export function getAllScenes(): AppScene[] {
  initIfNeeded()
  return readJSON<AppScene>(K_SCENES, DEFAULT_SCENES)
}
export function saveScene(s: AppScene): void {
  const list = getAllScenes()
  const i = list.findIndex(x => x.id === s.id)
  if (i >= 0) list[i] = s; else list.push(s)
  writeJSON(K_SCENES, list)
}
export function deleteScene(id: string): void {
  writeJSON(K_SCENES, getAllScenes().filter(s => s.id !== id))
}

// ── Deficits ──
export function getDeficits(sceneId: string): AppDeficit[] {
  initIfNeeded()
  return readJSON<AppDeficit>(K_DEFICITS, DEFAULT_DEFICITS).filter(d => d.sceneId === sceneId)
}
export function getAllDeficits(): AppDeficit[] {
  initIfNeeded()
  return readJSON<AppDeficit>(K_DEFICITS, DEFAULT_DEFICITS)
}
export function saveDeficit(d: AppDeficit): void {
  const list = getAllDeficits()
  const i = list.findIndex(x => x.id === d.id)
  if (i >= 0) list[i] = d; else list.push(d)
  writeJSON(K_DEFICITS, list)
}
export function deleteDeficit(id: string): void {
  writeJSON(K_DEFICITS, getAllDeficits().filter(d => d.id !== id))
}

// ── Session ──
export function getSession(): UserSession {
  try {
    const raw = localStorage.getItem(K_SESSION)
    if (raw) return JSON.parse(raw) as UserSession
  } catch { /* noop */ }
  return { username: '', score: 0, completedScenes: [] }
}
export function saveSession(s: UserSession): void {
  try { localStorage.setItem(K_SESSION, JSON.stringify(s)) } catch { /* noop */ }
}

// ── SceneSession ──
export function getSceneSession(): SceneSession | null {
  try {
    const raw = localStorage.getItem(K_SCENE_SESSION)
    return raw ? JSON.parse(raw) as SceneSession : null
  } catch { return null }
}
export function saveSceneSession(s: SceneSession): void {
  try { localStorage.setItem(K_SCENE_SESSION, JSON.stringify(s)) } catch { /* noop */ }
}
export function clearSceneSession(): void {
  try { localStorage.removeItem(K_SCENE_SESSION) } catch { /* noop */ }
}

// ── Kurse ──
export function getKurse(): Kurs[] {
  return readJSON<Kurs>(K_KURSE, [])
}

export function getKurseZeitlichAktiv(): Kurs[] {
  const now = Date.now()
  return getKurse().filter(k => {
    if (!k.isActive) return false
    const vonOk = k.gueltigVon == null || k.gueltigVon <= now
    const bisOk = k.gueltigBis == null || k.gueltigBis >= now
    return vonOk && bisOk
  })
}

export function getKursStatus(k: Kurs): 'aktiv' | 'bald' | 'abgelaufen' | 'inaktiv' {
  if (!k.isActive) return 'inaktiv'
  const now = Date.now()
  if (k.gueltigBis != null && k.gueltigBis < now) return 'abgelaufen'
  if (k.gueltigVon != null && k.gueltigVon > now) return 'bald'
  return 'aktiv'
}
export function saveKurs(kurs: Kurs): void {
  const list = getKurse()
  const i = list.findIndex(x => x.id === kurs.id)
  if (i >= 0) list[i] = kurs; else list.push(kurs)
  writeJSON(K_KURSE, list)
}
export function deleteKurs(id: string): void {
  writeJSON(K_KURSE, getKurse().filter(k => k.id !== id))
}

// ── Ranking ──
export function getRanking(): RankingEntry[] {
  initIfNeeded()
  return readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING).sort((a, b) => b.score - a.score)
}

export function getRankingGesamt(): RankingEntry[] {
  return getRanking().filter(r => !r.kursId)
}

export function getRankingByKurs(kursId: string): RankingEntry[] {
  return readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING)
    .filter(r => r.kursId === kursId)
    .sort((a, b) => b.score - a.score)
}

export function getRankingByStunde(datum: string): RankingEntry[] {
  return readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING)
    .filter(r => (r.stunde ?? r.timestamp?.slice(0, 10)) === datum)
    .sort((a, b) => b.score - a.score)
}

export function saveRankingEntry(entry: RankingEntry): void {
  const SEED = ['RSI_Expert', 'Max Muster', 'SicherheitsPro']
  const list = readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING)
    .filter(r => !SEED.includes(r.username) || r.username === entry.username)

  const entryWithId: RankingEntry = {
    ...entry,
    id: entry.id ?? crypto.randomUUID(),
    stunde: entry.stunde ?? entry.timestamp.slice(0, 10),
  }

  if (entryWithId.kursId) {
    list.push(entryWithId)
  } else {
    const idx = list.findIndex(r => r.username === entryWithId.username && !r.kursId)
    if (idx >= 0) {
      list[idx].score = Math.max(list[idx].score, entryWithId.score)
      list[idx].scenesCount++
    } else {
      list.push(entryWithId)
    }
  }

  writeJSON(K_RANKING, list.sort((a, b) => b.score - a.score))
}

// ── SceneResults (Best-of Punktesystem) ──

export function getAllSceneResults(): SceneResult[] {
  return readJSON<SceneResult>(K_SCENE_RESULTS, [])
}

export function saveSceneResult(result: SceneResult): void {
  const list = getAllSceneResults()
  list.push(result)
  writeJSON(K_SCENE_RESULTS, list)
}

// Alle Resultate eines Users für eine bestimmte Szene
export function getSceneResultsForUser(username: string, sceneId: string): SceneResult[] {
  return getAllSceneResults()
    .filter(r => r.username === username && r.sceneId === sceneId)
    .sort((a, b) => b.punkte - a.punkte)
}

// Bestes Resultat eines Users für eine Szene
export function getBestResult(username: string, sceneId: string): SceneResult | null {
  const results = getSceneResultsForUser(username, sceneId)
  return results.length > 0 ? results[0] : null
}

// Anzahl Versuche eines Users für eine Szene
export function getVersuchAnzahl(username: string, sceneId: string): number {
  return getAllSceneResults().filter(r => r.username === username && r.sceneId === sceneId).length
}

// Bestes Resultat pro Szene für einen User (für Gesamt-Ranking)
export function getBestResultsPerScene(username: string): SceneResult[] {
  const all = getAllSceneResults().filter(r => r.username === username)
  const byScene = new Map<string, SceneResult>()
  all.forEach(r => {
    const existing = byScene.get(r.sceneId)
    if (!existing || r.punkte > existing.punkte) byScene.set(r.sceneId, r)
  })
  return Array.from(byScene.values())
}

// Gesamt-Score eines Users (Summe der besten Resultate pro Szene)
export function getGesamtScore(username: string): number {
  return getBestResultsPerScene(username).reduce((sum, r) => sum + r.punkte, 0)
}

// Gesamt-Ranking: alle User, sortiert nach Best-of-Summe
export function getGesamtRanking(): { username: string; score: number; szenen: number; besteProzent: number }[] {
  const all = getAllSceneResults()
  const userMap = new Map<string, SceneResult[]>()
  all.forEach(r => {
    const list = userMap.get(r.username) ?? []
    list.push(r)
    userMap.set(r.username, list)
  })

  const ranking: { username: string; score: number; szenen: number; besteProzent: number }[] = []
  userMap.forEach((results, username) => {
    const byScene = new Map<string, SceneResult>()
    results.forEach(r => {
      const existing = byScene.get(r.sceneId)
      if (!existing || r.punkte > existing.punkte) byScene.set(r.sceneId, r)
    })
    const bests = Array.from(byScene.values())
    const score = bests.reduce((s, r) => s + r.punkte, 0)
    const avgProzent = bests.length > 0 ? Math.round(bests.reduce((s, r) => s + r.prozent, 0) / bests.length) : 0
    ranking.push({ username, score, szenen: bests.length, besteProzent: avgProzent })
  })

  return ranking.sort((a, b) => b.score - a.score)
}

// Thema-Ranking: beste Resultate pro User, gefiltert nach TopicId
export function getThemaRanking(topicId: string): { username: string; score: number; szenen: number; besteProzent: number }[] {
  const all = getAllSceneResults().filter(r => r.topicId === topicId)
  const userMap = new Map<string, SceneResult[]>()
  all.forEach(r => {
    const list = userMap.get(r.username) ?? []
    list.push(r)
    userMap.set(r.username, list)
  })

  const ranking: { username: string; score: number; szenen: number; besteProzent: number }[] = []
  userMap.forEach((results, username) => {
    const byScene = new Map<string, SceneResult>()
    results.forEach(r => {
      const existing = byScene.get(r.sceneId)
      if (!existing || r.punkte > existing.punkte) byScene.set(r.sceneId, r)
    })
    const bests = Array.from(byScene.values())
    const score = bests.reduce((s, r) => s + r.punkte, 0)
    const avgProzent = bests.length > 0 ? Math.round(bests.reduce((s, r) => s + r.prozent, 0) / bests.length) : 0
    ranking.push({ username, score, szenen: bests.length, besteProzent: avgProzent })
  })

  return ranking.sort((a, b) => b.score - a.score)
}

// Kurs-Ranking: Best-of pro User, gefiltert nach KursId
export function getKursRanking(kursId: string): { username: string; score: number; szenen: number; besteProzent: number }[] {
  const all = getAllSceneResults().filter(r => r.kursId === kursId)
  const userMap = new Map<string, SceneResult[]>()
  all.forEach(r => {
    const list = userMap.get(r.username) ?? []
    list.push(r)
    userMap.set(r.username, list)
  })

  const ranking: { username: string; score: number; szenen: number; besteProzent: number }[] = []
  userMap.forEach((results, username) => {
    const byScene = new Map<string, SceneResult>()
    results.forEach(r => {
      const existing = byScene.get(r.sceneId)
      if (!existing || r.punkte > existing.punkte) byScene.set(r.sceneId, r)
    })
    const bests = Array.from(byScene.values())
    const score = bests.reduce((s, r) => s + r.punkte, 0)
    const avgProzent = bests.length > 0 ? Math.round(bests.reduce((s, r) => s + r.prozent, 0) / bests.length) : 0
    ranking.push({ username, score, szenen: bests.length, besteProzent: avgProzent })
  })

  return ranking.sort((a, b) => b.score - a.score)
}

// Szene-Ranking: alle Versuche einer Szene, sortiert nach Punkten
export function getSzeneRanking(sceneId: string): SceneResult[] {
  // Pro User nur das beste Resultat
  const all = getAllSceneResults().filter(r => r.sceneId === sceneId)
  const byUser = new Map<string, SceneResult>()
  all.forEach(r => {
    const existing = byUser.get(r.username)
    if (!existing || r.punkte > existing.punkte) byUser.set(r.username, r)
  })
  return Array.from(byUser.values()).sort((a, b) => b.punkte - a.punkte)
}

// Admin: Durchschnittliche Erkennungszeit pro Defizit (für Schwierigkeitsgrad)
export function getDefizitStatistik(deficitId: string): { anzahlVersuche: number; durchschnittZeit: number; erkennungsRate: number } {
  const all = getAllSceneResults()
  let versuche = 0
  let totalZeit = 0
  let gefunden = 0
  all.forEach(r => {
    const dr = r.defizitResults.find(d => d.deficitId === deficitId)
    if (dr) {
      versuche++
      totalZeit += dr.dauerSekunden
      if (dr.punkteFinal > 0) gefunden++
    }
  })
  // Auch Szenen zählen wo das Defizit NICHT gefunden wurde
  const szenenMitDefizit = new Set(getAllDeficits().filter(d => d.id === deficitId).map(d => d.sceneId))
  const totalSzenenDurchlaeufe = all.filter(r => szenenMitDefizit.has(r.sceneId)).length
  return {
    anzahlVersuche: versuche,
    durchschnittZeit: versuche > 0 ? Math.round(totalZeit / versuche) : 0,
    erkennungsRate: totalSzenenDurchlaeufe > 0 ? Math.round((gefunden / totalSzenenDurchlaeufe) * 100) : 0,
  }
}
