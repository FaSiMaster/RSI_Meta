// Supabase Storage Helper — Single Source of Truth fuer Panorama-Bilder
// Bucket: rsi-textures
//
// Erforderliche Bucket-Konfiguration im Supabase-Dashboard:
//   Storage -> rsi-textures -> public = true
//
// Erforderliche RLS-Policies auf storage.objects:
//   - SELECT  fuer alle (public read)
//   - INSERT  fuer anon  (Upload aus Admin-UI)
//   - DELETE  fuer anon  (Loeschen aus Admin-UI)
//
// Schreibzugriff im Code ist nur ueber Admin-PIN erreichbar
// (sessionStorage-Guard in App.tsx vor Admin-Render).

import { supabase } from './supabase'

const BUCKET = 'rsi-textures'

export interface StorageImage {
  name: string
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

// Datei nach Supabase Storage hochladen.
// customName optional — sonst wird timestamp + originaler Name verwendet.
export async function uploadPanorama(
  file: File,
  customName?: string,
): Promise<UploadResult | UploadError> {
  if (!supabase) return { ok: false, reason: 'Supabase nicht konfiguriert' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, reason: `Format nicht unterstuetzt (${file.type}). Erlaubt: JPG, PNG, WEBP.` }
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, reason: `Datei zu gross (${(file.size / 1024 / 1024).toFixed(1)} MB). Max: 25 MB.` }
  }

  const ext = (file.name.split('.').pop() ?? 'webp').toLowerCase()
  const baseName = customName
    ? customName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
    : file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60)
  const finalName = `${Date.now()}_${baseName}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(finalName, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000',
    })

  if (error) {
    return { ok: false, reason: `Upload fehlgeschlagen: ${error.message}` }
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(finalName)
  return {
    ok: true,
    image: {
      name: finalName,
      url: urlData.publicUrl,
      size: file.size,
      createdAt: new Date().toISOString(),
    },
  }
}

// Liste aller Panorama-Bilder im Bucket, sortiert nach Erstellung absteigend.
export async function listPanoramas(): Promise<StorageImage[]> {
  if (!supabase) return []

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list('', {
      limit: 500,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    console.warn('[RSI] Storage list fehlgeschlagen:', error.message)
    return []
  }

  return (data ?? [])
    .filter(f => f.name && !f.name.startsWith('.'))
    .map(f => {
      const meta = (f.metadata ?? null) as { size?: number; mimetype?: string } | null
      const { data: urlData } = supabase!.storage.from(BUCKET).getPublicUrl(f.name)
      return {
        name: f.name,
        url: urlData.publicUrl,
        size: meta?.size,
        createdAt: f.created_at ?? undefined,
        updatedAt: f.updated_at ?? undefined,
      }
    })
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
