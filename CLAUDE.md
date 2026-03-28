# RSI VR Tool – CLAUDE.md

## Projekt

**Name:** RSI VR Tool (Road Safety Inspection – Immersive VR)
**Repo:** FaSiMaster/RSI_Meta
**Pfad:** `C:\ClaudeAI\RSI_Meta`
**Entwickler:** Stevo, Fachstelle Verkehrssicherheit (FaSi), Tiefbauamt, Kanton Zürich

**Ziel:** Ein Inspektor begeht Strassenszenen in VR (Meta Quest 3), markiert und dokumentiert
Mängel direkt im immersiven Raum. Vertrieb als PWA über den Meta Horizon Store.

---

## Tech Stack

| Schicht | Technologie | Entscheidung |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | Bekannt von FaSi_Tools / GNP_Tool |
| 3D Rendering | `@react-three/fiber` v8 | Deklaratives Three.js in React |
| WebXR | `@react-three/xr` v6 | Neue `createXRStore`-API, stabile Meta-Unterstützung |
| Build | Vite 5 | HMR, PWA-Plugin, schnelle Builds |
| PWA | `vite-plugin-pwa` | Benötigt für Bubblewrap / Horizon Store |
| Hosting | Vercel (Primär) / GitHub Pages | HTTPS-Pflicht für WebXR |
| Testing | Chrome "Immersive Web Emulator" (Meta) | Desktop-Test ohne Brille |

**WebXR API:** `immersive-vr` Session (Phase 1), `immersive-ar` Passthrough (Phase 3)
**Target Device:** Meta Quest 3 (Meta Horizon OS, Meta Quest Browser)

---

## Projektstruktur

```
RSI_Meta/
├── CLAUDE.md                   # Diese Datei
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── index.html
├── public/
│   └── icons/                  # PWA-Icons: icon-192.png, icon-512.png
├── src/
│   ├── main.tsx                # React-Einstieg
│   ├── App.tsx                 # XR Store + Canvas Setup
│   ├── index.css               # Reset + Body-Styles
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── Scene.tsx           # Beleuchtung, XROrigin, Szene-Komposition
│   │   ├── Room.tsx            # Raum-Geometrie (Boden, Wände, Decke)
│   │   └── VRButton.tsx        # VR-Einstieg UI mit WebXR-Verfügbarkeitscheck
│   ├── hooks/                  # Custom Hooks (useXRController, useMangel, ...)
│   └── types/                  # TypeScript-Typen (Mangel, Szene, ...)
├── Normen_Ausbildung/          # RSI-Normen und Checklisten (PDFs, DOCX)
└── Google_Voarbeiten/          # Recherche-Materialien
```

---

## Code-Regeln

1. **Vollständige Dateien** liefern — kein Diff, kein Snippet, immer die ganze Datei
2. **QA-Check** vor jeder Ausgabe: Typen, Imports, JSX-Struktur, WebXR-Kompatibilität
3. **TypeScript strict** — kein `any`, alle Props typisiert
4. **XRStore-Typ:** `ReturnType<typeof createXRStore>` (sicher unabhängig von exportierten Typen)
5. **Schweizer Zahlenformat:** Apostroph als Tausendertrennzeichen (`1'234'567`)
6. **Design-Referenz:** https://github.com/FaSiMaster/FaSi_VIZ.git (KZH Corporate Design)
7. **Primärfarbe KZH:** `#003C71` (Blau Kanton Zürich)
8. Keine `ß` — immer `ss`
9. Kommentare auf Deutsch, Code-Identifier auf Englisch

---

## WebXR Hinweise

- **`createXRStore()`** immer ausserhalb der Komponente definieren (Singleton)
- **`<XR store={xrStore}>`** umschliesst die gesamte R3F-Szene
- **`<XROrigin>`** setzt die VR-Startposition im Raum
- **HTTPS Pflicht** für WebXR auf echtem Gerät (localhost ist Ausnahme)
- Meta Quest Browser: WebXR `immersive-vr` nativ unterstützt
- Emulator: Chrome Extension "Immersive Web Emulator" → aktiviert WebXR auf Desktop

---

## Roadmap

### Phase 1 – Basis VR-Szene (aktuell)
- [x] Vite + React + TypeScript Setup
- [x] `@react-three/fiber` + `@react-three/xr` v6 konfiguriert
- [x] Einfache Szene: Raum mit Boden / Wänden
- [x] VR-Session startbar (Meta Quest Browser + Emulator)
- [x] PWA-Manifest (Bubblewrap-ready)
- [ ] PWA-Icons erstellen (192×192, 512×512 PNG)
- [ ] Deployment auf Vercel (HTTPS)
- [ ] Test auf Meta Quest 3

### Phase 2 – Strassenszene + Navigation
- [ ] 360°-Hintergrund / HDRI-Strassenszene laden
- [ ] Controller-Tracking (Meta Quest Touch Pro)
- [ ] Teleport-Navigation auf der Strasse
- [ ] Räumliche Orientierungshilfen (Kompass, Distanzanzeige)

### Phase 3 – Mangelmarkierung
- [ ] Raycasting mit Controller für Mangelauswahl
- [ ] Mangel-Marker setzen (3D-Pin in VR)
- [ ] Mangelkategorien nach RSI-Norm (Typ, Schwere, Bereich)
- [ ] Mangelformular in VR (Floating Panel)

### Phase 4 – Dokumentation & Export
- [ ] Mangelprotokoll als JSON speichern
- [ ] PDF-Export (RSI-konformes Format, KZH CD)
- [ ] Session-Review im Browser (nach VR-Begehung)

### Phase 5 – Meta Horizon Store
- [ ] Bubblewrap-Konfiguration (TWA-Wrapper)
- [ ] Asset Pack (Icons, Screenshots, Store-Listing)
- [ ] Meta Horizon Store Einreichung

---

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Dev-Server starten (Netzwerk-Zugang für Meta Quest im selben WLAN)
npm run dev
# → http://localhost:5173
# → http://[lokale-IP]:5173  (für Meta Quest)

# Production Build
npm run build

# Build-Preview
npm run preview --host
```

**GitHub Pages Deployment:**
In `vite.config.ts` → `base: '/RSI_Meta/'` setzen, dann:
```bash
npm run build
# dist/ auf gh-pages Branch deployen
```

**Vercel:** Kein Konfig nötig, `base: '/'` bleibt bestehen.

---

## Skill

`/fasi-check` — FaSi-Qualitätscheck für Visualisierungen und Texte
