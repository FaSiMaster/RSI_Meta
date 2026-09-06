# -*- coding: utf-8 -*-
"""Prüft die erzeugten Datensätze, bevor sie eingelesen werden.

Sechs Fragen: Stimmt die Zahl? Trägt ein Text einen Ortsbezug? Ist je Szene
genau ein Pflichtdefizit gesetzt? Ist keine Szene aktiv? Rechnet die
Beurteilung so, wie das Werkzeug rechnen würde? Und erzeugt ein zweiter Lauf
dieselbe Datei?

Aufruf:
    python daten/pruefe.py
"""

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
    woerter = {w for w in woerter if len(w) > 3}
    return sorted(woerter)


def texte(daten):
    """Jeder Benutzertext der Einfuhrdatei mit seiner Fundstelle."""
    aus = []
    for art in ('topics', 'scenes', 'deficits'):
        for e in daten.get(art, []):
            for feld, wert in e.items():
                if isinstance(wert, dict) and 'de' in wert:
                    aus.append((f"{art}/{e['id']}/{feld}", wert['de']))
                elif isinstance(wert, str) and feld not in ('id', 'sceneId', 'topicId'):
                    aus.append((f"{art}/{e['id']}/{feld}", wert))
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
    print(f'  Themen   {len(daten["topics"]):3}  (5 erwartet: 1 Oberthema, 4 Themen)')
    print(f'  Szenen   {len(daten["scenes"]):3}  ({len(standorte)} Standorte in der Auswahl)')
    print(f'  Defizite {len(daten["deficits"]):3}  ({len(auswahl)} Zeilen in der Auswahl)')
    print(f'  Beilage  {len(beilage["massnahmen"]):3}  Massnahmensätze')
    if len(daten['scenes']) != len(standorte):
        fehler.append('Szenenzahl weicht von der Standortzahl ab')
    if len(daten['deficits']) != len(auswahl):
        fehler.append('Defizitzahl weicht von der Zeilenzahl ab')
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
    for d in daten['deficits']:
        je_szene.setdefault(d['sceneId'], []).append(d)
    falsch = {s: sum(1 for d in ds if d['isPflicht'])
              for s, ds in je_szene.items()
              if sum(1 for d in ds if d['isPflicht']) != 1}
    print(f'  {len(je_szene)} Szenen, davon {len(falsch)} mit abweichender Zahl')
    for s, n in falsch.items():
        fehler.append(f'{s}: {n} Pflichtdefizite statt 1')

    # 4 — keine Szene aktiv, kein Bild, keine Verortung
    print('\n── Szenenzustand ──')
    aktiv = [s['id'] for s in daten['scenes'] if s['isActive']]
    mit_bild = [s['id'] for s in daten['scenes'] if s['panoramaBildUrl']]
    verortet = [d['id'] for d in daten['deficits'] if d['verortung'] or d['verortungen']]
    print(f'  aktiv {len(aktiv)}, mit Bild {len(mit_bild)}, verortet {len(verortet)} '
          '(alle drei müssen 0 sein)')
    fehler += [f'Szene aktiv: {s}' for s in aktiv]
    fehler += [f'Szene mit Bild: {s}' for s in mit_bild]
    fehler += [f'Defizit verortet: {d}' for d in verortet]

    # 5 — Beurteilung gegen die Normlogik
    print('\n── Beurteilung ──')
    tabelle = wichtigkeit_tabelle()
    abweichend = []
    for d in daten['deficits']:
        soll = beurteilung(d['kriteriumId'], d['kontext'],
                           d['correctAssessment']['abweichung'],
                           d['correctAssessment']['naca'])
        if soll != d['correctAssessment']:
            abweichend.append(f"{d['id']}: {d['correctAssessment']} statt {soll}")
    print(f'  {len(daten["deficits"])} Defizite gegen scoringEngine.ts gerechnet, '
          f'{len(abweichend)} Abweichungen')
    fehler += abweichend

    # Gegenprobe: die Prüfung misst wirklich
    probe = dict(daten['deficits'][0]['correctAssessment'])
    probe['unfallrisiko'] = 'gering' if probe['unfallrisiko'] != 'gering' else 'hoch'
    d0 = daten['deficits'][0]
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
