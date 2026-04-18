# Benutzerhandbuch — RSI VR Tool

> Für Inspektorinnen und Inspektoren im Schulungseinsatz. Stand v0.3.0.
> Begleitend zum TBA-Fachkurs FK RSI (V 16.09.2020).

---

## 1. Erste Schritte

### 1.1 Zugang
Die App ist unter [rsi-meta.vercel.app](https://rsi-meta.vercel.app) erreichbar. Keine Installation nötig — läuft in jedem modernen Browser (Chrome, Firefox, Safari, Edge). Für VR-Nutzung: Meta Quest 3 Browser.

### 1.2 Anmeldung
1. Name eingeben (wird lokal auf Ihrem Gerät gespeichert, in der Rangliste als Pseudonym gehasht).
2. Kurs auswählen (falls Ihr Kurs gelistet ist) — sonst «Offener Kurs».
3. Falls ein Passwort verlangt wird: Zugangscode vom Kursleiter.
4. **Training starten** klicken.

### 1.3 Datenschutz
Ihr Name wird in der Rangliste als SHA-256-Pseudonym gespeichert — nicht im Klartext. Ihre Score-Ergebnisse sind lokal auf dem Gerät und in der zentralen Rangliste pseudonym sichtbar. Details: `/datenschutz.html` oder Footer-Link.

---

## 2. Themen-Dashboard

Nach dem Login sehen Sie die **Themenbereiche** — z.B. «Verkehrsführung», «Infrastruktur Fussverkehr», «Signalisation». Unter jeder Karte finden Sie die Unterthemen (Gruppen).

**Schritt-für-Schritt-Anleitung** (untere Hälfte):
1. Thema wählen
2. Szene starten
3. Defizite im 360°-Bild markieren
4. 9-Schritt-Bewertung durchlaufen

**RSI-Methodik aufklappen** (rechts unten) für die Matrizen und NACA-Skala als Referenz.

---

## 3. Szenen-Auswahl

Klick auf ein Thema → Liste der Szenen. Jede Karte zeigt:
- Vorschaubild
- Szenen-Titel
- Erreichte Sterne (1–3) — Best-of aus allen bisherigen Durchgängen
- Erzielte Punkte

**Neue Szene beginnen** oder **erneut spielen** über den Start-Button.

---

## 4. Szenen-Einführung

Vor jeder Szene sehen Sie:
- **Kontext-Beschreibung** — wo sind Sie, welche Verkehrssituation
- **Merkmale der Strasse** — Funktionalität (z.B. HLS / Sammelstrasse / Erschliessung), Geschwindigkeitsregime, Geometrie
- **Zielsetzung** — was Sie in dieser Szene üben

Lesen Sie diesen Abschnitt gründlich — er enthält normative Hinweise die bei der Bewertung helfen.

---

## 5. Viewer (360°-Panorama)

### 5.1 Navigation
- **Ziehen mit Maus:** Blickrichtung ändern
- **Mausrad (optional):** FOV-Zoom
- **Standort-Marker** (Diamant-Symbol im Bild): klicken, um zu einer anderen Perspektive zu wechseln
- **Zurück zum Haupt-Panorama:** gleicher Diamant-Mechanismus oder Seitenmenü

### 5.2 Defizit suchen und markieren
1. Blick im Panorama orientieren.
2. Stelle anklicken, an der Sie ein Sicherheitsdefizit vermuten.
3. **Weisser Marker** erscheint + Bestätigen-Button (5 s Zeitlimit zum Korrigieren).
4. **Bestätigen** → Treffer-Check.
5. Bei Treffer: **Grüner Hotspot** erscheint (bleibt sichtbar für den Rest der Szene).
6. Bei Fehlschuss: kurzes Feedback, Sie können erneut anklicken.

### 5.3 Hilfsmittel
- **Hinweise (Lupe):** blendet die Positionen aller Defizite als farbige Hotspots ein (−25 Pkt. auf den Szenen-Score).
- **Panik-Button VR:** bricht VR-Session ab und kehrt in den Browser-Modus zurück.
- **Zeit-Zähler:** läuft oben in der Navbar, wird gewertet als Sekundärkriterium.

---

## 6. 9-Schritt-Bewertung

Nach Treffer auf ein Defizit öffnet sich das Bewertungs-Panel. **Drei Benutzereingaben** (Schritte 1, 3, 7) — die anderen Schritte rechnen automatisch.

### 6.1 Schritt 1 — Wichtigkeit (Konsequenz)
Frage: **Wie wichtig ist dieses Merkmal innerorts (io) oder ausserorts (ao)?**
- **gross / mittel / klein**
- Hilfestellung: WICHTIGKEIT_TABLE aus FK RSI Folie 2.

### 6.2 Schritt 3 — Abweichung (Norm)
Frage: **Wie stark weicht der Ist-Zustand von der Norm ab?**
- **gross / mittel / klein**
- Prüfen: VSS-Norm, SN-Standard, Richtlinien.

### 6.3 Schritt 5 — Relevanz SD (automatisch)
Berechnet: Wichtigkeit × Abweichung → gering / mittel / hoch.

### 6.4 Schritt 7 — NACA (Unfallschwere)
Frage: **Wie schwer wäre ein potenzieller Unfall an dieser Stelle?**
- Skala **0 bis 7**:
  - NACA 0–1 → leicht
  - NACA 2–3 → mittel
  - NACA 4–7 → schwer

### 6.5 Schritt 9 — Unfallrisiko (automatisch)
Endergebnis: Relevanz SD × Unfallschwere → **gering / mittel / hoch**.

### 6.6 Lernkarte
Nach Abschluss der drei Schritte zeigt die **Lernkarte**:
- Ihr Bewertungsergebnis
- Die normative Soll-Lösung
- Fachliche Begründung (Massnahmenlogik)
- Quellenangabe (VSS/SN/FK RSI-Folie)

---

## 7. Szenen-Abschluss

Wenn alle Pflicht-Defizite gefunden oder Sie «Szene beenden» klicken:
- **Statistik:** X von Y Defiziten gefunden, Zeit, Sterne
- **Best-of:** Ihr bester Score dieser Szene
- **Nächste Szene** oder **zurück zum Dashboard**

---

## 8. Ranking

### 8.1 Gesamt-Rangliste
Alle Teilnehmer, pseudonym. Summe der Best-of-Scores über alle Szenen. Top 100 sichtbar.

### 8.2 Themen-Rangliste
Score pro Thema — zeigt, in welchem Bereich Sie stark oder schwach sind.

### 8.3 Kurs-Rangliste
Nur Teilnehmer Ihres Kurses (falls Sie mit Zugangscode eingeloggt sind).

### 8.4 Persönlicher Fortschritt
Sterne-Übersicht pro Thema, erreichte Szenen, Gesamt-Score.

---

## 9. Einstellungen & Werkzeuge

- **Sprachwahl** (Navbar oben rechts): Deutsch / Französisch / Italienisch / Englisch
- **Dark/Light-Theme** (Avatar-Popover): je nach Umgebung
- **Abmelden** (Avatar-Popover)
- **App zurücksetzen** (Avatar-Popover oder LandingPage-Footer): löscht alle lokalen Daten, Service Worker, Cache. Nur bei Problemen nutzen.

---

## 10. Häufige Fragen (FAQ)

**Ich sehe meine Punkte nicht in der Rangliste.**
→ Netzwerk prüfen. Bei fehlender Supabase-Verbindung werden Punkte nur lokal gespeichert und nachträglich synchronisiert.

**Der 360°-Viewer zeigt einen weissen Bildschirm.**
→ App-Reset durchführen (Avatar → zurücksetzen). Neu laden.

**Ich finde kein einziges Defizit.**
→ Hinweise (Lupe) aktivieren — kostet Punkte, zeigt aber alle Hotspots. Lernkarte anschliessend nutzen.

**Kann ich eine Szene mehrfach spielen?**
→ Ja. Best-of-Prinzip — nur das beste Ergebnis zählt.

**Wie lange bleiben meine Daten gespeichert?**
→ Lokal: bis zum App-Reset oder Browser-Cache-Löschung. In Supabase: dauerhaft, pseudonym. Löschantrag per E-Mail an die Fachstelle.

---

## 11. Support

Bei Problemen, Feedback oder Bugs:
- **E-Mail:** stevan.skeledzic@bd.zh.ch
- **Telefon:** +41 43 259 31 20
- **Fachstelle Verkehrssicherheit, Tiefbauamt, Kanton Zürich**

*Ausführlicher Schulungsleitfaden folgt im FK-RSI-Kurs-Skript.*
