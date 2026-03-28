// localStorage-basierter Datenspeicher – RSI VR Tool
// Ersetzt static.ts als primäre Datenquelle (static.ts bleibt für SceneViewer-Kompatibilität)

import type { RSIDimension, NACADimension } from '../types'

// ── Typen ──

export interface MultiLang { de: string; fr: string; it: string; en: string }

export interface AppTopic {
  id: string
  name: MultiLang
  description: MultiLang
  iconKey: 'walk' | 'bike' | 'junction' | 'construction'
}

export interface AppScene {
  id: string
  topicId: string
  imageUrl: string
  description: MultiLang
  locationType: 'io' | 'ao'
}

export interface AppDeficit {
  id: string
  sceneId: string
  position: [number, number, number]
  tolerance: number
  title: MultiLang
  description: MultiLang
  correctAssessment: {
    wichtigkeit: RSIDimension
    abweichung: RSIDimension
    unfallschwere: NACADimension
  }
  feedback: MultiLang
  solution: MultiLang
}

export interface UserSession {
  username: string
  lang: string
  theme: 'light' | 'dark'
  scenesCompleted: string[]
  totalScore: number
}

export interface AppRankingEntry {
  username: string
  score: number
  scenesCompleted: number
  timestamp: string
}

// ── Storage-Keys ──
const KEY_TOPICS   = 'rsi-v2-topics'
const KEY_SCENES   = 'rsi-v2-scenes'
const KEY_DEFICITS = 'rsi-v2-deficits'
const KEY_SESSION  = 'rsi-v2-session'
const KEY_RANKING  = 'rsi-v2-ranking'
const KEY_INIT     = 'rsi-v2-init'

// ── Platzhalter-Daten ──
const DEFAULT_TOPICS: AppTopic[] = [
  {
    id: 'fuss', iconKey: 'walk',
    name:        { de: 'Fussverkehr',  fr: 'Piétons',    it: 'Pedoni',   en: 'Pedestrians'  },
    description: { de: 'Gehwege, Querungen und Trottoirs.', fr: 'Trottoirs et traversées.', it: 'Marciapiedi e attraversamenti.', en: 'Footpaths and crossings.' },
  },
  {
    id: 'velo', iconKey: 'bike',
    name:        { de: 'Veloverkehr',  fr: 'Cyclistes',  it: 'Ciclisti', en: 'Cyclists'     },
    description: { de: 'Radwege, Radstreifen und Knotenpunkte.', fr: 'Pistes et bandes cyclables.', it: 'Piste e corsie ciclabili.', en: 'Cycle paths and lanes.' },
  },
  {
    id: 'knoten', iconKey: 'junction',
    name:        { de: 'Knotenpunkte', fr: 'Carrefours', it: 'Incroci',  en: 'Junctions'    },
    description: { de: 'Sichtweiten und Vorfahrtsregelungen.', fr: 'Visibilité et priorités.', it: 'Visibilità e precedenze.', en: 'Sight lines and priority.' },
  },
  {
    id: 'bau', iconKey: 'construction',
    name:        { de: 'Baustellen',   fr: 'Chantiers',  it: 'Cantieri', en: 'Construction'  },
    description: { de: 'Absicherung und temporäre Führung.', fr: 'Sécurisation et guidage temporaire.', it: 'Sicurezza e guida temporanea.', en: 'Safety and temporary guidance.' },
  },
]

const DEFAULT_SCENES: AppScene[] = [
  { id: 'sc1', topicId: 'fuss',   imageUrl: '/textures/street-360.jpg', locationType: 'io', description: { de: 'Innerörtliche Strasse mit Gehweg',      fr: 'Rue en localité avec trottoir',            it: 'Strada urbana con marciapiede',           en: 'Urban street with footpath'          } },
  { id: 'sc2', topicId: 'velo',   imageUrl: '/textures/street-360.jpg', locationType: 'ao', description: { de: 'Hauptstrasse mit Radstreifen',           fr: 'Route principale avec piste cyclable',     it: 'Strada principale con corsia ciclabile',  en: 'Main road with cycle lane'           } },
  { id: 'sc3', topicId: 'knoten', imageUrl: '/textures/street-360.jpg', locationType: 'io', description: { de: 'Kreuzung mit eingeschränkter Sichtweite', fr: 'Carrefour à visibilité réduite',           it: 'Incrocio con visibilità ridotta',         en: 'Junction with restricted sight line' } },
  { id: 'sc4', topicId: 'bau',    imageUrl: '/textures/street-360.jpg', locationType: 'ao', description: { de: 'Baustelle mit temporärer Verkehrsführung',fr: 'Chantier avec guidage temporaire du trafic',it: 'Cantiere con guida temporanea del traffico',en: 'Construction site with temp traffic'  } },
]

const DEFAULT_DEFICITS: AppDeficit[] = [
  {
    id: 'def1', sceneId: 'sc1', position: [10, 0, -10], tolerance: 2.5,
    title:       { de: 'Fehlende Absenkung',      fr: 'Abaissement absent',           it: 'Abbassamento mancante',          en: 'Missing kerb drop'              },
    description: { de: 'Bordstein an Querungsstelle nicht abgesenkt.',               fr: 'Bordure non abaissée à la traversée.',                    it: 'Cordolo non ribassato all\'attraversamento.',                  en: 'Kerb not dropped at crossing.'      },
    correctAssessment: { wichtigkeit: 'mittel', abweichung: 'gross', unfallschwere: 'mittel' },
    feedback:    { de: 'Barrierefreiheit nicht gewährleistet; Rollstuhlfahrer müssen auf Fahrbahn ausweichen.', fr: 'Accessibilité non assurée; les fauteuils roulants doivent changer de voie.', it: 'Accessibilità non garantita; le sedie a rotelle devono usare la carreggiata.', en: 'Accessibility not ensured; wheelchairs must use roadway.' },
    solution:    { de: 'Bordstein auf 0–3 cm absenken.',                              fr: 'Abaisser le bordure à 0–3 cm.',                           it: 'Ribassare il cordolo a 0–3 cm.',                               en: 'Lower kerb to 0–3 cm.'              },
  },
  {
    id: 'def2', sceneId: 'sc1', position: [-5, 2, -8], tolerance: 2.0,
    title:       { de: 'Sichtbehinderung',         fr: 'Obstruction de visibilité',    it: 'Ostacolo alla visibilità',       en: 'Visibility obstruction'         },
    description: { de: 'Hecke ragt in den Sichtraum der Fussgänger.',                  fr: 'Haie empiète sur la zone de visibilité des piétons.',     it: 'Siepe nella zona di visibilità dei pedoni.',                   en: 'Hedge intrudes into pedestrian sight zone.' },
    correctAssessment: { wichtigkeit: 'gross', abweichung: 'mittel', unfallschwere: 'schwer' },
    feedback:    { de: 'Herannahende Fahrzeuge werden zu spät erkannt.',                fr: 'Les véhicules approchants sont reconnus trop tard.',       it: 'I veicoli in avvicinamento vengono riconosciuti troppo tardi.',en: 'Approaching vehicles recognized too late.' },
    solution:    { de: 'Rückschnitt der Bepflanzung anordnen.',                        fr: 'Ordonner la taille de la végétation.',                     it: 'Ordinare la potatura della vegetazione.',                      en: 'Order trimming of vegetation.'      },
  },
  {
    id: 'def3', sceneId: 'sc2', position: [3, 0, -6], tolerance: 2.0,
    title:       { de: 'Unterbrochener Radstreifen', fr: 'Piste cyclable interrompue',  it: 'Corsia ciclabile interrotta',    en: 'Interrupted cycle lane'         },
    description: { de: 'Radstreifen endet ohne Weiterführung vor der Kreuzung.',       fr: 'La piste cyclable se termine sans suite avant le carrefour.', it: 'La corsia ciclabile termina senza continuazione prima dell\'incrocio.', en: 'Cycle lane ends without continuation before junction.' },
    correctAssessment: { wichtigkeit: 'gross', abweichung: 'gross', unfallschwere: 'mittel' },
    feedback:    { de: 'Velofahrende werden in den Mischverkehr gedrängt.',             fr: 'Les cyclistes sont poussés dans la circulation mixte.',    it: 'I ciclisti vengono spinti nel traffico misto.',                en: 'Cyclists pushed into mixed traffic.' },
    solution:    { de: 'Radstreifen bis Haltelinie weiterführen, Markierung erneuern.', fr: 'Prolonger la piste jusqu\'à la ligne d\'arrêt, rénover le marquage.', it: 'Prolungare la corsia fino alla linea di stop, rinnovare la segnaletica.', en: 'Extend cycle lane to stop line, renew markings.' },
  },
  {
    id: 'def4', sceneId: 'sc3', position: [0, 0, -15], tolerance: 3.0,
    title:       { de: 'Fehlende Wartelinie',     fr: 'Ligne d\'attente manquante',   it: 'Linea d\'attesa mancante',       en: 'Missing stop line'              },
    description: { de: 'Keine Wartelinie vor dem Knotenpunkt erkennbar.',              fr: 'Aucune ligne d\'attente visible avant le carrefour.',      it: 'Nessuna linea d\'attesa visibile prima dell\'incrocio.',       en: 'No stop line visible before junction.' },
    correctAssessment: { wichtigkeit: 'mittel', abweichung: 'mittel', unfallschwere: 'mittel' },
    feedback:    { de: 'Unklare Wartepflicht führt zu Missverständnissen.',            fr: 'L\'obligation d\'attente peu claire cause des malentendus.', it: 'L\'obbligo di attesa poco chiaro causa incomprensioni.',       en: 'Unclear waiting obligation causes misunderstandings.' },
    solution:    { de: 'Wartelinie gemäss VSS-Norm aufmalen.',                         fr: 'Peindre une ligne d\'attente selon la norme VSS.',         it: 'Dipingere una linea d\'attesa secondo la norma VSS.',          en: 'Paint stop line per VSS standard.'  },
  },
]

const DEFAULT_RANKING: AppRankingEntry[] = [
  { username: 'Max Muster',     score: 1250, scenesCompleted: 3, timestamp: new Date().toISOString() },
  { username: 'SicherheitsPro', score: 980,  scenesCompleted: 2, timestamp: new Date().toISOString() },
  { username: 'RSI_Expert',     score: 1500, scenesCompleted: 4, timestamp: new Date().toISOString() },
]

// ── Initialisierung ──
function initIfNeeded(): void {
  if (localStorage.getItem(KEY_INIT)) return
  localStorage.setItem(KEY_TOPICS,   JSON.stringify(DEFAULT_TOPICS))
  localStorage.setItem(KEY_SCENES,   JSON.stringify(DEFAULT_SCENES))
  localStorage.setItem(KEY_DEFICITS, JSON.stringify(DEFAULT_DEFICITS))
  localStorage.setItem(KEY_RANKING,  JSON.stringify(DEFAULT_RANKING))
  localStorage.setItem(KEY_INIT, '1')
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

// ── Topics ──
export function getTopics(): AppTopic[] {
  initIfNeeded()
  return readJSON<AppTopic>(KEY_TOPICS, DEFAULT_TOPICS)
}

export function saveTopic(topic: AppTopic): void {
  const list = getTopics()
  const idx = list.findIndex(t => t.id === topic.id)
  if (idx >= 0) list[idx] = topic; else list.push(topic)
  writeJSON(KEY_TOPICS, list)
}

export function deleteTopic(id: string): void {
  writeJSON(KEY_TOPICS, getTopics().filter(t => t.id !== id))
}

// ── Scenes ──
export function getScenes(topicId: string): AppScene[] {
  initIfNeeded()
  return readJSON<AppScene>(KEY_SCENES, DEFAULT_SCENES).filter(s => s.topicId === topicId)
}

export function getAllScenes(): AppScene[] {
  initIfNeeded()
  return readJSON<AppScene>(KEY_SCENES, DEFAULT_SCENES)
}

export function saveScene(scene: AppScene): void {
  const list = getAllScenes()
  const idx = list.findIndex(s => s.id === scene.id)
  if (idx >= 0) list[idx] = scene; else list.push(scene)
  writeJSON(KEY_SCENES, list)
}

export function deleteScene(id: string): void {
  writeJSON(KEY_SCENES, getAllScenes().filter(s => s.id !== id))
}

// ── Deficits ──
export function getDeficits(sceneId: string): AppDeficit[] {
  initIfNeeded()
  return readJSON<AppDeficit>(KEY_DEFICITS, DEFAULT_DEFICITS).filter(d => d.sceneId === sceneId)
}

export function getAllDeficits(): AppDeficit[] {
  initIfNeeded()
  return readJSON<AppDeficit>(KEY_DEFICITS, DEFAULT_DEFICITS)
}

export function saveDeficit(deficit: AppDeficit): void {
  const list = getAllDeficits()
  const idx = list.findIndex(d => d.id === deficit.id)
  if (idx >= 0) list[idx] = deficit; else list.push(deficit)
  writeJSON(KEY_DEFICITS, list)
}

export function deleteDeficit(id: string): void {
  writeJSON(KEY_DEFICITS, getAllDeficits().filter(d => d.id !== id))
}

// ── Session ──
export function getSession(): UserSession {
  try {
    const raw = localStorage.getItem(KEY_SESSION)
    if (raw) return JSON.parse(raw) as UserSession
  } catch { /* noop */ }
  return {
    username: '',
    lang: localStorage.getItem('rsi-lang') ?? 'de',
    theme: (localStorage.getItem('rsi-theme') as 'light' | 'dark') ?? 'dark',
    scenesCompleted: [],
    totalScore: 0,
  }
}

export function saveSession(session: UserSession): void {
  try { localStorage.setItem(KEY_SESSION, JSON.stringify(session)) } catch { /* noop */ }
}

// ── Ranking ──
export function getRanking(): AppRankingEntry[] {
  initIfNeeded()
  const list = readJSON<AppRankingEntry>(KEY_RANKING, DEFAULT_RANKING)
  return list.sort((a, b) => b.score - a.score)
}

export function saveRankingEntry(entry: AppRankingEntry): void {
  const list = readJSON<AppRankingEntry>(KEY_RANKING, DEFAULT_RANKING)
    .filter(r => !['Max Muster', 'SicherheitsPro', 'RSI_Expert'].includes(r.username))
  list.push(entry)
  writeJSON(KEY_RANKING, list.sort((a, b) => b.score - a.score))
}

// ── Hilfsfunktion: Multilingual auflösen ──
export function ml(text: MultiLang, lang: string): string {
  return text[lang as keyof MultiLang] ?? text.de
}
