# Changelog

Alle wesentlichen Änderungen am RSI VR Tool werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

—

---

## [0.6.2] — 2026-04-21 (Hotfix: Crash + Build + Recovery)

Schneller Patch-Release nach Pilot-Feedback «Seite startet online nicht
mehr». Drei voneinander unabhängige Ursachen gefunden und ausgeräumt.

### Behoben
- **`ml()`-Crash in TopicDashboard**: Ein Müll-Topic `__rl_test__` aus
  dem N-2-Rate-Limit-Test (Commit 2b7877e) lag in `rsi_topics` mit
  `nameI18n=undefined` und `beschreibungI18n=undefined`. Beim Login
  warf `text[lang]` einen `TypeError`, der `<Sentry.ErrorBoundary>`
  griff, der User sah nur «Es ist ein Fehler aufgetreten». `ml()`
  fällt jetzt auf Leerstring zurück und loggt den defekten Eintrag,
  die App rendert trotz kaputter Daten weiter.
- **CI-Pipeline «Verify PWA artifacts» schlug seit v0.6.1 fehl**:
  Vite 8 nutzt Rolldown by default, `vite-plugin-pwa` (weder 0.19.8
  noch 1.2.0) unterstützt Rolldown offiziell. Folge:
  `generateBundle`-Hook wurde von Rolldown ignoriert
  («This plugin assigns to bundle variable... will be ignored»),
  `dist/sw.js` wurde auf Ubuntu-CI nie erzeugt. Downgrade auf
  Vite 7.3.2 (stabile Rollup-Version) + Upgrade auf
  vite-plugin-pwa 1.2.0. Build produziert reproduzierbar `sw.js`,
  `workbox-*.js`, `registerSW.js`. CI-Run 24704768797 grün in 57s.

### Hinzugefügt
- **Auto-SW-Recovery im ErrorBoundary**: `src/main.tsx` bekommt einen
  zweiten Button «Zurücksetzen & neu laden», der alle Service Worker
  deregistriert und die `CacheStorage` löscht — localStorage bleibt
  erhalten (User-Daten, Kurs-Session). Dazu ein
  `controllerchange`-Listener auf Top-Level: wenn nach einem Deploy
  ein neuer SW via `skipWaiting+clientsClaim` die Kontrolle
  übernimmt, lädt die Seite automatisch einmal neu. Verhindert die
  wiederkehrende Klasse von «Seite hängt auf altem Precache»-Fehlern
  nach zukünftigen Deploys.
- **`scripts/scan_i18n.mjs`**: Diagnose-Script, das
  `rsi_topics` / `rsi_scenes` / `rsi_deficits` auf fehlende oder
  leere i18n-Felder scannt. Liest `.env.local`, nutzt den Anon-Key
  per PostgREST-SELECT, listet betroffene Rows mit
  ID / topic_id / scene_id + fehlende Keys.

### Geändert (Tooling)
- **GitHub-Actions-Deprecation behoben**: `actions/checkout@v4` →
  `@v6` und `actions/setup-node@v4` → `@v6` (beide Node-24-Actions).
  `node-version` auf CI von `"20"` auf `"22"` gehoben (aktuelle
  LTS-Linie). Vermeidet die ab 2026-06-02 greifende
  Node-20-Deprecation.
- **Supabase-Cleanup** (manuell ausgeführt am 2026-04-21 im
  Dashboard-SQL-Editor, nicht als Migration persistiert):
  ```sql
  DELETE FROM rsi_topics WHERE id = '__rl_test__';
  UPDATE rsi_scenes
  SET data = jsonb_set(
    data::jsonb, '{kontextI18n}',
    '{"de":"","en":"","fr":"","it":""}'::jsonb)
  WHERE id = 'SZ_2026_001';
  ```

### Noch offen (Post-Pilot)
- Defense-in-Depth in Edge Function `admin-write`: Test-Payloads mit
  `id=__rl_test__` oder komplett leeren i18n-Feldern ablehnen.
- Vite 8 wiederaufnehmen, sobald `vite-plugin-pwa` offiziell
  Rolldown-kompatibel wird (voraussichtlich mit Workbox-Ersatz oder
  eigenem SW-Plugin für die v8-Linie).

---

## [0.6.1] — 2026-04-20 (Sprint-2 a11y + CI + Doku)

Patch-Release nach v0.6.0 mit Accessibility-Nachbesserungen, erster
CI-Pipeline und Dokumentations-Synchronisation auf den aktuellen Stand.

### Hinzugefügt
- **GitHub Actions CI** (`.github/workflows/ci.yml`): `npm ci` → `tsc --noEmit`
  → `vite build` → PWA-Artefakt-Verifikation. Läuft bei jedem Push und PR
  auf `main`.
- **Admin-Modale mit `useFocusTrap` + ESC-Handler**: alle 4 Modale
  (Defizit, Szene, Thema, Kurs) haben jetzt Focus-Trap (WCAG 2.4.3) und
  schliessen bei ESC (WCAG 2.1.2). `role="dialog"` + `aria-modal="true"`
  auf den Content-Containern.

### Geändert (Dokumentation)
- **BACKUP.md** komplett neu: Supabase-DB-Backup (PITR/Manual),
  Storage-Bucket-Sicherung, localStorage-Export via Admin-Dashboard.
  Alte Annahme «Panorama-Texturen im Repo» korrigiert (seit v0.5.0 im
  Supabase Storage Bucket).
- **ADMIN_HANDBUCH.md** auf v0.6.0: Token-Flow-Erklärung, neue
  Env-Tabelle (VITE_ADMIN_PIN raus, Server-Secrets ADMIN_PIN +
  ADMIN_TOKEN_SECRET), Edge-Function-Deploy-Abschnitt,
  PIN-Rotations-Prozess.
- **README.md** auf v0.6.0: Projektstruktur komplett aktualisiert (neue
  Files, Edge-Functions-Pfad, glossary.ts entfernt), Tech-Stack erweitert,
  Supabase-Setup dokumentiert, CI-Pipeline erwähnt.
- **META_STORE_CHECKLIST.md**, **BROWSER.md**, **OFFLINE.md**:
  Versions-Label auf v0.6.0 gehoben (inhaltlich weitgehend unverändert).
- Delegiert an einen Doku-Agent, plus direkte Ergänzungen für README und
  ADMIN_HANDBUCH durch Haupt-Orchestrator.

### Offen (Sprint 3)
- BENUTZERHANDBUCH.md noch nicht aktualisiert
- AdminDashboard.tsx Modal-Split (Komponenten-Grösse 1'949 LoC)
- SceneViewer VR-Feedback-Strings auf i18n
- SceneViewer/BildEditor/appData entflechten

---

## [0.6.0] — 2026-04-20 (Sprint-1 Security-Härtung + Branding + a11y)

Grosser Post-v0.5.0-Sprint nach 16-Rollen-Review mit Fokus auf echte
Security-Härtung (PIN aus Bundle raus), Branding-Update, Accessibility
und i18n-Konsistenz. Pilot-bereit nach dieser Version.

### Hinzugefügt
- **TBA ISSI-Ausbildungslogo + Wortmarke «RSI VR Tool»** in Navbar und
  LandingPage-Top-Bar. Neue Komponente `IssiLogo.tsx` rendert beide
  Varianten (hell/dunkel) und schaltet via `[data-theme="dark"]`-CSS.
  KTZH-Konvention: `_hell.png` für helle Umgebung, `_dunkel.png` für
  dunkle. Ersetzt den alten Shield-SVG + «RSI-Immersive»-Text.
- **Theme-Toggle auf LandingPage** (Sun/Moon-Button neben Admin). Props
  `theme` + `onToggleTheme` von App.tsx durchgereicht. Hell/Dunkel auch
  vor Login wählbar.
- **Löschen-Button für Oberthemen im Admin** (Trash2 neben Archivieren).
  `handleDeleteThema` mit Confirm-Dialog, der Kaskaden-Umfang nennt
  (X Untergruppen, Y Szenen inkl. aller Defizite).
- **Edge Function `admin-auth`** (`supabase/functions/admin-auth/`):
  neue Deno-Function, tauscht PIN gegen HMAC-signiertes Token
  (`<expires>.<base64-hmac>`, 2 h TTL, signiert mit Secret
  `ADMIN_TOKEN_SECRET`). Padding-Timing-Safe-Compare verhindert
  Length-Leak. CORS-Whitelist (Vercel + localhost).

### Geändert (Sicherheit)
- **Admin-PIN aus dem Client-Bundle entfernt**: `VITE_ADMIN_PIN` wird
  nicht mehr gelesen. LandingPage schickt PIN an Edge Function
  `admin-auth`, erhält Token, speichert es in
  `sessionStorage['rsi-admin-token']`. `supabaseSync.ts` schickt
  `x-admin-token`-Header statt `x-admin-pin`. Bei 401 wird Token +
  Auth-Flag automatisch gerkaeumt.
- **`admin-write` härtet**: Token-Verifikation statt PIN-Check,
  CORS-Whitelist statt `*`, Payload-Schema-Validation pro Tabelle
  (Whitelist Felder, Typ-Checks, 256-KB-Row-Size-Limit, max 200 Rows
  pro Upsert). 128er-Padding-Timing-Safe-Compare für Token.
- **RLS-Verschärfung** (bereits eingeflossen in H-2): Content-Tabellen
  `rsi_topics/scenes/deficits` sind anon **nur noch SELECT**. Doppelte
  Alt-Policies (`{public}` + `{anon, authenticated}`) aufgeräumt.
- **`rsi_results.DELETE`** für anon entfernt — nur noch admin-seitig
  löschbar, Ranking ist nicht mehr frei manipulierbar.
- **Dependency-Audit**: `npm audit fix --force` ausgeführt. Verbleiben
  3 high in Dev-Toolchain (`serialize-javascript` via `workbox-build`),
  kein Runtime-Impact, auf Backlog.

### Geändert (Accessibility + i18n)
- **Navbar-Touch-Targets auf 44×44 px** (WCAG 2.5.5 AA): Theme-Toggle
  und Avatar-Button. Icon-Grössen proportional angepasst.
- **i18n-Key-Konsistenz repariert**: 16 Keys in `fr/it/en.json` hatten
  ASCII-Varianten (`kurs_loeschen`, `uebertrag_auto` etc.) während der
  Code und `de.json` Umlaut-Varianten nutzen (`kurs_löschen`,
  `übertrag_auto`). Nicht-DE-Sprachen fielen bei diesen Keys auf
  Fallback-Text zurück. Alle 4 Sprachen jetzt synchron (je 473 Keys,
  0 Diff).
- **Hartcodierte User-Strings entfernt**: «Feedback senden» (Navbar),
  «Neuer Bestwert!» (SzenenAbschluss), «Hinweis genutzt» +
  «Einstiegshilfe bfu» (ScoringFlow) jetzt via `t()`. Neue Keys
  `popover.feedback`, `scoring.hinweis_genutzt` in allen 4 Sprachen.

### Behoben
- **PWA-Routing**: `runtimeCaching` NetworkFirst für
  `/impressum|datenschutz|glossar.html` als Belt-and-braces gegen
  Alt-Service-Worker aus v0.4.x, die die App-Shell für diese Pfade
  gecacht hatten.
- **Logo-Doppelanzeige**: Inline-Style `display:block` überschrieb
  die CSS-Regel `display:none` — korrigiert in `IssiLogo.tsx`, plus
  `!important` in `index.css` gegen Tailwind-Preflight.
- **Logo hell/dunkel invertiert** (Erst-Deploy): beim zweiten Deploy
  korrekt auf KTZH-Konvention zugeordnet.

### Infrastruktur
- **H-1 PIN-Rotation**: Admin-PIN von `2847` auf `5004` rotiert (lokal,
  Vercel, Supabase-Secret).
- **N-2 Rate-Limit**: In-Memory-Counter verworfen (Multi-Instance-
  Problem), als akzeptiertes Pilot-Risiko dokumentiert. DB-basierter
  Limiter auf Backlog.

### Noch offen (Sprint 2, geplant für heute/diese Woche)
- AdminDashboard.tsx (1'926 LoC) in DefizitTab, ThemenTab, KurseTab,
  ExportImportTab splitten
- SceneViewer.tsx (1'556 LoC) und BildEditor.tsx (1'449 LoC)
  entflechten
- Admin-Modale mit `useFocusTrap` + ESC-Handler versehen
- Handbücher (ADMIN_HANDBUCH, BENUTZERHANDBUCH, BACKUP.md, README)
  auf Stand v0.6.0 bringen (bisher v0.3.1)
- Minimale GitHub-Actions-CI (`npm ci && npm run build` auf PR + main)
- SceneViewer VR-Feedback-Strings auf i18n umstellen (Refactor nötig,
  `VR_FEEDBACK_CFG` muss in `useVRFeedbackCfg()`-Hook)
- NACA-Subtexte in ScoringFlow bereits via i18n, aber an einzelnen
  Stellen noch hartcodiert

### Sicherheit — Post-Pilot (Backlog)
- PIN auf 6+ Stellen erweitern (10'000 → 1'000'000 Kombinationen)
- DB-basierter Rate-Limiter in `admin-auth`/`admin-write` (Tabelle
  `admin_auth_fails(ip, ts)`, SELECT count WHERE ts > now()-60s,
  Schwelle 10/min → `429`)
- Supabase Auth mit Admin-Rolle (Magic Link) ersetzt PIN-Shared-Secret
- Storage-Listing via Edge Function → broad SELECT-Policy auf
  `storage.objects` entfernen
- `VITE_SENTRY_DSN` setzen (Error-Tracking aktivieren — im Code seit
  v0.3.1 integriert, DSN für Pilot bewusst leer gelassen)
- VITE_USERNAME_SALT zusätzlich serverseitig peppern (Bundle-Leak)
- Admin-Audit-Tabelle (`admin_audit`) für Schreibvorgänge
- Löschkonzept für `rsi_results` (90-Tage-TTL via Cron, revDSG)

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
