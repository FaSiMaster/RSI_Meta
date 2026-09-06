# -*- coding: utf-8 -*-
"""Liest die normativen Werte aus `src/data/scoringEngine.ts`.

Gelesen, nicht abgeschrieben. Die Wichtigkeitstabelle und die beiden Matrizen
stammen aus dem Fachkurs FK RSI; eine zweite Fassung in Python wäre eine
zweite Wahrheit, die beim nächsten Fachkurs auseinanderläuft. Diese Datei
parst deshalb die Quelle und rechnet mit dem, was dort steht.

Die Einfuhrdatei muss die fertigen Werte tragen: Die Einfuhr im
Administrationsbereich ruft `saveDeficit` unmittelbar und rechnet nichts nach.
Was hier falsch steht, steht danach in den Daten.
"""

import os
import re

SACRED = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      '..', 'src', 'data', 'scoringEngine.ts')


def _quelle():
    with open(os.path.normpath(SACRED), encoding='utf-8') as f:
        return f.read()


def wichtigkeit_tabelle():
    """kriteriumId → {'io': …, 'ao': …}. Ein leerer Wert heisst: gilt nicht."""
    q = _quelle()
    block = q[q.index('WICHTIGKEIT_TABLE'):]
    tabelle = {}
    for m in re.finditer(r"^\s*(\w+):\s*\{\s*io:\s*'([^']*)',\s*ao:\s*'([^']*)'",
                         block, re.M):
        tabelle[m.group(1)] = {'io': m.group(2), 'ao': m.group(3)}
    if len(tabelle) < 50:
        raise SystemExit(f'WICHTIGKEIT_TABLE unvollständig gelesen: {len(tabelle)}')
    return tabelle


def _matrix(funktionsname):
    q = _quelle()
    start = q.index(f'export function {funktionsname}')
    block = q[start:q.index('\n}', start)]
    matrix = {}
    for m in re.finditer(r"(\w+):\s*\{([^}]*)\}", block):
        zeile = {}
        for k, v in re.findall(r"(\w+):\s*'(\w+)'", m.group(2)):
            zeile[k] = v
        if zeile:
            matrix[m.group(1)] = zeile
    return matrix


def calc_relevanz_sd(wichtigkeit, abweichung):
    m = _matrix('calcRelevanzSD')
    return m[wichtigkeit][abweichung]


def naca_to_schwere(n):
    """Die Schwellen stehen als Vergleiche im Quelltext, nicht als Tabelle."""
    q = _quelle()
    block = q[q.index('export function nacaToSchwere'):]
    block = block[:block.index('\n}')]
    stufen = re.findall(r"n\s*<=\s*(\d+)\)\s*return\s*'(\w+)'", block)
    rest = re.search(r"return\s*'(\w+)'\s*$", block.strip())
    for grenze, wert in stufen:
        if n <= int(grenze):
            return wert
    if not rest:
        raise SystemExit('nacaToSchwere: Rückfallwert nicht gefunden')
    return rest.group(1)


def calc_unfallrisiko(relevanz_sd, unfallschwere):
    m = _matrix('calcUnfallrisiko')
    return m[relevanz_sd][unfallschwere]


def beurteilung(kriterium_id, kontext, abweichung, naca):
    """Die vollständige Musterlösung eines Defizits, wie das Werkzeug sie
    berechnen würde. Wirft, wenn das Kriterium im Kontext nicht gilt."""
    tabelle = wichtigkeit_tabelle()
    if kriterium_id not in tabelle:
        raise SystemExit(f'Kriterium unbekannt: {kriterium_id}')
    wichtigkeit = tabelle[kriterium_id][kontext]
    if not wichtigkeit:
        raise SystemExit(
            f'«{kriterium_id}» trägt im Kontext {kontext} keinen Wert. '
            'Entweder passt der Kontext nicht oder das Kriterium.')
    relevanz = calc_relevanz_sd(wichtigkeit, abweichung)
    schwere = naca_to_schwere(naca)
    return {
        'wichtigkeit': wichtigkeit,
        'abweichung': abweichung,
        'relevanzSD': relevanz,
        'naca': naca,
        'unfallschwere': schwere,
        'unfallrisiko': calc_unfallrisiko(relevanz, schwere),
    }
