# -*- coding: utf-8 -*-
"""Prüft die erzeugten Datensätze, bevor sie eingelesen werden.

Acht Fragen: Stimmt die Zahl? Trägt ein Text einen Ortsbezug? Ist je Szene
genau ein Pflichtdefizit gesetzt? Ist keine Szene aktiv? Stammt jedes
Strassenmerkmal aus der Quelle und steht sein Wert im Katalog? Trägt jedes
mehrsprachige Feld alle vier Sprachen? Rechnet die Beurteilung so, wie das
Werkzeug rechnen würde? Und erzeugt ein zweiter Lauf dieselbe Datei?

Ob diese Prüfungen etwas taugen, prüft `pruefe_die_pruefung.py`: Sie baut je
Frage einen Fehler ein und erwartet, dass er gemeldet wird.

Aufruf:
    python daten/pruefe.py
"""

import collections
import csv
import hashlib
import io
import json
import os
import re
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from normlogik import beurteilung, wichtigkeit_tabelle  # noqa: E402

EINFUHR = os.path.join(HIER, 'rsi-import_2026-09-06.json')
BEILAGE = os.path.join(HIER, 'massnahmen_2026-09-06.json')
AUSWAHL = 'C:/ClaudeAI/RSI_Analyse/output/RSI_Aufnahme_Auswahl_2026-09-06.csv'

# Ortsbezüge, die in den Daten des Werkzeugs nichts zu suchen haben: jede
# Gemeinde und jede Strasse aus der Auswahl, dazu die Perimeterkennung.
def verbotene_woerter():
    with open(AUSWAHL, encoding='utf-8-sig') as f:
        zeilen = list(csv.DictReader(f, delimiter=';'))
    woerter = set()
    for z in zeilen:
        for feld in ('Gemeinde', 'Strasse'):
            wert = (z[feld] or '').strip()
            if wert and wert.lower() != 'none':
                woerter.add(wert)
                # «Zürcherstrasse» steckt auch in «Zürcherstrasse Nord»
                woerter.add(wert.split()[0])
    # Strassennamen aus den Beschreibungen, die in keiner Spalte stehen
    woerter |= {'Wiesengrundstrasse', 'Zumikerstrasse', 'Steinbruchweg',
                'Mettmenstetterstrasse', 'Schlossstrasse', 'Weisslingen',
                'Aurütistrasse', 'Kollbrunnerstrasse', 'Tösstalstrasse',
                'Maschwanderstrasse', 'Schiedhaldenstrasse', 'Dielsdorferstrasse',
                'Zürichstrasse', 'Dorfstrasse', 'Albisstrasse',
                'Untere Bahnhofstrasse', 'Zürcherstrasse'}
    # Flurname aus einem Massnahmentext. Gefunden beim Lesen, nicht von dieser
    # Prüfung: Ein Flurname sieht aus wie ein gewöhnliches Wort und lässt sich
    # aus keiner Spalte ableiten.
    woerter |= {'Hinterzelg'}
    # Die Quelle kürzt Strassennamen ab — «Zumikerstr.» statt
    # «Zumikerstrasse». Ohne die abgekürzte Form lief die Prüfung an einem
    # Ortsbezug vorbei, der die ganze Zeit dastand.
    woerter |= {w[:-4] for w in list(woerter) if w.endswith('strasse')}
    woerter = {w for w in woerter if len(w) > 3}
    return sorted(woerter)


# Die Einfuhrdatei trägt den ganzen Stand: den Bestand und die neuen
# Datensätze. Geprüft werden darf nur, was dieser Lauf erzeugt hat — der
# Bestand stammt von anderswoher und wird nicht umgeschrieben.
NEUE_THEMEN = {'tp-sicht', 'tp-sicht-knoten', 'tp-sicht-strecke',
               'tp-strassenrand-ao', 'tp-ausruestung'}


def ist_neu(art, eintrag):
    if art == 'topics':
        return eintrag['id'] in NEUE_THEMEN
    if art == 'scenes':
        return eintrag['id'].startswith('SZ_2026_1')
    return eintrag['id'].startswith('SD_01')


def neue(daten, art):
    return [e for e in daten.get(art, []) if ist_neu(art, e)]


def texte(daten):
    """Jeder Benutzertext der neuen Datensätze mit seiner Fundstelle.

    Alle vier Sprachen, und auch die Texte, die in einer Liste stecken — die
    Strassenmerkmale einer Szene sind eine Liste von Sätzen mit Bezeichnung
    und Wert. Die frühere Fassung sah nur Deutsch und nur die oberste Ebene;
    ein Ortsname in einem Merkmal oder in der französischen Fassung wäre ihr
    entgangen.
    """
    aus = []

    def sammle(ort, wert):
        if isinstance(wert, dict):
            if 'de' in wert:
                for sprache, text in wert.items():
                    if text:
                        aus.append((f'{ort}/{sprache}', text))
            else:
                for schluessel, unterwert in wert.items():
                    if schluessel not in ('id',):
                        sammle(f'{ort}/{schluessel}', unterwert)
        elif isinstance(wert, list):
            for i, eintrag in enumerate(wert):
                sammle(f'{ort}[{i}]', eintrag)
        elif isinstance(wert, str):
            aus.append((ort, wert))

    for art in ('topics', 'scenes', 'deficits'):
        for e in neue(daten, art):
            for feld, wert in e.items():
                if feld in ('id', 'sceneId', 'topicId'):
                    continue
                sammle(f"{art}/{e['id']}/{feld}", wert)
    return aus


def main():
    daten = json.load(open(EINFUHR, encoding='utf-8'))
    beilage = json.load(open(BEILAGE, encoding='utf-8'))
    with open(AUSWAHL, encoding='utf-8-sig') as f:
        auswahl = list(csv.DictReader(f, delimiter=';'))

    fehler = []

    # 1 — Zahl
    print('── Nachgezählt ──')
    standorte = {z['Standort_ID'] for z in auswahl}
    n_themen, n_szenen, n_defizite = (neue(daten, 'topics'), neue(daten, 'scenes'),
                                       neue(daten, 'deficits'))
    print(f'  Themen   {len(n_themen):3} neu von {len(daten["topics"]):3} in der Datei'
          '  (5 erwartet: 1 Oberthema, 4 Themen)')
    print(f'  Szenen   {len(n_szenen):3} neu von {len(daten["scenes"]):3} in der Datei'
          f'  ({len(standorte)} Standorte in der Auswahl)')
    print(f'  Defizite {len(n_defizite):3} neu von {len(daten["deficits"]):3} in der Datei'
          f'  ({len(auswahl)} Zeilen in der Auswahl)')
    print(f'  Beilage  {len(beilage["massnahmen"]):3}  Massnahmensätze')
    if len(n_szenen) != len(standorte):
        fehler.append('Szenenzahl weicht von der Standortzahl ab')
    if len(n_defizite) != len(auswahl):
        fehler.append('Defizitzahl weicht von der Zeilenzahl ab')
    if len(n_themen) != 5:
        fehler.append(f'{len(n_themen)} neue Themen statt 5')

    # Der Bestand muss vollständig mitgeführt sein, sonst verdrängt ein Import
    # ihn auf einem Gerät, das ihn verloren hat.
    print('\n── Bestand mitgeführt ──')
    import os as _os
    bestand_ordner = _os.path.join(HIER, 'bestand')
    if not _os.path.isdir(bestand_ordner):
        fehler.append('daten/bestand/ fehlt — die Einfuhrdatei trägt den Bestand nicht')
    else:
        for art, datei in (('topics', 'rsi_topics.json'), ('scenes', 'rsi_scenes.json'),
                           ('deficits', 'rsi_deficits.json')):
            pfad = _os.path.join(bestand_ordner, datei)
            soll = {z['data']['id'] for z in json.load(open(pfad, encoding='utf-8'))}
            ist = {e['id'] for e in daten[art]}
            fehlend = soll - ist
            print(f'  {art:9} {len(soll):3} bestehend, davon {len(soll - fehlend):3} in der Datei')
            if fehlend:
                fehler.append(f'{art}: Bestand fehlt in der Einfuhrdatei: {sorted(fehlend)}')
    if len(beilage['massnahmen']) != len(auswahl):
        fehler.append('Beilage deckt nicht alle Defizite ab')

    # 2 — kein Ortsbezug
    print('\n── Ortsbezüge ──')
    verboten = verbotene_woerter()
    treffer = []
    for ort, text in texte(daten):
        for w in verboten:
            if re.search(rf'\b{re.escape(w)}\b', text, re.I):
                treffer.append(f'{ort}: «{w}» in «{text[:70]}…»')
    print(f'  {len(verboten)} Ortsnamen geprüft, {len(treffer)} Treffer')
    for t in treffer:
        print(f'    {t}')
    fehler += treffer

    # 2b — auch die Beilage. Sie verlässt das Repositorium nicht, wird aber
    # weitergereicht, sobald ein eigener Schritt für Massnahmen gebaut wird.
    # Beim ersten Lauf standen hier zwei Strassennamen: Die Prüfung deckte die
    # Beilage nicht ab, und ein Nullbefund über die halbe Menge ist keiner.
    treffer_b = []
    for did, m in beilage['massnahmen'].items():
        for feld, text in m.items():
            for w in verboten:
                # Ohne Wortgrenzen: strenger als oben, weil ein Ortsname
                # in einem Massnahmentext auch als Wortteil stört.
                if re.search(re.escape(w), text, re.I):
                    treffer_b.append(f'Beilage {did}/{feld}: «{w}»')
    print(f'  Beilage: {len(beilage["massnahmen"])} Sätze, {len(treffer_b)} Treffer')
    for t in treffer_b:
        print(f'    {t}')
    fehler += treffer_b

    # 3 — je Szene genau ein Pflichtdefizit
    print('\n── Pflichtdefizite ──')
    je_szene = {}
    for d in neue(daten, 'deficits'):
        je_szene.setdefault(d['sceneId'], []).append(d)
    falsch = {s: sum(1 for d in ds if d['isPflicht'])
              for s, ds in je_szene.items()
              if sum(1 for d in ds if d['isPflicht']) != 1}
    print(f'  {len(je_szene)} Szenen, davon {len(falsch)} mit abweichender Zahl')
    for s, n in falsch.items():
        fehler.append(f'{s}: {n} Pflichtdefizite statt 1')

    # 4 — keine Szene aktiv, kein Bild, keine Verortung
    print('\n── Szenenzustand ──')
    aktiv = [s['id'] for s in neue(daten, 'scenes') if s['isActive']]
    mit_bild = [s['id'] for s in neue(daten, 'scenes') if s['panoramaBildUrl']]
    verortet = [d['id'] for d in neue(daten, 'deficits')
                if d.get('verortung') or d.get('verortungen')]
    print(f'  aktiv {len(aktiv)}, mit Bild {len(mit_bild)}, verortet {len(verortet)} '
          '(alle drei müssen 0 sein)')
    fehler += [f'Szene aktiv: {s}' for s in aktiv]
    fehler += [f'Szene mit Bild: {s}' for s in mit_bild]
    fehler += [f'Defizit verortet: {d}' for d in verortet]

    # 4b — Strassenmerkmale: gegen die Quelle und gegen den Katalog
    print('\n── Strassenmerkmale ──')
    quelle = json.load(open(os.path.join(HIER, 'merkmale_2026-09-06.json'),
                            encoding='utf-8'))
    katalog_text = open(os.path.join(HIER, '..', 'src', 'data',
                                     'strassenmerkmale.ts'),
                        encoding='utf-8').read()
    katalog = {}
    for m in re.finditer(r"id:\s*'(\w+)',\s*\n\s*label:\s*'([^']+)',\s*\n"
                         r"\s*optionen:\s*\[([^\]]*)\]", katalog_text):
        katalog[m.group(1)] = (m.group(2),
                               re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(3)))

    # Die Szenenkennung führt nicht zur Standort-Kennung zurück; die
    # Zuordnung läuft über die Reihenfolge, die anlegen.py festlegt. Geprüft
    # wird deshalb die Menge: Jeder Wert, der in einer Szene steht, muss aus
    # der Quelle stammen, und jeder Wert der Quelle muss in genau einer Szene
    # stehen.
    aus_quelle = collections.Counter()
    for werte in quelle['merkmale'].values():
        for kennung, wert in werte.items():
            aus_quelle[(kennung, wert)] += 1
    in_szenen = collections.Counter()
    nicht_im_katalog, ohne_wert = [], []
    for s in neue(daten, 'scenes'):
        for m in s.get('strassenmerkmale', []):
            kennung = m.get('id')
            wert = m['wertI18n']['de']
            in_szenen[(kennung, wert)] += 1
            if kennung not in katalog:
                nicht_im_katalog.append(f"{s['id']}: Merkmal «{kennung}» "
                                        'steht in keinem Katalog')
                continue
            label, optionen = katalog[kennung]
            if m['labelI18n']['de'] != label:
                nicht_im_katalog.append(
                    f"{s['id']}/{kennung}: Bezeichnung «{m['labelI18n']['de']}» "
                    f'statt «{label}»')
            # Ein Katalogmerkmal erscheint im Administrationsbereich als
            # Auswahlfeld. Ein Wert, der in keiner Option steht, wäre dort
            # nicht darstellbar und beim nächsten Speichern verloren.
            if optionen and wert not in optionen:
                nicht_im_katalog.append(
                    f"{s['id']}/{kennung}: Wert «{wert}» steht in keiner "
                    'Option des Katalogs')
            if not wert:
                ohne_wert.append(f"{s['id']}/{kennung}")

    fehlend = aus_quelle - in_szenen
    zuviel = in_szenen - aus_quelle
    print(f'  {sum(in_szenen.values())} Merkmalswerte in {len(neue(daten, "scenes"))} '
          f'Szenen, {sum(aus_quelle.values())} in der Quelle')
    print(f'  {len(quelle["offene_codes"])} Codes der Quelle ohne Klartext, '
          'deshalb nicht gesetzt')
    print(f'  Katalogverstösse {len(nicht_im_katalog)}, leere Werte {len(ohne_wert)}')
    fehler += nicht_im_katalog
    fehler += [f'Merkmal ohne Wert: {o}' for o in ohne_wert]
    fehler += [f'Merkmal der Quelle fehlt in den Szenen: {k} = {w} ({n}x)'
               for (k, w), n in fehlend.items()]
    fehler += [f'Merkmal ohne Deckung in der Quelle: {k} = {w} ({n}x)'
               for (k, w), n in zuviel.items()]

    # 4c — Sprachen
    print('\n── Sprachen ──')
    # Ein mehrsprachiges Feld trägt entweder alle vier Sprachen oder nur
    # Deutsch. Halb übersetzt heisst, dass eine Sprache im Betrieb auf Deutsch
    # zurückfällt, ohne dass es jemand merkt.
    luecken, nur_deutsch = [], []
    for art in ('topics', 'scenes', 'deficits'):
        for e in neue(daten, art):
            for feld, wert in e.items():
                if not (isinstance(wert, dict) and 'de' in wert):
                    continue
                besetzt = [s for s in ('de', 'fr', 'it', 'en') if wert.get(s)]
                if not besetzt:
                    continue
                if len(besetzt) == 1 and besetzt[0] == 'de':
                    nur_deutsch.append(f"{art}/{e['id']}/{feld}")
                elif len(besetzt) != 4:
                    luecken.append(f"{art}/{e['id']}/{feld}: nur {besetzt}")
    for s in neue(daten, 'scenes'):
        for m in s.get('strassenmerkmale', []):
            for feld in ('labelI18n', 'wertI18n'):
                besetzt = [x for x in ('de', 'fr', 'it', 'en') if m[feld].get(x)]
                if len(besetzt) != 4:
                    luecken.append(f"{s['id']}/{m.get('id')}/{feld}: "
                                   f'nur {besetzt}')
    print(f'  Felder mit Lücke {len(luecken)}, Felder nur auf Deutsch '
          f'{len(nur_deutsch)}')
    for n in nur_deutsch:
        print(f'    nur Deutsch: {n}')
    fehler += luecken
    fehler += [f'nur Deutsch: {n}' for n in nur_deutsch]

    # 5 — Beurteilung gegen die Normlogik
    print('\n── Beurteilung ──')
    tabelle = wichtigkeit_tabelle()
    abweichend = []
    for d in neue(daten, 'deficits'):
        soll = beurteilung(d['kriteriumId'], d['kontext'],
                           d['correctAssessment']['abweichung'],
                           d['correctAssessment']['naca'])
        if soll != d['correctAssessment']:
            abweichend.append(f"{d['id']}: {d['correctAssessment']} statt {soll}")
    print(f'  {len(neue(daten, "deficits"))} neue Defizite gegen scoringEngine.ts '
          f'{len(abweichend)} Abweichungen')
    fehler += abweichend

    # Gegenprobe: die Prüfung misst wirklich
    probe = dict(neue(daten, 'deficits')[0]['correctAssessment'])
    probe['unfallrisiko'] = 'gering' if probe['unfallrisiko'] != 'gering' else 'hoch'
    d0 = neue(daten, 'deficits')[0]
    if beurteilung(d0['kriteriumId'], d0['kontext'], probe['abweichung'],
                   probe['naca']) == probe:
        fehler.append('Gegenprobe: ein verfälschter Wert fiel nicht auf')
    else:
        print('  Gegenprobe mit einem verfälschten Wert: erkannt')

    # 6 — zweiter Lauf
    print('\n── Zweiter Lauf ──')
    # Der Lauf erzeugt die Dateien neu, die diese Prüfung gerade gelesen hat.
    # Ohne Sicherung putzt er jede Änderung weg, die man zum Prüfen der Prüfung
    # eingebaut hat — ein Mutationsnachweis wäre dann nicht führbar.
    sicherung = {pfad: open(pfad, 'rb').read() for pfad in (EINFUHR, BEILAGE)}
    vorher = hashlib.sha256(sicherung[EINFUHR]).hexdigest()
    subprocess.run([sys.executable, os.path.join(HIER, 'anlegen.py')],
                   capture_output=True, check=True)
    nachher = hashlib.sha256(open(EINFUHR, 'rb').read()).hexdigest()
    for pfad, inhalt in sicherung.items():
        open(pfad, 'wb').write(inhalt)
    print(f'  vorher  {vorher[:16]}…')
    print(f'  nachher {nachher[:16]}…')
    if vorher != nachher:
        fehler.append('Ein zweiter Lauf erzeugt eine andere Datei')
    else:
        print('  identisch — ein zweiter Lauf verdoppelt nichts')

    # Kennungen eindeutig
    for art in ('topics', 'scenes', 'deficits'):
        ids = [e['id'] for e in daten[art]]
        if len(ids) != len(set(ids)):
            fehler.append(f'{art}: doppelte Kennungen')

    print('\n' + '─' * 60)
    if fehler:
        print(f'{len(fehler)} BEFUNDE:')
        for f in fehler:
            print(f'  {f}')
        sys.exit(1)
    print('Ohne Befund. Die Einfuhrdatei kann eingelesen werden.')


if __name__ == '__main__':
    main()
