# Offline-Verhalten — RSI VR Tool

> Was funktioniert ohne Netz, was nicht? Stand v0.3.0 — **Offline-Flow noch nicht systematisch getestet.**

---

## 1. Architektur-Überblick

Die App ist eine Progressive Web App mit Service Worker (vite-plugin-pwa / Workbox):

- **Statische Assets** (JS-Bundle, CSS, Fonts, Icons, Panorama-Texturen) werden gecacht
- **Supabase-Aufrufe** (Lesen/Schreiben) brauchen Netz — sonst Fallback auf localStorage

---

## 2. Was funktioniert offline?

| Feature | Offline-fähig? | Anmerkung |
|---|---|---|
| Login mit gespeichertem Namen | ✓ | `getSession()` aus localStorage |
| Themen-Dashboard | **teilweise** | lädt aus localStorage-Cache — aber nur die Themen, die beim letzten Online-Start synchronisiert wurden |
| Szenen-Liste | **teilweise** | wie oben |
| 360°-Viewer (bestehende Szenen) | ✓ | falls Panorama-Textur bereits gecacht ist |
| 9-Schritt-Bewertung | ✓ | rein client-seitig |
| Lernkarte | ✓ | aus localStorage |
| Ranking — lokale Werte ansehen | ✓ | aus localStorage |
| Ranking — globale Live-Daten | ✗ | Supabase-Request schlägt fehl |
| Admin-Panel öffnen | ✓ | PIN-Check ist client-seitig |
| Admin CRUD (Themen, Szenen, Defizite) | **teilweise** | localStorage-Update geht; Supabase-Sync schlägt fehl → Daten sind nicht auf anderen Geräten sichtbar, bis Netz wieder da |
| Panorama-Upload | **teilweise** | base64 in localStorage ok; bei URL-Upload kein Netzzugriff |
| Score ans Ranking senden | ✗ | `saveResult` zu `rsi_results` schlägt fehl — lokal gespeichert, aber **kein automatisches Retry** aktuell |
| Export (JSON) | ✓ | rein lokal |
| Import | ✓ | rein lokal |
| Sprache wechseln | ✓ | i18n-Bundles sind gecacht |
| Theme wechseln | ✓ | CSS-Variable toggle |

---

## 3. Cache-Strategien (Workbox)

In `vite.config.ts`:
- **`cleanupOutdatedCaches: true`** → alte Bundles werden entfernt
- **`skipWaiting: true`** → neuer SW übernimmt sofort
- **`clientsClaim: true`** → alle Tabs bekommen den neuen SW ohne Reload

**Aktuell ist die runtime-Caching-Strategie nicht explizit konfiguriert.** Workbox-Default: Precache alle Assets aus dem Manifest, sonst Network-First. Das heisst: Supabase-Requests sind Network-Only (richtig), Panorama-Texturen aus `/textures/` werden beim ersten Besuch gecacht (gut).

---

## 4. Bekannte Lücken

### 4.1 Keine Retry-Queue für Score-Uploads
Wenn ein User offline spielt und dann das Netz zurückkommt, werden die Scores **nicht automatisch** nachträglich an Supabase gesendet. Empfehlung: Background Sync API (experimentell) oder eigene Retry-Logik im `useEffect` mit Online-Listener.

### 4.2 Neue Szenen beim ersten Besuch
Wenn ein User zum ersten Mal online geht, aber gerade keine Netzverbindung hat, sieht er keine Szenen (localStorage ist leer). Nur Seed-Daten sind vorhanden, sofern das App-Bundle einmal geladen wurde.

### 4.3 Supabase-Fehler nicht immer sichtbar
Ein fehlgeschlagener Supabase-Request wird in `supabaseSync.ts` zwar ge-catched, aber nicht immer dem User angezeigt. Der User denkt, alles sei gespeichert — ist es aber nur lokal.

---

## 5. Test-Szenarien (manuell durchzuspielen)

### Test 1 — Kalter Offline-Start
1. App im Chrome öffnen, einloggen, eine Szene spielen (online).
2. DevTools → Application → Service Workers → "Offline" aktivieren.
3. App neu laden.
4. **Erwartet:** Login-State erhalten, Szenen-Liste sichtbar, zuletzt gespielte Szene ladbar.
5. **Test-Ergebnis:** _(noch nicht durchgeführt)_

### Test 2 — Offline-Score
1. Offline, Szene starten, Defizit markieren, bewerten, abschliessen.
2. **Erwartet:** Score lokal gespeichert, "Senden an Ranking" zeigt Offline-Hinweis.
3. **Test-Ergebnis:** _(offene Frage: gibt es diese Anzeige überhaupt?)_

### Test 3 — Wiederverbindung
1. Schritt 2 durchführen, dann wieder Online gehen.
2. **Erwartet:** Score wird automatisch nachgesendet.
3. **Aktuell:** nein (siehe 4.1).

### Test 4 — PWA Install + Offline
1. App als PWA installieren (Desktop Chrome oder Android).
2. WLAN deaktivieren.
3. App aus dem Homescreen starten.
4. **Erwartet:** App öffnet, gecachte Szenen sind spielbar.

---

## 6. To-Do (Verbesserungen)

- [ ] Runtime-Caching-Konfiguration für Panorama-Texturen explizit: Stale-While-Revalidate
- [ ] Retry-Queue für Supabase-Writes (Background Sync oder custom)
- [ ] Offline-Indikator in Navbar (Punkt rot wenn offline)
- [ ] User-Feedback bei nicht synchronisierten Scores
- [ ] Systematischer Offline-Testplan mit protokollierten Ergebnissen

---

## 7. Empfehlung für Kursleitung

Teilnehmer sollten die App **einmal online** vollständig geladen haben (alle gewünschten Szenen mindestens einmal angeklickt), bevor sie in eine Offline-Schulung gehen. Am sichersten: die App am Tag vor dem Kurs im Schulungsraum an jedem Gerät einmal öffnen, um den Precache zu befüllen.
