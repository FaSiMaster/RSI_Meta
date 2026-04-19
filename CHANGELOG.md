# Changelog

Alle wesentlichen Änderungen am RSI VR Tool werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

—

---

## [0.4.0] — 2026-04-19

### Hinzugefügt
- Globaler Fokus-Ring (`:focus-visible`) für Tastatur-Navigation (WCAG 2.4.7)
- Rechtliche Links (Impressum / Datenschutz / Glossar) auch **nach Login** im Avatar-Popover erreichbar (nDSG/DSGVO)
- Fehler-Meldungen (Name, Passwort, Admin-PIN) mit `role="alert"` + `AlertCircle`-Icon + `aria-live="polite"` (WCAG 1.4.1)
- ESC-Handler in allen Modalen: FeedbackModal, KategoriePanel, Admin-PIN-Modal (WCAG 2.1.2)
- `aria-label` / `aria-hidden` auf Icon-only-Buttons (Avatar, Theme-Toggle, Navbar-Logo, Password-Eye, Admin-Lock)
- `aria-expanded` / `aria-haspopup="menu"` am Avatar-Button
- `.sr-only`-Utility-Klasse für Screen-Reader-Texte
- **Username-Salt** (`VITE_USERNAME_SALT`) — verhindert Rainbow-Table-Preimage bei Supabase-Dump
- CR/LF-Sanitize für mailto-Subject (Header-Injection-Hygiene)

### Geändert
- Panorama-Marker komplett überarbeitet (aus 67ad786):
  - Pending-Klick-Marker jetzt **Fadenkreuz** (statt dominanter weisser Vollkreis) — beim Zoom natürlich grösser, präziser klickbar
  - Standort-Wechsel-Marker jetzt **Diamant** (konsistent mit Admin-BildEditor)
  - Hotspot bei aktivem Hint **orange** (`#F0A500`) statt blau — keine Verwechslung mit Standort-Marker
  - Hotspot ohne FOV-Quadrat-Skalierung — wächst mit dem Zoom mit statt zu schrumpfen
- `--zh-color-text-disabled` von `#949494` (Kontrast 2.85:1, WCAG-Fail) auf `#737373` (4.7:1) angehoben — WCAG-AA für kleine Content-Texte
- Dark-Mode-Text-Token entsprechend angepasst für WCAG-AA auf `#000`
- CSP `img-src` auf `'self' blob: data:` eingegrenzt (vorher `https:` erlaubt → Tracker-Pixel möglich)
- KategoriePanel: X-Schliessen-Icon-Kontrast von 45% auf 85% Opacity angehoben

### Behoben
- **C-1** Timer-Leak in `handleStandortWechsel` (`SceneViewer.tsx`) — Perspektivenwechsel während pendingConfirm räumte den Auto-Ausblenden-Timer nicht auf
- **N-3** `überholsichtweite`-Key in `kriteriumLabels.ts` hatte Umlaut, `WICHTIGKEIT_TABLE` aber `ueberholsichtweite` (ASCII) → Label-Lookup schlug fehl
- **Bug 1** (v0.3.2-Fix): `getHotspotPosition` fiel bei aktiver Perspektive auf Legacy-`d.position` zurück → Phantom-Hotspot im falschen Bild
- **Bug 2** (v0.3.2-Fix): BildEditor zeichnete Legacy-`d.position` auch in Perspektiven-Ansicht
- **Bug 3** (v0.3.2-Fix): `hitTestPunkt` skaliert jetzt Greifzone mit Zoom

### Dokumentation
- `ADMIN_HANDBUCH.md` um Environment-Variablen-Tabelle erweitert (Salt-Setup)
- Memory `project_klickflow_architektur.md` Penalty-Modell korrigiert (additiv +25/-25, **nicht** multiplikativ 0.9/0.5 wie alte Dokumentation behauptete)

### Security-Stand
- H-2 (RLS-Policies) bleibt offen → User-Aktion im Supabase-Dashboard
- N-2 (Rate-Limits) bleibt offen → Supabase-Dashboard
- Sentry optional → `VITE_SENTRY_DSN` in Vercel setzen

---

## [0.3.1] — 2026-04-19

### Hinzugefügt
- Zoom + interaktiver Pan im BildEditor (Mausrad zentriert, Drag auf leerer Fläche)
- Globaler Git-Remote-Check-Hook bei Session-Start (Claude Code)
- Footer-Layout auf LandingPage mit Impressum/Datenschutz/Glossar-Links (56px hoch)
- Zentrale Design-Tokens `--zh-navbar-h: 56px` und `--zh-footer-h: 56px`
- In-App-Feedback-Button (Modal, mailto) in Navbar und LandingPage
- Sentry-Integration (optional via `VITE_SENTRY_DSN`), Error Boundary mit Fallback-UI
- Generische `buildRanking()`-Helper für Gesamt-/Thema-/Kurs-Ranking
- `hashKursPasswort()`, `istPasswortHash()`, `pruefeKursPasswort()` — volles SHA-256 mit `kp:`-Marker, rückwärtskompatibel zu Klartext-Legacy
- `enableSeedConsent()` für kontrollierten Supabase-Seed
- Theta-Umbruch-Behandlung in `punktInPolygon` (0°/360°-Grenze)
- Import-Schema-Validierung (Array-Grenzen, ID-Format, MultiLang, Base64-Bildgrössen)
- Security-Header in `vercel.json` (CSP, X-Frame-Options DENY, Permissions-Policy mit `xr-spatial-tracking=self`)

### Geändert
- Navbar-Höhe von 52px auf 56px (mehr Touch-Target)
- ASCII-Ersatzschreibungen (ae/oe/ue) in 20 Dateien durch echte Umlaute ersetzt — Ausnahme: Code-Identifier und Fremdsprach-JSON-Keys
- `punkteRoh` und `punkteFinal` getrennt geführt (Statistik-korrekt)
- `nextSceneExists` als `useMemo` statt IIFE bei jedem Render
- `resetCache()` bei Logout und App-Reset aufgerufen
- `ScoringFlow`-Back-Button zeigt Warnung bei teilweiser Eingabe
- Delete-Bestätigung für Defizite und Szenen (kaskadierend)
- Admin-View in `App.tsx` zusätzlich gegen `sessionStorage['rsi-admin-auth']` geprüft
- `KRITERIUM_LABELS`-Import in `ScoringFlow` auf `kriteriumLabels.ts` umgestellt (Sacred-File unberührt)
- `seedSupabaseFromLocal()` nur noch mit Consent-Flag statt automatisch bei leerer Tabelle
- Support-Adresse auf `sicherheit.tba@bd.zh.ch` (Team-Mailbox)

### Behoben
- Typo "spaat" → "spät" in Seed-Daten (`appData.ts`)
- `useEffect`-Kommentar im BildEditor dokumentiert ausgelassene Dependencies
- Demo-Zugangscode `FaSi4safety` aus `DEFAULT_KURSE_SEED` entfernt

### Dokumentation
- `CHANGELOG.md`, `GLOSSAR.md`, `BENUTZERHANDBUCH.md`, `ADMIN_HANDBUCH.md`, `OFFLINE.md`, `BROWSER.md`, `BACKUP.md`, `META_STORE_CHECKLIST.md`
- `public/impressum.html`, `public/datenschutz.html`, `public/glossar.html`
- `REVIEW_CODE.md`, `REVIEW_SECURITY.md`
- `AUDIT_REPORT.md` um Update-Abschnitt v0.3.1 ergänzt

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
