# RSI VR Tool

**Road Safety Inspection – Immersive Training**
Fachstelle Verkehrssicherheit (FaSi), Tiefbauamt, Kanton Zürich

Ein browser-basiertes Trainingstool fuer die normative 9-Schritte RSI-Beurteilungsmethodik. Inspektoren ueben die Einstufung von Strassenszenen anhand von Wichtigkeit, Abweichung, Relevanz SD, NACA-Skala und Unfallrisiko — mit direktem Normenbezug (TBA FK RSI V 16.09.2020, bfu-Bericht 73, SN 641 723).

---

## Schnellstart

```bash
npm install
npm run dev
```

Oeffnet unter `http://localhost:5173`.

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | React 18 + Vite 5 + TypeScript (strict) |
| Animation | Framer Motion (motion/react v12) |
| Icons | lucide-react |
| i18n | react-i18next (de/fr/it/en) |
| Persistenz | localStorage (rsi-v3-* Keys, kein Backend) |
| PWA | vite-plugin-pwa (Service Worker, Manifest) |
| Design | ZH Corporate Design (CSS Custom Properties) |
| 3D / XR | @react-three/fiber v8 + @react-three/xr v6 (Phase 3+) |

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

### Weitere Features

- **Themen & Szenen:** 4 Topics (Fussgaenger, Velo, Knoten, Baustelle), mehrere Szenen pro Topic
- **Admin-Dashboard:** Defizit-Katalog CRUD mit automatischer Neuberechnung von Relevanz SD und Unfallrisiko
- **Rangliste:** Score-basiertes Ranking mit eigenem Eintrag hervorgehoben
- **Gamification:** Gewichtete Punkte pro Schritt (STEP_WEIGHTS × 25), max. ca. 357 Pkt. pro Defizit
- **Dark / Light Mode:** ZH Corporate Design, systemunabhaengig umschaltbar
- **Mehrsprachig:** Alle Inhalte (Topics, Szenen, Defizite) multilingual via `ml()`-Helper

---

## Projektstruktur

```
src/
├── App.tsx                     # Haupt-Router, Theme, Score-State
├── types/index.ts              # RSIDimension, NACADimension, ResultDimension, MultiLang
├── data/
│   ├── appData.ts              # localStorage CRUD, Typen, Seed-Daten
│   ├── scoringEngine.ts        # WICHTIGKEIT_TABLE (58 Kriterien), Berechnungslogik
│   └── glossary.ts             # RSI-Fachglossar (25+ Eintraege, multilingual)
├── i18n/
│   ├── de.json                 # Deutsch (Referenzsprache)
│   ├── fr.json / it.json / en.json
└── components/
    ├── LandingPage.tsx
    ├── Navbar.tsx
    ├── TopicDashboard.tsx
    ├── SceneList.tsx
    ├── ScoringFlow.tsx         # 9-Schritte-Fluss (Kernkomponente)
    ├── RankingView.tsx
    ├── AdminDashboard.tsx
    └── LanguageSwitcher.tsx
```

---

## Normative Grundlagen

| Quelle | Rolle im Tool |
|---|---|
| TBA-Fachkurs FK RSI, V 16.09.2020 | WICHTIGKEIT_TABLE (58 Kriterien), 9-Schritte-Methodik, Matrizen |
| bfu-Bericht 73 | NACA-Skala (0–7), Verletzungsschwere |
| VSS SN 641 723, Abb. 2 | Normative Unfallrisiko-Matrix |

Die Berechnungsmatrizen (calcRelevanzSD, calcUnfallrisiko) wurden gegen die Originalfolien des TBA-Fachkurses verifiziert (Audit 2026-03-28, AUDIT_REPORT.md).

---

## Deployment

### Vercel (empfohlen)

```bash
# Kein Konfig nötig
npm run build
# → dist/ wird automatisch von Vercel deployed
```

Voraussetzung: `base: '/'` in `vite.config.ts` (Standard).

### GitHub Pages

```ts
// vite.config.ts
base: '/RSI_Meta/'
```

```bash
npm run build
# dist/ manuell auf gh-pages Branch deployen
```

### Meta Quest (lokales Testen)

```bash
npm run dev
# Im selben WLAN: http://[lokale-IP]:5173
```

Meta Quest Browser unterstuetzt WebXR `immersive-vr` nativ. Fuer Desktop-Test: Chrome Extension "Immersive Web Emulator" (Meta).

---

## Build-Informationen

```
Bundle: 445 kB (137 kB gzip)
CSS:    49 kB (8.6 kB gzip)
PWA:    Service Worker + Manifest (7 precache-Eintraege)
```

---

## Entwicklungshinweise

- **Kein `ß`** — immer `ss` (Kompatibilitaet mit KZH-Vorlagen)
- **localStorage Keys** immer mit `rsi-v3-`-Prefix
- **correctAssessment** in AppDeficit muss normativ korrekt sein — `recompute()` in AdminDashboard hilft
- **Neue Kriterien** in WICHTIGKEIT_TABLE immer gegen TBA FK RSI V 16.09.2020 verifizieren
- Offene Probleme: siehe `AUDIT_REPORT.md`

---

## Lizenz

Internes Tool der Fachstelle Verkehrssicherheit, Tiefbauamt, Kanton Zürich.
Nicht fuer die oeffentliche Verbreitung bestimmt.
