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

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...(extraHeaders ?? {}) },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ── Brute-Force-Schutz (In-Memory pro Deno-Instanz) ──
// Nach FAIL_THRESHOLD fehlgeschlagenen PIN-Versuchen aus derselben IP
// innerhalb FAIL_WINDOW_MS -> 429 fuer den Rest des Fensters.
// Beim PIN-Erfolg wird die IP aus dem Tracker entfernt.
// Hinweis: Edge Functions skalieren auf mehrere Instanzen, der Schutz wirkt
// pro Instanz — ein Angreifer koennte theoretisch parallel mehrere
// Instanzen ansprechen. Fuer Pilot-Kontext trotzdem ausreichend, weil
// Supabase/Cloudflare pro IP ohnehin ein globales Limit durchsetzen.
const FAIL_WINDOW_MS = 60_000
const FAIL_THRESHOLD = 10
const failTracker = new Map<string, { fails: number; firstFailAt: number }>()

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown'
}

function checkRateLimit(ip: string): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now()
  const entry = failTracker.get(ip)
  if (!entry) return { blocked: false, retryAfterSec: 0 }
  if (now - entry.firstFailAt > FAIL_WINDOW_MS) {
    failTracker.delete(ip)
    return { blocked: false, retryAfterSec: 0 }
  }
  if (entry.fails >= FAIL_THRESHOLD) {
    const retryMs = FAIL_WINDOW_MS - (now - entry.firstFailAt)
    return { blocked: true, retryAfterSec: Math.max(1, Math.ceil(retryMs / 1000)) }
  }
  return { blocked: false, retryAfterSec: 0 }
}

function recordFail(ip: string): void {
  const now = Date.now()
  const entry = failTracker.get(ip)
  if (!entry || now - entry.firstFailAt > FAIL_WINDOW_MS) {
    failTracker.set(ip, { fails: 1, firstFailAt: now })
  } else {
    entry.fails++
  }
  // Gelegentlich alte Eintraege aufraeumen, damit Map nicht unbegrenzt waechst
  if (failTracker.size > 1000 || Math.random() < 0.01) {
    for (const [k, v] of failTracker.entries()) {
      if (now - v.firstFailAt > FAIL_WINDOW_MS) failTracker.delete(k)
    }
  }
}

function recordSuccess(ip: string): void {
  failTracker.delete(ip)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  // Rate-Limit-Check (vor PIN, damit geblockte IPs keine weiteren Checks ausloesen)
  const ip = getClientIp(req)
  const rl = checkRateLimit(ip)
  if (rl.blocked) {
    return jsonResponse(
      { error: 'Too many failed attempts', retry_after_sec: rl.retryAfterSec },
      429,
      { 'retry-after': String(rl.retryAfterSec) },
    )
  }

  // PIN-Gate
  const adminPin = Deno.env.get('ADMIN_PIN')
  if (!adminPin) return jsonResponse({ error: 'ADMIN_PIN secret not configured' }, 500)
  const pinHeader = req.headers.get('x-admin-pin') ?? ''
  if (!timingSafeEqual(pinHeader, adminPin)) {
    recordFail(ip)
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  recordSuccess(ip)

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
