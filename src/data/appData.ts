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

// Strassenmerkmal (neu)
export interface StrassenMerkmal {
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

export interface AppScene {
  id: string
  topicId: string
  nameI18n: MultiLang
  beschreibungI18n?: MultiLang
  kontext: 'io' | 'ao'
  bildUrl?: string
  strassenmerkmale?: StrassenMerkmal[]
  vorschauBilder?: string[]
  panoramaBildUrl?: string | null
  startblick?: { theta: number; phi: number } | null
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
}

export interface UserSession {
  username: string
  score: number
  completedScenes: string[]
  kursId?: string | null
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

// Laufende Szenen-Session (fuer Wiederherstellung bei Browser-Reload)
export interface SceneSession {
  sceneId:       string
  startedAt:     number
  hintUsed:      boolean
  foundDeficits: FoundDeficit[]
  totalScore:    number
  completed:     boolean
}

// Kurs (neu)
export interface Kurs {
  id: string
  name: string
  datum: string
  zugangscode: string
  topicIds: string[]
  isActive: boolean
  createdAt: number
}

// Topic-Hierarchie-Knoten (neu)
export interface TopicNode {
  topic: AppTopic
  children: AppTopic[]
}

// ── Storage-Keys ──
const K_TOPICS        = 'rsi-v3-topics'
const K_SCENES        = 'rsi-v3-scenes'
const K_DEFICITS      = 'rsi-v3-deficits'
const K_SESSION       = 'rsi-v3-session'
const K_RANKING       = 'rsi-v3-ranking'
const K_INIT          = 'rsi-v3-init'
const K_SCENE_SESSION = 'rsi-v3-scene-session'
const K_KURSE         = 'rsi-v3-kurse'

// ── Platzhalter-Daten ──
const DEFAULT_TOPICS: AppTopic[] = [
  { id: 'fuss',   iconKey: 'walk',         sortOrder: 1, isActive: true, parentTopicId: null, createdAt: 1704067200000,
    nameI18n:        { de: 'Fussverkehr',  fr: 'Piétons',    it: 'Pedoni',   en: 'Pedestrians'  },
    beschreibungI18n:{ de: 'Gehwege, Querungen und Fussgaengerbereiche.', fr: 'Trottoirs et traversées.', it: 'Marciapiedi e attraversamenti.', en: 'Footpaths and crossings.' } },
  { id: 'velo',   iconKey: 'bike',         sortOrder: 2, isActive: true, parentTopicId: null, createdAt: 1704067200000,
    nameI18n:        { de: 'Veloverkehr',  fr: 'Cyclistes',  it: 'Ciclisti', en: 'Cyclists'     },
    beschreibungI18n:{ de: 'Radwege, Radstreifen und Knotenpunkte.', fr: 'Pistes et bandes cyclables.', it: 'Piste e corsie ciclabili.', en: 'Cycle paths and lanes.' } },
  { id: 'knoten', iconKey: 'junction',     sortOrder: 3, isActive: true, parentTopicId: null, createdAt: 1704067200000,
    nameI18n:        { de: 'Knotenpunkte', fr: 'Carrefours', it: 'Incroci',  en: 'Junctions'    },
    beschreibungI18n:{ de: 'Sichtweiten und Vorfahrtsregelungen.', fr: 'Visibilité et priorités.', it: 'Visibilità e precedenze.', en: 'Sight lines and priority.' } },
  { id: 'bau',    iconKey: 'construction', sortOrder: 4, isActive: true, parentTopicId: null, createdAt: 1704067200000,
    nameI18n:        { de: 'Baustellen',   fr: 'Chantiers',  it: 'Cantieri', en: 'Construction'  },
    beschreibungI18n:{ de: 'Absicherung und temporaere Fuehrung.', fr: 'Sécurisation et guidage temporaire.', it: 'Sicurezza e guida temporanea.', en: 'Safety and temporary guidance.' } },
]

const DEFAULT_SCENES: AppScene[] = [
  {
    id: 'sc1', topicId: 'fuss', kontext: 'io', isActive: true,
    startblick: null,
    nameI18n: { de: 'Innerorts – Gehweg mit Querung', fr: 'Localité – Trottoir avec traversée', it: 'Zona abitata – Marciapiede con attraversamento', en: 'Built-up – Footpath with crossing' },
    beschreibungI18n: { de: 'Innerörtliche Quartierstrasse mit Fussgaengerquerung. Beurteile Sichtverhaeltnisse, Querungsinfrastruktur und Wegfuehrung.', fr: 'Rue de quartier en localité avec traversée piétonne.', it: 'Via di quartiere con attraversamento pedonale.', en: 'Residential street with pedestrian crossing.' },
    strassenmerkmale: [
      { labelI18n: { de: 'Signalisierte Geschwindigkeit', fr: 'Vitesse signalisée', it: 'Velocità segnalata', en: 'Posted speed' }, wertI18n: { de: '50 km/h', fr: '50 km/h', it: '50 km/h', en: '50 km/h' } },
      { labelI18n: { de: 'Kontext', fr: 'Contexte', it: 'Contesto', en: 'Context' }, wertI18n: { de: 'Innerorts', fr: 'En localité', it: 'In zona abitata', en: 'Built-up area' } },
      { labelI18n: { de: 'Strassentyp', fr: 'Type de route', it: 'Tipo di strada', en: 'Road type' }, wertI18n: { de: 'Quartierstrasse', fr: 'Rue de quartier', it: 'Via di quartiere', en: 'Residential street' } },
      { labelI18n: { de: 'Verkehrsmittel', fr: 'Moyens de transport', it: 'Mezzi di trasporto', en: 'Transport modes' }, wertI18n: { de: 'MIV, Fussverkehr', fr: 'TIM, piétons', it: 'TIM, pedoni', en: 'MIV, pedestrians' } },
    ],
  },
  {
    id: 'sc2', topicId: 'velo', kontext: 'ao', isActive: true,
    startblick: null,
    nameI18n: { de: 'Ausserorts – Hauptstrasse mit Radstreifen', fr: 'Hors localité – Route principale avec piste cyclable', it: 'Fuori zona – Strada principale con corsia ciclabile', en: 'Rural – Main road with cycle lane' },
    beschreibungI18n: { de: 'Ausserörtliche Hauptstrasse mit Radstreifen. Beurteile Knotenpunkte, Veloinfrastruktur und Sichtweiten.', fr: 'Route principale hors localité avec piste cyclable.', it: 'Strada principale fuori zona con corsia ciclabile.', en: 'Rural main road with cycle lane.' },
    strassenmerkmale: [
      { labelI18n: { de: 'Signalisierte Geschwindigkeit', fr: 'Vitesse signalisée', it: 'Velocità segnalata', en: 'Posted speed' }, wertI18n: { de: '80 km/h', fr: '80 km/h', it: '80 km/h', en: '80 km/h' } },
      { labelI18n: { de: 'Kontext', fr: 'Contexte', it: 'Contesto', en: 'Context' }, wertI18n: { de: 'Ausserorts', fr: 'Hors localité', it: 'Fuori zona', en: 'Rural area' } },
      { labelI18n: { de: 'Strassentyp', fr: 'Type de route', it: 'Tipo di strada', en: 'Road type' }, wertI18n: { de: 'Hauptstrasse', fr: 'Route principale', it: 'Strada principale', en: 'Main road' } },
      { labelI18n: { de: 'Verkehrsmittel', fr: 'Moyens de transport', it: 'Mezzi di trasporto', en: 'Transport modes' }, wertI18n: { de: 'MIV, Velo', fr: 'TIM, vélo', it: 'TIM, bici', en: 'MIV, cycling' } },
    ],
  },
  {
    id: 'sc3', topicId: 'knoten', kontext: 'io', isActive: true,
    startblick: null,
    nameI18n: { de: 'Kreuzung – eingeschraenkte Sichtweite', fr: 'Carrefour – visibilité réduite', it: 'Incrocio – visibilità ridotta', en: 'Junction – restricted sight line' },
    beschreibungI18n: { de: 'Innerörtliche Kreuzung mit eingeschraenkten Sichtweiten. Beurteile Sichtraum, Markierungen und Signalisation.', fr: 'Carrefour en localité avec visibilité réduite.', it: 'Incrocio in zona con visibilità ridotta.', en: 'Junction with restricted sight lines.' },
    strassenmerkmale: [
      { labelI18n: { de: 'Signalisierte Geschwindigkeit', fr: 'Vitesse signalisée', it: 'Velocità segnalata', en: 'Posted speed' }, wertI18n: { de: '50 km/h', fr: '50 km/h', it: '50 km/h', en: '50 km/h' } },
      { labelI18n: { de: 'Kontext', fr: 'Contexte', it: 'Contesto', en: 'Context' }, wertI18n: { de: 'Innerorts', fr: 'En localité', it: 'In zona abitata', en: 'Built-up area' } },
      { labelI18n: { de: 'Strassentyp', fr: 'Type de route', it: 'Tipo di strada', en: 'Road type' }, wertI18n: { de: 'Kreuzung', fr: 'Carrefour', it: 'Incrocio', en: 'Junction' } },
      { labelI18n: { de: 'Verkehrsmittel', fr: 'Moyens de transport', it: 'Mezzi di trasporto', en: 'Transport modes' }, wertI18n: { de: 'MIV, Velo, Fussverkehr', fr: 'TIM, vélo, piétons', it: 'TIM, bici, pedoni', en: 'MIV, cycling, pedestrians' } },
    ],
  },
  {
    id: 'sc4', topicId: 'bau', kontext: 'ao', isActive: true,
    startblick: null,
    nameI18n: { de: 'Baustelle – temporaere Verkehrsfuehrung', fr: 'Chantier – guidage temporaire', it: 'Cantiere – guida temporanea', en: 'Construction – temp traffic guidance' },
    beschreibungI18n: { de: 'Ausserörtliche Baustelle mit temporaerer Verkehrsfuehrung. Beurteile Absicherung und Fuehrungs-Signalisation.', fr: 'Chantier hors localité avec guidage temporaire.', it: 'Cantiere fuori zona con guida temporanea.', en: 'Rural construction with temporary traffic guidance.' },
    strassenmerkmale: [
      { labelI18n: { de: 'Signalisierte Geschwindigkeit', fr: 'Vitesse signalisée', it: 'Velocità segnalata', en: 'Posted speed' }, wertI18n: { de: '60 km/h', fr: '60 km/h', it: '60 km/h', en: '60 km/h' } },
      { labelI18n: { de: 'Kontext', fr: 'Contexte', it: 'Contesto', en: 'Context' }, wertI18n: { de: 'Ausserorts', fr: 'Hors localité', it: 'Fuori zona', en: 'Rural area' } },
      { labelI18n: { de: 'Strassentyp', fr: 'Type de route', it: 'Tipo di strada', en: 'Road type' }, wertI18n: { de: 'Baustelle', fr: 'Chantier', it: 'Cantiere', en: 'Construction site' } },
      { labelI18n: { de: 'Verkehrsmittel', fr: 'Moyens de transport', it: 'Mezzi di trasporto', en: 'Transport modes' }, wertI18n: { de: 'MIV', fr: 'TIM', it: 'TIM', en: 'MIV' } },
    ],
  },
]

const DEFAULT_DEFICITS: AppDeficit[] = [
  {
    id: 'def1', sceneId: 'sc1', topicId: 'fuss',
    kriteriumId: 'fussgaengerfuehrung_geometrie', kontext: 'io',
    isPflicht: true, isBooster: false,
    normRefs: ['VSS SN 640 075', 'SN 641 723'],
    position: { theta: 45,  phi: 100 }, tolerance: 20, kategorie: 'verkehrsfuehrung',
    verortung: null,
    nameI18n:        { de: 'Fehlende Absenkung',      fr: 'Abaissement absent',           it: 'Abbassamento mancante',         en: 'Missing kerb drop'              },
    beschreibungI18n:{ de: 'Bordstein an Querungsstelle nicht abgesenkt — Barrierefreiheit verletzt.', fr: 'Bordure non abaissée à la traversée.', it: 'Cordolo non ribassato all\'attraversamento.', en: 'Kerb not dropped at crossing.' },
    correctAssessment: { wichtigkeit: 'mittel', abweichung: 'gross', relevanzSD: 'hoch', naca: 2, unfallschwere: 'mittel', unfallrisiko: 'hoch' },
  },
  {
    id: 'def2', sceneId: 'sc1', topicId: 'fuss',
    kriteriumId: 'erkennungsdistanz', kontext: 'io',
    isPflicht: true, isBooster: false,
    normRefs: ['SN 640 273', 'SN 641 723'],
    position: { theta: 320, phi: 88  }, tolerance: 20, kategorie: 'sicht',
    verortung: null,
    nameI18n:        { de: 'Sichtbehinderung Hecke',  fr: 'Obstruction par haie',         it: 'Ostacolo alla visibilità',      en: 'Visibility obstruction – hedge' },
    beschreibungI18n:{ de: 'Hecke ragt in Sichtraum, Fahrzeuge werden zu spaat erkannt.', fr: 'Haie dans la zone de visibilité.', it: 'Siepe nella zona di visibilità.', en: 'Hedge intrudes into sight zone.' },
    correctAssessment: { wichtigkeit: 'mittel', abweichung: 'mittel', relevanzSD: 'mittel', naca: 3, unfallschwere: 'mittel', unfallrisiko: 'mittel' },
  },
  {
    id: 'def3', sceneId: 'sc2', topicId: 'velo',
    kriteriumId: 'velolaengsfuehrung_art', kontext: 'ao',
    isPflicht: true, isBooster: false,
    normRefs: ['SN 640 238', 'SN 641 723'],
    position: { theta: 180, phi: 92  }, tolerance: 22, kategorie: 'ausruestung',
    verortung: null,
    nameI18n:        { de: 'Unterbrochener Radstreifen', fr: 'Piste cyclable interrompue',  it: 'Corsia ciclabile interrotta',   en: 'Interrupted cycle lane'         },
    beschreibungI18n:{ de: 'Radstreifen endet vor Kreuzung ohne Weiterfuehrung.', fr: 'Piste cyclable interrompue avant le carrefour.', it: 'Corsia ciclabile interrotta prima dell\'incrocio.', en: 'Cycle lane ends before junction.' },
    correctAssessment: { wichtigkeit: 'gross', abweichung: 'gross', relevanzSD: 'hoch', naca: 3, unfallschwere: 'mittel', unfallrisiko: 'hoch' },
  },
  {
    id: 'def4', sceneId: 'sc3', topicId: 'knoten',
    kriteriumId: 'markierung', kontext: 'io',
    isPflicht: false, isBooster: true,
    normRefs: ['SN 640 852', 'SN 641 723'],
    position: { theta: 10,  phi: 98  }, tolerance: 20, kategorie: 'ausruestung',
    verortung: null,
    nameI18n:        { de: 'Fehlende Wartelinie',    fr: 'Ligne d\'attente manquante',   it: 'Linea d\'attesa mancante',      en: 'Missing stop line'              },
    beschreibungI18n:{ de: 'Keine Wartelinie vor Knotenpunkt erkennbar.', fr: 'Aucune ligne d\'attente visible avant le carrefour.', it: 'Nessuna linea d\'attesa prima dell\'incrocio.', en: 'No stop line visible before junction.' },
    correctAssessment: { wichtigkeit: 'mittel', abweichung: 'mittel', relevanzSD: 'mittel', naca: 2, unfallschwere: 'mittel', unfallrisiko: 'mittel' },
  },
]

const DEFAULT_RANKING: RankingEntry[] = [
  { id: 'seed-1', username: 'RSI_Expert',     score: 1500, scenesCount: 4, timestamp: '2026-01-10T10:00:00Z', kursId: null, stunde: '2026-01-10' },
  { id: 'seed-2', username: 'Max Muster',     score: 1250, scenesCount: 3, timestamp: '2026-01-11T09:30:00Z', kursId: null, stunde: '2026-01-11' },
  { id: 'seed-3', username: 'SicherheitsPro', score: 980,  scenesCount: 2, timestamp: '2026-01-12T14:20:00Z', kursId: null, stunde: '2026-01-12' },
]

// ── Hilfsfunktionen ──
function initIfNeeded(): void {
  if (localStorage.getItem(K_INIT)) return
  localStorage.setItem(K_TOPICS,   JSON.stringify(DEFAULT_TOPICS))
  localStorage.setItem(K_SCENES,   JSON.stringify(DEFAULT_SCENES))
  localStorage.setItem(K_DEFICITS, JSON.stringify(DEFAULT_DEFICITS))
  localStorage.setItem(K_RANKING,  JSON.stringify(DEFAULT_RANKING))
  localStorage.setItem(K_INIT, '1')
}

function readJSON<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : fallback
  } catch { return fallback }
}

function writeJSON<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* noop */ }
}

export function ml(text: MultiLang, lang: string): string {
  return text[lang as keyof MultiLang] ?? text.de
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

// Oberthemen: Topics ohne parentTopicId
export function getOberthemen(): AppTopic[] {
  return getTopics().filter(t => !t.parentTopicId)
}

// Unterthemen: Topics mit parentTopicId === parentId
export function getUnterthemen(parentId: string): AppTopic[] {
  return getTopics().filter(t => t.parentTopicId === parentId)
}

// Topic-Hierarchie als Baumstruktur
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

// Ewige Rangliste: nur Eintraege ohne kursId
export function getRankingGesamt(): RankingEntry[] {
  return getRanking().filter(r => !r.kursId)
}

// Kurs-Rangliste
export function getRankingByKurs(kursId: string): RankingEntry[] {
  return readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING)
    .filter(r => r.kursId === kursId)
    .sort((a, b) => b.score - a.score)
}

// Tagesrangliste nach Datum (YYYY-MM-DD)
export function getRankingByStunde(datum: string): RankingEntry[] {
  return readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING)
    .filter(r => (r.stunde ?? r.timestamp?.slice(0, 10)) === datum)
    .sort((a, b) => b.score - a.score)
}

export function saveRankingEntry(entry: RankingEntry): void {
  const SEED = ['RSI_Expert', 'Max Muster', 'SicherheitsPro']
  const list = readJSON<RankingEntry>(K_RANKING, DEFAULT_RANKING)
    .filter(r => !SEED.includes(r.username) || r.username === entry.username)

  // ID und Stunde automatisch setzen
  const entryWithId: RankingEntry = {
    ...entry,
    id: entry.id ?? crypto.randomUUID(),
    stunde: entry.stunde ?? entry.timestamp.slice(0, 10),
  }

  // Kurs-Eintraege immer als neuen Eintrag speichern (session-basiert)
  if (entryWithId.kursId) {
    list.push(entryWithId)
  } else {
    // Ewige Rangliste: nur hoechsten Score je Benutzer behalten
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
