// Supabase-Sync für Admin-Daten (Topics, Scenes, Deficits)
// Strategie: Supabase = Source of Truth, localStorage = Offline-Cache
//
// Schreibzugriffe (ab v0.6.0, Sprint-1 Security-Härtung):
// Writes auf rsi_topics/scenes/deficits laufen über die Edge Function
// `admin-write`, die ein HMAC-signiertes Admin-Token prüft und mit
// service_role schreibt. Das Token wird von der Edge Function
// `admin-auth` ausgestellt (PIN-Tausch) und im Client in
// sessionStorage['rsi-admin-token'] abgelegt. Der PIN selbst ist nicht
// mehr im Client-Bundle — nur im Supabase-Secret.
// Lesezugriffe laufen weiterhin direkt als anon (SELECT).

import { supabase, setSupabaseStatus } from '../lib/supabase'
import type { AppTopic, AppScene, AppDeficit, Kurs } from './appData'

// ── Cache-Status ──
// Nach dem ersten erfolgreichen Fetch werden Daten im Speicher gehalten
let topicsCache: AppTopic[] | null = null
let scenesCache: AppScene[] | null = null
let deficitsCache: AppDeficit[] | null = null
let kurseCache: Kurs[] | null = null
let initialized = false

// localStorage-Keys (gleich wie appData.ts)
const K_TOPICS   = 'rsi-v3-topics'
const K_SCENES   = 'rsi-v3-scenes'
const K_DEFICITS = 'rsi-v3-deficits'
const K_KURSE    = 'rsi-v3-kurse'

// ── Edge-Function-Helper ──

type EdgeTable = 'rsi_topics' | 'rsi_scenes' | 'rsi_deficits' | 'rsi_kurse'
type EdgeOp    = 'upsert' | 'delete'

function getAdminToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  return sessionStorage.getItem('rsi-admin-token')
}

async function edgeWrite(
  table: EdgeTable,
  op: EdgeOp,
  payload: { rows?: unknown[]; id?: string }
): Promise<{ ok: boolean; error?: string }> {
  const token = getAdminToken()
  if (!token) return { ok: false, error: 'no-admin-token' }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !anonKey) return { ok: false, error: 'supabase-env-missing' }
  try {
    const res = await fetch(`${url}/functions/v1/admin-write`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-token': token,
        // Supabase-Gateway verlangt apikey + authorization, auch bei
        // verify_jwt=false. Anon-Key reicht — die Token-Pruefung macht
        // die Edge Function selbst.
        'apikey': anonKey,
        'authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ table, op, ...payload }),
    })
    const json = await res.json().catch(() => ({} as Record<string, unknown>))
    if (!res.ok) {
      // Token abgelaufen oder ungueltig -> Session-Flag und Token raeumen,
      // damit naechster Login den Tausch neu durchlaeuft
      if (res.status === 401 && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('rsi-admin-token')
        sessionStorage.removeItem('rsi-admin-auth')
      }
      return { ok: false, error: String(json.error ?? `HTTP ${res.status}`) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err instanceof Error ? err.message : err) }
  }
}

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

    // Kurse laden. Tabelle `rsi_kurse` existiert erst ab 2026-04-24 (v0.6.3).
    // Fehlt sie (z.B. alte Supabase-Instanz), nicht crashen — nur loggen.
    let kurseRows: { id: string; data: unknown }[] = []
    const { data: kurseRaw, error: kErr } = await supabase
      .from('rsi_kurse').select('id, data')
    if (kErr) {
      console.warn('[RSI] rsi_kurse nicht verfuegbar — Kurse nur localStorage. SQL-Migration siehe supabase/migrations/2026_04_24_rsi_kurse.sql')
    } else {
      kurseRows = kurseRaw ?? []
    }

    // Wenn Supabase leer ist → nur seeden wenn localStorage gefüllt UND explizit
    // vom User angefordert (Flag `rsi-v3-seed-consent`). Standardverhalten: kein
    // automatisches Hochladen, damit ein Angreifer keine manipulierten Daten per
    // leerer Tabelle einschleusen kann (Security M-6).
    if (topicRows.length === 0) {
      const consent = typeof localStorage !== 'undefined'
        && localStorage.getItem('rsi-v3-seed-consent') === '1'
      if (consent) {
        console.info('[RSI] Supabase leer — Seed nach explizitem Consent')
        await seedSupabaseFromLocal()
        localStorage.removeItem('rsi-v3-seed-consent')
        const { data: t2 } = await supabase.from('rsi_topics').select('id, data')
        const { data: s2 } = await supabase.from('rsi_scenes').select('id, topic_id, data')
        const { data: d2 } = await supabase.from('rsi_deficits').select('id, scene_id, data')
        const { data: k2 } = await supabase.from('rsi_kurse').select('id, data')
        topicsCache = (t2 ?? []).map(r => r.data as AppTopic)
        scenesCache = (s2 ?? []).map(r => r.data as AppScene)
        deficitsCache = (d2 ?? []).map(r => r.data as AppDeficit)
        kurseCache = (k2 ?? []).map(r => r.data as Kurs)
      } else {
        console.info('[RSI] Supabase leer — kein Seed (Consent-Flag nicht gesetzt). Admin kann Daten via Import/Seed-Button initialisieren.')
        topicsCache = []
        scenesCache = []
        deficitsCache = []
        kurseCache = []
      }
    } else {
      // NUR setzen wenn noch kein lokaler Save passiert ist (Cache leer)
      // Verhindert Race-Condition: lokaler Save → initSupabase überschreibt
      if (!topicsCache) topicsCache = topicRows.map(r => r.data as AppTopic)
      if (!scenesCache) scenesCache = sceneRows.map(r => r.data as AppScene)
      if (!deficitsCache) deficitsCache = deficitRows.map(r => r.data as AppDeficit)
      if (!kurseCache) kurseCache = kurseRows.map(r => r.data as Kurs)
    }

    // localStorage als Cache aktualisieren
    writeLocal(K_TOPICS, topicsCache)
    writeLocal(K_SCENES, scenesCache)
    writeLocal(K_DEFICITS, deficitsCache)
    writeLocal(K_KURSE, kurseCache ?? [])

    setSupabaseStatus('live')
    initialized = true
    console.info(`[RSI] Supabase geladen: ${topicsCache.length} Topics, ${scenesCache.length} Scenes, ${deficitsCache.length} Deficits, ${(kurseCache ?? []).length} Kurse`)
  } catch (err) {
    console.warn('[RSI] Supabase-Init fehlgeschlagen, localStorage-Fallback:', err)
    setSupabaseStatus('offline')
  }
}

// Seed-Daten aus localStorage nach Supabase schreiben (als Admin via Edge Function)
async function seedSupabaseFromLocal(): Promise<void> {
  if (!supabase) return
  if (!getAdminToken()) {
    console.warn('[RSI] Seed abgebrochen: kein Admin-Token in Session. Als Admin einloggen und Seed erneut auslösen.')
    return
  }

  const topics = readLocal<AppTopic>(K_TOPICS)
  const scenes = readLocal<AppScene>(K_SCENES)
  const deficits = readLocal<AppDeficit>(K_DEFICITS)

  if (topics.length > 0) {
    const r = await edgeWrite('rsi_topics', 'upsert', {
      rows: topics.map(t => ({ id: t.id, data: t, updated_at: new Date().toISOString() })),
    })
    if (!r.ok) console.warn('[RSI] Seed Topics fehlgeschlagen:', r.error)
  }
  if (scenes.length > 0) {
    const r = await edgeWrite('rsi_scenes', 'upsert', {
      rows: scenes.map(s => ({ id: s.id, topic_id: s.topicId, data: s, updated_at: new Date().toISOString() })),
    })
    if (!r.ok) console.warn('[RSI] Seed Scenes fehlgeschlagen:', r.error)
  }
  if (deficits.length > 0) {
    const r = await edgeWrite('rsi_deficits', 'upsert', {
      rows: deficits.map(d => ({ id: d.id, scene_id: d.sceneId, data: d, updated_at: new Date().toISOString() })),
    })
    if (!r.ok) console.warn('[RSI] Seed Deficits fehlgeschlagen:', r.error)
  }
  const kurse = readLocal<Kurs>(K_KURSE)
  if (kurse.length > 0) {
    const r = await edgeWrite('rsi_kurse', 'upsert', {
      rows: kurse.map(k => ({ id: k.id, data: k, updated_at: new Date().toISOString() })),
    })
    if (!r.ok) console.warn('[RSI] Seed Kurse fehlgeschlagen:', r.error)
  }
  console.info(`[RSI] Seed-Daten hochgeladen: ${topics.length} Topics, ${scenes.length} Scenes, ${deficits.length} Deficits, ${kurse.length} Kurse`)
}

// ── Topics ──

export function getTopicsSync(): AppTopic[] {
  return topicsCache ?? readLocal<AppTopic>(K_TOPICS)
}

export async function saveTopicSupabase(topic: AppTopic): Promise<void> {
  // Cache aktualisieren (localStorage schreibt bereits appData.ts)
  const list = topicsCache ?? readLocal<AppTopic>(K_TOPICS)
  const i = list.findIndex(x => x.id === topic.id)
  if (i >= 0) list[i] = topic; else list.push(topic)
  topicsCache = [...list]

  if (!supabase) return
  const result = await edgeWrite('rsi_topics', 'upsert', {
    rows: [{ id: topic.id, data: topic, updated_at: new Date().toISOString() }],
  })
  if (!result.ok) {
    console.warn('[RSI] Topic-Save fehlgeschlagen:', result.error)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteTopicSupabase(id: string): Promise<void> {
  topicsCache = (topicsCache ?? readLocal<AppTopic>(K_TOPICS)).filter(t => t.id !== id)
  writeLocal(K_TOPICS, topicsCache)

  if (!supabase) return
  const result = await edgeWrite('rsi_topics', 'delete', { id })
  if (!result.ok) console.warn('[RSI] Topic-Delete fehlgeschlagen:', result.error)
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
  const result = await edgeWrite('rsi_scenes', 'upsert', {
    rows: [{ id: scene.id, topic_id: scene.topicId, data: scene, updated_at: new Date().toISOString() }],
  })
  if (!result.ok) {
    console.warn('[RSI] Scene-Save fehlgeschlagen:', result.error)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteSceneSupabase(id: string): Promise<void> {
  scenesCache = (scenesCache ?? readLocal<AppScene>(K_SCENES)).filter(s => s.id !== id)
  writeLocal(K_SCENES, scenesCache)

  if (!supabase) return
  const result = await edgeWrite('rsi_scenes', 'delete', { id })
  if (!result.ok) console.warn('[RSI] Scene-Delete fehlgeschlagen:', result.error)
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
  const result = await edgeWrite('rsi_deficits', 'upsert', {
    rows: [{ id: deficit.id, scene_id: deficit.sceneId, data: deficit, updated_at: new Date().toISOString() }],
  })
  if (!result.ok) {
    console.warn('[RSI] Deficit-Save fehlgeschlagen:', result.error)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteDeficitSupabase(id: string): Promise<void> {
  deficitsCache = (deficitsCache ?? readLocal<AppDeficit>(K_DEFICITS)).filter(d => d.id !== id)
  writeLocal(K_DEFICITS, deficitsCache)

  if (!supabase) return
  const result = await edgeWrite('rsi_deficits', 'delete', { id })
  if (!result.ok) console.warn('[RSI] Deficit-Delete fehlgeschlagen:', result.error)
}

// ── Kurse ──

export function getKurseSync(): Kurs[] {
  return kurseCache ?? readLocal<Kurs>(K_KURSE)
}

export async function saveKursSupabase(kurs: Kurs): Promise<void> {
  const list = kurseCache ?? readLocal<Kurs>(K_KURSE)
  const i = list.findIndex(x => x.id === kurs.id)
  if (i >= 0) list[i] = kurs; else list.push(kurs)
  kurseCache = [...list]
  writeLocal(K_KURSE, kurseCache)

  if (!supabase) return
  const result = await edgeWrite('rsi_kurse', 'upsert', {
    rows: [{ id: kurs.id, data: kurs, updated_at: new Date().toISOString() }],
  })
  if (!result.ok) {
    console.warn('[RSI] Kurs-Save fehlgeschlagen:', result.error)
    setSupabaseStatus('offline')
  } else {
    setSupabaseStatus('live')
  }
}

export async function deleteKursSupabase(id: string): Promise<void> {
  kurseCache = (kurseCache ?? readLocal<Kurs>(K_KURSE)).filter(k => k.id !== id)
  writeLocal(K_KURSE, kurseCache)

  if (!supabase) return
  const result = await edgeWrite('rsi_kurse', 'delete', { id })
  if (!result.ok) console.warn('[RSI] Kurs-Delete fehlgeschlagen:', result.error)
}

// ── Cache zurücksetzen (nach App-Reset) ──

export function resetCache(): void {
  topicsCache = null
  scenesCache = null
  deficitsCache = null
  kurseCache = null
  initialized = false
}

// Consent für den einmaligen Seed von localStorage → Supabase setzen.
// Wird vom Admin-Dashboard aufgerufen; beim nächsten initSupabaseData() wird
// die leere Supabase-DB mit den lokalen Seed-Daten befüllt. Flag wird danach
// automatisch entfernt.
export function enableSeedConsent(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('rsi-v3-seed-consent', '1')
  initialized = false  // Erzwingt Re-Init beim nächsten Aufruf
}

export function isInitialized(): boolean {
  return initialized
}
