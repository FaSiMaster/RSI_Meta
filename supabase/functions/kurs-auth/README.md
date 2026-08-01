# Edge Function `kurs-auth`

Prüft ein Kurspasswort serverseitig. Eingeführt mit v0.7.0 im Rahmen des
Server-Pfefferns, als harter Wechsel ohne Übergangsfrist.

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

## Deployment

Supabase Dashboard → Edge Functions → Deploy new:

- **Name:** `kurs-auth`
- **Verify JWT:** aus
- **Code:** Inhalt von `index.ts` einfügen
- **Secrets** (Project Settings → Edge Functions → Secrets):
  - `SUPABASE_URL` – wird automatisch gesetzt
  - `SUPABASE_SERVICE_ROLE_KEY` – wird automatisch gesetzt
  - `KURS_PASSWORT_PEPPER` – 32 Byte hexadezimal, einmalig erzeugen:
    - unter Linux und macOS mit `openssl rand -hex 32`
    - unter PowerShell mit
      `-join ((1..32) | %{ '{0:x2}' -f (Get-Random -Max 256) })`
    - **Den Pfeffer nie wechseln, ohne alle Kurspasswörter neu zu setzen**,
      sonst werden die bestehenden Hashes ungültig.

## Voraussetzungen

Die Migration `2026_04_24_kurs_passwort_pfeffer.sql` muss ausgeführt sein; sie
legt die Spalte `passwort_hash` an und entzieht das Leserecht darauf. Ausserdem
muss `admin-write` mindestens in der Fassung v0.7.0 deployt sein, weil dort die
Passwörter beim Upsert serverseitig gehasht werden.

## Anfrage

```http
POST /functions/v1/kurs-auth
content-type: application/json
apikey: <anon-key>
authorization: Bearer <anon-key>

{ "zugangscode": "FK-RSI-123456", "passwort": "meinPasswort" }
```

## Antwort

```json
{ "ok": true }   // Passwort korrekt
{ "ok": false }  // Passwort falsch ODER Kurs nicht gefunden (kein Info-Leak)
```

Dass ein falsches Passwort und ein unbekannter Kurs dieselbe Antwort erhalten,
ist Absicht: Andernfalls liesse sich über die Antwort ermitteln, welche
Zugangscodes existieren.

Fehler werden mit 400 beantwortet, wenn Felder fehlen oder unbrauchbar sind, und
mit 500 bei fehlender Konfiguration, Datenbankfehlern oder einem unerwarteten
Format des Hashs.

## Format von `passwort_hash`

```
kp:v2:<salt_hex_32>:<hash_hex_64>
```

Der Marker `kp:v2:` nennt die Version; v1 war ein SHA-256 im Client und ist
entfernt. Das Salz umfasst 16 Byte und wird je Kurs zufällig gezogen. Der Hash
entsteht aus PBKDF2-HMAC-SHA256 über Passwort und Pfeffer, mit dem Salz, 100'000
Iterationen und 32 Byte Ausgabe.

## Sicherheitsmodell

Der Pfeffer liegt als Secret auf dem Server und macht ein Durchprobieren auch
dann unbrauchbar, wenn die Hashes abfliessen: Ohne ihn führt kein Kandidat zum
Ziel. Das Salz je Kurs verhindert vorberechnete Tabellen und verrät nicht, dass
zwei Kurse dasselbe Passwort tragen. Die 100'000 Iterationen bremsen ein
Durchprobieren auf der Grafikkarte um mehrere Grössenordnungen.

Weil das Leserecht auf die Spalte entzogen ist, kommt ein anonymer Zugriff nicht
an den Hash; dafür bräuchte es zuerst Zugang zur Datenbank oder zum
Service-Role-Schlüssel. Verglichen wird zeitkonstant, damit die Dauer der Antwort
nichts über den Hash verrät.

Eine Begrenzung der Anfragerate enthält die Funktion nicht; sie ist für die Zeit
nach dem Pilot vorgesehen. Der Missbrauch über die Oberfläche wird dadurch
begrenzt, dass Kurse nur im Administrationsbereich entstehen.
