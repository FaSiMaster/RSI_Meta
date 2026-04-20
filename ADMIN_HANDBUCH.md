# Admin-Handbuch — RSI VR Tool

> Für Kursleitung / Fachstelle. Stand v0.6.0.
> Voraussetzung: Admin-PIN (4-stellig) als Supabase-Secret gesetzt, Edge Functions `admin-auth` + `admin-write` deployed.

---

## 1. Zugang

1. Auf LandingPage → oben rechts **Admin**-Button (Schloss-Icon).
2. PIN eingeben (4 Stellen, aktuell `5004`).
3. Der Client schickt die PIN an die Supabase Edge Function `admin-auth`. Bei korrekter PIN erhält er ein HMAC-signiertes Token (2 h TTL), das in `sessionStorage['rsi-admin-token']` gespeichert wird.
4. Authentifizierung gilt nur für die laufende Browser-Session. Token läuft nach 2 h ab → automatischer Logout beim nächsten 401.

**Sicherheit seit v0.6.0:** Die PIN ist **nicht mehr** im Client-Bundle. Sie liegt ausschliesslich als Supabase Edge Function Secret (`ADMIN_PIN`). Der Client sieht die PIN nur für die Dauer des HTTPS-Requests und vergisst sie nach dem Token-Austausch. Rotieren Sie die PIN vor jedem Kurs-Einsatz über das Supabase Dashboard und redeployen die `admin-auth`-Function.

### 1.1 Token-Flow (v0.6.0)

```
User gibt PIN ein
       ↓
Client → POST /functions/v1/admin-auth { pin }
       ↓
Edge Function prüft PIN gegen Secret ADMIN_PIN (timing-safe-compare)
       ↓
Erzeugt Token: <expires>.<base64-hmac>
   - expires  = now + 2h (Epoch-ms)
   - hmac     = HMAC-SHA256(ADMIN_TOKEN_SECRET, expires)
       ↓
Client speichert Token in sessionStorage['rsi-admin-token']
       ↓
Alle Admin-Writes (supabaseSync.ts): Header x-admin-token
       ↓
admin-write verifiziert Token (timing-safe, prüft expires > now)
       ↓
Bei 401: Token + Auth-Flag werden geräumt, User muss neu PIN eingeben
```

### 1.2 Environment-Variablen

Für den Produktivbetrieb müssen folgende Variablen gesetzt sein — getrennt nach **Client (Vercel)** und **Server (Supabase Edge Function Secrets)**.

#### Client (Vercel + lokale `.env.local`)

| Variable | Zweck | Pflicht |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase-Endpoint für Sync | ja |
| `VITE_SUPABASE_ANON_KEY` | Supabase-Anon-Key (öffentlich, RLS schützt) | ja |
| `VITE_USERNAME_SALT` | Geheimes Salt für Username-Hashing (DSGVO) — verhindert Rainbow-Table-Preimage auf dem Supabase-Dump. **Muss pro Deployment einmalig gesetzt werden und sollte nicht rotiert werden**, sonst werden Hashes bestehender Rankings unbrauchbar. | ja (sonst Konsolen-Warnung) |
| `VITE_SENTRY_DSN` | Sentry-DSN für Error-Tracking | nein (leer = Sentry aus, im Pilot leer) |

**Entfernt in v0.6.0:** `VITE_ADMIN_PIN` wird nicht mehr gelesen. Falls die Variable noch in Vercel steht, kann sie ersatzlos gelöscht werden.

#### Server (Supabase Edge Function Secrets)

| Variable | Zweck | Pflicht |
|---|---|---|
| `ADMIN_PIN` | 4-stelliger Admin-PIN (aktuell `5004`), vor jedem Kurs rotieren | ja |
| `ADMIN_TOKEN_SECRET` | 32 hex bytes (64 Zeichen) für HMAC-Signatur der Admin-Tokens. **Einmalig setzen, nicht rotieren** (sonst werden alle aktiven Sessions ungültig). | ja |

Setzen via Dashboard: Supabase → Project → Edge Functions → Secrets, oder CLI:

```bash
supabase secrets set ADMIN_PIN=5004
supabase secrets set ADMIN_TOKEN_SECRET=$(openssl rand -hex 32)
```

**Salt-Erzeugung** (Client, einmalig beim Deployment-Aufbau):

```bash
# Zufälligen 32-Zeichen-Salt generieren:
openssl rand -hex 16
# Ergebnis z.B.: 2f8a9c1b7e4d3a06f9b8e7c6d5a4b3c2
```

Diesen Wert in Vercel → Settings → Environment Variables als `VITE_USERNAME_SALT` speichern und **dauerhaft** dort behalten. Backup in einem Passwort-Manager (nicht im Git-Repo!).

---

## 2. Edge Functions (seit v0.6.0)

### 2.1 Überblick

Zwei Deno-basierte Supabase Edge Functions bilden die Server-Seite:

| Function | Zweck | Aufgerufen von |
|---|---|---|
| `admin-auth` | Tauscht PIN gegen HMAC-signiertes Token (2 h TTL) | LandingPage Admin-Login |
| `admin-write` | Nimmt Writes (upsert/delete) auf `rsi_topics`, `rsi_scenes`, `rsi_deficits` entgegen, validiert Token + Payload, schreibt mit `service_role`-Key | Admin-Dashboard via `supabaseSync.ts` |

Source: `supabase/functions/admin-auth/index.ts` und `supabase/functions/admin-write/index.ts`.

### 2.2 Schutzmechanismen in `admin-write`

- **Token-Verifikation** (timing-safe HMAC-Compare, 128er-Padding gegen Length-Leak)
- **CORS-Whitelist** statt `*`: Vercel-Production-URL + `localhost:5173/5174`
- **Payload-Schema-Validation** pro Tabelle (Whitelist zulässiger Felder, Typ-Checks)
- **256-KB-Row-Size-Limit** pro Zeile
- **max 200 Rows** pro Upsert-Request
- Schreibt mit `service_role` (umgeht RLS) — deshalb ist saubere Payload-Validation zwingend

### 2.3 Deploy-Anleitung (Dashboard-UI)

1. Supabase Dashboard → Project → Edge Functions → **Deploy a new function**.
2. Name: `admin-auth` (bzw. `admin-write`).
3. **Wichtig:** Checkbox «Enforce JWT verification» → **deaktivieren** (`verify_jwt: false`). Die Functions nutzen eigene PIN/Token-Logik, kein Supabase-Auth-JWT.
4. Quellcode aus `supabase/functions/{name}/index.ts` einfügen und deployen.
5. Secrets (`ADMIN_PIN`, `ADMIN_TOKEN_SECRET`) müssen gesetzt sein (siehe 1.2).
6. Test: `curl -X POST https://<project>.supabase.co/functions/v1/admin-auth -H 'Content-Type: application/json' -d '{"pin":"5004"}'` → muss Token liefern.

### 2.4 Deploy via CLI (alternativ)

```bash
# einmalig: supabase login && supabase link --project-ref <ref>
supabase functions deploy admin-auth --no-verify-jwt
supabase functions deploy admin-write --no-verify-jwt
supabase secrets set ADMIN_PIN=5004
supabase secrets set ADMIN_TOKEN_SECRET=$(openssl rand -hex 32)
```

### 2.5 PIN-Rotations-Prozess (seit v0.6.0)

1. Neue PIN wählen (4 Stellen, nicht `0000`/`1234`/ähnliche Trivia).
2. Supabase Dashboard → Edge Functions → Secrets → `ADMIN_PIN` ändern.
3. **Edge Function `admin-auth` redeployen** (Dashboard → Function `admin-auth` → Deploy).
4. Alte Tokens bleiben bis zu 2 h gültig (TTL) — akzeptabel, da sie nur Schreibrechte haben und ausgegeben sind.
5. Keine Vercel-Änderung nötig, kein App-Redeploy.
6. Alte PIN sicher verwerfen (Passwort-Manager-Eintrag archivieren).

Im Gegensatz zu v0.5.x **kein Vercel-Redeploy mehr nötig** — die PIN liegt nicht mehr im Client-Bundle.

### 2.6 Fehlerbilder

- **401 beim Admin-Login trotz korrekter PIN:** `admin-auth` prüft PIN timing-safe. Meist Tippfehler oder `ADMIN_PIN`-Secret nicht gesetzt / falsch deployed. Supabase → Logs prüfen.
- **401 bei Admin-Write kurz nach Login:** Token expired (2 h). Admin muss neu PIN eingeben. Der Client räumt `sessionStorage['rsi-admin-token']` + `rsi-admin-auth` automatisch beim 401.
- **CORS-Fehler im Browser:** Origin ist nicht in der Whitelist der Edge Function. Bei neuer Vercel-Preview-URL muss die Whitelist in `admin-auth/index.ts` + `admin-write/index.ts` erweitert + redeployed werden.

---

## 3. Tabs-Übersicht

Das Admin-Dashboard hat vier Haupt-Tabs:

| Tab | Inhalt |
|---|---|
| **Inhalte** | Themen, Szenen, Defizite (CRUD) |
| **Kurse** | Kurs-Anlage, Zugangscodes, Themen-Auswahl |
| **Rangliste** | AdminRanking — User/Kurs-Einträge verwalten |
| **Export / Import** | JSON-Dump der gesamten Datenbasis |

---

## 4. Themen-Verwaltung

### 4.1 Struktur
- **Oberthema** → Beispiel: «Verkehrsführung»
- **Unterthema (Gruppe)** → Beispiel: «Linienführung»
- **Szene** → konkrete Verkehrssituation (ID-Format `SZ_YYYY_NNN`)
- **Defizite** → pro Szene (ID-Format `SD_NNNN`)

### 4.2 Aktionen
- **Neues Oberthema / neue Gruppe:** Button rechts oben
- **Umsortieren:** Pfeile rauf/runter (sortOrder)
- **Umbenennen:** Inline-Edit
- **Archivieren:** `isActive: false` — Szenen bleiben erhalten, sind aber für Teilnehmer nicht sichtbar
- **Löschen (Oberthema):** seit v0.6.0 mit expliziter Confirm-Bestätigung, die den Kaskaden-Umfang nennt (X Untergruppen, Y Szenen inkl. aller Defizite).

### 4.3 Piktogramm-Katalog (seit v0.5.0)
Jedes Oberthema kann ein Piktogramm aus dem Katalog (23 Lucide-Icons) erhalten, Picker-UI im Admin. Bei Neuanlage wird automatisch ein Vorschlag aus dem Themennamen abgeleitet (`suggestIconKey`).

### 4.4 Mehrsprachigkeit
Alle Titel/Beschreibungen als `MultiLang`-Objekt (de/fr/it/en). **Deutsch ist Pflicht**, andere Sprachen werden bei Fehlen automatisch mit DE befüllt.

---

## 5. Szenen-Verwaltung

### 5.1 Neue Szene
1. Unterthema wählen.
2. **Neue Szene** → Modal öffnet sich.
3. Eingeben:
   - **Titel** (mehrsprachig)
   - **Kontext-Beschreibung** (Einführungs-Text, mehrsprachig)
   - **Merkmale** (Funktionalität, Geschwindigkeit, Geometrie — Dropdown-Katalog oder frei)
   - **Trainer-Hinweis** (optional, seit v0.5.0) — wird im TrainingEinstieg als gelber Hinweis-Block gezeigt
4. **Speichern** → Szene wird mit ID `SZ_YYYY_NNN` erstellt.
5. Panorama separat über **BildUpload** hochladen (siehe 6).

### 5.2 Vorschaubilder
Bis zu 2 Bilder für die Szenen-Liste. Wird automatisch auf 400 px komprimiert (JPEG 70 %), aus dem Haupt-Panorama oder per Upload.

### 5.3 Szene-Reihenfolge
Pfeile in der Liste (innerhalb des Unterthemas).

---

## 6. Panorama-Bilder (BildUpload, seit v0.5.0)

### 6.1 Speicherort
Panorama-Bilder liegen produktiv in **Supabase Storage**, Bucket `rsi-textures` (public read).
Pfad-Konvention: `panoramas/{szeneId}/{haupt|persp_NNN_<label>}.webp`.

Das alte Vercel-`/public/textures/`-Verzeichnis ist nur noch für Demo-/Fallback-Bilder (`DEFAULT_SCENES.panoramaBildUrl: null`).

### 6.2 BildUpload-Oberfläche
Die Komponente `BildUpload.tsx` hat zwei Tabs:

- **Bibliothek:** Akkordeon nach Szene, listet alle bereits hochgeladenen Bilder im Bucket. Auswahl per Klick.
- **Hochladen:** Drag & Drop oder File-Picker. Pfad wird automatisch nach `panoramas/{szeneId}/{filename}` aufgelöst.

### 6.3 Empfohlene Spezifikation
- Format: **WebP** (beste Kompression, alle Zielbrowser unterstützen es)
- Auflösung: **4096 × 2048** (equirectangulär, Verhältnis 2:1)
- Dateigrösse: ≤ 5 MB
- JPG/PNG werden akzeptiert, erzeugen aber grössere Downloads

---

## 7. Defizit-Katalog

### 7.1 Defizit anlegen
1. Szene wählen → Defizit-Liste rechts.
2. **Neues Defizit** → Modal (ID-Format `SD_NNNN`).
3. **Pflichtfelder:**
   - Name (mehrsprachig)
   - Beschreibung (mehrsprachig)
   - **Kategorie** (seit v0.5.0 vor Kriterium positioniert)
   - **Kriterium** aus `WICHTIGKEIT_TABLE` (Dropdown, 58 Einträge)
   - **Kontext:** io (innerorts) oder ao (ausserorts)
   - **Korrekte Bewertung:**
     - Wichtigkeit (gross/mittel/klein)
     - Abweichung (gross/mittel/klein)
     - NACA-Raw (0–7)
   - Die restlichen Felder (Relevanz SD, Unfallschwere, Unfallrisiko) berechnen sich automatisch aus den drei Eingaben.

### 7.2 Optionale Felder
- **Feedback-Text** — Fachliche Begründung, wird in LernKarte gezeigt
- **Massnahmenlogik** — Empfohlene Korrekturmassnahmen
- **Normbezüge** (`normRefs`) — seit v0.5.0 Autocomplete-Dropdown mit 32 VSS/SN-Normen aus `regelwerkKatalog.ts`, Tag-System für Mehrfach-Auswahl
- **Pflicht-Flag** — muss gefunden werden für Szenen-Vollständigkeit
- **Booster-Flag mit %-Bonus** (seit v0.5.0): Radio-Auswahl +10 % / +20 % statt nur Boolean

### 7.3 Defizit-Verortung
Siehe Abschnitt **8. BildEditor**.

---

## 8. BildEditor (Verortungs-Editor)

### 8.1 Öffnen
In der Szene → Button **Verortungs-Editor öffnen**.

### 8.2 Oberfläche
- **Panorama-Anzeige** (zentral, equirectangulär)
- **Seitenleiste rechts:** Liste der Defizite, Standort-Positionen, Navigation
- **Toolbar oben:** Bucket-Auswahl (Bibliothek), Modus-Buttons
- **Zoom-Toolbar unten:** −/+/Reset, Mausrad-Zoom, Tasten +/−/0

### 8.3 Verortungs-Modi
| Modus | Aktion |
|---|---|
| **Startblick** | Klick setzt Startblick-Fadenkreuz (θ, φ) |
| **Punkt** | Klick setzt runden Marker mit Toleranzradius (einstellbar 5–30°) |
| **Polygon** | Mehrere Klicks → Eckpunkte; Doppelklick schliesst Polygon |
| **Gruppe** | Mehrere Defizit-Verortungen zu einer kombinierten Fläche zusammenfassen |

### 8.4 Drag & Drop
Alle Marker (Punkt, Polygon-Ecken, Startblick, Standort-Diamanten) per Maus verschiebbar.

### 8.5 Zoom + Pan
- **Mausrad:** Zoom (cursor-zentriert, 1.0× bis 5.0×)
- **Tasten:** `+` / `−` / `0` (Reset)
- **Pan:** linke Maustaste auf leerer Canvas-Fläche ziehen (Cursor wird `grab`)

### 8.6 Perspektiven
Eine Szene kann mehrere 360°-Standorte haben:
1. In der Szenen-Bearbeitung → Perspektive hinzufügen → Label.
2. Bild für Perspektive über BildUpload in den Bucket laden (Pfad `panoramas/{szeneId}/persp_NNN_<label>.webp`).
3. Im BildEditor: Perspektiven-Button oben → Standort-Bild laden.
4. Verortungen sind **pro Perspektive separat** — kein Fallback auf Haupt-Verortung.

### 8.7 Standort-Navigation
Bidirektionale Verknüpfung zwischen Haupt-Panorama und Perspektiven:
1. Im Haupt-Panorama: **Standort-Position** für jede Perspektive als Diamant markieren.
2. In einer Perspektive: **NavMarker** zu anderen Standorten (inkl. Haupt-Panorama) markieren.
3. Im Viewer klickt der User diese Marker → springt.

---

## 9. Kurs-Verwaltung

### 9.1 Neuer Kurs
1. Tab **Kurse** → **Neuer Kurs**.
2. Eingeben:
   - **Kursname** (z.B. «FK RSI 2026-Q2»)
   - **Datum** (gültig von / bis)
   - **Zugangscode** (automatisch generiert oder manuell)
   - **Optionales Passwort** (SHA-256-Hash mit `kp:`-Prefix, seit v0.3.1)
   - **Themen-Auswahl** — Kursteilnehmer sehen nur die markierten Themen

### 9.2 Kurs-Lifecycle
- **Aktiv:** Innerhalb von/bis, sichtbar auf LandingPage
- **Deaktivieren:** Button — Kurs bleibt erhalten, aber nicht wählbar
- **Löschen:** entfernt Kurs + zugehörige Ranking-Einträge

### 9.3 Teilnehmer-Ansicht
Teilnehmer sehen auf LandingPage nur zeitlich aktive Kurse. Passwort-geschützte Kurse sind sichtbar, aber brauchen den Code zum Start.

---

## 10. Ranking-Verwaltung (AdminRanking)

### 10.1 Gesamt-Übersicht
Alle Einträge in `rsi_results`: User-Pseudonym, Kurs, Szene, Punkte, Prozent, Dauer, Zeitstempel.

### 10.2 Filter
- Nach User, Kurs, Szene, Datum
- Sortierung auf allen Spalten

### 10.3 Aktionen
- **User-Einträge löschen:** alle Scores eines User-Hashes
- **Kurs-Einträge löschen:** alle Scores eines Kurses
- **Einzel-Eintrag löschen:** pro Zeile

**Achtung:** Löschung ist sofort wirksam und erfolgt auch in Supabase. Kein Undo.

**Sicherheit seit v0.6.0:** `rsi_results.DELETE` für anon ist gesperrt — Löschungen laufen über den Admin-Dashboard-Flow (Token-gesichert). Das Ranking ist nicht mehr frei manipulierbar.

---

## 11. Export / Import

### 11.1 Export
- Tab **Export** → **JSON exportieren**
- Datei enthält: Topics, Scenes, Deficits, Kurse, Ranking-Snapshot
- Version-Feld: `rsi-v3`
- Panorama-Bilder (Bucket-Pfade) sind als URL im JSON enthalten; die eigentlichen Bilddaten werden nicht mit exportiert — siehe BACKUP.md Abschnitt 2.3.

### 11.2 Import
- Tab **Import** → JSON-Datei wählen
- Schema-Check (Version-Feld, ID-Format, MultiLang, Base64-Bildgrössen)
- **Achtung:** Import überschreibt bestehende Datensätze mit gleichen IDs (kein Merge).
- **Sicherheitshinweis:** Nur aus vertrauenswürdiger Quelle importieren.

### 11.3 Einsatz-Szenarien
- Backup vor grösserer Änderung
- Transfer zwischen Dev- und Prod-Deployment
- Archivierung abgeschlossener Kurse

---

## 12. Supabase-Sync

### 12.1 Tabellen (mit RLS seit v0.4.0/v0.6.0)
- `rsi_topics` — JSONB pro Topic (anon: nur SELECT)
- `rsi_scenes` — JSONB pro Scene (anon: nur SELECT)
- `rsi_deficits` — JSONB pro Defizit (anon: nur SELECT)
- `rsi_results` — Einzel-Ergebnisse (anon: SELECT + INSERT, **kein DELETE**)

### 12.2 Sync-Verhalten
- Bei jedem Admin-Save: Aufruf von `admin-write` mit `x-admin-token`-Header. Edge Function validiert Token + Payload, schreibt mit `service_role`.
- Bei App-Start: Lesen aus Supabase via anon-Key (RLS erlaubt SELECT), Cache im Modul-Memory (`supabaseSync.ts`).
- Bei leerem Supabase: Seed aus localStorage (einmaliger Vorgang, consent-gated seit v0.3.1).
- Bei 401 (Token expired): Auto-Cleanup von `sessionStorage['rsi-admin-token']` + `rsi-admin-auth`, User muss neu PIN eingeben.

### 12.3 Manuelle Cache-Invalidierung
App-Reset-Button (Avatar-Popover oder LandingPage-Footer) erzwingt vollständigen Reload.

---

## 13. Troubleshooting

**Admin-Login funktioniert nicht (401).**
→ PIN falsch? Supabase → Edge Functions → Logs von `admin-auth` prüfen. `ADMIN_PIN`-Secret gesetzt? Function redeployed nach Änderung?

**Admin-Writes schlagen nach einiger Zeit fehl (401).**
→ Token abgelaufen (2 h TTL). Neu PIN eingeben. Bei wiederkehrenden Problemen `ADMIN_TOKEN_SECRET` prüfen (darf nicht neu rotiert worden sein).

**CORS-Fehler im Browser.**
→ Vercel-URL ist nicht in der Whitelist der Edge Function. `admin-auth/index.ts` + `admin-write/index.ts` anpassen und redeployen.

**Änderungen werden nicht gespeichert.**
→ Netzwerk prüfen, Browser-Console auf Supabase-/Edge-Function-Fehler. Als Fallback: Export → Import auf anderem Device.

**Daten erscheinen doppelt.**
→ Cache nicht zurückgesetzt. App-Reset durchführen.

**PIN ist bekannt geworden.**
→ Supabase → Edge Functions → Secrets → `ADMIN_PIN` ändern → Edge Function `admin-auth` redeployen. Kein Vercel-Redeploy nötig.

**Panorama-Bild lädt nicht.**
→ Supabase → Storage → Bucket `rsi-textures` prüfen: Datei vorhanden? Public-Read-Policy aktiv? CSP im Browser prüfen (`img-src` muss `https://*.supabase.co` enthalten).

---

## 14. Normative Pflege

Die Datei `src/data/scoringEngine.ts` (WICHTIGKEIT_TABLE + Matrizen) ist **normativ geschützt** und darf nur nach Verifikation gegen TBA-Fachkurs FK RSI V 16.09.2020 verändert werden. Alle anderen Labels/Beschreibungen (z.B. in `kriteriumLabels.ts`) sind frei anpassbar.

---

## 15. Test- vs. Produktivdaten

Aktueller Ansatz: **ein einziges Supabase-Projekt, Trennung über Kurse.**

- Für Test-/Demo-Inhalte einen eigenen Kurs anlegen (z.B. `FK RSI TEST`), zeitlich begrenzen und nach Abschluss löschen.
- Topics/Scenes/Deficits sind global — Änderungen im Admin wirken sofort auf alle Kurse. Vor grösseren Umbauten: Export-Dump als Snapshot sichern (siehe BACKUP.md).
- Separater Prod/Test-Supabase würde doppelte Pflege bedeuten; der Aufwand rechtfertigt den zusätzlichen Nutzen für die aktuelle Kursgrösse nicht.

Falls später ein zweites Supabase-Projekt nötig wird (z.B. Staging vor Produktiv-Rollout): siehe BACKUP.md Abschnitt "Wiederherstellung Szenario B" für die Einrichtung (inkl. Edge-Function-Deploy + Secrets).

---

## 16. Fehler-Monitoring (Sentry)

Fehler auf User-Geräten werden in Sentry protokolliert, sofern `VITE_SENTRY_DSN` in Vercel-Env gesetzt ist. Ohne DSN: kein Monitoring, keine Datenübertragung (Pilot-Stand: leer).

**Zugang:** Sentry-Projekt-Dashboard (Login über separates Sentry-Konto der Fachstelle).

**Was wird erfasst:**
- Unbehandelte JavaScript-Fehler mit Stacktrace
- Performance-Traces (10 % Sampling)
- Session Replays nur bei Fehler (30 %), Text maskiert, Medien blockiert

**Was NICHT erfasst wird:**
- Klartext-Benutzernamen (werden in `beforeSend` entfernt)
- Panorama-Bildinhalte (Medien blockiert)
- Eingabetexte in Formularen (`maskAllText: true` im Replay)

**Sentry deaktivieren:** `VITE_SENTRY_DSN` in Vercel entfernen + Redeploy.

---

## 17. Accessibility (WCAG 2.1 AA)

Seit v0.4.0/v0.5.0/v0.6.0 umgesetzt:
- Globaler Fokus-Ring (`:focus-visible`)
- Touch-Targets **44 × 44 px** in Navbar (Theme-Toggle, Avatar) und LanguageSwitcher (WCAG 2.5.5)
- Focus-Trap in allen Modalen (Tab/Shift+Tab cycelt, Initial-Fokus, Restore beim Schliessen, WCAG 2.4.3)
- ESC schliesst alle Modale (WCAG 2.1.2)
- `aria-label` / `aria-pressed` / `aria-expanded` auf Icon-only-Buttons
- Kontrastschwellen WCAG-AA-konform (Text-Disabled auf `#737373` angehoben)

---

## 18. Kontakt

**Fachstelle Verkehrssicherheit**
Stevan Skeledzic — Leiter Verkehrssicherheit
Tiefbauamt, Baudirektion, Kanton Zürich
sicherheit.tba@bd.zh.ch · +41 43 259 31 20
