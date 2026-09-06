# RSI VR Tool

**Road Safety Inspection – Immersive Training**
Privates Projekt von Stevan Skeledzic

Stand: v0.16.3 (6. September 2026) · Live: [rsi-meta.vercel.app](https://rsi-meta.vercel.app)

Ein Trainingswerkzeug für die normative 9-Schritte-Methodik der Road Safety
Inspection. Inspektorinnen und Inspektoren beurteilen Strassenszenen im
360°-Panorama nach Wichtigkeit, Abweichung, Relevanz SD, NACA-Skala und
Unfallrisiko, im Browser oder in VR auf der Meta Quest 3. Grundlage sind der
TBA-Fachkurs FK RSI V 16.09.2020, der bfu-Bericht 73 und VSS 41 723
(frühere Nummer SN 641 723).

Seit v0.16.0 trägt jeder Inhalt ein Land. Beurteilt wird nur dort, wo für dieses
Land ein Verfahren hinterlegt ist; das ist heute allein die Schweiz.

---

## Schnellstart

```bash
npm install
npm run dev
```

Öffnet unter `http://localhost:5173`.

Lokale `.env.local` anlegen; alle Variablen erklärt Abschnitt 1.2 des
Admin-Handbuchs:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_USERNAME_SALT=<einmalig via openssl rand -hex 16>
# VITE_SENTRY_DSN=<optional>
```

Weitere Skripte: `npm run build` erzeugt den Produktionsbuild, `npm test` führt
die Unit-Tests aus, `npm run preview -- --host` prüft den Build im Netz, etwa vom
Headset aus.

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | React 18.3 + Vite 7.3 + TypeScript strict |
| Styling | Tailwind CSS 4.2 (`@tailwindcss/vite`) + CSS Custom Properties |
| Animation | Framer Motion (`motion` 12) |
| Icons | lucide-react |
| i18n | react-i18next 17 / i18next 26 – de, fr, it, en; 521 Schlüssel im Namensraum `translation`, 104 im Namensraum `verfahren` |
| State | zustand |
| 3D / XR | `@react-three/fiber` 8 + `@react-three/xr` 6 + `@react-three/drei` 9 + three 0.169 |
| PDF | pdfmake 0.3, dynamisch nachgeladen |
| Persistenz (Client) | localStorage mit Präfix `rsi-v3-` |
| Backend | Supabase: Postgres, Storage, Edge Functions |
| Fehler-Monitoring | Sentry (optional, ohne DSN inaktiv) |
| PWA | vite-plugin-pwa 1.2 (Service Worker, Manifest) |
| Tests | Vitest + Playwright |
| CI | GitHub Actions: `npm ci && tsc --noEmit && vite build` auf PR und main |

**Vite bleibt auf 7.x.** Ab Vite 8 kommt Rolldown zum Einsatz, mit dem
`vite-plugin-pwa` derzeit nicht zusammenarbeitet.

---

## Funktionsumfang

### Der Beurteilungsfluss

| Schritt | Art | Inhalt |
|---|---|---|
| 1 | Eingabe | Wichtigkeit aus der WICHTIGKEIT_TABLE (io/ao) |
| 2 | Automatisch | Wichtigkeit in die Relevanz-Matrix |
| 3 | Eingabe | Abweichung beurteilen |
| 4 | Automatisch | Abweichung in die Relevanz-Matrix |
| 5 | Automatisch | Relevanz SD |
| 6 | Automatisch | Relevanz SD in die Unfallrisiko-Matrix |
| 7 | Eingabe | NACA-Einstufung 0–7 nach bfu-Bericht 73 |
| 8 | Automatisch | Unfallschwere in die Unfallrisiko-Matrix |
| 9 | Automatisch | Unfallrisiko als Gesamtergebnis |

Quelle: TBA-Fachkurs FK RSI V 16.09.2020 und SN 641 723:2016 Abb. 2.

### Land und Verfahren

Themenbereich, Szene, Kurs und Ergebnis tragen ein Land nach ISO 3166-1 alpha-2.
Geführt wird es am obersten Themenbereich; untergeordnete Themen erben es. Ein
Datensatz ohne Angabe gilt als schweizerisch, und der Wert wird beim nächsten
Speichern festgeschrieben – die Daten liegen im localStorage jedes Geräts und in
Supabase, es gibt keinen Ort, an dem sich der Bestand zentral berichtigen liesse.

Welches Beurteilungsverfahren gilt, entscheidet das Land. Hinterlegt ist eines:
der Neunschrittpfad für die Schweiz. Für jedes andere Land zeigt der
Bewertungsfluss einen Hinweis und bricht ab, ohne Ersatzablauf und ohne Punkte.

Ein Kurs gehört zu genau einem Land; es ergibt sich aus dem ersten zugeordneten
Themenbereich. Am Einstieg gruppiert die Anwendung ab dem zweiten Land nach Land
und bietet einen Filter an, der ausblendet statt zu sperren; die zuletzt
getroffene Wahl bleibt auf dem Gerät gemerkt.

Je Land lässt sich eintragen, welche Stelle die Inhalte verantwortet, auf welcher
Grundlage und mit welchem Stand. Solange nichts eingetragen ist, sagt die
Anwendung genau das: noch nicht bestimmt, Inhalte vorläufig, keine Freigabe durch
eine Stelle dieses Landes, nur zu Trainingszwecken.

### Training

Themen und Szenen tragen die Kennungen `SZ_YYYY_NNN` und `SD_NNNN`. Eine Szene
kann mehrere 360°-Standorte haben, zwischen denen Marker im Bild hin und zurück
führen; Verortungen gelten je Standort, ohne Rückfall auf das Haupt-Panorama.

Die Hilfestellung arbeitet zweistufig: Der Standort-Hinweis zeigt für 10 Punkte
je Fund, wo noch etwas offen ist, die Hotspot-Stufe für 25 Punkte auch die genaue
Stelle. Massgebend ist die beim Fund aktive Stufe.

Je Defizit sind 100 Punkte erreichbar: 25 für die Kategorie – 15, wenn das
Defizit gefunden, aber falsch einsortiert wurde – und je 25 für die Schritte 1, 3
und 7. Booster-Defizite geben einen prozentualen Zuschlag. Gewertet wird der
beste Durchgang; die Sterne richten sich nach dem Prozentwert.

Bestanden ist eine Szene, wenn alle Pflichtdefizite gefunden sind und mindestens
60 % der Punkte erreicht wurden, wahlweise mit Abweichung je Szene.

Die Rangliste gibt es gesamthaft, je Thema, je Kurs und als persönlichen
Fortschritt, durchwegs pseudonymisiert. Nur die eigene Zeile zeigt den Klarnamen.

### VR

In der immersiven Sitzung auf der Meta Quest 3 läuft der vollständige Ablauf
inklusive Kategorie, Bewertung, Auswertung, Matrix-Herleitung und Lernkarte. Die
Panels lassen sich mit dem Controller verschieben; ihre Position bleibt je Panel
gespeichert. Treffer werden haptisch quittiert.

### Bericht

Der PDF-Bericht enthält die Auswertung und die Befundliste im RSI-Format, je
Defizit mit Kriterium, Soll- und Ist-Beurteilung über die ganze Kette und
Normbezug. Auslösen lässt er sich im Szenen-Abschluss, im Administrationsbereich
je Kurs und je Einzelresultat.

### Verwaltung

Der Administrationsbereich ist über eine Edge Function token-gesichert und
umfasst die Pflege von Themen, Szenen und Defiziten samt automatischer
Neuberechnung von Relevanz SD und Unfallrisiko, den Verortungs-Editor, den
Bild-Upload in den Supabase-Bucket `rsi-textures`, einen Piktogramm-Katalog aus
23 Icons, ein Normfeld mit 32 VSS- und SN-Einträgen samt Autovervollständigung,
die Kursverwaltung mit optionaler Themen-Exklusivität sowie Export und Import der
gesamten Datenbasis als JSON.

Seit v0.16.2 ist das Land beim obersten Themenbereich ein Pflichtfeld mit Vorgabe
Schweiz und einer Auswahl über alle 249 Codes. Ein Landfilter in der Seitenleiste
schränkt Themen und damit den Defizitkatalog ein. Der Import weist Szenen ab,
deren Land nicht zum Themenbereich passt, und meldet ihre Zahl; das ist der
einzige Weg, eine Szene über eine Landesgrenze zu bewegen, denn die Oberfläche
bietet kein Verschieben an. Ein eigener Reiter pflegt die Zuständigkeit je Land.

### Zugänglichkeit und Gestaltung

Ausrichtung auf WCAG 2.1 AA mit Bedienelementen ab 44 × 44 Pixel, Fokusfalle in
Dialogen, ESC-Behandlung und durchgehendem Fokus-Ring. Helles und dunkles
Erscheinungsbild in einem hellen und einem dunklen Farbschema; die Anwendung
führt keine Bildmarke.

---

## Projektstruktur

```
RSI_Meta/
├── CLAUDE.md · CHANGELOG.md · README.md
├── ADMIN_HANDBUCH.md · BENUTZERHANDBUCH.md · GLOSSAR.md
├── BACKUP.md · BROWSER.md · OFFLINE.md · META_STORE_CHECKLIST.md
├── AUDIT_REPORT.md · REVIEW_CODE.md · REVIEW_SECURITY.md
├── docs/VR_SMOKE_REPORT.md      # Headset-Testprotokolle
├── .github/workflows/           # CI + Supabase-Keep-Alive
├── public/
│   ├── icons/ · logo/ · textures/
│   ├── impressum.html · datenschutz.html · glossar.html
│   └── manifest.webmanifest
├── supabase/
│   ├── functions/
│   │   ├── admin-auth/          # PIN gegen HMAC-Token, 2 h gültig
│   │   ├── admin-write/         # token-geprüfte Schreibzugriffe
│   │   └── kurs-auth/           # Kurspasswort serverseitig prüfen
│   ├── migrations/              # rsi_kurse, Kurspasswort-Pfeffer, results.detail
│   └── keepalive.sql
└── src/
    ├── App.tsx · main.tsx · xrStore.ts · index.css
    ├── types/index.ts
    ├── data/
    │   ├── scoringEngine.ts     # WICHTIGKEIT_TABLE + Matrizen (Sacred File)
    │   ├── laender.ts           # 249 Codes nach ISO 3166-1 alpha-2
    │   ├── verfahren.ts         # Zuordnung Land zu Verfahren
    │   ├── zustaendigkeit.ts    # Trägerschaft je Land
    │   ├── scoreCalc.ts         # Punkte, Teilpunkte, Hinweis-Abzüge
    │   ├── bestandenKriterium.ts
    │   ├── ergebnisModel.ts     # Matrix-Herleitung für Browser und VR
    │   ├── berichtModel.ts      # Aufbereitung für den PDF-Bericht
    │   ├── appData.ts           # localStorage-CRUD, Typen, Seed
    │   ├── supabaseSync.ts · idGenerator.ts · topicIcons.ts
    │   ├── regelwerkKatalog.ts · strassenmerkmale.ts
    │   └── kriteriumLabels.ts · abweichungLabels.ts
    ├── utils/
    │   ├── pdfExport.ts · sphereCoords.ts
    │   └── vrHaptics.ts · vrPanelOffsets.ts
    ├── lib/
    │   ├── supabase.ts · supabaseStorage.ts
    │   └── sentry.ts · logger.ts · useFocusTrap.ts · utils.ts
    ├── i18n/                    # index.ts + de/fr/it/en
    │   └── verfahren.bfu.ts     # Bezeichnungen des Verfahrens (Sacred File)
    └── components/
        ├── LandingPage.tsx · Navbar.tsx · ZustaendigkeitKarte.tsx
        ├── TopicDashboard.tsx · SceneList.tsx · TrainingEinstieg.tsx
        ├── SceneViewer.tsx      # 360°-Viewer, Klick-Flow, VR-Panels
        ├── ScoringFlow.tsx · LernKarte.tsx · SzenenAbschluss.tsx
        ├── RankingView.tsx · KategoriePanel.tsx · KlickFeedback.tsx
        ├── FeedbackModal.tsx · LanguageSwitcher.tsx
        ├── AdminDashboard.tsx
        └── admin/
            ├── BildEditor.tsx · BildUpload.tsx · AdminRanking.tsx
            ├── ZustaendigkeitTab.tsx
            ├── modals/          # Thema, Szene, Defizit, Kurs
            └── fields/          # Mehrsprachige Eingabefelder
```

---

## Normative Grundlagen

| Quelle | Rolle im Tool |
|---|---|
| TBA-Fachkurs FK RSI, V 16.09.2020 | WICHTIGKEIT_TABLE mit 58 Kriterien, 9-Schritte-Methodik, Matrizen |
| bfu-Bericht 73 | NACA-Skala 0–7, Verletzungsschwere |
| SN 641 723:2016, Abb. 2 | Normative Unfallrisiko-Matrix (Ausgabe, aus der die Abbildung stammt) |
| VSS 41 723 / VSS 41 722 | Geltende Nummern für Inspektion und Audit (früher SN 641 723 / SN 641 722) |
| bfu-Werkzeugkasten | Weitere Normbezüge in `regelwerkKatalog.ts` |
| ISO 3166-1 alpha-2 | Ländercodes in `laender.ts`, 249 offiziell zugeteilte, Stand 6. September 2026 |

Die Matrizen `calcRelevanzSD` und `calcUnfallrisiko` wurden gegen die
Originalfolien des Fachkurses geprüft; der Befund steht im `AUDIT_REPORT.md` vom
28. März 2026. Unit-Tests pinnen alle 18 Zellwerte gegen die Engine.

---

## Deployment

### Vercel

1. Vercel-Projekt auf `FaSiMaster/RSI_Meta` verbinden, `base: '/'` in
   `vite.config.ts`.
2. Umgebungsvariablen setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_USERNAME_SALT` sowie wahlweise `VITE_SENTRY_DSN`.
3. Push auf `main` löst Build und Deployment aus.

### Supabase

1. Projekt in der Region EU anlegen.
2. Tabellen `rsi_topics`, `rsi_scenes`, `rsi_deficits`, `rsi_kurse` und
   `rsi_results` mit RLS: anonym nur lesend auf Inhalte, auf `rsi_results` lesend
   und einfügend, ohne Löschrecht.
3. Storage-Bucket `rsi-textures` mit öffentlichem Lesezugriff.
4. Edge Functions `admin-auth`, `admin-write` und `kurs-auth` deployen, jeweils
   ohne JWT-Prüfung; Einzelheiten in Abschnitt 2 des Admin-Handbuchs.
5. Secrets setzen: `ADMIN_PIN`, `ADMIN_TOKEN_SECRET` und
   `KURS_PASSWORT_PEPPER`. Die Werte gehören in einen Passwortsafe, nicht in
   dieses Repository.
6. Migrationen aus `supabase/migrations/` einspielen.

### Meta Quest

```bash
npm run dev
# im selben WLAN: http://[lokale-IP]:5173
```

Der Browser der Quest unterstützt `immersive-vr` von Haus aus. Am Arbeitsplatz
leistet die Chrome-Erweiterung «Immersive Web Emulator» von Meta dieselben
Dienste.

---

## Build

Stand vom 6. September 2026, gemessen mit `npm run build`:

```
3439 Module transformiert
JS   2114 kB (gzip 590 kB)
CSS    17 kB (gzip   4 kB)
Dauer  ~27 s
```

pdfmake bildet einen eigenen Chunk und wird erst beim Klick auf «Bericht»
geladen. Der Service Worker legt die App-Shell vorab in den Cache und holt
`impressum.html`, `datenschutz.html` und `glossar.html` bevorzugt aus dem Netz.
Die Precache-Grenze steht in `vite.config.ts` auf 3 MiB, weil der Hauptchunk die
voreingestellten 2 MiB überschreitet.

Gates zum selben Stand: `tsc --noEmit` ohne Fehler, 193 Unit-Prüfungen in 19
Dateien und 42 Prüfungen im Browser in 7 Dateien, alle grün.

---

## Entwicklungshinweise

Geschrieben wird Schweizer Hochdeutsch: `ss` statt `ß`, echte Umlaute statt
`ae`/`oe`/`ue`. Ausgenommen sind Bezeichner im Code und Schlüssel in JSON.

Schlüssel im localStorage tragen das Präfix `rsi-v3-`. Im sessionStorage liegen
`rsi-admin-token` mit zwei Stunden Gültigkeit und das Flag `rsi-admin-auth`.

`correctAssessment` eines Defizits muss normativ stimmen; die Neuberechnung im
Administrationsbereich hilft dabei. Neue Einträge in der WICHTIGKEIT_TABLE sind
gegen den Fachkurs zu verifizieren – `scoringEngine.ts` ist ein Sacred File und
durch einen Hook geschützt.

Dasselbe gilt für `src/i18n/verfahren.bfu.ts`: Dort stehen die Bezeichnungen des
Verfahrens, und ein geänderter Wortlaut braucht eine Verifikation gegen den
Fachkurs. Der Schutz ist bisher eine Namenskonvention; das Muster «bfu» fehlt in
der Hook-Konfiguration unter `claude-config/hooks/`.

Die Zuständigkeiten je Land liegen im localStorage unter
`rsi-v3-zustaendigkeiten` und werden bewusst nicht nach Supabase abgeglichen.
Sie wandern über Ausfuhr und Einfuhr im Administrationsbereich; ohne einen
solchen Auszug bleibt ein Eintrag auf dem Gerät, auf dem er gemacht wurde.

Panorama-Bilder liegen produktiv in Supabase Storage, nicht unter
`public/textures/`. Offene Punkte stehen im `AUDIT_REPORT.md` und im
`CHANGELOG.md`.

---

## Supabase Keep-Alive

Supabase pausiert Projekte im kostenlosen Tarif nach rund einer Woche ohne
Zugriff. Der Workflow `.github/workflows/supabase-keepalive.yml` verhindert das
mit regelmässigen Leseabfragen auf die Tabelle `public.keepalive`; das Setup-SQL
liegt unter `supabase/keepalive.sql`.

Der Lauf ist auf Montag und Donnerstag, 06.00 Uhr UTC, gelegt und braucht die
Repository-Secrets `SUPABASE_URL` und `SUPABASE_ANON_KEY`. Jeder erfolgreiche
Lauf schreibt einen Zeitstempel in `keepalive.log`, den der Workflow bewusst
mitcommittet. Von Hand lässt sich der Lauf im Actions-Tab über «Supabase
Keep-Alive» auslösen.

---

## Lizenz

Privates Werkzeug von Stevan Skeledzic. Alle Rechte vorbehalten, keine offene
Lizenz.

Die Anwendung steht zur Nutzung offen: Sie richtet sich an ausgebildetes
Inspektionspersonal und an alle, welche die Methode erlernt haben und sie
anwenden möchten. Quellcode und Inhalte dürfen ohne vorherige schriftliche
Zustimmung weder vervielfältigt noch weiterverbreitet oder bearbeitet werden.

Die Wichtigkeits-Tabelle und die beiden Bewertungsmatrizen stammen aus dem
TBA-Fachkurs FK RSI (V 16.09.2020), die NACA-Einstufung aus dem bfu-Bericht 73.
Die Rechte an diesen fachlichen Grundlagen liegen bei den jeweiligen Urhebern
und werden als Quelle ausgewiesen.
