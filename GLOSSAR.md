# Glossar und Abkürzungsverzeichnis – RSI VR Tool

> Stand v0.18.0.

Fachbegriffe und Abkürzungen der Strassenverkehrssicherheit in der Bedeutung,
die sie im RSI VR Tool haben. Verbindlich für Oberfläche, Handbücher und
Schulungsunterlagen: Wo dieselbe Sache gemeint ist, steht dieselbe Bezeichnung.

---

## Abkürzungen

| Kürzel | Bedeutung | Kontext |
|---|---|---|
| **RSI** | Road Safety Inspection | Strasseninspektion nach normativem 9-Schritte-Verfahren |
| **ISSI** | Infrastruktur-Sicherheitsinstrumente | Oberbegriff für die 2013 in Umsetzung von Art. 6a SVG geschaffenen Instrumente; die RSI ist eines davon, daneben Audit, Folgeabschätzung und Netzeinstufung |
| **FK RSI** | Fachkurs Road Safety Inspection | Schulungsreferenz V 16.09.2020, Herausgeber TBA |
| **TBA** | Tiefbauamt | Herausgeber des Fachkurses FK RSI (Quellenangabe) |
| **bfu** | Beratungsstelle für Unfallverhütung | Schweizer Kompetenzstelle für Unfallprävention; französisch bpa, italienisch upi |
| **ASTRA** | Bundesamt für Strassen | Oberbehörde für Nationalstrassen und Strassenverkehr |
| **NACA** | National Advisory Committee for Aeronautics | Skala 0–7 zur Einstufung der Unfallschwere, angewendet nach bfu-Bericht 73 |
| **SD** | Sicherheitsdefizit | Einzelne Abweichung von einer normativen Sicherheitsanforderung |
| **io / ao** | innerorts / ausserorts | Kontext der Wichtigkeits-Bewertung |
| **VSS** | Verband der Strassen- und Verkehrsfachleute | Schweizer Normenherausgeber (VSS 40 xxx) |
| **SN** | Schweizer Norm | Etwa SN 640 xxx (Strassenbau), SN 641 xxx (Verkehr) |
| **SVG** | Strassenverkehrsgesetz | SR 741.01; nicht zu verwechseln mit dem Bildformat Scalable Vector Graphics |
| **SSV** | Signalisationsverordnung | SR 741.21, Bundesrecht zu Signalen und Markierungen |
| **SR** | Systematische Rechtssammlung | Nummerierung des Bundesrechts, etwa SR 741.01 |
| **URG** | Urheberrechtsgesetz | SR 231.1, Bundesgesetz über das Urheberrecht und verwandte Schutzrechte |
| **DSG** | Datenschutzgesetz | SR 235.1, totalrevidiert in Kraft seit 2023 |
| **DSGVO** | Datenschutz-Grundverordnung | EU-Verordnung; sie gilt in der Schweiz nicht unmittelbar, massgebend ist das DSG |
| **EDÖB** | Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter | Aufsichtsbehörde des Bundes für den Datenschutz |
| **IP** | Internet Protocol | IP-Adresse als Kennung eines Geräts im Netz |
| **WCAG** | Web Content Accessibility Guidelines | W3C-Richtlinien zur Barrierefreiheit |
| **WebXR** | Web Extended Reality | Browser-Schnittstelle für VR und AR |
| **PWA** | Progressive Web App | Installierbare, offlinefähige Web-Anwendung |
| **CI** | Continuous Integration | Automatisierte Test- und Build-Kette |
| **PIN** | Persönliche Identifikationsnummer | 4-stelliger Zugang zum Administrationsbereich |
| **UI / UX** | User Interface / User Experience | Benutzeroberfläche / Nutzererfahrung |
| **RLS** | Row Level Security | Zugriffsrechte auf Zeilenebene in Supabase |
| **SHA-256** | Secure Hash Algorithm 256 Bit | Einwegfunktion zur Pseudonymisierung |
| **HDRI** | High Dynamic Range Imaging | Panorama-Bildformat mit hoher Dynamik |
| **UV** | UV-Mapping | Zweidimensionale Texturkoordinaten auf 3D-Oberflächen |
| **ISO** | Internationale Organisation für Normung | Herausgeberin von ISO 3166-1, dem Verzeichnis der Ländercodes |
| **DTV** | Durchschnittlicher täglicher Verkehr | Fahrzeuge in 24 Stunden; Strassenmerkmal aus der Perimeterebene |
| **LOS** | Level of Service | Verkehrsqualitätsstufe A bis F; Strassenmerkmal |
| **HVS / RVS** | Hauptverkehrsstrasse / Verbindungsstrasse | Klassierung im Strassennetz; Merkmal «Strassenklassierung» |
| **LSA** | Lichtsignalanlage | Strassenmerkmal; umgangssprachlich Ampel |
| **GNP** | Geometrisches Normalprofil | Gegenstand von VSS 40 200 bis 40 202 |

---

## Fachbegriffe

### Land

Jeder Themenbereich, jede Szene, jeder Kurs und jedes Ergebnis gehört zu einem
Land, bezeichnet mit dem zweistelligen Code nach ISO 3166-1 alpha-2. Geführt
wird das Land am obersten Themenbereich; untergeordnete Themen erben es und
tragen kein eigenes Feld. Ein Datensatz ohne Angabe gilt als schweizerisch.

Die Auswahl umfasst alle 249 offiziell zugeteilten Codes. Nicht enthalten sind
die ausnahmsweise reservierten (darunter CQ für Sark), die benutzerdefinierten
und die gelöschten Codes untergegangener Staaten; die Begründung je Ausschluss
steht im Kopf von `src/data/laender.ts`.

### Verfahren

Der Ablauf, nach dem ein Sicherheitsdefizit beurteilt wird. Welches Verfahren
gilt, entscheidet das Land. Hinterlegt ist eines: der Neunschrittpfad des
Fachkurses FK RSI für die Schweiz. Für ein Land ohne Verfahren gibt es keinen
Ablauf, keinen Ersatz und keine Punkte.

Die Bezeichnungen eines Verfahrens – Schrittnamen, Phasen, Dimensionen,
Matrixbeschriftungen – stehen getrennt von der Bedienung in einer eigenen Datei.
Was jedes Verfahren gleich braucht, etwa «Weiter» oder «Punkte erhalten», bleibt
in den allgemeinen Sprachdateien.

### Zuständigkeit

Je Land die Angabe, welche Stelle die Inhalte verantwortet, auf welcher
fachlichen Grundlage, mit welchem Stand und mit welchem Hinweis. Gepflegt wird
sie im Administrationsbereich, angezeigt beim Themenbereich und auf dem
Rückmeldebildschirm jeder Szene.

Solange für ein Land nichts eingetragen ist, sagt die Anwendung das: noch nicht
bestimmt, Inhalte vorläufig, keine Freigabe durch eine Stelle dieses Landes, nur
zu Trainingszwecken. Diese Auskunft gilt für jedes Land, die Schweiz
eingeschlossen.

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

### Strassenmerkmal

Eine Angabe zur Anlage, in der eine Szene liegt: Klassierung, Lage innerorts
oder ausserorts, signalisierte Geschwindigkeit, Trottoir, Veloinfrastruktur und
weitere. Die Merkmale beschreiben den Ort, nicht den Mangel; sie stehen in der
Einstiegsansicht über dem Startknopf und im Szenenformular.

Der Katalog `src/data/strassenmerkmale.ts` führt 21 Merkmale in drei Gruppen und
gibt je Merkmal die Wertliste vor. Die Werte stammen aus der Erfassung, nicht
aus einer Erfindung: In der RSI-Geodatenbank stehen sie als Domänencode, den
Klartext liefert die Codeliste des Auswertungsprojekts.

### Sicherheitskriterium

Die Bezeichnung, unter der ein Mangel geführt wird – Anhaltesichtweite,
Knotengeometrie, Bankette. Zwei Verzeichnisse verwenden den Begriff: die
WICHTIGKEIT_TABLE des Fachkurses mit 58 Kriterien, aus der die Wichtigkeit
abgelesen wird, und Tabelle 2 der SN 641 700:2022, die jedem Kriterium ihre
Normen zuordnet. Die beiden decken sich nicht vollständig; für sieben Kriterien
des Fachkurses führt Tabelle 2 keine Entsprechung.

### Normbezug

Die Normen, auf die sich ein Defizit stützt, als Liste von «Nummer — Titel».
Drei Quellen speisen sie: der Text des Inspektionsberichts, die Zuordnung aus
Tabelle 2 der SN 641 700:2022, und dort, wo diese Zuordnung vierzehn oder acht
Normen umfasst, eine begründete Auswahl je Einzelfall. Die dritte ist eine
Schlussfolgerung, keine Normvorgabe.

### Lernkarte

Die Rückmeldung nach einem beurteilten Defizit: richtige und falsche Antwort je
Schritt, die Matrix-Herleitung und ein Erklärungstext. Der Text gibt wieder, was
der Inspektionsbericht als Massnahme vorschlägt.

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
