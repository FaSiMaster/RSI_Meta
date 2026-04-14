// Supabase Client – RSI VR Tool
// Liest URL und Key aus Vite-Umgebungsvariablen (.env.local / Vercel)
// Falls nicht konfiguriert: supabase = null → localStorage-Fallback
//
// Supabase SQL-Schema (einmalig im Supabase Dashboard → SQL Editor ausfuehren):
//
//   CREATE TABLE rsi_results (
//     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     username text NOT NULL,
//     kurs_code text,
//     scene_id text NOT NULL,
//     punkte integer NOT NULL,
//     prozent integer NOT NULL,
//     dauer_sekunden integer,
//     created_at timestamptz DEFAULT now()
//   );
//   ALTER TABLE rsi_results ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public read" ON rsi_results FOR SELECT USING (true);
//   CREATE POLICY "anon insert" ON rsi_results FOR INSERT WITH CHECK (true);

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null

export const isSupabaseConfigured = supabase !== null

// ── Verbindungsstatus (Live-Indikator in Navbar) ──────────────────────────

type ConnectionStatus = 'live' | 'offline'
let status: ConnectionStatus = 'offline'
const listeners = new Set<() => void>()

export function getSupabaseStatus(): ConnectionStatus {
  return status
}

export function setSupabaseStatus(s: ConnectionStatus): void {
  if (s === status) return
  status = s
  listeners.forEach(fn => fn())
}

export function onStatusChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ── Supabase Result Typ ──────────────────────────────────────────────────

export interface SupabaseResult {
  id: string
  username: string
  kurs_code: string | null
  scene_id: string
  punkte: number
  prozent: number
  dauer_sekunden: number | null
  created_at: string
}
