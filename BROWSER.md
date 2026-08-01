# Browser-Kompatibilität – RSI VR Tool

> Stand v0.11.0. Erwartbare Unterschiede zwischen Geräten und Browsern sowie der
> Stand der Prüfungen.

---

## 1. Unterstützte Browser

### 1.1 Arbeitsplatz, ohne VR

| Browser | ab Version | Status | Anmerkung |
|---|---|---|---|
| **Chrome** | 120 | voll unterstützt | primäre Entwicklungsplattform |
| **Edge** | 120 | voll unterstützt | ebenfalls Chromium |
| **Firefox** | 115 | voll unterstützt | geprüft, keine bekannten Probleme |
| **Safari** unter macOS | 17 | voll unterstützt | WebGL-Kontext stabil |
| **Opera** | 105 | erwartet lauffähig | nicht systematisch geprüft |

### 1.2 Mobil

| Plattform | Browser | Status | Anmerkung |
|---|---|---|---|
| **iOS** | Safari 17+ | voll unterstützt | Installation über Teilen → Zum Home-Bildschirm |
| **iOS** | Chrome, Firefox | WebGL ja, Installation nein | unter iOS kann nur Safari installieren |
| **Android** | Chrome 120+ | voll unterstützt | Installation über das Browsermenü |
| **Android** | Firefox | unterstützt | Installation eingeschränkt |
| **Android** | Samsung Internet | voll unterstützt | ebenfalls Chromium |

### 1.3 VR

| Gerät | Browser | Status | Anmerkung |
|---|---|---|---|
| **Meta Quest 3** | Browser des Horizon OS | **Zielgerät** | immersive Sitzung, Controller-Tracking, protokolliert in `docs/VR_SMOKE_REPORT.md` |
| **Meta Quest 2** | Browser des Horizon OS | erwartet lauffähig | schwächere Grafikleistung, nicht geprüft |
| **Apple Vision Pro** | Safari unter visionOS | teilweise | `immersive-vr` ist dort nicht der Regelfall; die nötige Anpassung steht aus |
| **Pico 4** | Pico Browser | erwartet lauffähig | WebXR vorhanden, nicht geprüft |
| **Emulator** | Chrome-Erweiterung «Immersive Web Emulator» | Entwicklung | Arbeiten ohne Headset |

---

## 2. Funktionen im Vergleich

| Funktion | Chrome | Firefox | Safari | Quest |
|---|---|---|---|---|
| WebGL 2.0 | ja | ja | ja | ja |
| WebXR `immersive-vr` | ja, nur über HTTPS | siehe Hinweis unten | nein | ja |
| Service Worker | ja | ja | ja | ja |
| IndexedDB | ja | ja | ja | ja |
| localStorage | ja | ja | ja | ja |
| Installation als App | ja | teilweise | ja, über Safari | ja |
| `crypto.subtle.digest` | ja | ja | ja | ja |
| WebP-Texturen | ja | ja | ja | ja |
| Canvas 2D und OffscreenCanvas | ja | ja | teilweise | ja |

`[Widerspruch prüfen]` Zur Unterstützung von `immersive-vr` in Firefox auf dem
Arbeitsplatz liegt keine belastbare Quelle vor. Die frühere Angabe, WebXR sei
dort seit Firefox 98 stabil, ist nicht belegt und für den Kursbetrieb ohne
Bedeutung, weil geprüft wird auf Chrome mit Emulator und auf der Quest 3. Vor
einer Empfehlung an Teilnehmende ist der Punkt zu verifizieren.

---

## 3. Eigenheiten einzelner Umgebungen

### 3.1 Browser der Meta Quest

Der Cache des Service Workers ist hartnäckig; nach einer neuen Fassung braucht es
oft einen Neustart des Browsers. Deshalb stehen `skipWaiting`, `clientsClaim` und
`cleanupOutdatedCaches` in `vite.config.ts` alle auf aktiv.

GLTF-Modelle dürfen nicht über ein CDN geladen werden, weil das den Browser zum
Absturz bringen kann. Der XR-Store wird darum mit `model: false` initialisiert.

Die Panorama-Textur braucht `repeat.x = -1` und `offset.x = 0.75` auf der Sphäre
mit `BackSide`. Ohne diese Korrektur erscheint das Bild ausschliesslich auf der
Quest spiegelverkehrt.

### 3.2 Safari unter iOS

WebXR fehlt, ein VR-Betrieb auf iPhone und iPad ist damit ausgeschlossen; es
bleibt der gewöhnliche Browser-Modus. Der Vollbildmodus ist ohne Zutun der
nutzenden Person eingeschränkt. Der localStorage fasst rund 5 MB, was für etwa
zehn komprimierte Vorschaubilder je Gerät reicht.

### 3.3 Chrome und Edge am Arbeitsplatz

WebXR verlangt HTTPS; `localhost` ist die Ausnahme. Für die Entwicklung ohne
Headset dient die Erweiterung «Immersive Web Emulator» von Meta.

---

## 4. Geprüfte Abläufe

| Prüfung | Chrome | Firefox | Safari iPadOS | Quest 3 |
|---|---|---|---|---|
| Anmeldung und Rangliste | ja | ja | ja | ja |
| Panorama laden und drehen | ja | ja | ja | ja |
| Defizit anklicken und bewerten | ja | ja | ja | ja |
| Standort wechseln | ja | ja | ja | ja |
| Installation als App | ja | teilweise | ja | ja, über das Browsermenü |
| Betrieb ohne Netz nach Installation | teilweise | entfällt | teilweise | teilweise |
| Administrationsbereich | ja | ja | ja | ja, klein auf der Quest |
| Verortungs-Editor | ja | ja | ja | nicht vorgesehen |
| Immersive Sitzung | ja, mit Emulator | siehe Hinweis oben | entfällt | ja |

Die Prüfungen auf dem Headset sind je Version in `docs/VR_SMOKE_REPORT.md`
protokolliert.

---

## 5. Mindestanforderungen für Teilnehmende

Empfohlen sind ein Notebook oder eine Meta Quest 3, Chrome ab Version 120 oder
der Browser der Quest, eine Auflösung ab 1280 × 720 im Browser-Modus und eine
Verbindung ab 10 Mbit/s für das Laden der Panoramen.

Ausreichend sind auch ein iPad mit Safari ab Version 17, ein neueres
Android-Gerät mit Chrome oder ein Arbeitsplatzrechner mit einem aktuellen
Browser.

Nicht unterstützt sind der Internet Explorer, Chrome vor Version 90, Firefox vor
110, Safari vor 15 sowie Mobiltelefone, die älter als drei Jahre sind, weil die
Grafikleistung nicht reicht.

---

## 6. Störungsbehebung

**Das Panorama lädt nicht.** WebGL unter [get.webgl.org](https://get.webgl.org)
prüfen; bei einem Fehler den Grafiktreiber aktualisieren.

**Auf der Quest fehlt der VR-Button.** Im Browser der Quest unter Einstellungen →
Developer prüfen, ob WebXR aktiv ist.

**Die App lässt sich nicht installieren.** Dafür braucht es HTTPS. Der häufigste
Grund ist eine Adresse, die mit `http://` beginnt.

**Nach einer Aktualisierung erscheint die alte Fassung.** Browser-Cache leeren
oder in der App «App zurücksetzen» wählen.

---

## 7. Künftige Ziele

Sobald Apple WebXR unter iPadOS freischaltet, kommt die Plattform hinzu; einen
öffentlichen Zeitplan gibt es nicht. Chrome unter Android mit Cardboard hat
niedrige Priorität und ist im Schulungsbetrieb nicht vorgesehen.

*Die Kompatibilität wird vor jedem grösseren Release neu geprüft.*
