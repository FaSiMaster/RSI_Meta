// Supabase Edge Function: kurs-auth
//
// Verifiziert ein Kurs-Passwort serverseitig. Ablauf:
//   1. Client sendet { zugangscode, passwort }
//   2. Server laedt passwort_hash aus rsi_kurse per SERVICE_ROLE
//   3. PBKDF2-HMAC-SHA256 (100k iter) mit Kurs-Salt + Server-Pepper
//   4. timing-safe Vergleich → { ok: true | false }
//
// Seit v0.7.0 (Sprint 3): client-seitiger SHA-256-Hash der alten Version
// ist entfernt. passwort_hash liegt in einer Spalte mit Column-Level-Grant
// (nur SERVICE_ROLE darf lesen). Damit ist der Hash nicht mehr via anon
// SELECT abrufbar — Offline-Brute-Force benoetigt erst einen DB-Breach.
//
// Deploy:
//   Supabase Dashboard → Edge Functions → Deploy new → Name: kurs-auth
//   Verify JWT: aus
//   Secrets:
//     SUPABASE_URL (auto)
//     SUPABASE_SERVICE_ROLE_KEY (auto)
//     KURS_PASSWORT_PEPPER = 32 hex bytes (openssl rand -hex 32)

import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://rsi-meta.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const HASH_PREFIX = 'kp:v2:'
const PBKDF2_ITERATIONS = 100_000
const HASH_BITS = 256

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  })
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('invalid hex length')
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Timing-safe Hex-String-Vergleich (beide gleicher Laenge erwartet, fix 64 chars)
function timingSafeEqualHex(a: string, b: string): boolean {
  const PAD = 64
  const ea = new TextEncoder().encode(a.padEnd(PAD, '\0')).slice(0, PAD)
  const eb = new TextEncoder().encode(b.padEnd(PAD, '\0')).slice(0, PAD)
  let diff = a.length ^ b.length
  for (let i = 0; i < PAD; i++) diff |= ea[i] ^ eb[i]
  return diff === 0
}

// PBKDF2-HMAC-SHA256 — Input: passwort + pepper, Salt pro Hash.
// Gibt 32 Bytes (64 Hex) aus.
async function pbkdf2(passwort: string, salt: Uint8Array, pepper: string): Promise<string> {
  const pwPeppered = new TextEncoder().encode(passwort + pepper)
  const key = await crypto.subtle.importKey(
    'raw',
    pwPeppered,
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    HASH_BITS,
  )
  return bytesToHex(new Uint8Array(bits))
}

// Gespeichertes Format parsen: "kp:v2:<salt_hex>:<hash_hex>"
function parseStoredHash(stored: string): { salt: Uint8Array; hash: string } | null {
  if (!stored.startsWith(HASH_PREFIX)) return null
  const rest = stored.slice(HASH_PREFIX.length)
  const parts = rest.split(':')
  if (parts.length !== 2) return null
  const [saltHex, hashHex] = parts
  if (saltHex.length !== 32 || hashHex.length !== 64) return null
  try {
    return { salt: hexToBytes(saltHex), hash: hashHex }
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST')    return jsonResponse({ error: 'method-not-allowed' }, 405, cors)

  const url    = Deno.env.get('SUPABASE_URL')
  const srk    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const pepper = Deno.env.get('KURS_PASSWORT_PEPPER')
  if (!url || !srk || !pepper) {
    return jsonResponse({ error: 'server-misconfigured' }, 500, cors)
  }

  let body: { zugangscode?: string; passwort?: string }
  try { body = await req.json() } catch { return jsonResponse({ error: 'invalid-json' }, 400, cors) }

  const zugangscode = typeof body.zugangscode === 'string' ? body.zugangscode.trim() : ''
  const passwort    = typeof body.passwort    === 'string' ? body.passwort            : ''
  if (!zugangscode || !passwort) {
    return jsonResponse({ error: 'missing-fields' }, 400, cors)
  }

  const db = createClient(url, srk, { auth: { persistSession: false } })

  // Zugangscode ist Free-Text in data-JSONB. Wir suchen case-insensitiv analog
  // zum Client (v0.6.4 Ranking-Fix).
  const { data: rows, error } = await db
    .from('rsi_kurse')
    .select('id, passwort_hash, data')
    .limit(500)
  if (error) {
    return jsonResponse({ error: 'db-error' }, 500, cors)
  }

  const kurs = (rows ?? []).find(r => {
    const code = (r.data as { zugangscode?: string })?.zugangscode
    return typeof code === 'string' && code.toLowerCase() === zugangscode.toLowerCase()
  })
  if (!kurs) {
    // Ueber den Kursnamen keine Infos leaken — gleiche Antwort wie bei
    // falschem Passwort. Timing ist hier nicht timing-safe, aber 10 ms
    // Differenz offenbaren nur "Kurs existiert"; Passwort-Entropie bleibt.
    return jsonResponse({ ok: false }, 200, cors)
  }

  if (!kurs.passwort_hash) {
    // Kurs existiert, hat aber kein Passwort gesetzt → implicit ok.
    // Entscheidung bewusst: Client sollte diesen Fall eigentlich gar nicht
    // erst anfragen (kurs.hatPasswort === false), aber wir tolerieren es.
    return jsonResponse({ ok: true }, 200, cors)
  }

  const parsed = parseStoredHash(kurs.passwort_hash)
  if (!parsed) {
    return jsonResponse({ error: 'hash-format' }, 500, cors)
  }

  const computed = await pbkdf2(passwort, parsed.salt, pepper)
  const ok = timingSafeEqualHex(computed, parsed.hash)
  return jsonResponse({ ok }, 200, cors)
})
