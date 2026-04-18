# Glossar & Abkürzungsverzeichnis — RSI VR Tool

Gelber Standard zur Vermeidung von Missverständnissen: Fachbegriffe und Abkürzungen der Strassen-Verkehrssicherheit, wie sie im RSI VR Tool verwendet werden.

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
| **NACA** | National Advisory Committee for Aeronautics | Skala 0–7 zur Einstufung der Unfallschwere, angewendet durch bfu-Bericht 73 |
| **SD** | Sicherheitsdefizit | Einzelne Abweichung von einer normativen Sicherheitsanforderung |
| **io / ao** | innerorts / ausserorts | Kontext zur Wichtigkeits-Bewertung (Tempozone, Siedlungsdichte) |
| **VSS** | Verband der Strassen- und Verkehrsfachleute | Schweizer Normenherausgeber (VSS 40 xxx) |
| **SN** | Schweizer Norm | Z.B. SN 640 xxx (Strassenbau), SN 641 xxx (Verkehr) |
| **DSGVO** | Datenschutz-Grundverordnung | EU-Verordnung, in der Schweiz sinngemäss durch DSG (nDSG seit 2023) |
| **WCAG** | Web Content Accessibility Guidelines | W3C-Richtlinien Barrierefreiheit (2.1, 2.2) |
| **WebXR** | Web Extended Reality | Browser-API für VR/AR-Erlebnisse |
| **PWA** | Progressive Web App | Web-Anwendung mit App-Charakter (offline-fähig, installierbar) |
| **CD** | Corporate Design | Visuelle Gestaltungsrichtlinien (hier: CD Kanton Zürich) |
| **CI** | Continuous Integration | Automatisierte Test-/Build-Pipeline |
| **PIN** | Personal Identification Number | 4-stelliger Zugangscode (hier: Admin-Bereich) |
| **UI / UX** | User Interface / User Experience | Benutzeroberfläche / Nutzererfahrung |
| **PR** | Pull Request | Git-Vorschlag zur Code-Änderung |
| **RLS** | Row Level Security | Supabase-Mechanismus für Tabellen-Zugriffsrechte |
| **SHA-256** | Secure Hash Algorithm | Einwegfunktion zur Pseudonymisierung |
| **HDRI** | High Dynamic Range Imaging | Panorama-Bildformat (32-bit Farbtiefe) |
| **UV** | UV-Mapping | 2D-Textur-Koordinaten auf 3D-Oberflächen |

---

## Fachbegriffe

### 9-Schritt-Methodik RSI

Normatives Verfahren nach TBA-Fachkurs FK RSI, angewendet pro Sicherheitsdefizit:

| Schritt | Typ | Inhalt |
|---|---|---|
| 1 | Eingabe | Wichtigkeit aus WICHTIGKEIT_TABLE ablesen (io/ao) |
| 2 | Auto | Wichtigkeit in Relevanz-Matrix einzeichnen |
| 3 | Eingabe | Abweichung beurteilen (gross/mittel/klein) |
| 4 | Auto | Abweichung in Relevanz-Matrix einzeichnen |
| 5 | Auto | Relevanz SD = W × A |
| 6 | Auto | Relevanz SD in Unfallrisiko-Matrix einzeichnen |
| 7 | Eingabe | NACA-Einstufung (0–7) |
| 8 | Auto | Unfallschwere in Unfallrisiko-Matrix einzeichnen |
| 9 | Auto | Unfallrisiko = R × US |

### Wichtigkeit

Kategorische Einstufung (gross / mittel / klein), wie relevant ein Kriterium für den Verkehrsablauf und die Sicherheit ist. Kontextabhängig: innerorts (io) vs. ausserorts (ao). Quelle: `WICHTIGKEIT_TABLE` aus FK-RSI-Folie 2, 58 Kriterien.

### Abweichung

Wie stark der Ist-Zustand von der Norm (VSS/SN/Richtlinien) abweicht: gross / mittel / klein. Beurteilung durch Inspektor.

### Relevanz SD (Sicherheitsdefizit-Relevanz)

Kombiniertes Ergebnis aus Wichtigkeit × Abweichung (3×3-Matrix). Wertebereich: gering / mittel / hoch.

### Unfallschwere

Übersetzung der NACA-0-bis-7-Skala in die Kategorien: leicht (NACA 0–1), mittel (2–3), schwer (4–7).

### Unfallrisiko

Endbewertung aus Relevanz SD × Unfallschwere (3×3-Matrix). Wertebereich: gering / mittel / hoch. Farb-Kodierung: gering = grün, mittel = orange, hoch = rot.

### Verortung

Geometrische Definition des Defizits im 360°-Panorama. Drei Typen:
- **Punkt:** (θ, φ) + Toleranzradius (°)
- **Polygon:** Liste von (θ, φ)-Eckpunkten
- **Gruppe:** Mehrere Unter-Verortungen zu einer kombinierten Fläche

### Perspektive

Zusätzlicher 360°-Standort innerhalb einer Szene. Hat eigenes Panoramabild, eigenen Startblick, eigene Verortungen. Beispiel: Eine Kreuzung wird aus vier Einfahrten je einmal aufgenommen.

### Standort-Navigation

Bidirektionale Verknüpfung zwischen Haupt-Panorama und Perspektiven über klickbare 3D-Marker. User kann zwischen allen Standorten wechseln ohne Menü.

### Startblick

Die anfängliche Blickrichtung beim Laden einer Szene/Perspektive (θ, φ). Vom Admin im BildEditor gesetzt, im Viewer per OrbitControls initialisiert.

### Best-of-Punktesystem

Mehrfach-Durchgänge pro Szene zulässig — gewertet wird jeweils der beste Score. Sterne-Einstufung:
- **1 Stern:** < 60 % der Maximal-Punkte
- **2 Sterne:** 60–89 %
- **3 Sterne:** 90–100 %

### Penalty / Strafabzüge

- **Kategorie falsch zugeordnet:** −10 % auf das Defizit
- **Hinweise (Lupe) aktiviert:** −25 Punkte zum Gesamt-Score (pro Szene)

### Kriterium

Einer der 58 Einträge in `WICHTIGKEIT_TABLE`. Beispiel: `visuelle_linienfuehrung`, `angebot_vertraeglichkeit`. Bindet den Kontext (io/ao) an einen Wichtigkeits-Wert.

### Szene

Eine konkrete Verkehrssituation mit genau einem Haupt-Panorama, optional mehreren Perspektiven, einer Liste von Defiziten und einem Einstiegs-Text. Gehört zu einem Unterthema.

### Thema / Unterthema

Thematische Gruppierung von Szenen. Oberthema z.B. "Verkehrsführung", Unterthema z.B. "Linienführung", Szenen darunter.

### Kurs

Zeitlich begrenzter Zugang für eine Gruppe Kursteilnehmer. Hat einen Zugangscode, optional ein Passwort, Gültigkeitsdatum von/bis, und eine Auswahl von Themen.

### Defizit-Booster

Optionales Flag, das ein Defizit als besonders prüfungsrelevant markiert. Noch nicht aktiv im Scoring.

### Defizit-Pflicht

Flag, das ein Defizit zwingend zur Szenen-Vollständigkeit erforderlich macht (kein Überspringen möglich).
