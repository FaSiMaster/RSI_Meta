# VR-Smoke-Report — Meta Quest 3 (v0.8.0)

> Stand nach Phase-3-Code-Inventar 2026-04-24.
>
> Dieser Report ist die **Bestandsaufnahme** des WebXR-Flows vor dem
> v0.8.0-Sprint. Die tatsaechliche physische Validierung auf dem Meta Quest 3
> macht Stevo — Claude kann keinen Headset-Test ausfuehren.

---

## 1. Was bereits implementiert ist

Der VR-Flow in `src/components/SceneViewer.tsx` ist deutlich reifer als die
`CLAUDE.md`-Roadmap suggeriert. Folgende Komponenten sind **da und sollten
funktionieren**:

### Session-Management
- `xrStore` als Modul-Singleton (`src/xrStore.ts`) mit
  `controller: { model: false, rayPointer: true, grabPointer: false, teleportPointer: false }`.
  Controller-GLTF wird nicht geladen (verhindert CDN-Crash). Ray-Pointer
  fuer `onClick` auf Meshes ist an.
- `<XR store={xrStore}>`-Wrapper um die R3F-Szene (Z. 1104).
- `xrStore.enterVR()`-Button im Browser-UI (Z. 1210, Glasses-Icon).
- `useXR(s => s.session)`-Hook erkennt aktive Session ohne State-Delay
  (Z. 547).
- ESC im Browser beendet die VR-Session via `session.end()` (Z. 891).

### VR-UI-Komponenten
Alle schweben im Weltraum (`VRHud` positioniert einmalig bei Mount in
Blickrichtung + Offset, danach `Billboard`-basiert zur Kamera rotiert —
**keine** Head-Lock-Bindung, das Panel bleibt an seiner ersten Position).

| Komponente | Funktion | Zeile |
|---|---|---|
| `VRProgressPanel` | Scene-Name, Kontext (innerorts/ausserorts), Found/Total-Dots | 283 |
| `VRControlBar` | Buttons "Hinweis" + "Szene beenden" | 328 |
| `VRKategoriePanel` | 7 Kategorien + "Abbrechen" fuer Schritt 0 (Kategorisierung) | 373 |
| `VRFeedback` | Treffer/Miss-Overlays mit 1.5-2 s Auto-Close | 438 |
| `VRAllFound` | Erfolgs-Banner wenn alle Defizite gefunden | 471 |
| `VRButton` | Generischer Button (Plane + Text) mit Hover-State | 237 |
| `VRHud` | Generisches Host-Panel (Position-Fix + Billboard) | 199 |
| `VRErrorBoundary` | Faengt Panel-Render-Fehler ab, crasht Scene nicht | 43 |

### Interaktion
- **Panorama-Sphere-Klick**: via `<mesh onClick={onSphereClick}>`
  (Z. 61) → mit `rayPointer: true` im VR funktioniert das via Controller-
  Trigger.
- **Hotspot-Klick** (gruene Ringe): nicht klickbar, nur visuell.
- **StandortNavMarker-Klick** (blauer Diamant): `onClick` auf innerem
  Mesh (Z. 138) mit `e.stopPropagation()`. Sollte in VR via Controller-
  Ray ausgeloest werden — **zu verifizieren** (siehe §3.1).
- **VR-Button-Klick**: `onClick` + `onPointerOver/Out` fuer Hover-Feedback.

### Mode-Switching
- `handleVRModeChange` (Z. 909) reagiert auf Session-Ende: wenn der User
  mitten in einem Bewertungsschritt war, faellt die Scene zurueck auf
  `exploring`. Verhindert hang States nach VR-Exit.
- `OrbitControls` ist in VR deaktiviert (`enabled={!isInXR}`, Z. 590) —
  die Kopfbewegung des Headsets uebernimmt die Kamera.

---

## 2. Was bewusst NICHT fuer v0.8.0 geplant ist

Zur Klarheit (nach Scope-Entscheidung mit Stevo):

- **Teleport-Navigation** — `teleportPointer: false` bleibt. Im 360°-
  Panorama ergibt Teleport keinen Sinn (User sitzt im Zentrum der Sphere,
  Standort-Wechsel erfolgt ueber `StandortNavMarker`).
- **Kompass / Nord-Indikator** — braucht Panorama-Norden pro Szene (EXIF
  oder Admin-UI-Erweiterung). Content-Pflege-Aufwand zu hoch fuer
  unklaren Mehrwert im Pilot.
- **Distanz-Indikator** — in 360°-Panorama gibt es keine echten
  Raumkoordinaten. Technisch moeglich nur als Winkel-Differenz, Nutzen
  gering.
- **Audio-Cues** — Idee fuer v0.9.0, braucht Sound-Assets.
- **Head-Reset-Button** — Idee fuer v0.9.0, braucht XR-Reference-Space-
  Handling.

---

## 3. Offene Punkte fuer v0.8.0

### 3.1 Standort-Navigation in VR **verifizieren**
**Situation:** `StandortNavMarker` hat `onClick` auf dem inneren Mesh
(Z. 138). Mit `rayPointer: true` im xrStore wuerde der Controller-Trigger
auf Meshes `onClick` ausloesen — theoretisch identisch zum Maus-Klick.

**Smoke-Test-Frage:** Klappt der Standort-Wechsel im VR-Modus? Der
Controller muss den Diamanten anvisieren (Ray-Punkt muss auf Diamant
liegen) und der Trigger ausgeloest werden.

**Moegliche Fehlerbilder:**
- Ray-Punkt geht durch den Diamanten hindurch und trifft die
  Panorama-Sphere dahinter → onClick feuert auf Sphere statt Marker.
  **Ursache:** `depthTest={false}` auf dem Panorama-Material wuerde
  dem Ray die Distanz-Priorisierung entziehen. **Check**:
  `PanoramaSphere` hat KEIN `depthTest={false}` (Z. 83), also sollte
  das passen.
- `e.stopPropagation()` im onClick-Handler (Z. 138) verhindert
  Sphere-Trigger wenn Marker zuerst getroffen — **korrekt so**.

**Aktion wenn Bug:** `renderOrder`-Hierarchie setzen, ggf. Marker vor
Sphere via `renderOrder={1}` oder pointer-events explizit priorisieren.

### 3.2 Haptisches Feedback (Controller-Rumble) — **NEU**
**Situation:** Aktuell kein Haptik-Code. Bei Treffer/Miss gibt's nur
visuelles + (kuenftig) auditives Feedback.

**Implementation:** WebXR `XRInputSource.gamepad.hapticActuators[0].pulse(
intensity, durationMs)`. Intensity 0-1, Dauer in ms.

**Design:**
- Treffer (richtig): kurzer starker Puls (intensity 0.8, 80 ms).
- Kein-Treffer / Miss: weicherer doppelter Puls (0.4, 60 ms, 100 ms pause,
  0.4, 60 ms).
- Bereits-gefunden: mittlerer Puls (0.6, 120 ms).
- Falsche Kategorie: wie Treffer (findet ist ja positiv).

**Quelle fuer Controller:** `useXR(s => s.inputSourceStates)` oder
`state.controller` via `useController` aus `@react-three/xr`. Rumble
laeuft **beiderseitig** (links + rechts) damit der User den Effekt
unabhaengig von der klickenden Hand spuert.

### 3.3 Floating-HUD erweitern um Zeit
**Situation:** `VRProgressPanel` zeigt Scene-Name, Kontext, Found/Total-
Dots — keine Zeit.

**Aktion:** Timer-Prop in VRProgressPanel hinzufuegen, im SceneViewer aus
`sceneStartTime` berechnet (wird bereits in App.tsx gesetzt, Z. 156).
Format `MM:SS`, aktualisiert im `useFrame` oder via 1-s-Intervall.

### 3.4 Farb-codierte Standort-Marker
**Situation:** `StandortNavMarker` ist immer blau (#0076BD) mit Hover
auf leicht anderer Opacity. Keine Unterscheidung "besucht" vs
"unbesucht".

**Aktion:**
- SceneViewer-State `visitedPerspektiven: Set<string | null>` (null =
  Haupt-Panorama).
- Bei jedem `onStandortWechsel` den Ziel-Identifier reinadden.
- Marker bekommt Prop `status: 'aktiv' | 'besucht' | 'unbesucht'`,
  Farbe dazu:
  - aktiv — `#0076BD` (wie jetzt)
  - besucht — `#1A7F1F` (gruen, konsistent mit Hotspot-Found)
  - unbesucht — `#d7d7d7` (neutral)
- "aktiv" ist der Marker der die aktuelle Perspektive repraesentiert
  — falls sie im Panel sichtbar ist (Perspektive → Haupt-Marker etc).

### 3.5 Dokumentation dieses Reports pflegen
Nach Sprint-Abschluss: "Ergebnis Smoke-Test"-Abschnitt mit Stevos
Beobachtungen vom Headset unten anhaengen.

---

## 4. Test-Protokoll fuer physischen Smoke-Test (Stevo)

Checkliste durchgehen nach dem v0.8.0-Deploy auf Vercel. Bei jedem Punkt
**OK / KO / weiss nicht** notieren, bei KO bitte mit Foto/Bildschirm-
Screenshot zurueckmelden.

### A. Session-Start
- [ ] Meta Quest Browser auf `https://rsi-meta.vercel.app` laedt sauber.
- [ ] Landing-Login, Topic waehlen, Szene oeffnen, Einstieg bestaetigen.
- [ ] Im Viewer: Glasses-Button (VR) klicken.
- [ ] Permission-Prompt "Immersive VR starten?" erscheint.
- [ ] Nach Akzeptieren: Panorama fuellt die Ansicht, Kopfbewegung
      dreht die Szene.

### B. Controller + Klick-Flow
- [ ] Controller-Ray ist sichtbar (weisser Strahl vom Controller).
- [ ] Ray trifft Hotspots (gruene Ringe) visuell — klickbar nicht noetig.
- [ ] Trigger auf **Panorama-Stelle** → Fadenkreuz erscheint an der
      geklickten Stelle.
- [ ] Bei Treffer: `VRKategoriePanel` erscheint. Kategorien sind
      einzeln via Ray klickbar.
- [ ] Nach Kategorie-Wahl: `VRFeedback`-Overlay, danach weiter zur
      Bewertung.

### C. Standort-Wechsel (3.1)
- [ ] In einer Szene mit Perspektiven: Diamant-Marker (blau) sichtbar.
- [ ] Ray auf Diamant → Hover-Highlight (heller/groesser).
- [ ] Trigger → Panorama wechselt zum anderen Standort.
- [ ] In Perspektive sichtbar: Diamant fuer Rueckweg zu "Haupt" bzw.
      andere Perspektiven.

### D. Haptik (3.2, nach Implementation)
- [ ] Treffer → kurzer starker Controller-Rumble.
- [ ] Miss / Kein-Treffer → doppelter weicher Rumble.
- [ ] Rumble spuerbar an beiden Controllern.

### E. HUD mit Zeit (3.3, nach Implementation)
- [ ] `VRProgressPanel` oben links: Scene-Name, Kontext, Found/Total,
      **Zeit im Format MM:SS sichtbar und tickt mit**.

### F. Farb-codierte Marker (3.4, nach Implementation)
- [ ] Noch nicht besuchte Standorte: neutral/grau.
- [ ] Nach Besuch: gruen.
- [ ] Aktuelle Perspektive wird nicht als eigener Marker gerendert
      (das ist korrektes Verhalten, oder der aktive Standort ist als
      blauer "Heim"-Marker sichtbar).

### G. Beenden
- [ ] "Szene beenden" in `VRControlBar` → Session wird beendet.
- [ ] ESC / Menue-Taste am Controller → Session wird beendet.
- [ ] Nach Beenden: Browser-Ansicht zeigt normalen Viewer bzw.
      Szenenabschluss.

---

## 5. Bekannte Limitationen

- **Passthrough** (AR-Modus mit realer Umgebung dahinter) ist nicht
  konfiguriert — reine immersive-VR.
- **Kein Hand-Tracking** (`hand: false` im xrStore). Controller sind
  Pflicht.
- **Keine Eye-Tracking-Abhaengigkeiten** — Meta Quest 3 hat Eye-Tracking
  nur in Pro-Variante, wir setzen es nicht ein.
- **Performance-Budget**: Meta Quest 3 XR2 Gen 2 schafft 90 Hz
  komfortabel bei 4K-Panorama. 8K-Texturen koennen Hitching verursachen
  — Admin sollte Panorama-Bilder auf <= 4K skalieren.

---

## 6. Ergebnis Smoke-Test (nach Stevos Test ausfuellen)

**Datum**: _(ausstehend)_

**Tester**: Stevan Skeledzic, Meta Quest 3

**Build**: v0.8.0, Vercel-Deploy `<hash>`

| Abschnitt | Status | Bemerkung |
|---|---|---|
| A. Session-Start | ? | |
| B. Controller + Klick | ? | |
| C. Standort-Wechsel | ? | |
| D. Haptik | ? | |
| E. HUD mit Zeit | ? | |
| F. Farb-codierte Marker | ? | |
| G. Beenden | ? | |

**Gesamt-Eindruck**: _(ausstehend)_

**Offene Punkte fuer v0.9.0**: _(ausstehend)_
