# Backup-Strategie — RSI VR Tool

> Was wird wo gesichert? Was passiert wenn etwas verloren geht? Stand v0.3.1.

---

## 1. Was wird gespeichert?

| Datenart | Ort | Speicherort | Kritisch? |
|---|---|---|---|
| App-Code | GitHub (`FaSiMaster/RSI_Meta`) | main-Branch + Tags | Mittel (reproduzierbar) |
| Panorama-Texturen | Repo `/public/textures/` | Git + Vercel | Mittel (gross, langsam wiederbeschaffbar) |
| HDRI-Quelldateien | Lokal `_Archiv/Bilder_Seite/` | Nur Stevos Gerät (`.gitignore`) | **Hoch** — kein Remote-Backup |
| Themen/Szenen/Defizite (Konfig) | Supabase `rsi_topics`, `rsi_scenes`, `rsi_deficits` | Cloud EU | **Hoch** |
| Ranking-Ergebnisse | Supabase `rsi_results` | Cloud EU | Mittel (wiederholbar) |
| Lokale User-Daten | Browser `localStorage` (`rsi-v3-*`) | Jeweiliges Gerät | Niedrig (gerätegebunden) |
| Admin-PIN, Supabase-Keys | Vercel Environment | Cloud (Vercel Dashboard) | **Hoch** |

---

## 2. Bestehende Backup-Mechanismen

### 2.1 Git
- `main`-Branch wird nach jedem Commit automatisch auf GitHub gepusht
- Versions-Tags (`v0.1.0`, `v0.2.0`, `v0.3.1`) als Wiederherstellungspunkte
- Vercel deployed bei jedem Push automatisch

### 2.2 Supabase
- **Point-in-Time Recovery:** verfügbar nur auf Supabase Pro-Plan (aktuell Free-Plan — PITR deaktiviert!)
- **Manuelle Exporte:** via Supabase Dashboard → Database → Backups (Free-Plan: nur tägliche Auto-Backups ohne PITR)
- **Aufbewahrung Auto-Backups:** 7 Tage (Free), 30 Tage (Pro)

### 2.3 Admin Export/Import im Tool
- Tab **Export** im Admin-Dashboard erzeugt JSON-Dump (Topics, Scenes, Deficits, Kurse)
- Version-Marker `rsi-v3`
- Manueller Trigger — kein automatisches Backup

---

## 3. Empfohlene Backup-Routine

### 3.1 Wöchentlich (Stevo)
1. Admin-Dashboard → **Export** → `rsi-backup-YYYY-MM-DD.json` auf lokalen Backup-Ordner sichern
2. Ordner: `C:\ClaudeAI\RSI_Meta\_Archiv\Export\`
3. In OneDrive/Netzwerkshare synchronisieren

### 3.2 Vor jedem Kurs
1. Export erzeugen (als Snapshot vor Kurs-Einsatz)
2. PIN und Supabase-Keys in separatem Password-Manager (1Password / KeePass / Bitwarden) ablegen

### 3.3 Vor grösseren Änderungen
- Git: Feature-Branch anlegen (`git checkout -b feature/xyz`) statt direkt auf `main`
- Tag setzen: `git tag -a pre-refactor-YYYY-MM-DD`

---

## 4. Wiederherstellung

### 4.1 Code-Verlust
- Vom GitHub-Remote clonen: `git clone https://github.com/FaSiMaster/RSI_Meta.git`
- Vercel redeployt automatisch via Git-Integration

### 4.2 Supabase-Daten verloren
**Szenario A:** Einzelne Einträge gelöscht
- Supabase Dashboard → Backups → letzten Auto-Backup wiederherstellen (nur im 7-Tage-Fenster)
- Oder: Admin-Dashboard → Import → letzten lokalen Export laden

**Szenario B:** Gesamtes Supabase-Projekt gelöscht
- Neues Supabase-Projekt anlegen
- RLS-Policies wieder setzen (siehe REVIEW_SECURITY.md und `src/lib/supabase.ts`)
- Neue Keys in Vercel-Env eintragen
- Letzten JSON-Export via Admin-Dashboard importieren
- Ranking-Historie geht verloren (nur bei Szenario B)

### 4.3 Vercel-Deployment verloren
- Vercel Settings → Project → Re-deploy aus Git-Historie
- Environment-Variablen müssen manuell wieder eingetragen werden

### 4.4 HDRI-Quelldateien verloren
- Keine Remote-Kopie. Risiko!
- **Empfehlung:** manuelles Backup auf Netzwerkshare / OneDrive, oder `_Archiv/Bilder_Seite/` zu separatem privaten Git-Repo hinzufügen

---

## 5. Offene Risiken

| Risiko | Wahrscheinlichkeit | Massnahme |
|---|---|---|
| HDRI-Quelldateien nur lokal | Mittel | Auf Netzwerkshare spiegeln (zu tun) |
| Supabase Free-Plan ohne PITR | Hoch (Plan ist free) | Pro-Plan evaluieren oder wöchentliche Exporte (aktuell nur ad-hoc) |
| Keine automatischen Test-Snapshots | Hoch | CI-Workflow anlegen (zu tun, Task separat) |
| Vercel-Env-Variablen nicht extern dokumentiert | Mittel | Password-Manager-Eintrag anlegen (zu tun) |

---

## 6. Disaster-Recovery-Test (empfohlen vor Pilot)

1. Neues Supabase-Test-Projekt anlegen
2. Aktuellen Prod-Export importieren
3. Neuen Vercel-Preview-Deploy mit Test-Keys
4. Funktionalität prüfen (Login, Szene, Ranking)
5. Ergebnis dokumentieren — stimmt Recovery-Prozedur?

Letzter Recovery-Test: _(noch nicht durchgeführt)_
