# RSI VR Tool – CLAUDE.md

## Projekt

**Name:** RSI VR Tool (Road Safety Inspection – Immersive VR)
**Repo:** FaSiMaster/RSI_Meta
**Pfad:** `C:\ClaudeAI\RSI_Meta`
**Entwickler:** Stevo, Fachstelle Verkehrssicherheit (FaSi), Tiefbauamt, Kanton Zürich

**Ziel:** Ein Inspektor beurteilt Strassenszenen im Browser (Phase 2) und später in VR (Meta Quest 3), markiert und dokumentiert Sicherheitsdefizite anhand der normativen 9-Schritte-RSI-Methodik. Vertrieb als PWA über den Meta Horizon Store.

---

## Tech Stack

| Schicht | Technologie | Version |
|---|---|---|
| Version | **v0.5.0** (2026-04-20) | Beta-Polishing-Sprint, 16 Commits seit v0.4.0 |
| Framework | React + Vite + TypeScript | React 18, Vite 5, TS strict |
| Animation | Framer Motion (motion/react) | v12 |
| i18n | react-i18next | — |
| 3D Rendering | `@react-three/fiber` | v8 |
| WebXR | `@react-three/xr` | v6 |
| Icons | lucide-react | — |
| Build | Vite 5 + vite-plugin-pwa | PWA, Service Worker |
| Hosting | Vercel (Primär) | HTTPS-Pflicht für WebXR |
| Persistenz | localStorage (rsi-v3-* Keys) | Kein Backend |

**Target Device:** Meta Quest 3 (Meta Horizon OS, Meta Quest Browser)
**i18n-Sprachen:** de (Haupt), fr, it, en

---

## Projektstruktur

```
RSI_Meta/
├── CLAUDE.md                       # Diese Datei
├── AUDIT_REPORT.md                 # Vollaudit Phase 2 (2026-03-28)
├── README.md                       # Installationsanleitung, Deployment
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── public/
│   ├── icons/                      # PWA-Icons: icon-192.png, icon-512.png
│   └── textures/                   # 11 Panorama-Texturen (WebP/JPG)
├── src/
│   ├── main.tsx                    # React-Einstieg, i18n-Init
│   ├── App.tsx                     # Haupt-Router (view-State), Theme, Score
│   ├── index.css                   # Reset + CSS-Design-Tokens (--zh-*)
│   ├── xrStore.ts                  # XR-Session Singleton (createXRStore)
│   ├── types/
│   │   └── index.ts                # RSIDimension, NACADimension, ResultDimension, MultiLang
│   ├── data/
│   │   ├── appData.ts              # localStorage CRUD, Typen, ml(), Seed-Daten, Perspektive
│   │   ├── scoringEngine.ts        # WICHTIGKEIT_TABLE (58), Matrizen (SACRED)
│   │   ├── scoreCalc.ts            # calcScore Pure Function
│   │   ├── kriteriumLabels.ts      # Anzeige-Labels mit Umlauten (aus scoringEngine ausgelagert)
│   │   └── strassenmerkmale.ts     # Dropdown-Katalog Strassenmerkmale (Funktionalität)
│   ├── utils/
│   │   └── sphereCoords.ts         # Sphärische Koordinaten, Trefferpruefung
│   ├── lib/
│   │   └── utils.ts                # Hilfsfunktionen
│   ├── styles/
│   │   └── design-tokens.css       # CSS-Variablen
│   ├── i18n/
│   │   ├── index.ts                # i18n-Setup
│   │   ├── de.json                 # Deutsch (Referenzsprache, ~460 Keys)
│   │   ├── fr.json                 # Französisch (100%)
│   │   ├── it.json                 # Italienisch (100%)
│   │   └── en.json                 # Englisch (100%)
│   └── components/
│       ├── LandingPage.tsx         # Login, Validierung, App-Reset
│       ├── Navbar.tsx              # Navigation, Score-Pill, Avatar-Popover, Logout
│       ├── TopicDashboard.tsx      # Topic-Grid + Schritt-Anleitung + RSI-Methodik
│       ├── SceneList.tsx           # Szenen-Cards mit Sterne und Start-Button
│       ├── TrainingEinstieg.tsx    # Szenen-Einführung vor dem Viewer
│       ├── SceneViewer.tsx         # 360°-Viewer, Klick-Flow, Standort-Navigation, VR
│       ├── ScoringFlow.tsx         # Ergebnis-Screen nach Bewertung
│       ├── SzenenAbschluss.tsx     # Szenen-Statistik, Best-of, Zeit
│       ├── RankingView.tsx         # 4-Ebenen-Rangliste
│       ├── AdminDashboard.tsx      # Defizit-CRUD, WICHTIGKEIT, Auto-Recompute
│       ├── LanguageSwitcher.tsx    # Sprachauswahl (de/fr/it/en)
│       ├── KategoriePanel.tsx      # Kategorie-Auswahl (Browser + VR)
│       ├── KlickFeedback.tsx       # Treffer/Fehlschlag-Anzeige
│       └── admin/
│           ├── BildEditor.tsx      # Canvas-Verortungs-Editor, Drag&Drop, Standorte, NavMarker
│           └── BildUpload.tsx      # Panorama-Upload mit Komprimierung
└── _Archiv/                        # Lokal, nicht im Git (.gitignore)
    ├── Google_Voarbeiten/          # Altes Gemini-API-Projekt
    ├── Normen_Ausbildung/          # RSI-Normen PDFs (Referenz)
    ├── Export/                     # Daten-Dumps
    ├── Bilder_Seite/               # Screenshots + HDR-Quelldateien
    └── dead_code/                  # glossary.ts, static.ts, VRButton.tsx
```

---

## Code-Regeln

1. **Vollständige Dateien** liefern — kein Diff, kein Snippet, immer die ganze Datei
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
- **Textur-Fix:** `repeat.x=-1` + `offset.x=0.75` — korrigiert BackSide-Spiegelung und 90°-UV-Offset
- **Startblick:** `azimuth = -(theta * PI/180)` (OrbitControls-Konvention), rAF-Retry bei Mount
- **Perspektiven:** Kein Fallback auf Haupt-Verortung bei aktiver Perspektive
- **Gefundene Defizite:** Grüner Hotspot-Marker immer sichtbar (auch ohne Hints, über alle Perspektiven)
- **Standort-Navigation:** Bidirektional via standortPosition + navMarker
- **XR-Store:** `model: false` — Pflicht (verhindert CDN-GLTF-Download-Crash)

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

### Phase 3 – VR-Integration (nächster Schritt)
- [ ] Eigene 360°-Strassenszenen (Insta360 / Ricoh Theta)
- [ ] WebXR `immersive-vr` Session (Meta Quest 3)
- [ ] Controller-Tracking, Teleport-Navigation
- [ ] Räumliche Orientierungshilfen (Kompass, Distanz)

### Phase 4 – VR-Mangelmarkierung (geplant)
- [ ] Raycasting mit Controller
- [ ] 3D-Mangel-Marker setzen
- [ ] Floating Panel für Kategorisierung

### Phase 5 – Dokumentation & Export (geplant)
- [ ] PDF-Export (RSI-konform, KZH CD)
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

*Letzte Aktualisierung: 2026-04-20 (v0.5.0)*
