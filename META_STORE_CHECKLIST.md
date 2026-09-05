# Meta Horizon Store – Checkliste für die Einreichung

> Vorbereitung der Roadmap-Phase 6. Stand v0.11.0, noch keine Einreichung
> erfolgt.

---

## 1. Technische Voraussetzungen

### 1.1 Grundlagen der PWA

- [x] Manifest `manifest.webmanifest`
- [x] Service Worker über `vite-plugin-pwa`
- [x] Icons in 192 × 192 und 512 × 512 unter `public/icons/`
- [x] HTTPS über Vercel
- [x] Grundfähigkeit ohne Netz

### 1.2 Bubblewrap

- [ ] [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
      einrichten
- [ ] `bubblewrap init --manifest=https://rsi-meta.vercel.app/manifest.webmanifest`
- [ ] Paket für Android erzeugen
- [ ] Mit Java-Keystore signieren
- [ ] Auf einer Quest 3 prüfen

### 1.3 Anforderungen der Quest

- [x] Immersive Sitzung lauffähig, umgesetzt in den Versionen v0.8.0 bis v0.9.1
- [x] Controller-Tracking geprüft, protokolliert in `docs/VR_SMOKE_REPORT.md`
- [x] Keine Downloads von fremden Servern zur Laufzeit; der XR-Store wird mit
      `model: false` initialisiert
- [x] Service Worker mit `skipWaiting`
- [ ] Bildrate von 72 Hz auf der Quest 3 messen und belegen

---

## 2. Angaben für den Store

### 2.1 Identität

- [ ] Name: RSI VR Tool, seit v0.6.0 als Wortmarke im Einsatz, noch zu bestätigen
- [ ] Kurzbeschreibung bis 80 Zeichen: «Immersive Schulung für
      Strassenverkehrssicherheit – Road Safety Inspection in VR.»
- [ ] Ausführliche Beschreibung bis 4000 Zeichen zu Zweck, Zielgruppe und
      Kursgrundlage
- [ ] Kategorie: Bildung oder Training
- [ ] Anbieter: Stevan Skeledzic (privat)
- [ ] Adresse der Anwendung und Adresse für Unterstützung

### 2.2 Sprachen

- [ ] Eintrag auf Deutsch als Hauptsprache
- [ ] Französisch, Italienisch und Englisch; in der Anwendung sind alle vier
      Sprachen vollständig gepflegt

### 2.3 Bildmaterial

- [ ] Symbol in 1024 × 1024
- [ ] Banner nach den Vorgaben von Meta
- [ ] Fünf bis zehn Bildschirmfotos: Startseite, Themenübersicht, Panorama,
      Bewertung, Rangliste, Lernkarte, PDF-Bericht
- [ ] Kurzvideo von 30 bis 60 Sekunden

---

## 3. Rechtliches

### 3.1 Pflichtdokumente

- [x] Impressum unter `/impressum.html`
- [x] Datenschutzerklärung unter `/datenschutz.html`
- [ ] Nutzungsbedingungen, noch zu erstellen

### 3.2 Altersfreigabe

- [ ] Fragebogen der IARC ausfüllen
- [ ] Erwartet wird die niedrigste Stufe: fachliches Lernwerkzeug, keine
      Gewaltdarstellung, keine Käufe in der Anwendung

### 3.3 Angaben zum Datenschutz

- [ ] Erhebung bejahen: Pseudonym als Hash, Punktestand, Kurszugehörigkeit
- [ ] Erklärung zur Datensicherheit in der Konsole von Meta ausfüllen, mit
      Kategorien, Zweck und der Feststellung, dass keine Weitergabe an Dritte
      erfolgt

### 3.4 Kennzeichen und Urheberrecht

- [ ] Verwendung des Kantonswappens durch die Staatskanzlei genehmigen lassen
- [ ] Road Safety Inspection ist ein Fachbegriff ohne Markenschutz

---

## 4. Inhaltliche Prüfung

- [ ] Alle Aufnahmen stammen vom Kanton oder sind lizenziert
- [ ] Keine Kennzeichen und keine erkennbaren Personen im Bildmaterial
- [ ] Startdaten bereinigen; der voreingestellte Zugangscode ist vor der
      Veröffentlichung zu entfernen oder zu ersetzen, siehe `REVIEW_SECURITY.md`

---

## 5. Vorgaben von Meta

- [ ] Inhaltsrichtlinien des Quest Store gelesen
- [ ] Keine Verstösse gegen die Vorgaben zu Hassrede, Sicherheit, Irreführung
      und Schadsoftware
- [x] Kein Tracking und kein Fingerprinting
- [x] Daten lassen sich löschen, die Anwendung bringt dafür eine Funktion mit

---

## 6. Verteilung vor der Veröffentlichung

### 6.1 Interner Test

- [ ] Entwicklerkonto und Organisation einrichten
- [ ] Paket hochladen
- [ ] Kursleitung und ausgewählte Teilnehmende einladen
- [ ] Rückmeldungen auswerten

### 6.2 Freigabekandidat

- [ ] Prüfläufe auf mindestens drei Geräten
- [ ] Belastungstest mit mindestens zehn gleichzeitig angemeldeten Personen
- [ ] Verhalten ohne Netz nach `OFFLINE.md` prüfen

---

## 7. Nach der Veröffentlichung

Das Fehler-Monitoring ist über Sentry vorbereitet und wird mit dem Setzen von
`VITE_SENTRY_DSN` aktiv. Absturzberichte aus dem Browser der Quest sind
einzusehen, und für die Sicherung der Ranglistendaten gilt `BACKUP.md`.

Kleinere Aktualisierungen erreichen die Geräte über den Service Worker und
wirken sofort. Grössere Sprünge verlangen ein neues Paket und eine erneute
Einreichung. Die Versionshinweise für den Eintrag entstehen auf Deutsch.

Für Rückfragen dient die Adresse im Impressum; ein Verweis auf die häufigen
Fragen gehört in den Eintrag.

---

## 8. Offene Entscheidungen

| Punkt | Zuständig | Termin |
|---|---|---|
| Name «RSI VR Tool» bestätigen | Herausgeber | vor der Einreichung |
| Nutzung des Kantonswappens | Staatskanzlei | vor der Einreichung |
| Sprachen des Eintrags | Herausgeber | vor der Einreichung |
| Angestrebte Altersfreigabe | Herausgeber | beim Ausfüllen des Fragebogens |
| Interner Test oder direkte Einreichung | Amtsleitung | vor Bubblewrap |

---

## 9. Zeitlicher Rahmen

| Schritt | Aufwand | Voraussetzung |
|---|---|---|
| Immersive Sitzung | erledigt mit v0.8.0 bis v0.9.1 | – |
| Eigene Aufnahmen für weitere Szenen | 4 bis 6 Wochen | 360°-Kamera im Feld |
| Bubblewrap und Entwicklerkonto | 1 Woche | – |
| Interne Verteilung | 2 Wochen | signiertes Paket, Testgruppe |
| Prüfung durch Meta | 1 bis 3 Wochen | Einreichung |

Die verbleibenden Schritte hängen an den eigenen Aufnahmen und an den offenen
Entscheidungen aus Abschnitt 8. Ein Termin für die Veröffentlichung lässt sich
daraus noch nicht ableiten.
