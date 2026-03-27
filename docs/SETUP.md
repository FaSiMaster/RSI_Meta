# Setup & Entwicklung – RSI VR Tool

Schritt-für-Schritt Anleitung für Entwicklung, Testing und Deployment.

---

## Voraussetzungen

| Tool | Version | Prüfen |
|------|---------|--------|
| Node.js | >= 20.x | `node --version` |
| npm | >= 10.x | `npm --version` |
| Git | >= 2.x | `git --version` |
| Chrome | aktuell | Für Desktop-Testing |
| Meta Quest 3 | Meta Horizon OS | Für VR-Testing |

---

## 1. Installation

```bash
# Repo klonen
git clone https://github.com/FaSiMaster/RSI_Meta.git
cd RSI_Meta/1RSI_Meta

# Abhängigkeiten installieren
npm install
```

---

## 2. Lokale Entwicklung

```bash
npm run dev
```

Startet:
- **Express-Server** auf `http://localhost:3000`
- **Vite HMR-Middleware** via Express
- API unter `http://localhost:3000/api/...`

Öffne `http://localhost:3000` im Browser.

---

## 3. Desktop-Testing (ohne VR-Brille)

### Chrome Immersive Web Emulator

1. Chrome öffnen → Chrome Web Store
2. Extension «**Immersive Web Emulator**» von Meta installieren
3. `http://localhost:3000` öffnen
4. DevTools öffnen (F12) → Tab «**WebXR**»
5. Device: «**Meta Quest 3**» auswählen
6. «**VR starten**» Button in der App klicken

Der Emulator simuliert:
- VR-Headset Position/Rotation
- Controller-Input (Phase 2)
- Immersive-VR Session

---

## 4. Testing auf Meta Quest 3

### Option A: Gleiches WLAN (einfachster Weg)

```bash
npm run dev
# Ausgabe im Terminal: http://192.168.x.x:3000
```

1. Meta Quest 3 ins gleiche WLAN verbinden
2. Meta Quest Browser öffnen
3. URL eingeben: `http://192.168.x.x:3000`
4. «VR starten» antippen

> **Hinweis:** HTTP funktioniert auf lokalem Netzwerk für WebXR.
> Für externe Domains ist HTTPS Pflicht.

### Option B: USB-Debugging

1. Meta Quest Developer Mode aktivieren (Meta Horizon App → Gerät → Developer Mode)
2. USB-C verbinden
3. ADB forwarding:
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
4. Im Quest Browser: `http://localhost:3000`

---

## 5. Production Build

```bash
npm run build
# Ausgabe: dist/
```

```bash
# Build lokal testen
npm run preview
# → http://localhost:4173
```

---

## 6. Deployment

### Vercel (empfohlen für WebXR)

```bash
npm install -g vercel
vercel
```

Vercel stellt automatisch HTTPS bereit → WebXR funktioniert auf echtem Gerät.

> **Achtung:** Express-Backend (`server.ts`) funktioniert nicht auf Vercel.
> Phase 2: API auf Vercel Functions portieren oder separates Backend hosten.

### GitHub Pages (nur Frontend, kein Backend)

In `vite.config.ts` ändern:
```ts
base: '/RSI_Meta/'
```

```bash
npm run build
# dist/ auf gh-pages Branch deployen (z.B. via gh-pages npm-Paket)
```

---

## 7. Versionierung (Semantic Versioning)

Format: `MAJOR.MINOR.PATCH`

| Teil | Bedeutung | Beispiel |
|------|-----------|---------|
| MAJOR | Breaking Changes | 1.0.0 → 2.0.0 |
| MINOR | Neue Features (abwärtskompatibel) | 0.1.0 → 0.2.0 |
| PATCH | Bug-Fixes | 0.1.0 → 0.1.1 |

```bash
# Git-Tag setzen nach Release
git tag -a v0.1.1 -m "Fix: isPresenting API @react-three/xr v6"
git push origin --tags
```

Alle Änderungen dokumentieren in: `CHANGELOG.md`

---

## 8. Projektstruktur

```
1RSI_Meta/
├── CHANGELOG.md              # Versionshistorie
├── package.json              # Abhängigkeiten + Scripts
├── vite.config.ts            # Build-Konfiguration + PWA
├── tsconfig.json             # TypeScript-Konfiguration
├── index.html                # HTML-Einstieg
├── server.ts                 # Express-Backend (Dev + Prod)
├── docs/
│   ├── SETUP.md              # Diese Datei
│   ├── GLOSSAR.md            # Fachbegriffe + Abkürzungen
│   └── SECURITY.md           # Sicherheitshinweise
├── public/
│   └── icons/                # PWA-Icons (192px, 512px PNG)
└── src/
    ├── main.tsx              # React-Einstieg
    ├── App.tsx               # Hauptkomponente + State + Views
    ├── SceneViewer.tsx       # 360°-Szene + WebXR-Integration
    ├── types.ts              # TypeScript-Typdefinitionen
    ├── index.css             # Tailwind v4 + Google Fonts
    └── lib/
        └── utils.ts          # cn() Hilfsfunktion
```

---

## 9. Offene Punkte (Phase 1 → Phase 2)

| Punkt | Priorität | Beschreibung |
|-------|-----------|-------------|
| Controller-Raycast | Hoch | Defizite in VR per Controller auswählen |
| HTTPS lokal | Mittel | mkcert für lokales SSL-Zertifikat |
| Admin-Auth | Hoch | JWT oder Session-basierte Authentifizierung |
| Input-Validierung | Hoch | zod-Schema für alle API-Endpunkte |
| Error-Boundary | Mittel | Fehler-Fallback statt White-Screen |
| PWA-Icons | Mittel | icon-192.png, icon-512.png erstellen |
| Echte 360°-Bilder | Hoch | FaSi-Strassenszenen fotografieren |
| Datenpersistenz | Mittel | SQLite oder JSON-Dateien statt RAM |
