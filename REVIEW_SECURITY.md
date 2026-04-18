# Security Review — RSI_Meta WebApp

**Datum:** 2026-04-19
**Reviewer:** Automatisiert (feature-dev code-reviewer agent mit Security-Fokus)
**Gesamtrisiko:** **MITTEL**

Die App enthält keine hochkritischen Sicherheitslücken im klassischen Sinne (kein Server-Backend, kein Auth-System). Die grössten Risiken liegen in der Architektur-Konzeption (PIN-Schutz, RLS-Policies, fehlende CSP-Header), nicht in Code-Fehlern.

---

## HOCH — Vor Pilot beheben

### H-1: Admin-PIN ist vollständig im Client-Bundle sichtbar

**Datei:** `src/components/LandingPage.tsx:32`, `vite.config.ts`

Alle `VITE_*`-Variablen werden von Vite zur Build-Zeit in den JavaScript-Bundle eingebettet. `VITE_ADMIN_PIN=2847` landet als Klartext im kompilierten JS. Jeder Benutzer findet ihn in den DevTools unter "Sources". Die PIN-Prüfung erfolgt ausschliesslich client-seitig — wirkungslos gegen jeden technisch motivierten Angreifer.

**Impact:** Vollständiger Schreibzugriff auf alle Trainingsinhalte (Topics, Scenes, Deficits) via Admin-Dashboard, inkl. Export/Import-Funktion.

**Empfehlung:** Den PIN-Check als echten serverseitigen Check (Supabase Edge Function oder RPC). Minimum: Den PIN vor jedem Kurs-Einsatz in Vercel-Env rotieren + redeployen.

**Konfidenz: 100**

---

### H-2: Keine RLS-Policies für Schreibzugriff auf rsi_topics / rsi_scenes / rsi_deficits dokumentiert

**Datei:** `src/lib/supabase.ts:17-19` (SQL-Kommentar)

Im SQL-Kommentar sind nur Policies für `rsi_results` dokumentiert. Für `rsi_topics`, `rsi_scenes`, `rsi_deficits` sind **keine** RLS-Policies sichtbar/dokumentiert. Der Anon-Key ist öffentlich im Bundle, und ohne RLS kann jeder direkt via REST API DELETEn oder UPSERTen.

**Impact (falls Policies fehlen):** Jeder Angreifer kann mit dem öffentlichen Anon-Key alle Kursinhalte löschen oder überschreiben. Kombiniert mit dem `seedSupabaseFromLocal()`-Mechanismus: Nach Löschen lädt der nächste Client seine lokalen Daten hoch → Persistente Manipulation.

**Empfehlung:** Im Supabase-Dashboard explizit sicherstellen: INSERT/UPDATE/DELETE auf Content-Tabellen nur via `service_role`. Anon nur `SELECT (true)`. SQL-Kommentar in `supabase.ts` um die fehlenden Policies erweitern.

**Konfidenz: 90**

---

### H-3: Anon-Key im produzierten JS-Bundle öffentlich sichtbar

**Datei:** `src/lib/supabase.ts:23-24`

By design bei Supabase — der Anon-Key IST public. Das Risiko entsteht nur in Kombination mit H-2 (fehlende RLS).

**Empfehlung:** Kein Handlungsbedarf am Code. H-2 muss gelöst sein damit dieser Key harmlos bleibt.

**Konfidenz: 80** (nur kritisch mit H-2)

---

## MITTEL — Vor Produktiv-Einsatz beheben

### M-1: Admin-Dashboard ohne serverseitige Autorisierungsprüfung

**Datei:** `src/App.tsx:390-394`

`view === 'admin'` wird nur über React-State gesteuert. Sobald `sessionStorage['rsi-admin-auth']` gesetzt ist (trivial via H-1), hat der User vollen CRUD-Zugriff. Die einzige Kontrolle auf Write-Ebene ist die Supabase-RLS (H-2).

**Empfehlung:** Kurzfristig: `isAdminAuth`-Check als Guard in App.tsx vor dem Admin-Render. Mittelfristig: Supabase RLS als tatsächliche Verteidigung.

**Konfidenz: 85**

---

### M-2: Kurs-Passwort im Klartext in localStorage

**Datei:** `src/data/appData.ts:188, 571-584`, `src/components/LandingPage.tsx:38`

`Kurs.passwort: string | null` wird ungehasht gespeichert. Klartext-Vergleich im Client (`passwortInput === selectedKurs.passwort`).

**Empfehlung:** bcrypt/PBKDF2-Hash speichern, Validierung als Supabase-RPC. Minimum: Passwörter nicht im `getKurse()`-Response an den Client zurückgeben.

**Konfidenz: 82**

---

### M-3: Import-Funktion ohne Schema-Validierung

**Datei:** `src/components/AdminDashboard.tsx:456-485`

Prüft nur `data.version === 'rsi-v3'`, kein Feld- oder Grössen-Check. Angriff: grosse base64-Bilder (localStorage-DoS), beliebige IDs (Overwrite bestehender Einträge), beliebige Strings in `nameI18n`.

**Empfehlung:** Mindest-Validierung: Array-Längen, Feld-Typen, base64-Grenzen, `id`-Regex-Format.

**Konfidenz: 82**

---

### M-4: Fehlende CSP-Header in vercel.json

**Datei:** `vercel.json`

Keine Security-Header: weder CSP, X-Content-Type-Options, X-Frame-Options, Permissions-Policy. Vercel setzt standardmässig einige, aber keine CSP.

**Empfehlung:** Mindest-CSP:
```
default-src 'self'
connect-src 'self' https://*.supabase.co wss://*.supabase.co
img-src 'self' blob: data:
script-src 'self'
frame-ancestors 'none'
```

**Konfidenz: 88**

---

### M-5: DSGVO-Pseudonymisierung — 8-Hex SHA-256 ist keine Anonymisierung

**Datei:** `src/data/appData.ts:650-656`

32 Bit Hash + kleiner Input-Raum (Teilnehmernamen) = trivialer Rainbow-Table-Angriff. Derselbe Username → derselbe Hash (kein Salt) → deterministische Pseudonymisierung, **nicht** Anonymisierung. Nach DSGVO Art. 4(5) unterliegen die Daten weiterhin dem Datenschutzrecht.

**Empfehlung:** User-spezifischen Salt einführen, oder im Datenschutzhinweis explizit "Pseudonymisierung" kommunizieren. Für Pilot akzeptabel, aber rechtlich dokumentieren.

**Konfidenz: 88**

---

### M-6: seedSupabaseFromLocal() triggert auf leerer Tabelle

**Datei:** `src/data/supabaseSync.ts:55-84`

Wenn `topicRows.length === 0`, wird Seed aus dem lokalen localStorage hochgeladen. Angriff (nur falls H-2 offen): Angreifer löscht alle Topics → eigener Client mit manipulierten localStorage-Daten triggert Seed → manipulierte Daten persistiert.

**Empfehlung:** `initialized`-Flag in Supabase selbst speichern (nicht nur Modul-Memory), Seed nur via `service_role`.

**Konfidenz: 83** (abhängig von H-2)

---

## NIEDRIG — Hardening

### N-1: Service Worker mit aggressiven Update-Flags

**Datei:** `vite.config.ts:15-16`

`skipWaiting: true` + `clientsClaim: true` — gut für Bugfix-Rollout, theoretisch XSS-Persistenz-Multiplikator. Praktisch nur relevant wenn CSP fehlt.

**Konfidenz: 80**

---

### N-2: Kein App-seitiges Rate-Limiting auf rsi_results-Inserts

**Datei:** `src/lib/supabase.ts:18-19`

`anon insert WITH CHECK (true)` erlaubt unbegrenzte Inserts. Supabase hat API-seitiges Rate-Limiting, aber nichts App-spezifisches.

**Empfehlung:** Supabase-Dashboard → Rate Limits pro IP konfigurieren.

**Konfidenz: 80**

---

### N-3: Zugangscode `FaSi4safety` als Seed im Bundle

**Datei:** `src/data/appData.ts:576`

Hardcoded im Default-Seed. Falls echte Kurse denselben Code verwenden — kompromittiert.

**Empfehlung:** Seed-Kurse nur mit Platzhalter-Codes. Echte Codes nur im Admin erstellen.

**Konfidenz: 80**

---

## Nicht-Issues — Was gut ist

- **SHA-256 via Web Crypto API** (`crypto.subtle.digest`) — keine Legacy-Hashes, keine Library-Risiken
- **Kein `dangerouslySetInnerHTML`** in der gesamten Codebase — React rendert alles escaped
- **`.gitignore` korrekt** — `.env.local` nie commited
- **`sessionStorage` für Admin-Auth** — Tab-Close = Logout (nicht persistent wie localStorage)
- **Supabase-Client null-sicher** — alle Sync-Funktionen prüfen `if (!supabase) return`
- **Panorama-Texturen aus `/public`** — keine dynamischen Script-Loads in der 3D-Pipe

---

## Operativ — Sofort-Checks

1. **Supabase-Dashboard** → Policies auf `rsi_topics`, `rsi_scenes`, `rsi_deficits`: DELETE/UPDATE für anon gesperrt? (Policy fehlt oder `USING (false)`)
2. **`rsi_results`**-Policy `anon insert WITH CHECK (true)` im Dashboard verifizieren
3. **`vercel.json`** um Security-Header erweitern (mindestens `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`)
4. **API-Keys im Supabase-Dashboard:** kein `service_role`-Key je client-seitig verwendet?
5. **PIN-Rotation** vor jedem Kurs-Einsatz (Vercel Env + Redeploy)
6. **Monitoring:** Supabase Logs → unerwartete DELETE-Operationen als Alert

---

## Priorisierte Fix-Liste

| Priorität | Finding | Aufwand |
|---|---|---|
| P1 (vor Pilot) | H-2: RLS-Policies Content-Tabellen verifizieren | 30 min Dashboard |
| P1 (vor Pilot) | H-1: PIN-Rotation-Prozess + Doku | 15 min |
| P2 (vor Produktiv) | M-4: CSP-Header in vercel.json | 30 min |
| P2 (vor Produktiv) | M-1: Admin-Guard in App.tsx | 15 min |
| P2 (vor Produktiv) | M-5: Datenschutz-Text "Pseudonymisierung" | 15 min |
| P2 (vor Produktiv) | M-3: Import-Schema-Validierung | 1 h |
| P3 (Pilot+) | M-2: Kurs-Passwort-Hashing | 1 h |
| P3 (Pilot+) | M-6: Seed-Guard in Supabase | 1 h |
| P3 (Pilot+) | H-1 server-seitig: Edge Function PIN-Check | 3 h |
| P4 (Hardening) | N-1/N-2/N-3 | je 15–30 min |
