# Edge Function: `kurs-auth`

Verifiziert ein Kurs-Passwort serverseitig — seit v0.7.0 (Sprint 3, Server-
Salt-Pfeffern, Hard-Cutover).

## Ablauf

```
Client                               kurs-auth (Edge)              Supabase DB
  │                                       │                              │
  │  POST /functions/v1/kurs-auth         │                              │
  │  { zugangscode, passwort }            │                              │
  ├──────────────────────────────────────▶│                              │
  │                                       │  SELECT id, passwort_hash    │
  │                                       │  FROM rsi_kurse              │
  │                                       │  (service_role)              │
  │                                       ├─────────────────────────────▶│
  │                                       │◀─────────────────────────────┤
  │                                       │                              │
  │                                       │  PBKDF2(pw + pepper, salt,   │
  │                                       │         100_000 iter)        │
  │                                       │  timingSafeEqual(hash)       │
  │  { ok: true | false }                 │                              │
  │◀──────────────────────────────────────┤                              │
```

## Deploy

Supabase Dashboard → Edge Functions → Deploy new:
- **Name:** `kurs-auth`
- **Verify JWT:** aus
- **Code:** Inhalt von `index.ts` einfuegen
- **Secrets** (Project Settings → Edge Functions → Secrets):
  - `SUPABASE_URL` — automatisch gesetzt
  - `SUPABASE_SERVICE_ROLE_KEY` — automatisch gesetzt
  - `KURS_PASSWORT_PEPPER` — 32 hex bytes, einmalig generieren:
    - Linux/Mac: `openssl rand -hex 32`
    - PowerShell: `-join ((1..32) | %{ '{0:x2}' -f (Get-Random -Max 256) })`
    - **Pepper NIE rotieren, ohne alle Kurs-Passwoerter neu zu setzen** —
      sonst werden bestehende Hashes ungueltig.

## Voraussetzungen

1. Migration `2026_04_24_kurs_passwort_pfeffer.sql` ausgefuehrt
   (Spalte `passwort_hash`, Column-Level-Grants)
2. `admin-write` v0.7.0 deployed (hasht Passwoerter beim Upsert serverseitig)

## Request

```http
POST /functions/v1/kurs-auth
content-type: application/json
apikey: <anon-key>
authorization: Bearer <anon-key>

{ "zugangscode": "FK-RSI-123456", "passwort": "meinPasswort" }
```

## Response

```json
{ "ok": true }   // Passwort korrekt
{ "ok": false }  // Passwort falsch ODER Kurs nicht gefunden (kein Info-Leak)
```

Fehler-Responses: 400 (missing/invalid fields), 500 (server misconfigured,
DB error, Hash-Format-Fehler).

## Format `passwort_hash`

```
kp:v2:<salt_hex_32>:<hash_hex_64>
```

- `kp:v2:` — Marker + Versionsprefix (v1 war client-seitiges SHA-256, entfernt)
- Salt: 16 Bytes (32 Hex-Zeichen), per Kurs zufaellig
- Hash: PBKDF2-HMAC-SHA256(passwort + pepper, salt, 100'000 iter, 32 Byte Output)

## Sicherheitsmodell

- **Pepper** (Server-Secret) verhindert Offline-Brute-Force auch bei Hash-Leak:
  ohne Kenntnis des Peppers sind alle Kandidaten unbenutzbar.
- **Salt** (pro Kurs) verhindert Rainbow-Tables und Equal-Password-Detection.
- **PBKDF2 100k Iter** bremst GPU-Brute-Force von ~10^9/s auf ~10^3/s.
- **Column-Grant** verhindert, dass anon SELECT den Hash lesen kann —
  Angreifer muss erst einen DB-Admin- oder SERVICE_ROLE-Breach schaffen.
- **Timing-safe Compare** via Padding-Trick verhindert Side-Channel auf den
  Hash.
- **Rate-Limits** (Post-Pilot): aktuell keine in der Function. Missbrauch
  ueber das Web-UI wird zudem durch Admin-Kurs-Verwaltung begrenzt.
