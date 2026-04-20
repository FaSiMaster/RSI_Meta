# Backup-Strategie — RSI VR Tool

> Was wird wo gesichert? Was passiert wenn etwas verloren geht? Stand v0.6.0.

---

## 1. Was wird gespeichert?

| Datenart | Ort | Speicherort | Kritisch? |
|---|---|---|---|
| App-Code | GitHub (`FaSiMaster/RSI_Meta`) | main-Branch + Tags | Mittel (reproduzierbar) |
| **Panorama-Texturen (Produktiv)** | **Supabase Storage Bucket `rsi-textures`** | Cloud EU (`panoramas/{szeneId}/haupt.webp` etc.) | **Hoch** — kein automatisches Remote-Backup ausserhalb Supabase |
| Demo-/Fallback-Texturen | Repo `/public/textures/` | Git + Vercel | Niedrig (nur Beispiele, seit v0.5.0 nicht mehr Single Source) |
| HDRI-Quelldateien | Lokal `_Archiv/Bilder_Seite/` | Nur Stevos Gerät (`.gitignore`) | **Hoch** — kein Remote-Backup |
| Themen/Szenen/Defizite (Konfig) | Supabase `rsi_topics`, `rsi_scenes`, `rsi_deficits` | Cloud EU | **Hoch** |
| Ranking-Ergebnisse | Supabase `rsi_results` | Cloud EU | Mittel (wiederholbar) |
| Lokale User-Daten | Browser `localStorage` (`rsi-v3-*`) | Jeweiliges Gerät | Niedrig (gerätegebunden) |
| Admin-Token (Session) | Browser `sessionStorage['rsi-admin-token']` | Jeweiliges Gerät | Niedrig (2 h TTL, neu via PIN) |
| Client-Env (Supabase-URL/Anon/Salt) | Vercel Environment | Cloud (Vercel Dashboard) | **Hoch** |
| Supabase-Secrets (ADMIN_PIN, ADMIN_TOKEN_SECRET) | Supabase Edge Function Secrets | Cloud (Supabase Dashboard) | **Hoch** |

**Wichtig seit v0.5.0:** Panorama-Bilder liegen produktiv in Supabase Storage (Bucket `rsi-textures`, public read). Das alte Vercel-`/public/textures/`-Verzeichnis ist nur noch für Demo-/Fallback-Bilder relevant. Bei Datenverlust im Bucket sind die Bilder ohne Backup weg.

---

## 2. Bestehende Backup-Mechanismen

### 2.1 Git
- `main`-Branch wird nach jedem Commit automatisch auf GitHub gepusht.
- Versions-Tags (`v0.1.0` … `v0.6.0`) als Wiederherstellungspunkte.
- Vercel deployed bei jedem Push automatisch.
- GitHub-Actions-CI (`.github/workflows/ci.yml`, seit v0.6.0): `npm ci && tsc --noEmit && vite build` auf PR + push main.

### 2.2 Supabase Database (Tabellen)
- **Auto-Backups Free-Plan:** tägliche Snapshots, 7 Tage Aufbewahrung — Wiederherstellung nur über Support-Ticket (Self-Service-Restore ist Pro-Plan-Feature).
- **Point-in-Time Recovery:** nur Pro-Plan (aktuell Free-Plan — PITR nicht verfügbar).
- **Manuelle SQL-Dumps:** via Supabase Dashboard → Database → Backups oder `pg_dump` mit Connection-String (DSGVO-relevant: Dump nicht unverschlüsselt ablegen).

**Status prüfen:** Supabase Dashboard → Project Settings → Database → Backups. Dort ist sichtbar, welcher Plan aktiv ist und welche Snapshots vorliegen.

### 2.3 Supabase Storage (Bucket `rsi-textures`)
- **Keine automatischen Backups auf Free-Plan.** Supabase sichert den Storage-Bucket nicht mit dem Datenbank-Backup mit.
- **Empfehlung:** manuelle Sicherung via Supabase CLI oder Dashboard → Storage → Bucket `rsi-textures` → Download der Ordner `panoramas/` auf Netzwerkshare.
- **Alternative:** eigener Cron-Job / lokales Skript mit `supabase storage download` vor jedem Kurs oder wöchentlich.

### 2.4 Admin Export/Import im Tool
- Tab **Export/Import** im Admin-Dashboard erzeugt JSON-Dump (Topics, Scenes, Deficits, Kurse, Ranking-Snapshot).
- Version-Marker `rsi-v3`.
- Manueller Trigger — kein automatisches Backup.
- Panorama-Bilder sind **nicht** im JSON-Export enthalten (nur URLs/Bucket-Pfade) — Bucket muss separat gesichert werden.

### 2.5 localStorage-Export pro Gerät
- Im Avatar-Popover → App-Reset zeigt die lokalen Daten. Für einen Device-Snapshot können die `rsi-v3-*`-Keys über DevTools → Application → Local Storage exportiert werden (technische Nutzer).

---

## 3. Empfohlene Backup-Routine

### 3.1 Wöchentlich (Stevo)
1. Admin-Dashboard → **Export/Import** → `rsi-backup-YYYY-MM-DD.json` auf lokalen Backup-Ordner sichern.
2. Ordner: `C:\ClaudeAI\RSI_Meta\_Archiv\Export\`.
3. Supabase Storage Bucket `rsi-textures` manuell sichern (Dashboard → Storage → Bucket auswählen → Ordner `panoramas/` downloaden).
4. In OneDrive/Netzwerkshare synchronisieren.

### 3.2 Vor jedem Kurs
1. Export erzeugen (als Snapshot vor Kurs-Einsatz).
2. Stichprobe: 1–2 Panorama-Bilder aus dem Bucket prüfen (URL in neuer Browser-Session öffnen, lädt das Bild?).
3. Admin-PIN (Supabase Edge Function Secret `ADMIN_PIN`) und `ADMIN_TOKEN_SECRET` in Passwort-Manager (1Password / KeePass / Bitwarden) ablegen.
4. Client-Env-Vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USERNAME_SALT`) ebenfalls im Passwort-Manager.

### 3.3 Vor grösseren Änderungen
- Git: Feature-Branch anlegen (`git checkout -b feature/xyz`) statt direkt auf `main`.
- Tag setzen: `git tag -a pre-refactor-YYYY-MM-DD`.
- JSON-Export machen (Admin-Dashboard).
- Bei Änderungen am Bucket-Inhalt: Bucket-Snapshot vorher downloaden.

---

## 4. Wiederherstellung

### 4.1 Code-Verlust
- Vom GitHub-Remote clonen: `git clone https://github.com/FaSiMaster/RSI_Meta.git`.
- Vercel redeployt automatisch via Git-Integration.

### 4.2 Supabase-Daten (Tabellen) verloren
**Szenario A:** Einzelne Einträge gelöscht
- Supabase Dashboard → Project Settings → Database → Backups → Support-Ticket für Restore (Free-Plan) oder Self-Service (Pro-Plan).
- Oder: Admin-Dashboard → Import → letzten lokalen JSON-Export laden.

**Szenario B:** Gesamtes Supabase-Projekt gelöscht
- Neues Supabase-Projekt anlegen.
- RLS-Policies wieder setzen (siehe REVIEW_SECURITY.md und `src/lib/supabase.ts`).
- Bucket `rsi-textures` neu anlegen + Policies setzen (`rsi_public_read`, ggf. Upload-Policies).
- Edge Functions `admin-auth` und `admin-write` neu deployen (siehe ADMIN_HANDBUCH Abschnitt Edge Functions).
- Supabase-Secrets `ADMIN_PIN` + `ADMIN_TOKEN_SECRET` setzen.
- Neue Keys in Vercel-Env eintragen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `VITE_USERNAME_SALT` bleibt unverändert, sonst sind bestehende Ranking-Hashes unbrauchbar).
- Letzten JSON-Export via Admin-Dashboard importieren.
- Panorama-Bilder aus lokalem Bucket-Backup neu hochladen (Admin → BildUpload → Tab «Hochladen»).
- Ranking-Historie geht verloren (nur bei Szenario B ohne Backup).

### 4.3 Supabase-Storage-Bucket verloren oder geleert
- Neue Bucket-Struktur anlegen (`rsi-textures`, public).
- Policies wieder setzen.
- Lokales Backup der Ordner `panoramas/{szeneId}/` hochladen.
- Scene-Einträge in `rsi_scenes` referenzieren weiterhin die gleichen Pfade — kein DB-Update nötig, solange Bucket-Name + Pfadstruktur identisch sind.

### 4.4 Vercel-Deployment verloren
- Vercel Settings → Project → Re-deploy aus Git-Historie.
- Environment-Variablen müssen manuell wieder eingetragen werden: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USERNAME_SALT`, optional `VITE_SENTRY_DSN`.
- **`VITE_ADMIN_PIN` nicht mehr nötig** (seit v0.6.0 aus Client-Bundle entfernt, PIN liegt nur noch als Supabase-Secret).

### 4.5 HDRI-Quelldateien verloren
- Keine Remote-Kopie. Risiko!
- **Empfehlung:** manuelles Backup auf Netzwerkshare / OneDrive, oder `_Archiv/Bilder_Seite/` zu separatem privaten Git-Repo hinzufügen.
- Alternativ: HDRI-Quellen bei der Verarbeitung gleich in den Supabase-Bucket hochladen (Unterordner `hdri-source/`, nicht public).

---

## 5. Offene Risiken

| Risiko | Wahrscheinlichkeit | Massnahme |
|---|---|---|
| HDRI-Quelldateien nur lokal | Mittel | Auf Netzwerkshare spiegeln (zu tun) |
| Supabase Free-Plan ohne PITR + kein Self-Service-Restore | Hoch (Plan ist free) | Pro-Plan evaluieren oder wöchentliche JSON-Exporte |
| **Supabase Storage Bucket ohne Auto-Backup** | **Hoch** | Wöchentlicher manueller Download (zu tun) |
| Keine automatischen Test-Snapshots | Mittel | GitHub Actions vorhanden seit v0.6.0, Smoke-Tests noch offen |
| Vercel-Env-Variablen nicht extern dokumentiert | Mittel | Passwort-Manager-Eintrag anlegen (zu tun) |
| **`ADMIN_TOKEN_SECRET` nicht separat gesichert** | **Hoch** | Passwort-Manager-Eintrag (zwingend) |

---

## 6. Disaster-Recovery-Test (empfohlen vor Pilot)

1. Neues Supabase-Test-Projekt anlegen.
2. Bucket `rsi-textures` + Policies + Edge Functions (`admin-auth`, `admin-write`) deployen.
3. Aktuellen Prod-JSON-Export importieren.
4. Lokales Bucket-Backup in neues Bucket hochladen.
5. Neuen Vercel-Preview-Deploy mit Test-Keys (Branch `disaster-test`).
6. Funktionalität prüfen: Login, Szene starten (Panorama lädt?), Admin-PIN, Defizit bewerten, Ranking-Eintrag.
7. Ergebnis dokumentieren — stimmt Recovery-Prozedur?

Letzter Recovery-Test: _(noch nicht durchgeführt)_

---

## 7. Geheimnisse-Rotation (Secrets Hygiene)

Seit v0.6.0 gilt folgende Trennung:

| Secret | Ort | Rotation |
|---|---|---|
| `ADMIN_PIN` | Supabase Edge Function Secret | Vor jedem Kurs (aktuell `5004`) |
| `ADMIN_TOKEN_SECRET` | Supabase Edge Function Secret | Einmalig gesetzt, Rotation macht Sessions ungültig (akzeptabel, zwingt Admins zu Re-Login) |
| `VITE_USERNAME_SALT` | Vercel Env | **Nie rotieren** — bestehende Ranking-Hashes würden unbrauchbar |
| `VITE_SUPABASE_ANON_KEY` | Vercel Env | Nur bei Key-Leak, zusammen mit neuem Supabase-Projekt |
| `VITE_SENTRY_DSN` | Vercel Env (optional) | Bei Sentry-Projekt-Wechsel |

**Nach Rotation von `ADMIN_PIN`:** Edge Function `admin-auth` muss redeployt werden (neuer Secret-Wert), ausgegebene Tokens bleiben 2 h gültig (TTL läuft ab).
