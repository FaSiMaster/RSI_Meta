# daten/ – Erzeugte Datensätze und ihre Herkunft

> Stand 6. September 2026.

Dieser Ordner hält, was aus einer RSI-Auswahl zu Themen, Szenen und Defiziten
wird, und die Entscheide, die dabei getroffen wurden. Vite bündelt ihn nicht:
Was hier liegt, kommt nicht in das ausgelieferte Erzeugnis.

## Dateien

| Datei | Inhalt |
|---|---|
| `entscheide_2026_09_06.py` | Was nicht aus den Quelldaten folgt: Kontext je Szene, neutraler Szenenname, bereinigte Beschreibungen und Massnahmentexte, Normbezüge |
| `normlogik.py` | Liest Wichtigkeitstabelle und beide Matrizen aus `src/data/scoringEngine.ts` und rechnet damit |
| `anlegen.py` | Erzeugt die Einfuhrdatei, die Beilage und die Arbeitsliste |
| `pruefe.py` | Prüft das Erzeugte in sechs Punkten |
| `rsi-import_2026-09-06.json` | Einfuhrdatei für den Administrationsbereich |
| `massnahmen_2026-09-06.json` | Massnahmenart, Massnahmentext und Zuständigkeit je Defizit |

## Ablauf

```bash
python daten/anlegen.py     # erzeugen
python daten/pruefe.py      # prüfen
```

Danach im Administrationsbereich unter **Export / Import** die Datei
`rsi-import_2026-09-06.json` einlesen.

## Warum die Einfuhr und nicht ein Skript

Die Daten liegen im localStorage des Browsers und in Supabase. An den
localStorage kommt ein Skript von aussen nicht heran; die Einfuhr dagegen läuft
durch die vorhandene Prüfung, ruft dieselben save-Funktionen wie die Oberfläche
und schreibt über die Edge Function nach Supabase.

Alle Kennungen sind aus der Standort-Kennung abgeleitet und damit stabil. Die
save-Funktionen ersetzen einen Datensatz gleicher Kennung, statt einen zweiten
anzulegen: Ein zweiter Import verdoppelt nichts.

## Was die Einfuhrdatei bereits fertig trägt

Die Einfuhr rechnet nichts nach. Wichtigkeit, Relevanz SD, Unfallschwere und
Unfallrisiko stehen deshalb fertig in der Datei — gerechnet mit dem, was in
`scoringEngine.ts` steht, nicht mit einer zweiten Fassung derselben Regeln.
`pruefe.py` rechnet sie unabhängig nach und vergleicht.

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
