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
| Framework | React + Vite + TypeScript | React 18, Vite 5, TS strict |
| Animation | Framer Motion (motion/react) | v12 |
| i18n | react-i18next | — |
| 3D Rendering | `@react-three/fiber` | v8 (Phase 3+) |
| WebXR | `@react-three/xr` | v6 (Phase 3+) |
| Icons | lucide-react | — |
| Build | Vite 5 + vite-plugin-pwa | PWA, Service Worker |
| Hosting | Vercel (Primär) / GitHub Pages | HTTPS-Pflicht fuer WebXR |
| Persistenz | localStorage (rsi-v3-* Keys) | Kein Backend |

**Target Device:** Meta Quest 3 (Meta Horizon OS, Meta Quest Browser)
**i18n-Sprachen:** de (Haupt), fr, it, en

---

## Aktuelle Projektstruktur (Phase 2 Stand)

```
RSI_Meta/
├── CLAUDE.md                       # Diese Datei
├── AUDIT_REPORT.md                 # Vollaudit Phase 2 (2026-03-28)
├── README.md                       # Installationsanleitung, Deployment
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   └── icons/                      # PWA-Icons: icon-192.png, icon-512.png
├── src/
│   ├── main.tsx                    # React-Einstieg, i18n-Init
│   ├── App.tsx                     # Haupt-Router (view-State), Theme, Score
│   ├── index.css                   # Reset + CSS-Design-Tokens (--zh-*)
│   ├── types/
│   │   └── index.ts                # RSIDimension, NACADimension, ResultDimension, MultiLang
│   ├── data/
│   │   ├── appData.ts              # localStorage CRUD, Typen, ml(), Seed-Daten
│   │   ├── scoringEngine.ts        # WICHTIGKEIT_TABLE (58), Matrizen, calcRelevanzSD/Unfallrisiko
│   │   └── glossary.ts             # RSI-Fachglossar (25+ Eintraege, multilingual)
│   ├── i18n/
│   │   ├── de.json                 # Deutsch (Referenzsprache)
│   │   ├── fr.json
│   │   ├── it.json
│   │   └── en.json
│   └── components/
│       ├── LandingPage.tsx         # Login / Username
│       ├── Navbar.tsx              # Navigation, Score-Pill, Theme-Toggle, Avatar
│       ├── TopicDashboard.tsx      # 4-spaltiges Topic-Grid (walk/bike/junction/construction)
│       ├── SceneList.tsx           # Szenen-Cards mit Defizit-Count und Start-Button
│       ├── ScoringFlow.tsx         # 9-Schritte RSI-Beurteilungsfluss + Feedback
│       ├── RankingView.tsx         # Rangliste-Tabelle mit eigenem Eintrag hervorgehoben
│       ├── AdminDashboard.tsx      # Defizit-Katalog CRUD, WICHTIGKEIT preview, Auto-Recompute
│       └── LanguageSwitcher.tsx    # Sprachauswahl (de/fr/it/en)
├── Normen_Ausbildung/              # RSI-Normen und Checklisten (PDFs, DOCX)
└── Google_Voarbeiten/              # Recherche-Materialien
```

---

## Code-Regeln

1. **Vollstaendige Dateien** liefern — kein Diff, kein Snippet, immer die ganze Datei
2. **QA-Check** vor jeder Ausgabe: Typen, Imports, JSX-Struktur, tsc 0 Fehler
3. **TypeScript strict** — kein `any`, alle Props typisiert
4. **Keine `ß`** — immer `ss`
5. **Kommentare auf Deutsch**, Code-Identifier auf Englisch
6. **Keine Emojis** ausser bei expliziter Anfrage
7. **Schweizer Zahlenformat:** `toLocaleString('de-CH')` fuer Anzeige
8. **Design-Token CSS-Variablen** fuer alle Farben (kein Hartcoding ausser RSI-spezifische Farben)
9. **localStorage-Keys** immer mit Prefix `rsi-v3-` (bestehende Keys nicht aendern)
10. **Primärfarbe KZH:** `--zh-dunkelblau: #00407C`, `--zh-blau: #0076BD`

---

## Normative Grundlagen

### RSI 9-Schritte-Methodik

Die RSI-Beurteilung im Tool folgt exakt dem TBA-Fachkurs FK RSI (V 16.09.2020):

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

58 Kriterien aus dem TBA-Fachkurs FK RSI, je mit io- und ao-Wert (RSIDimension | ''). Gespeichert in `src/data/scoringEngine.ts`. Jede Aenderung muss gegen den Fachkurs FK RSI V 16.09.2020 verifiziert werden.

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
    relevanzSD: ResultDimension    // = calcRelevanzSD(wichtigkeit, abweichung)
    naca: NacaRaw
    unfallschwere: NACADimension   // = nacaToSchwere(naca)
    unfallrisiko: ResultDimension  // = calcUnfallrisiko(relevanzSD, unfallschwere)
  }
  isPflicht: boolean
  isBooster: boolean
  normRefs: string[]
}
```

---

## Bekannte Probleme (Backlog)

| ID | Priorität | Beschreibung |
|---|---|---|
| P2-1 | Wichtig | Doppelter saveRankingEntry-Aufruf (ScoringFlow + App.tsx) |
| P2-2 | Wichtig | React-Fragment ohne key-Prop in Matrix-Subkomponente |
| P2-3 | Wichtig | onBack-Prop in AdminDashboard ungenutzt |
| P3-1 | Backlog | i18n-Schluessel in ScoringFlow vorhanden aber nicht genutzt |
| P3-4 | Backlog | calcScore() sollte in scoringEngine.ts als Pure Function stehen |

Details: `AUDIT_REPORT.md`

---

## Roadmap

### Phase 1 – Basis-Setup (abgeschlossen)
- [x] Vite + React + TypeScript Setup
- [x] `@react-three/fiber` + `@react-three/xr` v6 konfiguriert
- [x] PWA-Manifest (Bubblewrap-ready)

### Phase 2 – Browser-Training (abgeschlossen)
- [x] 9-Schritte RSI-Beurteilungsfluss (ScoringFlow)
- [x] WICHTIGKEIT_TABLE (58 Kriterien, TBA FK RSI V 16.09.2020)
- [x] Normative Matrizen (calcRelevanzSD, calcUnfallrisiko)
- [x] NACA-Einstufung mit bfu-Referenz
- [x] Admin-Dashboard (Defizit-CRUD, Auto-Recompute)
- [x] Rangliste, Themen, Szenen
- [x] i18n-Infrastruktur (de/fr/it/en), Inhalte multilingual via ml()
- [x] Dark/Light Theme, ZH Corporate Design
- [x] PWA Build (445 kB JS / 137 kB gzip)
- [x] Glossar (src/data/glossary.ts, 25+ Eintraege)
- [x] Vollaudit (AUDIT_REPORT.md, 2026-03-28)

### Phase 3 – VR-Integration (geplant)
- [ ] 360-Grad-Hintergrund / HDRI-Strassenszene
- [ ] WebXR `immersive-vr` Session (Meta Quest 3)
- [ ] Controller-Tracking, Teleport-Navigation
- [ ] Raeumliche Orientierungshilfen (Kompass, Distanz)

### Phase 4 – VR-Mangelmarkierung (geplant)
- [ ] Raycasting mit Controller
- [ ] 3D-Mangel-Marker setzen
- [ ] Floating Panel fuer Kategorisierung

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
# → http://[lokale-IP]:5173  (fuer Meta Quest im selben WLAN)

npm run build       # Production-Build (Vite + PWA)
npm run preview -- --host  # Build lokal testen
```

**Vercel:** Kein Konfig nötig, `base: '/'`.
**GitHub Pages:** `base: '/RSI_Meta/'` in `vite.config.ts` setzen.

---

## WebXR Hinweise (Phase 3+)

- `createXRStore()` immer ausserhalb der Komponente (Singleton)
- `<XR store={xrStore}>` umschliesst die gesamte R3F-Szene
- HTTPS Pflicht fuer WebXR auf echtem Geraet (localhost Ausnahme)
- Emulator: Chrome Extension "Immersive Web Emulator" (Meta)

---

## Skill

`/fasi-check` — FaSi-Qualitaetscheck fuer Visualisierungen und Texte
