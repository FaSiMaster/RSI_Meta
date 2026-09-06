# -*- coding: utf-8 -*-
"""Erzeugt aus der RSI-Auswahl die Datensätze für das Werkzeug.

**Weg:** Das Skript schreibt eine Datei im Einfuhrformat des
Administrationsbereichs (`version: "rsi-v3"`), die dort über Export und Import
eingelesen wird. Dieser Weg passt zum bestehenden Datenfluss: Die Einfuhr läuft
durch die vorhandene Prüfung, ruft dieselben save-Funktionen wie die Oberfläche
und schreibt über die Edge Function nach Supabase. Ein Skript, das unmittelbar
in den localStorage schreiben wollte, käme von aussen gar nicht an ihn heran.

**Zweiter Lauf:** Alle Kennungen sind aus der Standort-Kennung abgeleitet und
damit stabil. Die save-Funktionen ersetzen einen Datensatz gleicher Kennung,
statt einen zweiten anzulegen — ein zweiter Import verdoppelt nichts.

Aufruf:
    python daten/anlegen.py

Erzeugt:
    daten/rsi-import_2026-09-06.json      Einfuhrdatei für den Admin
    daten/massnahmen_2026-09-06.json      Beilage, siehe unten
    C:/ClaudeAI/RSI_Analyse/output/AUFNAHMELISTE_ARBEIT_2026-09-06.md

Die Massnahmentexte gehören vorläufig nicht ins Werkzeug. Sie liegen als
Beilage neben der Einfuhrdatei — im Ordner `daten/`, den Vite nicht bündelt,
also ausserhalb des ausgelieferten Erzeugnisses.

Die Arbeitsliste verbindet den neutralen Szenennamen mit dem realen Ort und
gehört deshalb nicht in dieses Repositorium.
"""

import csv
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

from entscheide_2026_09_06 import (  # noqa: E402
    THEMEN, SZENEN, BESCHREIBUNGEN, NORMREFS, NORMREFS_KRITERIUM,
    NORMREFS_DEFIZIT, MASSNAHMEN, BESTAND_BESCHREIBUNG,
)
import sprachen_2026_09_06 as SPR  # noqa: E402
from normlogik import beurteilung  # noqa: E402

AUSWAHL = 'C:/ClaudeAI/RSI_Analyse/output/RSI_Aufnahme_Auswahl_2026-09-06.csv'
BESTAND = os.path.join(HIER, 'bestand')
BAU = 'C:/ClaudeAI/RSI_Analyse/output/THEMEN_BAUANLEITUNG.html'
MERKMALE = os.path.join(HIER, 'merkmale_2026-09-06.json')
ARBEITSLISTE = ('C:/ClaudeAI/RSI_Analyse/output/'
                'AUFNAHMELISTE_ARBEIT_2026-09-06.md')

# Der Werkzeugquellbaum ist hier die massgebende Fassung: Die Bezeichnung
# eines Sicherheitskriteriums und der Merkmalskatalog stehen dort, und ein
# zweites Verzeichnis daneben liefe irgendwann auseinander.
KRITERIUM_LABELS_TS = os.path.join(HIER, '..', 'src', 'data',
                                   'kriteriumLabels.ts')
MERKMALSKATALOG_TS = os.path.join(HIER, '..', 'src', 'data',
                                  'strassenmerkmale.ts')
REGELWERK_TS = os.path.join(HIER, '..', 'src', 'data', 'regelwerkKatalog.ts')

LAND = 'CH'
STAND = '2026-09-06'
SPRACHEN = ('de', 'fr', 'it', 'en')


def lies_bestand():
    """Der Themen-, Szenen- und Defizitbestand, wie er in Supabase steht.

    Er kommt in die Einfuhrdatei, obwohl er sich nicht ändert. Grund: Eine
    Datei, die nur die neuen Datensätze führt, überlässt es dem Zufall, ob der
    Bestand daneben bestehen bleibt — sie hängt davon ab, dass die Anwendung
    beim Einlesen ihren vollen Stand kennt. Trägt die Datei den ganzen Stand,
    stellt jeder Import ihn her, und zwar auch dann, wenn ein Gerät ihn
    verloren hat. Die Kennungen kollidieren nicht; jeder Datensatz ersetzt
    genau sich selbst.

    Fehlt der Ordner, läuft das Skript ohne Bestand weiter und sagt es.
    """
    if not os.path.isdir(BESTAND):
        print('  Hinweis: kein Bestand unter daten/bestand/ — die Einfuhrdatei')
        print('           trägt dann nur die neuen Datensätze.')
        return [], [], []
    def lies(name):
        pfad = os.path.join(BESTAND, name)
        if not os.path.exists(pfad):
            return []
        return [z['data'] for z in json.load(open(pfad, encoding='utf-8'))]
    return (lies('rsi_topics.json'), lies('rsi_scenes.json'),
            lies('rsi_deficits.json'))


def leer_ml(de=''):
    """Mehrsprachiges Feld, nur deutsch besetzt.

    Für Felder, die keine Entsprechung in einer anderen Sprache haben — die
    Szenenbeschreibung etwa ist überall leer.
    """
    return {'de': de, 'fr': '', 'it': '', 'en': ''}


def ml(de, andere=None):
    """Mehrsprachiges Feld aus dem deutschen Text und den Übersetzungen.

    Fehlt eine Übersetzung, bleibt das Feld leer statt den deutschen Text zu
    tragen: Ein deutscher Satz unter der Kennung «fr» sieht aus wie eine
    Übersetzung und ist keine. Die Anwendung fällt beim Lesen ohnehin auf
    Deutsch zurück (`ml()` in appData.ts).
    """
    andere = andere or {}
    aus = {'de': saeubere(de) if de else ''}
    for s in ('fr', 'it', 'en'):
        wert = andere.get(s, '')
        aus[s] = saeubere(wert) if wert else ''
    return aus


def lies_kriteriumlabels():
    """Die deutschen Bezeichnungen der Sicherheitskriterien.

    Gelesen aus src/data/kriteriumLabels.ts, nicht aus der Kennung gebildet:
    Aus «velolaengsfuehrung_art» wird sonst «Velolaengsfuehrung art» — mit
    ae/oe/ue, wo Umlaute hingehören, und mit einem kleingeschriebenen Wort,
    das gross gehört.
    """
    text = open(KRITERIUM_LABELS_TS, encoding='utf-8').read()
    labels = {m.group(1): m.group(2)
              for m in re.finditer(r"^\s{2}(\w+):\s+'([^']+)',", text, re.M)}
    if not labels:
        raise SystemExit('kriteriumLabels.ts: keine Bezeichnungen gelesen')
    return labels


def lies_merkmalskatalog():
    """Kennung, Bezeichnung und Wertliste je Merkmal, in der Reihenfolge des
    Katalogs. Gelesen aus src/data/strassenmerkmale.ts."""
    text = open(MERKMALSKATALOG_TS, encoding='utf-8').read()
    aus = []
    for m in re.finditer(
            r"id:\s*'([\w]+)',\s*\n\s*label:\s*'([^']+)',\s*\n"
            r"\s*optionen:\s*\[([^\]]*)\]", text):
        optionen = re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(3))
        aus.append((m.group(1), m.group(2), optionen))
    if not aus:
        raise SystemExit('strassenmerkmale.ts: kein Merkmal gelesen')
    return aus


def lies_regelwerk():
    """Nummer und Titel der Normen aus src/data/regelwerkKatalog.ts.

    Der Normbezug eines Defizits wird daraus gebildet, nicht daneben
    geschrieben. Steht eine Nummer nicht im Katalog, bricht die Erzeugung ab:
    Entweder ist die Nummer falsch, oder der Katalog ist unvollständig — beides
    gehört gesehen, nicht überschrieben.
    """
    text = open(REGELWERK_TS, encoding='utf-8').read()
    aus = {}
    for m in re.finditer(r"nummer:\s*'([^']+)',\s*titel:\s*'([^']+)'", text):
        aus[m.group(1)] = m.group(2)
    if not aus:
        raise SystemExit('regelwerkKatalog.ts: kein Eintrag gelesen')
    return aus


def normbezug(regelwerk, sid, nr, kriterium):
    """Der Normbezug eines Defizits, aus drei belegten Quellen.

    Erstens, was der Inspektionsbericht im Text des Defizits nennt. Zweitens,
    was SN 641 700:2022 Tab. 2 dem Sicherheitskriterium zuordnet. Drittens die
    Auswahl aus Tab. 2 für dieses eine Defizit, dort wo die Liste des
    Kriteriums zu umfangreich ist. Die Reihenfolge ist fest, damit ein zweiter
    Lauf dieselbe Datei erzeugt.
    """
    nummern = list(NORMREFS.get((sid, nr), []))
    for quelle in (NORMREFS_KRITERIUM.get(kriterium, []),
                   NORMREFS_DEFIZIT.get((sid, nr), [])):
        for n in quelle:
            if n not in nummern:
                nummern.append(n)
    aus = []
    for n in nummern:
        titel = regelwerk.get(n)
        if titel is None:
            raise SystemExit(
                f'{sid}/{nr}: «{n}» steht nicht in regelwerkKatalog.ts')
        aus.append(f'{n} — {titel}')
    return aus


def zahl(wert, sprache):
    """Tausendertrennung je Sprache.

    Deutsch, Französisch und Italienisch: Festabstand ab fünf Ziffern,
    vierstellige Zahlen ungegliedert (Weisungen der Bundeskanzlei, Rz. 512;
    Instructions Ziff. 4; Istruzioni Ziff. 8.3). Englisch: Komma im
    Fliesstext (General Style Guide Kap. 7).
    """
    s = str(int(wert))
    if sprache == 'en':
        return f'{int(wert):,}'
    if len(s) < 5:
        return s
    teile = []
    while len(s) > 3:
        teile.insert(0, s[-3:])
        s = s[:-3]
    teile.insert(0, s)
    return ' '.join(teile)


def merkmale_der_szene(katalog, werte):
    """Die Strassenmerkmale einer Szene, in der Reihenfolge des Katalogs.

    Ein Merkmal, das die Quelle nicht führt, wird gar nicht erst angelegt:
    Ein leeres Merkmal erschiene im Administrationsbereich als Zeile ohne
    Wert und liesse offen, ob niemand es erfasst hat oder ob es nicht
    zutrifft.
    """
    aus = []
    for kennung, label, _optionen in katalog:
        wert = werte.get(kennung)
        if not wert:
            continue
        label_uebersetzt = SPR.MERKMAL_LABEL.get(kennung, {})
        if kennung == 'dtv':
            wert_ml = {s: zahl(wert, s) for s in SPRACHEN}
        else:
            wert_uebersetzt = SPR.MERKMAL_WERT.get(wert, {})
            wert_ml = {'de': wert}
            wert_ml.update({s: wert_uebersetzt.get(s, '') for s in
                            ('fr', 'it', 'en')})
        aus.append({
            'id': kennung,
            'labelI18n': {'de': label,
                          **{s: label_uebersetzt.get(s, '') for s in
                             ('fr', 'it', 'en')}},
            'wertI18n': wert_ml,
        })
    return aus


def saetze(text):
    """Der senkrechte Strich der Quelle trennt mehrere Massnahmen. Aus jeder
    wird ein Satz."""
    teile = [t.strip() for t in text.split('|') if t.strip()]
    return ' '.join(t if t.endswith(('.', '!', '?')) else t + '.'
                    for t in teile)


def erklaerung(art, text_de, text_uebersetzt):
    """Die Erklärung auf der Lernkarte: was der Inspektionsbericht als
    Massnahme vorschlägt.

    Weggelassen ist die Zuständigkeit. Sie steht in der Quelle als Kürzel
    einer Organisationseinheit; wer das Kürzel nicht kennt, liest nichts
    daraus, und aufgelöst würde es raten heissen.
    """
    arten = [a.strip() for a in art.split(';') if a.strip()]
    aus = {}
    for sprache in SPRACHEN:
        if sprache == 'de':
            art_text = ', '.join(arten)
            inhalt = saetze(text_de)
        else:
            uebersetzt = [SPR.MASSNAHMENART.get(a, {}).get(sprache, '')
                          for a in arten]
            if not all(uebersetzt):
                aus[sprache] = ''
                continue
            art_text = ', '.join(uebersetzt)
            inhalt = text_uebersetzt.get(sprache, '')
        if not inhalt:
            aus[sprache] = ''
            continue
        aus[sprache] = SPR.ERKLAERUNG_RAHMEN[sprache].format(
            art=art_text, text=saeubere(inhalt))
    return aus


def lies_auswahl():
    with open(AUSWAHL, encoding='utf-8-sig') as f:
        return list(csv.DictReader(f, delimiter=';'))


def lies_bauanleitung():
    """kriteriumId, kategorie, Abweichung und NACA je Defizit."""
    h = open(BAU, encoding='utf-8').read()
    marken = list(re.finditer(
        r'Perimeter\s+(\d+)\s*(?:&middot;|·)\s*LV95\s+(\d+)\s*/\s*(\d+)', h))
    vorschlag = {}
    for i, m in enumerate(marken):
        ende = marken[i + 1].start() if i + 1 < len(marken) else len(h)
        block = h[m.start():ende]
        standort = f'P{m.group(1)}-{m.group(2)}-{m.group(3)}'
        for d in re.finditer(r'<li class="dfz pk-(\w)">(.*?)</li>', block, re.S):
            praed, inner = d.group(1), d.group(2)
            nr = re.search(r'RSI-Defizit\s*(\d+)', inner)
            krit = re.search(r'<th>kriteriumId</th><td><code>([^<]+)</code>', inner)
            kat = re.search(r'<th>kategorie</th><td><code>([^<]+)</code>', inner)
            abw = re.search(r'<th>Abweichung</th><td><b>(\w+)</b>', inner)
            naca = re.search(r'<th>NACA</th><td><b>(\d)</b>', inner)
            if not (nr and krit and abw and naca):
                raise SystemExit(f'Unvollständiger Block bei {standort}')
            vorschlag[(standort, nr.group(1))] = {
                'praedikat': praed,
                'kriteriumId': krit.group(1),
                'kategorie': kat.group(1) if kat else None,
                'abweichung': abw.group(1),
                'naca': int(naca.group(1)),
            }
    return vorschlag


def saeubere(text):
    """Vereinheitlicht Leerzeichen; ersetzt den Geviert- durch den
    Halbgeviertstrich und setzt vor Prozent und Einheit ein Leerzeichen."""
    t = re.sub(r'\s+', ' ', text).strip()
    t = t.replace('—', '–')
    t = re.sub(r'(\d)\s*%', r'\1 %', t)
    t = re.sub(r'(\d)m\b', r'\1 m', t)
    t = re.sub(r'(\d)\s*km/h', r'\1 km/h', t)
    return t


# Kalibrierungsdefizite: Prädikat D und U. Sie tragen wenig Handlungsdruck und
# sind als Einstufungsübung gedacht, nicht als Suchaufgabe.
KALIBRIERUNG = {'D', 'U'}
# Deutlichkeit des stärksten Prädikats einer Szene: A und B sind deutlich.
DEUTLICH = {'A': 0, 'B': 1, 'C': 2, 'D': 3, 'U': 4}


def main():
    zeilen = lies_auswahl()
    vorschlag = lies_bauanleitung()
    labels = lies_kriteriumlabels()
    katalog = lies_merkmalskatalog()
    regelwerk = lies_regelwerk()
    merkmale = json.load(open(MERKMALE, encoding='utf-8'))['merkmale']

    # Die deutschen Bezeichnungen stehen in beiden Dateien: im Quellbaum, wo
    # die Anwendung sie liest, und in der Sprachdatei, wo die Übersetzung
    # danebensteht. Läuft das auseinander, ist die Übersetzung zu einem
    # anderen Begriff gemacht worden als dem, der angezeigt wird.
    for kid, satz in SPR.KRITERIEN.items():
        if labels.get(kid) != satz['de']:
            raise SystemExit(
                f'{kid}: kriteriumLabels.ts sagt «{labels.get(kid)}», die '
                f'Sprachdatei «{satz["de"]}»')

    standorte = {}
    for z in zeilen:
        standorte.setdefault(z['Standort_ID'], []).append(z)

    fehlend = [s for s in standorte if s not in SZENEN]
    if fehlend:
        raise SystemExit(f'Ohne Entscheid: {fehlend}')

    # ── Reihenfolge der Szenen ──
    # Rangfolge laut Auftrag: wenige Defizite vor vielen, deutliches Prädikat
    # vor feinem, Szenen ohne Kalibrierungsdefizit vor solchen mit.
    def rang(sid):
        ds = standorte[sid]
        praedikate = [vorschlag[(sid, d['Defizit_Nr'])]['praedikat'] for d in ds]
        staerkstes = min(DEUTLICH[p] for p in praedikate)
        hat_kalibrierung = any(p in KALIBRIERUNG for p in praedikate)
        return (len(ds), staerkstes, 1 if hat_kalibrierung else 0, sid)

    reihenfolge = sorted(standorte, key=rang)

    themen_aus = []
    for tid, parent, sort, icon, name, beschr in THEMEN:
        sp = SPR.THEMEN.get(tid, {})
        t = {
            'id': tid,
            'nameI18n': ml(name, sp.get('name')),
            'beschreibungI18n': ml(beschr, sp.get('beschreibung')),
            'iconKey': icon,
            'sortOrder': sort,
            'isActive': True,
            'parentTopicId': parent,
            'kursExklusiv': False,
        }
        if parent is None:
            t['country'] = LAND
        themen_aus.append(t)

    szenen_aus, defizite_aus, massnahmen, arbeitsliste = [], [], {}, []

    for i, sid in enumerate(reihenfolge, start=1):
        ds = standorte[sid]
        e = SZENEN[sid]
        erste = ds[0]
        szene_id = f'SZ_2026_1{i:02d}'

        sp = SPR.SZENEN.get(sid, {})
        szenen_aus.append({
            'id': szene_id,
            'topicId': e['thema'],
            'nameI18n': ml(e['name'], sp.get('name')),
            'beschreibungI18n': leer_ml(''),
            'bemerkungI18n': ml(e['bemerkung'], sp.get('bemerkung')),
            'kontext': e['kontext'],
            'strassenmerkmale': merkmale_der_szene(katalog,
                                                   merkmale.get(sid, {})),
            'vorschauBilder': [],
            'vorschauBild1': None,
            'vorschauBild2': None,
            'panoramaBildUrl': None,
            'startblick': None,
            'isActive': False,          # ohne Panorama nicht im Training
            'createdAt': 1757116800000,  # 6. September 2026, fest für Idempotenz
            'country': LAND,
        })

        # Pflichtdefizit: das mit dem stärksten Prädikat, bei Gleichstand das
        # erste in der Reihenfolge des Berichts.
        rangliste = sorted(
            ds, key=lambda d: (DEUTLICH[vorschlag[(sid, d['Defizit_Nr'])]['praedikat']],
                               int(d['Defizit_Nr'])))
        pflicht_nr = rangliste[0]['Defizit_Nr']

        for j, d in enumerate(ds, start=1):
            nr = d['Defizit_Nr']
            v = vorschlag[(sid, nr)]
            defizit_id = f'SD_01{i:02d}{j}'
            beschreibung = BESCHREIBUNGEN.get((sid, nr)) or saeubere(d['Beschreibung'])
            massnahmenart = saeubere(d['Massnahmenart'])
            massnahmentext = saeubere(
                MASSNAHMEN.get((sid, nr)) or d['Massnahmentext'])
            defizite_aus.append({
                'id': defizit_id,
                'sceneId': szene_id,
                'topicId': e['thema'],
                'nameI18n': ml(labels[v['kriteriumId']],
                               SPR.KRITERIEN.get(v['kriteriumId'])),
                'beschreibungI18n': ml(beschreibung,
                                       SPR.BESCHREIBUNGEN.get((sid, nr))),
                'kriteriumId': v['kriteriumId'],
                'kontext': e['kontext'],
                # Die Einfuhr rechnet nichts nach; die Werte müssen fertig
                # dastehen. Gerechnet wird mit dem, was in scoringEngine.ts
                # steht — Wichtigkeit aus der Tabelle, Relevanz und Risiko aus
                # den beiden Matrizen.
                'correctAssessment': beurteilung(
                    v['kriteriumId'], e['kontext'], v['abweichung'], v['naca']),
                'isPflicht': nr == pflicht_nr,
                'isBooster': False,
                'normRefs': normbezug(regelwerk, sid, nr, v['kriteriumId']),
                'kategorie': v['kategorie'],
                'erklaerungI18n': erklaerung(
                    massnahmenart, massnahmentext,
                    SPR.MASSNAHMEN.get((sid, nr), {})),
                'verortung': None,
                'verortungen': None,
            })

            massnahmen[defizit_id] = {
                'massnahmenart': massnahmenart,
                # Dieselbe Regel wie bei den Beschreibungen: kein Ortsbezug.
                'massnahmentext': massnahmentext,
                'zustaendigkeit': saeubere(d['Zustaendigkeit']),
            }

        arbeitsliste.append({
            'szene_id': szene_id,
            'name': e['name'],
            'thema': e['thema'],
            'kontext': e['kontext'],
            'gemeinde': erste['Gemeinde'],
            'strasse': erste['Strasse'],
            'strassennummer': erste['Strassennummer'],
            'perimeter': erste['Perimeter_ID'],
            'lv95': f"{erste['LV95_E']} / {erste['LV95_N']}",
            'wgs84': f"{erste['WGS84_Breite']}, {erste['WGS84_Laenge']}",
            'lage': erste['Lage'],
            'tempo': erste['Signalisierte_Geschwindigkeit'],
            'karte': erste['Karte_des_Bundes'],
            'ansicht': erste['Strassenansicht'],
            'defizite': [
                {'id': f'SD_01{i:02d}{j}', 'nr': d['Defizit_Nr'],
                 'praedikat': vorschlag[(sid, d['Defizit_Nr'])]['praedikat'],
                 'kriterium': vorschlag[(sid, d['Defizit_Nr'])]['kriteriumId'],
                 'pflicht': d['Defizit_Nr'] == pflicht_nr,
                 'text': BESCHREIBUNGEN.get((sid, d['Defizit_Nr']))
                         or saeubere(d['Beschreibung'])}
                for j, d in enumerate(ds, start=1)
            ],
        })

    # Bestand voranstellen. Kollidierende Kennungen gäbe es nicht — geprüft
    # wird es trotzdem, denn eine Kollision hiesse, dass ein bestehender
    # Datensatz überschrieben würde.
    b_themen, b_szenen, b_defizite = lies_bestand()

    # Eine Beschreibung des Bestands ist zu lang für die Themenkarte und wird
    # gekürzt. Sonst bleibt der Bestand unangetastet.
    for thema in b_themen:
        kurz = BESTAND_BESCHREIBUNG.get(thema['id'])
        if kurz:
            thema['beschreibungI18n'] = dict(thema['beschreibungI18n'], de=kurz)
    for name, bestand, neue in (('Themen', b_themen, themen_aus),
                                ('Szenen', b_szenen, szenen_aus),
                                ('Defizite', b_defizite, defizite_aus)):
        doppelt = {x['id'] for x in bestand} & {x['id'] for x in neue}
        if doppelt:
            raise SystemExit(f'{name}: Kennung doppelt vergeben: {sorted(doppelt)}')

    einfuhr = {
        'version': 'rsi-v3',
        'erzeugt': STAND,
        'quelle': 'RSI_Aufnahme_Auswahl_2026-09-06.csv',
        'hinweis': 'Trägt den vollständigen Stand: bestehende Datensätze und '
                   'die neuen aus der Auswahl. Ein Import stellt damit den '
                   'ganzen Bestand her.',
        'topics': b_themen + themen_aus,
        'scenes': b_szenen + szenen_aus,
        'deficits': b_defizite + defizite_aus,
    }
    schreibe(os.path.join(HIER, f'rsi-import_{STAND}.json'), einfuhr)
    schreibe(os.path.join(HIER, f'massnahmen_{STAND}.json'), {
        'stand': STAND,
        'hinweis': 'Massnahmentexte zur Auswahl vom 6. September 2026. Nicht im '
                   'Werkzeug erfasst; ein eigener Schritt dafür ist offen.',
        'massnahmen': massnahmen,
    })
    schreibe_arbeitsliste(arbeitsliste)

    print(f'Themen   {len(themen_aus):3} neu  + {len(b_themen):3} bestehend'
          f'  = {len(einfuhr["topics"])}')
    print(f'Szenen   {len(szenen_aus):3} neu  + {len(b_szenen):3} bestehend'
          f'  = {len(einfuhr["scenes"])}')
    print(f'Defizite {len(defizite_aus):3} neu  + {len(b_defizite):3} bestehend'
          f'  = {len(einfuhr["deficits"])}, davon Pflicht neu '
          f'{sum(1 for d in defizite_aus if d["isPflicht"])}')
    print(f'Massnahmen {len(massnahmen)}')
    print(f'\nEinfuhrdatei: daten/rsi-import_{STAND}.json')
    print(f'Beilage:      daten/massnahmen_{STAND}.json')
    print(f'Arbeitsliste: {ARBEITSLISTE}')


def schreibe(pfad, inhalt):
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    with open(pfad, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(inhalt, f, ensure_ascii=False, indent=2)
        f.write('\n')


def schreibe_arbeitsliste(eintraege):
    z = ['# Aufnahmeliste 360-Grad-Bilder – Stand 6. September 2026', '',
         '> Verbindet den neutralen Szenennamen mit dem realen Ort.',
         '> **Intern, nicht zur Weitergabe und nicht im Repositorium.**', '',
         f'{len(eintraege)} Szenen, '
         f'{sum(len(e["defizite"]) for e in eintraege)} Defizite. Die Szenen sind '
         'im Werkzeug angelegt und auf inaktiv gesetzt; sie erscheinen im '
         'Training erst, wenn das Bild liegt und Sie sie freischalten.', '']

    for e in eintraege:
        z += [f'## {e["szene_id"]} – {e["name"]}', '',
              f'**Ort:** {e["gemeinde"]}, {e["strasse"]} (Strasse '
              f'{e["strassennummer"]}), Perimeter {e["perimeter"]}  ',
              f'**Koordinate:** LV95 {e["lv95"]} · WGS 84 {e["wgs84"]}  ',
              f'**Lage laut Perimeter:** {e["lage"]}, signalisiert {e["tempo"]}  ',
              f'**Kontext im Werkzeug:** {e["kontext"]}  ',
              f'**Karte:** {e["karte"]}  ',
              f'**Strassenansicht:** {e["ansicht"]}', '',
              '**Blickrichtung für die Aufnahme**', '']

        richtungen = set()
        for d in e['defizite']:
            t = d['text'].lower()
            if 'nach links' in t:
                richtungen.add('Blick nach links aus der wartenden Position')
            if 'nach rechts' in t:
                richtungen.add('Blick nach rechts aus der wartenden Position')
            if 'nach norden' in t or 'richtung nord' in t:
                richtungen.add('Blick nach Norden')
            if 'süd' in t:
                richtungen.add('Blick nach Süden')
            if 'kurve' in t:
                richtungen.add('Blick in den Kurvenverlauf, aus Fahrtrichtung')
            if 'trottoir' in t or 'fussweg' in t or 'gehweg' in t:
                richtungen.add('Blick entlang des Trottoirs')
            if 'bankett' in t or 'stützmauer' in t or 'böschung' in t:
                richtungen.add('Blick auf den Seitenraum')
        if not richtungen:
            richtungen.add('Blick aus Fahrtrichtung auf die Anlage')
        for r in sorted(richtungen):
            z.append(f'- {r}')
        z += ['', '**Zu verortende Defizite**', '',
              '| Kennung | RSI-Nr | Prädikat | Pflicht | Kriterium | Was zu sehen sein muss |',
              '|---|---|---|---|---|---|']
        for d in e['defizite']:
            kurz = d['text'][:150] + ('…' if len(d['text']) > 150 else '')
            z.append(f'| {d["id"]} | {d["nr"]} | {d["praedikat"]} | '
                     f'{"ja" if d["pflicht"] else "nein"} | {d["kriterium"]} | {kurz} |')
        z += ['', '---', '']

    os.makedirs(os.path.dirname(ARBEITSLISTE), exist_ok=True)
    with open(ARBEITSLISTE, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(z))


if __name__ == '__main__':
    main()
