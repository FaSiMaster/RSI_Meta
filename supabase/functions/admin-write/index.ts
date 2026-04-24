// Supabase Edge Function: admin-write
//
// Proxy fuer Admin-Schreibzugriffe auf Content-Tabellen. Verifiziert ein
// HMAC-signiertes Token (ausgestellt von admin-auth) und schreibt mit
// SUPABASE_SERVICE_ROLE_KEY direkt in die DB. Damit koennen die RLS-
// Policies auf rsi_topics/scenes/deficits auf "anon SELECT only"
// verschaerft werden, ohne dass das Admin-Dashboard bricht.
//
// Seit v0.6.0 (Sprint-1):
// - PIN nicht mehr im Bundle → Token-Flow ueber admin-auth
// - CORS auf Vercel + Localhost eingeschraenkt
// - Payload-Schema pro Tabelle, JSON-Size-Limit 256 KB pro Row

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_TABLES = ['rsi_topics', 'rsi_scenes', 'rsi_deficits', 'rsi_kurse'] as const
const ALLOWED_OPS    = ['upsert', 'delete'] as const
type AllowedTable = typeof ALLOWED_TABLES[number]
type AllowedOp    = typeof ALLOWED_OPS[number]

const ALLOWED_ORIGINS = [
  'https://rsi-meta.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]
const MAX_ROW_BYTES = 256 * 1024
const MAX_ROWS      = 200

// Pro Tabelle: Pflichtfelder + optionale Felder. Andere Felder werden abgelehnt.
const TABLE_SCHEMAS: Record<AllowedTable, { required: string[]; optional: string[] }> = {
  rsi_topics:   { required: ['id', 'data'],                   optional: ['updated_at'] },
  rsi_scenes:   { required: ['id', 'topic_id', 'data'],       optional: ['updated_at'] },
  rsi_deficits: { required: ['id', 'scene_id', 'data'],       optional: ['updated_at'] },
  rsi_kurse:    { required: ['id', 'data'],                   optional: ['updated_at'] },
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
    'Vary': 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  const PAD_LEN = 256
  const ea = new TextEncoder().encode(a.padEnd(PAD_LEN, '\0')).slice(0, PAD_LEN)
  const eb = new TextEncoder().encode(b.padEnd(PAD_LEN, '\0')).slice(0, PAD_LEN)
  let diff = a.length ^ b.length
  for (let i = 0; i < PAD_LEN; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}

async function signToken(expiresAt: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(String(expiresAt)))
  return `${expiresAt}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const ts = parseInt(parts[0], 10)
  if (!Number.isFinite(ts) || ts < Date.now()) return false
  const expected = await signToken(ts, secret)
  return timingSafeEqual(token, expected)
}

function validateRow(table: AllowedTable, row: unknown): string | null {
  if (typeof row !== 'object' || row === null) return 'row not object'
  const obj = row as Record<string, unknown>
  const { required, optional } = TABLE_SCHEMAS[table]
  const allowed = new Set([...required, ...optional])

  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) return `unknown field: ${k}`
  }
  for (const k of required) {
    if (!(k in obj)) return `missing field: ${k}`
  }
  if (typeof obj.id !== 'string' || obj.id.length === 0 || obj.id.length > 200) return 'invalid id'
  if (typeof obj.data !== 'object' || obj.data === null) return 'data must be object'
  if ('topic_id' in obj && typeof obj.topic_id !== 'string') return 'topic_id must be string'
  if ('scene_id' in obj && typeof obj.scene_id !== 'string') return 'scene_id must be string'
  if ('updated_at' in obj && typeof obj.updated_at !== 'string') return 'updated_at must be string'

  const size = new TextEncoder().encode(JSON.stringify(obj)).length
  if (size > MAX_ROW_BYTES) return `row too large: ${size} bytes (max ${MAX_ROW_BYTES})`
  return null
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return jsonResponse({ error: 'method-not-allowed' }, 405, cors)

  // Token-Gate
  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET')
  if (!tokenSecret) return jsonResponse({ error: 'server-misconfigured' }, 500, cors)
  const token = req.headers.get('x-admin-token') ?? ''
  if (!token || !(await verifyToken(token, tokenSecret))) {
    return jsonResponse({ error: 'unauthorized' }, 401, cors)
  }

  // Payload
  let body: { table?: string; op?: string; rows?: unknown[]; id?: string }
  try { body = await req.json() } catch { return jsonResponse({ error: 'invalid-json' }, 400, cors) }

  if (!body.table || !ALLOWED_TABLES.includes(body.table as AllowedTable)) {
    return jsonResponse({ error: 'invalid-table' }, 400, cors)
  }
  if (!body.op || !ALLOWED_OPS.includes(body.op as AllowedOp)) {
    return jsonResponse({ error: 'invalid-op' }, 400, cors)
  }
  const table = body.table as AllowedTable
  const op    = body.op as AllowedOp

  // Service-Role-Client
  const url = Deno.env.get('SUPABASE_URL')
  const srk = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !srk) return jsonResponse({ error: 'server-misconfigured' }, 500, cors)
  const db = createClient(url, srk, { auth: { persistSession: false } })

  try {
    if (op === 'upsert') {
      if (!Array.isArray(body.rows) || body.rows.length === 0) {
        return jsonResponse({ error: 'rows-missing' }, 400, cors)
      }
      if (body.rows.length > MAX_ROWS) {
        return jsonResponse({ error: `too-many-rows (max ${MAX_ROWS})` }, 400, cors)
      }
      for (let i = 0; i < body.rows.length; i++) {
        const err = validateRow(table, body.rows[i])
        if (err) return jsonResponse({ error: `row ${i}: ${err}` }, 400, cors)
      }
      const { error } = await db.from(table).upsert(body.rows)
      if (error) throw error
      return jsonResponse({ ok: true, table, op, count: body.rows.length }, 200, cors)
    }
    // op === 'delete'
    if (typeof body.id !== 'string' || body.id.length === 0 || body.id.length > 200) {
      return jsonResponse({ error: 'invalid-id' }, 400, cors)
    }
    const { error } = await db.from(table).delete().eq('id', body.id)
    if (error) throw error
    return jsonResponse({ ok: true, table, op, id: body.id }, 200, cors)
  } catch (err) {
    return jsonResponse({ error: String(err instanceof Error ? err.message : err) }, 500, cors)
  }
})
