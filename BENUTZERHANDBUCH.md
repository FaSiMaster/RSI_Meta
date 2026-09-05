# Benutzerhandbuch – RSI VR Tool

> Für Inspektorinnen und Inspektoren im Schulungseinsatz. Stand v0.11.0.
> Begleitend zum TBA-Fachkurs FK RSI (V 16.09.2020).

---

## 1. Erste Schritte

### 1.1 Zugang

Die App läuft unter [rsi-meta.vercel.app](https://rsi-meta.vercel.app) in jedem
aktuellen Browser, ohne Installation. Für den VR-Betrieb braucht es den Browser
der Meta Quest 3. Welche Browser und Geräte geprüft sind, steht in `BROWSER.md`.

### 1.2 Anmeldung

1. Name eingeben. Er bleibt auf Ihrem Gerät; in der Rangliste erscheint er als
   Pseudonym.
2. Kurs wählen, falls Ihrer aufgeführt ist, sonst «Offener Kurs».
3. Verlangt der Kurs ein Passwort: Zugangscode von der Kursleitung.
4. **Training starten**.

Wer sich mit einem Kurscode anmeldet, sieht die für diesen Kurs freigegebenen
Themen. Manche Themen sind einem Kurs vorbehalten und im freien Training nicht
sichtbar.

### 1.3 Datenschutz

In der Rangliste steht Ihr Name als SHA-256-Pseudonym, nicht im Klartext. Die
Ergebnisse liegen lokal auf dem Gerät und pseudonymisiert in der zentralen
Rangliste. Nur in Ihrer eigenen Zeile zeigt die Rangliste den Klartext, damit Sie
sich wiederfinden. Einzelheiten unter `/datenschutz.html` oder über den Link im
Fuss der Seite.

---

## 2. Themen-Dashboard

Nach der Anmeldung erscheinen die Themenbereiche, etwa «Verkehrsführung»,
«Infrastruktur Fussverkehr» oder «Signalisation». Unter jeder Karte stehen die
Unterthemen.

Die Schritt-für-Schritt-Anleitung in der unteren Hälfte führt durch den Ablauf:
Thema wählen, Szene starten, Defizite im 360°-Bild markieren, die
9-Schritte-Bewertung durchlaufen. Rechts unten lässt sich die RSI-Methodik
aufklappen; dort stehen die Matrizen und die NACA-Skala als Referenz.

---

## 3. Szenen-Auswahl

Ein Klick auf ein Thema öffnet die Szenenliste. Jede Karte zeigt Vorschaubild,
Titel, die erreichten Sterne von 1 bis 3 und die erzielten Punkte. Gewertet wird
jeweils der beste Durchgang. Sobald eine Szene einmal bestanden wurde, trägt die
Karte zusätzlich ein Bestanden-Kennzeichen.

Über den Start-Button beginnen Sie eine Szene neu oder wiederholen sie.

---

## 4. Szenen-Einführung

Vor jeder Szene sehen Sie, wo Sie stehen und welche Verkehrssituation Sie
erwartet, dazu die Merkmale der Strasse – Funktionalität, Geschwindigkeitsregime,
Geometrie –, die Zielsetzung der Übung sowie die Anzahl der Defizite, der
Pflichtdefizite und allfälliger Booster. Genannt wird auch, was für das Bestehen
verlangt ist.

Lesen Sie diesen Abschnitt gründlich. Er enthält normative Hinweise, die bei der
Bewertung helfen.

---

## 5. Viewer (360°-Panorama)

### 5.1 Navigation

Ziehen mit der Maus ändert die Blickrichtung, das Mausrad die Bildausschnitts-
weite. Ein Diamant-Symbol im Bild markiert einen weiteren Standort; ein Klick
darauf wechselt die Perspektive. Derselbe Mechanismus führt zurück zum
Haupt-Panorama, alternativ die Standort-Leiste am Bildrand.

### 5.2 Defizit suchen und markieren

1. Blick im Panorama orientieren.
2. Stelle anklicken, an der Sie ein Sicherheitsdefizit vermuten.
3. Ein weisser Marker erscheint, dazu der Bestätigen-Button. Fünf Sekunden lang
   lässt sich die Wahl korrigieren.
4. **Bestätigen** löst die Trefferprüfung aus.
5. Bei einem Treffer bleibt ein grüner Hotspot für den Rest der Szene sichtbar.
6. Bei einem Fehlschuss erscheint eine kurze Rückmeldung, und Sie können erneut
   klicken.

Der Zähler oben führt mit, wie viele Defizite gefunden sind und wie viele davon
Pflicht sind.

### 5.3 Hilfsmittel

Der Hinweis arbeitet zweistufig, und beide Stufen kosten Punkte:

| Stufe | Wirkung | Abzug |
|---|---|---|
| 1 – Standort-Hinweis | markiert die Standorte, hinter denen noch ein unentdecktes Defizit liegt | −10 Punkte je gefundenes Defizit |
| 2 – Hotspots | blendet zusätzlich die Marker im Bild ein | −25 Punkte je gefundenes Defizit |

Massgebend ist die Stufe, die beim Fund aktiv war; die Abzüge summieren sich
nicht. Schalten lässt sich nur aufwärts, jeweils nach einer Bestätigung.

Daneben laufen der Zeitzähler in der Navigationsleiste, der als Nebenkriterium
gewertet wird, und im VR-Betrieb der Abbruch-Button, der die Sitzung beendet und
in den Browser zurückführt.

---

## 6. Die 9-Schritte-Bewertung

Nach einem Treffer öffnet sich das Bewertungs-Panel. Sie geben drei Werte ein –
die Schritte 1, 3 und 7 –, die übrigen sechs Schritte rechnet die App.

Vorgelagert ist die Zuordnung zu einer Kategorie. Sie gehört nicht zur normativen
Methodik, sondern ordnet den Befund ein.

### 6.1 Schritt 1 – Wichtigkeit

Gefragt ist, welche Wichtigkeit der Fachkurs dem Kriterium zuweist, getrennt nach
innerorts und ausserorts. Zur Wahl stehen gross, mittel und klein. Es geht ums
Ablesen aus der Tabelle, nicht ums Ermessen.

### 6.2 Schritt 3 – Abweichung

Gefragt ist, wie stark der Ist-Zustand von der Norm abweicht: gross, mittel oder
klein. Grundlage sind VSS-Normen, SN-Standards und Richtlinien.

### 6.3 Schritt 5 – Relevanz SD

Die App verknüpft Wichtigkeit und Abweichung zu gering, mittel oder hoch.

### 6.4 Schritt 7 – NACA

Gefragt ist die Schwere eines möglichen Unfalls an dieser Stelle auf der Skala 0
bis 7. NACA 0 und 1 gelten als leicht, 2 und 3 als mittel, 4 bis 7 als schwer.

### 6.5 Schritt 9 – Unfallrisiko

Aus Relevanz SD und Unfallschwere ergibt sich das Unfallrisiko: gering, mittel
oder hoch.

### 6.6 Punkte pro Defizit

| Beitrag | Punkte |
|---|---|
| Kategorie richtig | 25 |
| Kategorie falsch, Defizit aber gefunden | 15 |
| Schritt 1 – Wichtigkeit richtig | 25 |
| Schritt 3 – Abweichung richtig | 25 |
| Schritt 7 – NACA richtig | 25 |
| **Maximum** | **100** |

Ein Defizit, das als Booster gekennzeichnet ist, gibt zusätzlich einen
prozentualen Bonus. Die Hinweis-Abzüge aus Abschnitt 5.3 kommen davon in Abzug.

### 6.7 Lernkarte

Nach der Eingabe zeigt die Lernkarte Ihr Ergebnis, die normative Soll-Lösung mit
dem NACA-Wert im Klartext, die fachliche Begründung und den Normbezug. Wer die
Herleitung nachvollziehen will, findet beide Matrizen mit dem eigenen und dem
richtigen Schnittpunkt.

Eine kurze Methodik-Referenz lässt sich in jedem Bewertungsschritt aufklappen.
Sie kostet keine Punkte und verrät die Lösung nicht.

---

## 7. Szenen-Abschluss

Sind alle Pflichtdefizite gefunden oder beenden Sie die Szene selbst, erscheint
die Auswertung: gefundene Defizite, Zeit, Sterne und der beste bisherige
Durchgang. Verpasste Defizite werden mit dem Standort aufgeführt, an dem sie zu
sehen gewesen wären.

Eine Szene gilt als bestanden, wenn alle Pflichtdefizite gefunden sind und
mindestens 60 % der Punkte erreicht wurden. Einzelne Szenen können davon
abweichen; der Abschluss nennt das Kriterium und bei einem Misserfolg auch den
Grund.

Die Sterne richten sich allein nach dem Prozentwert: unter 60 % ein Stern, von
60 bis 89 % zwei, ab 90 % drei.

Über **Bericht** erzeugen Sie ein PDF mit der Auswertung und der Befundliste im
RSI-Format. Es führt je Defizit das Kriterium sowie Soll- und Ist-Beurteilung
über die ganze Kette von der Wichtigkeit bis zum Unfallrisiko und weist nicht
gefundene Defizite als solche aus. Durchgänge aus Versionen vor v0.11.0 tragen
den Vermerk, dass die abgegebene Beurteilung nicht gespeichert wurde.

Der Bericht lässt sich auch später abrufen: In der Szenenübersicht trägt jede
Szene, die Sie bereits absolviert haben, neben dem Startknopf ein Symbol mit
Pfeil nach unten. Es erzeugt den Bericht Ihres besten Versuchs. Das Symbol
erscheint erst nach dem ersten Durchgang. Grundlage sind die auf diesem Gerät
gespeicherten Ergebnisse — auf einem anderen Gerät, in einem anderen Browser
oder nach einem Zurücksetzen der App ist der nachträgliche Bericht nicht mehr
verfügbar. Wer ihn sicher braucht, erzeugt ihn direkt nach der Szene.

---

## 8. Rangliste

Die Gesamtrangliste führt alle Teilnehmenden pseudonymisiert mit der Summe ihrer
besten Ergebnisse; sichtbar sind die ersten 100. Daneben gibt es die Rangliste je
Thema, die zeigt, wo Sie stark und wo Sie schwach sind, und – bei Anmeldung mit
Zugangscode – die Rangliste des eigenen Kurses. Der persönliche Fortschritt
listet Sterne je Thema, absolvierte Szenen und den Gesamtscore. Alle Ranglisten
weisen zusätzlich aus, wie viele Szenen bestanden sind.

---

## 9. VR-Betrieb auf der Meta Quest 3

Die App startet im Browser der Quest 3 als gewöhnliche Seite; der VR-Button
öffnet die immersive Sitzung. Gezielt wird mit dem Controller-Strahl, ausgelöst
mit dem Trigger; ein Treffer wird haptisch quittiert.

Der Ablauf entspricht dem Browser: Kategorie wählen, die drei Bewertungsschritte,
danach die Auswertung mit Ergebnis, Herleitung und Lernkarte. Auch der Hinweis
verlangt in VR dieselbe Bestätigung.

Die Panels lassen sich verschieben. Über der Oberkante sitzt eine Griffleiste:
Trigger darauf halten, Panel mit dem Strahl an die gewünschte Stelle führen,
loslassen. Die Position bleibt über Szenen und Sitzungen hinweg erhalten. Ein
Doppelklick auf die Griffleiste stellt die Ausgangslage wieder her.

Verschieben lassen sich das Fortschritts-Panel, die Kontrollleiste, das
Kategorie-Panel, die Bewertungs-Panels, die Auswertung und der
Alle-gefunden-Hinweis. Die kurze Klick-Rückmeldung bleibt bewusst fest.

Der Abbruch-Button beendet die Sitzung geordnet. Nimmt jemand das Headset
zwischendurch ab, läuft die Szene weiter.

---

## 10. Einstellungen

Die Sprache wechseln Sie oben rechts in der Navigationsleiste zwischen Deutsch,
Französisch, Italienisch und Englisch. Über das Avatar-Menü stellen Sie das helle
oder dunkle Erscheinungsbild ein und melden sich ab. Der Punkt «App zurücksetzen»
löscht alle lokalen Daten samt Service Worker und Cache; er ist für Störungen
gedacht, nicht für den Alltag.

---

## 11. Häufige Fragen

**Meine Punkte fehlen in der Rangliste.**
Netzverbindung prüfen. Ohne Verbindung zu Supabase bleiben die Punkte zunächst
lokal und werden später übertragen.

**Der Viewer bleibt weiss.**
App zurücksetzen über das Avatar-Menü, danach neu laden.

**Ich finde kein einziges Defizit.**
Erst die Stufe 1 des Hinweises versuchen; sie kostet weniger und zeigt nur die
Richtung. Die Lernkarte hilft anschliessend beim Verstehen.

**Kann ich eine Szene mehrfach spielen?**
Ja. Gewertet wird der beste Durchgang.

**Zählt der Hinweis doppelt, wenn ich beide Stufen nutze?**
Nein. Für jedes Defizit gilt der Abzug jener Stufe, die beim Fund aktiv war.

**Wie lange bleiben meine Daten gespeichert?**
Lokal bis zum Zurücksetzen der App oder bis der Browser-Cache geleert wird. In
Supabase dauerhaft und pseudonymisiert. Ein Löschgesuch richten Sie per E-Mail
an die im Impressum genannte Adresse.

**Warum sehe ich weniger Themen als jemand anderes?**
Themen können einem Kurs vorbehalten sein. Wer ohne Kurscode übt, sieht nur die
frei zugänglichen.

---

## 12. Barrierefreiheit

Die App ist auf WCAG 2.1 AA ausgerichtet.

Alle Funktionen von der Anmeldung bis zur Bewertung sind mit der Tastatur
erreichbar, ein deutlicher Fokus-Ring markiert das aktive Element. In Dialogen
bleibt der Fokus gefangen und kehrt beim Schliessen zum auslösenden Element
zurück; ESC schliesst jeden Dialog. Bedienelemente messen mindestens 44 × 44
Pixel. Die vier Sprachen sind vollständig gepflegt. Die Kontraste erfüllen 4,5 : 1
für Fliesstext und 3 : 1 für grössere Elemente. Buttons ohne Beschriftung tragen
ein `aria-label`, Umschalter ein `aria-pressed`, Menüs `aria-expanded` und
`aria-haspopup`. Helles und dunkles Erscheinungsbild decken unterschiedliche
Lichtverhältnisse ab.

Barrieren melden Sie bitte an die unten genannte Adresse.

---

## 13. Support

Stevan Skeledzic
info@skeledzic.ch

*Der ausführliche Schulungsleitfaden folgt im Kursskript zum FK RSI.*
