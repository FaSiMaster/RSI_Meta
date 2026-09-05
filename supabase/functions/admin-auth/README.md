# Edge Function `admin-auth`

Tauscht die Admin-PIN gegen ein kurzlebiges, HMAC-signiertes Token. Damit muss
die PIN nicht mehr im Client-Bundle liegen; der Client hält nur noch das Token im
sessionStorage.

## Deployment

Dashboard → Edge Functions → Deploy new function:

- **Name:** `admin-auth`
- **Verify JWT:** aus
- **Code:** Inhalt von `index.ts` einfügen
- **Secrets** (Project Settings → Edge Functions → Secrets):
  - `ADMIN_PIN` – die aktuelle PIN, identisch mit der in `admin-write`
    hinterlegten. Der Wert gehört in einen Passwortsafe, nicht in
    dieses Repository.
  - `ADMIN_TOKEN_SECRET` – 32 Byte hexadezimal, einmalig erzeugt und geheim zu
    halten. Erzeugen etwa mit `openssl rand -hex 32` oder unter PowerShell mit
    `-join ((1..32) | %{ '{0:x2}' -f (Get-Random -Max 256) })`

## Anfrage

```http
POST /functions/v1/admin-auth
content-type: application/json
apikey: <anon-key>
authorization: Bearer <anon-key>

{ "pin": "<pin>" }
```

## Antwort

```json
{
  "token": "1712345678901.Base64HMACSignature",
  "expiresAt": 1712345678901
}
```

Das Token hat die Form `<expires_at_ms>.<base64-hmac-sha256>` und ist mit
`ADMIN_TOKEN_SECRET` signiert. Die Gültigkeit beträgt fest zwei Stunden.

## Sicherheitsmodell

Die PIN liegt ausschliesslich auf der Serverseite als Supabase-Secret. Verglichen
wird sie zeitkonstant, mit Auffüllung auf 64 Byte, damit die Länge nichts
verrät. Signiert wird das Token mit einem eigenen Secret, nicht mit der PIN
selbst. Statt eines offenen CORS gilt eine Whitelist mit der Produktionsadresse
und dem lokalen Entwicklungsserver.

Eine Begrenzung der Anfragerate enthält die Funktion nicht; eine
datenbankgestützte Lösung steht auf der Liste für die Zeit nach dem Pilot.

## Prüfung des Tokens in `admin-write`

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
