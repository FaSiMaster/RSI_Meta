# Datensicherung – RSI VR Tool

> Was liegt wo, und was ist zu tun, wenn etwas verloren geht. Stand v0.16.3.

---

## 1. Bestände

| Datenart | Ort | Kritisch |
|---|---|---|
| Quellcode | GitHub `FaSiMaster/RSI_Meta`, Branch `main` mit Tags | mittel, reproduzierbar |
| **Panoramen im Produktivbetrieb** | Supabase-Bucket `rsi-textures`, EU | **hoch**, keine automatische Sicherung ausserhalb von Supabase |
| Demo- und Rückfallbilder | Repository unter `public/textures/` | niedrig, seit v0.5.0 nicht mehr die führende Quelle |
| HDRI-Ausgangsdateien | lokal unter `_Archiv/Bilder_Seite/` | **hoch**, keine Kopie ausserhalb des Arbeitsgeräts |
| Themen, Szenen, Defizite | Supabase-Tabellen, EU | **hoch** |
| Kurse samt Passwort-Hashes | Supabase `rsi_kurse`, EU | **hoch** |
| Ergebnisse der Ranglisten | Supabase `rsi_results`, EU | mittel, wiederholbar |
| Lokale Daten der Teilnehmenden | localStorage im Browser | niedrig, gerätegebunden |
| **Zuständigkeit je Land** | localStorage `rsi-v3-zustaendigkeiten` | **hoch**, ohne Auszug gerätegebunden und nirgends sonst vorhanden |
| Admin-Token | sessionStorage, zwei Stunden gültig | niedrig, jederzeit neu erzeugbar |
| Umgebungsvariablen des Clients | Vercel | **hoch** |
| Secrets der Edge Functions | Supabase | **hoch** |

Seit v0.5.0 liegen die Panoramen produktiv im Bucket. Geht dort etwas verloren
und existiert keine Kopie, sind die Bilder weg.

---

## 2. Vorhandene Mechanismen

### 2.1 Git

Jeder Commit auf `main` landet auf GitHub, jede Version trägt ein Tag als
Rückkehrpunkt, und Vercel baut bei jedem Push neu. Die CI prüft auf Pull Requests
und auf `main` mit `npm ci`, `tsc --noEmit` und `vite build`.

### 2.2 Datenbank

Im kostenlosen Tarif erstellt Supabase tägliche Momentaufnahmen mit sieben Tagen
Aufbewahrung; zurückspielen lässt sich eine solche nur über ein Support-Ticket,
da die Selbstbedienung dem kostenpflichtigen Tarif vorbehalten ist. Eine
Wiederherstellung auf einen beliebigen Zeitpunkt gibt es im kostenlosen Tarif
nicht.

Manuelle Auszüge entstehen über das Dashboard unter Database → Backups oder mit
`pg_dump`. Ein solcher Auszug enthält Personendaten in pseudonymisierter Form und
gehört nicht unverschlüsselt abgelegt.

Den aktuellen Stand zeigt das Dashboard unter Project Settings → Database →
Backups.

### 2.3 Storage

**Für den Bucket gibt es im kostenlosen Tarif keine automatische Sicherung.** Die
Datenbanksicherung schliesst ihn nicht ein.

Zu sichern ist er von Hand über das Dashboard oder die CLI, indem der Ordner
`panoramas/` auf ein Netzlaufwerk geladen wird – wöchentlich oder vor jedem Kurs.

### 2.4 Export aus der Anwendung

Der Administrationsbereich erzeugt unter Export und Import einen JSON-Auszug mit
Themen, Szenen, Defiziten, Kursen, den Zuständigkeiten je Land und einem Stand
der Rangliste, gekennzeichnet mit `rsi-v3`. Er wird von Hand ausgelöst und
enthält **keine Bilddaten**, nur deren Pfade. Der Bucket ist daher getrennt zu
sichern.

Für die Zuständigkeiten ist dieser Auszug die einzige Sicherung überhaupt: Sie
liegen im localStorage und werden nicht nach Supabase abgeglichen. Wer sie
einträgt und keinen Auszug erzeugt, verliert sie beim nächsten Gerätewechsel
oder beim Zurücksetzen der Anwendung.

---

## 3. Empfohlene Routine

### 3.1 Wöchentlich

JSON-Auszug erzeugen, als `rsi-backup-JJJJ-MM-TT.json` unter
`_Archiv/Export/` ablegen, den Ordner `panoramas/` aus dem Bucket laden und
beides auf das Netzlaufwerk spiegeln.

### 3.2 Vor jedem Kurs

Auszug als Momentaufnahme erzeugen. Ein bis zwei Panoramen stichprobenweise
prüfen, indem die Adresse in einer frischen Browsersitzung geöffnet wird. Prüfen,
ob `ADMIN_PIN`, `ADMIN_TOKEN_SECRET`, `KURS_PASSWORT_PEPPER` sowie die
Client-Variablen `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` und
`VITE_USERNAME_SALT` im Passwortsafe hinterlegt sind.

### 3.3 Vor grösseren Änderungen

Auf einem eigenen Branch arbeiten statt auf `main`, ein Tag als Rückkehrpunkt
setzen, einen JSON-Auszug erzeugen und bei Eingriffen in den Bucket vorher dessen
Inhalt sichern.

---

## 4. Wiederherstellung

### 4.1 Quellcode

Vom GitHub-Remote klonen; Vercel baut über die Git-Anbindung von selbst neu.

### 4.2 Einzelne Datensätze

Über den Support ein Zurückspielen der Momentaufnahme anfordern oder den letzten
JSON-Auszug im Administrationsbereich importieren.

Beim Import gilt eine Regel: Szenen, deren Land nicht zum Themenbereich passt,
werden abgewiesen und im Feedback gezählt. Bleiben nach einem Import Szenen aus,
prüfen Sie zuerst das Land der zugehörigen Oberthemen.

### 4.3 Gesamtes Supabase-Projekt

1. Neues Projekt in der Region EU anlegen.
2. Tabellen und RLS-Regeln setzen; die Vorgaben stehen in `REVIEW_SECURITY.md`.
3. Migrationen aus `supabase/migrations/` einspielen, damit `rsi_kurse`, der
   Pfeffer für Kurspasswörter und die Spalte `detail` in `rsi_results` vorhanden
   sind.
4. Bucket `rsi-textures` anlegen und die Leseregel setzen.
5. Edge Functions `admin-auth`, `admin-write` und `kurs-auth` deployen.
6. Secrets `ADMIN_PIN`, `ADMIN_TOKEN_SECRET` und `KURS_PASSWORT_PEPPER` setzen.
   Weicht der Pfeffer vom früheren Wert ab, lassen sich bestehende
   Kurspasswörter nicht mehr prüfen und sind neu zu vergeben.
7. Neue Schlüssel in Vercel eintragen. `VITE_USERNAME_SALT` bleibt unverändert,
   sonst werden die Pseudonyme der bestehenden Ranglisten unbrauchbar.
8. Letzten JSON-Auszug importieren.
9. Panoramen aus der lokalen Sicherung in den Bucket laden.

Ohne Sicherung geht die Ranglisten-Historie verloren.

### 4.4 Verlorener Bucket

Bucket neu anlegen, Regeln setzen und die gesicherten Ordner
`panoramas/{szeneId}/` hochladen. Solange Name und Pfadstruktur gleich bleiben,
zeigen die Einträge in `rsi_scenes` weiterhin richtig; die Datenbank ist nicht
anzupassen.

### 4.5 Verlorenes Vercel-Deployment

Aus der Git-Historie neu ausrollen und die Umgebungsvariablen von Hand wieder
eintragen. `VITE_ADMIN_PIN` wird seit v0.6.0 nicht mehr gebraucht.

### 4.6 Verlorene HDRI-Ausgangsdateien

Eine Kopie ausserhalb des Arbeitsgeräts gibt es nicht; das ist ein offenes
Risiko. Abhilfe schafft eine Spiegelung auf ein Netzlaufwerk oder das Ablegen der
Ausgangsdateien in einem nicht öffentlichen Unterordner des Buckets.

---

## 5. Offene Risiken

| Risiko | Einschätzung | Massnahme |
|---|---|---|
| HDRI-Ausgangsdateien nur lokal | mittel | auf Netzlaufwerk spiegeln, offen |
| Kostenloser Tarif ohne Selbstbedienungs-Wiederherstellung | hoch, Tarif ist gesetzt | wöchentliche Auszüge oder Tarifwechsel prüfen |
| **Bucket ohne automatische Sicherung** | **hoch** | wöchentlicher Download, offen |
| Umgebungsvariablen nirgends ausserhalb von Vercel dokumentiert | mittel | Eintrag im Passwortsafe, offen |
| **`ADMIN_TOKEN_SECRET` und `KURS_PASSWORT_PEPPER` nicht separat gesichert** | **hoch** | Eintrag im Passwortsafe, zwingend |

---

## 6. Übung zur Wiederherstellung

Empfohlen vor dem breiten Einsatz: ein Testprojekt anlegen, Bucket, Regeln und
alle drei Edge Functions einrichten, den aktuellen Auszug importieren, die
gesicherten Bilder hochladen und über einen Vorschau-Deploy mit Testschlüsseln
prüfen, ob Anmeldung, Szenenstart, Bildanzeige, Administrationszugang, Bewertung
und Ranglisteneintrag funktionieren. Das Ergebnis gehört protokolliert.

Letzte Übung: noch nicht durchgeführt.

---

## 7. Umgang mit Geheimnissen

| Geheimnis | Ort | Wechsel |
|---|---|---|
| `ADMIN_PIN` | Supabase-Secret | vor jedem Kurs; danach `admin-auth` neu deployen |
| `ADMIN_TOKEN_SECRET` | Supabase-Secret | einmalig; ein Wechsel entwertet alle offenen Sitzungen |
| `KURS_PASSWORT_PEPPER` | Supabase-Secret | **nicht wechseln**, sonst sind bestehende Kurspasswörter nicht mehr prüfbar |
| `VITE_USERNAME_SALT` | Vercel | **nicht wechseln**, sonst werden bestehende Pseudonyme unbrauchbar |
| `VITE_SUPABASE_ANON_KEY` | Vercel | nur bei Abfluss, zusammen mit einem neuen Projekt |
| `VITE_SENTRY_DSN` | Vercel, optional | bei Wechsel des Sentry-Projekts |

Die Werte selbst gehören in den Passwortsafe der Fachstelle und nicht in dieses
Repository.

Nach einem Wechsel der PIN ist `admin-auth` neu zu deployen; bereits ausgegebene
Tokens bleiben bis zu zwei Stunden gültig.
