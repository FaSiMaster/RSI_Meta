# -*- coding: utf-8 -*-
"""Hält jede Prüfung aus pruefe.py gegen einen absichtlich eingebauten Fehler.

Eine Prüfung, die noch nie etwas gemeldet hat, ist keine Prüfung, sondern eine
Zeile Ausgabe. Genau daran ist die Ortsbezugsprüfung beim ersten Lauf
gescheitert: Sie suchte nach einem Muster, das in keinem Text vorkommen
konnte, und meldete deshalb zuverlässig nichts.

Dieses Skript verfälscht die Einfuhrdatei je Fall an einer Stelle, ruft
`pruefe.py` und erwartet, dass der Lauf mit Befund endet und die erwartete
Zeichenfolge in der Ausgabe steht. Danach stellt es den sauberen Stand wieder
her, indem es `anlegen.py` laufen lässt.

Aufruf:
    python daten/pruefe_die_pruefung.py
"""

import io
import json
import os
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HIER = os.path.dirname(os.path.abspath(__file__))
EINFUHR = os.path.join(HIER, 'rsi-import_2026-09-06.json')


def lies():
    return json.load(open(EINFUHR, encoding='utf-8'))


def schreibe(daten):
    with open(EINFUHR, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(daten, f, ensure_ascii=False, indent=2)
        f.write('\n')


def szene(daten, kennung='SZ_2026_103'):
    return [s for s in daten['scenes'] if s['id'] == kennung][0]


def defizit(daten, kennung='SD_01031'):
    return [d for d in daten['deficits'] if d['id'] == kennung][0]


# ── Die Fälle ────────────────────────────────────────────────────────────────
# Jeder verfälscht genau eine Stelle und nennt, was die Prüfung sagen muss.

def ortsname_in_einem_merkmal(daten):
    szene(daten)['strassenmerkmale'][0]['wertI18n']['de'] = 'Zumikerstrasse'


def abgekuerzter_ortsname(daten):
    # Der Fall, an dem die Prüfung vorher vorbeilief.
    defizit(daten)['beschreibungI18n']['de'] += ' Erschliessung via Zumikerstr.'


def ortsname_nur_auf_franzoesisch(daten):
    # Die frühere Prüfung sah nur Deutsch.
    defizit(daten)['beschreibungI18n']['fr'] += ' Accès par Uitikon.'


def merkmalswert_ausserhalb_des_katalogs(daten):
    szene(daten)['strassenmerkmale'][0]['wertI18n']['de'] = 'Autobahn'


def merkmal_entfernt(daten):
    szene(daten)['strassenmerkmale'].pop()


def merkmal_erfunden(daten):
    s = szene(daten)
    s['strassenmerkmale'].append({
        'id': 'lage_io_ao',
        'labelI18n': {'de': 'Lage IO/AO', 'fr': 'x', 'it': 'x', 'en': 'x'},
        'wertI18n': {'de': 'innerorts', 'fr': 'x', 'it': 'x', 'en': 'x'},
    })


def falsche_bezeichnung(daten):
    szene(daten)['strassenmerkmale'][0]['labelI18n']['de'] = 'Strassenklasse'


def erfundene_norm(daten):
    defizit(daten)['normRefs'].append('VSS 99 999 — Erfundene Norm')


def falscher_normtitel(daten):
    d = defizit(daten, 'SD_01121')
    d['normRefs'][0] = 'VSS 40 273 — Knoten; Grundlagen'


def uebersetzung_fehlt(daten):
    defizit(daten)['beschreibungI18n']['it'] = ''


def merkmal_ohne_uebersetzung(daten):
    szene(daten)['strassenmerkmale'][0]['wertI18n']['en'] = ''


FAELLE = [
    ('Ortsname in einem Merkmalswert', ortsname_in_einem_merkmal,
     'Zumikerstrasse'),
    ('Abgekürzter Ortsname in einer Beschreibung', abgekuerzter_ortsname,
     'Zumikerstr'),
    ('Ortsname nur in der französischen Fassung',
     ortsname_nur_auf_franzoesisch, 'Uitikon'),
    ('Merkmalswert steht in keiner Katalogoption',
     merkmalswert_ausserhalb_des_katalogs, 'steht in keiner Option'),
    ('Ein Merkmal der Quelle fehlt', merkmal_entfernt,
     'Merkmal der Quelle fehlt'),
    ('Ein Merkmal ohne Deckung in der Quelle', merkmal_erfunden,
     'ohne Deckung in der Quelle'),
    ('Falsche Bezeichnung eines Merkmals', falsche_bezeichnung,
     'Bezeichnung «Strassenklasse»'),
    ('Eine erfundene Normnummer', erfundene_norm, 'steht nicht im Katalog'),
    ('Ein Normtitel, der nicht zur Nummer gehört', falscher_normtitel,
     'weicht vom Katalog ab'),
    ('Eine Übersetzung fehlt', uebersetzung_fehlt, "nur ['de', 'fr', 'en']"),
    ('Ein Merkmal ohne englische Fassung', merkmal_ohne_uebersetzung,
     "nur ['de', 'fr', 'it']"),
]


def main():
    sauber = open(EINFUHR, 'rb').read()
    erkannt, uebersehen = 0, []

    for name, verfaelschen, erwartet in FAELLE:
        daten = lies()
        verfaelschen(daten)
        schreibe(daten)
        lauf = subprocess.run([sys.executable, os.path.join(HIER, 'pruefe.py')],
                              capture_output=True, text=True, encoding='utf-8')
        ausgabe = (lauf.stdout or '') + (lauf.stderr or '')
        # pruefe.py erzeugt am Schluss neu; der saubere Stand kommt zurück.
        open(EINFUHR, 'wb').write(sauber)
        gemeldet = lauf.returncode != 0 and erwartet in ausgabe
        print(f'  {"erkannt " if gemeldet else "ÜBERSEHEN"}  {name}')
        if gemeldet:
            erkannt += 1
        else:
            uebersehen.append(name)

    # Der zweite Lauf in pruefe.py hat die Datei überschrieben; sie steht
    # jetzt wieder auf dem gesicherten Stand. Sicherheitshalber neu erzeugen.
    subprocess.run([sys.executable, os.path.join(HIER, 'anlegen.py')],
                   capture_output=True, check=True)
    if open(EINFUHR, 'rb').read() != sauber:
        print('\nWARNUNG: Die neu erzeugte Datei weicht vom Ausgangsstand ab.')

    print(f'\n{erkannt} von {len(FAELLE)} eingebauten Fehlern gemeldet')
    if uebersehen:
        print('Übersehen:')
        for n in uebersehen:
            print(f'  {n}')
        sys.exit(1)


if __name__ == '__main__':
    main()
