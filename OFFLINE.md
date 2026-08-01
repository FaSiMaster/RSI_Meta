# Offline-Verhalten – RSI VR Tool

> Was ohne Netz funktioniert und was nicht. Stand v0.11.0.
> **Der Offline-Betrieb ist weiterhin nicht systematisch geprüft**; die Tabelle
> gibt den Stand aus Architektur und Quellcode wieder, nicht aus Messungen.

---

## 1. Aufbau

Die App ist eine Progressive Web App mit Service Worker auf Basis von
`vite-plugin-pwa` und Workbox. Die statischen Bestandteile – JavaScript, CSS,
Schriften, Icons und mitgelieferte Texturen – liegen im Cache. Alle Zugriffe auf
Supabase brauchen dagegen eine Verbindung; ohne sie greift der Rückfall auf den
localStorage.

---

## 2. Was ohne Netz funktioniert

| Funktion | Offline | Anmerkung |
|---|---|---|
| Anmeldung mit gespeichertem Namen | ja | Sitzung kommt aus dem localStorage |
| Themen-Dashboard | teilweise | nur die beim letzten Start synchronisierten Themen |
| Szenenliste | teilweise | wie oben |
| 360°-Viewer bestehender Szenen | ja | sofern das Panorama bereits im Cache liegt |
| Bewertung nach den 9 Schritten | ja | rechnet vollständig im Client |
| Lernkarte | ja | aus dem localStorage |
| PDF-Bericht | ja | pdfmake wird beim ersten Aufruf nachgeladen und ist danach im Cache |
| Rangliste, lokale Werte | ja | aus dem localStorage |
| Rangliste, Live-Daten | nein | braucht Supabase |
| Anmeldung im Administrationsbereich | **nein** | die PIN prüft seit v0.6.0 die Edge Function `admin-auth`, nicht mehr der Client |
| Pflege von Themen, Szenen, Defiziten | nein | Schreibzugriffe laufen über `admin-write` |
| Panorama hochladen | **nein** | Ziel ist der Supabase-Bucket `rsi-textures` |
| Ergebnis an die Rangliste senden | nein | wird lokal gehalten, **ohne automatischen zweiten Versuch** |
| Export und Import als JSON | ja | rein lokal |
| Sprache wechseln | ja | die Sprachdateien sind im Bundle |
| Erscheinungsbild wechseln | ja | reine CSS-Umschaltung |

---

## 3. Cache-Verhalten

In `vite.config.ts` sind gesetzt: `cleanupOutdatedCaches` räumt alte Bundles weg,
`skipWaiting` lässt einen neuen Service Worker sofort übernehmen, `clientsClaim`
gibt ihn allen offenen Tabs ohne Neuladen. Die Precache-Grenze steht auf 3 MiB,
weil der Hauptchunk die voreingestellten 2 MiB überschreitet.

Eine eigene Laufzeitstrategie ist bis auf die drei statischen Rechtsseiten nicht
konfiguriert. Es gilt die Voreinstellung von Workbox: Was im Manifest steht, wird
vorab geladen, alles Übrige zuerst aus dem Netz geholt. Für Supabase ist das
richtig, und Panoramen landen beim ersten Betrachten im Cache.

---

## 4. Bekannte Lücken

**Kein zweiter Sendeversuch für Ergebnisse.** Wer offline übt, dessen Punkte
gehen beim Wiederverbinden nicht von selbst an Supabase. Abhilfe wäre eine
eigene Wiederholungslogik, ausgelöst über einen Online-Listener; die Background
Sync API ist dafür nur eingeschränkt verfügbar.

**Erster Start ohne Netz.** Wer die App zum ersten Mal ohne Verbindung öffnet,
sieht keine Szenen, weil der localStorage leer ist. Vorhanden sind dann
ausschliesslich die mitgelieferten Startdaten.

**Fehler bleiben unsichtbar.** Ein fehlgeschlagener Supabase-Aufruf wird in
`supabaseSync.ts` abgefangen, aber nicht durchgehend angezeigt. Damit kann der
Eindruck entstehen, etwas sei gespeichert, obwohl es nur lokal liegt.

---

## 5. Prüfszenarien

Die folgenden Abläufe sind von Hand durchzuspielen und zu protokollieren.

**Kalter Start ohne Netz.** App online öffnen, anmelden, eine Szene spielen. In
den Entwicklerwerkzeugen unter Application → Service Workers den Offline-Modus
setzen und neu laden. Erwartet: Anmeldung bleibt, Szenenliste erscheint, die
zuletzt gespielte Szene lädt. Ergebnis: noch offen.

**Ergebnis ohne Netz.** Offline eine Szene spielen und abschliessen. Erwartet:
Das Ergebnis liegt lokal, und ein Hinweis nennt den fehlenden Versand. Offen ist,
ob es diesen Hinweis überhaupt gibt.

**Wiederverbindung.** Nach dem vorigen Schritt wieder online gehen. Erwartet
wäre ein Nachsenden; nach Abschnitt 4 findet es nicht statt.

**Installierte App ohne Netz.** App installieren, WLAN abschalten, vom
Startbildschirm öffnen. Erwartet: Die App startet, gecachte Szenen sind spielbar.

---

## 6. Offene Punkte

- Laufzeitstrategie für Panoramen ausdrücklich auf «stale while revalidate»
  setzen
- Wiederholungslogik für Schreibzugriffe auf Supabase
- Anzeige des Verbindungszustands in der Navigationsleiste
- Rückmeldung bei Ergebnissen, die noch nicht übertragen sind
- Prüfplan mit protokollierten Ergebnissen

---

## 7. Empfehlung für die Kursleitung

Die Geräte sollten die App einmal vollständig online geladen haben, alle
vorgesehenen Szenen eingeschlossen, bevor eine Schulung ohne Netz stattfindet.
Am sichersten ist es, die App am Vortag im Schulungsraum auf jedem Gerät einmal
zu öffnen und die Szenen kurz anzusteuern, damit der Cache gefüllt ist.

Die Pflege von Inhalten und die Anmeldung im Administrationsbereich brauchen in
jedem Fall eine Verbindung. Vorbereitende Arbeiten gehören deshalb vor den
Kurstag.
