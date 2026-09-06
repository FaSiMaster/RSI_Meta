# Admin-Handbuch – RSI VR Tool

> Für die Kursleitung. Stand v0.18.0.
> Voraussetzung: Admin-PIN als Supabase-Secret gesetzt, Edge Functions
> `admin-auth`, `admin-write` und `kurs-auth` deployt.

---

## 1. Zugang

1. Auf der Startseite oben rechts den **Admin**-Button mit dem Schloss-Symbol
   wählen.
2. PIN eingeben.
3. Der Client schickt die PIN an die Edge Function `admin-auth`. Stimmt sie,
   erhält er ein HMAC-signiertes Token mit zwei Stunden Gültigkeit, das in
   `sessionStorage['rsi-admin-token']` liegt.
4. Die Anmeldung gilt nur für die laufende Browser-Sitzung. Nach Ablauf des
   Tokens meldet der nächste 401 den Client automatisch ab.

Die PIN steckt seit v0.6.0 nicht mehr im Client-Bundle, sondern ausschliesslich
im Secret `ADMIN_PIN` der Edge Function. Der Client kennt sie nur für die Dauer
des HTTPS-Requests und verwirft sie nach dem Tausch gegen das Token.

**Der PIN-Wert gehört nicht in dieses Repository.** Er wird im Passwortsafe der
Kursleitung geführt und im Supabase-Dashboard gesetzt.

### 1.1 Token-Fluss

```
PIN-Eingabe
       ↓
Client → POST /functions/v1/admin-auth { pin }
       ↓
Edge Function prüft die PIN gegen das Secret ADMIN_PIN (timing-safe)
       ↓
Token: <expires>.<base64-hmac>
   - expires = jetzt + 2 h (Epoch-ms)
   - hmac    = HMAC-SHA256(ADMIN_TOKEN_SECRET, expires)
       ↓
Client legt das Token in sessionStorage['rsi-admin-token'] ab
       ↓
Alle Schreibzugriffe (supabaseSync.ts) senden den Header x-admin-token
       ↓
admin-write verifiziert das Token timing-safe und prüft expires > jetzt
       ↓
Bei 401: Token und Auth-Flag werden geräumt, die PIN ist neu einzugeben
```

### 1.2 Umgebungsvariablen

Für den Produktivbetrieb sind die folgenden Variablen nötig, getrennt nach
Client und Server.

#### Client (Vercel und lokale `.env.local`)

| Variable | Zweck | Pflicht |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase-Endpunkt für die Synchronisation | ja |
| `VITE_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key; geschützt wird über RLS | ja |
| `VITE_USERNAME_SALT` | Salt für das Hashing der Benutzernamen. Verhindert, dass sich aus einem Datenbank-Auszug per Rainbow-Table Klarnamen gewinnen lassen. **Einmalig pro Deployment setzen und nicht rotieren**, sonst werden die Hashes bestehender Ranglisten unbrauchbar. | ja, sonst Warnung in der Konsole |
| `VITE_SENTRY_DSN` | DSN für das Fehler-Monitoring | nein; leer bedeutet Sentry aus, im Pilot leer |

Seit v0.6.0 liest die App `VITE_ADMIN_PIN` nicht mehr. Steht die Variable noch in
Vercel, kann sie ersatzlos weg.

#### Server (Supabase Edge Function Secrets)

| Variable | Zweck | Pflicht |
|---|---|---|
| `ADMIN_PIN` | PIN für den Administrationsbereich | ja |
| `ADMIN_TOKEN_SECRET` | 32 Byte hexadezimal für die HMAC-Signatur der Admin-Tokens. **Einmalig setzen, nicht rotieren**, sonst werden alle aktiven Sitzungen ungültig. | ja |
| `KURS_PASSWORT_PEPPER` | Serverseitiger Pfeffer für die Kurspasswörter, verwendet von `kurs-auth`. **Einmalig setzen, nicht rotieren**, sonst lassen sich bestehende Kurspasswörter nicht mehr prüfen. | ja, sobald Kurse mit Passwort im Einsatz sind |

Gesetzt werden sie im Dashboard unter Project → Edge Functions → Secrets oder
über die CLI:

```bash
supabase secrets set ADMIN_PIN=<wert aus dem Passwortsafe>
supabase secrets set ADMIN_TOKEN_SECRET=$(openssl rand -hex 32)
supabase secrets set KURS_PASSWORT_PEPPER=$(openssl rand -hex 32)
```

Das Salt für den Client entsteht einmalig beim Aufbau des Deployments:

```bash
openssl rand -hex 16
```

Der Wert gehört in Vercel unter Settings → Environment Variables als
`VITE_USERNAME_SALT` und muss dort dauerhaft bleiben. Eine Sicherung gehört in
den Passwortsafe, nicht ins Repository.

---

## 2. Edge Functions

### 2.1 Überblick

Drei Deno-Funktionen bilden die Serverseite:

| Function | Zweck | Aufgerufen von |
|---|---|---|
| `admin-auth` | Tauscht die PIN gegen ein HMAC-Token mit zwei Stunden Gültigkeit | Admin-Anmeldung auf der Startseite |
| `admin-write` | Nimmt Schreib- und Löschvorgänge auf `rsi_topics`, `rsi_scenes`, `rsi_deficits`, `rsi_kurse` und `rsi_results` entgegen, prüft Token und Nutzlast und schreibt mit dem `service_role`-Key | Administrationsbereich über `supabaseSync.ts` |
| `kurs-auth` | Prüft das Kurspasswort serverseitig gegen den gepfefferten Hash | Kursauswahl auf der Startseite |

Quellen liegen unter `supabase/functions/<name>/index.ts`, je mit eigener
README.

### 2.2 Schutzmechanismen in `admin-write`

Das Token wird timing-safe verglichen, mit Auffüllung auf 128 Zeichen, damit die
Länge nichts verrät. Statt eines offenen CORS steht eine Whitelist mit der
Vercel-Produktionsadresse und `localhost:5173/5174`. Jede Nutzlast durchläuft
eine Schema-Prüfung je Tabelle mit erlaubten Feldern und Typprüfung, begrenzt auf
256 KB je Zeile und 200 Zeilen je Anfrage. Weil die Funktion mit `service_role`
schreibt und damit RLS umgeht, ist diese Prüfung zwingend.

Für `rsi_results` gilt eine Sonderregel: Die Tabelle ist dort **nur zum Löschen**
freigegeben, mit genau einem Filter je Aufruf – Eintrag, Benutzer, Kurs oder
alles. Upserts sind ausgeschlossen.

### 2.3 Deployment über das Dashboard

1. Supabase-Dashboard → Project → Edge Functions → **Deploy a new function**.
2. Namen setzen: `admin-auth`, `admin-write` oder `kurs-auth`.
3. **Wichtig:** «Enforce JWT verification» deaktivieren. Die Funktionen bringen
   ihre eigene PIN- und Token-Logik mit und nutzen kein Supabase-Auth-JWT.
4. Quelltext aus `supabase/functions/<name>/index.ts` einfügen und deployen.
5. Die Secrets aus Abschnitt 1.2 müssen gesetzt sein.
6. Prüfen mit einem POST auf `/functions/v1/admin-auth` und der PIN als
   Nutzlast; die Antwort muss ein Token enthalten.

### 2.4 Deployment über die CLI

```bash
# einmalig: supabase login && supabase link --project-ref <ref>
supabase functions deploy admin-auth --no-verify-jwt
supabase functions deploy admin-write --no-verify-jwt
supabase functions deploy kurs-auth  --no-verify-jwt
```

Wird an einer Funktion etwas geändert, muss genau diese Funktion neu deployt
werden. Solange das aussteht, laufen die betroffenen Aktionen in einen Fehler.

### 2.5 PIN wechseln

1. Neue PIN wählen, keine triviale Folge wie `0000` oder `1234`.
2. Dashboard → Edge Functions → Secrets → `ADMIN_PIN` ändern.
3. Funktion `admin-auth` neu deployen.
4. Ausgegebene Tokens bleiben bis zu zwei Stunden gültig. Das ist vertretbar, da
   sie nur Schreibrechte tragen.
5. Kein Vercel-Redeploy nötig, die PIN liegt nicht im Bundle.
6. Alte PIN im Passwortsafe archivieren.

### 2.6 Fehlerbilder

**401 bei der Anmeldung trotz richtiger PIN.** Meist ein Tippfehler, ein nicht
gesetztes Secret oder eine nicht neu deployte Funktion. Die Logs von
`admin-auth` geben Auskunft.

**401 kurz nach der Anmeldung.** Das Token ist abgelaufen. Der Client räumt
`rsi-admin-token` und `rsi-admin-auth` selbst, die PIN ist neu einzugeben.

**CORS-Fehler im Browser.** Der Ursprung fehlt in der Whitelist. Bei einer neuen
Vorschau-Adresse von Vercel muss sie in `admin-auth/index.ts` und
`admin-write/index.ts` ergänzt und neu deployt werden.

---

## 3. Aufbau des Administrationsbereichs

| Tab | Inhalt |
|---|---|
| **Inhalte** | Themen, Szenen, Defizite anlegen, ändern, löschen |
| **Kurse** | Kurse, Zugangscodes, Themenzuteilung |
| **Rangliste** | Einträge nach Benutzer und Kurs verwalten |
| **Zuständigkeit** | Je Land eintragen, wer die Inhalte verantwortet |
| **Export / Import** | Vollständiger JSON-Auszug der Datenbasis |

Bei den Inhalten steht links eine Liste der Themen. Sobald es Themen aus mehr
als einem Land gibt, erscheint darüber ein Landfilter; er schränkt die Liste ein
und damit auch die Szenen und Defizite, die darunter erreichbar sind.

---

## 4. Themen

### 4.1 Struktur

Ein Oberthema wie «Verkehrsführung» enthält Unterthemen wie «Linienführung»,
darunter liegen die Szenen mit der Kennung `SZ_YYYY_NNN` und je Szene die
Defizite mit der Kennung `SD_NNNN`.

### 4.2 Land

Beim Anlegen eines Oberthemas ist das Land ein Pflichtfeld. Vorgabe ist die
Schweiz, zur Auswahl stehen alle 249 offiziell zugeteilten Codes nach
ISO 3166-1 alpha-2. Ein Unterthema wählt kein Land, sondern erbt es vom
Oberthema; im Dialog steht, welches das ist.

Das Land entscheidet über zweierlei. Erstens darüber, ob überhaupt beurteilt
wird: Für ein Land ohne hinterlegtes Verfahren zeigt der Bewertungsfluss einen
Hinweis und bricht ab, ohne Punkte. Hinterlegt ist bislang der Neunschrittpfad
für die Schweiz. Zweitens darüber, welche Szenen und Defizite unter dem Thema
liegen dürfen – sie gehören zum selben Land.

Ein bestehendes Thema lässt sich auf ein anderes Land umstellen. Prüfen Sie
davor, ob die Szenen darunter noch passen; die Anwendung stellt sie nicht um.

### 4.3 Aktionen

Neue Oberthemen und Gruppen entstehen über den Button rechts oben, die
Reihenfolge ändern die Pfeile, Umbenennen geschieht direkt in der Liste.
Archivieren setzt `isActive` auf `false`: Die Szenen bleiben erhalten,
erscheinen aber im Trainingspfad nicht mehr. Das Löschen eines Oberthemas
verlangt eine Bestätigung, die den Umfang der Kaskade nennt, also die Zahl der
betroffenen Gruppen und Szenen samt Defiziten.

### 4.4 Sichtbarkeit je Kurs

Jedes Thema trägt das Flag «Nur für zugewiesene Kurse sichtbar». Ist es gesetzt,
sehen das Thema ausschliesslich jene, die sich mit einem Kurscode angemeldet
haben, in dem es angehakt ist; im freien Training bleibt es verborgen. Kurse ohne
angehakte Themen zeigen weiterhin die freie Auswahl, damit bestehende Kurse
unverändert funktionieren.

Das ist eine Steuerung der Sichtbarkeit im Client, keine Zugriffssicherung. Die
Inhalte selbst bleiben in Supabase anonym lesbar.

### 4.5 Piktogramme

Jedes Oberthema kann ein Piktogramm aus einem Katalog von 23 Icons erhalten. Bei
der Neuanlage schlägt die App eines aus dem Themennamen vor.

### 4.6 Mehrsprachigkeit

Titel und Beschreibungen sind mehrsprachige Objekte für Deutsch, Französisch,
Italienisch und Englisch. Deutsch ist Pflicht; fehlt eine andere Sprache, wird
sie mit dem deutschen Text gefüllt.

---

## 5. Szenen

### 5.1 Neue Szene

Unterthema wählen, **Neue Szene**, dann Titel, Kontextbeschreibung,
Strassenmerkmale sowie wahlweise einen Trainerhinweis erfassen, der im Einstieg
gelb hinterlegt erscheint.

Die Merkmale lassen sich mit **Katalog laden** in einem Zug anlegen: 21 Felder
in drei Gruppen – Funktionalität, Verkehr, Verkehrsteilnehmende. Jedes bringt
seine Wertliste mit; nur der durchschnittliche tägliche Verkehr hat ein
Eingabefeld statt eines Auswahlfelds. Merkmale ohne Wert erscheinen im Einstieg
nicht und dürfen stehen bleiben. Wer ein Merkmal braucht, das der Katalog nicht
führt, trägt es mit **Merkmal hinzufügen** frei ein; solche Einträge haben kein
Auswahlfeld und keine Übersetzung. Nach dem
Speichern trägt die Szene die Kennung `SZ_YYYY_NNN`; das Panorama kommt separat
über den Bild-Upload dazu.

### 5.2 Bestanden-Kriterium

Voreingestellt gilt eine Szene als bestanden, wenn alle Pflichtdefizite gefunden
sind und mindestens 60 % der Punkte erreicht wurden. Im Szenen-Dialog lässt sich
das je Szene überschreiben: Die Checkbox steuert die Pflichtdefizite, ein leeres
Prozentfeld hebt die Punkteschwelle auf.

### 5.3 Vorschaubilder

Bis zu zwei Bilder je Szene, automatisch auf 400 Pixel und JPEG mit 70 % Qualität
verkleinert, entweder aus dem Panorama abgeleitet oder hochgeladen.

---

## 6. Panorama-Bilder

### 6.1 Speicherort

Produktiv liegen die Panoramen im Supabase-Bucket `rsi-textures` mit
öffentlichem Lesezugriff, nach dem Muster
`panoramas/{szeneId}/{haupt|persp_NNN_<label>}.webp`. Das Verzeichnis
`public/textures/` dient nur noch Demo- und Rückfallbildern.

### 6.2 Bedienung

Der Upload-Dialog hat zwei Register. «Bibliothek» listet je Szene die bereits
vorhandenen Bilder zur Auswahl, «Hochladen» nimmt Dateien per Drag-and-drop oder
Dateiauswahl entgegen und legt den Pfad selbst an.

### 6.3 Empfohlene Spezifikation

WebP, equirektangulär im Verhältnis 2 : 1, 4096 × 2048 Pixel, höchstens 5 MB.
JPG und PNG werden angenommen, erzeugen aber grössere Downloads.

---

## 7. Defizite

### 7.1 Anlegen

Szene wählen, **Neues Defizit**. Pflicht sind Name und Beschreibung
mehrsprachig, die Kategorie, das Kriterium aus der WICHTIGKEIT_TABLE mit ihren
58 Einträgen, der Kontext innerorts oder ausserorts sowie die richtige
Beurteilung mit Wichtigkeit, Abweichung und NACA-Wert. Relevanz SD,
Unfallschwere und Unfallrisiko rechnet die App aus diesen drei Angaben.

### 7.2 Weitere Felder

Der Feedback-Text liefert die fachliche Begründung für die Lernkarte, die
Massnahmenlogik die empfohlene Korrektur. Normbezüge kommen aus einem Katalog von
32 VSS- und SN-Normen mit Autovervollständigung und Mehrfachauswahl. Das
Pflicht-Flag macht ein Defizit für die Vollständigkeit der Szene erforderlich,
das Booster-Flag hebt die Punkte um 10 oder 20 %.

---

## 8. Verortungs-Editor

### 8.1 Aufbau

Geöffnet wird er in der Szene über **Verortungs-Editor öffnen**. In der Mitte
steht das equirektanguläre Panorama, rechts die Liste der Defizite, Standorte und
die Navigation, oben die Auswahl des Buckets und die Modusschalter, unten die
Zoomleiste.

### 8.2 Modi

| Modus | Aktion |
|---|---|
| **Startblick** | Klick setzt das Fadenkreuz für die Anfangsblickrichtung |
| **Punkt** | Klick setzt einen Marker mit Toleranzradius, einstellbar von 5 bis 30 Grad |
| **Polygon** | Mehrere Klicks setzen Eckpunkte, ein Doppelklick schliesst die Fläche |
| **Gruppe** | Fasst mehrere Verortungen zu einer Fläche zusammen |

### 8.3 Bedienung

Alle Marker lassen sich mit der Maus verschieben. Das Mausrad zoomt
cursorzentriert von einfacher bis fünffacher Vergrösserung, die Tasten `+`, `−`
und `0` tun dasselbe; gezogen wird mit der linken Maustaste auf freier Fläche.

### 8.4 Perspektiven und Standort-Navigation

Eine Szene kann mehrere 360°-Standorte führen. Dazu in der Szenenbearbeitung eine
Perspektive mit Bezeichnung anlegen, das zugehörige Bild in den Bucket laden und
im Editor über den Perspektiven-Button auswählen. Verortungen gelten je
Perspektive; einen Rückfall auf die Verortung des Haupt-Panoramas gibt es
bewusst nicht, weil sonst Marker an falscher Stelle erscheinen.

Für den Wechsel im Viewer wird im Haupt-Panorama je Perspektive eine
Standortposition als Raute gesetzt und in jeder Perspektive ein Marker zurück
zum Haupt-Panorama sowie zu den übrigen Standorten.

---

## 9. Kurse

### 9.1 Anlegen

Im Register **Kurse** über **Neuer Kurs**: Name wie «FK RSI 2026-Q2»,
Gültigkeitsdauer, Zugangscode automatisch oder von Hand, wahlweise ein Passwort
und die Auswahl der Themen.

Das Kurspasswort wird nicht im Klartext gespeichert. Die Prüfung läuft über die
Edge Function `kurs-auth` gegen einen mit `KURS_PASSWORT_PEPPER` gepfefferten
Hash.

Ein Kurs gehört zu genau einem Land. Es ergibt sich aus dem ersten
Themenbereich, den Sie anhaken, und steht danach fest: Themen anderer Länder
lassen sich nicht mehr auswählen, und im Dialog steht, warum. Nehmen Sie alle
Themen wieder weg, ist das Land erneut offen.

### 9.2 Lebenszyklus

Innerhalb der Gültigkeitsdauer erscheint ein Kurs auf der Startseite.
Deaktivieren nimmt ihn aus der Auswahl, ohne ihn zu löschen. Das Löschen
entfernt den Kurs samt zugehörigen Ranglisteneinträgen.

### 9.3 Teilnehmendenansicht

Sichtbar sind nur zeitlich aktive Kurse. Passwortgeschützte Kurse erscheinen,
verlangen aber das Passwort zum Start.

---

## 10. Ranglisten-Verwaltung

Die Übersicht führt alle Einträge aus `rsi_results` mit Pseudonym, Kurs, Szene,
Punkten, Prozentwert, Dauer, Bestanden-Status und Zeitstempel; filtern und
sortieren lässt sich über alle Spalten.

Löschen ist möglich je Einzeleintrag, je Benutzer-Hash und je Kurs. Der Vorgang
wirkt sofort auch in Supabase und lässt sich nicht rückgängig machen.

Seit v0.9.9 laufen diese Löschungen über die Edge Function `admin-write` mit
`service_role`. Der Grund: Die RLS-Regel von `rsi_results` erlaubt anonym nur
Lesen und Einfügen, weshalb die früheren direkten Löschversuche von Postgres
verworfen wurden, ohne dass die Oberfläche es gemerkt hätte. Die Anzeige nennt
jetzt die Zahl der tatsächlich gelöschten Zeilen.

Damit ist auch die Rangliste nicht mehr frei manipulierbar.

---

## 11. Berichte

Im Administrationsbereich lassen sich zwei PDF-Berichte erzeugen: je Kurs eine
Übersicht aller Durchläufe im Querformat und je Einzelresultat der vollständige
Bericht mit Auswertung und Befundliste.

Die Namen stammen dort aus Supabase und liegen nur als Hash vor. Der Kursbericht
weist sie gekürzt aus und hält das im Dokument fest. Ein Bericht mit Klarnamen
entsteht ausschliesslich auf dem Gerät der teilnehmenden Person.

---

## 12. Export und Import

Der Export liefert Themen, Szenen, Defizite, Kurse und einen Stand der Rangliste
als JSON mit dem Versionsfeld `rsi-v3`. Die Bildpfade sind enthalten, die
Bilddaten selbst nicht; dazu siehe `BACKUP.md`.

Der Import prüft Version, Kennungsformat, Mehrsprachigkeit und Bildgrössen.
**Er überschreibt bestehende Datensätze mit gleicher Kennung, ohne zu
verschmelzen.** Importiert wird nur aus vertrauenswürdiger Quelle.

Sinnvoll ist der Export vor grösseren Änderungen, beim Transfer zwischen
Entwicklungs- und Produktivstand und für die Archivierung abgeschlossener Kurse.

Ein Import ist der einzige Weg, viele Datensätze auf einmal einzuspielen, und
der einzige, eine Szene über eine Landesgrenze zu bewegen. Er ergänzt und
ersetzt, aber er löscht nicht: Ein Datensatz, der in der Datei fehlt, bleibt
bestehen. Wer etwas entfernen will, löscht es in der Oberfläche.

**Zählen Sie nach.** Die Meldung nennt die Zahl der geladenen Datensätze und
die der abgewiesenen Szenen. Ob der Inhalt angekommen ist, sagt sie nicht.

---

## 13. Supabase

### 13.1 Tabellen

| Tabelle | Inhalt | Rechte für anonym |
|---|---|---|
| `rsi_topics` | Themen als JSONB | nur lesen |
| `rsi_scenes` | Szenen als JSONB | nur lesen |
| `rsi_deficits` | Defizite als JSONB | nur lesen |
| `rsi_kurse` | Kurse; das Passwortfeld ist gegen Lesen gesperrt | eingeschränkt lesen |
| `rsi_results` | Einzelergebnisse | lesen und einfügen, kein Löschen |

Die Migrationen liegen unter `supabase/migrations/`. Sie legen die Kurstabelle
an, führen den Pfeffer für Kurspasswörter ein und ergänzen `rsi_results` um die
JSONB-Spalte `detail` mit den Angaben je Durchlauf. Ohne diese Spalte fällt der
Client auf die Kopfdaten zurück, und der Bericht im Administrationsbereich bleibt
auf Kennzahlen beschränkt.

### 13.2 Ablauf

Bei jedem Speichern im Administrationsbereich geht der Aufruf mit dem Header
`x-admin-token` an `admin-write`, das Token und Nutzlast prüft und mit
`service_role` schreibt. Beim Start liest die App über den Anon-Key und hält das
Ergebnis im Modulspeicher. Ist Supabase leer, wird einmalig aus dem localStorage
befüllt, nach ausdrücklicher Zustimmung. Bei einem 401 räumt der Client Token und
Auth-Flag.

### 13.3 Cache leeren

Der Punkt «App zurücksetzen» im Avatar-Menü oder im Fuss der Startseite erzwingt
einen vollständigen Neuaufbau.

---

## 13a. Zuständigkeit je Land

Im Register **Zuständigkeit** halten Sie fest, wer die Inhalte eines Landes
verantwortet: die Stelle, die fachliche Grundlage, den Stand und einen Hinweis.
Zur Auswahl stehen die Länder, für die es Themenbereiche gibt.

Angezeigt werden die Angaben an zwei Orten: beim Themenbereich am Einstieg und
auf dem Rückmeldebildschirm jeder Szene. Solange nichts eingetragen ist, steht
dort «noch nicht bestimmt» und der Hinweis, dass die Inhalte vorläufig sind, von
keiner Stelle dieses Landes freigegeben und nur zu Trainingszwecken bestimmt.
Diese Auskunft gilt für jedes Land, die Schweiz eingeschlossen.

Die Felder sind einsprachig. Sie tragen Eigennamen und Fundstellen, und die
werden nicht übersetzt; wer sie einträgt, wählt die Sprache.

**Die Angaben liegen auf dem Gerät**, im localStorage unter
`rsi-v3-zustaendigkeiten`, und werden nicht nach Supabase abgeglichen. Auf ein
zweites Gerät kommen sie über Ausfuhr und Einfuhr im Register **Export /
Import**. Erzeugen Sie nach dem Eintragen einen Auszug, sonst ist die Angabe
beim nächsten Gerätewechsel weg.

---

## 14. Störungsbehebung

**Anmeldung schlägt fehl (401).** PIN prüfen, Logs von `admin-auth` ansehen,
Secret gesetzt und Funktion neu deployt?

**Schreibzugriffe schlagen nach einiger Zeit fehl (401).** Token abgelaufen, PIN
neu eingeben. Bei wiederkehrenden Fällen prüfen, ob `ADMIN_TOKEN_SECRET`
zwischenzeitlich gewechselt wurde.

**CORS-Fehler.** Adresse fehlt in der Whitelist der Edge Functions; ergänzen und
neu deployen.

**Änderungen werden nicht gespeichert.** Netz prüfen, Browser-Konsole auf Fehler
von Supabase oder den Edge Functions ansehen. Als Ausweg Export und Import auf
einem anderen Gerät.

**Daten erscheinen doppelt.** Cache nicht zurückgesetzt; App zurücksetzen.

**Lösch-Buttons der Rangliste bleiben wirkungslos oder melden einen Fehler.**
`admin-write` ist nicht in der aktuellen Fassung deployt.

**PIN ist bekannt geworden.** Secret `ADMIN_PIN` ändern und `admin-auth` neu
deployen. Ein Vercel-Redeploy ist nicht nötig.

**Kurspasswort wird nicht akzeptiert.** Prüfen, ob `kurs-auth` deployt und
`KURS_PASSWORT_PEPPER` gesetzt ist. Wurde der Pfeffer gewechselt, lassen sich
bestehende Passwörter nicht mehr prüfen; sie sind neu zu setzen.

**Panorama lädt nicht.** Bucket `rsi-textures` prüfen: Datei vorhanden,
Leseregel aktiv? Im Browser muss die Content-Security-Policy `img-src` für
`https://*.supabase.co` zulassen.

**Statt des Bewertungsflusses erscheint ein Hinweis auf ein fehlendes
Verfahren.** Die Szene gehört zu einem Land, für das kein Verfahren hinterlegt
ist. Prüfen Sie das Land des Oberthemas; hinterlegt ist bislang allein die
Schweiz.

**Ein Themenbereich lässt sich im Kurs nicht anhaken.** Der Kurs gehört bereits
zu einem anderen Land. Die Begründung steht im Dialog neben dem Thema.

**Eingetragene Zuständigkeiten fehlen auf einem anderen Gerät.** Sie liegen im
localStorage und wandern nur über Ausfuhr und Einfuhr.

---

## 15. Normative Pflege

Die Datei `src/data/scoringEngine.ts` mit der WICHTIGKEIT_TABLE und den Matrizen
ist normativ geschützt und darf nur nach Verifikation gegen den TBA-Fachkurs
FK RSI V 16.09.2020 geändert werden. Ein Hook blockiert Änderungen daran.

Frei anpassbar sind die Anzeigetexte, etwa in `kriteriumLabels.ts` und
`abweichungLabels.ts`, ebenso die Punkte-Ökonomie in `scoreCalc.ts`, also
Teilpunkte und Hinweis-Abzüge. Diese Trennung ist Absicht: Normlogik und
didaktische Setzung sollen nicht in derselben Datei stehen.

---

## 16. Test- und Produktivdaten

Es gibt ein einziges Supabase-Projekt; getrennt wird über Kurse. Für Test- und
Demozwecke einen eigenen, zeitlich begrenzten Kurs anlegen und danach löschen.

Themen, Szenen und Defizite gelten global, Änderungen wirken sofort auf alle
Kurse. Vor grösseren Umbauten empfiehlt sich ein Export als Momentaufnahme. Ein
zweites Supabase-Projekt würde doppelte Pflege bedeuten; für die derzeitige
Kursgrösse lohnt sich das nicht.

Wird später ein Staging-Projekt nötig, beschreibt `BACKUP.md` unter
«Wiederherstellung Szenario B» die Einrichtung samt Edge Functions und Secrets.

---

## 17. Fehler-Monitoring

Fehler auf den Geräten der Teilnehmenden gehen an Sentry, sofern
`VITE_SENTRY_DSN` gesetzt ist. Ohne DSN findet keine Übertragung statt; im Pilot
ist das Feld leer.

Erfasst werden unbehandelte JavaScript-Fehler mit Aufrufliste,
Performance-Messungen mit 10 % Stichprobe und Sitzungsaufzeichnungen nur im
Fehlerfall mit 30 % Stichprobe, dabei Text maskiert und Medien blockiert.

Nicht erfasst werden Klarnamen, die vor dem Versand entfernt werden, Bildinhalte
der Panoramen und Eingaben in Formularen.

Abschalten lässt sich das Monitoring, indem `VITE_SENTRY_DSN` in Vercel entfernt
und neu deployt wird.

---

## 18. Barrierefreiheit

Umgesetzt sind ein globaler Fokus-Ring über `:focus-visible`, Bedienelemente von
mindestens 44 × 44 Pixel in Navigationsleiste und Sprachauswahl, eine Fokusfalle
in allen Dialogen mit Rücksprung zum auslösenden Element, ESC zum Schliessen,
`aria-label`, `aria-pressed` und `aria-expanded` auf Buttons ohne Beschriftung
sowie Kontraste nach WCAG AA.

---

## 19. Kontakt

Stevan Skeledzic
info@skeledzic.ch
