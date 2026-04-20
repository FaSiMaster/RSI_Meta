# Edge Function: `admin-auth`

Tauscht den Admin-PIN gegen ein kurzlebiges HMAC-signiertes Token. Damit
kann der PIN aus dem Client-Bundle entfernt werden — der Client hält nur
noch das Token in sessionStorage.

## Deploy

Dashboard → Edge Functions → Deploy new function:
- **Name:** `admin-auth`
- **Verify JWT:** aus
- **Code:** Inhalt von `index.ts` einfügen
- **Secrets** (Project Settings → Edge Functions → Secrets):
  - `ADMIN_PIN` = aktueller 4-stelliger PIN (identisch mit admin-write)
  - `ADMIN_TOKEN_SECRET` = 32 hex bytes, einmalig erzeugt, geheim halten.
    Generieren z.B. mit `openssl rand -hex 32` oder PowerShell
    `-join ((1..32) | %{ '{0:x2}' -f (Get-Random -Max 256) })`

## Request

```http
POST /functions/v1/admin-auth
content-type: application/json
apikey: <anon-key>
authorization: Bearer <anon-key>

{ "pin": "5004" }
```

## Response

```json
{
  "token": "1712345678901.Base64HMACSignature",
  "expiresAt": 1712345678901
}
```

Token-Format: `<expires_at_ms>.<base64-hmac-sha256>`. Signiert mit
`ADMIN_TOKEN_SECRET`. TTL 2 Stunden (hartcodiert).

## Sicherheitsmodell

- PIN nur noch Server-seitig (Supabase Secret)
- PIN-Vergleich via Padding-Timing-Safe-Compare (64-Byte-Padding verhindert
  Length-Leak)
- Token signiert mit separatem Secret (nicht dem PIN)
- CORS-Whitelist: Vercel-Produktion + lokaler Dev-Server
- Keine Rate-Limits in der Function selbst (DB-basiert im Post-Pilot-Backlog)

## Token-Verifikation in admin-write

```ts
// Extrahiert aus admin-write:
async function verifyToken(token: string, secret: string): Promise<boolean> {
  const [tsStr, sig] = token.split('.')
  if (!tsStr || !sig) return false
  const ts = parseInt(tsStr, 10)
  if (!Number.isFinite(ts) || ts < Date.now()) return false
  const expected = await signToken(ts, secret)
  return timingSafeEqual(token, expected)
}
```
