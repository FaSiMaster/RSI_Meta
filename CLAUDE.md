# RSI VR Tool – CLAUDE.md

## Projekt

**Name:** RSI VR Tool (Road Safety Inspection – Immersive VR)
**Repo:** FaSiMaster/RSI_Meta
**Pfad:** `C:\ClaudeAI\RSI_Meta`
**Entwickler:** Stevan Skeledzic (Stevo) — privates Projekt

**Ziel:** Inspektorinnen und Inspektoren beurteilen Strassenszenen im Browser und in VR (Meta Quest 3), markieren und dokumentieren Sicherheitsdefizite anhand der normativen 9-Schritte-RSI-Methodik. Vertrieb als PWA über den Meta Horizon Store.

---

## Tech Stack

| Schicht | Technologie | Version |
|---|---|---|
| Version | **v0.20.0** (2026-09-12) | Zweites Beurteilungsverfahren (Deutschland), Szenentyp Bildserie, Beispielszene Niederfrauendorf |
| Framework | React + Vite + TypeScript | React 18.3, **Vite 7.3**, TS strict |
| Styling | Tailwind CSS (`@tailwindcss/vite`) | v4.2 |
| Animation | Framer Motion (motion/react) | v12 |
| i18n | react-i18next / i18next | v17 / v26 |
| State | zustand | v4 |
| 3D Rendering | `@react-three/fiber` + `drei` | v8 / v9 |
| WebXR | `@react-three/xr` | v6 |
| PDF | pdfmake (dynamisch nachgeladen) | v0.3 |
| Icons | lucide-react | — |
| Build | Vite 7 + vite-plugin-pwa | v1.2, Service Worker |
| Tests | Vitest + Playwright | 303 Unit-Prüfungen in 26 Dateien, 69 im Browser in 11 Dateien |
| Hosting | Vercel (Primär) | HTTPS-Pflicht für WebXR |
| Persistenz | localStorage (`rsi-v3-*`) + **Supabase** | Postgres, Storage, 3 Edge Functions |

**Vite bleibt auf 7.x** — ab Vite 8 greift Rolldown, mit dem `vite-plugin-pwa`
nicht zusammenarbeitet.

**Target Device:** Meta Quest 3 (Meta Horizon OS, Meta Quest Browser)
**i18n-Sprachen:** de (Haupt), fr, it, en

---

## Projektstruktur

```
RSI_Meta/
├── CLAUDE.md                       # Diese Datei
├── README.md · CHANGELOG.md · GLOSSAR.md
├── ADMIN_HANDBUCH.md · BENUTZERHANDBUCH.md
├── BACKUP.md · BROWSER.md · OFFLINE.md · META_STORE_CHECKLIST.md
├── AUDIT_REPORT.md · REVIEW_CODE.md · REVIEW_SECURITY.md
├── docs/
│   ├── VR_SMOKE_REPORT.md          # Headset-Testprotokolle (A–J)
│   ├── NORMREFERENZEN_PRUEFUNG.md  # Normnummern gegen Verzeichnis und Bestand
│   ├── DE_Unfallkommission_Plan.md # Verfahren DE: Bestand, Entscheide, Befunde
│   └── METADATEN.md
├── daten/                          # Erzeugte Datensätze, nicht gebündelt
│   ├── entscheide_2026_09_06.py    # Was entschieden wurde, mit Grund
│   ├── sprachen_2026_09_06.py      # fr, it, en zu allem Erzeugten
│   ├── merkmale_lesen.py           # Strassenmerkmale aus der Geodatenbank
│   ├── niederfrauendorf_2026_09_12.py  # Beispielszene DE, mit Abstandsprüfung
│   ├── NIEDERFRAUENDORF.md         # Anleitung zur Einfuhr der Szene
│   ├── normlogik.py                # liest scoringEngine.ts und rechnet damit
│   ├── anlegen.py · pruefe.py · pruefe_die_pruefung.py
│   ├── einlesen.mjs                # Einfuhr über die Oberfläche, gesteuert
│   └── bestand/                    # Kopie des Supabase-Stands
├── package.json · vite.config.ts · tsconfig.json · index.html
├── .github/workflows/              # CI + Supabase-Keep-Alive
├── public/
│   ├── icons/ · logo/ · textures/
│   └── impressum.html · datenschutz.html · glossar.html
├── supabase/
│   ├── functions/
│   │   ├── admin-auth/             # PIN → HMAC-Token (2 h TTL)
│   │   ├── admin-write/            # Token-geprüfte Writes (x-admin-token)
│   │   └── kurs-auth/              # Kurspasswort serverseitig (PBKDF2 + Pepper)
│   ├── migrations/                 # rsi_kurse, Passwort-Pfeffer, results.detail
│   └── keepalive.sql
├── src/
│   ├── main.tsx                    # React-Einstieg, i18n-Init, ErrorBoundary
│   ├── App.tsx                     # Haupt-Router (view-State), Theme, Score, VR-Weiche
│   ├── index.css                   # Reset + CSS-Design-Tokens (--zh-*)
│   ├── xrStore.ts                  # XR-Session Singleton (model: false!)
│   ├── types/index.ts
│   ├── data/
│   │   ├── scoringEngine.ts        # WICHTIGKEIT_TABLE (58), Matrizen (SACRED)
│   │   ├── laender.ts              # 249 Codes ISO 3166-1 alpha-2
│   │   ├── verfahren.ts            # Zuordnung Land → Verfahren
│   │   ├── bewertung.ts            # Union der zwei Bewertungsformen, Leseregel
│   │   ├── punkteUko.ts            # Punkte der Konvention DE (kein Sacred File)
│   │   ├── zustaendigkeit.ts       # Trägerschaft je Land (nur localStorage)
│   │   ├── scoreCalc.ts            # calcScore, KATEGORIE_TEILPUNKTE, HINT_ABZUG_*
│   │   ├── bestandenKriterium.ts   # Pflicht + 60 % + Gestaltungsbefunde erkannt
│   │   ├── ergebnisModel.ts        # Matrix-Herleitung für Browser + VR
│   │   ├── berichtModel.ts         # Aufbereitung PDF-Bericht (rein, ohne React)
│   │   ├── appData.ts              # localStorage CRUD, Typen, ml(), Seed
│   │   ├── supabaseSync.ts         # Writes via Edge Function
│   │   ├── idGenerator.ts · topicIcons.ts · regelwerkKatalog.ts
│   │   ├── strassenmerkmale.ts
│   │   └── kriteriumLabels.ts · abweichungLabels.ts
│   ├── utils/
│   │   ├── pdfExport.ts            # pdfmake-Dokument (lazy import)
│   │   ├── sphereCoords.ts         # Sphärische Koordinaten, Trefferprüfung
│   │   └── vrHaptics.ts · vrPanelOffsets.ts
│   ├── lib/
│   │   ├── supabase.ts · supabaseStorage.ts
│   │   └── sentry.ts · logger.ts · useFocusTrap.ts · utils.ts
│   ├── styles/design-tokens.css
│   ├── i18n/                       # index.ts + de/fr/it/en (539 Blatt-Keys)
│   │   ├── verfahren.bfu.ts        # 104 Verfahrensbezeichnungen (SACRED)
│   │   └── verfahren.uko.ts        # 28 Bezeichnungen der Konvention DE
│   └── components/
│       ├── LandingPage.tsx · Navbar.tsx · ZustaendigkeitKarte.tsx
│       ├── TopicDashboard.tsx · SceneList.tsx · TrainingEinstieg.tsx
│       ├── SceneViewer.tsx         # 360°-Viewer, Klick-Flow, alle VR-Panels
│       ├── BildwandViewer.tsx      # Bildserie als flache Wand, Klick-Flow
│       ├── ScoringFlow.tsx · ScoringFlowUko.tsx
│       ├── LernKarte.tsx · SzenenAbschluss.tsx
│       ├── RankingView.tsx · KategoriePanel.tsx · KlickFeedback.tsx
│       ├── FeedbackModal.tsx · LanguageSwitcher.tsx
│       ├── AdminDashboard.tsx      # Hülle; Modals ausgelagert (Sprint 3)
│       └── admin/
│           ├── BildEditor.tsx · BildUpload.tsx · AdminRanking.tsx
│           ├── ZustaendigkeitTab.tsx
│           ├── modals/             # Thema, Szene, Defizit, Kurs
│           └── fields/             # ML-Inputs, NormRefPicker, Vorschaubild
└── _Archiv/                        # Lokal, nicht im Git (.gitignore)
```

---

## Code-Regeln

1. **Vollständige Dateien** liefern – kein Diff, kein Snippet, immer die ganze Datei
2. **QA-Check** vor jeder Ausgabe: Typen, Imports, JSX-Struktur, tsc 0 Fehler
3. **TypeScript strict** — kein `any`, alle Props typisiert
4. **Keine `ß`** — immer `ss` (Schweizer Hochdeutsch)
5. **Umlaute** — ä, ö, ü verwenden, nicht ae, oe, ue
6. **Kommentare auf Deutsch**, Code-Identifier auf Englisch
7. **Keine Emojis** ausser bei expliziter Anfrage
8. **Schweizer Zahlenformat:** `toLocaleString('de-CH')` für Anzeige
9. **Design-Token CSS-Variablen** für alle Farben (kein Hartcoding ausser RSI-spezifische)
10. **localStorage-Keys** immer mit Prefix `rsi-v3-` (bestehende Keys nicht ändern)
11. **Primärfarben:** `--rsi-dunkelblau: #00407C`, `--rsi-blau: #0076BD`
12. **i18n:** User-facing Strings über `t()`, dynamische Daten über `ml()`

---

## Normative Grundlagen

### RSI 9-Schritte-Methodik

Die RSI-Beurteilung folgt exakt dem TBA-Fachkurs FK RSI (V 16.09.2020):

| Schritt | Typ | Inhalt | Quelle |
|---|---|---|---|
| 1 | Benutzereingabe | Wichtigkeit aus WICHTIGKEIT_TABLE ablesen (io/ao) | TBA FK RSI, Folie 5 |
| 2 | Automatisch | Wichtigkeit in Relevanz-Matrix einzeichnen | TBA FK RSI, Folie 5 |
| 3 | Benutzereingabe | Abweichung beurteilen (gross/mittel/klein) | TBA FK RSI, Folie 5 |
| 4 | Automatisch | Abweichung in Relevanz-Matrix einzeichnen | TBA FK RSI, Folie 5 |
| 5 | Automatisch | Relevanz SD = calcRelevanzSD(W, A) | TBA FK RSI, Folie 5 |
| 6 | Automatisch | Relevanz SD in Unfallrisiko-Matrix einzeichnen | TBA FK RSI, Folie 6 |
| 7 | Benutzereingabe | NACA-Einstufung (0–7) | bfu-Bericht 73 |
| 8 | Automatisch | Unfallschwere in Unfallrisiko-Matrix einzeichnen | TBA FK RSI, Folie 6 |
| 9 | Automatisch | Unfallrisiko = calcUnfallrisiko(R, US) | TBA FK RSI, Folie 6 / SN 641 723:2016 Abb. 2 |

### Matrizen (normativ)

**calcRelevanzSD** (Wichtigkeit × Abweichung):

|  | klein | mittel | gross |
|---|---|---|---|
| **gross** | gering | mittel | hoch |
| **mittel** | gering | mittel | hoch |
| **klein** | gering | gering | mittel |

**calcUnfallrisiko** (Relevanz SD × Unfallschwere):

|  | leicht | mittel | schwer |
|---|---|---|---|
| **hoch** | mittel | hoch | hoch |
| **mittel** | gering | mittel | hoch |
| **gering** | gering | gering | mittel |

### NACA → Unfallschwere

- NACA 0–1 → leicht
- NACA 2–3 → mittel
- NACA 4–7 → schwer

### WICHTIGKEIT_TABLE

58 Kriterien aus dem TBA-Fachkurs FK RSI, je mit io- und ao-Wert (RSIDimension | ''). Gespeichert in `src/data/scoringEngine.ts`. Jede Änderung muss gegen den Fachkurs FK RSI V 16.09.2020 verifiziert werden.

### Normbezug (seit v0.18.0)

**Quelle der Zuordnung:** SN 641 700:2022 «Strassenverkehrssicherheit;
Grundnorm», Anhang G, Ziff. 16, Tabelle 2 «Thematische Zuordnung der
sicherheitsrelevanten Normen», S. 11–14. Die Norm ordnet dort jedem
Sicherheitskriterium ihre Normen zu und sagt selbst, die Liste sei nicht
abschliessend. `src/data/regelwerkKatalog.ts` folgt ihr: 84 Einträge, Titel aus
der Tabelle, Ausgabejahr aus dem Normenbestand des Projekts `vss_Normen`.

**Der Normbezug eines Defizits kommt aus drei Quellen**, in dieser Reihenfolge:
was der Inspektionsbericht im Text nennt, was Tabelle 2 dem Sicherheitskriterium
zuordnet, und — nur wo die Liste des Kriteriums vierzehn oder acht Normen
umfasst — eine Auswahl je Einzelfall. Die dritte ist eine Schlussfolgerung und
in `daten/entscheide_2026_09_06.py` als solche gekennzeichnet.

**Zwei Fallen, beide belegt:**

- **«VSS 41 723» gibt es nicht.** Das Gesamt-Normenverzeichnis VSS 41 001,
  Ausgabe 2024-10, führt die Inspektion als SN 641 723:2016 und das Audit als
  SN 641 722:2017; umgenummert sind nur VSS 41 721 und VSS 41 725. Wer die
  Nummer ändert, braucht einen Beleg, keine Analogie.
- **Das Feld `gueltigkeit` des Normenbestands taugt nicht als Massstab.** Es
  steht bei der geltenden VSS 40 241:2019 auf «veraltet» und ist nur bei 1536
  von 3882 Einträgen gesetzt.

Der Wächter `src/test/normnummern.test.ts` hält jede im Quellbaum verwendete
Nummer gegen den Bestand. Vollständige Gegenüberstellung:
`docs/NORMREFERENZEN_PRUEFUNG.md`.

---

## Länderweiche (seit v0.16.0)

**Feld `country`** nach ISO 3166-1 alpha-2 an `AppTopic` (nur oberstes Thema),
`AppScene`, `Kurs`, `RankingEntry` und `SceneResult`. Überall optional.

**Leseregel:** Ein Datensatz ohne Feld – oder mit einem Wert, den ISO 3166-1
nicht zuteilt – gilt beim Lesen als `CH`; festgeschrieben wird der Wert beim
nächsten regulären Speichern. Nötig, weil die Daten im localStorage jedes
Geräts und in Supabase liegen und es keinen Ort gibt, an dem der Bestand
zentral zu berichtigen wäre. Untergeordnete Themen tragen **kein** eigenes
Feld; ihr Land liefert `getTopicCountry()`.

**Verfahren:** `VERFAHREN_JE_LAND` in `verfahren.ts` ordnet Land und Verfahren
zu. Hinterlegt sind zwei: `CH` → `bfu-fk-rsi-2020` und, seit v0.20.0,
`DE` → `de-uko-2`. Für jedes andere Land zeigt `ScoringFlow` einen Hinweis und
bricht ab – kein Ersatzablauf, keine Punkte. Derselbe Riegel steht im VR-Pfad
in `App.tsx`, dort allerdings ohne Anzeige, weil ein VR-Panel dafür fehlt; das
gilt seit v0.20.0 auch für die Konvention.

**Welcher Ablauf läuft, entscheidet der Datensatz, nicht das Land.** Die Weiche
in `App.tsx` liest `istUko(deficit.correctAssessment)`. Das Land steuert, was
die Verwaltung zum Anlegen anbietet; ist ein Befund einmal angelegt, trägt er
sein Verfahren selbst. Ein Vergleich über Land und Datensatz könnte
auseinanderlaufen, und dann gewinnt immer der Datensatz.

**Sprachtrennung:** Der i18next-Namensraum `verfahren` trägt die Bezeichnungen
des Neunschrittpfades (104 Schlüssel), `verfahrenUko` die der Konvention
(28 Schlüssel), `translation` die Bedienung. Aufruf im Code:
`t('verfahren:step1Title')` bzw. `t('verfahrenUko:schritt1Titel')`.

**Regeln:** Ein Kurs gehört zu genau einem Land, abgeleitet aus dem ersten
zugeordneten Thema. Der Import weist Szenen ab, deren Land nicht zum Thema
passt – die Oberfläche bietet kein Verschieben an. Die Gesamtrangliste fasst
weiterhin über Länder zusammen, zeigt das Land aber als Spalte und lässt sich
filtern.

**Zuständigkeit:** Je Land ein Datensatz in `rsi-v3-zustaendigkeiten`, bewusst
ohne Supabase-Abgleich, verteilt über Ausfuhr und Einfuhr. Die Schweiz ist
**nicht** im Code vorbelegt: Der Wächter `keine-affiliation.test.ts` hält
Behördenbezüge aus dem Quellbaum, seit das Werkzeug in v0.12.0 zum privaten
Projekt wurde. Ohne Eintrag zeigt die Anwendung «noch nicht bestimmt» samt
Vorläufigkeitshinweis – für jedes Land.

**Sprachkennung deutscher Inhalte – entschieden (E-2, 12.09.2026).** Es gibt
keinen fünften Sprachschlüssel. Deutsche Inhalte stehen im bestehenden Feld
`de`, geschrieben in Schweizer Orthografie. `MultiLang` bleibt ein festes
Gebilde aus `de`, `fr`, `it`, `en`; eine fünfte Kennung hätte jeden
Inhaltsdatensatz berührt, und die Suche nach dem ß bleibt scharf.

---

## Verfahren der Unfallkommission, Deutschland (seit v0.20.0)

**Zwei Schritte statt neun.** Schritt 1: Ist der Befund ein Sicherheitsdefizit
oder ein Gestaltungsbefund? Schritt 2, nur bei einem Sicherheitsdefizit: wie
schwer wiegt es, gross, mittel oder klein?

Die Konvention ist eine **Vereinbarung mit Fachexperten, keine Norm**. Ein Norm-
oder Richtlinienbezug wird ihr nicht zugeschrieben; BASt, FGSV, ESAS und RSAS
kommen in ihren Texten nicht vor, und ein Wächter prüft das am gerenderten
Ergebnis.

### Wo was steht

| Teil | Ort |
|---|---|
| Datenmodell, Union der Bewertungen | `src/data/bewertung.ts` |
| Punkte der Konvention | `src/data/punkteUko.ts` |
| Land auf Verfahren | `src/data/verfahren.ts` |
| Wörter des Verfahrens | `src/i18n/verfahren.uko.ts`, Namensraum `verfahrenUko` |
| Ablauf mit zwei Schritten | `src/components/ScoringFlowUko.tsx` |
| Szenentyp Bildserie | `src/components/BildwandViewer.tsx` |

### Punkte, und woher sie kommen

Jeder Wert stammt aus einem Entscheid, festgehalten in
`.claude/entscheide/JOURNAL.md`. Wer eine dieser Zahlen ändert, ändert eine
Vereinbarung; das braucht einen Entscheid, keinen Commit.

| Grösse | Wert | Entscheid |
|---|---|---|
| Schritt 1 richtig | 60 | E-7a |
| Schritt 1 falsch | −60 | F-006 |
| Schritt 2 richtig | 40 | E-7a |
| Gewicht eines Gestaltungsbefundes | 60 gegen 100 | E-7b |

**Schritt 2 zählt nur, wenn Schritt 1 stimmt.** Wer einen Gestaltungsbefund für
ein Sicherheitsdefizit hält und ihn dann «gross» einstuft, hat den Befund
verkannt; Punkte für die Einstufung eines Befundes, den es so nicht gibt, wären
eine Belohnung für den Folgefehler.

**Die beiden Teilscores werden nie addiert angezeigt.** Einen Befund als
sicherheitsrelevant zu erkennen ist eine andere Fähigkeit, als ihn richtig
einzustufen; eine gemeinsame Zahl verdeckt genau diesen Unterschied.

**Keine Kategoriepunkte.** Im Schweizer Ablauf trägt die Zuordnung zur
Defizitkategorie 25 Punkte; für die Konvention ist kein Gegenstück vereinbart,
und einen Wert zu erfinden wäre eine Vereinbarung, die niemand getroffen hat.
Der Hinweisabzug gilt dagegen, weil er das Auffinden betrifft.

### Bestanden

Seit v0.20.0 hat `bestandenKriterium.ts` eine dritte Bedingung: **jeder
Gestaltungsbefund muss in Schritt 1 als solcher erkannt sein.** Ohne sie war die
Beispielszene zu bestehen, ohne Schritt 1 zu beherrschen. Für Szenen des
Neunschrittpfades ändert sie nichts, weil es dort keine Gestaltungsbefunde gibt.
Je Szene abschaltbar über `bestandenKriterium.gestaltungErkannt`.

### Der Dateiname punkteUko.ts

Der Auftrag nannte `scoringEngineDE.ts`. Der Norm-Compliance-Hook blockiert das
Pfadmuster `src/data/scoringEngine` per Präfixtreffer, und der Name wäre
fachlich falsch: eine «ScoringEngine DE» klingt wie eine zweite Fassung des
normativen Motors, und genau das ist sie nicht.

---

## Szenentyp Bildserie (seit v0.20.0)

`AppScene.szenentyp` trägt `panorama` oder `bildserie`; fehlt das Feld, gilt
`panorama`. Eine Bildserie führt `phasen`, je Phase eine Bezeichnung, eine
mehrsprachige Zeitangabe, die Bilder und das Merkmal `bewertet`.

**Nur in einer bewerteten Phase ist etwas zu finden.** Eine Vergleichsphase
zeigt denselben Ort zu einer anderen Zeit und trägt keine Verortungen.

**Verortung im Bild:** vierter Fall von `DefizitVerortung` mit normalisierten
Koordinaten, `{ typ: 'bild', x, y, r }`. Der Schlüssel in
`AppDeficit.verortungen` ist die vollständige Bildadresse — dasselbe Muster wie
bei den Perspektiven eines Panoramas.

Das **Seitenverhältnis ist Pflichtparameter** von `trefferImBild()`. Ohne es
wird der Trefferradius auf einem breiten Bild zum Oval, und weil der Marker rund
gezeichnet wird, sieht man es nicht.

**Der Canvas liegt absolut**, nicht als Flex-Kind. Mit `flex: 1` in einem Kasten
ohne eigene Höhe fällt React Three Fiber auf 150 Bildpunkte zurück, und zwar
stumm.

**Die Wand wird aus dem Sichtfeld gerechnet**, nicht angenommen. Wie viel eine
feste Breite in Metern einnimmt, hängt am Blickwinkel der Kamera und am
Seitenverhältnis des Fensters, und beides ist keine Konstante.

**Ein Klick setzt erst eine Marke**, erst «Bestätigen» prüft die Stelle — wie im
Panorama-Viewer. Zwei Hinweisstufen mit demselben Abzug, 10 und 25 Punkte. Ab
Stufe 1 zeigt der Bildwahlknopf, wie viele Befunde je Bild offen sind; gratis
wäre das ein Gratis-Hinweis.

**In der Brille fehlt der Bewertungsablauf für die Konvention.** Die Bildwand
ist dort sichtbar, bewertet wird im Browser; der VR-Pfad bricht mit einem
Protokolleintrag ab, statt zu rechnen.

---

## Datenmodell (appData.ts)

### localStorage Keys (v3)

| Key | Inhalt |
|---|---|
| `rsi-v3-topics` | AppTopic[] |
| `rsi-v3-scenes` | AppScene[] |
| `rsi-v3-deficits` | AppDeficit[] |
| `rsi-v3-session` | UserSession |
| `rsi-v3-ranking` | RankingEntry[] |
| `rsi-v3-init-v3` | '1' (verhindert Re-Seed) |
| `rsi-v3-zustaendigkeiten` | Zustaendigkeit[] – kein Supabase-Abgleich |
| `rsi-v3-landfilter` | zuletzt gewählter Landfilter am Einstieg |

### Kerntypen

```ts
type RSIDimension = 'gross' | 'mittel' | 'klein'
type NACADimension = 'leicht' | 'mittel' | 'schwer'
type ResultDimension = 'hoch' | 'mittel' | 'gering'
type NacaRaw = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

interface Perspektive {
  id: string
  label: string
  bildUrl: string
  startblick?: { theta: number; phi: number } | null
  standortPosition?: { theta: number; phi: number } | null  // Position im Haupt-Panorama
  navMarker?: Record<string, { theta: number; phi: number }> | null  // Navigation zu anderen Standorten
}

interface AppDeficit {
  id: string
  sceneId: string
  topicId: string
  nameI18n: MultiLang
  beschreibungI18n: MultiLang
  kriteriumId: string              // Key in WICHTIGKEIT_TABLE
  kontext: 'io' | 'ao'
  correctAssessment: {
    wichtigkeit: RSIDimension
    abweichung: RSIDimension
    relevanzSD: ResultDimension
    naca: NacaRaw
    unfallschwere: NACADimension
    unfallrisiko: ResultDimension
  }
  isPflicht: boolean
  isBooster: boolean
  normRefs: string[]
  verortung?: DefizitVerortung | null
  verortungen?: Record<string, DefizitVerortung> | null  // Pro Perspektive
}
```

---

## 360°-Panorama Technik

- **Sphere:** radius=500, `side={THREE.BackSide}`, Kamera bei `[0,0,0.01]`
- **Textur-Fix:** `repeat.x=-1` + `offset.x=0.75` – korrigiert BackSide-Spiegelung und 90°-UV-Offset
- **Startblick:** `azimuth = -(theta * PI/180)` (OrbitControls-Konvention), rAF-Retry bei Mount
- **Perspektiven:** Kein Fallback auf Haupt-Verortung bei aktiver Perspektive
- **Gefundene Defizite:** Grüner Hotspot-Marker immer sichtbar (auch ohne Hints, über alle Perspektiven)
- **Standort-Navigation:** Bidirektional via standortPosition + navMarker
- **XR-Store:** `model: false` – Pflicht (verhindert CDN-GLTF-Download-Crash)

---

## Roadmap

### Phase 1 – Basis-Setup (abgeschlossen)
- [x] Vite + React + TypeScript Setup
- [x] `@react-three/fiber` + `@react-three/xr` v6 konfiguriert
- [x] PWA-Manifest (Bubblewrap-ready)

### Phase 2 – Browser-Training (abgeschlossen, v0.3.1)
- [x] 9-Schritte RSI-Beurteilungsfluss (ScoringFlow)
- [x] Klick-Bestätigung, Bewertungs-Overlays
- [x] Perspektiven, Standort-Navigation (bidirektional)
- [x] Best-of Punktesystem, Sterne, Zeiterfassung
- [x] 4-Ebenen-Ranking, ESC-Taste
- [x] Admin-Dashboard (Defizit-CRUD, BildEditor mit Drag&Drop)
- [x] i18n (de/fr/it/en) 100%, alle Labels via t()
- [x] Dark/Light Theme
- [x] Panorama-Textur Spiegelung korrigiert
- [x] App-Reset (SW + Cache + localStorage)
- [x] Avatar-Popover (Abmelden, Reset)
- [x] Schritt-Anleitung + RSI-Methodik-Karte (TopicDashboard)
- [x] Startbutton-Validierung (Name-Pflichtfeld)
- [x] Startblick-Fix (Race-Condition, rAF-Retry)
- [x] Gefundene Defizite grün markiert (alle Perspektiven)
- [x] Szenen-Vorschaubild in SceneList
- [x] Strassenmerkmale-Dropdown-Katalog (Funktionalität)
- [x] Umlaute in Kriterium-Labels (kriteriumLabels.ts)
- [x] Themen-Sortierung im Admin funktional

### Phase 3 – VR-Integration (abgeschlossen, v0.8.0–v0.9.1)
- [x] WebXR `immersive-vr` Session (Meta Quest 3)
- [x] Controller-Tracking, Ray-Reticle, Haptik bei Treffern
- [x] Standort-Wechsel über Diamant-Marker im Bild
- [x] Verschiebbare VR-Panels mit persistierter Position (v0.9.0)
- [x] Session-Lifecycle sauber (`session.end()` bei Szenenende)
- [ ] Eigene 360°-Strassenszenen (Insta360 / Ricoh Theta) — offen, Feldarbeit

### Phase 4 – VR-Mangelmarkierung (abgeschlossen, v0.8.1–v0.9.1)
- [x] Raycasting mit Controller
- [x] Marker setzen mit Bestätigungsschritt
- [x] Panels für Kategorie und die drei Bewertungsschritte
- [x] Scoring-Summary in VR: Ergebnis, Matrix-Herleitung, Lernkarte

### Phase 5 – Dokumentation & Export (v0.11.0, teilweise)
- [x] PDF-Export (RSI-konform) — Auswertung + Befundliste, pdfmake
      lazy geladen; Teilnehmer, Admin je Kurs, Admin je Einzelresultat
- [x] Bericht nachträglich abrufbar über die Szenenkarte (bester Versuch, v0.11.1)
- [ ] Session-Review im Browser

### Phase 7 – Deutschland (v0.20.0, teilweise)
- [x] Datenmodell für zwei Beurteilungsverfahren, Leseregel für Altdaten
- [x] Verfahrensweiche je Land, eigener i18n-Namensraum
- [x] Ablauf mit zwei Schritten, zwei getrennte Teilscores
- [x] Szenentyp Bildserie mit Phasen und Zeitangabe
- [x] Beispielszene Niederfrauendorf, eingelesen und live
- [ ] Verortungseditor für Bildserien — offen, heute geht Korrektur nur über
      die Einfuhrdatei
- [ ] Bewertungsablauf in der Brille — offen, ein VR-Panel fehlt
- [ ] Strassenmerkmale der Szene aus dem Auditbericht — offen

### Phase 6 – Meta Horizon Store (geplant)
- [ ] Bubblewrap-Konfiguration
- [ ] Store-Listing, Asset Pack
- [ ] Meta Horizon Store Einreichung

---

## Lokale Entwicklung

```bash
npm install
npm run dev
# → http://localhost:5173
# → http://[lokale-IP]:5173  (für Meta Quest im selben WLAN)

npm run build       # Production-Build (Vite + PWA)
npm run preview -- --host  # Build lokal testen
```

**Vercel:** Kein Konfig nötig, `base: '/'`.

---

## WebXR Hinweise (Phase 3+)

- `createXRStore()` immer ausserhalb der Komponente (Singleton)
- `<XR store={xrStore}>` umschliesst die gesamte R3F-Szene
- HTTPS Pflicht für WebXR auf echtem Gerät (localhost Ausnahme)
- Emulator: Chrome Extension "Immersive Web Emulator" (Meta)

---

## Skill

`/fasi-check` — Qualitätscheck für Visualisierungen und Texte

---

*Letzte Aktualisierung: 2026-09-12 (v0.20.0, Verfahren der Unfallkommission, Szenentyp Bildserie, Szene Niederfrauendorf)*
