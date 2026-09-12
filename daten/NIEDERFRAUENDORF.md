# Beispielszene Niederfrauendorf einlesen

Stand 12. September 2026. Die Szene ist gebaut, aber noch nicht in der
Datenbank: zwei Schritte brauchen die Admin-PIN und lassen sich deshalb nicht
aus dem Repositorium heraus erledigen.

## Was vorliegt

| Datei | Inhalt |
|---|---|
| `daten/niederfrauendorf_2026_09_12.py` | Erzeugt die Einfuhrdatei aus den freigegebenen Werten und prüft die Verortungsabstände |
| `daten/rsi-import_niederfrauendorf_2026-09-12.json` | Die Einfuhrdatei: ein Thema, eine Szene, neun Defizite |
| `src/test/szene-niederfrauendorf.test.ts` | 27 Prüfungen, die jeden Wert gegen den Entscheid halten, aus dem er stammt |

Die acht verkleinerten Bilder liegen **nicht** im Repositorium. Sie stehen im
Arbeitsordner dieser Sitzung; wo genau, sagt der Abschnitt «Bilder» unten.
Grund ist der Entscheid E-6: der Ordner Niederfrauendorf kommt nicht ins
Repositorium.

## Die Szene

**Thema** «Knotenpunkte Deutschland», Land DE. **Szene** `SZ_2026_101`,
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
rsi-textures/panoramas/SZ_2026_101/nfd_2022_01.jpg   bis   nfd_2022_06.jpg
rsi-textures/panoramas/SZ_2026_101/nfd_2017_01.jpg   und   nfd_2017_02.jpg
```

Der Ordnername `panoramas` ist für eine Bildserie irreführend. Er ist die
bestehende Pfadkonvention aus `src/components/admin/BildUpload.tsx`; ein
zweiter Pfad wäre eine Änderung am Upload und gehört nicht in diesen Schritt.

Die Dateinamen müssen genau stimmen, sonst findet der Viewer die Verortungen
nicht: der Schlüssel jeder Verortung ist die vollständige Bildadresse.

Masse der verkleinerten Bilder: 2048 Bildpunkte Breite, zusammen 5,1 MB. Zum
Vergleich belegt ein einzelnes Panorama 9,6 MB.

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

## Was offen bleibt

**Befund B-5.** Wer in Schritt 1 immer «Sicherheitsdefizit» und in Schritt 2
immer «gross» antwortet, erreicht 61,0 % und besteht um acht Punkte. Ursache
ist die Verteilung: fünfmal gross, zweimal mittel, keinmal klein. Zwei Wege,
beide ohne Codeänderung: ein Befund mit der Einstufung klein aufnehmen, oder
die Schwelle für diese Szene über `scene.bestandenKriterium` heben. Der Wächter
hält den Befund fest, damit er nicht in Vergessenheit gerät.

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

## Bilder

Die verkleinerten Bilder dieser Sitzung liegen unter

```
C:\Users\FaSi\AppData\Local\Temp\claude\C--ClaudeAI-RSI-Meta\
  6cc8ab5d-4b6a-4876-abd0-f236726fbfc1\scratchpad\szene_bilder\
```

Sie entstehen jederzeit neu aus dem Ordner Niederfrauendorf; die Zuordnung
steht im Plandokument unter «Bildauswahl, sechs Bilder», die beiden Bilder der
Vergleichsphase sind `IMG_5252.JPG` und `IMG_5253.JPG` vom 13. September 2017.
