# Changelog

Alle wesentlichen Änderungen am RSI VR Tool werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

### Sicherheit
- **H-2 RLS-Verschärfung**: Content-Tabellen `rsi_topics`, `rsi_scenes`,
  `rsi_deficits` erlauben anon/authenticated ab sofort **nur SELECT**.
  Schreibzugriffe (upsert + delete) laufen über neue Supabase Edge
  Function `admin-write` (`supabase/functions/admin-write/`), die den
  Admin-PIN gegen das Server-Secret `ADMIN_PIN` prüft und mit
  `service_role` schreibt. Client (`supabaseSync.ts`) speichert den PIN
  nach Login in `sessionStorage['rsi-admin-pin']` und schickt ihn als
  `x-admin-pin`-Header. Doppelte Alt-Policies (`{public}` + `{anon,
  authenticated}`) wurden aufgeräumt.
- **H-1 PIN-Rotation**: Admin-PIN lokal + Vercel von `2847` auf `5004`
  rotiert.
- **N-2 Rate-Limit: akzeptiertes Pilot-Risiko.** Ein In-Memory-Counter
  in der Edge Function wurde verworfen, weil Supabase Edge Functions
  auf mehreren Deno-Instanzen laufen (Counter wäre wirkungslos). Ein
  DB-basierter Limiter wäre machbar, ist aber für den Pilot-Kontext
  überdimensioniert: die App enthält keine personenbezogenen,
  finanziellen oder DSGVO-relevanten Daten, Worst-Case beim PIN-Leak
  ist Content-Zerstörung, aus lokaler Kopie + Git rekonstruierbar.
  Supabase/Cloudflare-Gateway enforct ein globales per-IP-Limit
  (~1000 req/10 s), was Brute-Force praktisch verlangsamt.

### Sicherheit — Post-Pilot (Backlog)
- PIN auf 6+ Stellen erweitern (10'000 → 1'000'000 Kombinationen)
- DB-basierter Rate-Limiter in `admin-write` (Tabelle
  `admin_auth_fails(ip, ts)`, SELECT count WHERE ts > now()-60s,
  Schwelle 10/min → `429`)
- Supabase Auth mit Admin-Rolle (Magic Link) ersetzt PIN-Shared-Secret
- Storage-Listing via Edge Function → broad SELECT-Policy auf
  `storage.objects` entfernen

---

## [0.5.0] — 2026-04-20

Grosser Beta-Polishing-Sprint mit 16 Commits: Bilder-Pipeline, Supabase
Storage als Single Source, LandingPage Variante B, ID-Format SZ_2026_NNN,
Defizit-Editor-UX, Pikto-Katalog, Norm-Suchfeld, a11y-Pack, Security-Fix.

### Hinzugefügt
- **Supabase Storage als Single Source of Truth** (`rsi-textures`-Bucket):
  neuer Helper `src/lib/supabaseStorage.ts` mit upload/list/delete,
  BildUpload mit Tabs «Bibliothek» (Akkordeon nach Szene) + «Hochladen»
  (automatischer Pfad `panoramas/{szeneId}/{filename}`)
- **Eindeutige IDs**: Szenen `SZ_2026_NNN` (mit Jahr), Defizite `SD_NNNN`
  (`src/data/idGenerator.ts`). Bestandsdaten mit Legacy-IDs bleiben gültig.
- **Trainer-Hinweis pro Szene**: `bemerkungI18n` (optional), wird im
  TrainingEinstieg als gelber Hinweis-Block vor dem Start angezeigt
- **Booster mit %-Bonus**: Radio-Auswahl +10 % / +20 % statt nur Boolean.
  Bonus wirkt auf finalen Score (`pts * (1 + %/100)`).
- **Pikogramm-Katalog**: 23 Lucide-Icons für Themenbereiche
  (`src/data/topicIcons.ts`), Picker-UI im Admin + Auto-Vorschlag aus
  Themennamen (`suggestIconKey`)
- **Norm-Such-Feld**: 32 RSI-relevante VSS/SN-Normen
  (`regelwerkKatalog.ts`), Autocomplete-Dropdown im Defizit-Editor mit
  Tag-System
- **Diagnose-Overlay im SceneViewer**: zeigt orangen Banner wenn kein
  Panorama-Bild hinterlegt, statt stiller schwarzer Canvas
- **LandingPage Variante B** (B-3 + C-3): neue Taglines «Erkennen.
  Bewerten. Priorisieren.», ISSI/TBA-Fachkurs/bfu explizit genannt,
  Feature-Liste konkretisiert
- **FeedbackModal vollständig i18n**: Labels, Platzhalter, Buttons,
  mailto-Body-Felder in DE/FR/IT/EN
- **LanguageSwitcher 44×44 px Touch-Target** + `aria-pressed` +
  `aria-label` mit vollem Sprachnamen (WCAG 2.5.5 + 4.1.2)
- **Focus-Trap in Modalen** (`src/lib/useFocusTrap.ts`) — Tab/Shift+Tab
  cycelt innerhalb Modal, Initial-Fokus, Restore beim Schliessen
  (WCAG 2.4.3)
- **«Ändern»-Link in ScoringFlow-StepCards**: nach Auswahl erscheint
  blauer Link, resetet ab dieser Stufe
- **Hover-Tooltips auf 9-Schritte-Karten**: native title + fadet
  Detail-Block ein, mit aria-label für Screen-Reader

### Geändert
- **Panorama-Bilder liegen ab sofort in Supabase Storage**, nicht mehr
  in Vercel `/public/textures/`. DEFAULT_SCENES `panoramaBildUrl: null`
  (Admin lädt eigene Bilder hoch). Vercel-Texturen bleiben nur als Demo.
- **Versions-Single-Source**: `vite.config.ts` injiziert
  `VITE_APP_VERSION` aus `package.json`, alle Anzeige-Stellen dynamisch
- **Absender überall FaSi**: «© 2026 Tiefbauamt…» → «Fachstelle
  Verkehrssicherheit (FaSi) · Kanton Zürich» in Footer, Impressum,
  Datenschutz, Glossar
- **Impressum VSS-Norm korrigiert**: «VSS 40 xxx, SN 640/641» →
  «SN 641 723 (ISSI/RSI), VSS 41 722, bfu-Werkzeugkasten»
- **Defizit-Editor Reihenfolge**: Kategorie steht jetzt vor Kriterium
  & Kontext (D-7); 360°-Position-Felder (theta/phi/Toleranz) entfernt
  — Verortung erfolgt ausschliesslich über den Verortungs-Editor
- **TopicDashboard Sektions-Trennung**: «So funktioniert das Training»
  in eigener Karte mit ?-Badge, horizontale Trennlinie zum Themen-Grid;
  Quellen-Block unter 3-Spalten-Grid statt in NACA-Spalte
- **TopicIcon** nutzt jetzt zentrales Lucide-Mapping statt Custom-SVG,
  AppTopic.iconKey als free-string (backward-compatible)

### Behoben
- **WebGL Context Lost** durch CSP-Verschärfung: troika-three-text
  (Standort-Labels) lud Web-Worker-Sub-Scripts via `blob:` — gesperrt.
  Fix: `script-src ... blob:` + `script-src-elem 'self' blob:`
- **Supabase-Storage-Bilder blockiert**: `img-src` fehlte
  `https://*.supabase.co`. Bilder lagen bereits im Bucket, CSP hat sie
  ausgesperrt
- **jsDelivr-Font-Loader blockiert**: troika lud Unicode-Glyph-Daten,
  CSP fehlte `connect-src cdn.jsdelivr.net`
- **Sicherheits-Lücke «Szene erstellen»**: `SceneList` zeigte Button
  «Neue Szene» für alle User, nicht nur Admin. isAdmin-Prop existierte
  aber wurde nicht übergeben. Fix: `sessionStorage.rsi-admin-auth` an
  SceneList weitergereicht, Button conditional
- **Default-Szenen ohne Bild**: sc2/sc3/sc4 hatten
  `panoramaBildUrl: null` → schwarze Sphäre. Mit D-2-Refactor obsolet
  geworden
- **Versions-Inkonsistenz**: Footer/Impressum/Sentry zeigten v0.3.1
  statt aktueller Version. Dynamisch aus package.json
- **PWA-Footer-Links blockiert**: Service Worker routete
  `/impressum.html`, `/datenschutz.html`, `/glossar.html` auf SPA-Shell.
  Fix: `navigateFallbackDenylist` in vite.config.ts

### Sicherheit
- **RLS auf rsi_topics / rsi_scenes / rsi_deficits** aktiviert (Pilot-
  Variante: anon SELECT/INSERT/UPDATE/DELETE, PIN-geschützt im Code)
- **Storage-Policies** im Bucket `rsi-textures`: `rsi_public_read`,
  `rsi_anon_upload`, `rsi_anon_delete` via Dashboard-UI
- **VITE_USERNAME_SALT** in Vercel-Env gesetzt (einmalig, nie ändern)
- **CSP verschärft** (Supabase-only für img-src, cdn.jsdelivr für Fonts)

### Architektur-Entscheidungen (für späteren Ausbau dokumentiert)
- Bucket-Struktur: `panoramas/{szeneId}/{haupt|persp_NNN_<label>}.webp`
- ID-Konvention: SZ_YYYY_NNN + SD_NNNN
- Backlog: Edge Function mit service_role-Key für Storage-Listing
  (eliminiert SELECT-Policy-Warnung), Supabase Auth statt nur PIN
- Statische Seiten (Impressum/Datenschutz/Glossar) mehrsprachig erst
  bei Beta 1.0 (vorerst DE only)

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
