# RSI VR Tool – CLAUDE.md

## Projekt

**Name:** RSI VR Tool (Road Safety Inspection – Immersive VR)
**Repo:** FaSiMaster/RSI_Meta
**Pfad:** `C:\ClaudeAI\RSI_Meta`
**Entwickler:** Stevo, Fachstelle Verkehrssicherheit (FaSi), Tiefbauamt, Kanton Zürich

**Ziel:** Inspektorinnen und Inspektoren beurteilen Strassenszenen im Browser und in VR (Meta Quest 3), markieren und dokumentieren Sicherheitsdefizite anhand der normativen 9-Schritte-RSI-Methodik. Vertrieb als PWA über den Meta Horizon Store.

---

## Tech Stack

| Schicht | Technologie | Version |
|---|---|---|
| Version | **v0.11.0** (2026-07-30) | PDF-Bericht (Phase 5), Standort-Hinweis, Kurs-exklusive Themen |
| Framework | React + Vite + TypeScript | React 18.3, **Vite 7.3**, TS strict |
| Styling | Tailwind CSS (`@tailwindcss/vite`) | v4.2 |
| Animation | Framer Motion (motion/react) | v12 |
| i18n | react-i18next / i18next | v17 / v26 |
| State | zustand | v4 |
| 3D Rendering | `@react-three/fiber` + `drei` | v8 / v9 |
| WebXR | `@react-three/xr` | v6 |
| PDF | pdfmake (dynamisch nachgeladen) | v0.3 |
| Icons | lucide-react | — |
| Build | Vite 7 + vite-plugin-pwa | v1.2, Service Worker |
| Tests | Vitest + Playwright | 85 Unit-Tests, 12 E2E-Specs |
| Hosting | Vercel (Primär) | HTTPS-Pflicht für WebXR |
| Persistenz | localStorage (`rsi-v3-*`) + **Supabase** | Postgres, Storage, 3 Edge Functions |

**Vite bleibt auf 7.x** — ab Vite 8 greift Rolldown, mit dem `vite-plugin-pwa`
nicht zusammenarbeitet.

**Target Device:** Meta Quest 3 (Meta Horizon OS, Meta Quest Browser)
**i18n-Sprachen:** de (Haupt), fr, it, en

---

## Projektstruktur

```
RSI_Meta/
├── CLAUDE.md                       # Diese Datei
├── README.md · CHANGELOG.md · GLOSSAR.md
├── ADMIN_HANDBUCH.md · BENUTZERHANDBUCH.md
├── BACKUP.md · BROWSER.md · OFFLINE.md · META_STORE_CHECKLIST.md
├── AUDIT_REPORT.md · REVIEW_CODE.md · REVIEW_SECURITY.md
├── docs/VR_SMOKE_REPORT.md         # Headset-Testprotokolle (A–J)
├── package.json · vite.config.ts · tsconfig.json · index.html
├── .github/workflows/              # CI + Supabase-Keep-Alive
├── public/
│   ├── icons/ · logo/ · textures/
│   └── impressum.html · datenschutz.html · glossar.html
├── supabase/
│   ├── functions/
│   │   ├── admin-auth/             # PIN → HMAC-Token (2 h TTL)
│   │   ├── admin-write/            # Token-geprüfte Writes (x-admin-token)
│   │   └── kurs-auth/              # Kurspasswort serverseitig (PBKDF2 + Pepper)
│   ├── migrations/                 # rsi_kurse, Passwort-Pfeffer, results.detail
│   └── keepalive.sql
├── src/
│   ├── main.tsx                    # React-Einstieg, i18n-Init, ErrorBoundary
│   ├── App.tsx                     # Haupt-Router (view-State), Theme, Score, VR-Weiche
│   ├── index.css                   # Reset + CSS-Design-Tokens (--zh-*)
│   ├── xrStore.ts                  # XR-Session Singleton (model: false!)
│   ├── types/index.ts
│   ├── data/
│   │   ├── scoringEngine.ts        # WICHTIGKEIT_TABLE (58), Matrizen (SACRED)
│   │   ├── scoreCalc.ts            # calcScore, KATEGORIE_TEILPUNKTE, HINT_ABZUG_*
│   │   ├── bestandenKriterium.ts   # Bestanden-Logik (Pflicht + 60 %)
│   │   ├── ergebnisModel.ts        # Matrix-Herleitung für Browser + VR
│   │   ├── berichtModel.ts         # Aufbereitung PDF-Bericht (rein, ohne React)
│   │   ├── appData.ts              # localStorage CRUD, Typen, ml(), Seed
│   │   ├── supabaseSync.ts         # Writes via Edge Function
│   │   ├── idGenerator.ts · topicIcons.ts · regelwerkKatalog.ts
│   │   ├── strassenmerkmale.ts
│   │   └── kriteriumLabels.ts · abweichungLabels.ts
│   ├── utils/
│   │   ├── pdfExport.ts            # pdfmake-Dokument (lazy import)
│   │   ├── sphereCoords.ts         # Sphärische Koordinaten, Trefferprüfung
│   │   └── vrHaptics.ts · vrPanelOffsets.ts
│   ├── lib/
│   │   ├── supabase.ts · supabaseStorage.ts
│   │   └── sentry.ts · logger.ts · useFocusTrap.ts · utils.ts
│   ├── styles/design-tokens.css
│   ├── i18n/                       # index.ts + de/fr/it/en (je 600 Blatt-Keys)
│   └── components/
│       ├── LandingPage.tsx · Navbar.tsx · IssiLogo.tsx
│       ├── TopicDashboard.tsx · SceneList.tsx · TrainingEinstieg.tsx
│       ├── SceneViewer.tsx         # 360°-Viewer, Klick-Flow, alle VR-Panels
│       ├── ScoringFlow.tsx · LernKarte.tsx · SzenenAbschluss.tsx
│       ├── RankingView.tsx · KategoriePanel.tsx · KlickFeedback.tsx
│       ├── FeedbackModal.tsx · LanguageSwitcher.tsx
│       ├── AdminDashboard.tsx      # Hülle; Modals ausgelagert (Sprint 3)
│       └── admin/
│           ├── BildEditor.tsx · BildUpload.tsx · AdminRanking.tsx
│           ├── modals/             # Thema, Szene, Defizit, Kurs
│           └── fields/             # ML-Inputs, NormRefPicker, Vorschaubild
└── _Archiv/                        # Lokal, nicht im Git (.gitignore)
```

---

## Code-Regeln

1. **Vollständige Dateien** liefern – kein Diff, kein Snippet, immer die ganze Datei
2. **QA-Check** vor jeder Ausgabe: Typen, Imports, JSX-Struktur, tsc 0 Fehler
3. **TypeScript strict** — kein `any`, alle Props typisiert
4. **Keine `ß`** — immer `ss` (Schweizer Hochdeutsch)
5. **Umlaute** — ä, ö, ü verwenden, nicht ae, oe, ue
6. **Kommentare auf Deutsch**, Code-Identifier auf Englisch
7. **Keine Emojis** ausser bei expliziter Anfrage
8. **Schweizer Zahlenformat:** `toLocaleString('de-CH')` für Anzeige
9. **Design-Token CSS-Variablen** für alle Farben (kein Hartcoding ausser RSI-spezifische)
10. **localStorage-Keys** immer mit Prefix `rsi-v3-` (bestehende Keys nicht ändern)
11. **Primärfarbe KZH:** `--zh-dunkelblau: #00407C`, `--zh-blau: #0076BD`
12. **i18n:** User-facing Strings über `t()`, dynamische Daten über `ml()`

---

## Normative Grundlagen

### RSI 9-Schritte-Methodik

Die RSI-Beurteilung folgt exakt dem TBA-Fachkurs FK RSI (V 16.09.2020):

| Schritt | Typ | Inhalt | Quelle |
|---|---|---|---|
| 1 | Benutzereingabe | Wichtigkeit aus WICHTIGKEIT_TABLE ablesen (io/ao) | TBA FK RSI, Folie 5 |
| 2 | Automatisch | Wichtigkeit in Relevanz-Matrix einzeichnen | TBA FK RSI, Folie 5 |
| 3 | Benutzereingabe | Abweichung beurteilen (gross/mittel/klein) | TBA FK RSI, Folie 5 |
| 4 | Automatisch | Abweichung in Relevanz-Matrix einzeichnen | TBA FK RSI, Folie 5 |
| 5 | Automatisch | Relevanz SD = calcRelevanzSD(W, A) | TBA FK RSI, Folie 5 |
| 6 | Automatisch | Relevanz SD in Unfallrisiko-Matrix einzeichnen | TBA FK RSI, Folie 6 |
| 7 | Benutzereingabe | NACA-Einstufung (0–7) | bfu-Bericht 73 |
| 8 | Automatisch | Unfallschwere in Unfallrisiko-Matrix einzeichnen | TBA FK RSI, Folie 6 |
| 9 | Automatisch | Unfallrisiko = calcUnfallrisiko(R, US) | TBA FK RSI, Folie 6 / SN 641 723 Abb. 2 |

### Matrizen (normativ)

**calcRelevanzSD** (Wichtigkeit × Abweichung):

|  | klein | mittel | gross |
|---|---|---|---|
| **gross** | gering | mittel | hoch |
| **mittel** | gering | mittel | hoch |
| **klein** | gering | gering | mittel |

**calcUnfallrisiko** (Relevanz SD × Unfallschwere):

|  | leicht | mittel | schwer |
|---|---|---|---|
| **hoch** | mittel | hoch | hoch |
| **mittel** | gering | mittel | hoch |
| **gering** | gering | gering | mittel |

### NACA → Unfallschwere

- NACA 0–1 → leicht
- NACA 2–3 → mittel
- NACA 4–7 → schwer

### WICHTIGKEIT_TABLE

58 Kriterien aus dem TBA-Fachkurs FK RSI, je mit io- und ao-Wert (RSIDimension | ''). Gespeichert in `src/data/scoringEngine.ts`. Jede Änderung muss gegen den Fachkurs FK RSI V 16.09.2020 verifiziert werden.

---

## Datenmodell (appData.ts)

### localStorage Keys (v3)

| Key | Inhalt |
|---|---|
| `rsi-v3-topics` | AppTopic[] |
| `rsi-v3-scenes` | AppScene[] |
| `rsi-v3-deficits` | AppDeficit[] |
| `rsi-v3-session` | UserSession |
| `rsi-v3-ranking` | RankingEntry[] |
| `rsi-v3-init` | 'true' (verhindert Re-Seed) |

### Kerntypen

```ts
type RSIDimension = 'gross' | 'mittel' | 'klein'
type NACADimension = 'leicht' | 'mittel' | 'schwer'
type ResultDimension = 'hoch' | 'mittel' | 'gering'
type NacaRaw = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

interface Perspektive {
  id: string
  label: string
  bildUrl: string
  startblick?: { theta: number; phi: number } | null
  standortPosition?: { theta: number; phi: number } | null  // Position im Haupt-Panorama
  navMarker?: Record<string, { theta: number; phi: number }> | null  // Navigation zu anderen Standorten
}

interface AppDeficit {
  id: string
  sceneId: string
  topicId: string
  nameI18n: MultiLang
  beschreibungI18n: MultiLang
  kriteriumId: string              // Key in WICHTIGKEIT_TABLE
  kontext: 'io' | 'ao'
  correctAssessment: {
    wichtigkeit: RSIDimension
    abweichung: RSIDimension
    relevanzSD: ResultDimension
    naca: NacaRaw
    unfallschwere: NACADimension
    unfallrisiko: ResultDimension
  }
  isPflicht: boolean
  isBooster: boolean
  normRefs: string[]
  verortung?: DefizitVerortung | null
  verortungen?: Record<string, DefizitVerortung> | null  // Pro Perspektive
}
```

---

## 360°-Panorama Technik

- **Sphere:** radius=500, `side={THREE.BackSide}`, Kamera bei `[0,0,0.01]`
- **Textur-Fix:** `repeat.x=-1` + `offset.x=0.75` – korrigiert BackSide-Spiegelung und 90°-UV-Offset
- **Startblick:** `azimuth = -(theta * PI/180)` (OrbitControls-Konvention), rAF-Retry bei Mount
- **Perspektiven:** Kein Fallback auf Haupt-Verortung bei aktiver Perspektive
- **Gefundene Defizite:** Grüner Hotspot-Marker immer sichtbar (auch ohne Hints, über alle Perspektiven)
- **Standort-Navigation:** Bidirektional via standortPosition + navMarker
- **XR-Store:** `model: false` – Pflicht (verhindert CDN-GLTF-Download-Crash)

---

## Roadmap

### Phase 1 – Basis-Setup (abgeschlossen)
- [x] Vite + React + TypeScript Setup
- [x] `@react-three/fiber` + `@react-three/xr` v6 konfiguriert
- [x] PWA-Manifest (Bubblewrap-ready)

### Phase 2 – Browser-Training (abgeschlossen, v0.3.1)
- [x] 9-Schritte RSI-Beurteilungsfluss (ScoringFlow)
- [x] Klick-Bestätigung, Bewertungs-Overlays
- [x] Perspektiven, Standort-Navigation (bidirektional)
- [x] Best-of Punktesystem, Sterne, Zeiterfassung
- [x] 4-Ebenen-Ranking, ESC-Taste
- [x] Admin-Dashboard (Defizit-CRUD, BildEditor mit Drag&Drop)
- [x] i18n (de/fr/it/en) 100%, alle Labels via t()
- [x] Dark/Light Theme, ZH Corporate Design
- [x] Panorama-Textur Spiegelung korrigiert
- [x] App-Reset (SW + Cache + localStorage)
- [x] Avatar-Popover (Abmelden, Reset)
- [x] Schritt-Anleitung + RSI-Methodik-Karte (TopicDashboard)
- [x] Startbutton-Validierung (Name-Pflichtfeld)
- [x] Startblick-Fix (Race-Condition, rAF-Retry)
- [x] Gefundene Defizite grün markiert (alle Perspektiven)
- [x] Szenen-Vorschaubild in SceneList
- [x] Strassenmerkmale-Dropdown-Katalog (Funktionalität)
- [x] Umlaute in Kriterium-Labels (kriteriumLabels.ts)
- [x] Themen-Sortierung im Admin funktional

### Phase 3 – VR-Integration (abgeschlossen, v0.8.0–v0.9.1)
- [x] WebXR `immersive-vr` Session (Meta Quest 3)
- [x] Controller-Tracking, Ray-Reticle, Haptik bei Treffern
- [x] Standort-Wechsel über Diamant-Marker im Bild
- [x] Verschiebbare VR-Panels mit persistierter Position (v0.9.0)
- [x] Session-Lifecycle sauber (`session.end()` bei Szenenende)
- [ ] Eigene 360°-Strassenszenen (Insta360 / Ricoh Theta) — offen, Feldarbeit

### Phase 4 – VR-Mangelmarkierung (abgeschlossen, v0.8.1–v0.9.1)
- [x] Raycasting mit Controller
- [x] Marker setzen mit Bestätigungsschritt
- [x] Panels für Kategorie und die drei Bewertungsschritte
- [x] Scoring-Summary in VR: Ergebnis, Matrix-Herleitung, Lernkarte

### Phase 5 – Dokumentation & Export (v0.11.0, teilweise)
- [x] PDF-Export (RSI-konform, KZH CD) — Auswertung + Befundliste, pdfmake
      lazy geladen; Teilnehmer, Admin je Kurs, Admin je Einzelresultat
- [ ] Session-Review im Browser

### Phase 6 – Meta Horizon Store (geplant)
- [ ] Bubblewrap-Konfiguration
- [ ] Store-Listing, Asset Pack
- [ ] Meta Horizon Store Einreichung

---

## Lokale Entwicklung

```bash
npm install
npm run dev
# → http://localhost:5173
# → http://[lokale-IP]:5173  (für Meta Quest im selben WLAN)

npm run build       # Production-Build (Vite + PWA)
npm run preview -- --host  # Build lokal testen
```

**Vercel:** Kein Konfig nötig, `base: '/'`.

---

## WebXR Hinweise (Phase 3+)

- `createXRStore()` immer ausserhalb der Komponente (Singleton)
- `<XR store={xrStore}>` umschliesst die gesamte R3F-Szene
- HTTPS Pflicht für WebXR auf echtem Gerät (localhost Ausnahme)
- Emulator: Chrome Extension "Immersive Web Emulator" (Meta)

---

## Skill

`/fasi-check` — FaSi-Qualitätscheck für Visualisierungen und Texte

---

*Letzte Aktualisierung: 2026-08-01 (v0.11.0, Doku-Redaktion)*
