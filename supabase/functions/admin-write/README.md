# Edge Function: `admin-write`

Proxy für Admin-Schreibzugriffe auf die Content-Tabellen `rsi_topics`,
`rsi_scenes`, `rsi_deficits`. Prüft den Admin-PIN (Header `x-admin-pin`)
gegen das Supabase-Secret `ADMIN_PIN` und schreibt mit dem
`SUPABASE_SERVICE_ROLE_KEY` direkt in die DB — die RLS-Policies können
damit auf **anon SELECT only** verschärft werden.

## Deploy

### Variante A — Supabase Dashboard (ohne CLI)

1. **Dashboard** → Projekt `gtweaesunpvwjlttyaab` → **Edge Functions** → **Deploy a new function**
2. **Function name:** `admin-write`
3. **Verify JWT:** **aus** (Schalter)
4. Inhalt von `index.ts` komplett in den Editor kopieren → **Deploy**
5. **Settings → Edge Functions → Secrets** → `ADMIN_PIN` = `5004` hinzufügen

### Variante B — Supabase CLI

```bash
supabase functions deploy admin-write --no-verify-jwt
supabase secrets set ADMIN_PIN=5004
```

## Test

```bash
curl -X POST \
  -H "x-admin-pin: 5004" \
  -H "content-type: application/json" \
  -d '{"table":"rsi_topics","op":"upsert","rows":[{"id":"test","data":{}}]}' \
  https://gtweaesunpvwjlttyaab.supabase.co/functions/v1/admin-write
```

Erwartet: `{"ok":true,"table":"rsi_topics","op":"upsert","count":1}`

## Sicherheitsmodell

- `ADMIN_PIN` ist Server-seitig (Supabase Secret, nicht im Client-Bundle)
- PIN-Vergleich via Timing-Safe-Compare
- Whitelist auf Tables + Operations (kein SQL-Injection möglich)
- Row-Limit 200 pro Upsert gegen Flood
- `verify_jwt=false` ist OK, weil der PIN als Shared Secret dient
- **Brute-Force-Schutz** (seit N-2, Schritt 3a): In-Memory-Counter pro IP,
  nach 10 fehlgeschlagenen PIN-Versuchen innerhalb 60 Sekunden → `429 Too
  Many Requests` mit `Retry-After`-Header. Bei PIN-Erfolg wird die IP
  zurückgesetzt. Der Schutz wirkt pro Deno-Instanz; bei massivem
  verteiltem Angriff würde Supabase/Cloudflare-Gateway zusätzlich greifen.
