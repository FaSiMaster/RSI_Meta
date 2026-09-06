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
