# Browser-Kompatibilitäts-Matrix — RSI VR Tool

> Stand v0.3.0. Zu erwartende Unterschiede zwischen Geräten / Browsern und dokumentierte Tests.

---

## 1. Unterstützte Browser

### 1.1 Desktop (Browser-Modus ohne VR)

| Browser | Minimalversion | Status | Anmerkung |
|---|---|---|---|
| **Chrome** (Chromium) | 120+ | voll unterstützt | primäre Entwicklungsplattform |
| **Edge** | 120+ | voll unterstützt | Chromium-basiert |
| **Firefox** | 115+ | voll unterstützt | getestet, keine bekannten Probleme |
| **Safari** (macOS) | 17+ | voll unterstützt | WebGL-Kontext stabil |
| **Opera** | 105+ | erwartet OK | nicht systematisch getestet |

### 1.2 Mobile

| Plattform | Browser | Status | Anmerkung |
|---|---|---|---|
| **iOS** | Safari 17+ | voll unterstützt | PWA installierbar (Teilen → Zum Home-Bildschirm) |
| **iOS** | Chrome/Firefox | WebGL ja, PWA-Install nein | iOS-Policy: nur Safari kann installieren |
| **Android** | Chrome 120+ | voll unterstützt | PWA-Installation via "Add to Home Screen" |
| **Android** | Firefox | unterstützt | PWA eingeschränkt |
| **Android** | Samsung Internet | voll unterstützt | Chromium-basiert |

### 1.3 VR (WebXR)

| Gerät | Browser | Status | Anmerkung |
|---|---|---|---|
| **Meta Quest 3** | Meta Horizon OS Browser | **primäres Zielgerät** | WebXR `immersive-vr` Session, Controller-Tracking |
| **Meta Quest 2** | Meta Horizon OS Browser | erwartet OK | niedrigere GPU-Leistung, bisher nicht getestet |
| **Apple Vision Pro** | Safari VisionOS | teilweise | `immersive-vr` nicht standardmässig — `immersive-ar` nötig, Anpassung offen |
| **Pico 4** | Pico Browser | erwartet OK | WebXR unterstützt, nicht getestet |
| **Browser-Emulator** | Chrome "Immersive Web Emulator" | **Dev-Modus** | für Entwicklung ohne Headset |

---

## 2. Feature-Matrix

| Feature | Chrome | Firefox | Safari | Quest Browser |
|---|---|---|---|---|
| WebGL 2.0 | ✓ | ✓ | ✓ | ✓ |
| WebXR `immersive-vr` | ✓ (nur HTTPS) | ✓ | — | ✓ |
| Service Worker | ✓ | ✓ | ✓ | ✓ |
| IndexedDB | ✓ | ✓ | ✓ | ✓ |
| localStorage | ✓ | ✓ | ✓ | ✓ |
| PWA Install | ✓ | teilweise | ✓ (iOS Safari) | ✓ |
| `crypto.subtle.digest` (SHA-256) | ✓ | ✓ | ✓ | ✓ |
| WebP-Texturen | ✓ | ✓ | ✓ | ✓ |
| Canvas 2D / OffscreenCanvas | ✓ | ✓ | teilweise | ✓ |

---

## 3. Bekannte Eigenheiten

### 3.1 Meta Quest Browser
- **Service-Worker-Cache** ist aggressiv — ein Update braucht oft einen Browser-Neustart. Deshalb: `skipWaiting: true` + `clientsClaim: true` in `vite.config.ts` und `cleanupOutdatedCaches: true`.
- **GLTF-Modelle dürfen nicht per CDN geladen werden** (Crash-Risiko) → `xrStore` wird mit `model: false` initialisiert.
- **Panorama-Textur-Spiegelung:** `repeat.x = -1` + `offset.x = 0.75` auf `@react-three/fiber` BackSide-Sphere, sonst spiegelverkehrte Anzeige nur im Quest Browser.

### 3.2 iOS Safari
- **WebXR nicht unterstützt** — VR-Modus auf iPhone/iPad nicht möglich. Nur Browser-Modus.
- **`fullscreen` API eingeschränkt** — kein echter Vollbildmodus ohne User-Interaktion.
- **localStorage-Limit:** ca. 5 MB — grosse Panorama-Vorschaubilder gehen, aber mehr als ~10 komprimierte Bilder pro Gerät ist knapp.

### 3.3 Chrome/Edge Desktop
- **WebXR nur mit HTTPS** — localhost ist Ausnahme
- **DevTools WebXR-Emulator** (Chrome Extension "Immersive Web Emulator" von Meta) erlaubt Dev ohne Headset

### 3.4 Firefox Desktop
- WebXR seit Firefox 98 stabil, aber langsamere Performance bei grossen Panoramen gegenüber Chrome

---

## 4. Getestete Szenarien

| Test | Chrome Desktop | Firefox Desktop | Safari iPadOS | Quest 3 Browser |
|---|---|---|---|---|
| Login + Rangliste | ✓ | ✓ | ✓ | ✓ |
| 360°-Panorama laden + Orbit | ✓ | ✓ | ✓ | ✓ |
| Defizit-Klick + Bewertungsflow | ✓ | ✓ | ✓ | ✓ |
| Perspektiven-Wechsel via Diamant | ✓ | ✓ | ✓ | ✓ |
| PWA Installation | ✓ | teilweise | ✓ | ✓ (via 3-Punkte-Menü) |
| Offline nach Install | teilweise | n/a | teilweise | teilweise |
| Admin-Dashboard | ✓ | ✓ | ✓ | ✓ (klein auf Quest) |
| BildEditor (Canvas + Zoom + Pan) | ✓ | ✓ | ✓ | nicht relevant |
| WebXR VR-Session | ✓ (mit Emulator) | ✓ (mit Emulator) | n/a | ✓ |

---

## 5. Minimalanforderungen für Kursteilnehmer

### 5.1 Empfohlen
- **Gerät:** Notebook/Desktop oder Meta Quest 3
- **Browser:** Chrome 120+ oder Quest Browser
- **Bildschirm:** mindestens 1280×720 (Browser-Modus)
- **Netz:** mind. 10 Mbit/s für Panorama-Laden

### 5.2 Akzeptabel
- iPad mit Safari 17+
- Neueres Android-Smartphone mit Chrome
- Desktop-PC mit beliebigem aktuellen Browser

### 5.3 Nicht unterstützt
- Internet Explorer (alle Versionen)
- Chrome < 90, Firefox < 110, Safari < 15
- Handys älter als 3 Jahre (WebGL-Performance zu gering)

---

## 6. Troubleshooting

**Panorama lädt nicht.**
→ WebGL prüfen unter [get.webgl.org](https://get.webgl.org). Falls Fehler: Grafikkartentreiber aktualisieren.

**VR-Button erscheint nicht auf dem Quest.**
→ WebXR-Flag im Quest Browser aktiv? Einstellungen → Developer → WebXR aktiviert.

**PWA kann nicht installiert werden.**
→ HTTPS nötig. Adressleiste prüfen, "http://" statt "https://" ist der häufigste Grund.

**Nach Update sehe ich noch alte Version.**
→ Browser-Cache leeren, oder in der App Footer → "App zurücksetzen".

---

## 7. Zukünftige Browser-Targets

- **iPadOS WebXR (sobald Apple freischaltet)** — aktuell kein öffentlicher Zeitplan
- **Chrome Android mit Cardboard** — niedrige Priorität, nicht im Schulungs-Setup

*Browser-Kompatibilität wird vor jedem Major-Release neu validiert.*
