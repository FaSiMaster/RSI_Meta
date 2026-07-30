# Changelog

Alle wesentlichen Änderungen am RSI VR Tool werden in dieser Datei dokumentiert.

Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [Semantic Versioning](https://semver.org/lang/de/).

---

## [Unreleased]

—

---

## [0.11.0] — 2026-07-30 — PDF-Bericht (Roadmap Phase 5)

### Hinzugefügt

- **PDF-Export mit pdfmake.** Ein Dokument, zwei Teile: Auswertung (Kopfdaten,
  Bestanden-Status, Punkte, Tabelle über alle Defizite) und Befundliste im
  RSI-Format (Kriterium, Soll- und Ist-Beurteilung mit der vollen Kette
  Wichtigkeit → Abweichung → Relevanz SD → Unfallschwere → Unfallrisiko,
  Normbezug). Nicht gefundene Defizite erscheinen als solche.
- **Drei Auslösepunkte:** Teilnehmer im Szenen-Abschluss, Admin je Kurs
  (Übersicht aller Durchläufe, Querformat), Admin je Einzelresultat.
- **Neues Modul `src/data/berichtModel.ts`** — reine Aufbereitung ohne
  React- oder pdfmake-Bezug, 18 Tests. `src/utils/pdfExport.ts` setzt daraus
  das Dokument (11 Tests).
- **i18n vollständig**: neuer `bericht`-Block plus einheitlicher `dim`-Block
  für die Dimensionen, alle vier Sprachen.

### Geändert

- **`DefizitResult` speichert neu die abgegebene Beurteilung**
  (`userWichtigkeit`, `userAbweichung`, `userUnfallschwere`). Bisher wurde nur
  festgehalten, *ob* eine Antwort stimmte — für einen Befundbericht braucht es
  die Antwort selbst. Felder sind optional; ältere Durchläufe erscheinen im
  Bericht mit dem Vermerk, dass die Beurteilung nicht gespeichert wurde.
- **`rsi_results` bekommt eine JSONB-Spalte `detail`** mit den Detaildaten je
  Durchlauf — ohne sie kann der Admin-Export nur Kopfzahlen ausgeben, weil die
  Befunde bisher nur im localStorage des jeweiligen Geräts lagen. Migration:
  `supabase/migrations/2026_07_30_rsi_results_detail.sql`. Der Insert fällt
  ohne die Spalte auf die Basisfelder zurück, es geht also nichts verloren.
  Enthält keine Personendaten; der Username bleibt ein SHA-256-Hash.

### Technik

- pdfmake wird **dynamisch nachgeladen** — eigener Chunk (1'009 kB, gzip
  361 kB), der Haupt-Chunk bleibt unverändert. Erst der Klick auf «Bericht»
  lädt ihn.
- **pdfmake 0.3 registriert die mitgelieferten Schriften nicht mehr selbst.**
  Ohne die explizite `addFonts`-Zuordnung bricht das Rendern beim ersten
  fetten Text ab. Gegen den Node-Build von pdfmake verifiziert (gültiges PDF,
  Tabellen mit colSpan, Umlaute).

### Bekannte Einschränkung

- Im Admin-Bereich stammen die Namen aus Supabase und liegen dort nur als
  Hash vor. Der Kursbericht weist sie gekürzt aus und nennt das im Dokument.
  Ein Bericht mit Klarnamen entsteht auf dem Gerät der teilnehmenden Person.

---

## [0.10.2] — 2026-07-30 — Hinweis-Stufe 1 heisst neu «Standort-Hinweis»

### Geändert

- **Begriff «Wegweiser» → «Standort-Hinweis»** in allen vier Sprachen.
  Grund: «Wegweiser» ist im Strassenwesen ein Signal (SSV/VSS) und kollidiert
  mit dem RSI-Kriterium «Signale / Wegweiser» aus der WICHTIGKEIT_TABLE —
  im Training konnte der Begriff als Sachthema statt als Hilfsfunktion
  gelesen werden.
  - de «Standort-Hinweis», fr «indication de site», it «indicazione di
    posizione», en «location hint».
  - i18n-Keys `szene.wegweiser_*` → `szene.standorthinweis_*`;
    `hint1_titel` / `hint1_text` / `hint1_dauer` textlich nachgeführt.
  - Konstante `HINT_ABZUG_WEGWEISER` → `HINT_ABZUG_STANDORT`
    (`src/data/scoreCalc.ts`), Kommentare in `App.tsx` und `SceneViewer.tsx`
    nachgezogen, Smoke-Protokoll J in `docs/VR_SMOKE_REPORT.md` umbenannt.
- Reine Umbenennung: **keine Änderung an Funktion, Abzug (−10 / −25) oder
  Punkte-Berechnung**. Das Kriterium `signale_wegweiser` in
  `scoringEngine.ts` (Sacred) bleibt unberührt — es meint das reale Signal.

---

## [0.10.1] — 2026-07-29 — Kurs-exklusive Themen + Archiv-Filter-Fix

### Hinzugefügt

- **Themen lassen sich auf Kurse einschränken (striktes Modell):** Neues
  Themen-Flag «Nur für zugewiesene Kurse sichtbar» (Admin-ThemaModal).
  `kurs.topicIds` hat erstmals Wirkung: Wer mit Kurs-Code eingeloggt ist,
  sieht ausschliesslich die im Kurs angehakten Themen; das freie Training
  sieht nur Themen ohne Exklusiv-Flag. Kurse ohne angehakte Themen zeigen
  als Fallback die freie Auswahl (Rückwärtskompatibilität — bestehende
  Kurse haben leere topicIds). Logik in `filterSichtbareTopics()` /
  `getSichtbareTopics()` (appData), 5 neue Tests.
  Hinweis: Das ist Sichtbarkeits-Steuerung im Client, keine
  Zugriffssicherung — die Inhalte bleiben in Supabase anon-lesbar.

### Behoben

- **Archivierte Themen erschienen weiterhin im Teilnehmer-Dashboard:**
  «Thema archivieren» setzte `isActive: false`, das TopicDashboard
  filterte aber nicht danach. Der neue Sichtbarkeits-Filter schliesst
  inaktive Themen jetzt überall im Trainingspfad aus.

---

## [0.10.0] — 2026-07-29 — Punkte-Ökonomie: Teilpunkte + zweistufiger Hinweis

Entscheid Fachverantwortung vom 29.07.2026. Beide Konstanten liegen in
`scoreCalc.ts` — das Sacred File `scoringEngine.ts` (Matrizen,
Schritt-Gewichte) bleibt unangetastet. Achtung: Scores sind mit
früheren Versuchen nur noch eingeschränkt vergleichbar.

### Geändert

- **Teilpunkte bei falscher Kategorie:** «Gefunden, aber falsch
  einsortiert» gibt neu 15 der 25 Kategorie-Punkte (vorher 0). Begründung:
  Die Kategorisierung ist Schritt 0 und nicht Teil der normativen
  9-Schritte-Methodik; die Kategorien überlappen (Review R-11). Feedback-
  Texte, Punkte-Aufriss (Browser + VR) und Abschluss-Chip («Kat. 15/25»)
  in 4 Sprachen nachgezogen.
- **Zweistufiger Hinweis (Review R-18):** Stufe 1 «Wegweiser» (−10 pro
  Fund) markiert nur die Standort-Buttons, hinter denen noch unentdeckte
  Defizite liegen; Stufe 2 «Hotspots» (−25 pro Fund) blendet zusätzlich
  die Marker im Bild ein. Massgebend ist die beim Fund aktive Stufe —
  nicht additiv, nur aufwärts schaltbar, je mit Bestätigungsdialog
  (Browser + VR). `FoundDeficit`/`DefizitResult` speichern neu den
  effektiven `hintAbzug` (Legacy-Fallback −25); Aufriss und Abschluss-Chip
  zeigen den echten Abzug.

---

## [0.9.9] — 2026-07-29 — Admin-Rangliste löscht jetzt wirklich

### Behoben

- **Die Lösch-Buttons der Admin-Rangliste löschten still gar nichts:** Die
  RLS-Policy von `rsi_results` erlaubt anon nur SELECT und INSERT — die
  direkten Client-Deletes (Eintrag/User/Kurs/alles) wurden von Postgres
  verworfen, ohne dass die UI es merkte (nachgewiesen per REST-Test am
  29.07.2026). Löschungen laufen neu über die Edge Function `admin-write`
  (service_role, Token-geprüft): `rsi_results` ist dort als
  **delete-only**-Tabelle ergänzt mit genau einem Filter pro Aufruf
  (id / username / kurs_code / all). Upserts auf rsi_results bleiben
  verboten. Client neu via `deleteResultsSupabase()` (supabaseSync), die
  UI zeigt die Anzahl tatsächlich gelöschter Zeilen.

### Deployment-Hinweis

- Die geänderte Edge Function muss deployt werden:
  `npx supabase functions deploy admin-write --project-ref gtweaesunpvwjlttyaab`
  (einmalig `supabase login` nötig). Bis zum Deploy zeigen die
  Lösch-Buttons einen Fehler statt stillem Nichtstun.

---

## [0.9.8] — 2026-07-29 — Sprach-Vollausbau: kein Deutsch mehr in fr/it/en

### Geändert

- **Hartcodierte deutsche UI-Strings auf i18n umgestellt** in allen
  teilnehmenden-sichtbaren Komponenten: SzenenAbschluss (Score-Karten,
  Statistik, Tabelle, Status-Chips, Buttons), ScoringFlow (Methodik-Overlay,
  Matrizen-Titel, Legenden, Zwischenergebnisse, «Gemäss Tabelle»,
  Punkte-Einheiten), LernKarte (Dimension-/NACA-/Kategorie-Labels neu via
  i18n statt lokaler deutscher Maps), RankingView (Tab-Pills,
  Tabellen-Header, Auswahl-Labels, Leer-Meldungen, «(Du)»), SceneList
  (Defizit-/Versuchs-/Best-Angaben, Leer-Meldung), SceneViewer
  («Szene beenden», Standort-Label, Zoom-Tooltips, VR-Titel,
  AllFoundBanner), TrainingEinstieg (Trainer-Box-Label).
- **Supabase-Content erstmals vollständig übersetzt:** Namen, Beschreibungen
  und Erklärungen aller 8 Defizite von SZ_2026_002 in fr/it/en, mit der
  Terminologie aus dem VSS-40-241-Normtext (passage pour piétons, distance
  de visibilité, îlot de protection; passaggio pedonale, distanza di
  visibilità, isola salvagente). SSV heisst fr OSR / it OSStr.
  Maschinell übersetzt — fachliche Prüfung empfohlen. Soll-Werte unberührt.

### Bekannt / bewusst offen

- Admin-Bereich (SzeneModal, NeueSzeneModal, Diagnose-Overlay
  «Kein Panorama-Bild») bleibt teilweise deutsch — interner Bereich.

---

## [0.9.7] — 2026-07-29 — Bestanden-Kriterium + eigener Name im Live-Ranking

### Hinzugefügt

- **Bestanden-Kriterium (Review R-09, Entscheid Fachverantwortung):** Eine
  Szene gilt als bestanden, wenn alle Pflichtdefizite gefunden sind UND
  mindestens 60 % der Punkte erreicht wurden. Neues Modul
  `src/data/bestandenKriterium.ts` (pure Functions, 11 Tests), app-weiter
  Default mit optionalem Szenen-Override (`scene.bestandenKriterium`,
  minProzent null = keine Prozent-Schwelle). Sterne und Punkteberechnung
  unverändert — Bestanden läuft parallel; `scoringEngine.ts` unberührt.
- **Sichtbarkeit:** Einstieg nennt das Kriterium; Abschluss-Screen zeigt
  Badge Bestanden/Nicht bestanden mit Begründung (fehlende Pflichtdefizite,
  Prozent); SceneList-Karte trägt ein Bestanden-Badge, sobald irgendein
  Versuch bestanden war; Rangliste neu mit Bestanden-Spalte (Gesamt/Kurs/
  Thema: «x/y Szenen», Szene: Haken pro Zeile). SceneResult speichert
  `pflichtGefunden`/`pflichtTotal`/`bestanden`.
- **Admin:** SzeneModal mit Override-Feldern (Checkbox «alle Pflicht»,
  Mindest-Prozent, leer = keine Schwelle).
- **Supabase-Migration nötig für die Ranking-Spalte:**
  `alter table rsi_results add column if not exists bestanden boolean;`
  (Skript: `RSI_Meta_Review/migration_bestanden_2026-07-29.sql`). Ohne
  Migration fällt der Client beim Insert automatisch auf das alte
  Zeilenformat zurück — kein Datenverlust.

### Behoben

- **Eigene Zeile im Live-Ranking war nie markiert:** Supabase speichert
  Usernamen als SHA-256-Hash (DSGVO), der Klarname-Vergleich griff dort
  nie. Neu hasht der Client den eigenen Namen (`hashUsername` exportiert)
  und zeigt NUR in der eigenen Zeile den Klarnamen samt «(Du)»-Markierung
  und blauer Hervorhebung — alle anderen bleiben pseudonymisiert.

---

## [0.9.6] — 2026-07-29 — Review-Umsetzung SZ_2026_002 (Code-Teil)

Umsetzung der Code-Befunde aus dem Multi-Agent-Review «Querungsstellen auf
Schulwegen» (Bericht v1.0, 26 Befunde, `C:\ClaudeAI\RSI_Meta_Review\`).
Content-Befunde (Normnummer, Namen, Erklärungen, Merkmale, SSV-Bezug) wurden
direkt in Supabase geschrieben; Soll-Werte der Musterlösungen unverändert
(R-01/R-13/R-16 zurückgestellt bis FK-RSI-Fachverifikation).

### Behoben

- **R-02 «−10% Abzug» war falsch:** Feedback bei falscher Kategorie sagt neu
  in allen vier Sprachen «0 von 25 Kategorie-Punkten» — deckungsgleich mit
  der realen Wirkung (`KATEGORIE_PUNKTE`). SzenenAbschluss-Chips «Kat. -10%»
  und «Hint -50%» korrigiert («Kat. 0/25», «Hotspots −25»); der stale
  Hinweis-Button-Tooltip «−50 % Punkte» sagt neu «−25 Punkte pro gefundenes
  Defizit».
- **VR-Abbrechen-Buttons zeigten den rohen Key:** `scoring.abbrechen` fehlte
  in allen vier Sprachdateien (nur `feedback.abbrechen` existierte) — Key
  ergänzt.
- **Workbox-Limit:** Haupt-Chunk überschritt mit 2.11 MB die
  Precache-Grenze von 2 MiB — `maximumFileSizeToCacheInBytes` auf 3 MiB.

### Hinzugefügt

- **R-07 Mini-Methodik-Referenz** in den drei Bewertungs-Overlays (Browser):
  aufklappbar, ohne Punktabzug. Schritt 1 erklärt das Ablese-Prinzip
  (bewusst ohne Wichtigkeits-Tabelle, Anti-Spoiler), Schritt 2 zeigt die
  Relevanz-Matrix, Schritt 3 die Unfallrisiko-Matrix.
- **R-10 Pflicht-Transparenz:** HUD-Zähler neu «x/8 · Pflicht y/7»;
  TrainingEinstieg kündigt Anzahl Defizite, Pflichtdefizite und Booster an
  (R-09/R-22), `deficits`-Prop neu an TrainingEinstieg.
- **R-11 Kategorie-Definitionen:** Einzeiler pro Kategorie im
  KategoriePanel (4 Sprachen).
- **R-15 Standort-Vermerk:** Verpasste Defizite zeigen im Abschluss-Screen
  neu die Standorte, an denen sie verortet gewesen wären.
- **R-25 NACA-Wert in der Lernkarte:** Soll-Wert neu als «Schwer (NACA 4)»
  statt nur Gruppenlabel; korrekte Zeilen zeigen den Sollwert ebenfalls.

### Geändert

- **R-12 Schritt-1-Frage präzisiert:** «Welche Wichtigkeit weist der
  Fachkurs diesem Kriterium zu?» statt «Wie wichtig ist dieses Kriterium?»
  (Ablesen statt Ermessen).
- **R-14 Abweichungs-Texte via i18n:** neues UI-Mapping
  `src/data/abweichungLabels.ts` (Sacred-File unangetastet) — echte Umlaute
  in de, erstmals übersetzt in fr/it/en; genutzt in ScoringFlow, Browser-
  und VR-Overlays. NACA-Optionen im Browser-Overlay neu aus i18n-Keys.
- **R-20 Begriffe harmonisiert:** Button neu «Hotspots einblenden» /
  «Hotspots aktiv» (Browser + VR, 4 Sprachen); Bewertungs-Etiketten neu
  «Eingabe n von 3 · Methodik-Schritt m» (m = 1/3/7 der 9-Schritte-Methodik).
- **R-26 Du-Form im Trainingskontext:** guide.* (de) und guide.* (it) neu
  in Du-Form; fr bleibt konsistent vouvoyé, Admin bleibt Sie.

---

## [0.9.5] — 2026-07-28 — Punkte-Aufriss vollständig + Wegweiser nur für Neues

### Behoben

- **Punkte-Aufriss summierte im Browser nicht auf die Kopfzahl:** Bei
  Booster-Defiziten fehlte der Bonus als Zeile (Kopf zeigte z.B. 110, die
  Zeilen ergaben 100). Neu: Booster-Zeile «+X Pkt. (+Y %)» im
  Browser-Ergebnis. Die eigentliche Punkte**berechnung** ist in Browser und
  VR nachweislich identisch (gleiche Formel, gleiche Konstanten aus
  scoringEngine) — falsch war nur die Anzeige.
- **VR-Ergebnis-Seite zeigt jetzt denselben Aufriss wie der Browser:**
  Punkte-Beitrag pro Zeile (Kategorie ±25, Wichtigkeit/Abweichung/NACA je
  ±25 aus STEP_WEIGHTS), plus eigene Zeilen für Hinweis-Abzug (−25) und
  Booster-Bonus. Zeilensumme geht exakt auf punkteFinal auf — Browser und
  VR sind damit direkt vergleichbar.
- **Hinweis-Wegweiser nur noch für Neues:** Marker leuchten nur, wenn
  dahinter ein offenes Defizit liegt, das am aktuellen Standort NICHT
  sichtbar ist. Vorher leuchteten fast alle Rauten, weil Defizite mehrfach
  verortet sind (gegen Live-Daten verifiziert: in SZ_2026_002 sind 7 von 8
  Defiziten in 4–6 Ansichten verortet — einziger echter Wegweiser-Fall ist
  SD_0012 mit genau einem Standort).
- Hartcodiertes «Kategorie»-Label im Browser-Aufriss über i18n.
  Neuer Key `scoring.booster` (de/fr/it/en).

### Gates

- `tsc --noEmit`: 0 Fehler · `vitest`: 46/46 · `vite build`: grün

---

## [0.9.4] — 2026-07-28 — Hinweis-Wegweiser über Standorte

### Behoben / Hinzugefügt

- **Hinweis zeigte aus Nebenstandorten keine Hotspots** (Stevos
  Headset-Befund): Hotspots erscheinen bewusst nur im Standort, in dem das
  Defizit verortet ist (kein Fallback seit v0.4.0 — verhindert
  Phantom-Positionen im falschen Bild). Aus einem anderen Standort lief der
  Hinweis damit ins Leere. **Neu: Hinweis-Wegweiser** — bei aktivem Hinweis
  werden Standort-Marker **orange umrandet**, wenn hinter ihnen noch
  unentdeckte Defizite verortet sind. Der Weg wird gezeigt, die genaue
  Position erst am richtigen Standort (User-Entscheid: Variante
  «Standort-Marker orange»).
- Gilt in **VR** (Diamant-Marker: oranger Rand + oranges Label) und im
  **Browser** (Standort-Leiste: oranger Button-Rand inkl. Haupt-Button).
  Grundlage: neue Helper-Funktion `standortHatOffeneDefizite()` auf Basis
  von `getHotspotPosition` — dieselbe Logik, die auch die Hotspots rendert.

### Gates

- `tsc --noEmit`: 0 Fehler · `vitest`: 46/46 · `vite build`: grün

---

## [0.9.3] — 2026-07-28 — Browser-Parität + Rest-Politur

### Behoben

- **«Gemäss Tabelle»-Lösungsvorschau auch im Browser entfernt**
  (Bewertungs-Overlay Schritt 1) — Parität zum VR-Fix aus v0.9.2.
- **VR-Summary zeigt bei falscher Kategorie jetzt die korrekte Kategorie**
  statt «—» (offenes INFO-Item aus dem v0.8.3-Review).
- **Hartcodierte deutsche Strings i18n-isiert:** Innerorts/Ausserorts und
  Gross/Mittel/Klein im Browser-Wichtigkeits-Overlay, «Standort N» und
  «Haupt» in Standort-Markern (Canvas) und Standort-Leiste (HTML).
  Neuer Key `szene.haupt` (de/fr/it/en).

### Gates

- `tsc --noEmit`: 0 Fehler · `vitest`: 46/46 · `playwright`: 12/12 ·
  `vite build`: grün

---

## [0.9.2] — 2026-07-28 — Headset-Feedback zu v0.9.1

### Behoben

- **Weiter-Button zeigte den rohen Schlüssel `scoring.weiter`** statt
  «Weiter»: Der i18n-Schlüssel fehlte in allen vier Sprachen (bestand
  latent seit v0.8.2, sichtbar in den Summary-Footern). Neu:
  `scoring.weiter` = Weiter / Continuer / Avanti / Continue.
- **«Gemäss Tabelle»-Hinweis im Wichtigkeits-Panel entfernt** (VR): Der
  blaue Prefill-Text zeigte die korrekte Wichtigkeit an, bevor der User
  Schritt 1 selbst bewertet hatte — die Trainingsfrage war damit
  vorweggenommen. Panel-Prop `prefillHint` komplett entfernt.

### Gates

- `tsc --noEmit`: 0 Fehler · `vitest`: 46/46 · `vite build`: grün

---

## [0.9.1] — 2026-07-28 — VR-Iter 5: Ergebnis-Didaktik in VR (Browser-Parität)

Schliesst die Darstellungslücke zwischen Browser und VR: Hinweis-Bestätigung,
Lernkarte und Matrix-Herleitung gibt es jetzt in beiden Welten.

### Hinzugefügt

- **VR-Hinweis-Dialog** (`VRHintDialog`, neue Phase `vrHintDialog`): In VR
  aktivierte der Hinweis-Button die Punkte-Penalty bisher sofort und ohne
  Warnung — der Browser hatte den Bestätigungs-Dialog, VR nicht. Jetzt
  erscheint in VR dasselbe Bestätigungs-Panel (Anzahl Hotspots, Abzug,
  «bleibt für die ganze Szene aktiv», Abbrechen/Bestätigen).
- **Scoring-Summary mit drei Seiten** (Wiedererkennung zum Browser-Flow):
  1. *Ergebnis* — wie bisher (richtig/falsch pro Schritt + Punkte),
  2. *Herleitung* — beide normative Matrizen als R3F-Grids
     (`VRMatrix`): Relevanz-Matrix (Wichtigkeit × Abweichung) und
     Unfallrisiko-Matrix (Relevanz SD × Unfallschwere), mit derselben
     Marker-Semantik wie die Browser-CompactMatrix (User-Schnittpunkt grün
     gefüllt bzw. rot bei Fehler, korrekte Zelle grün umrandet,
     User-Achsen hervorgehoben),
  3. *Lernkarte* — Kriterium + Kontext, Norm-Referenzen, Erklärungstext und
     Defizit-Beschreibung, analog zur Browser-LernKarte.
- **Gemeinsames Ergebnis-Modell** `src/data/ergebnisModel.ts` (pure
  Functions): Matrix-Aufbau + Marker-Logik einmal definiert, von VR
  konsumiert; 9 Unit-Tests pinnen zusätzlich alle 18 normativen Zellwerte
  gegen die Sacred-Engine (Regressionsnetz).

### Geändert

- **Browser-HintDialog auf i18n umgestellt** (war hartcodiert Deutsch;
  Keys `szene.hint_*` existierten bereits ungenutzt).
- **Penalty-Text korrigiert:** Dialog behauptete «50% der Punkte» — Browser
  und VR rechnen tatsächlich beide additiv **−25 Punkte**
  (`ScoringFlow.tsx` `hintAbzug`, `App.tsx` VR-Pfad). Texte in de/fr/it/en
  auf die reale Berechnung angepasst; Rechenlogik unverändert.
- `App.VrScoringFeedback` ist jetzt ein Typ-Alias auf
  `SceneViewer.VRScoringSummary` statt eines Feld-Duplikats (war beim
  Erweitern bereits auseinandergedriftet).
- Neuer i18n-Key `scoring.herleitung` (de/fr/it/en).

### Gates

- `tsc --noEmit`: 0 Fehler · `vitest`: 46/46 · `playwright`: 12/12 ·
  `vite build`: grün
- Headset-Smoke-Test Meta Quest 3: ausstehend (Protokoll I in
  `docs/VR_SMOKE_REPORT.md`)

---

## [0.9.0] — 2026-07-28 — VR-Panels verschiebbar

### Hinzugefügt

- **Verschiebbare VR-Panels** (Stevos Wunsch seit VR-Iter 2): Jedes stehende
  VR-Panel hat eine Griffleiste mit Grip-Punkten über der Oberkante.
  Grab-and-Drop mit dem Controller-Ray: Trigger auf der Leiste halten,
  Panel folgt dem Ray, loslassen platziert es. Die Distanz zum User bleibt
  beim Verschieben konstant (Pointer-Capture via View-Plane, verifiziert am
  Quellcode von `@pmndrs/pointer-events`, `dist/intersections/ray.js`).
- **Position persistiert** pro Panel in `localStorage`
  (`rsi-v3-vr-panel-offsets`), gespeichert im Kamera-Koordinatensystem des
  Mount-Zeitpunkts: Das Panel erscheint in jeder Szene und Session an der
  gleichen Stelle relativ zur Blickrichtung. Die drei Bewertungs-Schritte
  (Wichtigkeit/Abweichung/NACA) teilen eine Position (`bewertung`), damit
  das Panel im Flow nicht springt.
- **Doppelklick auf die Griffleiste** setzt das Panel auf die
  Default-Position zurück und löscht den gespeicherten Offset.
- **Clamp-Sicherheitsnetz**: Offsets werden auf x ±1.6 m, y ±1.1 m,
  z −0.5 bis −3.0 m begrenzt — ein Panel kann nicht ausser Reichweite oder
  hinter den User geraten.
- Neues Util `src/utils/vrPanelOffsets.ts` (Laden defensiv gegen kaputtes
  JSON und falsche Typen) mit 13 Unit-Tests (`vrPanelOffsets.test.ts`).

### Verschiebbar sind

Fortschritts-Panel (`progress`), Kontroll-Leiste (`controls`),
Kategorie-Panel (`kategorie`), Bewertungs-Panels W/A/N (gemeinsam
`bewertung`), Scoring-Summary (`summary`), Alle-gefunden-Banner
(`allfound`). Das transiente Klick-Feedback (Auto-Close nach 1.5–2 s)
bleibt bewusst fix.

### Gates

- `tsc --noEmit`: 0 Fehler · `vitest`: 37/37 · `vite build`: grün
- Headset-Smoke-Test Meta Quest 3: ausstehend (Protokoll H in
  `docs/VR_SMOKE_REPORT.md`)

---

## Versionierungs-Konvention (seit v0.8.2)

- **Patch-Releases** (`0.8.x`): VR-Iterationen und Hotfixes.
  Jeder VR-Release bekommt eine **VR-Iter-Nummer** im Titel.
- **Minor-Bump auf `0.9.0`**: reserviert fuer das groessere Feature
  "VR-Panels verschiebbar machen" + weitere Architektur-Arbeit.

Aktuelle VR-Iterationen:
- `v0.8.0` = VR-Iter 1 — Smoke-Ready (Haptik, HUD-Timer, Farb-Marker)
- `v0.8.1` = VR-Iter 2 — Bewertungs-Panels, Ray-Reticle, groesserer Hover
- `v0.8.2` = VR-Iter 3 — Scoring-in-VR, Fadenkreuz-Vergroesserung
- `v0.8.3` = VR-Iter 4 — Review-Fixe (XR-Session-Lifecycle, VR-i18n, UX)

---

## [0.8.3] — 2026-06-01 — VR-Iter 4: Multi-Agent-Review-Fixe

Umsetzung der Befunde aus einem 5-dimensionalen Code-Review (Fokus
Browser↔VR-Wechsel + Aufgabenerfüllung), jedes Finding adversarial verifiziert.

### Behoben — kritisch

- **Verwaiste XR-Session beim Szenenende (M1).** Beendete der Inspektor die
  Szene aus VR (VRControlBar/VRAllFound → `onBeenden`), unmountete der
  SceneViewer samt `<XR>`, aber die immersive-vr-Session lief weiter — das
  Headset blieb in einer toten Szene hängen (auf der Quest kein ESC).
  `xrStore.exitVR()` existierte nur als Kommentar. Fix: `handleBeenden` beendet
  die Session aktiv via `session.end()`; zusätzlich Unmount-Cleanup im
  SceneViewer als Sicherheitsnetz. Irreführenden Kommentar korrigiert.
- **VR-Modus komplett ohne i18n (M2).** Alle VR-Panels (Kategorie, W/A/N,
  Scoring-Summary, ControlBar, AllFound, Feedback) zeigten hartcodiertes Deutsch
  — fr/it/en-Inspektoren erlebten den ganzen VR-Fluss auf Deutsch. Fix: `t` als
  Prop durch `SceneContent` an alle VR-Panels gereicht; `VR_KATEGORIEN`/
  `VR_NACA_OPTIONS`/`VR_FEEDBACK_CFG` auf bestehende i18n-Keys umgestellt; neuer
  `vr`-Block in de/fr/it/en; `deficitName` via `ml()`.

### Behoben — Scoring

- **`punkteRoh` inkonsistent (S1).** VR speicherte `rohPts + katPts`, Browser
  `rohPts` — die persistierte Roh-Statistik divergierte um 25 Punkte (Endscore
  war korrekt). VR-Pfad auf reine 9-Schritte-Punkte vereinheitlicht.
- **`KATEGORIE_PUNKTE` im Browser hartcodiert (Q2).** ScoringFlow nutzte das
  Literal `25` statt der SACRED-Konstante → Drift-Risiko bei Norm-Änderung.

### Behoben — VR-UX

- **Reticle 10–20× zu klein (S2).** `aimPos` lag auf der Sphere bei Radius 500
  statt 60 → der Ray-Zielring war winzig. Auf Radius 60 normalisiert.
- **Kein Abbrechen in VR-Bewertung (S3).** Die Panels W/A/N hatten keinen
  Zurück-Weg (und auf der Quest kein ESC) — Fehleingaben waren nicht
  korrigierbar. Abbrechen-Button pro Panel ergänzt.
- **`vrScoringSummary` fehlte im VR-Exit-Reset (S4).** Headset-Abnahme während
  des Summary-Panels liess die Phase hängen. In `handleVRModeChange` aufgenommen.
- **Verwaister Pending-Timer (S5).** Der 5s-Auto-Ausblend-Timer wurde von ESC /
  VR-Wechsel nicht gecleart und konnte aus einer anderen Phase zurückreissen.
  Phasen-Guard im Timer-Callback + Unmount-Cleanup.
- **Standortmarker während VR-Bewertung klickbar (Q3).** Per Phasen-Gate nur
  noch in exploring/pendingConfirm aktiv; Refs defensiv geräumt.
- **Doppelter Bewertungs-Abschluss-Pfad (Q4).** HTML-NACA-Overlay nutzt jetzt
  `handleBewertungN` statt duplizierter Payload-Logik (ein Pfad, ein Null-Guard).
- **`enterVR()` ohne Fehler-Handling (Q5).** `.catch()` ergänzt — kein stiller
  Fehlschlag / unhandled rejection mehr auf Nicht-WebXR-Browsern.

### Geändert

- ASCII-Ersatzschreibungen in VR-User-Texten (`waere`, `maessige`,
  `geringfuegige`, `Gemaess`) durch echte Umlaute ersetzt (via i18n aufgelöst).

Gates: tsc 0, vitest 24/24, Production-Build grün. Keine Sacred-File-Änderung.

---

## [0.8.2] — 2026-04-24 — VR-Iter 3: Scoring-in-VR

### Behoben — kritisch

- **VR-Session wurde nach der Bewertung beendet.** `handleDeficitConfirmed`
  in App.tsx schaltete auf `view='scoring'` und rief
  `xrStore.session.end()` — der User flog aus der Immersion raus und
  musste ueber den 2D-HTML-ScoringFlow wieder zurueck ins Headset.
- Fix: Weichenlogik. In VR wird der volle ScoringFlow uebersprungen.
  Stattdessen berechnet App.tsx die Punkte direkt (analog zu
  `ScoringFlow.renderResult`) und liefert ein neues
  `vrScoringFeedback`-Payload an den SceneViewer.
- Neuer `VRScoringSummaryPanel`: zeigt Richtig/Falsch pro Schritt
  (Kategorie, Wichtigkeit, Abweichung, Unfallschwere) + Punkte-Resultat
  + Weiter-Button. User bleibt durchgehend in der XR-Session.
- Der volle ScoringFlow mit Matrix-Drilldown bleibt im Browser
  erreichbar — im VR-Kontext bewusst reduziert fuer schnelles
  Durcharbeiten vieler Defizite.

### Geaendert

- **Fadenkreuz vergroessert**: Reticle-Ring `0.70/0.95 → 1.4/1.75`,
  Innenpunkt `0.18 → 0.35`. Feedback von Stevo: war vorher zu dezent.

### Hinzugefuegt

- `App.tsx` Export `VrScoringFeedback`-Interface.
- `SceneViewer` Export `VRScoringSummary`-Interface.
- Neue Phase `vrScoringSummary` in SceneViewer.
- Neue Props fuer SceneViewer: `vrScoringFeedback`, `onVRScoringContinue`.

### Gates

- `tsc --noEmit`: 0 Fehler
- `vitest`: 24/24 passed
- `playwright`: 12/12 passed in 7.8 s

### Offen fuer v0.9.0 (aus Stevos Feedback)

- **VR-Panels verschiebbar** (Grab-and-drop oder Stick-Drag). Grosser
  Scope, separates Release — rechtfertigt den Minor-Bump.

---

## [0.8.1] — 2026-04-24 — VR-Iter 2: Bewertungs-Panels + Reticle

### Behoben — kritisch

- **VR-Flow blieb nach Kategorie-Auswahl haengen.** Die Bewertungs-Phasen
  (Wichtigkeit/Abweichung/NACA) hatten nur HTML-Overlays im Browser —
  in VR unsichtbar, Phase sass fest. Drei neue 3D-Panels im
  `VRKategoriePanel`-Stil:
  - `VRBewertungWPanel` — Wichtigkeit (klein/mittel/gross) inkl.
    Kriterium-/Kontext-Anzeige + Tabellen-Hinweis
  - `VRBewertungAPanel` — Abweichung mit Beschreibung je Option
  - `VRBewertungNPanel` — NACA-Schwere (leicht/mittel/schwer) mit
    Farbakzent + Sub-Text
- Drei neue Callbacks im SceneViewer (`handleBewertungW/A/N`) mit
  derselben State-Logik wie die Browser-Overlays, sodass am Ende
  `onDeficitConfirmed` an App.tsx geht und die Session weiterlaeuft.

### Hinzugefuegt

- **VR-Ray-Reticle** (Orientierungshilfe): kleiner weisser Ziel-Ring mit
  Punkt am Hit-Punkt des Controller-Rays auf der Panorama-Sphere.
  Sichtbar nur in VR, nur waehrend Phase `exploring`. `PanoramaSphere`
  bekam `onPointerMove` + `onPointerOut` Handler dafuer.
- **Standort-Marker-Hover groesser**: von `3.2` auf `4.5` — Feedback
  nach Stevos Rueckmeldung, dass die Vergroesserung zu dezent war.

### Gates

- `tsc --noEmit`: 0 Fehler
- `vitest`: 24/24 passed
- `playwright`: 12/12 passed in 7.7 s

### Offen fuer v0.9.0 (aus Stevos Feedback)

- VR-Panels verschiebbar machen (Grab-and-drop oder Pre-Set-Positionen).
- Zweiter Headset-Test nach diesem Hotfix — neues Feedback wieder in
  `docs/VR_SMOKE_REPORT.md` Abschnitt 6 eintragen.

---

## [0.8.0] — 2026-04-24 — VR-Iter 1: Smoke-Ready (Phase 3, Teil 1)

### Hinzugefuegt — VR-Orientierung & -Feedback

- **Haptisches Controller-Feedback** (`src/utils/vrHaptics.ts`).
  Controller-Rumble bei Defizit-Treffer (kurzer starker Puls 0.85/80 ms),
  Miss (doppelter weicher Puls 0.40/60 ms), bereits-gefunden (mittlerer
  Puls 0.55/120 ms). Beide Controller gleichzeitig — unabhaengig von der
  klickenden Hand. No-op ausserhalb VR-Session, kein Error wenn Geraet
  keinen HapticActuator unterstuetzt.
- **VR-HUD-Timer**: `VRProgressPanel` zeigt rechts oben die seit
  Szenenstart verbrauchte Zeit im Format `MM:SS`, tickt jede Sekunde.
  Tick-Interval laeuft nur waehrend `isVR === true`.
- **Farb-codierte Standort-Marker**: `StandortNavMarker` unterscheidet
  jetzt zwischen `'unbesucht'` (neutral hellgrau) und `'besucht'` (gruen,
  konsistent mit Hotspot-Found). Besuchs-Historie per `visitedPerspektiven`
  Set im SceneViewer, startet mit dem Haupt-Panorama-Eintrag.

### Geaendert

- `SceneViewer` akzeptiert neue Props `sceneStartTime: number` (aus
  App.tsx) fuer den HUD-Timer.
- `StandortNavMarker` hat neue Pflicht-Prop `status: 'unbesucht' | 'besucht'`.

### Dokumentation

- `docs/VR_SMOKE_REPORT.md` neu — strukturierter Test-Plan fuer den
  physischen Meta-Quest-Smoke-Test. Inventar der bestehenden
  VR-Komponenten, offene Punkte, Test-Checkliste A-G fuer Stevo.

### Nicht umgesetzt (bewusst verschoben)

- Teleport-Pointer — im 360°-Panorama nicht sinnvoll, bleibt
  `teleportPointer: false`.
- Kompass, Distanz-Indikator, Audio-Cues, Head-Reset — Ideen 2/5/6 fuer
  v0.9.0, brauchen weiteren Scope-Entscheid.

### Gates

- `tsc --noEmit`: 0 Fehler
- `vitest`: 24/24 passed
- `playwright`: 12/12 passed in 7.6 s

### Nach Deploy

Physischer Smoke-Test durch Stevo mit Meta Quest 3 (siehe
`docs/VR_SMOKE_REPORT.md` Abschnitt 4). Ergebnisse in Abschnitt 6
nachtragen, dann v0.9.0-Scope entscheiden.

---

## [0.7.0] — 2026-04-24

### Refactor — Sprint 3 Schritt 1 (Modal-Split AdminDashboard)

- **`AdminDashboard.tsx` von 1'981 auf 786 LoC reduziert** (-60 %). Die
  vier Modals (Defizit, Szene, Thema, Kurs) und sieben Hilfskomponenten
  (Section, SelectField, AutoField, MLInput, MLTextarea, NormRefPicker,
  VorschaubildEditor) liegen jetzt in eigenen Dateien unter
  `src/components/admin/{modals,fields,utils}/`.
- Jedes Modal haelt **eigenen Draft-State** und liefert bei Save das
  fertige Objekt zurueck. Persistenz (saveDeficit / saveScene / saveTopic
  / saveKurs) bleibt im Parent.
- Verhaltensneutral — Norm-Hook, Focus-Trap und ESC-Handling pro Modal
  bleiben erhalten.

### Test — Sprint 3 Schritt 2 (E2E-Tests)

- **12 Playwright-Specs** (landing, admin, sceneviewer) in 6.7 s lokal.
  Absichern des Modal-Splits und der zentralen User-Journeys.
- Neue Infrastruktur: `playwright.config.ts`, Fixtures fuer
  localStorage-Seed, Supabase-Stub und `reducedMotion`-Overrides.
- `.github/workflows/e2e.yml` — Chromium in CI auf Push/PR.
- `src/App.tsx`: `MotionConfig reducedMotion="user"` damit Framer-Motion
  das prefers-reduced-motion-Signal konsequent honoriert (sonst
  blockierte `AnimatePresence mode="wait"` Exit-Animationen trotz
  CSS-Override den View-Wechsel in E2E).

### Breaking — Sprint 3 Schritt 3 (Server-Salt-Pfeffern, Hard-Cutover)

- **Alle laufenden Kurs-Passwoerter werden ungueltig.** Admin muss sie
  im Admin-Dashboard neu setzen. Grund: Client-seitiges SHA-256-Hashing
  (`kp:<hash>` v1) wurde komplett entfernt; ersetzt durch serverseitiges
  PBKDF2-HMAC-SHA256 mit 100'000 Iterationen, per-Kurs-Salt und globalem
  Server-Pepper.
- **Deploy-Reihenfolge** (Stevo, vor Release):
  1. SQL-Migration `supabase/migrations/2026_04_24_kurs_passwort_pfeffer.sql`
     im Supabase-Dashboard ausfuehren. Fuegt Spalte `passwort_hash` hinzu,
     entzieht anon SELECT-Recht fuer diese Spalte, entfernt bestehende
     `data.passwort`-Eintraege.
  2. Supabase-Secret `KURS_PASSWORT_PEPPER` setzen (32 hex bytes,
     `openssl rand -hex 32`). **Niemals rotieren** ohne alle Hashes zu
     invalidieren.
  3. Edge Function `admin-write` mit v0.7.0-Code redeployen (hasht
     serverseitig, schreibt `passwort_hash`).
  4. Neue Edge Function `kurs-auth` deployen (PBKDF2-Vergleich, gibt
     `{ ok: true | false }` zurueck).
  5. Client-Release.
- **Rollback**: `ALTER TABLE rsi_kurse DROP COLUMN passwort_hash`,
  `GRANT SELECT ON rsi_kurse TO anon`. Alle neu gesetzten Passwoerter
  sind dann verloren.

### Hinzugefuegt

- Edge Function `supabase/functions/kurs-auth/` — verifiziert Kurs-
  Passwoerter serverseitig gegen `passwort_hash` mit PBKDF2 + Pepper.
- `Kurs.hatPasswort?: boolean` — vom Server gesetzt, Client-UI nutzt
  das Flag statt die alte `istPasswortHash()`-Heuristik.
- `Kurs.passwort?: string | null` wird jetzt als **Intent**-Feld
  interpretiert: non-empty string = hashen, null = entfernen, undefined =
  unveraendert lassen.
- Unit-Tests fuer `pruefeKursPasswort` gegen Fetch-Mock (8 Szenarien).

### Entfernt

- `hashKursPasswort()` und `istPasswortHash()` aus `src/data/appData.ts`.
  Kein Klartext-Hash und kein Hash-Marker-Check mehr im Client-Bundle.
- Zugehoerige Unit-Tests (6 Stueck).

### Sicherheitsmodell

- **Rainbow-Tables wirkungslos** (Per-Kurs-Salt).
- **GPU-Brute-Force ausgebremst** (~10^9/s → ~10^3/s durch PBKDF2 100k).
- **Offline-Brute-Force blockiert**, solange der Pepper nicht leaked —
  der Hash selbst ist via anon-SELECT nicht mehr abrufbar.
- **Timing-safe Hash-Compare** via Padding-Trick in der Edge Function.

---

## [0.6.4] — 2026-04-24

### Behoben — Bugs waehrend v0.6.3-Nutzung aufgetreten

- **Avatar-Popover unerreichbar im reinen Admin-Modus.** Ohne vorherigen
  User-Login war kein username gesetzt → Avatar ausgeblendet → neuer
  "Admin-Rolle ablegen"-Eintrag nicht auffindbar. Avatar erscheint jetzt
  auch bei `isAdminAuth` mit ShieldCheck-Icon statt Initiale.
- **Admin-Flag leakte beim User-Login.** Wer sich als Admin angemeldet
  hatte und dann ohne expliziten Logout einen neuen Usernamen setzte,
  sah den Admin-Button weiter. `handleLogin()` raeumt die Flags jetzt.
- **Admin-Logout** jetzt als eigener Popover-Menueintrag verfuegbar
  (ShieldOff-Icon, akzentuiert). Raeumt nur Admin-Flags, User-Session
  bleibt.
- **Kurs-Save-Fehler wurden still geschluckt.** Supabase-Fehler bei
  Edge-Function-Calls zeigen jetzt einen konkreten Alert mit
  Ursachen-Checkliste (SQL-Migration? admin-write-Redeploy? Token?).
- **Ranking-Zugangscode-Matching case-sensitive.** Normalisiert jetzt
  mit `.trim().toLowerCase()`. Placeholder auf "z.B. FK-RSI-123456"
  (statt irrefuehrendem Relikt "FaSi4safety"). autoCapitalize=off.
- **Ranking/LandingPage laden Kurse asynchron nach Supabase-Fetch nach.**
  `supabaseSync.initSupabaseData()` feuert ein `rsi-data-loaded`-Event,
  Komponenten mit Kurs-Dropdowns lauschen darauf und aktualisieren ihre
  Listen ohne Manual-Reload.

### Qualitaet — Quick Wins aus Review v0.6.2

- **Alpha-Suffix-Hex migriert** auf `color-mix(in srgb, var(--zh-X) N%, transparent)`
  in `AdminDashboard` (Badge-BGs) + `ScoringFlow` (4 Stellen). Dark-Mode
  folgt jetzt automatisch.
- **Zentraler Logger** `src/lib/logger.ts` — info/debug nur in Dev,
  warn/error zusaetzlich an Sentry (wenn DSN gesetzt). 30+ `console.*`-
  Aufrufe in `appData`, `supabaseSync`, `supabaseStorage` umgestellt.
  Kein User-Noise mehr in Production DevTools Console.
- **Dark-Mode-Audit:** 5 textkritische Stellen in `LernKarte` und
  `SceneViewer` mit hart kodiertem `rgba(0,118,189,...)` → jetzt
  `color-mix(... var(--zh-blau) ...)`. rgba()-Weisstoene in
  Overlay-Kontexten bleiben bewusst theme-unabhaengig.

### Nicht in diesem Release (eigener Sprint noetig)

- **Modal-Split AdminDashboard** (1949 LoC → ~1200 LoC durch 4 extrahierte
  Modale). Abhaengigkeiten auf Parent-State + Shared-Helpers sind
  substanziell; ohne dedizierte Browser-Verifikation (Focus-Trap, ESC,
  i18n, Tab-Order) waere das Regression-Risiko hoch. Gestaffelt in
  eigenem Sprint: ThemaModal → KursModal → SzeneModal → DefizitModal.
- **Server-seitiges Salt-Pfeffern** fuer Username-Hash (Post-Pilot).
- **PIN 4 → 6+ Stellen + DB-Rate-Limiter** (bewusst verschoben vom User).
- **E2E-Tests (Playwright)** fuer Kern-Flow Login → Szene → Ranking.

---

## [0.6.3] — 2026-04-24

### Behoben — kritisch

- **Impressum/Datenschutz/Glossar-Links auf LandingPage gingen ins Leere.**
  Ursache: `navigateFallbackDenylist` im Service Worker hatte `$`-Anchor
  (`/^\/impressum\.html$/`), Landing-Page haengt aber `?lang=de` an die URL
  an — damit matchte die Denylist nicht und der SW routete auf die App-Shell.
  Fix in `vite.config.ts`: Anchor entfernt; `runtimeCaching` Pattern um
  Query erweitert (`(\?.*)?$`).
- **Kurse wurden nicht in Supabase gespeichert, nur in localStorage.**
  Folge: Admin legte Kurs an → nur im Admin-Browser sichtbar, Teilnehmer-
  Devices kannten den Kurs-Code nicht. Fix:
  - Neue Supabase-Tabelle `rsi_kurse` (Migration:
    `supabase/migrations/2026_04_24_rsi_kurse.sql` — muss im Dashboard
    ausgefuehrt werden).
  - Edge Function `admin-write`: `ALLOWED_TABLES` + `TABLE_SCHEMAS` um
    `rsi_kurse` erweitert (Redeploy noetig).
  - `supabaseSync.ts`: `saveKursSupabase()`, `deleteKursSupabase()`,
    `getKurseSync()`, Init-Load, Seed.
  - `appData.ts` `saveKurs()` + `deleteKurs()`: fire-and-forget Supabase-
    Push analog zu Topics/Scenes/Deficits.

### Qualitaet

- **Vitest-Setup** (Must-Fix #1 aus 21-Rollen-Review): 26 Unit-Tests in
  3 Files (`scoreCalc`, `sphereCoords`, `kursPasswort`). Scripts:
  `npm test`, `npm run test:watch`, `npm run coverage`.
- **Neuer Design-Token `--zh-warnung`** (`#F0A500` hell / `#FFC24D` dunkel):
  dokumentiert die bisher als Roh-Hex verstreute Hint-Farbe. JSX-Stellen
  in `LernKarte`, `SceneViewer` migriert. R3F-/Canvas-Stellen bleiben
  roh-Hex (R3F-Material + Canvas-2D unterstuetzen keine CSS-Variablen).

### User-Aktionen nach Update

1. **SQL-Migration im Supabase-Dashboard ausfuehren:**
   `supabase/migrations/2026_04_24_rsi_kurse.sql`
2. **Edge Function `admin-write` redeployen** (Code aus
   `supabase/functions/admin-write/index.ts`).
3. **Einmaliger Kurs-Seed:** Als Admin anmelden, Seed-Button ausloesen
   (oder `localStorage.setItem('rsi-v3-seed-consent','1') + Reload`) —
   lokale Kurse werden in die neue Supabase-Tabelle geschrieben.

---

## [0.6.2] — 2026-04-21 (Hotfix: Crash + Build + Recovery)

Schneller Patch-Release nach Pilot-Feedback «Seite startet online nicht
mehr». Drei voneinander unabhängige Ursachen gefunden und ausgeräumt.

### Behoben
- **`ml()`-Crash in TopicDashboard**: Ein Müll-Topic `__rl_test__` aus
  dem N-2-Rate-Limit-Test (Commit 2b7877e) lag in `rsi_topics` mit
  `nameI18n=undefined` und `beschreibungI18n=undefined`. Beim Login
  warf `text[lang]` einen `TypeError`, der `<Sentry.ErrorBoundary>`
  griff, der User sah nur «Es ist ein Fehler aufgetreten». `ml()`
  fällt jetzt auf Leerstring zurück und loggt den defekten Eintrag,
  die App rendert trotz kaputter Daten weiter.
- **CI-Pipeline «Verify PWA artifacts» schlug seit v0.6.1 fehl**:
  Vite 8 nutzt Rolldown by default, `vite-plugin-pwa` (weder 0.19.8
  noch 1.2.0) unterstützt Rolldown offiziell. Folge:
  `generateBundle`-Hook wurde von Rolldown ignoriert
  («This plugin assigns to bundle variable... will be ignored»),
  `dist/sw.js` wurde auf Ubuntu-CI nie erzeugt. Downgrade auf
  Vite 7.3.2 (stabile Rollup-Version) + Upgrade auf
  vite-plugin-pwa 1.2.0. Build produziert reproduzierbar `sw.js`,
  `workbox-*.js`, `registerSW.js`. CI-Run 24704768797 grün in 57s.

### Hinzugefügt
- **Auto-SW-Recovery im ErrorBoundary**: `src/main.tsx` bekommt einen
  zweiten Button «Zurücksetzen & neu laden», der alle Service Worker
  deregistriert und die `CacheStorage` löscht — localStorage bleibt
  erhalten (User-Daten, Kurs-Session). Dazu ein
  `controllerchange`-Listener auf Top-Level: wenn nach einem Deploy
  ein neuer SW via `skipWaiting+clientsClaim` die Kontrolle
  übernimmt, lädt die Seite automatisch einmal neu. Verhindert die
  wiederkehrende Klasse von «Seite hängt auf altem Precache»-Fehlern
  nach zukünftigen Deploys.
- **`scripts/scan_i18n.mjs`**: Diagnose-Script, das
  `rsi_topics` / `rsi_scenes` / `rsi_deficits` auf fehlende oder
  leere i18n-Felder scannt. Liest `.env.local`, nutzt den Anon-Key
  per PostgREST-SELECT, listet betroffene Rows mit
  ID / topic_id / scene_id + fehlende Keys.

### Geändert (Tooling)
- **GitHub-Actions-Deprecation behoben**: `actions/checkout@v4` →
  `@v6` und `actions/setup-node@v4` → `@v6` (beide Node-24-Actions).
  `node-version` auf CI von `"20"` auf `"22"` gehoben (aktuelle
  LTS-Linie). Vermeidet die ab 2026-06-02 greifende
  Node-20-Deprecation.
- **Supabase-Cleanup** (manuell ausgeführt am 2026-04-21 im
  Dashboard-SQL-Editor, nicht als Migration persistiert):
  ```sql
  DELETE FROM rsi_topics WHERE id = '__rl_test__';
  UPDATE rsi_scenes
  SET data = jsonb_set(
    data::jsonb, '{kontextI18n}',
    '{"de":"","en":"","fr":"","it":""}'::jsonb)
  WHERE id = 'SZ_2026_001';
  ```

### Noch offen (Post-Pilot)
- Defense-in-Depth in Edge Function `admin-write`: Test-Payloads mit
  `id=__rl_test__` oder komplett leeren i18n-Feldern ablehnen.
- Vite 8 wiederaufnehmen, sobald `vite-plugin-pwa` offiziell
  Rolldown-kompatibel wird (voraussichtlich mit Workbox-Ersatz oder
  eigenem SW-Plugin für die v8-Linie).

---

## [0.6.1] — 2026-04-20 (Sprint-2 a11y + CI + Doku)

Patch-Release nach v0.6.0 mit Accessibility-Nachbesserungen, erster
CI-Pipeline und Dokumentations-Synchronisation auf den aktuellen Stand.

### Hinzugefügt
- **GitHub Actions CI** (`.github/workflows/ci.yml`): `npm ci` → `tsc --noEmit`
  → `vite build` → PWA-Artefakt-Verifikation. Läuft bei jedem Push und PR
  auf `main`.
- **Admin-Modale mit `useFocusTrap` + ESC-Handler**: alle 4 Modale
  (Defizit, Szene, Thema, Kurs) haben jetzt Focus-Trap (WCAG 2.4.3) und
  schliessen bei ESC (WCAG 2.1.2). `role="dialog"` + `aria-modal="true"`
  auf den Content-Containern.

### Geändert (Dokumentation)
- **BACKUP.md** komplett neu: Supabase-DB-Backup (PITR/Manual),
  Storage-Bucket-Sicherung, localStorage-Export via Admin-Dashboard.
  Alte Annahme «Panorama-Texturen im Repo» korrigiert (seit v0.5.0 im
  Supabase Storage Bucket).
- **ADMIN_HANDBUCH.md** auf v0.6.0: Token-Flow-Erklärung, neue
  Env-Tabelle (VITE_ADMIN_PIN raus, Server-Secrets ADMIN_PIN +
  ADMIN_TOKEN_SECRET), Edge-Function-Deploy-Abschnitt,
  PIN-Rotations-Prozess.
- **README.md** auf v0.6.0: Projektstruktur komplett aktualisiert (neue
  Files, Edge-Functions-Pfad, glossary.ts entfernt), Tech-Stack erweitert,
  Supabase-Setup dokumentiert, CI-Pipeline erwähnt.
- **META_STORE_CHECKLIST.md**, **BROWSER.md**, **OFFLINE.md**:
  Versions-Label auf v0.6.0 gehoben (inhaltlich weitgehend unverändert).
- Delegiert an einen Doku-Agent, plus direkte Ergänzungen für README und
  ADMIN_HANDBUCH durch Haupt-Orchestrator.

### Offen (Sprint 3)
- BENUTZERHANDBUCH.md noch nicht aktualisiert
- AdminDashboard.tsx Modal-Split (Komponenten-Grösse 1'949 LoC)
- SceneViewer VR-Feedback-Strings auf i18n
- SceneViewer/BildEditor/appData entflechten

---

## [0.6.0] — 2026-04-20 (Sprint-1 Security-Härtung + Branding + a11y)

Grosser Post-v0.5.0-Sprint nach 16-Rollen-Review mit Fokus auf echte
Security-Härtung (PIN aus Bundle raus), Branding-Update, Accessibility
und i18n-Konsistenz. Pilot-bereit nach dieser Version.

### Hinzugefügt
- **TBA ISSI-Ausbildungslogo + Wortmarke «RSI VR Tool»** in Navbar und
  LandingPage-Top-Bar. Neue Komponente `IssiLogo.tsx` rendert beide
  Varianten (hell/dunkel) und schaltet via `[data-theme="dark"]`-CSS.
  KTZH-Konvention: `_hell.png` für helle Umgebung, `_dunkel.png` für
  dunkle. Ersetzt den alten Shield-SVG + «RSI-Immersive»-Text.
- **Theme-Toggle auf LandingPage** (Sun/Moon-Button neben Admin). Props
  `theme` + `onToggleTheme` von App.tsx durchgereicht. Hell/Dunkel auch
  vor Login wählbar.
- **Löschen-Button für Oberthemen im Admin** (Trash2 neben Archivieren).
  `handleDeleteThema` mit Confirm-Dialog, der Kaskaden-Umfang nennt
  (X Untergruppen, Y Szenen inkl. aller Defizite).
- **Edge Function `admin-auth`** (`supabase/functions/admin-auth/`):
  neue Deno-Function, tauscht PIN gegen HMAC-signiertes Token
  (`<expires>.<base64-hmac>`, 2 h TTL, signiert mit Secret
  `ADMIN_TOKEN_SECRET`). Padding-Timing-Safe-Compare verhindert
  Length-Leak. CORS-Whitelist (Vercel + localhost).

### Geändert (Sicherheit)
- **Admin-PIN aus dem Client-Bundle entfernt**: `VITE_ADMIN_PIN` wird
  nicht mehr gelesen. LandingPage schickt PIN an Edge Function
  `admin-auth`, erhält Token, speichert es in
  `sessionStorage['rsi-admin-token']`. `supabaseSync.ts` schickt
  `x-admin-token`-Header statt `x-admin-pin`. Bei 401 wird Token +
  Auth-Flag automatisch gerkaeumt.
- **`admin-write` härtet**: Token-Verifikation statt PIN-Check,
  CORS-Whitelist statt `*`, Payload-Schema-Validation pro Tabelle
  (Whitelist Felder, Typ-Checks, 256-KB-Row-Size-Limit, max 200 Rows
  pro Upsert). 128er-Padding-Timing-Safe-Compare für Token.
- **RLS-Verschärfung** (bereits eingeflossen in H-2): Content-Tabellen
  `rsi_topics/scenes/deficits` sind anon **nur noch SELECT**. Doppelte
  Alt-Policies (`{public}` + `{anon, authenticated}`) aufgeräumt.
- **`rsi_results.DELETE`** für anon entfernt — nur noch admin-seitig
  löschbar, Ranking ist nicht mehr frei manipulierbar.
- **Dependency-Audit**: `npm audit fix --force` ausgeführt. Verbleiben
  3 high in Dev-Toolchain (`serialize-javascript` via `workbox-build`),
  kein Runtime-Impact, auf Backlog.

### Geändert (Accessibility + i18n)
- **Navbar-Touch-Targets auf 44×44 px** (WCAG 2.5.5 AA): Theme-Toggle
  und Avatar-Button. Icon-Grössen proportional angepasst.
- **i18n-Key-Konsistenz repariert**: 16 Keys in `fr/it/en.json` hatten
  ASCII-Varianten (`kurs_loeschen`, `uebertrag_auto` etc.) während der
  Code und `de.json` Umlaut-Varianten nutzen (`kurs_löschen`,
  `übertrag_auto`). Nicht-DE-Sprachen fielen bei diesen Keys auf
  Fallback-Text zurück. Alle 4 Sprachen jetzt synchron (je 473 Keys,
  0 Diff).
- **Hartcodierte User-Strings entfernt**: «Feedback senden» (Navbar),
  «Neuer Bestwert!» (SzenenAbschluss), «Hinweis genutzt» +
  «Einstiegshilfe bfu» (ScoringFlow) jetzt via `t()`. Neue Keys
  `popover.feedback`, `scoring.hinweis_genutzt` in allen 4 Sprachen.

### Behoben
- **PWA-Routing**: `runtimeCaching` NetworkFirst für
  `/impressum|datenschutz|glossar.html` als Belt-and-braces gegen
  Alt-Service-Worker aus v0.4.x, die die App-Shell für diese Pfade
  gecacht hatten.
- **Logo-Doppelanzeige**: Inline-Style `display:block` überschrieb
  die CSS-Regel `display:none` — korrigiert in `IssiLogo.tsx`, plus
  `!important` in `index.css` gegen Tailwind-Preflight.
- **Logo hell/dunkel invertiert** (Erst-Deploy): beim zweiten Deploy
  korrekt auf KTZH-Konvention zugeordnet.

### Infrastruktur
- **H-1 PIN-Rotation**: Admin-PIN von `2847` auf `5004` rotiert (lokal,
  Vercel, Supabase-Secret).
- **N-2 Rate-Limit**: In-Memory-Counter verworfen (Multi-Instance-
  Problem), als akzeptiertes Pilot-Risiko dokumentiert. DB-basierter
  Limiter auf Backlog.

### Noch offen (Sprint 2, geplant für heute/diese Woche)
- AdminDashboard.tsx (1'926 LoC) in DefizitTab, ThemenTab, KurseTab,
  ExportImportTab splitten
- SceneViewer.tsx (1'556 LoC) und BildEditor.tsx (1'449 LoC)
  entflechten
- Admin-Modale mit `useFocusTrap` + ESC-Handler versehen
- Handbücher (ADMIN_HANDBUCH, BENUTZERHANDBUCH, BACKUP.md, README)
  auf Stand v0.6.0 bringen (bisher v0.3.1)
- Minimale GitHub-Actions-CI (`npm ci && npm run build` auf PR + main)
- SceneViewer VR-Feedback-Strings auf i18n umstellen (Refactor nötig,
  `VR_FEEDBACK_CFG` muss in `useVRFeedbackCfg()`-Hook)
- NACA-Subtexte in ScoringFlow bereits via i18n, aber an einzelnen
  Stellen noch hartcodiert

### Sicherheit — Post-Pilot (Backlog)
- PIN auf 6+ Stellen erweitern (10'000 → 1'000'000 Kombinationen)
- DB-basierter Rate-Limiter in `admin-auth`/`admin-write` (Tabelle
  `admin_auth_fails(ip, ts)`, SELECT count WHERE ts > now()-60s,
  Schwelle 10/min → `429`)
- Supabase Auth mit Admin-Rolle (Magic Link) ersetzt PIN-Shared-Secret
- Storage-Listing via Edge Function → broad SELECT-Policy auf
  `storage.objects` entfernen
- `VITE_SENTRY_DSN` setzen (Error-Tracking aktivieren — im Code seit
  v0.3.1 integriert, DSN für Pilot bewusst leer gelassen)
- VITE_USERNAME_SALT zusätzlich serverseitig peppern (Bundle-Leak)
- Admin-Audit-Tabelle (`admin_audit`) für Schreibvorgänge
- Löschkonzept für `rsi_results` (90-Tage-TTL via Cron, revDSG)

---

## [0.5.0] — 2026-04-20

Grosser Beta-Polishing-Sprint mit 16 Commits: Bilder-Pipeline, Supabase
Storage als Single Source, LandingPage Variante B, ID-Format SZ_2026_NNN,
Defizit-Editor-UX, Pikto-Katalog, Norm-Suchfeld, a11y-Pack, Security-Fix.

### Hinzugefügt
- **Supabase Storage als Single Source of Truth** (`rsi-textures`-Bucket):
  neuer Helper `src/lib/supabaseStorage.ts` mit upload/list/delete,
  BildUpload mit Tabs «Bibliothek» (Akkordeon nach Szene) + «Hochladen»
  (automatischer Pfad `panoramas/{szeneId}/{filename}`)
- **Eindeutige IDs**: Szenen `SZ_2026_NNN` (mit Jahr), Defizite `SD_NNNN`
  (`src/data/idGenerator.ts`). Bestandsdaten mit Legacy-IDs bleiben gültig.
- **Trainer-Hinweis pro Szene**: `bemerkungI18n` (optional), wird im
  TrainingEinstieg als gelber Hinweis-Block vor dem Start angezeigt
- **Booster mit %-Bonus**: Radio-Auswahl +10 % / +20 % statt nur Boolean.
  Bonus wirkt auf finalen Score (`pts * (1 + %/100)`).
- **Pikogramm-Katalog**: 23 Lucide-Icons für Themenbereiche
  (`src/data/topicIcons.ts`), Picker-UI im Admin + Auto-Vorschlag aus
  Themennamen (`suggestIconKey`)
- **Norm-Such-Feld**: 32 RSI-relevante VSS/SN-Normen
  (`regelwerkKatalog.ts`), Autocomplete-Dropdown im Defizit-Editor mit
  Tag-System
- **Diagnose-Overlay im SceneViewer**: zeigt orangen Banner wenn kein
  Panorama-Bild hinterlegt, statt stiller schwarzer Canvas
- **LandingPage Variante B** (B-3 + C-3): neue Taglines «Erkennen.
  Bewerten. Priorisieren.», ISSI/TBA-Fachkurs/bfu explizit genannt,
  Feature-Liste konkretisiert
- **FeedbackModal vollständig i18n**: Labels, Platzhalter, Buttons,
  mailto-Body-Felder in DE/FR/IT/EN
- **LanguageSwitcher 44×44 px Touch-Target** + `aria-pressed` +
  `aria-label` mit vollem Sprachnamen (WCAG 2.5.5 + 4.1.2)
- **Focus-Trap in Modalen** (`src/lib/useFocusTrap.ts`) — Tab/Shift+Tab
  cycelt innerhalb Modal, Initial-Fokus, Restore beim Schliessen
  (WCAG 2.4.3)
- **«Ändern»-Link in ScoringFlow-StepCards**: nach Auswahl erscheint
  blauer Link, resetet ab dieser Stufe
- **Hover-Tooltips auf 9-Schritte-Karten**: native title + fadet
  Detail-Block ein, mit aria-label für Screen-Reader

### Geändert
- **Panorama-Bilder liegen ab sofort in Supabase Storage**, nicht mehr
  in Vercel `/public/textures/`. DEFAULT_SCENES `panoramaBildUrl: null`
  (Admin lädt eigene Bilder hoch). Vercel-Texturen bleiben nur als Demo.
- **Versions-Single-Source**: `vite.config.ts` injiziert
  `VITE_APP_VERSION` aus `package.json`, alle Anzeige-Stellen dynamisch
- **Absender überall FaSi**: «© 2026 Tiefbauamt…» → «Fachstelle
  Verkehrssicherheit (FaSi) · Kanton Zürich» in Footer, Impressum,
  Datenschutz, Glossar
- **Impressum VSS-Norm korrigiert**: «VSS 40 xxx, SN 640/641» →
  «SN 641 723 (ISSI/RSI), VSS 41 722, bfu-Werkzeugkasten»
- **Defizit-Editor Reihenfolge**: Kategorie steht jetzt vor Kriterium
  & Kontext (D-7); 360°-Position-Felder (theta/phi/Toleranz) entfernt
  — Verortung erfolgt ausschliesslich über den Verortungs-Editor
- **TopicDashboard Sektions-Trennung**: «So funktioniert das Training»
  in eigener Karte mit ?-Badge, horizontale Trennlinie zum Themen-Grid;
  Quellen-Block unter 3-Spalten-Grid statt in NACA-Spalte
- **TopicIcon** nutzt jetzt zentrales Lucide-Mapping statt Custom-SVG,
  AppTopic.iconKey als free-string (backward-compatible)

### Behoben
- **WebGL Context Lost** durch CSP-Verschärfung: troika-three-text
  (Standort-Labels) lud Web-Worker-Sub-Scripts via `blob:` — gesperrt.
  Fix: `script-src ... blob:` + `script-src-elem 'self' blob:`
- **Supabase-Storage-Bilder blockiert**: `img-src` fehlte
  `https://*.supabase.co`. Bilder lagen bereits im Bucket, CSP hat sie
  ausgesperrt
- **jsDelivr-Font-Loader blockiert**: troika lud Unicode-Glyph-Daten,
  CSP fehlte `connect-src cdn.jsdelivr.net`
- **Sicherheits-Lücke «Szene erstellen»**: `SceneList` zeigte Button
  «Neue Szene» für alle User, nicht nur Admin. isAdmin-Prop existierte
  aber wurde nicht übergeben. Fix: `sessionStorage.rsi-admin-auth` an
  SceneList weitergereicht, Button conditional
- **Default-Szenen ohne Bild**: sc2/sc3/sc4 hatten
  `panoramaBildUrl: null` → schwarze Sphäre. Mit D-2-Refactor obsolet
  geworden
- **Versions-Inkonsistenz**: Footer/Impressum/Sentry zeigten v0.3.1
  statt aktueller Version. Dynamisch aus package.json
- **PWA-Footer-Links blockiert**: Service Worker routete
  `/impressum.html`, `/datenschutz.html`, `/glossar.html` auf SPA-Shell.
  Fix: `navigateFallbackDenylist` in vite.config.ts

### Sicherheit
- **RLS auf rsi_topics / rsi_scenes / rsi_deficits** aktiviert (Pilot-
  Variante: anon SELECT/INSERT/UPDATE/DELETE, PIN-geschützt im Code)
- **Storage-Policies** im Bucket `rsi-textures`: `rsi_public_read`,
  `rsi_anon_upload`, `rsi_anon_delete` via Dashboard-UI
- **VITE_USERNAME_SALT** in Vercel-Env gesetzt (einmalig, nie ändern)
- **CSP verschärft** (Supabase-only für img-src, cdn.jsdelivr für Fonts)

### Architektur-Entscheidungen (für späteren Ausbau dokumentiert)
- Bucket-Struktur: `panoramas/{szeneId}/{haupt|persp_NNN_<label>}.webp`
- ID-Konvention: SZ_YYYY_NNN + SD_NNNN
- Backlog: Edge Function mit service_role-Key für Storage-Listing
  (eliminiert SELECT-Policy-Warnung), Supabase Auth statt nur PIN
- Statische Seiten (Impressum/Datenschutz/Glossar) mehrsprachig erst
  bei Beta 1.0 (vorerst DE only)

---

## [0.4.0] — 2026-04-19

### Hinzugefügt
- Globaler Fokus-Ring (`:focus-visible`) für Tastatur-Navigation (WCAG 2.4.7)
- Rechtliche Links (Impressum / Datenschutz / Glossar) auch **nach Login** im Avatar-Popover erreichbar (nDSG/DSGVO)
- Fehler-Meldungen (Name, Passwort, Admin-PIN) mit `role="alert"` + `AlertCircle`-Icon + `aria-live="polite"` (WCAG 1.4.1)
- ESC-Handler in allen Modalen: FeedbackModal, KategoriePanel, Admin-PIN-Modal (WCAG 2.1.2)
- `aria-label` / `aria-hidden` auf Icon-only-Buttons (Avatar, Theme-Toggle, Navbar-Logo, Password-Eye, Admin-Lock)
- `aria-expanded` / `aria-haspopup="menu"` am Avatar-Button
- `.sr-only`-Utility-Klasse für Screen-Reader-Texte
- **Username-Salt** (`VITE_USERNAME_SALT`) — verhindert Rainbow-Table-Preimage bei Supabase-Dump
- CR/LF-Sanitize für mailto-Subject (Header-Injection-Hygiene)

### Geändert
- Panorama-Marker komplett überarbeitet (aus 67ad786):
  - Pending-Klick-Marker jetzt **Fadenkreuz** (statt dominanter weisser Vollkreis) — beim Zoom natürlich grösser, präziser klickbar
  - Standort-Wechsel-Marker jetzt **Diamant** (konsistent mit Admin-BildEditor)
  - Hotspot bei aktivem Hint **orange** (`#F0A500`) statt blau — keine Verwechslung mit Standort-Marker
  - Hotspot ohne FOV-Quadrat-Skalierung — wächst mit dem Zoom mit statt zu schrumpfen
- `--zh-color-text-disabled` von `#949494` (Kontrast 2.85:1, WCAG-Fail) auf `#737373` (4.7:1) angehoben — WCAG-AA für kleine Content-Texte
- Dark-Mode-Text-Token entsprechend angepasst für WCAG-AA auf `#000`
- CSP `img-src` auf `'self' blob: data:` eingegrenzt (vorher `https:` erlaubt → Tracker-Pixel möglich)
- KategoriePanel: X-Schliessen-Icon-Kontrast von 45% auf 85% Opacity angehoben

### Behoben
- **C-1** Timer-Leak in `handleStandortWechsel` (`SceneViewer.tsx`) — Perspektivenwechsel während pendingConfirm räumte den Auto-Ausblenden-Timer nicht auf
- **N-3** `überholsichtweite`-Key in `kriteriumLabels.ts` hatte Umlaut, `WICHTIGKEIT_TABLE` aber `ueberholsichtweite` (ASCII) → Label-Lookup schlug fehl
- **Bug 1** (v0.3.2-Fix): `getHotspotPosition` fiel bei aktiver Perspektive auf Legacy-`d.position` zurück → Phantom-Hotspot im falschen Bild
- **Bug 2** (v0.3.2-Fix): BildEditor zeichnete Legacy-`d.position` auch in Perspektiven-Ansicht
- **Bug 3** (v0.3.2-Fix): `hitTestPunkt` skaliert jetzt Greifzone mit Zoom

### Dokumentation
- `ADMIN_HANDBUCH.md` um Environment-Variablen-Tabelle erweitert (Salt-Setup)
- Memory `project_klickflow_architektur.md` Penalty-Modell korrigiert (additiv +25/-25, **nicht** multiplikativ 0.9/0.5 wie alte Dokumentation behauptete)

### Security-Stand
- H-2 (RLS-Policies) bleibt offen → User-Aktion im Supabase-Dashboard
- N-2 (Rate-Limits) bleibt offen → Supabase-Dashboard
- Sentry optional → `VITE_SENTRY_DSN` in Vercel setzen

---

## [0.3.1] — 2026-04-19

### Hinzugefügt
- Zoom + interaktiver Pan im BildEditor (Mausrad zentriert, Drag auf leerer Fläche)
- Globaler Git-Remote-Check-Hook bei Session-Start (Claude Code)
- Footer-Layout auf LandingPage mit Impressum/Datenschutz/Glossar-Links (56px hoch)
- Zentrale Design-Tokens `--zh-navbar-h: 56px` und `--zh-footer-h: 56px`
- In-App-Feedback-Button (Modal, mailto) in Navbar und LandingPage
- Sentry-Integration (optional via `VITE_SENTRY_DSN`), Error Boundary mit Fallback-UI
- Generische `buildRanking()`-Helper für Gesamt-/Thema-/Kurs-Ranking
- `hashKursPasswort()`, `istPasswortHash()`, `pruefeKursPasswort()` — volles SHA-256 mit `kp:`-Marker, rückwärtskompatibel zu Klartext-Legacy
- `enableSeedConsent()` für kontrollierten Supabase-Seed
- Theta-Umbruch-Behandlung in `punktInPolygon` (0°/360°-Grenze)
- Import-Schema-Validierung (Array-Grenzen, ID-Format, MultiLang, Base64-Bildgrössen)
- Security-Header in `vercel.json` (CSP, X-Frame-Options DENY, Permissions-Policy mit `xr-spatial-tracking=self`)

### Geändert
- Navbar-Höhe von 52px auf 56px (mehr Touch-Target)
- ASCII-Ersatzschreibungen (ae/oe/ue) in 20 Dateien durch echte Umlaute ersetzt — Ausnahme: Code-Identifier und Fremdsprach-JSON-Keys
- `punkteRoh` und `punkteFinal` getrennt geführt (Statistik-korrekt)
- `nextSceneExists` als `useMemo` statt IIFE bei jedem Render
- `resetCache()` bei Logout und App-Reset aufgerufen
- `ScoringFlow`-Back-Button zeigt Warnung bei teilweiser Eingabe
- Delete-Bestätigung für Defizite und Szenen (kaskadierend)
- Admin-View in `App.tsx` zusätzlich gegen `sessionStorage['rsi-admin-auth']` geprüft
- `KRITERIUM_LABELS`-Import in `ScoringFlow` auf `kriteriumLabels.ts` umgestellt (Sacred-File unberührt)
- `seedSupabaseFromLocal()` nur noch mit Consent-Flag statt automatisch bei leerer Tabelle
- Support-Adresse auf `sicherheit.tba@bd.zh.ch` (Team-Mailbox)

### Behoben
- Typo "spaat" → "spät" in Seed-Daten (`appData.ts`)
- `useEffect`-Kommentar im BildEditor dokumentiert ausgelassene Dependencies
- Demo-Zugangscode `FaSi4safety` aus `DEFAULT_KURSE_SEED` entfernt

### Dokumentation
- `CHANGELOG.md`, `GLOSSAR.md`, `BENUTZERHANDBUCH.md`, `ADMIN_HANDBUCH.md`, `OFFLINE.md`, `BROWSER.md`, `BACKUP.md`, `META_STORE_CHECKLIST.md`
- `public/impressum.html`, `public/datenschutz.html`, `public/glossar.html`
- `REVIEW_CODE.md`, `REVIEW_SECURITY.md`
- `AUDIT_REPORT.md` um Update-Abschnitt v0.3.1 ergänzt

---

## [0.3.0] — 2026-04-16

### Hinzugefügt
- **Supabase-Sync für Admin-Daten**: Topics, Scenes, Deficits als JSONB-Tabellen, geräteübergreifend synchron
- **Avatar-Popover** in Navbar mit Abmelden, Score, Kurs, App-Reset
- **Schritt-für-Schritt-Anleitung** unter Topic-Grid (4 Karten)
- **Aufklappbare RSI-Methodik-Karte** mit Matrizen, NACA-Einstufung, Quellenangaben
- **Strassenmerkmale-Dropdown-Katalog** (9 Kategorien unter Funktionalität)
- **Admin-Rangliste** (`AdminRanking`) mit User- und Kurs-Verwaltung
- **LernKarte** nach ScoringFlow als didaktische Zusammenfassung
- **Supabase Live-Ranking** (Tabelle `rsi_results`) mit öffentlichem Read, anon-Insert
- **Admin-PIN-Schutz** mit 4-stelligem PIN aus `VITE_ADMIN_PIN`
- **DSGVO-Hash** für Usernamen (SHA-256, erste 8 Hex) in Supabase
- **App-Reset-Button** (Service Worker + Cache + localStorage)
- **Bidirektionale Standort-Navigation** (Haupt↔Perspektive↔Perspektive)
- **Best-of-Punktesystem** mit Sternen (1/2/3) und Zeiterfassung
- **Kurs-Tab im Ranking** (pro Kurs mit Zugangscode)
- **Drag & Drop im Verortungs-Editor** (Punkte, Polygon-Ecken, Startblick, Standorte, NavMarker)

### Geändert
- i18n-Vollabdeckung 100% in de/fr/it/en (66 fehlende Keys ergänzt)
- Kriterium-Labels aus `scoringEngine.ts` in `kriteriumLabels.ts` ausgelagert (Sacred-File unangetastet)
- Panorama-Textur-Mapping korrigiert (`repeat.x=-1`, `offset.x=0.75`)
- `calcScore` als Pure Function in `scoreCalc.ts`
- Scoring normiert auf 100 Pkt.; Penalty-Werte: Kategorie −10%, Hinweise −25 Pkt.

### Behoben
- 8 Bugs in Themen-Verwaltung (Sortierung, Gruppe neu, Kaskaden-Delete, Seed-Schutz)
- Startblick Race-Condition (rAF-Retry)
- Defizit-Marker sichtbar über alle Perspektiven
- Themen-Pfeile (rauf/runter) im Admin
- Startbutton-Validierung (Name-Pflichtfeld rot statt grau)
- Ranking Auto-Refresh nach Szenenabschluss
- Stale Bewertungsdaten bei VR-Abbruch

---

## [0.2.0] — 2026-04-04

### Hinzugefügt
- **ZH Corporate Design** mit FaSi_VIZ-Tokens, Dark/Light-Theme
- **i18n aktiv** mit `t()` in allen User-facing Komponenten
- **9-Schritt FaSi/bfu-Bewertungsflow** (ScoringFlow)
- **Admin-Hierarchie**: Oberthemen → Unterthemen → Szenen → Defizite
- **Kurs-System** mit Zugangscode + optionalem Passwort
- **TrainingEinstieg-Seite** mit Bildern, Beschrieb, Merkmalen
- **3-Ebenen-Ranking** (Teilnehmende, Kurse, global)
- **Vollaudit Phase 2** (`AUDIT_REPORT.md`)
- **Admin Export/Import** zum Datenaustausch zwischen Geräten
- **BildEditor** mit Drag&Drop, Verortung (Punkt/Polygon/Gruppe), Startblick
- **Texturen-Schnellauswahl** und Panorama-Upload mit Komprimierung

### Geändert
- Projektstruktur: `_Archiv/` lokal, tote Dateien entfernt
- PWA Service Worker mit Sofort-Update für Meta Quest Browser
- Vercel Cache-Header für `sw.js`

### Behoben
- Panorama-Textur-Spiegelung (BackSide + UV-Offset)
- VR-Panorama-Rendering (weisser Bildschirm)
- VR-Panels nicht kopfgebunden, Controller-Ray aktiv
- Szene-CRUD und BildEditor-Speicherung

---

## [0.1.0] — 2026-03-28

### Initial Release — Phase 1 & 2 Grundlagen

- Vite + React 18 + TypeScript (strict) Setup
- `@react-three/fiber` v8 + `@react-three/xr` v6
- PWA-Manifest, Service Worker (Bubblewrap-ready)
- Onboarding-Layer (Name, Thema, Szene)
- Migration der Voarbeiten (Dashboard, Ranking, Admin, SceneViewer, WebXR)
- VR-Controller-Support Meta Quest 3
- VR Klick-Flow mit 9-Schritt-Bewertung
- Phase-2 ScoringFlow, Dashboard, Admin, Ranking
- Grundlegendes ZH-Design

---

## Release-Prozess

1. Alle Änderungen seit letztem Tag auf `main` in `[Unreleased]` sammeln.
2. Vor Release: `npx tsc --noEmit` grün, Smoke-Test Browser + Meta Quest.
3. Version bumpen in `package.json`.
4. `[Unreleased]` → neuer Abschnitt `[x.y.z] — YYYY-MM-DD`, neuer leerer `[Unreleased]` anlegen.
5. `git tag -a vX.Y.Z -m "Release vX.Y.Z"` → `git push --tags`
6. Vercel deployt automatisch auf `main`-Push.

**Versionsregeln (SemVer):**
- **MAJOR** (`1.x.x`): Breaking Changes an Datenmodell, i18n-Keys entfernt, localStorage-Schema inkompatibel.
- **MINOR** (`x.1.x`): Neue Features, rückwärtskompatibel.
- **PATCH** (`x.x.1`): Bugfixes, Doku-Updates.
