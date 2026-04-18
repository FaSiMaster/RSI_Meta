# Audit-Bericht – RSI VR Tool (Phase 2)

**Datum:** 2026-03-28
**Reviewer:** Claude Sonnet 4.6 (Senior Dev + Security Auditor + QA Engineer + Fachexperte RSI/VSS + Technical Writer)
**Scope:** Phase 2 Codebase – `src/data/`, `src/components/`, Build, Sicherheit, Normativität
**Commit-Stand:** Phase 2 vollständig (scoringEngine, appData v3, ScoringFlow 9-Schritte, AdminDashboard)

---

## P1 – Kritische Fehler (Sofortiger Handlungsbedarf)

*Kein Fehler gefunden, der Sicherheitslücken im Browser oder normative Falschheit in der RSI-Berechnung verursacht.*

---

## P2 – Wichtige Fehler (Nächster Entwicklungszyklus)

### P2-1: Doppelter Ranking-Speicheraufruf

**Betrifft:** `src/components/ScoringFlow.tsx:handleSave()` + `src/App.tsx:handleDeficitComplete()`
**Befund:** Beide Funktionen rufen `saveRankingEntry(username, score)` auf. Beim Abschluss eines Defizits wird der Ranglisten-Eintrag zweimal geschrieben, was zu einem korrekten aber redundanten Schreibvorgang in localStorage führt. Folgeproblem: Score-Wert stimmt je nach Aufruf-Reihenfolge nicht exakt überein.
**Empfehlung:** `saveRankingEntry` aus `ScoringFlow.handleSave()` entfernen. Alle Persistenz in `App.handleDeficitComplete()` zentralisieren. `ScoringFlow.onComplete(pts)` nur den Score übergeben lassen, ohne selbst zu speichern.

### P2-2: React-Fragment ohne key-Prop in Matrix-Rows

**Betrifft:** `src/components/ScoringFlow.tsx` — Matrix-Subkomponente, Zeilen-Rendering
**Befund:** `rows.map(...)` verwendet `<>...</>` Fragment als unmittelbares Kind ohne `key`-Attribut. React warnt in der Konsole: *"Each child in a list should have a unique key prop."* Führt zwar nicht zu falscher Darstellung, vermindert aber die Render-Effizienz und erzeugt unnötigen Console-Noise.
**Empfehlung:** Fragment durch `<React.Fragment key={row}>` ersetzen.

### P2-3: `onBack`-Prop in AdminDashboard ungenutzt

**Betrifft:** `src/components/AdminDashboard.tsx:69` — `onBack: _onBack`
**Befund:** Prop wird als `_onBack` umbenannt und nie verwendet. Navigation erfolgt ausschliesslich über die Navbar. Die Prop-Definition in `Props` und die Umbenennung erzeugen Verwirrung über die tatsächliche Navigationslogik.
**Empfehlung:** `onBack`-Prop aus AdminDashboard entfernen und die Übergabe in `App.tsx` entsprechend anpassen, oder Prop verwenden und einen sichtbaren Zurück-Button einbauen.

---

## P3 – Verbesserungsvorschläge (Backlog)

### P3-1: i18n-Schlüssel in ScoringFlow nicht genutzt

**Betrifft:** `src/i18n/{de,fr,it,en}.json` → `scoring.*`-Schlüssel; `src/components/ScoringFlow.tsx`
**Befund:** Alle vier Sprach-JSON-Dateien enthalten `scoring.step1`–`scoring.feedback` etc. Der gesamte Text in ScoringFlow.tsx ist jedoch auf Deutsch hart kodiert. Die Mehrsprachigkeit der Applikation (LanguageSwitcher vorhanden, react-i18next integriert) wird im didaktisch zentralsten Screen nicht genutzt.
**Empfehlung:** `useTranslation()` in ScoringFlow aktivieren und alle User-sichtbaren Strings durch `t('scoring.stepX', ...)` ersetzen. Dies ist besonders relevant für FR/IT-sprechende Inspektoren.

### P3-2: `StepResult`-Typ exportiert aber nirgends importiert

**Betrifft:** `src/data/scoringEngine.ts` — `export type StepResult`
**Befund:** Der Typ ist definiert und exportiert, wird aber in keiner Komponente oder Hook verwendet. Dead code im öffentlichen API.
**Empfehlung:** Typ entweder in ScoringFlow für die Step-Auswertung verwenden oder als `// TODO: Phase 3` markieren und bis zur Verwendung nicht exportieren.

### P3-3: `bildUrl`-Feld in AppScene ohne Verwendung

**Betrifft:** `src/data/appData.ts` — `AppScene.bildUrl?: string`
**Befund:** Das Feld ist typisiert und persistiert, wird aber weder in SceneList noch in ScoringFlow angezeigt. SceneList zeigt stattdessen einen farbigen Gradient-Platzhalter.
**Empfehlung:** In SceneList.tsx das Feld bei Vorhandensein als `<img>` rendern, sonst Platzhalter zeigen. Ermöglicht spätere Foto-Integration ohne Typ-Anpassung.

### P3-4: Score-Berechnung in ScoringFlow ohne eigenen Hook

**Betrifft:** `src/components/ScoringFlow.tsx:calcScore()`
**Befund:** `calcScore()` ist inline in der Komponente definiert und referenziert `wichtigkeit`, `abweichung`, `nacaSchwere` aus dem Closure-Scope. Keine Unit-Tests möglich. Logik dupliziert teilweise was STEP_WEIGHTS aus scoringEngine bereits bereitstellt.
**Empfehlung:** Funktion nach `scoringEngine.ts` verschieben: `calcScore(correct: boolean[]): number`. Ermöglicht isolierte Tests ohne React-Rendering.

### P3-5: localStorage ohne Versionscheck

**Betrifft:** `src/data/appData.ts` — `K_INIT = 'rsi-v3-init'`
**Befund:** Der Init-Key verhindert Re-Seeding bei erneutem Laden, prüft aber nicht auf einen Schema-Versions-Mismatch (z.B. wenn ein Feld in AppDeficit hinzukommt). Veraltete Daten aus früheren Versionen könnten stille Typfehler erzeugen.
**Empfehlung:** `K_INIT` auf `'rsi-v3-init-2'` (oder Schema-Hash) setzen bei Breaking Changes, oder Zod-Validierung beim Laden einsetzen.

---

## Prüfbereich 1 – Typsicherheit & TypeScript

| Aspekt | Befund | Status |
|---|---|---|
| `strict: true` in tsconfig | Aktiviert, keine `any`-Typen in Produktionscode | ✅ |
| `NacaRaw = 0\|1\|2\|3\|4\|5\|6\|7` | Literal-Union korrekt, verhindert Laufzeitfehler | ✅ |
| `WichtigkeitWert = RSIDimension \| ''` | Sauber für N/A-Eintraege in WICHTIGKEIT_TABLE | ✅ |
| Zentralisierte Typen in `src/types/index.ts` | RSIDimension, NACADimension, ResultDimension korrekt exportiert | ✅ |
| `MultiLang`-Cast in appData | `as unknown as Record<string,string>` Workaround in ml() — pragmatisch aber nicht ideal | ⚠️ |
| `npm run build` / `tsc` | 0 Fehler, 0 Warnungen | ✅ |
| StepResult exportiert aber ungenutzt | Dead export — P3-2 | ⚠️ |

**Fazit:** Typsystem solide. Ein Workaround (`as unknown as`) vorhanden, der funktioniert aber verbessert werden könnte.

---

## Prüfbereich 2 – Sicherheit (npm audit + Code)

### npm audit Ergebnisse (Stand 2026-03-28)

| Paket | CVSS | Art | Kontext | Laufzeitrisiko |
|---|---|---|---|---|
| `serialize-javascript` (via vite-plugin-pwa → workbox-build) | 8.1 HIGH | RCE via RegExp.flags | **Build-Zeit only** | ❌ Kein Laufzeitrisiko |
| `@rollup/plugin-terser` (via serialize-javascript) | 8.1 HIGH | Selbe Ursache | **Build-Zeit only** | ❌ Kein Laufzeitrisiko |
| `esbuild` ≤ 0.24.2 | 5.3 MODERATE | Dev-Server CORS | **Dev-Zeit only** | ❌ Kein Laufzeitrisiko |

**Bewertung:** Alle 3 Schwachstellen liegen in Build- oder Dev-Werkzeugen. Das ausgelieferte JS-Bundle enthält keinen dieser Pakete. Für Endnutzer der PWA besteht kein Sicherheitsrisiko. Fix über `npm audit fix --force` würde vite-plugin-pwa auf Major-Version 0.19.x updaten (Breaking Changes möglich).

**Empfehlung:** Im nächsten Dependency-Update-Sprint `vite-plugin-pwa` auf 0.19.8 aktualisieren und PWA-Konfiguration testen. Kein Soforthandlungsbedarf für Produktionsbetrieb.

### Code-Sicherheit

| Aspekt | Befund | Status |
|---|---|---|
| XSS via localStorage-Daten | localStorage-Werte werden als Text in JSX gerendert, nie als HTML geparst — kein XSS-Risiko | ✅ |
| Code-Injection | Keine `eval()`, `Function()`, `innerHTML = user_data` gefunden | ✅ |
| CSRF | PWA ohne Server-API-Calls — nicht anwendbar | ✅ |
| Authentifizierung | Username wird ohne Passwort gespeichert — by design für Kanton-internes Tool | ✅ OK |
| Sensible Daten in localStorage | Nur Trainingsdaten (Scores, Defizite) — keine PII oder Credentials | ✅ |

---

## Prüfbereich 3 – Normativität (RSI/VSS/bfu)

### 9-Schritte-Fluss

| Schritt | Bezeichnung | Quelle | Implementierung | Status |
|---|---|---|---|---|
| 1 | Wichtigkeit bestimmen | TBA-Fachkurs FK RSI, V 16.09.2020 | WICHTIGKEIT_TABLE, kontext-abhängig | ✅ |
| 2 | Übertrag Wichtigkeit → Matrix | TBA-Fachkurs FK RSI, Folie 5 | Automatisch, Matrix highlightRow | ✅ |
| 3 | Abweichung beurteilen | TBA-Fachkurs FK RSI | klein/mittel/gross Auswahl | ✅ |
| 4 | Übertrag Abweichung → Matrix | TBA-Fachkurs FK RSI, Folie 5 | Automatisch, Matrix highlightRow+Col | ✅ |
| 5 | Relevanz SD (Ergebnis) | TBA-Fachkurs FK RSI, Folie 5 | calcRelevanzSD(), Matrix showIntersection | ✅ |
| 6 | Übertrag Relevanz SD | TBA-Fachkurs FK RSI, Folie 6 | Automatisch, InfoBox "Relevanz=Proxy" | ✅ |
| 7 | NACA-Einstufung | bfu-Bericht 73 (NACA-Skala) | NACA_TABLE, gruppiert, Pflicht-Leitfrage | ✅ |
| 8 | Übertrag Unfallschwere → Matrix | TBA-Fachkurs FK RSI, Folie 6 | Automatisch, Unfallrisiko-Matrix | ✅ |
| 9 | Unfallrisiko (Ergebnis) | TBA-Fachkurs FK RSI, Folie 6 / SN 641 723 Abb. 2 | calcUnfallrisiko(), Feedback-Screen | ✅ |

### Matrix-Korrektheit (verifiziert)

**calcRelevanzSD** (Wichtigkeit-Zeile × Abweichung-Spalte):

| | klein | mittel | gross |
|---|---|---|---|
| **gross** | gering | mittel | hoch |
| **mittel** | gering | mittel | hoch |
| **klein** | gering | gering | mittel |

Status: ✅ Implementierung korrekt

**calcUnfallrisiko** (Relevanz SD-Zeile × Unfallschwere-Spalte):

| | leicht | mittel | schwer |
|---|---|---|---|
| **hoch** | mittel | hoch | hoch |
| **mittel** | gering | mittel | hoch |
| **gering** | gering | gering | mittel |

Status: ✅ Implementierung korrekt

### WICHTIGKEIT_TABLE Stichproben (6 von 58 Kriterien)

| kriteriumId | io | ao | Quelle | Status |
|---|---|---|---|---|
| `visuelle_linienfuehrung` | klein | gross | TBA-Fachkurs FK RSI | ✅ |
| `anhaltesichtweite` | gross | gross | TBA-Fachkurs FK RSI | ✅ |
| `beleuchtung` | gross | mittel | TBA-Fachkurs FK RSI | ✅ |
| `fahrzeugrueckhaltesystem` | klein | mittel | TBA-Fachkurs FK RSI | ✅ |
| `geschwindigkeit` | gross | gross | TBA-Fachkurs FK RSI | ✅ |
| `bankette` | klein | gross | TBA-Fachkurs FK RSI | ✅ |

### Default-Deficit correctAssessment (4 Eintraege)

| id | kriteriumId | kontext | W | A | R | NACA | US | UR | Status |
|---|---|---|---|---|---|---|---|---|---|
| def1 | fussgaengerfuehrung_geometrie | io | mittel | gross | hoch | 2→mittel | mittel | hoch | ✅ |
| def2 | erkennungsdistanz | io | mittel | mittel | mittel | 3→mittel | mittel | mittel | ✅ |
| def3 | velolaengsfuehrung_art | ao | gross | gross | hoch | 3→mittel | mittel | hoch | ✅ |
| def4 | markierung | io | mittel | mittel | mittel | 2→mittel | mittel | mittel | ✅ |

**Fazit Normativität:** Alle geprüften Berechnungen und Referenzwerte sind korrekt. Die Implementierung entspricht dem TBA-Fachkurs FK RSI (V 16.09.2020) und dem bfu-Bericht 73.

---

## Prüfbereich 4 – Code-Qualität & Architektur

| Aspekt | Befund | Status |
|---|---|---|
| Separation of Concerns | scoringEngine.ts (pure logic) ↔ appData.ts (persistence) ↔ Komponenten (UI) sauber getrennt | ✅ |
| Pure Functions | calcRelevanzSD, calcUnfallrisiko, nacaToSchwere, ml() — keine Seiteneffekte | ✅ |
| React-Pattern | useState, useEffect korrekt; keine Prop-Drilling-Probleme bei dieser Tiefe | ✅ |
| Framer Motion | AnimatePresence mode="wait" korrekt für Step-Transitions | ✅ |
| Inline-Styles vs. Tailwind | Konsistenter Einsatz: Design-Token via CSS-Var, strukturelle Klassen via Tailwind | ✅ |
| Keine `any`-Typen | Bestätigt via tsc strict | ✅ |
| Matrix-Fragment ohne key | P2-2 — Konsolen-Warning | ⚠️ |
| calcScore inline in Komponente | P3-4 — nicht testbar als Unit | ⚠️ |
| Double-Save Ranking | P2-1 — logischer Fehler | ⚠️ |

---

## Prüfbereich 5 – Performance & Build

| Metrik | Wert | Ziel | Status |
|---|---|---|---|
| JS Bundle (gzip) | 137.29 kB | < 300 kB | ✅ |
| JS Bundle (raw) | 445.31 kB | < 2 MB | ✅ |
| CSS (gzip) | 8.63 kB | — | ✅ |
| Build-Zeit | 5.53s | — | ✅ |
| PWA Precache-Eintraege | 7 | — | ✅ |
| Build-Fehler | 0 | 0 | ✅ |
| Build-Warnungen | 0 | 0 | ✅ |

**Fazit:** Build ist produktionsbereit. Bundle-Grösse weit unter dem Ziel. PWA-Manifest und Service-Worker werden korrekt generiert.

---

## Prüfbereich 6 – Internationalisierung (i18n)

| Schlüsselgruppe | de.json | fr.json | it.json | en.json | In Komponenten genutzt |
|---|---|---|---|---|---|
| `landing.*` | ✅ | ✅ | ✅ | ✅ | Nein (hardcoded DE in LandingPage) |
| `topics.*` | ✅ | ✅ | ✅ | ✅ | Nein (hardcoded DE in TopicDashboard) |
| `scenes.*` | ✅ | ✅ | ✅ | ✅ | Nein (hardcoded DE in SceneList) |
| `scoring.*` | ✅ | ✅ | ✅ | ✅ | Nein (hardcoded DE in ScoringFlow) |
| `ranking.*` | ✅ | ✅ | ✅ | ✅ | Nein (hardcoded DE in RankingView) |
| `admin.*` | ✅ | ✅ | ✅ | ✅ | Teilweise (AdminDashboard nutzt useTranslation für lang) |
| Inhaltsdaten (nameI18n, beschreibungI18n) | `ml()` korrekt | — | — | — | ✅ TopicDashboard, SceneList, ScoringFlow-Header |

**Befund:** Die i18n-Infrastruktur ist vollständig (Schlüssel in allen 4 Sprachen, LanguageSwitcher, react-i18next konfiguriert). Jedoch verwenden alle Komponenten den Schlüsselapparat nicht — UI-Text ist auf Deutsch hardcodiert. Inhaltsdaten (Topics, Scenes, Defizite) sind korrekt mehrsprachig über `ml()`.

**Fazit:** i18n bereit für Aktivierung. Kein normatives oder sicherheitsrelevantes Problem. Empfehlung: Im nächsten Sprint systematisch `t()` in allen Screens einführen.

---

## Prüfbereich 7 – UX & Didaktik

| Aspekt | Befund | Bewertung |
|---|---|---|
| Schritt-Progression 1→9 | Klarer linearer Fluss, auto-Schritte mit "Automatisch"-Badge sichtbar unterschieden | ✅ Gut |
| ProgressBar | Visuell klar, Schritt-Nr. und Gesamtanzahl erkennbar | ✅ Gut |
| NACA-Gruppen (leicht/mittel/schwer) | NACA 0-7 visuell gruppiert, Pflicht-Leitfrage deutlich markiert | ✅ Sehr gut |
| bfu-Badge | Erkennbar als Normreferenz, nicht als Werbung | ✅ OK |
| Relevanz=Proxy InfoBox | Erklärt die Methodik — wichtig für didaktisches Verständnis | ✅ Gut |
| Matrix-Darstellung | Zeilen/Spalten, Highlight und Schnittpunkt-Anzeige — pädagogisch wertvoll | ✅ Sehr gut |
| Feedback-Screen | Alle 9 Schritte tabellarisch, Korrektheit pro Schritt, Punkte-Anzeige | ✅ Sehr gut |
| Normreferenzen sichtbar | StepHeader zeigt Quelle, Feedback zeigt normRefs als Tags | ✅ Gut |
| Mehrsprachiger Content | ml() für Defizit/Szene-Namen | ✅ |
| UI-Text mehrsprachig | Nur Deutsch — P3-1 | ⚠️ |
| Emojis im Code | "Alles korrekt! 🏆" in ScoringFlow — gemäss CLAUDE.md nur auf explizite Anfrage | ⚠️ |

---

## Prüfbereich 8 – Dokumentation & Wartbarkeit

| Dokument | Status |
|---|---|
| CLAUDE.md | Existiert, aber aus Phase 1 — Phase 2 noch nicht dokumentiert |
| README.md | Fehlte (wird mit diesem Audit erstellt) |
| src/data/glossary.ts | Fehlte (wird mit diesem Audit erstellt) |
| Code-Kommentare | Deutsch, knapp aber treffend — gemäss Vorgabe |
| scoringEngine.ts Inline-Docs | Matrix-Konstanten haben keine Quellreferenz-Kommentare |

---

## Zusammenfassung der Befunde

| Priorität | Anzahl | Sofortmassnahme |
|---|---|---|
| P1 (Kritisch) | 0 | Keine |
| P2 (Wichtig) | 3 | Nächster Sprint |
| P3 (Verbesserung) | 5 | Backlog |

### P2-Massnahmen (geordnet nach Aufwand)

1. **P2-2 Matrix Fragment key** — 5 Min. Änderung in ScoringFlow Matrix-Subkomponente
2. **P2-3 onBack entfernen** — 10 Min. Refactoring in AdminDashboard + App.tsx
3. **P2-1 Double-Save** — 20 Min. Refactoring: saveRankingEntry aus ScoringFlow entfernen

### Keine Code-Änderungen für kritische Fehler nötig

Alle normativen Berechnungen (calcRelevanzSD, calcUnfallrisiko, WICHTIGKEIT_TABLE) sind korrekt implementiert. Keine Sicherheitslücken im Laufzeit-Code gefunden. Build ist produktionsbereit.

---

*Audit durchgeführt: 2026-03-28 | RSI VR Tool Phase 2 | Fachstelle Verkehrssicherheit, Tiefbauamt Kanton Zürich*

---

## Update 2026-04-19 — Stand v0.3.1

Seit dem Ursprungs-Audit (2026-03-28) wurden folgende Bereiche erweitert:

### Neue Features (v0.3.1)
- Supabase-Sync für Topics/Scenes/Deficits als JSONB-Tabellen
- Admin-PIN-Schutz + DSGVO-SHA-256-Pseudonymisierung
- Live-Ranking über Supabase + AdminRanking-Verwaltung
- LernKarte nach Scoring
- Bidirektionale Standort-Navigation, Perspektiven mit eigenen Verortungen
- i18n 100 % in de/fr/it/en
- BildEditor: Zoom + Pan (Mausrad, Toolbar, Tastatur)
- Auslagerung `KRITERIUM_LABELS` nach `kriteriumLabels.ts` (Sacred-File-Schutz)

### Neue Audit-Dokumente
- **`REVIEW_CODE.md`** (Code-Review mit 11 Findings, Stand 2026-04-19)
- **`REVIEW_SECURITY.md`** (Security-Review, Gesamtrisiko MITTEL, 3 HOCH-Findings)

### Kritische Deltas zum Ursprungs-Audit

| Neuer Befund | Priorität | Quelle |
|---|---|---|
| Admin-PIN im Client-Bundle sichtbar | HOCH | REVIEW_SECURITY H-1 |
| RLS-Policies für Admin-Tabellen nicht dokumentiert | HOCH | REVIEW_SECURITY H-2 |
| Kurs-Passwort im Klartext in localStorage | MITTEL | REVIEW_CODE #3 / REVIEW_SECURITY M-2 |
| Supabase-Cache wird nach Logout nicht geleert | WICHTIG | REVIEW_CODE #4 |
| `punkteRoh === punkteFinal` — Roh/Final-Unterscheidung wirkungslos | KRITISCH | REVIEW_CODE #1 |
| `KRITERIUM_LABELS`-Doppel-Import in `ScoringFlow.tsx` | KRITISCH | REVIEW_CODE #2 |
| CSP-Header fehlen in `vercel.json` | MITTEL | REVIEW_SECURITY M-4 |
| Keine Unit-Tests, keine E2E-Tests | NICE-TO-HAVE | — |

### Ursprungs-P2-Massnahmen — Status
- **P2-1 Double-Save:** zu prüfen (möglicherweise nicht mehr aktuell nach Refactoring)
- **P2-2 Matrix key:** zu prüfen
- **P2-3 onBack:** weiterhin offen (siehe REVIEW_CODE #8)

### Neue Dokumentations-Suite (Stand 2026-04-19)
- `CHANGELOG.md` — Release-Historie
- `GLOSSAR.md` + `public/glossar.html` — Fachbegriffe und Abkürzungen
- `BENUTZERHANDBUCH.md` — Teilnehmer-Anleitung
- `ADMIN_HANDBUCH.md` — Kursleitung-Referenz
- `BACKUP.md` — Backup-Strategie
- `BROWSER.md` — Kompatibilitäts-Matrix
- `OFFLINE.md` — PWA-Offline-Verhalten
- `META_STORE_CHECKLIST.md` — Phase-6-Vorbereitung
- `public/impressum.html` — rechtliche Information
- `public/datenschutz.html` — DSGVO/nDSG-Erklärung

### Priorisierung (Stand 2026-04-19)

| Phase | Aktion |
|---|---|
| **Sofort** | REVIEW_CODE #2 (Import-Fix), #11 (Typo) — ~10 Min total |
| **Vor nächstem Release v0.3.1** | REVIEW_CODE #1, #4, #7, #8 |
| **Vor Kurs-Pilot** | REVIEW_SECURITY H-1, H-2 (Supabase-RLS verifizieren, PIN-Rotation-Prozess) |
| **Vor Produktiv-Einsatz** | REVIEW_SECURITY M-1, M-3, M-4, M-5, REVIEW_CODE #3, #6 |
| **Phase 3 (VR)** | Performance-Profiling Quest 3, Offline-Test systematisch |

*Aktualisiert: 2026-04-19 | RSI VR Tool v0.3.1 | Review automatisiert via Claude feature-dev Agents*

---

## Fix-Status Release v0.3.1 — 2026-04-19

Alle im Code lösbaren Findings aus REVIEW_CODE.md und REVIEW_SECURITY.md wurden
in Commit `bb15cf8` umgesetzt. Stand vor Release v0.3.1:

### Code-Review — Status

| # | Finding | Status | Commit |
|---|---|---|---|
| 1 | punkteRoh vs punkteFinal | ✅ Gefixt | bb15cf8 |
| 2 | KRITERIUM_LABELS-Import | ✅ Gefixt | bb15cf8 |
| 3 | Kurs-Passwort Klartext | ✅ Gefixt (Hash + Legacy-Migration) | bb15cf8 |
| 4 | resetCache nach Logout | ✅ Gefixt | bb15cf8 |
| 5 | nextSceneExists useMemo | ✅ Gefixt | bb15cf8 |
| 6 | Theta-Umbruch Polygon | ✅ Gefixt | bb15cf8 |
| 7 | Delete-Confirm | ✅ Gefixt | bb15cf8 |
| 8 | ScoringFlow onBack-Warnung | ✅ Gefixt | bb15cf8 |
| 9 | Ranking-Dedup | ✅ Gefixt (buildRanking-Helper) | bb15cf8 |
| 10 | useEffect-Kommentar BildEditor | ✅ Gefixt | bb15cf8 |
| 11 | Typo "spaat" → "spät" | ✅ Gefixt | bb15cf8 |

### Security-Review — Status

| # | Finding | Status | Anmerkung |
|---|---|---|---|
| H-1 | Admin-PIN im Client-Bundle | ⚠️ Architekturbedingt — PIN-Rotation-Prozess in `ADMIN_HANDBUCH.md` dokumentiert; serverseitiger Check via Supabase Edge Function als Phase-3-Task |
| H-2 | RLS-Policies Content-Tabellen | ⚠️ User-Aktion nötig (Supabase-Dashboard-Check) |
| H-3 | Anon-Key public | ✅ Akzeptabel wenn H-2 gelöst (by design Supabase) |
| M-1 | Admin-Guard in App.tsx | ✅ Gefixt | bb15cf8 |
| M-2 | Kurs-Passwort Klartext | ✅ Gefixt (= Code-Review #3) | bb15cf8 |
| M-3 | Import-Schema-Validierung | ✅ Gefixt | bb15cf8 |
| M-4 | CSP-Header vercel.json | ✅ Gefixt | bb15cf8 |
| M-5 | 8-Hex-Pseudonymisierung | ✅ In Datenschutzerklärung korrekt benannt |
| M-6 | seedSupabase-Guard | ✅ Gefixt (Consent-Flag) | bb15cf8 |
| N-1 | SW aggressive Updates | ⚠️ Akzeptabel mit CSP (jetzt vorhanden) |
| N-2 | Supabase Rate-Limiting | ⚠️ User-Aktion (Supabase-Dashboard) |
| N-3 | Seed-Zugangscode FaSi4safety | ✅ Gefixt (entfernt) | bb15cf8 |

### Offen vor Pilot (User-Aktion)

1. Supabase-Dashboard → RLS-Policies auf `rsi_topics`, `rsi_scenes`, `rsi_deficits`: nur `SELECT` für anon
2. Admin-PIN vor jedem Kurs-Einsatz in Vercel-Env rotieren + redeployen
3. Supabase-Rate-Limits pro IP konfigurieren
4. Erstmaliger Supabase-Seed via `enableSeedConsent()` triggern (falls Neuaufbau)
5. Optional: Sentry-Projekt auf sentry.io anlegen, `VITE_SENTRY_DSN` in Vercel setzen

### Offen für Phase 3+

- Unit-Tests (Vitest) für `scoreCalc`, `sphereCoords.punktInPolygon`, `buildRanking`
- E2E-Tests (Playwright): Login, Szene-Flow, Admin-CRUD
- Performance-Profiling auf Meta Quest 3
- Lighthouse-Run + WCAG-Spot-Check (soweit anwendbar)
- Offline-Retry-Queue für Score-Uploads
- Server-seitiger PIN-Check via Supabase Edge Function

*Release v0.3.1 freigegeben: 2026-04-19 | Tag `v0.3.1` | Commit bb15cf8 + Release-Prep*
