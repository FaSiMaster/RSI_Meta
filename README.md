# RSI VR Tool

**Road Safety Inspection – Immersive Training**
Fachstelle Verkehrssicherheit (FaSi), Tiefbauamt, Kanton Zürich

Ein browser-basiertes Trainingstool für die normative 9-Schritte RSI-Beurteilungsmethodik mit 360°-Panorama-Viewer und WebXR-Support für Meta Quest 3. Inspektoren üben die Einstufung von Strassenszenen anhand von Wichtigkeit, Abweichung, Relevanz SD, NACA-Skala und Unfallrisiko — mit direktem Normenbezug (TBA FK RSI V 16.09.2020, bfu-Bericht 73, SN 641 723).

**Version:** v0.6.0 (2026-04-20)
**Live:** https://rsi-meta.vercel.app

---

## Schnellstart (Entwicklung)

```bash
npm install
npm run dev
```

Öffnet unter `http://localhost:5173`.

Für Meta Quest im gleichen WLAN: `http://[lokale-IP]:5173`.

### Environment-Variablen (`.env.local`)

```ini
VITE_SUPABASE_URL=https://<projekt-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_USERNAME_SALT=<32 hex, einmalig, nie ändern>
# VITE_SENTRY_DSN=                       # optional, Error-Tracking
```

Admin-PIN ist **nicht mehr im Client-Bundle** (seit v0.6.0). Er liegt nur als Supabase-Secret (`ADMIN_PIN`) zusammen mit `ADMIN_TOKEN_SECRET`.

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | React 18 + Vite + TypeScript strict |
| Animation | motion/react (Framer Motion v12) |
| i18n | react-i18next (de/fr/it/en, 473 Keys synchron) |
| 3D / WebXR | @react-three/fiber 8, @react-three/xr 6 |
| Icons | lucide-react |
| Persistenz | localStorage (rsi-v3-*) + Supabase (Live-Sync) |
| Backend | Supabase (DB + Storage + Edge Functions) |
| Error-Tracking | Sentry (optional, DSGVO-sicher konfiguriert) |
| PWA | vite-plugin-pwa (SW, Manifest, Offline) |
| Design | ZH Corporate Design (CSS Custom Properties) |
| Hosting | Vercel (HTTPS-Pflicht für WebXR) |

---

## Projektstruktur (Stand v0.6.0)

```
RSI_Meta/
├── CHANGELOG.md                        # Release-Historie (Keep-a-Changelog)
├── ADMIN_HANDBUCH.md / BENUTZERHANDBUCH.md
├── BACKUP.md / BROWSER.md / OFFLINE.md / META_STORE_CHECKLIST.md
├── AUDIT_REPORT.md / REVIEW_CODE.md / REVIEW_SECURITY.md / GLOSSAR.md
├── vite.config.ts / vercel.json / tsconfig.json
├── .github/workflows/ci.yml            # GitHub Actions: tsc + vite build
├── public/
│   ├── icons/                          # PWA-Icons
│   ├── logo/                           # TBA ISSI-Logo hell/dunkel
│   ├── impressum.html / datenschutz.html / glossar.html
│   └── textures/                       # Demo-Panoramen (historisch)
├── src/
│   ├── main.tsx                        # Einstieg, i18n-Init, Sentry
│   ├── App.tsx                         # View-Router, Theme, Score
│   ├── xrStore.ts                      # WebXR Singleton
│   ├── types/index.ts                  # Dimension-Typen, MultiLang
│   ├── data/
│   │   ├── appData.ts                  # localStorage CRUD, Typen
│   │   ├── scoringEngine.ts            # SACRED — 58 Kriterien, Matrizen
│   │   ├── scoreCalc.ts                # Pure calcScore
│   │   ├── kriteriumLabels.ts          # Anzeige-Labels
│   │   ├── strassenmerkmale.ts         # VSS-40-201-Katalog
│   │   ├── idGenerator.ts              # SZ_YYYY_NNN / SD_NNNN
│   │   ├── topicIcons.ts               # 23 Lucide-Piktogramme
│   │   ├── regelwerkKatalog.ts         # 32 VSS/SN-Normen
│   │   └── supabaseSync.ts             # Content-Sync via Edge Function
│   ├── lib/
│   │   ├── supabase.ts                 # Client + Status-Observer
│   │   ├── supabaseStorage.ts          # Bucket-Upload/Listing
│   │   ├── sentry.ts                   # beforeSend-Scrubber
│   │   ├── useFocusTrap.ts             # WCAG 2.4.3 Modal-Hook
│   │   └── utils.ts
│   ├── utils/sphereCoords.ts           # 3D-Sphere-Math, Polygone
│   ├── styles/design-tokens.css        # ZH CI Variablen
│   ├── i18n/de.json / fr / it / en     # je 473 Keys
│   └── components/
│       ├── LandingPage.tsx             # Login + Admin-PIN-Auth
│       ├── Navbar.tsx                  # TBA-Logo + Nav + Popover
│       ├── IssiLogo.tsx                # Hell/Dunkel-Auto-Switch
│       ├── TopicDashboard.tsx
│       ├── SceneList.tsx
│       ├── TrainingEinstieg.tsx
│       ├── SceneViewer.tsx             # 360°-Panorama + WebXR
│       ├── ScoringFlow.tsx             # 9-Schritte-Fluss
│       ├── SzenenAbschluss.tsx
│       ├── RankingView.tsx
│       ├── AdminDashboard.tsx          # Defizite / Themen / Kurse
│       ├── LanguageSwitcher.tsx
│       ├── KategoriePanel.tsx
│       ├── KlickFeedback.tsx
│       ├── LernKarte.tsx
│       ├── FeedbackModal.tsx
│       └── admin/
│           ├── BildEditor.tsx          # Panorama-Verortungs-Editor
│           ├── BildUpload.tsx          # Storage-Tabs Bibliothek/Upload
│           └── AdminRanking.tsx
└── supabase/
    └── functions/
        ├── admin-auth/                 # PIN → HMAC-Token (seit v0.6.0)
        │   ├── index.ts
        │   └── README.md
        └── admin-write/                # Token-geschützter Proxy
            ├── index.ts
            └── README.md
```

---

## Normative Grundlagen

| Quelle | Rolle im Tool |
|---|---|
| TBA-Fachkurs FK RSI, V 16.09.2020 | WICHTIGKEIT_TABLE (58 Kriterien), 9-Schritte-Methodik, Matrizen |
| bfu-Bericht 73 | NACA-Skala (0–7), Verletzungsschwere |
| VSS SN 641 723, Abb. 2 | Normative Unfallrisiko-Matrix |
| VSS 41 722 | Kriterienkatalog Verkehrssicherheit |

Berechnungsmatrizen (`calcRelevanzSD`, `calcUnfallrisiko`) verifiziert gegen TBA-Fachkurs-Originalfolien (Audit 2026-03-28, `AUDIT_REPORT.md`).

---

## Deployment

### Vercel (Produktion)

- `base: '/'` in `vite.config.ts`
- Environment-Variablen in Vercel setzen (siehe oben, **ohne** `VITE_ADMIN_PIN` — der ist nur noch serverseitig in Supabase)
- Push auf `main` triggert Auto-Deploy

### Supabase (Backend)

1. **Projekt** gtweaesunpvwjlttyaab (EU-Region)
2. **Tabellen:** `rsi_results`, `rsi_topics`, `rsi_scenes`, `rsi_deficits`. RLS Content-Tabellen = nur SELECT für anon.
3. **Storage-Bucket** `rsi-textures` (public) für Panorama-Bilder
4. **Edge Functions** (Deploy über Dashboard, `verify_jwt` aus):
   - `admin-auth` — tauscht PIN gegen HMAC-Token (Secrets `ADMIN_PIN` + `ADMIN_TOKEN_SECRET`)
   - `admin-write` — Token-geschützter Schreib-Proxy (service_role)

Details in `ADMIN_HANDBUCH.md` und `supabase/functions/*/README.md`.

### Meta Quest (lokales Testen)

```bash
npm run dev      # läuft unter http://[lokale-IP]:5173
```

Meta Quest Browser unterstützt WebXR `immersive-vr` nativ. Desktop-Entwicklung: Chrome-Extension *"Immersive Web Emulator"* (Meta).

---

## Build & CI

```bash
npm run build            # tsc && vite build → dist/
npm run preview -- --host
```

`.github/workflows/ci.yml` führt bei jedem Push und PR auf `main` aus:
- `npm ci`
- `npx tsc --noEmit` (Type-Check)
- `npm run build` (inkl. PWA)
- PWA-Artefakt-Verifikation

---

## Entwicklungshinweise

- **Kein `ß`** — immer `ss`. Umlaute (ä/ö/ü) sind Pflicht, keine ASCII-Ersatzformen.
- **Schweizer Zahlenformat:** Tausender-Apostroph (`1'234`), Dezimalpunkt.
- **localStorage-Keys** prefix `rsi-v3-`.
- **`scoringEngine.ts` ist SACRED** — Änderungen nur mit expliziter Fachkurs-Verifikation und Freigabe.
- **correctAssessment** muss normativ korrekt sein — `recompute()` in AdminDashboard hilft.
- **Primärfarbe KZH:** `--zh-dunkelblau: #00407C`, `--zh-blau: #0076BD`.
- **i18n:** User-facing Strings über `t()`, dynamische Inhalte über `ml()`.
- **Design-Tokens** in `src/styles/design-tokens.css`, keine hartcodierten Hex-Farben ausser dem kleinen RSI-Palette-Set.
- **Admin-Writes** laufen via Edge Function mit Token — `sessionStorage['rsi-admin-token']` enthält den JWT-ähnlichen Token (2 h TTL).

---

## Doku-Übersicht

| Datei | Zweck |
|---|---|
| `CHANGELOG.md` | Release-Historie, SemVer-Einstufung pro Release |
| `ADMIN_HANDBUCH.md` | Admin-PIN-Rotation, Edge-Function-Deploy, Env-Vars |
| `BENUTZERHANDBUCH.md` | Inspektor-Workflow, Scoring-Logik |
| `BACKUP.md` | Supabase-DB- und Storage-Sicherung, localStorage-Export |
| `BROWSER.md` | Kompatibilitätsmatrix Quest / Desktop-Browser |
| `OFFLINE.md` | PWA-Offline-Verhalten, Service-Worker |
| `META_STORE_CHECKLIST.md` | Meta-Horizon-Store Einreichung (Phase 6) |
| `AUDIT_REPORT.md` | Vollaudit Phase 2 (2026-03-28) |
| `REVIEW_CODE.md` / `REVIEW_SECURITY.md` | Review-Findings mit Status |
| `GLOSSAR.md` | RSI-Fachbegriffe |

---

## Lizenz

Internes Tool der Fachstelle Verkehrssicherheit, Tiefbauamt, Kanton Zürich.
Nicht für die öffentliche Verbreitung bestimmt.
