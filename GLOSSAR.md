# Glossar und Abkürzungsverzeichnis – RSI VR Tool

> Stand v0.11.0.

Fachbegriffe und Abkürzungen der Strassenverkehrssicherheit in der Bedeutung,
die sie im RSI VR Tool haben. Verbindlich für Oberfläche, Handbücher und
Schulungsunterlagen: Wo dieselbe Sache gemeint ist, steht dieselbe Bezeichnung.

---

## Abkürzungen

| Kürzel | Bedeutung | Kontext |
|---|---|---|
| **RSI** | Road Safety Inspection | Strasseninspektion nach normativem 9-Schritte-Verfahren |
| **FaSi** | Fachstelle Verkehrssicherheit | Organisationseinheit im Tiefbauamt Kanton Zürich |
| **KZH / KTZH** | Kanton Zürich | Auftraggeber und Herausgeber des Tools |
| **TBA** | Tiefbauamt | Teil der Baudirektion des Kantons Zürich |
| **FK RSI** | Fachkurs Road Safety Inspection | Schulungsreferenz V 16.09.2020 |
| **bfu** | Beratungsstelle für Unfallverhütung | Schweizer Kompetenzstelle für Unfallprävention |
| **ASTRA** | Bundesamt für Strassen | Oberbehörde für Nationalstrassen und Strassenverkehr |
| **NACA** | National Advisory Committee for Aeronautics | Skala 0–7 zur Einstufung der Unfallschwere, angewendet nach bfu-Bericht 73 |
| **SD** | Sicherheitsdefizit | Einzelne Abweichung von einer normativen Sicherheitsanforderung |
| **io / ao** | innerorts / ausserorts | Kontext der Wichtigkeits-Bewertung |
| **VSS** | Verband der Strassen- und Verkehrsfachleute | Schweizer Normenherausgeber (VSS 40 xxx) |
| **SN** | Schweizer Norm | Etwa SN 640 xxx (Strassenbau), SN 641 xxx (Verkehr) |
| **SSV** | Signalisationsverordnung | Bundesrecht zu Signalen und Markierungen |
| **DSG** | Datenschutzgesetz | Revidiert in Kraft seit 2023; die EU-DSGVO gilt hier nicht unmittelbar |
| **WCAG** | Web Content Accessibility Guidelines | W3C-Richtlinien zur Barrierefreiheit |
| **WebXR** | Web Extended Reality | Browser-Schnittstelle für VR und AR |
| **PWA** | Progressive Web App | Installierbare, offlinefähige Web-Anwendung |
| **CD** | Corporate Design | Gestaltungsrichtlinien, hier des Kantons Zürich |
| **CI** | Continuous Integration | Automatisierte Test- und Build-Kette |
| **PIN** | Persönliche Identifikationsnummer | Zugang zum Administrationsbereich |
| **RLS** | Row Level Security | Zugriffsrechte auf Zeilenebene in Supabase |
| **SHA-256** | Secure Hash Algorithm | Einwegfunktion zur Pseudonymisierung |
| **HDRI** | High Dynamic Range Imaging | Panorama-Bildformat mit hoher Dynamik |
| **UV** | UV-Mapping | Zweidimensionale Texturkoordinaten auf 3D-Oberflächen |

---

## Fachbegriffe

### 9-Schritte-Methodik RSI

Normatives Verfahren nach dem TBA-Fachkurs FK RSI, angewendet je
Sicherheitsdefizit:

| Schritt | Typ | Inhalt |
|---|---|---|
| 1 | Eingabe | Wichtigkeit aus der WICHTIGKEIT_TABLE ablesen (io/ao) |
| 2 | Automatisch | Wichtigkeit in die Relevanz-Matrix eintragen |
| 3 | Eingabe | Abweichung beurteilen (gross/mittel/klein) |
| 4 | Automatisch | Abweichung in die Relevanz-Matrix eintragen |
| 5 | Automatisch | Relevanz SD aus Wichtigkeit und Abweichung |
| 6 | Automatisch | Relevanz SD in die Unfallrisiko-Matrix eintragen |
| 7 | Eingabe | NACA-Einstufung (0–7) |
| 8 | Automatisch | Unfallschwere in die Unfallrisiko-Matrix eintragen |
| 9 | Automatisch | Unfallrisiko aus Relevanz SD und Unfallschwere |

### Wichtigkeit

Einstufung in gross, mittel oder klein, wie sie der Fachkurs einem Kriterium
zuweist, getrennt nach innerorts und ausserorts. Quelle ist die
`WICHTIGKEIT_TABLE` mit 58 Kriterien. Die Wichtigkeit wird abgelesen, nicht
geschätzt.

### Abweichung

Mass dafür, wie stark der Ist-Zustand von der Norm abweicht: gross, mittel oder
klein. Beurteilt wird sie von der inspizierenden Person.

### Relevanz SD

Ergebnis aus Wichtigkeit und Abweichung über eine 3×3-Matrix, ausgedrückt als
gering, mittel oder hoch.

### Unfallschwere

Übersetzung der NACA-Skala in drei Klassen: leicht für NACA 0 und 1, mittel für 2
und 3, schwer für 4 bis 7.

### Unfallrisiko

Endergebnis aus Relevanz SD und Unfallschwere über eine 3×3-Matrix: gering,
mittel oder hoch. Farblich hinterlegt mit Grün, Orange und Rot.

### Kategorie

Einordnung eines Defizits, die der eigentlichen Bewertung vorausgeht. Sie gehört
nicht zur normativen 9-Schritte-Methodik.

### Verortung

Geometrische Festlegung eines Defizits im 360°-Panorama, als Punkt mit
Toleranzradius, als Polygon aus mehreren Eckpunkten oder als Gruppe mehrerer
Verortungen zu einer zusammenhängenden Fläche.

### Perspektive

Weiterer 360°-Standort innerhalb einer Szene, mit eigenem Panorama, eigenem
Startblick und eigenen Verortungen. Eine Kreuzung lässt sich so aus jeder
Einfahrt zeigen.

### Standort-Navigation

Wechsel zwischen Haupt-Panorama und Perspektiven über anklickbare Marker im Bild,
in beide Richtungen und ohne Umweg über ein Menü.

### Standort-Hinweis

Erste Stufe der Hilfestellung. Sie markiert die Standorte, hinter denen noch ein
unentdecktes Defizit liegt, ohne die Stelle im Bild zu zeigen. Die Bezeichnung
vermeidet bewusst den Begriff Wegweiser, der im Strassenwesen ein Signal
bezeichnet und mit dem RSI-Kriterium «Signale / Wegweiser» kollidiert.

### Hotspots

Zweite Stufe der Hilfestellung. Sie blendet die Marker der offenen Defizite
direkt im Panorama ein.

### Startblick

Blickrichtung beim Laden einer Szene oder Perspektive. Im BildEditor gesetzt und
im Viewer beim Start eingenommen.

### Best-of-Punktesystem

Eine Szene lässt sich beliebig oft wiederholen; gewertet wird der beste
Durchgang.

### Punkte je Defizit

| Beitrag | Punkte |
|---|---|
| Kategorie richtig | 25 |
| Kategorie falsch, Defizit aber gefunden | 15 |
| Schritt 1, Wichtigkeit richtig | 25 |
| Schritt 3, Abweichung richtig | 25 |
| Schritt 7, NACA richtig | 25 |
| **Maximum** | **100** |

Die Schritte 2, 4, 5, 6, 8 und 9 rechnet die App aus den drei Eingaben; sie
tragen keine eigenen Punkte.

### Abzüge

Der Standort-Hinweis kostet 10 Punkte je gefundenes Defizit, die Hotspot-Stufe
25 Punkte. Massgebend ist die Stufe, die beim Fund aktiv war; die beiden Abzüge
summieren sich nicht.

### Sterne

Einstufung nach dem erreichten Prozentwert: unter 60 % ein Stern, von 60 bis
89 % zwei Sterne, ab 90 % drei Sterne.

### Bestanden-Kriterium

Eine Szene gilt als bestanden, wenn alle Pflichtdefizite gefunden sind und
mindestens 60 % der Punkte erreicht wurden. Der Wert gilt für die ganze App und
lässt sich je Szene überschreiben. Sterne und Punkte bleiben davon unberührt.

### Kriterium

Einer der 58 Einträge der `WICHTIGKEIT_TABLE`, etwa `visuelle_linienfuehrung`
oder `angebot_vertraeglichkeit`. Jeder Eintrag verbindet den Kontext innerorts
oder ausserorts mit einem Wichtigkeitswert.

### Szene

Eine Verkehrssituation mit einem Haupt-Panorama, wahlweise weiteren
Perspektiven, einer Liste von Defiziten und einem Einführungstext. Jede Szene
gehört zu einem Unterthema.

### Thema und Unterthema

Gliederung der Szenen, etwa das Oberthema «Verkehrsführung» mit dem Unterthema
«Linienführung».

### Kurs

Zeitlich begrenzter Zugang für eine Gruppe, mit Zugangscode, wahlweise Passwort,
Gültigkeitsdauer und einer Auswahl an Themen. Themen lassen sich einem Kurs
vorbehalten; sie erscheinen dann im freien Training nicht.

### Pflichtdefizit

Defizit, das für die Vollständigkeit einer Szene gefunden werden muss.

### Booster

Kennzeichnung besonders prüfungsrelevanter Defizite. Ein Booster erhöht die
Punkte des betreffenden Defizits um den im Administrationsbereich gesetzten
Prozentsatz.

### Befundliste

Teil des PDF-Berichts. Sie führt je Defizit das Kriterium sowie Soll- und
Ist-Beurteilung über die ganze Kette von der Wichtigkeit bis zum Unfallrisiko
auf, mit Normbezug, und weist nicht gefundene Defizite als solche aus.
