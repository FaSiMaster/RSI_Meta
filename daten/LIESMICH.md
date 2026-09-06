# daten/ – Erzeugte Datensätze und ihre Herkunft

> Stand 6. September 2026.

Dieser Ordner hält, was aus einer RSI-Auswahl zu Themen, Szenen und Defiziten
wird, und die Entscheide, die dabei getroffen wurden. Vite bündelt ihn nicht:
Was hier liegt, kommt nicht in das ausgelieferte Erzeugnis.

## Dateien

| Datei | Inhalt |
|---|---|
| `entscheide_2026_09_06.py` | Was nicht aus den Quelldaten folgt: Kontext je Szene, neutraler Szenenname, bereinigte Beschreibungen und Massnahmentexte, Normbezüge |
| `sprachen_2026_09_06.py` | Französisch, Italienisch und Englisch zu allem, was hier entsteht |
| `normlogik.py` | Liest Wichtigkeitstabelle und beide Matrizen aus `src/data/scoringEngine.ts` und rechnet damit |
| `merkmale_lesen.py` | Liest die Strassenmerkmale aus der Perimeterebene der Geodatenbank |
| `anlegen.py` | Erzeugt die Einfuhrdatei, die Beilage und die Arbeitsliste |
| `pruefe.py` | Prüft das Erzeugte |
| `pruefe_die_pruefung.py` | Hält jede Prüfung gegen einen absichtlich eingebauten Fehler |
| `einlesen.mjs` | Liest die Einfuhrdatei über die Oberfläche ein, gesteuert statt von Hand |
| `merkmale_2026-09-06.json` | Strassenmerkmale je Standort, aus der Quelle gelesen |
| `rsi-import_2026-09-06.json` | Einfuhrdatei für den Administrationsbereich |
| `massnahmen_2026-09-06.json` | Massnahmenart, Massnahmentext und Zuständigkeit je Defizit |

## Ablauf

```bash
python daten/merkmale_lesen.py      # nur nötig, wenn die Quelle sich ändert
python daten/anlegen.py             # erzeugen
python daten/pruefe.py              # prüfen
python daten/pruefe_die_pruefung.py # die Prüfung prüfen
```

`merkmale_lesen.py` braucht die Geodatenbank und `pyogrio`. Die übrigen
Schritte laufen ohne beides, weil das Ergebnis als JSON danebenliegt.

Danach im Administrationsbereich unter **Export / Import** die Datei
`rsi-import_2026-09-06.json` einlesen. Wer es nicht von Hand tun will:

```bash
npm run build
npm run preview -- --port 4173     # der Port ist nicht beliebig, siehe unten
RSI_ADMIN_PIN=… node daten/einlesen.mjs
```

`einlesen.mjs` steuert einen Browser über dieselbe Oberfläche — dieselbe
Prüfung, dieselbe Landesgrenze, dieselben save-Funktionen. **Der Port muss
4173 oder 5173 sein**: Die Edge Functions erlauben als Herkunft nur diese
beiden und die Vercel-Adresse. Auf einem anderen Port scheitert schon die
Anmeldung, und zwar an CORS, nicht an der PIN — die Meldung sagt das nicht.

Danach das Ergebnis in Supabase nachzählen, nicht der Erfolgsmeldung glauben.

## Warum die Einfuhr und nicht ein Skript

Die Daten liegen im localStorage des Browsers und in Supabase. An den
localStorage kommt ein Skript von aussen nicht heran; die Einfuhr dagegen läuft
durch die vorhandene Prüfung, ruft dieselben save-Funktionen wie die Oberfläche
und schreibt über die Edge Function nach Supabase.

Alle Kennungen sind aus der Standort-Kennung abgeleitet und damit stabil. Die
save-Funktionen ersetzen einen Datensatz gleicher Kennung, statt einen zweiten
anzulegen: Ein zweiter Import verdoppelt nichts.

## Woher die Strassenmerkmale kommen

Aus der Perimeterebene der RSI-Geodatenbank, nicht aus dem Kopf. Dort stehen
sie als Domänencode; den Klartext liefert `output/tabellen/codelisten.csv` des
Auswertungsprojekts, das ihn aus den Portalexporten gewonnen hat. Die
Geodatenbank selbst führt keine Domänen mit — sie liegen im Portal, nicht in
der Kopie.

Sechs Codes kommen in keinem ausgewerteten Export vor und haben deshalb keinen
Klartext: Verkehrslastklasse 1, Längsgefälle 3, Beleuchtung 3, Begegnungsfall
5, LOS 2 und Fussgängerstreifen 1. Sie betreffen 18 Werte über alle Szenen und
bleiben leer; `merkmale_2026-09-06.json` führt sie unter `offene_codes`. Dass
zwischen «LOS A» und «LOS C» ein «LOS B» liegen dürfte, ist eine Vermutung und
kein Beleg.

Die Schreibweise ist angepasst, die Aussage nicht: aus «3 - 6 %» wird «3–6 %»,
aus «beidseitigs lückenlos» «beidseitig lückenlos». Die Tabelle dazu steht in
`merkmale_lesen.py` unter `SCHREIBWEISE`.

**Ein Wert muss im Katalog stehen.** `src/data/strassenmerkmale.ts` bestimmt,
was der Administrationsbereich als Auswahlfeld anbietet; ein Wert, der dort in
keiner Option vorkommt, erschiene nicht und ginge beim nächsten Speichern
verloren. `pruefe.py` hält jeden geschriebenen Wert gegen den Katalog.

## Warum die Übersetzungen getrennt liegen

Die deutschen Texte stammen aus dem Inspektionsbericht und sind belegt. Die
Übersetzung ist es nicht — sie ist gemacht. Wer prüfen will, was das Werkzeug
behauptet, liest `entscheide_2026_09_06.py`; wer die Übersetzung prüfen will,
liest `sprachen_2026_09_06.py`.

Fehlt eine Übersetzung, bleibt das Feld leer statt den deutschen Satz zu
tragen. Ein deutscher Satz unter der Kennung «fr» sieht aus wie eine
Übersetzung und ist keine; die Anwendung fällt beim Lesen ohnehin auf Deutsch
zurück.

## Was die Einfuhrdatei bereits fertig trägt

Die Einfuhr rechnet nichts nach. Wichtigkeit, Relevanz SD, Unfallschwere und
Unfallrisiko stehen deshalb fertig in der Datei — gerechnet mit dem, was in
`scoringEngine.ts` steht, nicht mit einer zweiten Fassung derselben Regeln.
`pruefe.py` rechnet sie unabhängig nach und vergleicht.

## Die Einfuhrdatei trägt den ganzen Stand

Nicht nur die neuen Datensätze, sondern auch den Bestand: 9 Themen, 2 Szenen
und 31 Defizite aus Supabase, abgelegt unter `daten/bestand/`. Eine Datei, die
nur die neuen Sätze führt, überlässt es dem Zufall, ob der Bestand daneben
bestehen bleibt — sie setzt voraus, dass das einlesende Gerät seinen vollen
Stand kennt. Trägt die Datei alles, stellt jeder Import den ganzen Stand her,
auch auf einem Gerät, das ihn verloren hat.

Die Kennungen kollidieren nicht; jeder Datensatz ersetzt genau sich selbst.
`pruefe.py` hält die Datei gegen `daten/bestand/` und meldet jeden fehlenden
Satz.

Den Bestand auffrischen, bevor die Datei neu erzeugt wird:

```bash
curl -s "$VITE_SUPABASE_URL/rest/v1/rsi_topics?select=*"   -H "apikey: $VITE_SUPABASE_ANON_KEY"   -H "authorization: Bearer $VITE_SUPABASE_ANON_KEY" > daten/bestand/rsi_topics.json
```

Dasselbe für `rsi_scenes` und `rsi_deficits`.

## Was hier nicht liegt

Die Arbeitsliste für die Bildaufnahme. Sie verbindet den neutralen Szenennamen
mit dem realen Ort und gehört deshalb nicht in dieses Repositorium; sie steht
unter `C:/ClaudeAI/RSI_Analyse/output/AUFNAHMELISTE_ARBEIT_2026-09-06.md`.

## Ortsbezüge

Weder die Einfuhrdatei noch die Beilage nennen eine Gemeinde, eine Strasse oder
eine Perimeterkennung. `pruefe.py` hält beide gegen eine Liste aus den
Quelldaten.

Zwei Anmerkungen dazu, beide aus dem ersten Lauf: Die Prüfung deckte anfangs
nur die Einfuhrdatei ab, nicht die Beilage — und dort standen zwei
Strassennamen. Und als die Prüfung die Beilage einbezog, suchte sie zunächst
nach einem Muster mit zwei Steuerzeichen darin, statt nach dem Wort; sie hätte
nie etwas gefunden. Beides fiel erst auf, als ein Ortsname absichtlich
eingebaut und nicht gemeldet wurde.
