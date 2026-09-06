# Prüfung der Normreferenzen

Stand: 6. September 2026 · Grundlage: Tracking-Datenbank des Projekts
`vss_Normen` (`backend/data/normen_tracking.sqlite`) und die Produktivdaten in
Supabase, gelesen über den anon-Zugang.

Diese Liste ist eine **Gegenüberstellung, kein Urteil**. Ob eine Normnummer den
gemeinten Gegenstand trifft, entscheidet die Fachstelle, nicht ein Abgleich von
Zeichenketten. Zwei eigene Fehlversuche stehen am Schluss.

---

## 1. Was in den Produktivdaten steht

31 Defizite tragen zusammen 41 Normreferenzen, sieben verschiedene.

| Referenz | Anzahl | Bestand | Befund |
|---|---|---|---|
| `SN 641 723` | 29 | SN 641723:2016, **veraltet** | Geltende Nummer ist VSS 41 723 |
| `VSS 40 241 — Fussgaengerstreifen` | 7 | VSS 40241:2019, **veraltet** | Nummer trifft zu; Schreibweise «Fussgaengerstreifen» statt «Fussgängerstreifen»; Nachfolgeausgabe zu klären |
| `VSS SN 640 075` | 1 | SN 640075:2014, aktiv | Doppeltes Präfix «VSS SN» |
| `VSS 40 138 — Geometrisches Normalprofil` | 1 | VSS 40138:2019, aktiv | Bestand führt keinen Titel |
| `SN 640 273` | 1 | SN 640273, «Knoten Carrefours» | — |
| `bfu Bericht 73 — NACA-Skala` | 1 | nicht im Normenbestand | Kein Normeintrag, aber belegte Quelle |
| `Egal` | 1 | — | Testeintrag in Produktivdaten |

**Nebenbefund ohne Normbezug:** Zwölf der 31 Defizite heissen «Platzhalter»,
eines «Test 3». Sie liegen in der produktiven Datenbank und erscheinen damit im
Training und im Bericht.

---

## 2. Regelwerkkatalog gegen den Normenbestand

`src/data/regelwerkKatalog.ts` speist das Norm-Suchfeld im Defizit-Editor.

### 2.1 Am Bestand belegt

| Nummer | Titel im Bestand |
|---|---|
| VSS 41 721:2023 | Strassenverkehrssicherheit; Folgeabschätzung |
| VSS 41 725:2001 | Strassenverkehrssicherheit; Netzeinstufung |
| SN 641 700:2022 | Strassenverkehrssicherheit; Grundnorm |
| SN 640 075:2014 | Fussgängerverkehr – Hindernisfreier Verkehrsraum |
| VSS 40 273 | Sichtverhältnisse in Knoten in einer Ebene (ohne Kreisel) |

### 2.2 Katalogtitel und Bestandstitel gehen auseinander — fachlich zu klären

Ein abweichender Titel bedeutet nicht, dass die Nummer falsch ist. Er kann ein
Kurztitel sein: `VSS 40 241 «Fussgaengerstreifen»` trifft zu, obwohl der
Bestand «Querungen für den Fussgänger- und leichten Zweiradverkehr» führt.

| Katalog | Bestand |
|---|---|
| VSS 40 050 «Strassenraum — Grundabmessungen» | Grundstückzufahrten; Anordnung und Gestaltung (2019) |
| VSS 40 201 «Fussverkehr — Grundnorm» | Geometrisches Normalprofil; Grundabmessungen und Lichtraumprofil (2019, aktiv) |
| VSS 40 202 «Fussverkehr — Gehwegbreite und Querungen» | Geometrisches Normalprofil; Erarbeitung (2021) |
| VSS 40 212 «Veloverkehr — Radwege und Radstreifen» | Entwurf des Strassenraums – Gestaltungselemente (2019) |
| VSS 40 213 «Veloverkehr — Führung an Knoten» | Entwurf des Strassenraumes; Verkehrsberuhigungselemente (2019) |
| VSS 40 241 «Fussgaengerstreifen» | Querungen für den Fussgänger- und leichten Zweiradverkehr (2019) — **von der Fachstelle als zutreffend bestätigt** |
| VSS 40 263 «Strassengeometrie — Querschnitt von Hauptverkehrsstrassen» | Knoten; Knoten mit Kreisverkehr (2019) |
| VSS 40 281 «Knoten mit Lichtsignalanlagen» | Parkieren – Angebot an Parkfeldern für Personenwagen (2019) |
| VSS 40 360 «Verkehrsführung in Knoten — Markierungen» | Strassenentwässerung, Sammelleitungen und Drainagen (2019) |
| SN 640 886 «Sicherheit in Strassentunneln — Baustellen» | Temporäre Signalisation (ausser Kraft) |

**VSS 40 201 ist der klarste Fall.** Der Bestand führt sie als Geometrisches
Normalprofil; das GNP-Werkzeug der Fachstelle arbeitet unter derselben Nummer.
Der Katalogtitel «Fussverkehr — Grundnorm» passt dazu nicht.

### 2.2.1 Kandidaten aus dem Bestand

Für jeden der zehn Einträge: was die Katalognummer im Bestand trägt, und
welche anderen Normen den gemeinten Gegenstand führen. Auswahl fachlich.

| Katalog | Diese Nummer trägt im Bestand | Kandidaten zum gemeinten Gegenstand |
|---|---|---|
| VSS 40 050 «Strassenraum — Grundabmessungen» | Grundstückzufahrten (2019, veraltet) | VSS 40 210/40 212/40 214/40 215 «Entwurf des Strassenraums» (2019); VSS 40 180 «Strassenraumgestaltung in Zentrumsgebieten» (2003, aktiv) |
| VSS 40 201 «Fussverkehr — Grundnorm» | Geometrisches Normalprofil (2019, **aktiv**) | SN 640 070 «Fussgängerverkehr; Grundnorm» (2014, veraltet); SN 640 075 «Hindernisfreier Verkehrsraum» (2014, aktiv) |
| VSS 40 202 «Fussverkehr — Gehwegbreite» | Geometrisches Normalprofil; Erarbeitung (2021) | SN 640 153 «Elemente des Querschnittes Gehwege» (veraltet); VSS 40 242 «Trottoirüberfahrten» (2022) |
| VSS 40 212 «Veloverkehr — Radwege und Radstreifen» | Entwurf des Strassenraums – Gestaltungselemente (2019) | SN 640 151 «Elemente des Querschnittes Radwege und Radstreifen» (veraltet); SN 640 060 «Leichter Zweiradverkehr; Grundlagen» (2000) |
| VSS 40 213 «Veloverkehr — Führung an Knoten» | Entwurf des Strassenraumes; Verkehrsberuhigungselemente (2019) | **VSS 40 252 «Knoten; Führung des Veloverkehrs» (1994)**; SN 640 064 (2009) |
| VSS 40 241 «Fussgaengerstreifen» | Querungen für den Fussgänger- und leichten Zweiradverkehr (2019, veraltet) | **Von der Fachstelle bestätigt.** Daneben VSS 40 093 «Fussgängerstreifen» (2012, aktiv) und VSS 40 008 «Fussgängerstreifen; Anforderungen» (2011, aktiv) |
| VSS 40 263 «Querschnitt Hauptverkehrsstrassen» | Knoten; Knoten mit Kreisverkehr (2019) | **VSS 40 067 «Querschnitte Hauptstrassen» (2012, aktiv)**; VSS 40 068 «Querschnitte Verbindungsstrassen» |
| VSS 40 281 «Knoten mit Lichtsignalanlagen» | Parkieren – Angebot an Parkfeldern (2019) | SN 640 837 «Lichtsignalanlagen» (2015, ausser Kraft); VSS 40 085 «Betriebssicherheit von Lichtsignalanlagen» (2006, aktiv) |
| VSS 40 360 «Markierungen» | Strassenentwässerung, Sammelleitungen und Drainagen (2019) | **VSS 40 164 «Strassenmarkierung» (2011, aktiv)**; SN 640 850A «Markierungen; Ausgestaltung und Anwendungsbereiche» (2005, aktiv) |
| SN 640 886 «Sicherheit in Strassentunneln — Baustellen» | Temporäre Signalisation (ausser Kraft) | VSS 40 886.1 «Signalisation von Baustellen auf Haupt- und Nebenstrassen» (2019); VSS 40 885 «Temporäre Signalisation» (2019); VSS 40 346 «Baustellensignalisation» (2008, aktiv) |

Fett hervorgehoben ist, wo ein Kandidat den Katalogtitel besonders genau
trifft. Auch das ist ein Hinweis, kein Urteil — VSS 40 241 zeigt, dass eine
scheinbar bessere Übereinstimmung in die Irre führen kann.

### 2.3 Bestand führt die Nummer ohne Titel — nicht prüfbar

VSS 40 138 · SN 640 080 · VSS 40 372 · VSS 40 380 · VSS 40 384 ·
SN 640 521 · SN 640 312

### 2.4 Im Bestand nicht auffindbar — kein Urteil möglich

VSS 41 722 · VSS 41 723 · VSS 40 040 · VSS 40 080 · VSS 40 290 ·
VSS 40 263a · VSS 40 211 · VSS 40 390 · VSS 40 869 · SSV · bfu R 9928 ·
bfu Bericht 73

Der Bestand ist unvollständig: 401 Normen sind als `not_licensed`, 170 als
`not_in_portal` erfasst. **Sein Schweigen ist kein Beleg für Nichtexistenz** —
VSS 41 722 und VSS 41 723 sind der Beweis dafür.

---

## 3. Zwei eigene Fehlversuche

**Volltextsuche nach Titelwörtern als Zuordnung ausgegeben.** Auf die Frage,
welche Norm «Fussgängerstreifen» regelt, lieferte die Suche VSS 40 093 und
VSS 40 008. Das war eine Kandidatenliste; sie wurde als «die richtige Nummer»
dargestellt. Der Katalogeintrag VSS 40 241 war die ganze Zeit korrekt.

**Wortüberlappung als Kriterium.** Der zweite Versuch verglich die Sachwörter
beider Titel. Auch er stuft VSS 40 241 falsch ein, weil «Fussgängerstreifen»
und «Querungen für den Fussgänger- und leichten Zweiradverkehr» kein Wort
teilen und dieselbe Sache bezeichnen.

**Was daraus folgt:** Für die Zuordnung Nummer zu Gegenstand gibt es kein
maschinelles Kriterium. Der Abgleich kann Kandidaten vorlegen; die Entscheidung
ist fachlich.

---

## 4. Offen

- Entscheid über die Einträge in 2.2 bis 2.4 des Katalogs
- Nachfolgeausgabe zu VSS 40 241:2019, die der Bestand als veraltet führt
- Nachbezug von VSS 41 722 und VSS 41 723 in den Korpus (Projekt `vss_Normen`)
- Bereinigung der zwölf «Platzhalter»-Defizite und des Eintrags `Egal` in den
  Produktivdaten (Admin-Bereich, kein Schreibzugriff von hier)

---

## 5. Nachtrag vom 6. September 2026, abends

Ziffer 3 hielt fest, für die Zuordnung einer Nummer zum gemeinten Gegenstand
gebe es kein maschinelles Kriterium. Das bleibt richtig. Was fehlte, war nicht
ein Algorithmus, sondern die Quelle: **SN 641 700:2022, Anhang G, Ziff. 16,
Tabelle 2 «Thematische Zuordnung der sicherheitsrelevanten Normen», S. 11–14.**
Die Grundnorm ordnet dort jedem Sicherheitskriterium ihre Normen zu, mit
Nummer und Titel, und sagt selbst, die Liste sei nicht abschliessend.

### 5.1 Was der Katalog jetzt führt

`src/data/regelwerkKatalog.ts` ist neu geschrieben und folgt dieser Tabelle:
79 Einträge mit dem dort geschriebenen Titel, dazu das Ausgabejahr aus dem
Normenbestand. Die zehn Einträge aus Ziffer 2.2 sind damit erledigt — nicht
durch eine Auswahl unter Kandidaten, sondern weil die Grundnorm die Zuordnung
selbst vornimmt. Drei Beispiele:

| Katalog früher | Tabelle 2 |
|---|---|
| VSS 40 201 «Fussverkehr — Grundnorm» | Geometrisches Normalprofil; Grundabmessungen und Lichtraumprofil der Verkehrsteilnehmer |
| VSS 40 281 «Knoten mit Lichtsignalanlagen» | steht in Tab. 2 nicht; die Nummer trägt im Bestand «Parkieren» |
| VSS 40 360 «Verkehrsführung in Knoten — Markierungen» | steht in Tab. 2 nicht; Markierung führt SN 640 850, VSS 40 851, SN 640 852, VSS 40 854, VSS 40 862 |

Die «Fussverkehr — Grundnorm», die früher unter VSS 40 201 stand, ist nach
Tab. 2 **SN 640 070**. Damit ist auch die Schreibweise «VSS 640 070» aus einem
Defizittext geklärt: Sie mischt zwei Nummernkreise, gemeint ist SN 640 070.

### 5.2 Was die Defizite jetzt tragen

Von den 36 Defiziten der Auswahl vom 6. September tragen **26 einen
Normbezug**, zusammen 77 Referenzen; vorher waren es fünf. Drei Quellen:

1. Was der Inspektionsbericht im Text des Defizits nennt. — Beleg
2. Was Tab. 2 dem Sicherheitskriterium des Defizits zuordnet. — Beleg
3. Für sechs Defizite, deren Kriterium in Tab. 2 vierzehn (Knotengeometrie)
   oder acht Normen (Querschnitt) führt: eine Auswahl je Einzelfall danach,
   welcher Gegenstand im Defizittext vorkommt. — **Schlussfolgerung**, am
   6. September 2026 freigegeben.

Die Auswahl unter (3) im Einzelnen, mit dem Grund je Norm, steht in
`daten/entscheide_2026_09_06.py` unter `NORMREFS_DEFIZIT`. Zwei Zuordnungen
gehen über die Kriteriumsgrenze und sind dort benannt: VSS 40 242
(Trottoirüberfahrten, in Tab. 2 unter «Fussgängerquerungen») bei zwei
Knotendefiziten, und VSS 40 271 (Befahrbarkeit) bei SD_01093, wo der Beleg im
Massnahmentext steht und nicht in der Beschreibung.

**Ohne Bezug bleiben zehn Defizite**: Bankette, Risse, Flicke,
Randabschlüsse, Angebot und Verträglichkeit, Sichtweite allgemein sowie
Signale und Wegweiser. Für keines dieser Kriterien führt Tab. 2 eine
Entsprechung, die den Gegenstand trifft.

### 5.3 Das Gültigkeitsfeld des Bestands taugt nicht als Massstab

Der Bestand führt VSS 40 241:2019 als «veraltet», obwohl diese Ausgabe gilt.
Das Feld ist ausserdem nur bei 1536 von 3882 Einträgen gesetzt, Stand
15. Juni 2026. Der Katalog führt deshalb **keine** Gültigkeitsangabe, nur das
Ausgabejahr. Wer die geltende Fassung braucht, prüft sie am Original.

Der Wächter `src/test/normnummern.test.ts` meldet weiterhin jede Nummer, die
der Bestand als veraltet führt. Seine Ausnahmeliste trägt jetzt 29 Nummern aus
Tabelle 2, jede mit dem Kriterium, unter dem sie dort steht.

### 5.4 Zwei Befunde am Wächter

**Er verglich das Ausgabesuffix gross gegen klein.** Der Bestand führt die
Sichtweitennorm als «40090B», das Projekt schreibt sie «VSS 40 090b». Der
Wächter meldete sie als im Bestand unauffindbar — eine Meldung, die richtig
ausgesehen hätte.

**Er prüfte nicht, was sein eigener Kommentar versprach.** Dort stand, eine
nicht mehr gebrauchte Ausnahme verdecke künftige Befunde; geprüft wurde aber
nur, ob die Nummer im Bestand noch veraltet ist, nicht, ob das Projekt sie
überhaupt noch nennt. Die ergänzte Prüfung meldete beim ersten Lauf zwei tote
Ausnahmen.

### 5.5 Offen

- **Die 29 Defizite in den Produktivdaten tragen weiterhin SN 641 723.** Der
  Wächter liest den Quellbaum, nicht Supabase. Die geltende Nummer ist
  VSS 41 723; sie ist im Normenbestand nicht erfasst, ein Nachbezug steht aus.
- **VSS 40 273a in einem Defizittext.** Der Bericht zitiert sie für eine lichte
  Höhe von 3,00 m. Die Norm heisst «Knoten; Sichtverhältnisse in Knoten in
  einer Ebene»; das Lichtraumprofil führt nach Tab. 2 die VSS 40 201. Die
  Zitation steht unverändert — sie zu berichtigen wäre eine stille
  Sachänderung.
- **Widerspruch bei VSS 40 105.** Tab. 2 führt sie als «Verbreiterung der
  Fahrbahn in Kurven», der Bestand als «Strassenablauf ausserhalb Fahrbahn»
  (2012). Beide Belege stehen; welcher gilt, ist am Original zu prüfen.
- **Sechzehn Nummern aus Tab. 2 fehlen im Bestand**, darunter VSS 40 090,
  VSS 40 100 und VSS 40 200. Drei davon führt Tab. 2 selbst als «in
  Vorbereitung».
- Nachfolgeausgabe zu VSS 40 241:2019 weiterhin offen.
