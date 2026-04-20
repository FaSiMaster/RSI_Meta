// Supabase Storage Helper — Single Source of Truth fuer Panorama-Bilder
// Bucket: rsi-textures
//
// Pfad-Konvention (siehe memory/project_architektur_entscheidungen.md):
//   panoramas/{szeneId}/haupt.webp                  — Hauptperspektive
//   panoramas/{szeneId}/persp_001_<label>.webp      — Perspektive 1
//   panoramas/_archiv/...                           — historische Files
//
// Erforderliche Bucket-Konfiguration im Supabase-Dashboard:
//   Storage -> rsi-textures -> public = true
//   Policies via Dashboard-UI: SELECT/INSERT/DELETE fuer anon
//
// Schreibzugriff im Code ist nur ueber Admin-PIN erreichbar
// (sessionStorage-Guard in App.tsx vor Admin-Render).

import { supabase } from './supabase'
import { sceneIdToBucketFolder } from '../data/idGenerator'

const BUCKET = 'rsi-textures'
const ROOT_PANORAMAS = 'panoramas'

export type PanoramaRole = 'haupt' | 'perspektive'

export interface StorageImage {
  name: string          // voller Pfad im Bucket, z.B. "panoramas/SZ_2026_001/haupt.webp"
  fileName: string      // nur der Datei-Name, z.B. "haupt.webp"
  szeneId: string | null  // extrahierte Szene-ID aus dem Pfad, oder null fuer Archiv/Legacy
  url: string
  size?: number
  createdAt?: string
  updatedAt?: string
}

// Erlaubte MIME-Types fuer Panorama-Bilder
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 25 * 1024 * 1024  // 25 MB

export interface UploadResult {
  ok: true
  image: StorageImage
}

export interface UploadError {
  ok: false
  reason: string
}

// Pfad-Helfer
function panoramaPath(szeneId: string, fileName: string): string {
  const folder = sceneIdToBucketFolder(szeneId)
  return `${ROOT_PANORAMAS}/${folder}/${fileName}`
}

function buildFileName(role: PanoramaRole, perspektivenNr: number | undefined, label: string | undefined, ext: string): string {
  if (role === 'haupt') return `haupt.${ext}`
  const nr = String(perspektivenNr ?? 1).padStart(3, '0')
  const safeLabel = (label ?? '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40).replace(/^_+|_+$/g, '')
  return safeLabel ? `persp_${nr}_${safeLabel}.${ext}` : `persp_${nr}.${ext}`
}

// Pfad zerlegen → Szene-ID extrahieren
function extractSzeneId(fullPath: string): string | null {
  const m = fullPath.match(new RegExp(`^${ROOT_PANORAMAS}/([^/]+)/`))
  if (!m || m[1] === '_archiv') return null
  return m[1]
}

function fileNameFromPath(fullPath: string): string {
  const idx = fullPath.lastIndexOf('/')
  return idx >= 0 ? fullPath.slice(idx + 1) : fullPath
}

// Upload-Optionen
export interface UploadOptions {
  szeneId: string                       // wohin (Pfad-Folder)
  role: PanoramaRole                    // haupt oder perspektive
  perspektivenNr?: number               // bei perspektive: laufende Nr (1, 2, 3, ...)
  perspektivenLabel?: string            // bei perspektive: sprechender Suffix
  upsert?: boolean                      // ueberschreibt bestehende Datei (default false)
}

export async function uploadPanorama(
  file: File,
  opts: UploadOptions,
): Promise<UploadResult | UploadError> {
  if (!supabase) return { ok: false, reason: 'Supabase nicht konfiguriert' }
  if (!opts.szeneId) return { ok: false, reason: 'Szene-ID fehlt' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, reason: `Format nicht unterstuetzt (${file.type}). Erlaubt: JPG, PNG, WEBP.` }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, reason: `Datei zu gross (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 25 MB.` }
  }

  const ext = (file.name.split('.').pop() ?? 'webp').toLowerCase()
  const fileName = buildFileName(opts.role, opts.perspektivenNr, opts.perspektivenLabel, ext)
  const fullPath = panoramaPath(opts.szeneId, fileName)

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fullPath, file, {
      contentType: file.type,
      upsert: opts.upsert ?? false,
      cacheControl: '31536000',
    })

  if (error) {
    return { ok: false, reason: `Upload fehlgeschlagen: ${error.message}` }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fullPath)
  return {
    ok: true,
    image: {
      name: fullPath,
      fileName,
      szeneId: opts.szeneId,
      url: urlData.publicUrl,
      size: file.size,
      createdAt: new Date().toISOString(),
    },
  }
}

// Rekursiv panoramas/-Tree listen, optional gefiltert auf eine Szene.
export async function listPanoramas(szeneId?: string): Promise<StorageImage[]> {
  if (!supabase) return []

  const result: StorageImage[] = []

  // 1. Wenn szeneId gesetzt: nur diesen Ordner listen
  if (szeneId) {
    const folder = sceneIdToBucketFolder(szeneId)
    const prefix = `${ROOT_PANORAMAS}/${folder}`
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    if (error) {
      console.warn('[RSI] Storage list (single scene) fehlgeschlagen:', error.message)
      return []
    }
    for (const f of data ?? []) {
      if (!f.name || f.name.startsWith('.')) continue
      const fullPath = `${prefix}/${f.name}`
      const meta = (f.metadata ?? null) as { size?: number } | null
      const { data: urlData } = supabase!.storage.from(BUCKET).getPublicUrl(fullPath)
      result.push({
        name: fullPath,
        fileName: f.name,
        szeneId,
        url: urlData.publicUrl,
        size: meta?.size,
        createdAt: f.created_at ?? undefined,
        updatedAt: f.updated_at ?? undefined,
      })
    }
    return result
  }

  // 2. Sonst: alle Szenen-Ordner unter panoramas/ listen + jeden Ordner-Inhalt
  const { data: folders, error: fErr } = await supabase.storage
    .from(BUCKET)
    .list(ROOT_PANORAMAS, { limit: 500 })
  if (fErr) {
    console.warn('[RSI] Storage list (root) fehlgeschlagen:', fErr.message)
    return []
  }

  for (const folder of folders ?? []) {
    if (!folder.name || folder.name.startsWith('.')) continue
    // Ordner-Eintraege haben kein metadata; Dateien haben metadata
    const isFolder = folder.metadata == null
    if (!isFolder) {
      // Direkt im panoramas/-Root liegende Files (Legacy / Archiv)
      const fullPath = `${ROOT_PANORAMAS}/${folder.name}`
      const meta = (folder.metadata ?? null) as { size?: number } | null
      const { data: urlData } = supabase!.storage.from(BUCKET).getPublicUrl(fullPath)
      result.push({
        name: fullPath,
        fileName: folder.name,
        szeneId: null,
        url: urlData.publicUrl,
        size: meta?.size,
        createdAt: folder.created_at ?? undefined,
        updatedAt: folder.updated_at ?? undefined,
      })
      continue
    }
    const subPrefix = `${ROOT_PANORAMAS}/${folder.name}`
    const { data: subData, error: sErr } = await supabase.storage
      .from(BUCKET)
      .list(subPrefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } })
    if (sErr) continue
    for (const f of subData ?? []) {
      if (!f.name || f.name.startsWith('.')) continue
      const fullPath = `${subPrefix}/${f.name}`
      const meta = (f.metadata ?? null) as { size?: number } | null
      const { data: urlData } = supabase!.storage.from(BUCKET).getPublicUrl(fullPath)
      result.push({
        name: fullPath,
        fileName: f.name,
        szeneId: folder.name === '_archiv' ? null : folder.name,
        url: urlData.publicUrl,
        size: meta?.size,
        createdAt: f.created_at ?? undefined,
        updatedAt: f.updated_at ?? undefined,
      })
    }
  }

  // 3. Auch Bucket-Root-Files mitnehmen (komplett alte Legacy-Files)
  const { data: rootFiles } = await supabase.storage
    .from(BUCKET)
    .list('', { limit: 500 })
  for (const f of rootFiles ?? []) {
    if (!f.name || f.name.startsWith('.') || f.metadata == null) continue
    const meta = (f.metadata ?? null) as { size?: number } | null
    const { data: urlData } = supabase!.storage.from(BUCKET).getPublicUrl(f.name)
    result.push({
      name: f.name,
      fileName: f.name,
      szeneId: null,
      url: urlData.publicUrl,
      size: meta?.size,
      createdAt: f.created_at ?? undefined,
      updatedAt: f.updated_at ?? undefined,
    })
  }

  return result
}

// Bilder gruppiert nach Szene-ID zurueckgeben
export async function listPanoramasBySzene(): Promise<Map<string, StorageImage[]>> {
  const all = await listPanoramas()
  const map = new Map<string, StorageImage[]>()
  for (const img of all) {
    const key = img.szeneId ?? '_legacy'
    const arr = map.get(key) ?? []
    arr.push(img)
    map.set(key, arr)
  }
  return map
}

// URL → Szene-ID zurueck-extrahieren (fuer Anzeige im Editor)
export function szeneIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length)
  return extractSzeneId(path)
}

// URL → vollen Datei-Namen (z.B. "haupt.webp")
export function fileNameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const path = url.slice(idx + marker.length)
  return fileNameFromPath(path)
}

// Bild aus dem Bucket loeschen.
export async function deletePanorama(name: string): Promise<{ ok: boolean; reason?: string }> {
  if (!supabase) return { ok: false, reason: 'Supabase nicht konfiguriert' }

  const { error } = await supabase.storage.from(BUCKET).remove([name])
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

// Aus einer Public-URL den Datei-Namen im Bucket extrahieren.
// Hilft beim Loeschen wenn nur die URL bekannt ist.
export function extractStorageName(url: string): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length)
}

// Pruefen ob eine URL aus unserem Bucket stammt
export function isStorageUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return url.includes(`/storage/v1/object/public/${BUCKET}/`)
}

// Lesbares Datums-Format fuer UI
export function formatStorageDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('de-CH', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// Lesbares Groessen-Format fuer UI
export function formatStorageSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
