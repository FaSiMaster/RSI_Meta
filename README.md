# RSI VR Tool

**Road Safety Inspection – Immersive Training**
Fachstelle Verkehrssicherheit (FaSi), Tiefbauamt, Kanton Zürich

Stand: v0.6.0 (2026-04-20) · Live: [rsi-meta.vercel.app](https://rsi-meta.vercel.app)

Ein browser-basiertes Trainingstool für die normative 9-Schritte RSI-Beurteilungsmethodik. Inspektoren üben die Einstufung von Strassenszenen anhand von Wichtigkeit, Abweichung, Relevanz SD, NACA-Skala und Unfallrisiko — mit direktem Normenbezug (TBA FK RSI V 16.09.2020, bfu-Bericht 73, SN 641 723).

---

## Schnellstart

```bash
npm install
npm run dev
```

Öffnet unter `http://localhost:5173`.

Lokale `.env.local` anlegen (siehe ADMIN_HANDBUCH.md Abschnitt 1.2 für alle Env-Vars):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_USERNAME_SALT=<einmalig via openssl rand -hex 16>
# VITE_SENTRY_DSN=<optional>
```

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | React 18 + Vite 8 + TypeScript (strict) |
| Animation | Framer Motion (motion/react v12) |
| Icons | lucide-react |
| i18n | react-i18next (de/fr/it/en) — je 473 Keys, 0 Diff |
| Persistenz (Client) | localStorage (`rsi-v3-*` Keys) |
| Backend | Supabase (Postgres + Storage + Edge Functions) |
| PWA | vite-plugin-pwa v0.19 (Service Worker, Manifest) |
| Design | ZH Corporate Design (CSS Custom Properties) |
| 3D / XR | @react-three/fiber v8 + @react-three/xr v6 (Phase 3+) |
| CI | GitHub Actions (`npm ci && tsc --noEmit && vite build` auf PR + main) |

---

## Funktionsumfang (Phase 2)

### RSI-Beurteilungsfluss (9 Schritte)

Der Kern der Applikation: Jedes Defizit wird in 9 normativen Schritten beurteilt.

| Schritt | Art | Inhalt |
|---|---|---|
| 1 | Eingabe | Wichtigkeit (io/ao aus WICHTIGKEIT_TABLE) |
| 2 | Automatisch | Wichtigkeit in Relevanz-Matrix |
| 3 | Eingabe | Abweichung beurteilen |
| 4 | Automatisch | Abweichung in Relevanz-Matrix |
| 5 | Automatisch | Relevanz SD = Ergebnis |
| 6 | Automatisch | Relevanz SD in Unfallrisiko-Matrix |
| 7 | Eingabe | NACA-Einstufung (0–7, bfu-Bericht 73) |
| 8 | Automatisch | Unfallschwere in Unfallrisiko-Matrix |
| 9 | Automatisch | Unfallrisiko = Gesamtergebnis |

Quelle: TBA-Fachkurs FK RSI, V 16.09.2020 / SN 641 723 Abb. 2

### Weitere Features (Stand v0.6.0)

- **Themen & Szenen** mit ID-Format `SZ_YYYY_NNN`, Defizite `SD_NNNN`
- **Admin-Dashboard** (Token-gesichert via Supabase Edge Function) mit Defizit-CRUD, automatischer Neuberechnung von Relevanz SD und Unfallrisiko
- **Panorama-Bilder in Supabase Storage** (Bucket `rsi-textures`), BildUpload mit Tabs «Bibliothek» + «Hochladen»
- **Piktogramm-Katalog** (23 Lucide-Icons) für Oberthemen
- **Norm-Suchfeld** mit 32 VSS/SN-Normen, Autocomplete + Tag-System
- **Trainer-Hinweis pro Szene**, **Booster mit +10 % / +20 %-Bonus**
- **4-Ebenen-Ranking** (Gesamt, Thema, Kurs, persönlich)
- **Gamification:** Gewichtete Punkte pro Schritt, Sterne, Zeiterfassung, Best-of-Prinzip
- **Dark / Light Mode** mit Toggle auf LandingPage und Avatar-Popover
- **Mehrsprachig** in de/fr/it/en (Hero, FeedbackModal, ScoringFlow, Navbar, alle User-Strings)
- **WCAG 2.1 AA:** 44×44 Touch-Targets, Focus-Trap in Modalen, ESC-Handler, globaler Fokus-Ring
- **Branding:** TBA ISSI-Ausbildungslogo + Wortmarke «RSI VR Tool» (IssiLogo.tsx)

---

## Projektstruktur (Stand v0.6.0)

```
RSI_Meta/
├── CLAUDE.md                       # Projekt-Regeln für Claude Code
├── CHANGELOG.md
├── README.md                       # Diese Datei
├── AUDIT_REPORT.md
├── ADMIN_HANDBUCH.md
├── BENUTZERHANDBUCH.md
├── BACKUP.md
├── BROWSER.md
├── OFFLINE.md
├── META_STORE_CHECKLIST.md
├── REVIEW_CODE.md / REVIEW_SECURITY.md
├── GLOSSAR.md
├── package.json / vite.config.ts / tsconfig.json / index.html
├── .github/workflows/ci.yml        # tsc + vite build auf PR + push main
├── public/
│   ├── icons/                      # PWA-Icons 192/512
│   ├── logo/
│   │   ├── issi-logo_hell.png      # TBA ISSI für hellen Hintergrund
│   │   └── issi-logo_dunkel.png    # TBA ISSI für dunklen Hintergrund
│   ├── textures/                   # Demo-/Fallback-Panoramen
│   ├── impressum.html / datenschutz.html / glossar.html
│   └── manifest.webmanifest
├── supabase/
│   └── functions/
│       ├── admin-auth/             # PIN → HMAC-Token (2 h TTL)
│       │   └── index.ts
│       └── admin-write/            # Token-verifizierte Admin-Writes
│           └── index.ts
└── src/
    ├── main.tsx                    # React-Einstieg, i18n-Init
    ├── App.tsx                     # Haupt-Router, Theme, Score
    ├── index.css
    ├── xrStore.ts                  # XR-Session Singleton
    ├── types/index.ts
    ├── data/
    │   ├── appData.ts              # localStorage CRUD, Typen, Seed
    │   ├── scoringEngine.ts        # WICHTIGKEIT_TABLE (Sacred File)
    │   ├── scoreCalc.ts            # calcScore Pure Function
    │   ├── kriteriumLabels.ts      # Anzeige-Labels mit Umlauten
    │   ├── strassenmerkmale.ts     # Dropdown-Katalog Merkmale
    │   ├── idGenerator.ts          # SZ_YYYY_NNN / SD_NNNN (v0.5.0)
    │   ├── topicIcons.ts           # 23 Lucide-Icons (v0.5.0)
    │   ├── regelwerkKatalog.ts     # 32 VSS/SN-Normen (v0.5.0)
    │   └── supabaseSync.ts         # Admin-Writes via Edge Function
    ├── lib/
    │   ├── supabase.ts             # Supabase-Client
    │   ├── supabaseStorage.ts      # Bucket upload/list/delete (v0.5.0)
    │   ├── sentry.ts               # Sentry-Setup (optional)
    │   ├── useFocusTrap.ts         # Focus-Trap-Hook (v0.5.0)
    │   └── utils.ts
    ├── styles/
    │   └── design-tokens.css
    ├── i18n/
    │   ├── index.ts
    │   ├── de.json                 # Referenzsprache
    │   └── fr.json / it.json / en.json   # 100% synchron (v0.6.0)
    └── components/
        ├── LandingPage.tsx         # Login, Theme-Toggle, Hero, Admin
        ├── Navbar.tsx              # IssiLogo, Score-Pill, Avatar, 44×44
        ├── IssiLogo.tsx            # TBA ISSI + Wortmarke (v0.6.0)
        ├── TopicDashboard.tsx      # Sektionen, Tooltips, Quellen
        ├── SceneList.tsx
        ├── TrainingEinstieg.tsx    # Trainer-Hinweis gelb
        ├── SceneViewer.tsx         # 360°-Viewer, Klick-Flow, VR
        ├── ScoringFlow.tsx         # 9-Schritte, «Ändern»-Link
        ├── SzenenAbschluss.tsx
        ├── RankingView.tsx
        ├── AdminDashboard.tsx      # Inhalte/Kurse/Rangliste/Export
        ├── FeedbackModal.tsx       # Vollständig i18n
        ├── LernKarte.tsx
        ├── LanguageSwitcher.tsx    # 44×44, aria-pressed
        ├── KategoriePanel.tsx
        ├── KlickFeedback.tsx
        └── admin/
            ├── BildEditor.tsx      # Canvas-Verortungs-Editor
            ├── BildUpload.tsx      # Tabs Bibliothek + Hochladen (v0.5.0)
            └── AdminRanking.tsx    # User/Kurs-Verwaltung
```

Entfernt (nicht mehr im Repo): `src/data/glossary.ts` (war in `_Archiv/dead_code/`).

---

## Normative Grundlagen

| Quelle | Rolle im Tool |
|---|---|
| TBA-Fachkurs FK RSI, V 16.09.2020 | WICHTIGKEIT_TABLE (58 Kriterien), 9-Schritte-Methodik, Matrizen |
| bfu-Bericht 73 | NACA-Skala (0–7), Verletzungsschwere |
| VSS SN 641 723, Abb. 2 | Normative Unfallrisiko-Matrix |
| VSS 41 722 / bfu-Werkzeugkasten | Weitere Normbezüge im `regelwerkKatalog.ts` |

Die Berechnungsmatrizen (`calcRelevanzSD`, `calcUnfallrisiko`) wurden gegen die Originalfolien des TBA-Fachkurses verifiziert (Audit 2026-03-28, AUDIT_REPORT.md).

---

## Deployment

### Vercel (Primär)

1. Vercel-Projekt auf `FaSiMaster/RSI_Meta` linken (`base: '/'` in `vite.config.ts`).
2. Environment-Variablen setzen (Client-Seite, siehe ADMIN_HANDBUCH 1.2):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_USERNAME_SALT` (einmalig via `openssl rand -hex 16`)
   - `VITE_SENTRY_DSN` (optional)
3. Push auf `main` → Vercel baut + deployt automatisch.

### Supabase (Backend)

1. Projekt auf supabase.com anlegen (Region: EU).
2. **Tabellen:** `rsi_topics`, `rsi_scenes`, `rsi_deficits`, `rsi_results` mit RLS (anon: nur SELECT auf Content, SELECT+INSERT auf `rsi_results`, **kein DELETE** auf `rsi_results`).
3. **Storage-Bucket `rsi-textures`** (public read) mit Policies (`rsi_public_read`).
4. **Edge Functions deployen** (siehe ADMIN_HANDBUCH Abschnitt 2):
   - `supabase/functions/admin-auth/index.ts` (verify_jwt aus)
   - `supabase/functions/admin-write/index.ts` (verify_jwt aus)
5. **Secrets setzen:**
   - `ADMIN_PIN` (4-stellig, aktuell `5004`)
   - `ADMIN_TOKEN_SECRET` (einmalig via `openssl rand -hex 32`)

### Meta Quest (lokales Testen)

```bash
npm run dev
# Im selben WLAN: http://[lokale-IP]:5173
```

Meta Quest Browser unterstützt WebXR `immersive-vr` nativ. Für Desktop-Test: Chrome Extension "Immersive Web Emulator" (Meta).

---

## Build-Informationen

```
Bundle: ~450 kB (~140 kB gzip)
CSS:    ~50 kB (~9 kB gzip)
PWA:    Service Worker + Manifest (Precache App-Shell, NetworkFirst für /impressum|datenschutz|glossar.html)
CI:     npm ci + tsc --noEmit + vite build auf PR + push main
```

---

## Entwicklungshinweise

- **Kein `ß`** — immer `ss` (Schweizer Hochdeutsch)
- **Echte Umlaute** (ä, ö, ü) statt ae/oe/ue — Ausnahme: Code-Identifier und JSON-Keys
- **localStorage Keys** immer mit `rsi-v3-`-Prefix
- **sessionStorage Keys:** `rsi-admin-token` (Admin-Token, 2 h TTL), `rsi-admin-auth` (Auth-Flag)
- **correctAssessment** in AppDeficit muss normativ korrekt sein — `recompute()` in AdminDashboard hilft
- **Neue Kriterien** in WICHTIGKEIT_TABLE immer gegen TBA FK RSI V 16.09.2020 verifizieren (Sacred File)
- **Panorama-Bilder** produktiv in Supabase Storage, nicht in `/public/textures/`
- Offene Probleme: siehe `AUDIT_REPORT.md` und `CHANGELOG.md` Abschnitt «Noch offen»

---

## Lizenz

Internes Tool der Fachstelle Verkehrssicherheit, Tiefbauamt, Kanton Zürich.
Nicht für die öffentliche Verbreitung bestimmt.
