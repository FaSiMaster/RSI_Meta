# Edge Function `admin-write`

Nimmt alle schreibenden Zugriffe des Administrationsbereichs entgegen und führt
sie mit dem `SUPABASE_SERVICE_ROLE_KEY` aus. Weil die Funktion damit an RLS
vorbei schreibt, können die Regeln der Tabellen auf reines Lesen für anonyme
Zugriffe verschärft werden.

Zugelassen sind `rsi_topics`, `rsi_scenes`, `rsi_deficits`, `rsi_kurse` und
`rsi_results`. Für `rsi_results` gilt eine Sonderregel: Die Tabelle ist seit
v0.9.9 **nur zum Löschen** freigegeben, mit genau einem Filter je Aufruf, weil
die RLS anonym nur Lesen und Einfügen erlaubt und direkte Löschversuche aus dem
Client von Postgres verworfen wurden.

## Authentifizierung

Die Funktion prüft **kein** PIN, sondern das Token aus `admin-auth`. Der Client
schickt es im Header `x-admin-token`; verifiziert wird zeitkonstant gegen
`ADMIN_TOKEN_SECRET`, samt Ablaufzeit. Der Weg über die PIN im Header stammt aus
der Zeit vor v0.6.0 und besteht nicht mehr.

## Deployment

### Über das Dashboard

1. Dashboard → Projekt → **Edge Functions** → **Deploy a new function**
2. **Function name:** `admin-write`
3. **Verify JWT:** aus
4. Inhalt von `index.ts` in den Editor kopieren und deployen
5. Unter Settings → Edge Functions → Secrets muss `ADMIN_TOKEN_SECRET` gesetzt
   sein, mit demselben Wert wie bei `admin-auth`

### Über die CLI

```bash
supabase functions deploy admin-write --no-verify-jwt
```

## Prüfung

Zuerst über `admin-auth` ein Token beziehen, dann:

```bash
curl -X POST \
  -H "x-admin-token: <token aus admin-auth>" \
  -H "content-type: application/json" \
  -d '{"table":"rsi_topics","op":"upsert","rows":[{"id":"test","data":{}}]}' \
  https://<project-ref>.supabase.co/functions/v1/admin-write
```

Erwartet wird `{"ok":true,"table":"rsi_topics","op":"upsert","count":1}`.

## Sicherheitsmodell

Das Token wird zeitkonstant verglichen und trägt seine Ablaufzeit mit sich. Für
Tabellen und Operationen gilt eine Whitelist, für jede Zeile eine Schemaprüfung
mit erlaubten Feldern; damit sind eingeschleuste Anweisungen ausgeschlossen. Je
Anfrage sind höchstens 200 Zeilen und je Zeile 256 KB zugelassen. Die abgeschaltete
JWT-Prüfung ist vertretbar, weil die Funktion ihre eigene Tokenprüfung mitbringt.

Kurspasswörter werden beim Upsert auf `rsi_kurse` serverseitig gehasht; der
Klartext verlässt den Client nur über HTTPS und wird nicht gespeichert.

## Bekannte Grenzen im Pilotbetrieb

Eine Begrenzung je IP enthält die Funktion nicht. Edge Functions laufen auf
mehreren Instanzen, ein Zähler im Arbeitsspeicher bliebe wirkungslos; verlässlich
wäre nur eine datenbankgestützte Lösung, die nach dem Pilot vorgesehen ist. Das
vorgelagerte Gateway begrenzt die Rate global je IP, was Rateversuche verlangsamt,
aber nicht ausschliesst.

Eine vierstellige PIN ergibt 10'000 Möglichkeiten. Das ist als Pilotrisiko
bewusst in Kauf genommen; im schlimmsten Fall werden Inhalte zerstört, die sich
aus Git und den lokalen Kopien wiederherstellen lassen. Für den Regelbetrieb
vorgesehen sind eine längere PIN, eine Ratenbegrenzung in der Datenbank und
gegebenenfalls die Rechteverwaltung von Supabase.

`[Widerspruch prüfen]` Die frühere Fassung begründete das akzeptierte Risiko
damit, die Anwendung enthalte keine datenschutzrelevanten Daten. Gespeichert
werden pseudonymisierte Namen, Punktestände und Kurszugehörigkeiten; das
Datenschutzgesetz ist damit einschlägig, auch wenn die Angaben nicht besonders
schützenswert sind. Die Risikoeinschätzung ist von der Fachstelle zu bestätigen.
