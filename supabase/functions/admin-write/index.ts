// Supabase Edge Function: admin-write
//
// Proxy fuer Admin-Schreibzugriffe auf Content-Tabellen. Prueft den Admin-PIN
// (als Header x-admin-pin) gegen das Secret ADMIN_PIN und schreibt dann mit
// dem SUPABASE_SERVICE_ROLE_KEY direkt in die DB. Damit koennen die RLS-
// Policies auf rsi_topics/scenes/deficits auf "anon SELECT only" verschaerft
// werden, ohne dass das Admin-Dashboard bricht.
//
// Deploy:
//   supabase functions deploy admin-write --no-verify-jwt
//   supabase secrets set ADMIN_PIN=<4-stellig>
//   (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sind automatisch verfuegbar)
//
// Request:
//   POST /functions/v1/admin-write
//   Header: x-admin-pin: 5004
//   Body:   { "table": "rsi_topics", "op": "upsert", "rows": [...] }
//           { "table": "rsi_topics", "op": "delete", "id": "TP_fuss" }

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_TABLES = ['rsi_topics', 'rsi_scenes', 'rsi_deficits'] as const
const ALLOWED_OPS    = ['upsert', 'delete'] as const
type AllowedTable = typeof ALLOWED_TABLES[number]
type AllowedOp    = typeof ALLOWED_OPS[number]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-pin',
}
const JSON_HEADERS = { ...CORS_HEADERS, 'content-type': 'application/json' }

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  // PIN-Gate. Kein per-IP-Rate-Limit hier — Supabase Edge Functions laufen
  // auf mehreren Instanzen, ein In-Memory-Counter waere wirkungslos. Echter
  // DB-basierter Limiter folgt beim Ausbau post-Pilot (siehe BACKLOG).
  // Supabase/Cloudflare-Gateway enforct ohnehin ein globales per-IP-Limit.
  const adminPin = Deno.env.get('ADMIN_PIN')
  if (!adminPin) return jsonResponse({ error: 'ADMIN_PIN secret not configured' }, 500)
  const pinHeader = req.headers.get('x-admin-pin') ?? ''
  if (!timingSafeEqual(pinHeader, adminPin)) return jsonResponse({ error: 'Unauthorized' }, 401)

  // Payload-Parsing
  let body: { table?: string; op?: string; rows?: unknown[]; id?: string }
  try { body = await req.json() } catch { return jsonResponse({ error: 'Invalid JSON' }, 400) }

  if (!body.table || !ALLOWED_TABLES.includes(body.table as AllowedTable)) {
    return jsonResponse({ error: 'Invalid table' }, 400)
  }
  if (!body.op || !ALLOWED_OPS.includes(body.op as AllowedOp)) {
    return jsonResponse({ error: 'Invalid op' }, 400)
  }
  const table = body.table as AllowedTable
  const op    = body.op as AllowedOp

  // Service-Role-Client (RLS-bypass)
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return jsonResponse({ error: 'Supabase env missing' }, 500)
  const db = createClient(url, key, { auth: { persistSession: false } })

  try {
    if (op === 'upsert') {
      if (!Array.isArray(body.rows) || body.rows.length === 0) {
        return jsonResponse({ error: 'rows missing or empty' }, 400)
      }
      if (body.rows.length > 200) {
        return jsonResponse({ error: 'too many rows (max 200)' }, 400)
      }
      const { error } = await db.from(table).upsert(body.rows)
      if (error) throw error
      return jsonResponse({ ok: true, table, op, count: body.rows.length }, 200)
    }
    // op === 'delete'
    if (typeof body.id !== 'string' || body.id.length === 0) {
      return jsonResponse({ error: 'id missing' }, 400)
    }
    const { error } = await db.from(table).delete().eq('id', body.id)
    if (error) throw error
    return jsonResponse({ ok: true, table, op, id: body.id }, 200)
  } catch (err) {
    return jsonResponse({ error: String(err instanceof Error ? err.message : err) }, 500)
  }
})
