# Code Review — RSI_Meta v0.3.1

**Datum:** 2026-04-19
**Reviewer:** Automatisiert (feature-dev code-reviewer agent)
**Umfang:** `App.tsx`, `SceneViewer.tsx`, `ScoringFlow.tsx`, `AdminDashboard.tsx`, `BildEditor.tsx`, `LandingPage.tsx`, `appData.ts`, `supabaseSync.ts`, `sphereCoords.ts`

**Gesamteindruck:** Die Codebasis ist für ein Solo-Projekt bemerkenswert kohärent. Architektur, Typisierung und Kommentarqualität sind durchgehend gut. Die kritischsten Probleme betreffen Datenkonsistenz (punkteRoh/punkteFinal), einen doppelten Export desselben Symbols aus zwei verschiedenen Quellen sowie fehlende Cache-Invalidierung nach Logout.

---

## Kritisch

### 1. `punkteRoh` und `punkteFinal` sind immer identisch — Statistik ist falsch

**Datei:** `src/App.tsx`, Zeile 171–172

`DefizitResult` definiert `punkteRoh` als "Vor Strafen" und `punkteFinal` als "Nach Strafen". In `handleScoringComplete` werden beide mit demselben Wert `finalPts` belegt. `finalPts` kommt aus `ScoringFlow.onComplete(pts)`, wobei `pts` in `renderResult()` (Zeile 484 ScoringFlow) bereits Kategorieabzug und Hinweis-Abzug enthält — also der Wert nach Strafen ist.

Das bedeutet: Die Administratoren-Statistik `getDefizitStatistik` prüft ob `dr.punkteFinal > 0` um "gefunden" zu zählen (`appData.ts:1051`). Das funktioniert noch zufällig, aber die Unterscheidung Roh/Final hat keine Bedeutung mehr.

**Fix:** Entweder `calcScore()` (ohne Strafen) separat auflösen und als `punkteRoh` speichern, oder die Felder zu einem einzigen `punkte: number` zusammenführen und das Interface bereinigen.

**Konfidenz: 90**

---

### 2. `KRITERIUM_LABELS` wird in `ScoringFlow.tsx` aus `scoringEngine.ts` importiert — verletzt Sacred-File-Konvention

**Datei:** `src/components/ScoringFlow.tsx`, Zeile 14

`ScoringFlow.tsx` importiert `KRITERIUM_LABELS` direkt aus `scoringEngine.ts`. Laut CLAUDE.md wurde das Symbol genau deshalb in eine separate Datei `kriteriumLabels.ts` ausgelagert, damit `scoringEngine.ts` unberührt bleibt. Alle anderen Dateien (`SceneViewer`, `AdminDashboard`, `LernKarte`) importieren korrekt aus `kriteriumLabels.ts`.

`scoringEngine.ts` exportiert `KRITERIUM_LABELS` noch immer zusätzlich (Zeile 82), d.h. es gibt zwei gleichnamige Exporte aus zwei Dateien. Wer die Labels in `kriteriumLabels.ts` bearbeitet (Umlaute, Schreibweise), sieht das in `ScoringFlow` nicht — denn der holt sich die alte Version aus `scoringEngine`.

**Fix:** In `ScoringFlow.tsx` Zeile 14 ändern auf `import { KRITERIUM_LABELS } from '../data/kriteriumLabels'` und den Export aus `scoringEngine.ts` entfernen (das wäre eine Sacred-File-Änderung, aber sie entfernt nur einen dupliziertes Re-Export — keine normative Logik).

**Konfidenz: 95**

---

### 3. Kurs-Passwort wird im Klartext in localStorage gespeichert

**Datei:** `src/data/appData.ts`, Interface `Kurs` (Zeile 184–195), `saveKurs` (Zeile 824)

Das Feld `passwort: string | null` wird ungehasht in `rsi-v3-kurse` in localStorage abgelegt. Bei einem Multi-Device-Szenario oder einem zukünftigen Supabase-Upload wäre das Passwort offen im JSON lesbar. Der Username wird mit SHA-256 gehasht (korrekt, DSGVO), für Kurs-Passwörter fehlt dieselbe Behandlung. Auf dem Meta Quest Browser kann jeder in den Dev Tools den localStorage lesen.

**Fix:** Beim Speichern `hashUsername(kurs.passwort)` verwenden. Beim Login-Check das Eingabe-Passwort ebenfalls hashen und vergleichen. Alternativ: Passwort-Feld serverseitig via Supabase Edge Function prüfen, nie im Client.

**Konfidenz: 82**

---

## Wichtig

### 4. Supabase-Cache wird nach Logout nicht zurückgesetzt

**Datei:** `src/App.tsx`, Zeile 103–113 (`handleLogout`); `src/data/supabaseSync.ts`, Zeile 218 (`resetCache`)

`resetCache()` ist in `supabaseSync.ts` exportiert, wird aber nirgendwo aufgerufen. Nach einem Logout bleiben `topicsCache`, `scenesCache`, `deficitsCache` und das `initialized`-Flag im Modul-Scope erhalten. Ein neuer Login (mit anderem Kurs-Kontext) lädt keine frischen Daten aus Supabase, weil `initialized === true` den Init-Block überspringt.

**Fix:** In `handleLogout` (App.tsx) und `handleResetApp` (LandingPage) `resetCache()` importieren und aufrufen.

**Konfidenz: 88**

---

### 5. `nextSceneExists` wird bei jedem Render neu berechnet mit `getAllScenes()`

**Datei:** `src/App.tsx`, Zeile 272–277

Das IIFE ruft `getAllScenes()` auf — eine Funktion, die `initIfNeeded()` triggert und dann entweder Supabase-Cache oder localStorage liest. Das passiert bei jedem Re-Render von `App`. `getAllScenes()` läuft auch wenn gar kein `currentScene` vorhanden ist.

**Fix:** Als `useMemo` mit `[currentScene?.id, currentTopic?.id]` als Dependencies.

**Konfidenz: 80**

---

### 6. `punktInPolygon` im equirectangulären Raum — fehlerhaft bei Theta-Umbruch (0°/360°)

**Datei:** `src/utils/sphereCoords.ts`, Zeile 80–96

Der Ray-Casting-Algorithmus arbeitet mit `theta` und `phi` direkt als kartesische X/Y-Koordinaten. Für Polygone, die den 0°/360°-Übergang überschreiten (z.B. theta=350° bis theta=10°), vollständig falsch. In der aktuellen Datenlage (Seed-Polygone weit von 0° entfernt) tritt das nicht auf, aber beim Erstellen neuer Verortungen im BildEditor ist das eine reale Gefahr.

**Fix:** Vor dem Ray-Cast prüfen, ob die Polygon-Theta-Spanne > 180° ist. Falls ja, alle Theta-Werte um 180° rotieren bevor der Test läuft. Alternativ visuelle Warnung im BildEditor wenn ein Eckpunkt näher als 20° an 0° oder 360° liegt.

**Konfidenz: 83**

---

### 7. `handleDeleteDef` ohne Bestätigungs-Dialog

**Datei:** `src/components/AdminDashboard.tsx`, Zeile 225–228

Das Löschen eines Defizits (`handleDeleteDef`) triggert sofort `deleteDeficit(id)` und den Supabase-Delete, ohne Bestätigungsdialog oder Undo. Für Topics gibt es `handleArchiveThema` (Archivieren statt Löschen), für Defizite fehlt dieser Schutz. Gleiches für `handleDeleteScene`.

**Fix:** `window.confirm()` oder einen modalen Bestätigungs-Schritt vor dem Löschen schalten. Alternativ: Soft-Delete mit `isActive: false`.

**Konfidenz: 85**

---

### 8. `ScoringFlow` — `onBack` erlaubt, Bewertung ohne Punktvergabe zu verlassen

**Datei:** `src/components/ScoringFlow.tsx`, Zeile 697–705

Der Zurück-Button (`onBack`) setzt `scoringDeficit` nicht auf null und ruft `handleScoringComplete` nicht auf. Das Defizit zählt als "nicht gefunden", obwohl der User es angeklickt hat. Ein User kann so eine schlechte Bewertung verwerfen und dasselbe Defizit erneut finden.

**Fix:** Den Zurück-Button nach Abschluss aller drei Schritte entweder entfernen oder mit einer Warnung versehen: "Bewertung verwerfen und zurück zum Viewer?".

**Konfidenz: 80**

---

## Nice-to-have

### 9. Duplizierte Ranking-Logik in `appData.ts`

**Datei:** `src/data/appData.ts`, Zeile 951–1026

`getGesamtRanking()`, `getThemaRanking()` und `getKursRanking()` sind strukturell identisch — ca. 60 Zeilen dreifach duplizierter Code.

**Fix:** Eine generische `buildRanking(results: SceneResult[])` Hilfsfunktion extrahieren.

**Konfidenz: 92**

---

### 10. `BildEditor` — `aktivePerspektiveId` als useEffect-Dependency unterdrückt ohne Begründung

**Datei:** `src/components/admin/BildEditor.tsx`, Zeile 155

`eslint-disable-line react-hooks/exhaustive-deps` ohne Kommentar welche Dependencies absichtlich ausgelassen werden.

**Fix:** Inline-Kommentar ergänzen (`scene.panoramaBildUrl` ist stabiler String, `imgRef` ist Ref — beides legitim).

**Konfidenz: 80**

---

### 11. Seed-Datei enthält Schreibfehler

**Datei:** `src/data/appData.ts`, Zeile 442

`"Hecke ragt in Sichtraum, Fahrzeuge werden zu spaat erkannt."` → "spät".

**Konfidenz: 100**

---

## Positiv erwähnenswert

- **Architektur:** Trennung App-Flow vs. Admin-Bereich konsequent. `xrStore` als Modul-Level-Singleton verhindert korrekt den CDN-GLTF-Download-Crash.
- **Error Handling localStorage:** `writeJSON` mit Toast-Fehler statt `alert()` ist Quest-kompatibel und gut durchdacht.
- **Startblick rAF-Retry:** Die `active`-Flag im Cleanup der `useEffect` in `SceneContent` verhindert State-Updates nach Unmount korrekt.
- **`getVerortungFürPerspektive`:** "kein Fallback bei aktiver Perspektive"-Design ist normativ korrekt dokumentiert.
- **DSGVO SHA-256-Hash:** Username-Hashing vor Supabase-Insert konsequent.
- **TypeScript:** Durchgehend strict, kein `any` in den reviewten Dateien, Union-Types sauber modelliert.

---

## Priorisierte Fix-Liste

1. **Sofort (pro Fix ~5 min):** #2 (Import-Fix), #11 (Typo)
2. **Vor nächstem Release (pro Fix ~15–30 min):** #1 (punkteRoh), #4 (resetCache), #7 (Delete-Confirm), #8 (onBack-Warnung), #5 (useMemo)
3. **Vor Pilot mit externen Teilnehmern:** #3 (Kurs-Passwort-Hash), #6 (Theta-Umbruch)
4. **Refactoring-Backlog:** #9 (Ranking-Dedup), #10 (useEffect-Kommentar)
