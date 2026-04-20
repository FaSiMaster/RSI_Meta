// Supabase Edge Function: admin-auth
//
// Tauscht den Admin-PIN gegen ein kurzlebiges HMAC-signiertes Token.
// Client sendet PIN einmalig an diesen Endpoint und erhaelt ein Token,
// das anschliessend bei allen Admin-Writes (admin-write) als
// `x-admin-token`-Header dient. Damit ist der PIN nie mehr im Client-
// Bundle und nicht mehr in sessionStorage.
//
// Token-Format: "<expires_at_ms>.<base64-hmac-sha256>"
// Signiert mit Secret ADMIN_TOKEN_SECRET. TTL 2 Stunden.
//
// Deploy (Dashboard-UI, verify_jwt aus):
//   Supabase Dashboard → Edge Functions → Deploy new → Name: admin-auth
//   Secrets: ADMIN_PIN=<4-stellig>, ADMIN_TOKEN_SECRET=<32 hex bytes>
//
// Request:
//   POST /functions/v1/admin-auth
//   Body: { "pin": "5004" }
// Response 200: { "token": "1712345678901.BASE64SIG", "expiresAt": 1712345678901 }
// Response 401: { "error": "unauthorized" }

const ALLOWED_ORIGINS = [
  'https://rsi-meta.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 Stunden

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

// Padding-Trick gegen Length-Leak: beide Seiten werden auf eine feste
// Laenge gestreckt, bevor die Byte-Vergleiche starten.
function timingSafeEqual(a: string, b: string): boolean {
  const PAD_LEN = 64
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
  const payload = new TextEncoder().encode(String(expiresAt))
  const sig = await crypto.subtle.sign('HMAC', key, payload)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${expiresAt}.${b64}`
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return jsonResponse({ error: 'method-not-allowed' }, 405, cors)

  const adminPin = Deno.env.get('ADMIN_PIN')
  const tokenSecret = Deno.env.get('ADMIN_TOKEN_SECRET')
  if (!adminPin || !tokenSecret) {
    return jsonResponse({ error: 'server-misconfigured' }, 500, cors)
  }

  let body: { pin?: string }
  try { body = await req.json() } catch { return jsonResponse({ error: 'invalid-json' }, 400, cors) }

  const pin = typeof body.pin === 'string' ? body.pin : ''
  if (!pin || !timingSafeEqual(pin, adminPin)) {
    return jsonResponse({ error: 'unauthorized' }, 401, cors)
  }

  const expiresAt = Date.now() + TOKEN_TTL_MS
  const token = await signToken(expiresAt, tokenSecret)
  return jsonResponse({ token, expiresAt }, 200, cors)
})
