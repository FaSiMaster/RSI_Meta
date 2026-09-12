# Deutschland: Verfahren der Unfallkommission

Plan und Bestandsaufnahme. Fassung 1, 12. September 2026.
Repo-Stand v0.19.3, Commit `4a94441`.

Dieses Dokument gehört zu Phase A. Es stellt fest, was im Repo steht, was im
Ordner Niederfrauendorf steht, und was daraus folgt. Alles unter d) und e) ist
**Vorschlag** und wird erst durch eine ausdrückliche Freigabe von Stevo zu einer
Festlegung. Kein Punktwert und kein `correctAssessment` wird aus eigener
Einschätzung geschrieben.

Schreibweise: Das Projekt schreibt kein ß. Deutsche Eigennamen und Zitate aus
dem Auditbericht stehen deshalb in Schweizer Orthografie, also «Glashütter
Strasse» statt der Schreibung des Originals. Die Schreibweise ist geändert, der
Wortlaut nicht.

---

## 0 Entscheide

### Gefallen am 12. September 2026

| Nr. | Frage | Entscheid |
|---|---|---|
| E-1 | Verfahrensauflösung | `src/data/verfahren.ts` wird erweitert. Keine zweite Registry, kein `assessmentMethodRegistry.ts`. Die `VerfahrensId` wird eine Union, die CH-Kennung bleibt aus `verfahren.bfu.ts` |
| E-2 | Sprachvariante deutscher Inhalte | Kein fünfter Sprachschlüssel. DE-Inhalte stehen im bestehenden Feld `de` in Schweizer Orthografie. `MultiLang` bleibt unberührt, die ß-Suche bleibt scharf |
| E-3 | Vergleichbarkeit der Punkte | Normierung auf die je Befund erreichbare Punktzahl. Die Rangliste trennt nach Land, ein Vergleich Schweiz gegen Deutschland wird nicht behauptet |
| E-4 | Verortung auf der Bildwand | Eigener Verortungstyp mit Bildkoordinaten, diskriminiert gegen die sphärische Verortung |
| E-5 | Herkunft der Designprobleme | Die zwei aus der Berichtsstruktur, Defizit 8 und 13 |
| E-6 | Ordner ins Repo | Nein, unverändert |
| E-7a | Verteilung Schritt 1 zu Schritt 2 | 60 zu 40 |
| E-7b | Gewicht eines Designproblems | Nur das Gewicht von Schritt 1, also 60 gegen 100 |
| E-8 | Bildauswahl | Alle sechs Bilder behalten |
| E-9 | Befunde der Übung | Sechs: Defizit 9, 10, 14, 4, 15 und 8. Abgewählt: 17, 16, 12, 3, 13, 18 |
| E-10 | Phase 2017 | Ja, als unbewertete Vergleichsphase |
| E-11 | Panoramaquelle | Street View als Übergang gewünscht, Mapillary zusätzlich prüfen. Siehe B-3 unten |
| E-12 | Massgebende Zeitangabe | Der Auditbericht, 21. Februar 2020 |

### Befunde aus den Entscheiden, offen vor B4

Drei Punkte sind erst mit den Entscheiden entstanden. B1 und B2 sind davon
nicht betroffen und können vorher laufen.

#### B-1 Zwei Bilder tragen keinen Befund mehr

E-9 wählt Defizit 17, 16 und 12 ab, E-8 behält alle sechs Bilder. Damit bleibt:

| Bild | Vorgesehene Defizite | Nach E-9 noch enthalten |
|---|---|---|
| 1 | 15, 16 | 15 |
| 2 | 8, 9, 4 | alle drei |
| 3 | 10, 14 | beide |
| 4 | 17 | **keines** |
| 5 | 12, 7 | **keines**, und 7 stand nie zur Wahl |
| 6 | 10, 14 | beide |

Bild 4 und Bild 5 wären damit Bilder ohne Aufgabe. Zur Sachlage gehört, dass
Defizit 17 der einzige Befund des Berichts ist, dem die Unfallanalyse das
laufende Geschehen unmittelbar zuordnet: fünf der zehn Unfälle, darunter alle
drei Längsverkehrsunfälle. Vorschlag: entweder 17 und 12 doch aufnehmen, oder
Bild 4 und 5 weglassen und die Übung auf vier Bilder führen.

#### B-2 Das Nullmodell besteht die Szene

Gerechnet mit E-7a, E-7b und den sechs Befunden aus E-9. Von den sechs ist
genau einer ein Designproblem, nämlich Defizit 8, weil 13 abgewählt ist.

| Grösse | Wert |
|---|---|
| Szenenmaximum | 5 mal 100 plus 1 mal 60 = 560 |
| Schritt 1 im Nullmodell, immer «Sicherheitsdefizit» | 5 von 6 richtig, 300 Punkte |
| Schritt 2 im Nullmodell, geraten bei drei Stufen | 5 mal 40 durch 3 = 66,7 Punkte |
| Erwartungswert | 366,7 von 560, also 65,5 % |
| Bestandensschwelle nach `bestandenKriterium.ts` | 60 % |

Wer Schritt 1 nie versteht und Schritt 2 rät, besteht die Szene. Die
Pflichtbefund-Regel greift dagegen nicht, weil sie das Auffinden im Bild prüft
und nicht die Bewertung.

Ursache ist das Verhältnis 5 zu 1. Mit einem zweiten Designproblem, also
Defizit 13 dazu, sinkt der Erwartungswert auf 293,3 von 520 und damit auf
56,4 %; das Nullmodell fällt durch. Vorschlag in dieser Reihenfolge: zweites
Designproblem aufnehmen, sonst eigene Befunde der Fachexperten nach E-5, und
erst als Notlösung die Schwelle für DE-Szenen erhöhen. Der Szenen-Override in
`bestandenKriterium.ts` könnte Letzteres ohne Codeänderung tragen.

#### B-3 Panoramaquellen, geprüft am 12. September 2026

Knotenpunkt bei 50.877375, 13.723016. Bestimmt aus OpenStreetMap als der
einzige Geometriepunkt, den die Wege mit `ref` S 183 und S 190 teilen. Die
Ortssuche nach der Glashütter Strasse allein liegt 160 m daneben.

| Quelle | Ergebnis | Lizenz |
|---|---|---|
| KartaView | **23 Bilder im Umkreis von 120 m**, drei davon 5 m vom Knoten, alle vom 30. Juli 2021 und damit aus der Zeit des Minikreisverkehrs. Projektion durchgehend `PLANE`, also keine Panoramen | CC BY-SA 4.0 nach dem OpenStreetMap-Wiki; die Angabe der Plattform selbst ist nicht gegengelesen, weil die Seite eine Javascript-Anwendung ist |
| Mapillary | Nicht prüfbar ohne Zugangsschlüssel. `graph.mapillary.com` antwortet mit «Invalid OAuth 2.0 Access Token». Ein Schlüssel ist kostenlos, die Prüfung dauert dann Minuten | CC BY-SA 4.0 |
| Panoramax | Keine Abdeckung, die Suche über die Umgebung liefert null Treffer | CC BY |

**Folge für E-11:** Keine offene Quelle liefert ein Panorama dieses
Knotenpunkts. Street View wäre die einzige Quelle mit Panorama, und das
Herunterladen und Zusammensetzen eines solchen Bildes für eine öffentlich
erreichbare Anwendung wird nicht umgesetzt. Lizenzkonform wäre allein eine
Einbettung über die Maps-Javascript-Schnittstelle mit Googles Attribution; die
trägt aber nur der Browserteil, nicht die Szene in der Brille, weil ein
eingebetteter Rahmen dort nicht darstellbar ist. Was bleibt: die Bildwand aus
B3 jetzt, eine eigene Aufnahme später, und die 23 KartaView-Bilder als legale
Ergänzung aus der richtigen Phase.

E-4 ist billiger als erwartet: `DefizitVerortung` in `src/utils/sphereCoords.ts`
ist bereits eine diskriminierte Union über das Feld `typ` mit den Fällen
`punkt`, `polygon` und `gruppe`. Ein vierter Fall fügt sich ein, ohne einen
bestehenden zu berühren.

### Offen, Entscheid vor B4

| Nr. | Frage | Lage |
|---|---|---|
| E-5 | Gibt es überhaupt Designprobleme in dieser Übung? | Der Auditbericht führt **kein** Beispiel. Siehe d). Ohne Entscheid ist Schritt 1 der Konvention trivial. Blockiert B4 |
| E-6 | Kommt der Ordner ins Repo? | Vorschlag: nein. Siehe b) und f) |
| E-7a | Verteilung Schritt 1 zu Schritt 2 | Siehe e). Vorschlag 60 zu 40. Blockiert B2 |
| E-7b | Gewicht eines Designproblems in der Szenensumme | Siehe e). Vorschlag: nur das Gewicht von Schritt 1. Blockiert B2 |
| E-8 | Zuordnung Befund zu Bild | Maschinell nicht lösbar. Siehe b) und den Abschnitt Bildauswahl |
| E-9 | Welche Defizite kommen in die Übung? | Vorschlag: neun, siehe d) |
| E-10 | Phase 2017 als unbewertete Vergleichsphase? | Vorschlag: ja, siehe c) |
| E-11 | Panorama als Ersatzquelle? | Vorschlag: keine, die Bildwand genügt. Street View ist keine Option, siehe unten |
| E-12 | Welche Zeitangabe ist massgebend? | Vorschlag: der Auditbericht, 21. Februar 2020. Widerspruch W-1 |

Die Entscheide E-1 bis E-12 sind über einen Fragebogen gefallen, der unter
<https://claude.ai/code/artifact/9838039b-3f26-40dc-9432-87dd428a590f> liegt;
das Protokoll dazu trägt den Zeitstempel 12. September 2026, 16:16.

Die Befunde B-1 bis B-3 und die Frage nach dem Baubeginn liegen als
Entscheidformular nach Verhaltensregel 10 vor:
`.claude/entscheide/2026-09-12_de-niederfrauendorf_formular.html`, fünf Fragen,
davon drei Blocker. Die Antwort gehört als
`.claude/entscheide/2026-09-12_de-niederfrauendorf_antworten.json` daneben.

### Zu E-11, Panorama als Ersatzquelle

Erwogen wurde, ein Panorama aus Google Street View zusammenzusetzen und als
Übergangslösung mit Datumsstempel und Sanierungshinweis zu kennzeichnen. Das
wird nicht gebaut: Ein heruntergeladenes und zusammengesetztes
Street-View-Panorama in einer öffentlich erreichbaren Anwendung bleibt eine
Urheberrechtsverletzung, und der Hinweis kennzeichnet sie, hebt sie aber nicht
auf. Lizenzkonforme Quelle mit demselben Nutzen wäre **Mapillary** unter
CC BY-SA 4.0, mit Programmschnittstelle und teils 360-Grad-Aufnahmen; ob
Niederfrauendorf abgedeckt ist, ist nicht geprüft. Für diese Übung ist beides
vermutlich unnötig, weil B3 die flache Bildwand ohnehin baut.

### Bildauswahl, sechs Bilder

Aus den 90 Bildern des 12. Mai 2022 am Kontaktbogen gewählt. Alle sechs zeigen
den Minikreisverkehr.

| Bild | Datei | Zeigt | Vorgeschlagene Defizite |
|---|---|---|---|
| 1 | `20220512_132939.jpg` | Annäherung, gelber Tabellenwegweiser mit Zeichen 205 und 215 darunter, die Strasse läuft optisch durch | 15, 16 |
| 2 | `IMG_E6892.JPG` | Die Kreisinsel höhengleich, nur markiert, ohne Bord. Gesicherte Zuordnung zu Abbildung 9 | 8, 9, 4 |
| 3 | `IMG_E6911.JPG` | Holztransporter fährt geradlinig über die Kreisinsel | 10, 14 |
| 4 | `IMG_E6904.JPG` | Engstelle im Arm nach Reinhardsgrimma, Schutzplanke und Mauer beidseitig | 17 |
| 5 | `IMG_E6946.JPG` | Bus und Lastwagen begegnen sich im Knoten | 12, 7 |
| 6 | `IMG_E6923.JPG` | Zweites Fahrzeug überfährt die Insel aus anderer Richtung, macht aus dem Einzelfall ein Muster | 10, 14 |

**Korrektur zu d):** Die Defizite 10 und 14 sind oben als nicht auffindbar
eingeordnet, weil sie im Bericht auf Verhaltensbeobachtung beruhen. Die Bilder 3
und 6 zeigen dieses Verhalten unmittelbar. Sie sind damit doch belegbar und
stehen in der Auswahl.

**Nicht abgedeckt:** Defizit 3, die Haltestelle am Wendeplatz, ist auf keinem
der sechs Bilder zu sehen. Defizit 13 ist nur aus der Nachtrassierung
erkennbar. Beide bräuchten ein siebtes Bild.

---

## a) Stand des Repos

### Was schon da ist

Der Prompt nennt drei Bausteine als möglicherweise vorhanden. Alle drei sind
vorhanden, seit v0.16.0.

**Länderfeld.** `country?: LandCode` nach ISO 3166-1 alpha-2 steht an
`AppTopic`, `AppScene`, `Kurs`, `RankingEntry` und `SceneResult`, überall
optional. Die 249 Codes liegen in `src/data/laender.ts`.

**Migration.** Es gibt keine schreibende Migration, sondern eine Leseregel:
`appData.ts` setzt beim Lesen `CH`, wenn das Feld fehlt oder einen Wert trägt,
den ISO 3166-1 nicht zuteilt; festgeschrieben wird beim nächsten regulären
Speichern. Das war richtig entschieden, weil die Daten im localStorage jedes
Geräts und in Supabase liegen und es keinen Ort gibt, an dem der Bestand
zentral zu berichtigen wäre.

**Flusswahl.** `src/data/verfahren.ts` löst Land auf Verfahren auf.
`VERFAHREN_JE_LAND` trägt heute einen Eintrag, `CH` auf `bfu-fk-rsi-2020`.
`hatVerfahren()` wird an genau zwei Stellen abgefragt: `ScoringFlow.tsx:732`
zeigt einen Hinweis und bricht ab, `App.tsx:188` riegelt den VR-Pfad ab,
allerdings ohne Anzeige, weil ein VR-Panel dafür fehlt.

Die Datei sagt über sich selbst, was sie nicht enthält: nicht die Wörter des
Verfahrens, die stehen in `src/i18n/verfahren.bfu.ts`, und nicht seine Regeln,
die stehen in `src/data/scoringEngine.ts`. Diese Trennung ist tragfähig und
wird für Deutschland fortgesetzt.

### Szenentypen

Es gibt keinen. Eine Szene ist immer ein Panorama. Das steckt nicht in einem
Feld, sondern in der Form der Felder: `panoramaBildUrl`, `startblick` mit
`theta` und `phi`, `perspektiven` mit `standortPosition` und `navMarker`, alle
in Kugelkoordinaten. Ein Feld, das einen Szenentyp benennt, fehlt und gehört zu
B3.

### Wo CH-Logik hart verdrahtet ist

| Ort | Art der Bindung | Folge für Deutschland |
|---|---|---|
| `appData.ts`, `AppDeficit.correctAssessment` | Fester Block mit sechs Pflichtfeldern: `wichtigkeit`, `abweichung`, `relevanzSD`, `naca`, `unfallschwere`, `unfallrisiko` | Ein deutscher Befund trägt keines davon. Braucht eine diskriminierte Union. Der schwerste Eingriff des ganzen Vorhabens |
| `SceneViewer.tsx`, 2970 Zeilen | Panorama-Kugel mit Radius 500 und `THREE.BackSide`, Texturkorrektur über `repeat.x = -1`, alle VR-Panels der neun Schritte | Eine flache Bildwand braucht einen eigenen Renderpfad. Keine Änderung an der Kugel |
| `ScoringFlow.tsx`, 1082 Zeilen | Der Neunschrittpfad als Ablauf, Riegel auf Zeile 732 | Braucht einen zweiten Ablauf mit zwei Schritten |
| `scoreCalc.ts` | `STEP_WEIGHTS` aus dem Sacred File, `MAX_PUNKTE_PRO_DEFIZIT`, `KATEGORIE_TEILPUNKTE`, die beiden Hinweisabzüge | Deutschland braucht eigene Punkteregeln in einer eigenen Datei |
| `ergebnisModel.ts`, `berichtModel.ts`, `pdfExport.ts` | Leiten die Matrixherleitung und den Bericht aus den sechs Feldern ab | Brauchen je einen zweiten Zweig |
| `bestandenKriterium.ts` | Pflichtbefunde und 60 Prozent, gerechnet auf der CH-Skala | Die Prozentschwelle bleibt tragfähig, sobald je Befund normiert wird |
| `sphereCoords.ts` | Trefferprüfung in Grad über Winkelabstand | Bildkoordinaten brauchen eine eigene Trefferprüfung |
| `i18n/index.ts` | Namensraum `verfahren` trägt die 104 Bezeichnungen des Schweizer Verfahrens | Deutschland braucht einen zweiten Namensraum |
| `scoringEngine.ts` | Sacred. `WICHTIGKEIT_TABLE`, beide Matrizen, `STEP_WEIGHTS` | Wird nicht angefasst. Die Erweiterung von `verfahren.ts` braucht dort keinen Eingriff, weil sie die Kennung importiert, statt sie zu setzen |

Der i18n-Bestand umfasst 521 Blattschlüssel je Sprache in allen vier Sprachen,
plus die 104 Verfahrensschlüssel.

### Korrekturen am Prompt

- Der Prompt sagt «kein Backend». Es gibt Supabase mit Postgres, Storage und
  drei Edge Functions.
- Der Prompt nennt `assessmentMethod` als Feld «je Land». Das Land ist schon
  gespeichert; ein zweites Feld daneben wäre eine zweite Quelle für dieselbe
  Aussage. Das Verfahren wird aus dem Land abgeleitet. Was es dagegen wirklich
  braucht, ist ein Diskriminator am **Befund**, damit `correctAssessment`
  typsicher bleibt.
- `src/types/index.ts` ist Altbestand aus der ersten Fassung und beschreibt ein
  Datenmodell ohne Mehrsprachigkeit, das es nicht mehr gibt. Importiert werden
  daraus nur die drei Dimensionstypen. Das Datenmodell liegt in
  `src/data/appData.ts`.

---

## b) Der Ordner Niederfrauendorf

### Dateibestand

Der Pfad ist doppelt verschachtelt:
`bilder_test/S190_LK_SOE_Niederfrauendorf/S190_LK_SOE_Niederfrauendorf/`.

| Inhalt | Menge | Grösse |
|---|---|---|
| Auditbericht, PDF, 23 Seiten | 1 | 5,3 MB |
| Beschreibung der Unfallhäufungsstelle, DOCX | 1 | 293 KB |
| Bilder Ordner «2015 vor» | 0 | — |
| Bilder Ordner «2016-2022» | 40 | 197 MB |
| Bilder Ordner «2022-2025» | 90 | 383 MB |
| Videos, MOV | 8 | 1,33 GB |

Der Prompt nennt «Auditbericht, Unfallberichte, Einzelbilder». Es gibt einen
Auditbericht und **eine** Beschreibung, keine Unfallberichte. Die Videos nennt
der Prompt nicht; eines allein ist 557 MB gross.

### Der Auditbericht

«S 183/S 190 Knotenpunkt Niederfrauendorf (Minikreisverkehr als
Verkehrsversuch)», Sicherheitsaudit im Bestand, LASuV Niederlassung Meissen,
Netzknoten 5148012. Erstellt am 15. August 2022, PDF am 16. August erzeugt.
Ortsbesichtigung 12. Mai 2022. Zeitraum der Unfallanalyse 21. Februar 2020 bis
30. Juni 2022.

Anlass: Der Knotenpunkt wurde 2016 von der örtlichen Unfallkommission als
Unfallhäufungsstelle behandelt. Der Verkehrsversuch als Minikreisverkehr wurde
am 21. Februar 2020 freigegeben. Der Abschlussbericht zur Auswertung des
Versuchs empfahl, die Gestaltung beizubehalten, trotz «permanent festgestellten
Fehlverhalten der Verkehrsteilnehmer». Die untere Verkehrsbehörde wollte vor
der endgültigen verkehrsrechtlichen Anordnung ein Bestandsaudit.

Rahmendaten: vier Knotenpunktarme, drei Buslinien über alle Äste, Vzul 30 km/h
auf der S 190 West und 50 km/h auf den übrigen drei Armen. Tagesverkehr 2019
zwischen 639 und 6238 Fahrzeugen je Arm, Schwerverkehrsanteil 3,2 bis 5,3
Prozent. Herangezogen sind 16 Regelwerke, darunter das Merkblatt für die Anlage
von Kreisverkehren 2006 und M Uko 2012.

**Unfallbilanz je Zustand**, aus Bericht und Beschreibung zusammengeführt:

| Zustand | Zeitraum | Unfälle | Schwere |
|---|---|---|---|
| Ohne Regelung | 2014 und 2015 | je 5 | 2 mit schwerem, 2 mit leichtem Personenschaden, ursächlich Einbiegen und Kreuzen |
| Mobile Lichtsignalanlage | Anfang 2016 bis 21.02.2020 | 11, rund 3 je Jahr | ausschliesslich leichter Sachschaden |
| Minikreisverkehr | 21.02.2020 bis 30.06.2022 | 10, 4 je Jahr | 2 mit Leichtverletzten, 1 schwerwiegend mit Sachschaden, 7 sonstiger Sachschaden |

Im Minikreisverkehr verteilen sich die Unfälle auf Einbiegen und Kreuzen (4),
Längsverkehr (3) und sonstige (3). Fünf von zehn haben ihre Ursache in der
Befahrbarkeit im Bereich der Zu- und Ausfahrt nach Reinhardsgrimma. Der Bericht
hält die Ausprägung der Unfallumstände gegen die Durchschnittswerte innerorts
nach M Uko; keine Ausprägung liegt über dem Durchschnitt.

**Die 18 Defizite des Berichts**, in seiner Gliederung:

| Nr. | Befund | Gliederung | Belegart |
|---|---|---|---|
| 1 | Fehlende Gehwege | Strecke, Fussverkehr | Foto, Abb. 3 |
| 2 | Schmale Fahrbahnen, etwa 4,40 m gegen 6,50 m Regelmass | Strecke, MIV | Messung TT-SIB, Unfallgeschehen, Foto Abb. 4 |
| 3 | Haltestelle nicht barrierefrei | Strecke, ÖPNV | Foto, Abb. 5 |
| 4 | Fehlende Anlagen für den Fussverkehr am Knoten | Knoten, Fussverkehr | Foto, Abb. 6 |
| 5 | Fehlende Querungsmöglichkeiten | Knoten, Fussverkehr | Regelabgleich, kein eigenes Bild |
| 6 | Mindestaussendurchmesser nicht eingehalten, 12,1 bis 14,3 m gegen 13 m | Knoten, MIV | Messung, Luftbild Abb. 7 |
| 7 | Kreisfahrbahn ungenügend breit, 3,9 bis 6,0 m gegen 6,0 m | Knoten, MIV | Messung, Luftbild Abb. 8 |
| 8 | Kreisinseldurchmesser 3 m gegen mindestens 4 m | Knoten, MIV | Messung |
| 9 | Fehlende bauliche Trennung der Kreisinsel, kein Bord | Knoten, MIV | Foto, Abb. 9 |
| 10 | Fehlende Ablenkung der Geradeausströme | Knoten, MIV | Beobachtung vor Ort |
| 11 | Fehlende Fahrbahnteiler in allen vier Armen | Knoten, MIV | Regelabgleich |
| 12 | Ungenügende Fahrstreifenbreiten in Zu- und Ausfahrten | Knoten, MIV | Messung, fünf Arme einzeln |
| 13 | Ungenügende Radien der Eckausrundungen | Knoten, MIV | Nachtrassierung, Abb. 10 |
| 14 | Fehlende Begreifbarkeit und Akzeptanz des Kreisverkehrs | Knoten, MIV | Beobachtung, Abb. 11 |
| 15 | Erkennbarkeit nicht gegeben | Knoten, MIV | Foto Annäherungssicht, Abb. 12 |
| 16 | Wegweiser nicht regelkonform für Kreisverkehre | Knoten, MIV | Foto, Abb. 13 |
| 17 | Engstelle in Knotenpunktzufahrt, 4,70 m gegen 4,75 m Bedarf | Knoten, MIV | Messung, Unfallgeschehen, Abb. 14 bis 17 |
| 18 | Sicht auf konkurrierende Ströme stark eingeschränkt | Knoten, MIV | Foto, Abb. 18 und 19 |

Die Kapitel Radverkehr auf der Strecke, Ruhender Verkehr, ÖPNV am Knoten und
«Sonstiges, weitere Hinweise ohne Sicherheitsrelevanz» tragen jeweils «Keine
Anmerkungen».

Die Empfehlungen ordnen die Defizite Massnahmen zu. Kurzfristig eine
provisorische Lichtsignalanlage in allen Armen gegen die Defizite 6 bis 10 und
14 bis 18. Mittel- und langfristig der Rückbau des Minikreisverkehrs und eine
dauerhafte Lichtsignalanlage, ein regelkonformer Ausbau mit Abbruch zweier
Gebäude, oder eine Ortsumgehung für beide Staatsstrassen.

### Zeitzuordnung der Bilder

Aus dem EXIF gelesen, nicht aus den Dateinamen geschlossen. Alle 130 Bilder
tragen ein Aufnahmedatum, keines fehlt.

| Ordner | Bilder | Aufnahmedatum | Kamera |
|---|---|---|---|
| «2015 vor» | 0 | — | — |
| «2016-2022» | 40 | 13. September 2017, alle | Canon EOS 450D |
| «2022-2025» | 90 | 12. Mai 2022, alle | iPhone 13 Pro Max (69), Samsung SM-A528B (21) |

Damit ist die Phasenzuordnung eindeutig, die Ordnerbeschriftung aber irreführend:

- «2016-2022» enthält ausschliesslich Bilder eines Tages im September 2017 und
  fällt damit in die Zeit der mobilen Lichtsignalanlage.
- «2022-2025» enthält ausschliesslich Bilder vom 12. Mai 2022, dem Tag der
  Ortsbesichtigung des Audits, und fällt damit in die Zeit des
  Minikreisverkehrs.
- Der Zustand ohne Regelung bis 2015 ist **nicht bebildert**. Der Ordner dafür
  ist leer.

### Zuordnung Befund zu Bild: nicht maschinell lösbar

Ich habe die 24 Fotos des Berichts extrahiert und über einen
Differenz-Fingerabdruck gegen alle 130 Ordnerbilder gehalten. Ergebnis: ein
sicherer Treffer, drei unsichere, zwanzig ohne Zuordnung.

| Abbildung | Ordnerbild | Abstand |
|---|---|---|
| Abb. 9, Kreisinsel ohne Bordeinfassung | `2022-2025/IMG_E6892.JPG` | 1 von 256 |
| Abb. 12, Annäherungssicht aus Dippoldiswalde | `2022-2025/IMG_E6884.JPG` | 59, unsicher |
| Abb. 13, Annäherungssicht aus Glashütte | `2022-2025/IMG_E6929.JPG` | 41, unsicher |
| Abb. 14, angefahrene Schutzplanke | `2022-2025/IMG_E6894.JPG` | 56, unsicher |

Die Ursache ist belegt und nicht behebbar: Die Bilder im Bericht sind
beschnitten, teils auf Streifen von 2040 mal 380 Bildpunkten. Ein
Fingerabdruck über das ganze Bild kann einen Zuschnitt nicht wiedererkennen.
Die restlichen Abstände liegen bei 90 bis 108 und damit im Bereich des Zufalls.
Ich trage hier nichts ein, was nicht belegt ist. Diese Zuordnung braucht ein
menschliches Auge, das die Bilder nebeneinander sieht, und ist damit E-8.

### Widersprüche

**W-1, Zeitangabe des Minikreisverkehrs.** Die Beschreibung überschreibt ihren
Abschnitt mit «Minikreisverkehr (07/2022 bis 2025)» und den vorangehenden mit
«Lichtsignalanlage (2016 bis 06/2022)». Der Auditbericht nennt zweimal den
21. Februar 2020 als Tag der Verkehrsfreigabe und einmal als Tag der baulichen
Umsetzung. Die Beschreibung sagt im Fliesstext selbst, die mobile
Lichtsignalanlage sei «von Anfang 2016 bis Anfang 2020» betrieben worden, und
widerspricht damit ihrer eigenen Überschrift. Massgebend ist der Auditbericht,
weil er das Datum als Bezugspunkt seiner Unfallanalyse führt und die Bilder vom
Mai 2022 den fertigen Minikreisverkehr zeigen. Entscheid liegt bei Stevo; die
Ordnernamen der Bilder folgen der falschen Überschrift.

**W-2, Zahl der Unfälle im Knotenpunktbereich.** Die Beschreibung sagt «Seit
der Freigabe wurden mit Stand vom 30.06.2022 zehn Unfälle polizeilich erfasst»
und stellt diesen Satz unter die Überschrift «07/2022 bis 2025». Mit W-1
aufgelöst ist der Satz richtig und die Überschrift falsch. Ohne Auflösung von
W-1 kann er nicht stimmen.

**W-3, Querschnittsangaben des Berichts.** Die Tabelle auf Seite 3 führt die
Werte 13 m, 3 m und 5 m neben den Bezeichnungen Durchmesser, Mittelinsel und
Kreisfahrbahn, jedoch um eine Zeile verschoben. Aus den Defiziten 6 bis 8 ist
die Zuordnung rekonstruierbar: Aussendurchmesser 13 m als Sollmass,
Kreisinseldurchmesser 3 m gemessen, Kreisfahrbahn nominell 5 m. Ich habe die
Werte aus den Defiziten übernommen, nicht aus der Tabelle.

**Kein Widerspruch** besteht zwischen Auditbericht und Beschreibung bei den
Unfallzahlen der drei Zustände; die Beschreibung übernimmt den Abschnitt
«Unfallhäufungen» des Berichts nahezu wörtlich.

---

## c) Vorschlag zum Prüfgegenstand

**Vorschlag: der Minikreisverkehr, Bildstand 12. Mai 2022, als bewertete Phase.
Die mobile Lichtsignalanlage, Bildstand 13. September 2017, als unbewertete
Vergleichsphase. Der Zustand ohne Regelung entfällt.**

Begründet aus dem Bericht, nicht aus Bequemlichkeit:

1. **Nur der Minikreisverkehr ist überhaupt geprüft.** Der Bericht ist ein
   Bestandsaudit dieses Zustands. Alle 18 Defizite beziehen sich darauf, und
   die Ortsbesichtigung fand am 12. Mai 2022 statt, also genau am Tag der 90
   Bilder. Für die Phase mit Lichtsignalanlage existiert kein Befundkatalog,
   nur eine Unfallbilanz. Wer sie bewerten wollte, müsste Befunde erfinden.
2. **Der Zustand ohne Regelung hat kein Bild.** Der Ordner ist leer. Ohne Bild
   keine Szene.
3. **Die Vergleichsphase ist belegt nützlich.** Der Bericht verwendet für
   Defizit 18, Sicht auf konkurrierende Ströme, zwei Abbildungen und
   kennzeichnet sie ausdrücklich «vor dem Umbau zum Minikreisverkehr». Der
   Bericht hält die Sichtbehinderung also für unabhängig von der
   Knotenpunktform. Genau das macht die zeitliche Navigation der Bildserie zu
   mehr als einer Bedienspielerei: Man sieht denselben Mangel in zwei
   Zuständen.
4. **Die Unfallbilanz trägt die Übung.** Der Wechsel von zwei schweren
   Personenschäden in zwei Jahren über eine Phase mit ausschliesslich leichtem
   Sachschaden zu vier Unfällen je Jahr mit zwei Leichtverletzten ist ein
   Lehrstoff für sich, und er ist belegt.

Die Videos gehören nicht in die Übung. Sie sind zusammen 1,33 GB gross, und
Defizit 14 und 10 beruhen auf Verhaltensbeobachtung, die in einer
Standbildübung nicht beurteilbar ist.

---

## d) Vorschlag der Beispielbefunde

**Vorab der Kernbefund, der E-5 auslöst.** Der Bericht führt ein eigenes Kapitel
«Sonstiges, weitere Hinweise ohne Sicherheitsrelevanz» und lässt es leer. Alle
18 Befunde sind nach Auffassung der auditierenden Stelle sicherheitsrelevant.
Damit enthält die Quelle **keinen einzigen belegten Fall eines Designproblems**.
Würde man die Szene nur aus dem Bericht füllen, wäre Schritt 1 der Konvention
trivial: Die richtige Antwort wäre immer «Sicherheitsdefizit», und die Übung
verlöre genau den Schritt, der laut Konvention der wichtigere ist.

Es gibt zwei Auswege, und die Wahl ist fachlich, nicht technisch:

- **Ableitung aus der Struktur des Berichts.** Zwei der 18 Befunde nennen eine
  Massunterschreitung, ohne ihr eine eigene Sicherheitsfolge zuzuschreiben; die
  Folge steht jeweils als eigener, weiterer Befund. Diese beiden sind unten als
  Designproblem vorgeschlagen. Das ist eine Schlussfolgerung aus der Gliederung
  des Berichts, kein Beleg aus dem Bericht.
- **Eigene Befunde.** Zusätzliche Beispielbefunde, die im Bericht nicht stehen,
  von den Fachexperten der Konvention formuliert. Das wäre der belastbarere
  Weg, braucht aber Zuarbeit.

### Vorgeschlagene Befunde, Phase Minikreisverkehr

Auswahl nach einem Kriterium: Der Befund muss auf einem Foto der
Ortsbesichtigung sichtbar sein. Befunde, die nur aus einer Messung, einem
Luftbild oder einer Verhaltensbeobachtung folgen, sind in einer Standbildübung
nicht auffindbar und deshalb nicht dabei. Damit fallen 2, 6, 7, 10, 12, 13 und
14 weg.

Alle Werte in den beiden rechten Spalten sind **Vorschlag** und nicht
festgelegt.

| Nr. | Befund | Schritt 1, Vorschlag | Schritt 2, Vorschlag | Begründung des Vorschlags |
|---|---|---|---|---|
| 9 | Kreisinsel ohne Bordeinfassung, höhengleicher Übergang | Sicherheitsdefizit | gross | Der Bericht nennt den Bord «zusammen mit einer wirksamen Kreisinsel das zentrale Element zur Gewährleistung der Verkehrssicherheit» und leitet daraus die Folge ab, dass die Insel regelmässig überfahren wird. Einziger Befund mit gesicherter Bildzuordnung |
| 17 | Engstelle im Arm nach Reinhardsgrimma, 4,70 m bei 4,75 m Bedarf | Sicherheitsdefizit | gross | Der einzige Befund, dem der Bericht das laufende Unfallgeschehen unmittelbar zuordnet: fünf von zehn Unfällen haben ihre Ursache in der Befahrbarkeit dieses Bereichs, darunter alle drei Längsverkehrsunfälle |
| 4 | Fehlende Anlagen für den Fussverkehr am Knoten | Sicherheitsdefizit | gross | Der Bericht stellt fest, Zufussgehende müssten ungeschützt auf der Fahrbahn laufen, weil die Kreisfahrbahn bis an Bebauung und Schutzplanke reicht. Betrifft besonders schutzbedürftige Gruppen |
| 15 | Erkennbarkeit des Minikreisverkehrs nicht gegeben | Sicherheitsdefizit | mittel | Regelbezug klar, Folge im Bericht als Unsicherheit beschrieben, aber ohne eigene Unfallzuordnung |
| 16 | Tabellenwegweiser nach dem Umbau beibehalten | Sicherheitsdefizit | mittel | Der Bericht sieht die Erkennbarkeit als Kreisverkehr in Frage gestellt und einen Widerspruch zum Zeichen 215. Keine Unfallzuordnung |
| 3 | Haltestelle am Wendeplatz nicht barrierefrei | Sicherheitsdefizit | klein | Anforderung aus RASt, EAÖ und Personenbeförderungsgesetz nicht erfüllt. Kein Unfallbezug, Folge ist Zugänglichkeit; im Bericht der Strecke zugeordnet, nicht dem Knoten |
| 8 | Kreisinseldurchmesser 3 m statt mindestens 4 m | **Designproblem** | entfällt | Der Bericht nennt hier allein die Massunterschreitung. Die Sicherheitsfolge, die fehlende Ablenkung, führt er als eigenen Befund Nr. 10. Damit ist 8 in der Struktur des Berichts der Massbefund und 10 der Sicherheitsbefund |
| 13 | Eckausrundungen mit unzureichenden Radien | **Designproblem** | entfällt | Der Bericht schliesst daraus, ein regelkonformer Minikreisverkehr sei an dieser Stelle nicht realisierbar. Das ist eine Aussage über die Machbarkeit, kein benannter Unfallmechanismus. Fällt allerdings auch unter das Ausschlusskriterium oben, weil nur aus der Nachtrassierung erkennbar |

Zu 13: Der Befund ist als Designproblem-Kandidat inhaltlich schlüssig, auf
einem Standbild aber nicht auffindbar. Entweder er entfällt, oder die Szene
zeigt die Nachtrassierung als eigenes Bild der Serie. Entscheid bei Stevo.

Nach der Regel des Prompts, einen in Schritt 1 nicht eindeutigen Befund als
Designproblem vorzuschlagen, wären zusätzlich 5 und 11 zu prüfen: Beide nennen
einen Regelverstoss ohne eigene Folgenbeschreibung. Ich schlage sie **nicht**
vor, weil der Bericht sie im Kapitel Fussverkehr beziehungsweise unter der
Verdeutlichung der Wartepflicht führt und damit eine Sicherheitsabsicht
benennt.

### Vorgeschlagene Vergleichsphase, ohne Bewertung

| Nr. | Befund | Rolle |
|---|---|---|
| 18 | Sicht auf konkurrierende Ströme stark eingeschränkt | Der Bericht belegt ihn mit zwei Bildern von vor dem Umbau. Vorschlag: als Befund nur in der bewerteten Phase zählen, die Bilder von 2017 aber zeigen, damit sichtbar wird, dass die Sichtbehinderung von der Knotenpunktform unabhängig ist |

---

## e) Vorschlag der Punktwerte

Keine Festlegung. Drei Vorschläge mit Begründung, Entscheid ist E-7.

Die Aufgabe hat zwei Teile, die nicht zu verwechseln sind:

**Teil 1, die Verteilung innerhalb eines Befundes.** Schritt 1 muss höher liegen
als Schritt 2. Vorschläge, jeweils Schritt 1 zu Schritt 2:

| Variante | Verteilung | Gedanke |
|---|---|---|
| A | 60 zu 40 | Deutliche Bevorzugung von Schritt 1, Schritt 2 bleibt gewichtig genug, dass eine falsche Einstufung spürbar kostet |
| B | 70 zu 30 | Stärkere Bevorzugung. Schritt 2 wird zur Zugabe, eine falsche Einstufung kostet weniger als ein Drittel |
| C | 50 zu 50 | Erfüllt die Vorgabe nicht, hier nur als Vergleichsmarke |

Vorschlag: **A**. Grund: Schritt 1 hat zwei Antwortmöglichkeiten, Schritt 2 hat
drei. Wer in Schritt 1 rät, trifft mit 50 Prozent, wer in Schritt 2 rät, mit 33
Prozent. Bei 70 zu 30 bringt Raten in Schritt 1 im Erwartungswert mehr als
Wissen in Schritt 2, und das ist die falsche Botschaft.

**Teil 2, das Gewicht eines Befundes in der Szene.** Der Prompt verlangt, ein
Designproblem geringer zu gewichten als das Erkennen eines Sicherheitsdefizits.
Das folgt nicht aus Teil 1: Wird je Befund auf sein eigenes Maximum normiert,
wie in E-3 entschieden, so erreicht ein richtig erkanntes Designproblem sonst
100 Prozent aus einem einzigen Schritt und steht damit besser da als ein
Sicherheitsdefizit, bei dem zwei Schritte stimmen müssen.

Vorschlag: Ein Designproblem trägt in der Szenensumme das Gewicht seines
Schritt 1, ein Sicherheitsdefizit das Gewicht beider Schritte. Mit Variante A
also 60 gegen 100. Damit gilt beides gleichzeitig: innerhalb des Befundes wird
auf das eigene Maximum normiert, und in der Szene zählt der einfachere Befund
weniger.

**Was daraus folgt, zur Vollständigkeit und ohne eigene Festlegung:**

- Die Prozentschwelle für «bestanden» aus `bestandenKriterium.ts` bleibt
  anwendbar, weil sie auf einem Verhältnis rechnet, nicht auf einer absoluten
  Punktzahl.
- Der Hinweisabzug des Schweizer Pfades, 10 Punkte für den Standorthinweis und
  25 für die Hotspots, ist auf die CH-Skala von 100 Punkten je Befund
  geschnitten. Für Deutschland braucht er eigene Werte oder eine Umrechnung in
  Prozentpunkte. Nicht vorgeschlagen, weil offen ist, ob die Bildserie
  überhaupt Hinweise anbietet.
- Die Kategorie, die im Schweizer Pfad 25 Punkte trägt und bei falscher
  Zuordnung 15 gibt, hat in der deutschen Konvention keine Entsprechung. Ob die
  Gliederung des Berichts, also Strecke gegen Knoten und Verkehrsart, eine
  solche Rolle übernehmen soll, ist eine eigene Frage und hier nicht
  vorgeschlagen.

---

## f) Änderungsplan

Reihenfolge fest, ein Commit je Schritt. Vor jedem Commit `tsc`, Build, Suche
nach ß über `src` und `docs`, und ein `git diff` auf die `correctAssessment`-
Felder bestehender Szenen mit Ergebnis im Commit-Kommentar.

### B1, Datenmodell

Abweichend vom Prompt, weil Länderfeld und Leseregel bereits stehen. Was
wirklich zu tun ist:

- `src/data/appData.ts`: `AppDeficit.correctAssessment` wird eine diskriminierte
  Union über ein Feld `verfahren`. Der bestehende Fall behält alle sechs Felder
  unverändert; die Leseregel ergänzt den Diskriminator beim Lesen, so wie sie es
  beim Land tut, damit kein Bestandsdatensatz angefasst werden muss.
- Neuer Fall für Deutschland mit den zwei Schritten der Konvention. Die Werte
  von Schritt 1 sind stabile Datenschlüssel, die nie angezeigt werden; die
  Anzeige läuft ausschliesslich über i18n. Vorschlag für die Schlüssel:
  `sicherheitsdefizit` und `gestaltung`. Der Begriff «Designproblem» kommt im
  Code nicht vor.
- `src/utils/sphereCoords.ts` oder eine neue Nachbardatei: vierter Fall der
  `DefizitVerortung` mit normalisierten Bildkoordinaten, plus Trefferprüfung.
- Neues Feld an `AppScene` für den Szenentyp, Vorgabewert beim Lesen ist das
  Panorama.

Nicht in B1: das vom Prompt genannte Feld `assessmentMethod` je Land. Das
Verfahren wird aus dem Land abgeleitet, siehe E-1.

### B2, Registry und Bewertung

- `src/data/verfahren.ts`: zweiter Eintrag, `VerfahrensId` wird Union. Kein
  Eingriff in `scoringEngine.ts` und keiner in `verfahren.bfu.ts`.
- Neu `src/data/verfahrenUko.ts` mit den Bezeichnungen der Konvention, vier
  Sprachen, und `src/i18n/index.ts` registriert einen zweiten Namensraum.
- Neu `src/data/scoringEngineDE.ts` mit den beiden Teilscores nach den unter e)
  freigegebenen Werten. Zwei getrennte Grössen, nie eine Summe.
- Neu eine Ablaufkomponente für die zwei Schritte, und die Ergebnisanzeige zeigt
  beide Teilscores getrennt.
- `ScoringFlow.tsx:732` und `App.tsx:188`: der Riegel wird zur Weiche.
- `ergebnisModel.ts`, `berichtModel.ts`, `pdfExport.ts`, `bestandenKriterium.ts`
  und `RankingView.tsx` bekommen je einen zweiten Zweig. Die Rangliste trennt
  nach Land, siehe E-3.

### B3, Szenentyp Bildserie

- Neue Renderkomponente für eine flache Bildwand, keine Änderung an der
  Panorama-Kugel in `SceneViewer.tsx`. Für Quest 3 und für den Browser.
- Navigation über die Phasen mit Zeitangabe je Phase.
- Verortungseditor im Admin für den neuen Verortungstyp.

### B4, Beispielszene

Erst nach Freigabe von d) und e), und vor dem ersten Datensatz halte ich für
E-6 und E-8 an. Angelegt wird über die Einfuhrdatei und `daten/einlesen.mjs`,
wie die 13 bestehenden Szenen; an den localStorage kommt von aussen nichts
heran. Der Vorschauserver muss dabei auf Port 4173 oder 5173 laufen, sonst
scheitert die Anmeldung an der Herkunftsprüfung und die Oberfläche meldet
irreführend eine falsche PIN.

### Zu E-6, Ordner ins Repo

**Vorschlag: nein, und zwar unverändert.** `bilder_test/` steht bereits in
`.gitignore`, und keine Datei daraus ist versioniert. Gründe:

- 1,33 GB Videos und 580 MB Bilder gehören in kein Git-Repo.
- Der Auditbericht ist ein fremdes Dokument einer deutschen Behörde. Er nennt
  eine Hausnummer, führt eine Unfallliste mit Datum, Wochentag, Uhrzeit und
  Beteiligten und trägt im Dateikopf den Namenskürzel der bearbeitenden Person.
- Das Werkzeug ist seit v0.12.0 ein privates Projekt, und ein Wächter hält
  Behördenbezüge aus dem Quellbaum.

Die Bilder der Szene gehen wie die 78 Panoramen in den Supabase-Bildspeicher.
Dabei ist der Platz zu prüfen: 78 Panoramen zu je rund 9,6 MB belegen bereits
etwa 750 MB. Die 90 Bilder der Phase Minikreisverkehr sind im Original 383 MB
gross und müssen vor dem Hochladen verkleinert werden. Für eine flache Bildwand
genügt ein Bruchteil der Kameraauflösung von 4032 mal 2268 Bildpunkten.

---

## Stand

| Phase | Stand |
|---|---|
| A | Abgeschlossen und freigegeben. Commit `a4d2f6f` |
| B1 | **Abgeschlossen.** Commit `b5cbbfb`, gepusht |
| B2 | **Abgeschlossen.** Commits `cfbfc93` und `ce87c3b`, gepusht |
| B3 | **Abgeschlossen.** Commit `c3d22ff`, gepusht |
| B4 | **Gebaut.** Commit `d5c6a9d`. Noch nicht in der Datenbank: Bildupload und Einlesen brauchen die Admin-PIN |

### B2, abgeschlossen am 12. September 2026

| Teil | Ergebnis |
|---|---|
| Registry | `verfahren.ts` erweitert, kein zweiter Ort. `VerfahrensId` ist eine Union, `DE` trägt `de-uko-2`. Neu `namensraumFuer()`, `istNeunschritt()`, `istUkoLand()` |
| Punkte | Neu `src/data/punkteUko.ts`. Schritt 1 trägt 60, Schritt 2 trägt 40, eine falsche Art kostet 60, ein Gestaltungsbefund zählt 60 gegen 100. Schritt 2 zählt nur, wenn Schritt 1 stimmt |
| Ablauf | Neu `src/components/ScoringFlowUko.tsx`. Zwei Schritte, die beiden Teilscores stehen im Ergebnis nebeneinander und werden nie addiert |
| Sprache | Neu `src/i18n/verfahren.uko.ts`, eigener Namensraum `verfahrenUko`, 34 Schlüssel in vier Sprachen. Der Begriff für einen Befund ohne Sicherheitsrelevanz steht nur dort |
| Weichen | `App.tsx` rendert den Ablauf je Bewertung und speichert die Teilpunkte getrennt. Das Szenenmaximum kommt aus `szenenMaxPunkte()` und hängt am Datensatz statt an der Anzahl |
| Nicht geändert | `bestandenKriterium.ts`. Es rechnet auf Prozent, und die Schwelle ist je Szene überschreibbar — genau der Weg, den B-5 braucht |

**Abweichung vom Auftrag.** Die Punktedatei heisst `punkteUko.ts`, nicht
`scoringEngineDE.ts`. Der Norm-Compliance-Hook blockiert das Pfadmuster
`src/data/scoringEngine` per Präfixtreffer, und der Name wäre fachlich falsch:
hier stehen Punkte einer Vereinbarung, nicht Matrizen einer Norm. Begründet im
Kopfkommentar der Datei.

**Prüfstand:** tsc 0, Build grün, 252 Tests in 24 Dateien. Elf eingebaute
Fehler wurden gemeldet, sieben in der Punktelogik und der Weiche, vier im
Rendertest.

**Ein eigener Test war wertlos und ist ersetzt.** Die Prüfung «belohnt den
Folgefehler nicht» war grün und prüfte nichts: sie setzte eine Musterlösung mit
der Art «gestaltung» ein, und dort bleibt Schritt 2 auch ohne die Sperre bei
null. Der Fall, auf den es ankommt, ist umgekehrt. Gefunden hat das der
Nachweis mit eingebautem Fehler, nicht das Auge.

**Vier bestehende Wächter haben die Erweiterung gemeldet** und sind nachgezogen:
die Zahl der Bedienschlüssel, die Behauptung «genau ein Land», «Deutschland hat
keines», und der Test für ein Land ohne Verfahren, der jetzt Österreich nimmt.

### B1, abgeschlossen am 12. September 2026

Commit `b5cbbfb`. Datenmodell für zwei Verfahren, keine Weiche und kein Ablauf.

| Teil | Ergebnis |
|---|---|
| Bewertung als Union | Neu `src/data/bewertung.ts`. `BewertungBfu` mit den sechs Feldern, `BewertungUko` mit Schritt 1 und 2. Verengt wird über `istUko` und `istBfu`, nie über einen Feldvergleich |
| Leseregel | `mitVerfahren()` setzt den Diskriminator beim Lesen, wie `mitLand()` beim Land. Bestandsdaten bleiben unangetastet |
| Begriff «Designproblem» | Kommt im Code nicht vor. Datenschlüssel ist `gestaltung`, die Anzeige läuft über i18n |
| Szenentyp | `AppScene.szenentyp` mit `panorama` als Vorgabe ohne Feld, dazu `BildPhase` mit Zeitangabe und dem Merkmal `bewertet` |
| Verortung im Bild | Vierter Fall `{ typ: 'bild', x, y, r }` in `sphereCoords.ts`, dazu `trefferImBild()`. Das Seitenverhältnis ist Pflichtparameter, sonst wird der Trefferradius auf einem breiten Bild zum Oval |
| Neun Konsumenten | Je eine Weiche. Wo der Neunschrittpfad nicht gilt, wird nichts gerechnet: der Riegel in `ScoringFlow` deckt neu beide Gründe, `App.tsx` steigt mit Log aus, die Lernkarte zeigt keine Zeilen, `soll` im Bericht ist nullable |
| Nebenbefund behoben | `risikoFarbe` färbte jeden unbekannten Wert grün und täuschte damit eine Aussage vor. Neu nimmt sie `null` und färbt neutral |

**Prüfstand:** tsc 0, Build grün, 215 Tests in 22 Dateien, davon 15 neu in
`bewertung.test.ts`. Alle fünf absichtlich eingebauten Fehler wurden gemeldet:
ein geänderter Wert in der Leseregel, das ignorierte Seitenverhältnis, ein
immer falscher Typwächter, eine Kugelverortung im Bildraum und ein erfundenes
Unfallrisiko.

**Bewertungsfelder bestehender Szenen:** sechs Blöcke aus `HEAD` gegen die
Arbeitskopie geparst und verglichen, null Unterschiede. Der Diff auf
`appData.ts` betrifft die Typdeklaration, nicht die Daten.

### B3, abgeschlossen am 12. September 2026

Commit `c3d22ff`. Neu `src/components/BildwandViewer.tsx`.

| Teil | Ergebnis |
|---|---|
| Rendering | Das Bild hängt als Fläche im Raum, im Seitenverhältnis der Datei. Keine Kugel, keine Panorama-Annahme. Dieselbe Szene trägt im Browser und in der Brille |
| Phasen | Leiste mit Bezeichnung und Zeitangabe je Phase, mehrsprachig. Eine unbewertete Vergleichsphase ist gekennzeichnet, und dort ist nichts zu finden |
| Bildwahl | Innerhalb der Phase, dazu Zoom und Einpassen |
| Fund | Klick auf die Fläche wird über die Texturkoordinaten in Bildkoordinaten umgerechnet und gegen `trefferImBild` geprüft. Das Seitenverhältnis kommt aus dem geladenen Bild, nicht aus einer Konstante |
| Zuordnung | Verortungen hängen an der Bild-URL, dasselbe Muster wie bei den Perspektiven eines Panoramas |
| Fund-Vertrag | Die drei Felder des Neunschrittpfades sind in `DeficitConfirmedPayload` optional. Der Panorama-Viewer bewertet selbst, die Bildwand nicht |

**Ausgewiesen, nicht übersehen:** In der Brille fehlt der Bewertungsablauf für
die Konvention. Die Bildwand ist dort sichtbar, bewertet wird im Browser. Der
VR-Pfad bricht mit Protokolleintrag ab, statt mit fehlenden Werten zu rechnen.

**Prüfstand:** tsc 0, Build grün, 263 Tests in 25 Dateien.

**Der Fehler, auf den es ankommt:** Texturkoordinaten laufen von unten, Bilder
von oben. Ein vergessenes «1 minus» spiegelt jedes Defizit an der Bildmitte,
der Treffer liegt meistens noch im Bild, und die Anwendung ist unauffällig
falsch. Der Wächter prüft deshalb ausdrücklich aussermittig; in der Bildmitte
stimmt beides.


### B4, gebaut am 12. September 2026

Commit `d5c6a9d`. Die Szene liegt als Einfuhrdatei vor, nicht in der Datenbank.

| Teil | Ergebnis |
|---|---|
| Erzeugung | `daten/niederfrauendorf_2026_09_12.py`. Jeder Bewertungswert trägt im Skript den Entscheid, aus dem er stammt |
| Umfang | Ein Thema (Land DE), Szene `SZ_2026_115` als Bildserie mit zwei Phasen, neun Defizite, Szenenmaximum 820, fünf Pflichtbefunde |
| Sprachen | Alle Texte in vier Sprachen, Deutsch in Schweizer Orthografie nach E-2 |
| Verortungen | Am Gitternetz in Zehnteln vom Bild abgelesen, ausdrücklich Vorschlag. Das Skript prüft maschinell, dass zwei Befunde im selben Bild nicht übereinanderliegen |
| `normRefs` | Bleibt leer. Das Feld wird gegen den Schweizer Normenbestand geprüft; die Fundstellen des Auditberichts stehen mit Seitenzahl in der Erklärung |
| Einfuhrprüfung | Erweitert: Bildserie ohne Phase, ohne bewertete Phase, unbekannter Szenentyp und Verortung ausserhalb von 0 bis 1 werden abgewiesen. Alle vier gingen bisher durch |
| Wächter | `src/test/szene-niederfrauendorf.test.ts`, 27 Prüfungen. Alle neun eingebauten Fehler gemeldet |
| Anleitung | `daten/NIEDERFRAUENDORF.md` |

**Was noch aussteht, und warum ich es nicht kann:** Die acht Bilder müssen
unter `panoramas/SZ_2026_115/` in den Bildspeicher, und die Einfuhrdatei muss
eingelesen werden. Beides braucht die Admin-PIN.

**Zu bedenken vor dem Einlesen:** Die Beschreibungen und Erklärungen der neun
Befunde sind aus dem Auditbericht des Landesamts paraphrasiert, mit Seitenangabe.
Mit dem Einlesen erscheinen sie in der öffentlich erreichbaren Anwendung. Ob
das so gewollt ist, ist eine Frage an den Verfasser des Berichts, nicht an das
Werkzeug.

### Offen

Alle vier Bauschritte sind erledigt, B-4 und B-5 behoben. Was bleibt, ist
Feldarbeit und sind zwei Rechtsfragen.

### Erledigt

| Punkt | Lage |
|---|---|
| B1 bis B4 | Commits `b5cbbfb`, `cfbfc93`, `ce87c3b`, `c3d22ff`, `d5c6a9d` |
| B-4 | Behoben durch F-006. Blosses Raten fällt von 62,6 auf 48,0 % |
| **B-5** | Behoben durch die dritte Bedingung im Bestanden-Kriterium, Commit `d7ab99c`. Die Strategie «immer Sicherheitsdefizit, immer gross» erreicht weiterhin 61,0 %, besteht aber nicht mehr, weil sie beide Gestaltungsbefunde verkennt |
| Schritt 2 je Befund | Sieben Einstufungen aus F-009 bis F-015 |
| Kennungskollision | `SZ_2026_101` war belegt, neu `SZ_2026_115`. Das Erzeugungsskript prüft die belegten Kennungen seither vorher |

### Nächster Schritt: die Szene in die Datenbank

Das ist der einzige Schritt, der die Arbeit sichtbar macht, und er braucht die
Admin-PIN. Acht Bilder in den Speicher, dann die Einfuhrdatei einlesen.
Anleitung in `daten/NIEDERFRAUENDORF.md`.

Danach am Bildschirm zu prüfen: ob die neun Verortungen sitzen. Sie sind am
Gitternetz abgelesen und ausdrücklich Vorschlag; drei liegen auf Bild 2 eng
beieinander.

### Danach, in dieser Reihenfolge

| Punkt | Warum in dieser Reihenfolge |
|---|---|
| **Rechtefrage an den Verfasser** | Die Befundtexte sind aus dem Auditbericht paraphrasiert und erscheinen mit dem Einlesen in der öffentlichen Anwendung. Dieselbe Frage betrifft das Luftbild aus Abbildung 10 zu Defizit 13, dessen Nutzung ungeklärt ist. Beides eine Anfrage, nicht zwei |
| **Verortungseditor für Bildserien** | Ohne ihn wird jede Korrektur einer Verortung über die Einfuhrdatei gemacht. Das ist der erste Punkt, der bei der Arbeit an der Szene weh tut |
| **Bewertungsablauf in der Brille** | Die Bildwand ist dort sichtbar, bewertet wird im Browser. Für eine Übung im Sitzen genügt das; für den Kurs auf dem Gerät nicht |
| Kategoriepunkte bei der Konvention | In B2 bewusst weggelassen, weil kein Gegenstück zu den 25 Punkten des Schweizer Ablaufs vereinbart ist. Braucht einen Entscheid, wenn es eines geben soll |
| Eine dritte Einstufung in der Szene | Keine Dringlichkeit mehr, seit B-5 behoben ist. Fachlich bliebe die Frage, ob eine Szene ohne einen einzigen Befund der Stufe «klein» die Einstufung gut übt |
