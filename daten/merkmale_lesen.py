# -*- coding: utf-8 -*-
"""Liest die Strassenmerkmale der Perimeter aus der Quelle.

Die Merkmale einer Szene sind keine Erfindung dieses Werkzeugs: Sie stehen in
der Perimeterebene der RSI-Geodatenbank. Dort allerdings als Domänencode, nicht
als Text — die Auflösung liegt in `output/tabellen/codelisten.csv` des
Auswertungsprojekts, das sie aus den Portalexporten gewonnen hat.

Dieses Skript ist der einzige Ort, der die Geodatenbank anfasst. Es schreibt
`daten/merkmale_2026-09-06.json`; `anlegen.py` liest nur diese Datei. So läuft
die Erzeugung auch auf einem Rechner, auf dem der Archivbestand nicht liegt.

Was sich nicht auflösen lässt, bleibt leer und wird gemeldet. Ein Code, dessen
Klartext in keinem Export vorkommt, ist nicht zu erraten: Dass 1, 2 und 3 der
Reihe nach stehen, heisst nicht, dass zwischen «LOS A» und «LOS C» zwingend
«LOS B» liegt — es heisst nur, dass es so aussieht.

Aufruf:
    python daten/merkmale_lesen.py
"""

import csv
import json
import os
import sys
from collections import defaultdict

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

from entscheide_2026_09_06 import SZENEN  # noqa: E402

GDB = ('C:/ClaudeAI/RSI_Analyse/Stand_August_2026.gdb/Stand_August_2026.gdb')
CODELISTEN = 'C:/ClaudeAI/RSI_Analyse/output/tabellen/codelisten.csv'
ZIEL = os.path.join(HIER, 'merkmale_2026-09-06.json')

# Merkmal im Werkzeug ← Feld in der Perimeterebene.
# Die Reihenfolge ist die des Katalogs in src/data/strassenmerkmale.ts.
# Bemerkungsfelder (`*_bem`) sind bewusst nicht dabei: Sie führen Strassen- und
# Ortsnamen, und die haben in den Daten des Werkzeugs nichts zu suchen.
ZUORDNUNG = [
    # (Merkmal-Kennung, Feld, Art)
    ('strassenklassierung',     'str_klasse_n',        'code'),
    ('funktion_strasse',        'str_funktion_n',      'code'),
    ('haupt_nebenstrasse',      'hauptstr',            'code'),
    ('lage_io_ao',              'lage_n',              'code'),
    ('ausnahmetransportroute',  'ausnahmetransport',   'code'),
    ('verkehrslastklasse',      'verkehrslastklasse',  'code'),
    ('laengsgefaelle',          'gefaelle',            'code'),
    ('strassenbeleuchtung',     'str_beleuch',         'code'),
    ('lichtsignalanlage',       'lsa',                 'code'),

    ('signalisierte_geschwindigkeit', 'sig_v_n',       'code'),
    ('begegnungsfall',          'mass_begegnungsfall', 'code'),
    ('verkehrsqualitaet',       'los',                 'code'),
    ('dtv',                     'dtv_n',               'zahl'),

    ('trottoir',                'trottoir',            'code'),
    ('veloroute',               'veloroute',           'code'),
    ('veloinfrastruktur',       'veloinfrastruktur',   'code'),
    ('fussgaengerstreifen',     'fgs',                 'code'),
    ('buslinie',                'buslinie',            'code'),
    ('bushaltestellen',         'bushaltestellen',     'code'),
    ('landwirtschaftsverkehr',  'landw_verkehr',       'code'),
    ('strassenbahn',            'str_bahn',            'code'),
]


# Schreibweise im Werkzeug ← Klartext der Quelle.
# Die Quelle schreibt für den Bildschirm des Erfassungsportals; das Werkzeug
# schreibt Schweizer Hochdeutsch. Geändert wird die Schreibung, nie die
# Aussage. Was hier nicht steht, geht unverändert durch.
#
# Der Eintrag «Typ2» → «Typ II» ist der einzige, der über die Zeichensetzung
# hinausgeht: Die Ausnahmetransportrouten heissen im Verkehrsrecht Typ I bis
# Typ III, «Typ2» ist dieselbe Angabe in der Schreibung des Portals.
SCHREIBWEISE = {
    'Hauptstrasse; nummeriert':      'Hauptstrasse, nummeriert',
    'Typ2':                          'Typ II',
    '3 - 6 %':                       '3–6 %',
    'ja; ganze Nacht':               'ja, ganze Nacht',
    'ja; 24 h Betrieb':              'ja, 24 h Betrieb',
    'beidseitigs lückenlos':         'beidseitig lückenlos',
    'lückenhaft / nicht vorhanden':  'lückenhaft oder nicht vorhanden',
    'keiner/selten':                 'keiner oder selten',
    'Keine Veloinfrastruktur':       'keine',
}


def lies_codelisten():
    aus = defaultdict(dict)
    with open(CODELISTEN, encoding='utf-8-sig') as f:
        for z in csv.DictReader(f, delimiter=';'):
            text = z['klartext'].strip()
            aus[z['feld']][z['code']] = SCHREIBWEISE.get(text, text)
    return aus


# Zahlenwerte stehen hier ohne Tausendertrenner. Die Trennung hängt an der
# Sprache — Festabstand im Deutschen, Französischen und Italienischen nach
# den Weisungen der Bundeskanzlei Rz. 512, Komma im Englischen —, und die
# Sprache kennt erst anlegen.py.


def main():
    import pyogrio

    perimeter_je_szene = {}
    for standort in SZENEN:
        # Standort-Kennung: P<Perimeter>-<LV95 Ost>-<LV95 Nord>
        perimeter_je_szene[standort] = standort.split('-')[0][1:]

    codelisten = lies_codelisten()
    df = pyogrio.read_dataframe(GDB, layer='Perimeter', read_geometry=False)
    df['perimeter_id'] = df['perimeter_id'].astype('Int64').astype(str)

    aus, offen = {}, []
    for standort, pid in sorted(perimeter_je_szene.items()):
        zeile = df[df['perimeter_id'] == pid]
        if len(zeile) != 1:
            raise SystemExit(f'Perimeter {pid}: {len(zeile)} Zeilen statt einer')
        zeile = zeile.iloc[0]

        merkmale = {}
        for kennung, feld, art in ZUORDNUNG:
            wert = zeile.get(feld)
            if wert is None or (isinstance(wert, float) and wert != wert):
                continue
            if art == 'zahl':
                merkmale[kennung] = str(int(wert))
                continue
            code = str(int(wert))
            text = codelisten.get(feld, {}).get(code)
            if not text:
                offen.append({'standort': standort, 'perimeter': pid,
                              'merkmal': kennung, 'feld': feld, 'code': code})
                continue
            merkmale[kennung] = text
        aus[standort] = merkmale

    inhalt = {
        'stand': '2026-09-06',
        'quelle': 'Perimeterebene der RSI-Geodatenbank, Stand August 2026; '
                  'Codes aufgelöst über codelisten.csv der RSI-Auswertung',
        'hinweis': 'Erzeugt von daten/merkmale_lesen.py. Ein Merkmal fehlt, wenn '
                   'der Perimeter dazu nichts führt oder der Code in keinem '
                   'Portalexport mit Klartext vorkommt; die zweite Gruppe steht '
                   'unter «offene_codes».',
        'merkmale': aus,
        'offene_codes': offen,
    }
    with open(ZIEL, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(inhalt, f, ensure_ascii=False, indent=2)
        f.write('\n')

    gefuellt = sum(len(m) for m in aus.values())
    print(f'{len(aus)} Standorte, {gefuellt} Merkmalswerte, '
          f'{len(offen)} ohne Klartext')
    for o in offen:
        print(f'  {o["standort"]}  {o["merkmal"]:24s} {o["feld"]}={o["code"]}')
    print(f'\nGeschrieben: {ZIEL}')


if __name__ == '__main__':
    main()
