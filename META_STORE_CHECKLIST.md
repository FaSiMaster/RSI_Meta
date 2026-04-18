# Meta Horizon Store — Einreichungs-Checkliste

> Vorbereitung für Phase 6. Stand v0.3.1 — noch keine Einreichung erfolgt.

---

## 1. Technische Voraussetzungen

### 1.1 PWA Basis (vorhanden ✓)
- [x] PWA-Manifest (`manifest.webmanifest`)
- [x] Service Worker (vite-plugin-pwa)
- [x] Icons 192×192 und 512×512 in `/public/icons/`
- [x] HTTPS (via Vercel automatisch)
- [x] Offline-Grundfähigkeit

### 1.2 Bubblewrap (offen)
- [ ] [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap) installieren
- [ ] `bubblewrap init --manifest=https://rsi-meta.vercel.app/manifest.webmanifest`
- [ ] Android-APK/AAB generieren
- [ ] Signieren mit Java Keystore
- [ ] Test auf echtem Quest 3

### 1.3 Meta Quest-spezifisch
- [ ] WebXR `immersive-vr` Session funktionsfähig ← aktuell **Phase 3 ausstehend**
- [ ] Controller-Tracking getestet
- [ ] Performance: stabile 72 FPS auf Quest 3 (GPU-Profiling)
- [ ] Keine externen CDN-Downloads (GLTF/Textures) zur Laufzeit
- [ ] Service Worker mit `skipWaiting` (vorhanden)

---

## 2. Store-Metadaten

### 2.1 Identität
- [ ] **App-Name:** RSI Immersive (zu bestätigen)
- [ ] **Kurzbeschreibung (max. 80 Z.):** "Immersive Schulung für Strassensicherheit — Road Safety Inspection in VR."
- [ ] **Lange Beschreibung (max. 4000 Z.):** vollständiger Text über Zweck, Zielgruppe, Fachkurs-Basis
- [ ] **Kategorie:** Education / Productivity / Training
- [ ] **Entwicklername:** Kanton Zürich / Tiefbauamt
- [ ] **Website-URL:** https://rsi-meta.vercel.app
- [ ] **Support-URL:** Link zu Impressum/Kontakt

### 2.2 Lokalisierung
- [ ] Store-Listing in Deutsch (Primär)
- [ ] Französisch, Italienisch, Englisch (app-intern bereits vorhanden, für Store-Einreichung zusätzlich)

### 2.3 Visual Assets
- [ ] **App-Icon:** 1024×1024 PNG (KZH-blau mit Shield-Symbol)
- [ ] **Store-Banner:** Meta-Spezifikationen beachten (vermutlich 1920×1080)
- [ ] **Screenshots:** 5–10 Stück
  - [ ] Landing Page
  - [ ] Themen-Dashboard
  - [ ] 360°-Viewer mit Panorama
  - [ ] 9-Schritt-Bewertung
  - [ ] Ranking
  - [ ] Lernkarte
- [ ] **Video-Teaser:** 30–60 s, Format nach Meta-Spezifikation

---

## 3. Rechtliche Anforderungen

### 3.1 Pflicht-Dokumente
- [x] Impressum (`/impressum.html`)
- [x] Datenschutzerklärung (`/datenschutz.html`)
- [ ] **Terms of Service / AGB** — noch zu erstellen
- [ ] **Einwilligungs-Flow** falls erweiterte Daten gesammelt werden (aktuell nicht nötig)

### 3.2 Altersfreigabe
- [ ] IARC-Fragebogen (International Age Rating Coalition) beantworten
- [ ] Erwartet: **PEGI 3 / ESRB Everyone / USK 0** — rein didaktisches Fach-Tool, keine Gewalt, keine In-App-Käufe
- [ ] Keine Gamification-Elemente die Suchtpotenzial haben

### 3.3 Datenschutz-Meta
- [ ] "App erhebt Daten?" — **Ja** (Pseudonym-Hash, Score, Kurs)
- [ ] Data Safety Declaration in Meta-Console: welche Kategorien, Zweck, Dritt-Weitergabe

### 3.4 Marken / Urheberrecht
- [ ] Verwendung des KZH-Wappens: Genehmigung einholen (Staatskanzlei ZH)
- [ ] "Road Safety Inspection" ist generischer Fachbegriff, kein Markenschutz
- [ ] FaSi / TBA-Branding: intern abgestimmt

---

## 4. Content-Review

- [ ] Alle 360°-Aufnahmen sind KZH-eigen oder Lizenz vorhanden
- [ ] Keine Kennzeichen / Personen erkennbar (DSGVO vor Ort-Einsatz)
- [ ] Seed-Daten (Zugangscode `FaSi4safety`) entfernen oder anonymisieren (siehe REVIEW_SECURITY.md N-3)

---

## 5. Meta-Specific Policies

- [ ] [Meta Quest Store Content Policies](https://developer.oculus.com/policy/) gelesen
- [ ] App verstösst nicht gegen: Hassrede, Cybersecurity, Irreführung, Malware
- [ ] Keine Tracking-Pixel / fingerprinting (bestätigt)
- [ ] User kann Daten löschen (App-Reset-Funktion vorhanden ✓)

---

## 6. Test-Distribution vor Store

### 6.1 App Lab (interner Test)
- [ ] Meta Developer Account
- [ ] Organisation in Developer Dashboard einrichten
- [ ] APK via Meta Developer Hub hochladen
- [ ] Testgruppe (Kursleitung + ausgewählte Teilnehmer) einladen
- [ ] Feedback-Runde durchführen

### 6.2 Release Candidate
- [ ] Smoke-Tests auf 3+ physischen Quest-3-Geräten
- [ ] Performance-Test mit 10+ parallel angemeldeten Usern
- [ ] Offline-Funktionalität (siehe OFFLINE.md Tests)

---

## 7. Post-Launch

### 7.1 Monitoring
- [ ] Fehler-Monitoring aktiv (Sentry oder Vercel) — siehe Task 14
- [ ] Crash-Reports vom Quest Browser einsehbar
- [ ] Ranking-Daten-Backup-Rhythmus (siehe BACKUP.md)

### 7.2 Update-Strategie
- [ ] Patch-Releases via Service Worker (sofort wirksam)
- [ ] Major-Releases: neue Bubblewrap-Build + Store-Einreichung
- [ ] Release-Notes in deutscher Sprache für Meta-Store-Listing

### 7.3 Support
- [ ] E-Mail-Adresse: sicherheit.tba@bd.zh.ch (aktuell)
- [ ] FAQ-Link im Store-Listing
- [ ] Bug-Report-Kanal definiert (siehe Task 15)

---

## 8. Offene Entscheidungen

| Punkt | Verantwortlich | Deadline |
|---|---|---|
| App-Name "RSI Immersive" vs. "RSI VR Tool" | FaSi / KZH-Kommunikation | vor Einreichung |
| KZH-Wappen-Nutzung | Staatskanzlei | vor Einreichung |
| Store-Sprache (nur DE oder alle 4) | FaSi | vor Einreichung |
| Altersfreigabe-Ziel | FaSi | bei IARC-Fragebogen |
| App Lab vs. direkt Meta Store | Tiefbauamt-Leitung | vor Bubblewrap |

---

## 9. Zeitlicher Ablauf (grobe Schätzung)

| Phase | Aufwand | Voraussetzung |
|---|---|---|
| WebXR-Integration (Phase 3) | 4–8 Wochen | aktuell offen |
| Eigene VR-Szenen + Controller | 4–6 Wochen | 360°-Kamera-Aufnahmen |
| Bubblewrap + Meta Developer Setup | 1 Woche | Phase 3 abgeschlossen |
| App Lab Distribution | 2 Wochen | APK signiert, Testgruppe |
| Meta Store Review | 1–3 Wochen | Meta-Review-Zyklus |
| Launch | — | nach Approval |

**Frühest-Termin Store-Launch:** Q3/Q4 2026, realistisch Q4 2026/Q1 2027.
