# Changelog

Alle wesentlichen Änderungen am RSI VR Tool werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

### Hinzugefügt
- Zoom + interaktiver Pan im BildEditor (Mausrad zentriert, Drag auf leerer Fläche)
- Globaler Git-Remote-Check-Hook bei Session-Start (claude.ai)
- Footer-Layout auf LandingPage mit Impressum/Datenschutz/Glossar-Links (56px hoch)
- Zentrale Design-Tokens `--zh-navbar-h: 56px` und `--zh-footer-h: 56px`

### Geändert
- Navbar-Höhe von 52px auf 56px (mehr Touch-Target)
- ASCII-Ersatzschreibungen (ae/oe/ue) in 20 Dateien durch echte Umlaute ersetzt — Ausnahme: Code-Identifier und Fremdsprach-JSON-Keys

### Dokumentation
- `CHANGELOG.md`, `GLOSSAR.md`, `BENUTZERHANDBUCH.md`, `ADMIN_HANDBUCH.md` ergänzt
- `public/impressum.html` und `public/datenschutz.html`
- `BACKUP.md`, `BROWSER.md`

---

## [0.3.0] — 2026-04-16

### Hinzugefügt
- **Supabase-Sync für Admin-Daten**: Topics, Scenes, Deficits als JSONB-Tabellen, geräteübergreifend synchron
- **Avatar-Popover** in Navbar mit Abmelden, Score, Kurs, App-Reset
- **Schritt-für-Schritt-Anleitung** unter Topic-Grid (4 Karten)
- **Aufklappbare RSI-Methodik-Karte** mit Matrizen, NACA-Einstufung, Quellenangaben
- **Strassenmerkmale-Dropdown-Katalog** (9 Kategorien unter Funktionalität)
- **Admin-Rangliste** (`AdminRanking`) mit User- und Kurs-Verwaltung
- **LernKarte** nach ScoringFlow als didaktische Zusammenfassung
- **Supabase Live-Ranking** (Tabelle `rsi_results`) mit öffentlichem Read, anon-Insert
- **Admin-PIN-Schutz** mit 4-stelligem PIN aus `VITE_ADMIN_PIN`
- **DSGVO-Hash** für Usernamen (SHA-256, erste 8 Hex) in Supabase
- **App-Reset-Button** (Service Worker + Cache + localStorage)
- **Bidirektionale Standort-Navigation** (Haupt↔Perspektive↔Perspektive)
- **Best-of-Punktesystem** mit Sternen (1/2/3) und Zeiterfassung
- **Kurs-Tab im Ranking** (pro Kurs mit Zugangscode)
- **Drag & Drop im Verortungs-Editor** (Punkte, Polygon-Ecken, Startblick, Standorte, NavMarker)

### Geändert
- i18n-Vollabdeckung 100% in de/fr/it/en (66 fehlende Keys ergänzt)
- Kriterium-Labels aus `scoringEngine.ts` in `kriteriumLabels.ts` ausgelagert (Sacred-File unangetastet)
- Panorama-Textur-Mapping korrigiert (`repeat.x=-1`, `offset.x=0.75`)
- `calcScore` als Pure Function in `scoreCalc.ts`
- Scoring normiert auf 100 Pkt.; Penalty-Werte: Kategorie −10%, Hinweise −25 Pkt.

### Behoben
- 8 Bugs in Themen-Verwaltung (Sortierung, Gruppe neu, Kaskaden-Delete, Seed-Schutz)
- Startblick Race-Condition (rAF-Retry)
- Defizit-Marker sichtbar über alle Perspektiven
- Themen-Pfeile (rauf/runter) im Admin
- Startbutton-Validierung (Name-Pflichtfeld rot statt grau)
- Ranking Auto-Refresh nach Szenenabschluss
- Stale Bewertungsdaten bei VR-Abbruch

---

## [0.2.0] — 2026-04-04

### Hinzugefügt
- **ZH Corporate Design** mit FaSi_VIZ-Tokens, Dark/Light-Theme
- **i18n aktiv** mit `t()` in allen User-facing Komponenten
- **9-Schritt FaSi/bfu-Bewertungsflow** (ScoringFlow)
- **Admin-Hierarchie**: Oberthemen → Unterthemen → Szenen → Defizite
- **Kurs-System** mit Zugangscode + optionalem Passwort
- **TrainingEinstieg-Seite** mit Bildern, Beschrieb, Merkmalen
- **3-Ebenen-Ranking** (Teilnehmende, Kurse, global)
- **Vollaudit Phase 2** (`AUDIT_REPORT.md`)
- **Admin Export/Import** zum Datenaustausch zwischen Geräten
- **BildEditor** mit Drag&Drop, Verortung (Punkt/Polygon/Gruppe), Startblick
- **Texturen-Schnellauswahl** und Panorama-Upload mit Komprimierung

### Geändert
- Projektstruktur: `_Archiv/` lokal, tote Dateien entfernt
- PWA Service Worker mit Sofort-Update für Meta Quest Browser
- Vercel Cache-Header für `sw.js`

### Behoben
- Panorama-Textur-Spiegelung (BackSide + UV-Offset)
- VR-Panorama-Rendering (weisser Bildschirm)
- VR-Panels nicht kopfgebunden, Controller-Ray aktiv
- Szene-CRUD und BildEditor-Speicherung

---

## [0.1.0] — 2026-03-28

### Initial Release — Phase 1 & 2 Grundlagen

- Vite + React 18 + TypeScript (strict) Setup
- `@react-three/fiber` v8 + `@react-three/xr` v6
- PWA-Manifest, Service Worker (Bubblewrap-ready)
- Onboarding-Layer (Name, Thema, Szene)
- Migration der Voarbeiten (Dashboard, Ranking, Admin, SceneViewer, WebXR)
- VR-Controller-Support Meta Quest 3
- VR Klick-Flow mit 9-Schritt-Bewertung
- Phase-2 ScoringFlow, Dashboard, Admin, Ranking
- Grundlegendes ZH-Design

---

## Release-Prozess

1. Alle Änderungen seit letztem Tag auf `main` in `[Unreleased]` sammeln.
2. Vor Release: `npx tsc --noEmit` grün, Smoke-Test Browser + Meta Quest.
3. Version bumpen in `package.json`.
4. `[Unreleased]` → neuer Abschnitt `[x.y.z] — YYYY-MM-DD`, neuer leerer `[Unreleased]` anlegen.
5. `git tag -a vX.Y.Z -m "Release vX.Y.Z"` → `git push --tags`
6. Vercel deployt automatisch auf `main`-Push.

**Versionsregeln (SemVer):**
- **MAJOR** (`1.x.x`): Breaking Changes an Datenmodell, i18n-Keys entfernt, localStorage-Schema inkompatibel.
- **MINOR** (`x.1.x`): Neue Features, rückwärtskompatibel.
- **PATCH** (`x.x.1`): Bugfixes, Doku-Updates.
