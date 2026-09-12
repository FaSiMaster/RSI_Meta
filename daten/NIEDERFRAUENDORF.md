# Beispielszene Niederfrauendorf einlesen

Stand 12. September 2026. Die Szene ist gebaut, aber noch nicht in der
Datenbank: zwei Schritte brauchen die Admin-PIN und lassen sich deshalb nicht
aus dem Repositorium heraus erledigen.

## Was vorliegt

| Datei | Inhalt |
|---|---|
| `daten/niederfrauendorf_2026_09_12.py` | Erzeugt die Einfuhrdatei aus den freigegebenen Werten und prüft die Verortungsabstände |
| `daten/rsi-import_niederfrauendorf_2026-09-12.json` | Die Einfuhrdatei: ein Thema, eine Szene, neun Defizite |
| `src/test/szene-niederfrauendorf.test.ts` | 30 Prüfungen, die jeden Wert gegen den Entscheid halten, aus dem er stammt |

Die acht verkleinerten Bilder liegen **nicht** im Repositorium. Sie stehen im
Arbeitsordner dieser Sitzung; wo genau, sagt der Abschnitt «Bilder» unten.
Grund ist der Entscheid E-6: der Ordner Niederfrauendorf kommt nicht ins
Repositorium.

## Die Szene

Die Kennung `SZ_2026_115` ist nicht beliebig gewählt. Die erste Fassung dieses
Skripts nahm `SZ_2026_101`, und die gehört einer Szene aus dem Projekt
`infra3d`. Aufgefallen ist es erst beim Messen des Bildspeichers, wo ihr Ordner
mit sechs Dateien dastand; eine Einfuhr hätte die bestehende Szene
überschrieben. Das Skript fragt die belegten Kennungen seither vor dem
Schreiben ab und bricht bei einer Kollision ab.

**Thema** «Knotenpunkte Deutschland», Land DE. **Szene** `SZ_2026_115`,
Szenentyp Bildserie, zwei Phasen:

| Phase | Zeitangabe | Bilder | Bewertet |
|---|---|---|---|
| Minikreisverkehr | 12. Mai 2022 | 6 | ja |
| Mobile Lichtsignalanlage | 13. September 2017 | 2 | nein, nur Vergleich |

**Neun Defizite**, sieben Sicherheitsdefizite und zwei Gestaltungsbefunde.
Szenenmaximum 820 Punkte. Fünf Pflichtbefunde, nämlich die mit der Einstufung
gross.

| Defizit | Kennung | Schritt 1 | Schritt 2 | Entscheid | Bild |
|---|---|---|---|---|---|
| 4 Fussverkehr am Knoten | `SD_0102` | Sicherheitsdefizit | gross | F-013 | 2 |
| 8 Kreisinseldurchmesser | `SD_0104` | Gestaltung | entfällt | E-5 | 2 |
| 9 Kreisinsel ohne Bord | `SD_0103` | Sicherheitsdefizit | gross | F-011 | 2 |
| 10 Fehlende Ablenkung | `SD_0106` | Sicherheitsdefizit | gross | F-012 | 3 |
| 12 Fahrstreifenbreiten | `SD_0108` | Sicherheitsdefizit | gross | F-010 | 5 |
| 13 Eckausrundungen | `SD_0105` | Gestaltung | entfällt | F-002 | 2 |
| 14 Begreifbarkeit | `SD_0109` | Sicherheitsdefizit | mittel | F-014 | 6 |
| 15 Erkennbarkeit | `SD_0101` | Sicherheitsdefizit | mittel | F-015 | 1 |
| 17 Engstelle | `SD_0107` | Sicherheitsdefizit | gross | F-009 | 4 |

## Schritt 1: Bilder in den Speicher

Die acht Bilder gehören in den Bildspeicher unter dem Pfad, den die
Einfuhrdatei erwartet:

```
rsi-textures/panoramas/SZ_2026_115/nfd_2022_01.jpg   bis   nfd_2022_06.jpg
rsi-textures/panoramas/SZ_2026_115/nfd_2017_01.jpg   und   nfd_2017_02.jpg
```

Der Ordnername `panoramas` ist für eine Bildserie irreführend. Er ist die
bestehende Pfadkonvention aus `src/components/admin/BildUpload.tsx`; ein
zweiter Pfad wäre eine Änderung am Upload und gehört nicht in diesen Schritt.

Die Dateinamen müssen genau stimmen, sonst findet der Viewer die Verortungen
nicht: der Schlüssel jeder Verortung ist die vollständige Bildadresse.

Masse der verkleinerten Bilder: 2048 Bildpunkte Breite, zusammen 5,1 MB.

**Platz im Bildspeicher**, gemessen am 12. September 2026: Der Eimer
`rsi-textures` führt 97 Dateien mit zusammen 313,4 MB, verteilt auf 16
Szenenordner. Mittel 3,2 MB je Datei, Median 2,8 MB, grösste Datei 10,8 MB. Im
Tarif Free mit 1 GB sind das 30,6 % und 687 MB frei; die 5,1 MB dieser Szene
fallen nicht auf. Die Datenbank ist unkritisch: 143 Zeilen über fünf Tabellen,
0,34 MB Nutzlast.

## Schritt 2: Einfuhrdatei einlesen

```bash
npm run build
npm run preview -- --port 4173      # zweites Fenster
RSI_ADMIN_PIN=… RSI_DATEI=daten/rsi-import_niederfrauendorf_2026-09-12.json node daten/einlesen.mjs
```

Der Port 4173 ist nicht beliebig. Die Edge Functions erlauben als Herkunft nur
die Adresse auf Vercel sowie die beiden lokalen Ports 5173 und 4173. Auf einem
anderen Port scheitert schon die Anmeldung, und zwar an der Herkunftsprüfung,
nicht an der PIN. Die Oberfläche meldet dann irreführend eine falsche PIN.

## Stand: eingelesen am 12. September 2026

Beide Schritte sind erledigt. Acht Bilder liegen unter
`panoramas/SZ_2026_115/`, alle acht Adressen antworten mit 200. Die Einfuhr
meldete elf Datensätze; in der Datenbank nachgezählt sind es ein Thema, eine
Szene und neun Defizite, alle mit Verortung, und die Bewertungen weichen an
keiner Stelle von der Einfuhrdatei ab.

Am Bildschirm geprüft: Thema und Szene erscheinen, die Szenenkarte zählt neun
Defizite, die Bildwand lädt das erste Bild formatfüllend, und die Phasenleiste
nennt beide Zeitangaben samt der Marke «Nur Vergleich» an der Phase von 2017.

**Ein Fehler kam dabei heraus und ist behoben.** Der Canvas der Bildwand war
150 Bildpunkte hoch, unabhängig von der Fenstergrösse: `flex: 1` in einem
Kasten ohne eigene Höhe lässt React Three Fiber auf diesen Rückfallwert gehen,
und zwar stumm. Das Bild sass als Streifen am oberen Rand. Gefunden wurde es
am Bildschirmfoto, bestätigt durch Abfragen der Canvas-Grösse selbst. Der
Canvas liegt jetzt absolut, wie im Panorama-Viewer.

**Nicht geprüft:** ob ein Klick auf eine verortete Stelle den Ablauf startet.
Die Klickprobe im gesteuerten Browser scheiterte daran, dass der Landfilter
dort nicht zu bedienen war; von Hand ist sie in einer Minute erledigt. Ein
Wächter über die Canvas-Höhe fehlt deshalb auch — der Fehler war stumm, und
genau dafür wäre er da.

**Zum Landfilter:** Eine neue deutsche Szene ist unsichtbar, solange der Filter
auf der Schweiz steht. Das ist die Länderweiche und so gewollt, führt beim
ersten Blick aber in die Irre.

## Danach prüfen

1. **Die Szene erscheint** unter dem Thema «Knotenpunkte Deutschland», und der
   Landfilter am Einstieg zeigt Deutschland.
2. **Die Bildwand lädt** alle sechs Bilder der bewerteten Phase, und die
   Phasenleiste nennt beide Zeitangaben.
3. **Die Verortungen sitzen richtig.** Das ist der Punkt, den ich nicht prüfen
   konnte: Sie sind an einem Gitternetz in Zehnteln vom Bild abgelesen und als
   Vorschlag zu verstehen. Wo genau ein Befund im Bild sitzt, ist eine
   Bildbeurteilung. Neun Verortungen, drei davon eng beieinander auf Bild 2.
4. **In der Vergleichsphase ist nichts zu finden.** Dort liegt keine Verortung,
   und ein Wächter prüft das.
5. **Der Ablauf zeigt zwei Schritte**, und bei einem Gestaltungsbefund entfällt
   der zweite.

## Strassenmerkmale

Achtzehn Merkmale, alle aus den Projektangaben des Auditberichts, Seiten 3
und 4, dazu Befund 1 und Befund 5. Sie stehen am Trainingseinstieg über der
Bestanden-Bedingung.

Elf tragen eine Kennung aus `src/data/strassenmerkmale.ts`, sieben stehen als
freier Text. Die Unterscheidung ist keine Geschmacksfrage: **Ein Katalogmerkmal
wird im Administrationsbereich als Auswahlfeld dargestellt.** Steht sein Wert
nicht wörtlich in der Optionsliste, zeigt das Feld nichts an, und beim nächsten
Speichern ist der Wert weg — ohne Meldung. `pruefe_merkmale()` im
Erzeugungsskript bricht deshalb ab, bevor eine solche Datei entsteht.

Für die Strassenkategorie nach deutscher Systematik, den Netzknoten, die Masse
des Kreisverkehrs, die Höchstgeschwindigkeit je Arm, die Quelle der
Verkehrszahlen und die Verkehrsprognose hat der Schweizer Katalog kein
Gegenstück. Sie stehen deshalb ohne Kennung da, mit Beschriftung und Wert als
Text, und bleiben im Administrationsbereich als Textfelder bearbeitbar.

**Fünf Merkmale sind bewusst leer geblieben:** Beleuchtung, Längsgefälle,
Landwirtschaftsverkehr, Verkehrsqualität und der massgebende Begegnungsfall.
Der Auditbericht sagt dazu nichts, und ein «nein» wäre eine Behauptung. Wer sie
nachtragen will, braucht eine Quelle, nicht eine Annahme.

**Am Bildschirm gemessen:** Die Tabelle am Einstieg ist auf 302 Bildpunkte
gedeckelt und scrollt; bei achtzehn Merkmalen sind fünf davon ohne Scrollen zu
sehen, und der Rollbalken ist zwei Bildpunkte breit. Das gilt für jede Szene,
auch die Schweizer mit rund zwanzig Merkmalen, und ist nicht mit dieser Szene
entstanden.

## Was offen bleibt

**Befund B-5 ist behoben.** Wer in Schritt 1 immer «Sicherheitsdefizit» und in
Schritt 2 immer «gross» antwortet, erreicht weiterhin 61,0 % — behoben wurde
nicht die Rechnung, sondern das Bestehen. Das Bestanden-Kriterium hat seit
v0.20.0 eine dritte Bedingung: jeder Gestaltungsbefund muss in Schritt 1 als
solcher erkannt sein. Diese Strategie verkennt beide und besteht damit nicht.
Wer Schritt 1 beherrscht, erfüllt die Bedingung von selbst und liegt bei
90,2 %. Abschaltbar je Szene über `bestandenKriterium.gestaltungErkannt`.

**Das Luftbild zu Defizit 13.** Der Auditbericht belegt die Eckausrundungen mit
einer Nachtrassierung auf einem Luftbild, seiner Abbildung 10. Dieses Bild ist
nicht verwendet, weil seine Nutzung ungeklärt ist: die Geobasisdaten Sachsen
sind nicht ohne weiteres frei, und die Abbildung ist eine Bearbeitung des
Landesamts. Verortet ist der Befund stattdessen an der Ausfahrt, deren
Geometrie im Foto sichtbar ist. Das ist ein Behelf, keine Lösung.

**Der Bewertungsablauf in der Brille.** Die Bildwand ist dort sichtbar,
bewertet wird im Browser. Für die Konvention fehlt ein VR-Panel; der VR-Pfad
bricht mit einem Protokolleintrag ab, statt zu rechnen.

**Der Verortungseditor kennt Bildserien nicht.** Wer eine Verortung
verschieben will, ändert heute die Einfuhrdatei und liest neu ein. Der
bestehende Editor arbeitet in Kugelkoordinaten.

**Die Einfuhr ist wiederholbar.** Der Kennungswächter des Erzeugungsskripts
unterscheidet seit dem 12. September, wem ein bestehender Datensatz gehört:
Trägt die Szene das Thema `de-knoten-2026` und das Defizit die Szene
`SZ_2026_115`, ist es unserer, und die Einfuhr berichtigt ihn. Nur eine fremde
Kennung bricht ab. Vorher meldete das Skript nach der ersten Einfuhr jede
eigene Kennung als belegt und lief nicht mehr durch.

## Bilder

Die verkleinerten Bilder dieser Sitzung liegen unter

```
C:\Users\FaSi\AppData\Local\Temp\claude\C--ClaudeAI-RSI-Meta\
  6cc8ab5d-4b6a-4876-abd0-f236726fbfc1\scratchpad\szene_bilder\
```

Sie entstehen jederzeit neu aus dem Ordner Niederfrauendorf; die Zuordnung
steht im Plandokument unter «Bildauswahl, sechs Bilder», die beiden Bilder der
Vergleichsphase sind `IMG_5252.JPG` und `IMG_5253.JPG` vom 13. September 2017.
