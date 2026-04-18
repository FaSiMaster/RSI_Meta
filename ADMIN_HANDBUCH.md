# Admin-Handbuch — RSI VR Tool

> Für Kursleitung / Fachstelle. Stand v0.3.1.
> Voraussetzung: Admin-PIN (4-stellig) gesetzt in Vercel-Env.

---

## 1. Zugang

1. Auf LandingPage → oben rechts **Admin**-Button (Schloss-Icon).
2. PIN eingeben (4 Stellen).
3. Authentifizierung gilt nur für die laufende Browser-Session (sessionStorage).

**Sicherheit:** Der PIN ist im Client-Bundle sichtbar (technische Einschränkung Vite). Der PIN schützt vor versehentlichem Zugriff, nicht vor gezielten Angriffen. Rotieren Sie ihn vor jedem Kurs-Einsatz über das Vercel-Dashboard und deployen Sie neu.

---

## 2. Tabs-Übersicht

Das Admin-Dashboard hat vier Haupt-Tabs:

| Tab | Inhalt |
|---|---|
| **Inhalte** | Themen, Szenen, Defizite (CRUD) |
| **Kurse** | Kurs-Anlage, Zugangscodes, Themen-Auswahl |
| **Rangliste** | AdminRanking — User/Kurs-Einträge verwalten |
| **Export / Import** | JSON-Dump der gesamten Datenbasis |

---

## 3. Themen-Verwaltung

### 3.1 Struktur
- **Oberthema** → Beispiel: «Verkehrsführung»
- **Unterthema (Gruppe)** → Beispiel: «Linienführung»
- **Szene** → konkrete Verkehrssituation
- **Defizite** → pro Szene

### 3.2 Aktionen
- **Neues Oberthema / neue Gruppe:** Button rechts oben
- **Umsortieren:** Pfeile rauf/runter (sortOrder)
- **Umbenennen:** Inline-Edit
- **Archivieren:** `isActive: false` — Szenen bleiben erhalten, sind aber für Teilnehmer nicht sichtbar
- **Löschen:** kaskadiert! Entfernt alle Kinder (Szenen, Defizite). **Achtung: keine Bestätigung aktuell (Bug).**

### 3.3 Mehrsprachigkeit
Alle Titel/Beschreibungen als `MultiLang`-Objekt (de/fr/it/en). **Deutsch ist Pflicht**, andere Sprachen werden bei Fehlen automatisch mit DE befüllt.

---

## 4. Szenen-Verwaltung

### 4.1 Neue Szene
1. Unterthema wählen.
2. **Neue Szene** → Modal öffnet sich.
3. Eingeben:
   - **Titel** (mehrsprachig)
   - **Kontext-Beschreibung** (Einführungs-Text, mehrsprachig)
   - **Merkmale** (Funktionalität, Geschwindigkeit, Geometrie — Dropdown-Katalog oder frei)
   - **Panorama-URL** — Pfad zu WebP/JPG in `/public/textures/` oder externe URL
4. **Speichern** → Szene erstellt ohne Defizite.

### 4.2 Vorschaubilder
Bis zu 2 Bilder für die Szenen-Liste. Wird automatisch auf 400 px komprimiert (JPEG 70 %), aus dem Haupt-Panorama oder per Upload.

### 4.3 Szene-Reihenfolge
Pfeile in der Liste (innerhalb des Unterthemas).

---

## 5. Defizit-Katalog

### 5.1 Defizit anlegen
1. Szene wählen → Defizit-Liste rechts.
2. **Neues Defizit** → Modal.
3. **Pflichtfelder:**
   - Name (mehrsprachig)
   - Beschreibung (mehrsprachig)
   - **Kriterium** aus `WICHTIGKEIT_TABLE` (Dropdown, 58 Einträge)
   - **Kontext:** io (innerorts) oder ao (ausserorts)
   - **Korrekte Bewertung:**
     - Wichtigkeit (gross/mittel/klein)
     - Abweichung (gross/mittel/klein)
     - NACA-Raw (0–7)
   - Die restlichen Felder (Relevanz SD, Unfallschwere, Unfallrisiko) berechnen sich automatisch aus den drei Eingaben.

### 5.2 Optionale Felder
- **Feedback-Text** — Fachliche Begründung, wird in LernKarte gezeigt
- **Massnahmenlogik** — Empfohlene Korrekturmassnahmen
- **Normbezüge** (`normRefs`) — VSS/SN-Referenzen
- **Pflicht-Flag** — muss gefunden werden für Szenen-Vollständigkeit
- **Booster-Flag** — (derzeit ohne Effekt im Scoring)

### 5.3 Defizit-Verortung
Siehe Abschnitt **6. BildEditor**.

---

## 6. BildEditor (Verortungs-Editor)

### 6.1 Öffnen
In der Szene → Button **Verortungs-Editor öffnen**.

### 6.2 Oberfläche
- **Panorama-Anzeige** (zentral, equirectangulär)
- **Seitenleiste rechts:** Liste der Defizite, Standort-Positionen, Navigation
- **Toolbar oben:** Textur-Auswahl, URL-Eingabe, Modus-Buttons
- **Zoom-Toolbar unten:** −/+/Reset, Mausrad-Zoom, Tasten +/−/0

### 6.3 Verortungs-Modi
| Modus | Aktion |
|---|---|
| **Startblick** | Klick setzt Startblick-Fadenkreuz (θ, φ) |
| **Punkt** | Klick setzt runden Marker mit Toleranzradius (einstellbar 5–30°) |
| **Polygon** | Mehrere Klicks → Eckpunkte; Doppelklick schliesst Polygon |
| **Gruppe** | Mehrere Defizit-Verortungen zu einer kombinierten Fläche zusammenfassen |

### 6.4 Drag & Drop
Alle Marker (Punkt, Polygon-Ecken, Startblick, Standort-Diamanten) per Maus verschiebbar.

### 6.5 Zoom + Pan
- **Mausrad:** Zoom (cursor-zentriert, 1.0× bis 5.0×)
- **Tasten:** `+` / `−` / `0` (Reset)
- **Pan:** linke Maustaste auf leerer Canvas-Fläche ziehen (Cursor wird `grab`)

### 6.6 Perspektiven
Eine Szene kann mehrere 360°-Standorte haben:
1. In der Szenen-Bearbeitung → Perspektive hinzufügen → URL + Label.
2. Im BildEditor: Perspektiven-Button oben → Standort-Bild laden.
3. Verortungen sind **pro Perspektive separat** — kein Fallback auf Haupt-Verortung.

### 6.7 Standort-Navigation
Bidirektionale Verknüpfung zwischen Haupt-Panorama und Perspektiven:
1. Im Haupt-Panorama: **Standort-Position** für jede Perspektive als Diamant markieren.
2. In einer Perspektive: **NavMarker** zu anderen Standorten (inkl. Haupt-Panorama) markieren.
3. Im Viewer klickt der User diese Marker → springt.

---

## 7. Kurs-Verwaltung

### 7.1 Neuer Kurs
1. Tab **Kurse** → **Neuer Kurs**.
2. Eingeben:
   - **Kursname** (z.B. «FK RSI 2026-Q2»)
   - **Datum** (gültig von / bis)
   - **Zugangscode** (automatisch generiert oder manuell)
   - **Optionales Passwort**
   - **Themen-Auswahl** — Kursteilnehmer sehen nur die markierten Themen

### 7.2 Kurs-Lifecycle
- **Aktiv:** Innerhalb von/bis, sichtbar auf LandingPage
- **Deaktivieren:** Button — Kurs bleibt erhalten, aber nicht wählbar
- **Löschen:** entfernt Kurs + zugehörige Ranking-Einträge

### 7.3 Teilnehmer-Ansicht
Teilnehmer sehen auf LandingPage nur zeitlich aktive Kurse. Passwort-geschützte Kurse sind sichtbar, aber brauchen den Code zum Start.

---

## 8. Ranking-Verwaltung (AdminRanking)

### 8.1 Gesamt-Übersicht
Alle Einträge in `rsi_results`: User-Pseudonym, Kurs, Szene, Punkte, Prozent, Dauer, Zeitstempel.

### 8.2 Filter
- Nach User, Kurs, Szene, Datum
- Sortierung auf allen Spalten

### 8.3 Aktionen
- **User-Einträge löschen:** alle Scores eines User-Hashes
- **Kurs-Einträge löschen:** alle Scores eines Kurses
- **Einzel-Eintrag löschen:** pro Zeile

**Achtung:** Löschung ist sofort wirksam und erfolgt auch in Supabase. Kein Undo.

---

## 9. Export / Import

### 9.1 Export
- Tab **Export** → **JSON exportieren**
- Datei enthält: Topics, Scenes, Deficits, Kurse, Ranking-Snapshot
- Version-Feld: `rsi-v3`

### 9.2 Import
- Tab **Import** → JSON-Datei wählen
- Schema-Check (Version-Feld)
- **Achtung:** Import überschreibt bestehende Datensätze mit gleichen IDs (kein Merge).
- **Sicherheitshinweis:** Aktuell keine Grössen- oder Inhalts-Validierung. Nur aus vertrauenswürdiger Quelle importieren.

### 9.3 Einsatz-Szenarien
- Backup vor grösserer Änderung
- Transfer zwischen Dev- und Prod-Deployment
- Archivierung abgeschlossener Kurse

---

## 10. Supabase-Sync

### 10.1 Tabellen
- `rsi_topics` — JSONB pro Topic
- `rsi_scenes` — JSONB pro Scene
- `rsi_deficits` — JSONB pro Defizit
- `rsi_results` — Einzel-Ergebnisse

### 10.2 Sync-Verhalten
- Bei jedem Admin-Save: Upsert nach Supabase
- Bei App-Start: Lesen aus Supabase, Cache im Modul-Memory
- Bei leerem Supabase: Seed aus localStorage (einmaliger Vorgang)
- Bei Logout: Cache **nicht** zurückgesetzt (bekannter Bug, siehe REVIEW_CODE.md #4)

### 10.3 Manuelle Cache-Invalidierung
App-Reset-Button (Avatar-Popover oder LandingPage-Footer) erzwingt vollständigen Reload.

---

## 11. Troubleshooting

**Admin-Zugang funktioniert nicht.**
→ `.env.local` und Vercel Env prüfen: `VITE_ADMIN_PIN` gesetzt? Nach Änderung muss Vercel neu deployen.

**Änderungen werden nicht gespeichert.**
→ Netzwerk prüfen, Browser-Console auf Supabase-Fehler. Als Fallback: Export → Import auf anderem Device.

**Daten erscheinen doppelt.**
→ Cache nicht zurückgesetzt. App-Reset durchführen.

**PIN ist bekannt geworden.**
→ In Vercel → Settings → Environment Variables → `VITE_ADMIN_PIN` ändern → Neu deployen → Alte Bundle via `cleanupOutdatedCaches` invalidiert.

---

## 12. Normative Pflege

Die Datei `src/data/scoringEngine.ts` (WICHTIGKEIT_TABLE + Matrizen) ist **normativ geschützt** und darf nur nach Verifikation gegen TBA-Fachkurs FK RSI V 16.09.2020 verändert werden. Alle anderen Labels/Beschreibungen (z.B. in `kriteriumLabels.ts`) sind frei anpassbar.

---

## 13. Test- vs. Produktivdaten

Aktueller Ansatz: **ein einziges Supabase-Projekt, Trennung über Kurse.**

- Für Test-/Demo-Inhalte einen eigenen Kurs anlegen (z.B. `FK RSI TEST`), zeitlich begrenzen und nach Abschluss löschen.
- Seed-Kurs `FaSi4safety` darf nicht für reale Kurse wiederverwendet werden (Code ist im Bundle sichtbar, siehe REVIEW_SECURITY.md N-3).
- Topics/Scenes/Deficits sind global — Änderungen im Admin wirken sofort auf alle Kurse. Vor grösseren Umbauten: Export-Dump als Snapshot sichern (siehe BACKUP.md).
- Separater Prod/Test-Supabase würde doppelte Pflege bedeuten; der Aufwand rechtfertigt den zusätzlichen Nutzen für die aktuelle Kursgrösse nicht.

Falls später ein zweites Supabase-Projekt nötig wird (z.B. Staging vor Produktiv-Rollout): siehe BACKUP.md Abschnitt "Wiederherstellung Szenario B" für die Einrichtung.

---

## 14. Fehler-Monitoring (Sentry)

Fehler auf User-Geräten werden in Sentry protokolliert, sofern `VITE_SENTRY_DSN` in Vercel-Env gesetzt ist. Ohne DSN: kein Monitoring, keine Datenübertragung.

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

## 15. Kontakt

**Fachstelle Verkehrssicherheit**
Stevan Skeledzic — Leiter Verkehrssicherheit
Tiefbauamt, Baudirektion, Kanton Zürich
sicherheit.tba@bd.zh.ch · +41 43 259 31 20
