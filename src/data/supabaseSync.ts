// Supabase-Sync für Admin-Daten (Topics, Scenes, Deficits)
// Strategie: Supabase = Source of Truth, localStorage = Offline-Cache
// Alle Funktionen sind async — die UI verwendet einen lokalen Cache

import { supabase, setSupabaseStatus } from '../lib/supabase'
import type { AppTopic, AppScene, AppDeficit } from './appData'

// ── Cache-Status ──
// Nach dem ersten erfolgreichen Fetch werden Daten im Speicher gehalten
let topicsCache: AppTopic[] | null = null
let scenesCache: AppScene[] | null = null
let deficitsCache: AppDeficit[] | null = null
let initialized = false

// localStorage-Keys (gleich wie appData.ts)
const K_TOPICS   = 'rsi-v3-topics'
const K_SCENES   = 'rsi-v3-scenes'
const K_DEFICITS = 'rsi-v3-deficits'

// ── Hilfsfunktionen ──

function readLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T[] : []
  } catch { return [] }
}

function writeLocal<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* noop */ }
}

// ── Init: Supabase laden oder Seed-Daten hochladen ──

export async function initSupabaseData(): Promise<void> {
  if (initialized || !supabase) return

  try {
    // Topics laden
    const { data: topicRows, error: tErr } = await supabase
      .from('rsi_topics').select('id, data').order('data->sortOrder')
    if (tErr) throw tErr

    // Scenes laden
    const { data: sceneRows, error: sErr } = await supabase
      .from('rsi_scenes').select('id, topic_id, data')
    if (sErr) throw sErr

    // Deficits laden
    const { data: deficitRows, error: dErr } = await supabase
      .from('rsi_deficits').select('id, scene_id, data')
    if (dErr) throw dErr

    // Wenn Supabase leer ist → Seed-Daten aus localStorage hochladen
    if (topicRows.length === 0) {
      console.info('[RSI] Supabase leer — Seed-Daten werden hochgeladen')
      await seedSupabaseFromLocal()
      // Nochmal laden nach Seed
      const { data: t2 } = await supabase.from('rsi_topics').select('id, data')
      const { data: s2 } = await supabase.from('rsi_scenes').select('id, topic_id, data')
      const { data: d2 } = await supabase.from('rsi_deficits').select('id, scene_id, data')
      topicsCache = (t2 ?? []).map(r => r.data as AppTopic)
      scenesCache = (s2 ?? []).map(r => r.data as AppScene)
      deficitsCache = (d2 ?? []).map(r => r.data as AppDeficit)
    } else {
      // NUR setzen wenn noch kein lokaler Save passiert ist (Cache leer)
      // Verhindert Race-Condition: lokaler Save → initSupabase ueberschreibt
      if (!topicsCache) topicsCache = topicRows.map(r => r.data as AppTopic)
      if (!scenesCache) scenesCache = sceneRows.map(r => r.data as AppScene)
      if (!deficitsCache) deficitsCache = deficitRows.map(r => r.data as AppDeficit)
    }

    // localStorage als Cache aktualisieren
    writeLocal(K_TOPICS, topicsCache)
    writeLocal(K_SCENES, scenesCache)
    writeLocal(K_DEFICITS, deficitsCache)

    setSupabaseStatus('live')
    initialized = true
    console.info(`[RSI] Supabase geladen: ${topicsCache.length} Topics, ${scenesCache.length} Scenes, ${deficitsCache.length} Deficits`)
  } catch (err) {
    console.warn('[RSI] Supabase-Init fehlgeschlagen, localStorage-Fallback:', err)
    setSupabaseStatus('offline')
  }
}

// Seed-Daten aus localStorage nach Supabase schreiben
async function seedSupabaseFromLocal(): Promise<void> {
  if (!supabase) return

  const topics = readLocal<AppTopic>(K_TOPICS)
  const scenes = readLocal<AppScene>(K_SCENES)
  const deficits = readLocal<AppDeficit>(K_DEFICITS)

  if (topics.length > 0) {
    await supabase.from('rsi_topics').upsert(
      topics.map(t => ({ id: t.id, data: t }))
    )
  }
  if (scenes.length > 0) {
    await supabase.from('rsi_scenes').upsert(
      scenes.map(s => ({ id: s.id, topic_id: s.topicId, data: s }))
    )
  }
  if (deficits.length > 0) {
    await supabase.from('rsi_deficits').upsert(
      deficits.map(d => ({ id: d.id, scene_id: d.sceneId, data: d }))
    )
  }
  console.info(`[RSI] Seed-Daten hochgeladen: ${topics.length} Topics, ${scenes.length} Scenes, ${deficits.length} Deficits`)
}

// ── Topics ──

export function getTopicsSync(): AppTopic[] {
  return topicsCache ?? readLocal<AppTopic>(K_TOPICS)
}

export async function saveTopicSupabase(topic: AppTopic): Promise<void> {
  // Nur Cache aktualisieren (localStorage wird bereits von appData.ts geschrieben)
  const list = topicsCache ?? readLocal<AppTopic>(K_TOPICS)
  const i = list.findIndex(x => x.id === topic.id)
  if (i >= 0) list[i] = topic; else list.push(topic)
  topicsCache = [...list]

  // Supabase async
  if (!supabase) return
  const { error } = await supabase.from('rsi_topics').upsert({
    id: topic.id, data: topic, updated_at: new Date().toISOString(),
  })
  if (error) {
    console.warn('[RSI] Topic-Save fehlgeschlagen:', error.message)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteTopicSupabase(id: string): Promise<void> {
  topicsCache = (topicsCache ?? readLocal<AppTopic>(K_TOPICS)).filter(t => t.id !== id)
  writeLocal(K_TOPICS, topicsCache)

  if (!supabase) return
  const { error } = await supabase.from('rsi_topics').delete().eq('id', id)
  if (error) console.warn('[RSI] Topic-Delete fehlgeschlagen:', error.message)
}

// ── Scenes ──

export function getScenesSync(topicId?: string): AppScene[] {
  const all = scenesCache ?? readLocal<AppScene>(K_SCENES)
  return topicId ? all.filter(s => s.topicId === topicId) : all
}

export async function saveSceneSupabase(scene: AppScene): Promise<void> {
  const list = scenesCache ?? readLocal<AppScene>(K_SCENES)
  const i = list.findIndex(x => x.id === scene.id)
  if (i >= 0) list[i] = scene; else list.push(scene)
  scenesCache = [...list]

  if (!supabase) return
  const { error } = await supabase.from('rsi_scenes').upsert({
    id: scene.id, topic_id: scene.topicId, data: scene, updated_at: new Date().toISOString(),
  })
  if (error) {
    console.warn('[RSI] Scene-Save fehlgeschlagen:', error.message)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteSceneSupabase(id: string): Promise<void> {
  scenesCache = (scenesCache ?? readLocal<AppScene>(K_SCENES)).filter(s => s.id !== id)
  writeLocal(K_SCENES, scenesCache)

  if (!supabase) return
  const { error } = await supabase.from('rsi_scenes').delete().eq('id', id)
  if (error) console.warn('[RSI] Scene-Delete fehlgeschlagen:', error.message)
}

// ── Deficits ──

export function getDeficitsSync(sceneId?: string): AppDeficit[] {
  const all = deficitsCache ?? readLocal<AppDeficit>(K_DEFICITS)
  return sceneId ? all.filter(d => d.sceneId === sceneId) : all
}

export async function saveDeficitSupabase(deficit: AppDeficit): Promise<void> {
  const list = deficitsCache ?? readLocal<AppDeficit>(K_DEFICITS)
  const i = list.findIndex(x => x.id === deficit.id)
  if (i >= 0) list[i] = deficit; else list.push(deficit)
  deficitsCache = [...list]

  if (!supabase) return
  const { error } = await supabase.from('rsi_deficits').upsert({
    id: deficit.id, scene_id: deficit.sceneId, data: deficit, updated_at: new Date().toISOString(),
  })
  if (error) {
    console.warn('[RSI] Deficit-Save fehlgeschlagen:', error.message)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteDeficitSupabase(id: string): Promise<void> {
  deficitsCache = (deficitsCache ?? readLocal<AppDeficit>(K_DEFICITS)).filter(d => d.id !== id)
  writeLocal(K_DEFICITS, deficitsCache)

  if (!supabase) return
  const { error } = await supabase.from('rsi_deficits').delete().eq('id', id)
  if (error) console.warn('[RSI] Deficit-Delete fehlgeschlagen:', error.message)
}

// ── Cache zurücksetzen (nach App-Reset) ──

export function resetCache(): void {
  topicsCache = null
  scenesCache = null
  deficitsCache = null
  initialized = false
}

export function isInitialized(): boolean {
  return initialized
}
