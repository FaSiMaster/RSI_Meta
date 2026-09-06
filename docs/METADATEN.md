# Metadaten – RSI VR Tool

> Stand v0.18.0, 6. September 2026.

Alle Datensätze, ihre Felder und ihre Ablage. Massgebend ist der Quelltext:
`src/data/appData.ts` für Themen, Szenen, Defizite, Kurse und Ergebnisse,
`src/data/laender.ts` für die Ländercodes, `src/data/zustaendigkeit.ts` für die
Zuständigkeit. Wo diese Aufstellung und der Quelltext auseinandergehen, gilt der
Quelltext.

---

## 1. Ablage

| Schlüssel im localStorage | Inhalt | Abgleich mit Supabase |
|---|---|---|
| `rsi-v3-topics` | Themenbereiche | Tabelle `rsi_topics` |
| `rsi-v3-scenes` | Szenen | Tabelle `rsi_scenes` |
| `rsi-v3-deficits` | Defizite | Tabelle `rsi_deficits` |
| `rsi-v3-kurse` | Kurse | Tabelle `rsi_kurse` |
| `rsi-v3-scene-results` | Ergebnisse je Durchgang | Tabelle `rsi_results` |
| `rsi-v3-ranking` | Rangliste, älteres Format | nein |
| `rsi-v3-session` | laufende Anmeldung | nein |
| `rsi-v3-scene-session` | laufende Szene, für den Wiedereinstieg | nein |
| `rsi-v3-zustaendigkeiten` | Zuständigkeit je Land | **nein**, nur über Ausfuhr und Einfuhr |
| `rsi-v3-landfilter` | zuletzt gewählter Landfilter am Einstieg | nein |
| `rsi-v3-schema` | Schemastand, aktuell 2 | nein |
| `rsi-v3-init-v3` | Merker der ersten Befüllung | nein |

In Supabase steht der ganze Datensatz als JSON in der Spalte `data`; ein neues
Feld braucht deshalb keine Migration. Im `sessionStorage` liegen
`rsi-admin-token` mit zwei Stunden Gültigkeit und das Flag `rsi-admin-auth`.

---

## 2. Themenbereich (`AppTopic`)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | string | ja | Kennung, neue Themen `tp-<Zeitstempel>` |
| `nameI18n` | MultiLang | ja | Bezeichnung in de, fr, it, en |
| `beschreibungI18n` | MultiLang | ja | Beschreibung in vier Sprachen |
| `iconKey` | string | nein | Piktogramm aus `topicIcons.ts` |
| `sortOrder` | number | ja | Reihenfolge innerhalb der Ebene |
| `isActive` | boolean | ja | `false` archiviert das Thema |
| `parentTopicId` | string \| null | nein | gesetzt beim Unterthema |
| `gruppenId` | string \| null | nein | Altbestand |
| `createdAt` | number | nein | Anlage, Millisekunden seit Epoche |
| `kursExklusiv` | boolean | nein | `true` zeigt das Thema nur in zugewiesenen Kursen |
| `country` | LandCode | nein | Land nach ISO 3166-1 alpha-2, **nur am obersten Thema**; fehlt es, gilt CH |

Untergeordnete Themen tragen bewusst kein `country`. Ihr Land liefert
`getTopicCountry()`, das die Kette bis zum obersten Thema verfolgt.

---

## 3. Szene (`AppScene`)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | string | ja | Kennung `SZ_JJJJ_NNN` |
| `topicId` | string | ja | Verweis auf den Themenbereich |
| `nameI18n` | MultiLang | ja | Bezeichnung |
| `beschreibungI18n` | MultiLang | nein | Beschreibung |
| `bemerkungI18n` | MultiLang | nein | Hinweis der Kursleitung vor dem Start |
| `kontext` | `io` \| `ao` | ja | innerorts oder ausserorts |
| `panoramaBildUrl` | string \| null | nein | Haupt-Panorama im Bucket |
| `startblick` | `{theta, phi}` \| null | nein | Blickrichtung beim Start, Grad |
| `perspektiven` | Perspektive[] | nein | weitere Standorte |
| `vorschauBild1`, `vorschauBild2` | string \| null | nein | `panorama` übernimmt das Panoramabild |
| `strassenmerkmale` | StrassenMerkmal[] | nein | Angaben zur Strasse, mehrsprachig; siehe Ziff. 3.1 |
| `isActive` | boolean | ja | `false` blendet die Szene aus |
| `createdAt` | number | nein | Anlage |
| `bestandenKriterium` | Objekt \| null | nein | Abweichung vom Standard je Szene |
| `country` | LandCode | nein | Land; fehlt es, gilt CH |

### 3.1 Strassenmerkmal (`StrassenMerkmal`)

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | string | nein | Kennung aus `STRASSENMERKMALE_KATALOG`; fehlt sie, ist das Merkmal frei eingetragen |
| `labelI18n` | MultiLang | ja | Bezeichnung; bei Katalogmerkmalen die des Katalogs |
| `wertI18n` | MultiLang | ja | Wert; muss bei Katalogmerkmalen mit Wertliste in dieser Liste stehen |

Der Katalog in `src/data/strassenmerkmale.ts` führt 21 Merkmale in drei Gruppen:
Funktionalität, Verkehr und Verkehrsteilnehmende. Ein Katalogmerkmal erscheint
im Administrationsbereich als Auswahlfeld; ein Wert, der in keiner Option steht,
wäre dort nicht darstellbar und ginge beim nächsten Speichern verloren. Einzige
Ausnahme ist der durchschnittliche tägliche Verkehr – er führt keine Wertliste
und bekommt ein Eingabefeld.

Die Merkmale der dreizehn Szenen vom 6. September 2026 stammen aus der
Perimeterebene der RSI-Geodatenbank, die Domänencodes aufgelöst über die
Codeliste des Auswertungsprojekts. Sechs Codes kommen in keinem Portalexport mit
Klartext vor; die betroffenen 20 Werte bleiben leer statt geraten. Der Weg ist in
`daten/LIESMICH.md` beschrieben.

Eine Szene gehört in den Themenbereich ihres eigenen Landes. Der Import weist
Szenen ab, die dagegen verstossen; die Oberfläche bietet kein Verschieben an.

---

## 4. Defizit (`AppDeficit`)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | string | ja | Kennung `SD_NNNN` |
| `sceneId`, `topicId` | string | ja | Zuordnung |
| `nameI18n`, `beschreibungI18n` | MultiLang | ja | Bezeichnung und Beschreibung |
| `kriteriumId` | string | ja | Schlüssel in der WICHTIGKEIT_TABLE |
| `kontext` | `io` \| `ao` | ja | massgebend für die Wichtigkeit |
| `correctAssessment.wichtigkeit` | gross \| mittel \| klein | ja | Musterlösung Schritt 1 |
| `correctAssessment.abweichung` | gross \| mittel \| klein | ja | Musterlösung Schritt 3 |
| `correctAssessment.relevanzSD` | hoch \| mittel \| gering | ja | berechnet, Schritt 5 |
| `correctAssessment.naca` | 0–7 | ja | Musterlösung Schritt 7 |
| `correctAssessment.unfallschwere` | leicht \| mittel \| schwer | ja | aus NACA abgeleitet |
| `correctAssessment.unfallrisiko` | hoch \| mittel \| gering | ja | berechnet, Schritt 9 |
| `isPflicht` | boolean | ja | zählt für das Bestehen |
| `isBooster` | boolean | ja | prozentualer Zuschlag |
| `boosterBonusProzent` | 10 \| 20 | nein | Höhe des Zuschlags |
| `normRefs` | string[] | ja | Normbezüge als «Nummer — Titel», etwa `SN 641 723 — Strassenverkehrssicherheit; Inspektion (RSI)` |
| `kategorie` | DefizitKategorie | nein | eine von sieben Kategorien |
| `verortung` | DefizitVerortung \| null | nein | Lage im Haupt-Panorama |
| `verortungen` | Record<string, …> | nein | Lage je Perspektive |
| `erklaerungI18n` | MultiLang | nein | Text der Lernkarte |

Das Defizit trägt **kein** eigenes Land. Es hängt über `sceneId` und `topicId`
an seiner Szene; zwei Felder könnten auseinanderlaufen, sobald etwas umzieht.

`correctAssessment` ist normativ. Änderungen sind gegen den Fachkurs FK RSI zu
verifizieren.

---

## 5. Kurs (`Kurs`)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | string | ja | Kennung `k-<Zeitstempel>` |
| `name` | string | ja | Bezeichnung, etwa «FK RSI 2026-Q2» |
| `datum` | string | ja | Datum im Format JJJJ-MM-TT |
| `zugangscode` | string | ja | Muster `FK-RSI-NNNNNN` |
| `topicIds` | string[] | ja | zugewiesene Themen; leer zeigt die freie Auswahl |
| `isActive` | boolean | ja | Sichtbarkeit |
| `gueltigVon`, `gueltigBis` | number \| null | nein | Zeitfenster in Millisekunden |
| `passwort` | string \| null | nein | nur beim Speichern; der Server hasht |
| `hatPasswort` | boolean | nein | vom Server gesetzt |
| `createdAt` | number | ja | Anlage |
| `country` | LandCode | nein | Land des Kurses, abgeleitet aus dem ersten Thema |

Das Kurspasswort liegt nie im Klartext im localStorage. Geprüft wird es über die
Edge Function `kurs-auth` gegen einen gepfefferten Hash.

---

## 6. Ergebnis (`SceneResult`)

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | string | Kennung des Durchgangs |
| `sceneId`, `topicId` | string | Zuordnung |
| `username` | string | lokal Klarname; in Supabase der Hash |
| `punkte`, `maxPunkte`, `prozent` | number | Ergebnis |
| `gefunden`, `total` | number | gefundene und vorhandene Defizite |
| `versuch` | number | Zählung ab 1 |
| `timestamp` | string | ISO-Zeitstempel |
| `dauerSekunden` | number | Dauer des Durchgangs |
| `kursId` | string \| null | Kurs, sonst freies Training |
| `defizitResults` | DefizitResult[] | Ergebnis je Defizit |
| `pflichtGefunden`, `pflichtTotal` | number | für das Bestanden-Kriterium |
| `bestanden` | boolean | Ergebnis des Kriteriums |
| `country` | LandCode | Land; fehlt es, gilt CH |

Je Defizit hält `DefizitResult` fest, ob Kategorie, Wichtigkeit, Abweichung und
NACA stimmten, welche Beurteilung tatsächlich abgegeben wurde, wie lange sie
dauerte und welcher Hinweis-Abzug galt.

---

## 7. Zuständigkeit (`Zustaendigkeit`)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `country` | LandCode | ja | Land, für das die Angaben gelten |
| `organisation` | string | nein | verantwortliche Stelle |
| `grundlage` | string | nein | fachliche Grundlage: Kurs, Norm, Fassung |
| `stand` | string | nein | Stand der Inhalte, frei formuliert |
| `hinweis` | string | nein | Ergänzung, etwa zur Verbindlichkeit |
| `geaendertAm` | number | nein | letzte Änderung |

Sind alle vier Textfelder leer, gilt der Datensatz als leer, und die Anwendung
zeigt statt seiner den Vorläufigkeitshinweis. Die Felder sind einsprachig; wer
sie einträgt, wählt die Sprache.

---

## 8. Ländercode (`LandCode`)

Zweistelliger Grossbuchstabencode nach ISO 3166-1 alpha-2. Zulässig sind die 249
offiziell zugeteilten Codes; die Liste steht in `src/data/laender.ts`, Stand
6. September 2026, gegengeprüft an drei Quellen.

Nicht zulässig sind die ausnahmsweise reservierten Codes (AC, CP, CQ, DG, EA,
EU, UK), die benutzerdefinierten (XK) und die gelöschten Codes untergegangener
Staaten (unter anderem AN, CS, DD, SU, YU, ZR). Ein Datensatz mit einem
unzulässigen Wert wird beim Lesen so behandelt, als trüge er keinen: Er gilt als
schweizerisch.

Die Ländernamen sind nirgends gespeichert. Sie kommen zur Anzeigezeit aus
`Intl.DisplayNames` in der Sprache der Oberfläche.

---

## 9. Ausfuhr und Einfuhr

Der JSON-Auszug trägt `version: "rsi-v3"` und die Schlüssel `topics`, `scenes`,
`deficits`, `kurse` und `zustaendigkeiten`. Bilddaten enthält er nicht, nur
deren Pfade.

Beim Import gelten Grenzen: höchstens 500 Einträge je Kategorie, höchstens 2 MB
je eingebettetem Bild, Kennungen nach dem Muster `[A-Za-z0-9_-]{1,64}`. Szenen,
deren Land nicht zum Themenbereich passt, werden abgewiesen und gezählt. Die
Zuständigkeiten ersetzen den Bestand vollständig, weil sie je Land eindeutig
sind.
