# -*- coding: utf-8 -*-
"""Entscheide zur Aufnahme der Auswahl vom 6. September 2026.

Diese Datei hält fest, was nicht aus den Quelldaten folgt, sondern entschieden
wurde: der Kontext je Szene, der neutrale Szenenname, und jede Beschreibung, in
der ein Ortsbezug durch das ersetzt ist, was fachlich gemeint war.

Sie ist bewusst getrennt vom Erzeugungsskript. Wer die Entscheide prüfen will,
liest diese Datei; wer den Ablauf prüfen will, liest `anlegen.py`.

Quelle: RSI_Aufnahme_Auswahl_2026-09-06.csv (36 Zeilen, 13 Standorte) und
THEMEN_BAUANLEITUNG.html, beide unter C:/ClaudeAI/RSI_Analyse/output/.
"""

# ── Themen ───────────────────────────────────────────────────────────────────
# Die Kennungen sind sprechend und stabil: Ein zweiter Lauf trifft dieselben
# Datensätze und ersetzt sie, statt neue anzulegen.

THEMEN = [
    # (id, parentTopicId, sortOrder, iconKey, name, beschreibung)
    # Die Beschreibungen bleiben kurz und einzeilig: Die Themenkarte am
    # Einstieg soll bei allen Themen gleich hoch sein, und der Bestand liegt
    # zwischen 26 und 60 Zeichen.
    ('tp-sicht', None, 6, 'eye',
     'Sicht',
     'Sichtverhältnisse als eigenes Prüffeld. Fasst die Themen darunter zusammen.'),
    ('tp-sicht-knoten', 'tp-sicht', 1, 'junction',
     'Sicht am Knoten',
     'Einmündungen, Zufahrten und Grundstücksausfahrten. Der Blick geht zur Seite.'),
    ('tp-sicht-strecke', 'tp-sicht', 2, 'road',
     'Sicht auf der Strecke',
     'Anhalte-, Kurven- und Überholsichtweite. Der Blick geht nach vorn.'),
    ('tp-strassenrand-ao', None, 7, 'tree',
     'Strassenrand ausserorts',
     'Der Seitenraum beim Abkommen von der Fahrbahn: Hindernisse, Bankett, '
     'Rückhaltesysteme.'),
    ('tp-ausruestung', None, 8, 'sign',
     'Ausrüstung',
     'Signalisation, Markierung, optische Leiteinrichtung. Hier zählt das '
     'Einstufen, nicht das Finden.'),
]

# «Veloverkehr» besteht bereits und wird nicht angefasst.
THEMA_VELO = 'velo'


# ── Szenen ───────────────────────────────────────────────────────────────────
# Schlüssel ist die Standort-Kennung aus der Auswahl. Je Szene:
#   thema     Zielthema im Werkzeug
#   name      neutraler Name: Anlagetyp, Lage, signalisierte Geschwindigkeit
#   kontext   io oder ao — der Entscheid, der über die Wichtigkeit durchwirkt
#   grund     warum dieser Kontext, am Defizittext belegt
#   bemerkung Hinweis der Kursleitung, erscheint vor dem Start

SZENEN = {
    'P254-2676390-1246987': dict(
        thema='tp-sicht-knoten',
        name='Grundstücksausfahrten an Hauptstrasse, innerorts 50 km/h',
        kontext='io',
        grund='Trottoirüberfahrt, Fussweg und Grundstückszugänge direkt über die '
              'Fahrbahn — das ist ein innerörtlicher Querschnitt, obwohl der '
              'Perimeter über die Ortsgrenze reicht.',
        bemerkung='Mehrere Zufahrten auf kurzer Strecke. Achten Sie darauf, aus '
                  'welcher Position die wartende Person schaut.',
    ),
    'P255-2676349-1235949': dict(
        thema='tp-sicht-knoten',
        name='Knotenzufahrt mit Mittelinsel, innerorts 50 km/h',
        kontext='io',
        grund='Trottoir und Mittelinsel; der Perimeter ist als innerorts geführt.',
        bemerkung='Der Zufahrtsweg mündet in eine Hauptstrasse. Prüfen Sie die '
                  'Sicht nach beiden Seiten.',
    ),
    'P253-2676600-1237129': dict(
        thema='tp-sicht-knoten',
        name='Grundstücksausfahrt neben Tankstellenzufahrt, innerorts 50 km/h',
        kontext='io',
        grund='Trottoir, Parkierung und Tankstellenzufahrt; Perimeter innerorts.',
        bemerkung='Zwei Zufahrten liegen nahe beieinander. Die Frage ist, wer '
                  'wen sieht.',
    ),
    'P252-2675601-1259482': dict(
        thema='tp-sicht-knoten',
        name='Einmündung eines Zufahrtswegs in Kurve mit Böschung, ausserorts',
        kontext='ao',
        grund='ENTSCHIED GEGEN DEN VORSCHLAG: Die Bauanleitung schlug innerorts '
              'vor. Der Defizittext nennt eine Mindestsichtweite von 120 m für '
              'eine Strasse des Typs RVS, ein fehlendes Bankett und Leitpfosten '
              'mit Reflektoren — alles Merkmale des Ausserortsbereichs. Der '
              'Kontext ao setzt für «bankette» die Wichtigkeit gross statt klein.',
        bemerkung='Der Weg mündet in einer Kurve. Die Sicht nach links ist die '
                  'entscheidende Frage.',
    ),
    'P254-2676144-1246650': dict(
        thema='tp-sicht-knoten',
        name='Schiefwinklige landwirtschaftliche Zufahrt, ausserorts 50 km/h',
        kontext='ao',
        grund='ENTSCHIED GEGEN DEN VORSCHLAG: Die Bauanleitung schlug innerorts '
              'vor. Der Text nennt eine landwirtschaftliche Ein- und Ausfahrt, '
              'Hochspannungsmasten als Sichthindernis und einen Begegnungsfall '
              'Lastwagen gegen Personenwagen auf knapp 6,0 m Fahrbahn. Das ist '
              'ein Ausserortsquerschnitt ohne Trottoir. Der Kontext ao setzt für '
              '«querschnitt» gross statt mittel.',
        bemerkung='Die Zufahrt trifft die Fahrbahn schiefwinklig. Achten Sie '
                  'darauf, was das für den Blick nach links bedeutet.',
    ),
    'P260-2687395-1242447': dict(
        thema='tp-sicht-strecke',
        name='Annäherung an Fussgängerstreifen in Kurve, innerorts 50 km/h',
        kontext='io',
        grund='Fussgängerstreifen, Trottoir, Veloverkehr am Fahrbahnrand; '
              'Perimeter innerorts.',
        bemerkung='Drei Defizite an einer Stelle. Sichtweite und Knotengeometrie '
                  'hängen hier zusammen.',
    ),
    'P255-2676459-1236358': dict(
        thema='tp-sicht-strecke',
        name='Senkrechtparkierung am Kreisel, innerorts 50 km/h',
        kontext='io',
        grund='Kreisel, Mittelinseln und Trottoir; Perimeter innerorts.',
        bemerkung='Die Sicht beim Rückwärtsfahren ist der Kern. Der Rest ist '
                  'Einstufungsübung.',
    ),
    'P243-2705336-1242585': dict(
        thema='tp-sicht-strecke',
        name='Kurve mit Mauer und Bepflanzung, innerorts 60 km/h',
        kontext='io',
        grund='Gehweg und Trottoir mit Breitenangabe; Perimeter innerorts, '
              'signalisiert 60 km/h.',
        bemerkung='Die Anhaltesichtweite ist an drei Ursachen gebunden. Suchen '
                  'Sie alle drei.',
    ),
    'P248-2676493-1231985': dict(
        thema='tp-sicht-strecke',
        name='Bushaltestelle an Knoten mit Gefälle, innerorts 50 km/h',
        kontext='io',
        grund='Bushaltestelle, Fussgängerquerung und Stopp-Markierung; Perimeter '
              'innerorts.',
        bemerkung='Der Standort der Haltestelle wirkt auf mehrere Defizite '
                  'zugleich.',
    ),
    'P233-2678967-1233024': dict(
        thema='tp-sicht-strecke',
        name='Einmündung in spitzem Winkel mit Bewuchs, ausserorts 80 km/h',
        kontext='ao',
        grund='Perimeter ausserorts, 80 km/h, Anhaltesichtweite bei 4,5 % Gefälle.',
        bemerkung='Die Vegetation ist saisonal. Beurteilen Sie den Zustand in '
                  'der Vegetationszeit.',
    ),
    'P244-2712124-1242475': dict(
        thema='tp-strassenrand-ao',
        name='Stützmauer ohne Rückhaltesystem, ausserorts 80 km/h',
        kontext='ao',
        grund='ENTSCHIED GEGEN DEN VORSCHLAG: Die Bauanleitung schlug innerorts '
              'vor. Der Text nennt passive Schutzeinrichtung, Bankett entlang '
              'einer Stützmauer und das Lichtraumprofil, signalisiert sind '
              '80 km/h. Das ist ausserorts. Der Kontext ao setzt für «bankette» '
              'gross statt klein — und genau darum geht es im Thema '
              'Strassenrand.',
        bemerkung='Der Seitenraum ist hier das Thema, nicht die Fahrbahn.',
    ),
    'P239-2707475-1260348': dict(
        thema='tp-ausruestung',
        name='Kurve vor Böschung ohne Leiteinrichtung, ausserorts 80 km/h',
        kontext='ao',
        grund='Perimeter ausserorts, 80 km/h, optische Linienführung und '
              'Randlinie.',
        bemerkung='Hier ist das Einstufen die Übung, nicht das Finden: Der '
                  'Bestand ist gross, der Handlungsdruck klein.',
    ),
    'P216-2700023-1254173': dict(
        thema=THEMA_VELO,
        name='Radstreifen an Dorfdurchfahrt, innerorts 50 km/h',
        kontext='io',
        grund='Radstreifen, Dorfdurchfahrt, 50 km/h; Perimeter innerorts.',
        bemerkung='Die Breite des Radstreifens ist messbar. Die übrigen zwei '
                  'Defizite sind Einstufung.',
    ),
}


# ── Beschreibungen ohne Ortsbezug ────────────────────────────────────────────
# Schlüssel: (Standort-Kennung, Defizit-Nr aus dem RSI-Bericht).
# Wert: die bereinigte Beschreibung. Ersetzt wird der Ortsname durch das, was
# fachlich gemeint ist; eine Angabe zur Blickrichtung wird nicht gestrichen,
# sondern durch die Himmelsrichtung oder «Richtung Ortszentrum» ersetzt.

BESCHREIBUNGEN = {
    ('P253-2676600-1237129', '1'):
        'Die Sichtverhältnisse von der Grundstücksausfahrt auf das Trottoir sind '
        'links und rechts unzureichend und liegen bei ca. 8–9 m statt der gemäss '
        'Norm VSS 40 273 vorgeschriebenen Mindestsichtweite von 15 m (bei einer '
        'Längsneigung von 0 %). Grund: bauliche Situation sowie Parkierung.',
    ('P253-2676600-1237129', '7'):
        'Die Zufahrt zur Tankstelle begünstigt das Queren des Knotens über die '
        'Wartelinie der einmündenden Nebenstrasse. Dies kann leicht zu Konflikten '
        'zwischen Fahrzeugen führen, die aus dieser Strasse ausfahren, und '
        'Fahrzeugen, die zur Tankstelle zufahren. Generell ist die Zufahrt zur '
        'Tankstelle nicht klar geregelt bzw. nicht eindeutig ausgestaltet.',
    ('P252-2675601-1259482', '14'):
        'Ab dem einmündenden Zufahrtsweg ist die Sichtweite nach links aufgrund '
        'des Böschungsbereichs in der Kurve auf rund 70 m reduziert, anstelle der '
        'erforderlichen Mindestsichtweite von 120 m unter Berücksichtigung einer '
        'Strasse des Typs RVS.',
    ('P260-2687395-1242447', '15'):
        'Sichtweite auf den südlichen Annäherungsbereich des Fussgängerstreifens '
        'unterschreitet den Normwert (Soll: 55 m, Ist: ca. 37 m). '
        'Sichtbehinderung durch Verkehrsteilnehmende, keine Abminderung aufgrund '
        'der Kurve, da r > 40 m. Erkennungsdistanz auf das Signal Nr. 4.11 von '
        '110 m (Ist: ca. 60 m) nicht eingehalten.',
    ('P243-2705336-1242585', '16'):
        'Im Kurvenbereich ist die notwendige Anhaltesichtweite nicht gegeben, '
        'aufgrund von Mauer, Gebäude und Bepflanzung. Vorhanden ca. 40 m; gemäss '
        'Norm VSS 40 090b «Projektierung, Grundlagen – Sichtweiten» wären bei '
        'V = 60 km/h 70 m nötig (bei 6 % Gefälle). Aus denselben Gründen ist die '
        'notwendige Überholsichtweite nicht gegeben; gemäss Norm wären bei '
        'V = 60 km/h 450 m nötig.',
    ('P233-2678967-1233024', '19'):
        'Einmündung in spitzem Winkel. Dadurch kaum Abbremsen beim Rechtsabbiegen '
        'in die einmündende Nebenstrasse (Gefährdung des querenden '
        'Veloverkehrs).',
    ('P239-2707475-1260348', '2'):
        'Weisse Randlinie fehlt im ganzen Perimeter; unterbrochene Leit- und '
        'Mittellinie fehlt auf der einmündenden Nebenstrasse.',
    ('P216-2700023-1254173', '4'):
        'Sichtweite Richtung Ortszentrum infolge Hecke eingeschränkt.',
}


# ── Normbezüge ───────────────────────────────────────────────────────────────
# Nur Normen, die im Berichtstext tatsächlich stehen. Nichts ergänzt.

NORMREFS = {
    ('P253-2676600-1237129', '1'): ['VSS 40 273'],
    ('P243-2705336-1242585', '16'): ['VSS 40 090b'],
    ('P243-2705336-1242585', '18'): ['VSS 40 241'],
    ('P243-2705336-1242585', '15'): ['VSS 40 273a'],
    ('P216-2700023-1254173', '3'): ['VSS 40 201'],
}

# Nicht eingetragen, mit Grund:
#
#   P254-2676390-1246987 / 11 — der Text nennt «VSS, resp. RL Kt. ZH» ohne
#     Nummer. Eine Nummer hier zu setzen hiesse, sie zu erfinden.
#   P243-2705336-1242585 / 15 — der Text nennt neben VSS 40 273a auch
#     «VSS 640 070». Diese Schreibweise mischt zwei Nummernkreise: 640 070
#     gehört zur SN-Reihe, nicht zur VSS-Reihe. Welche Norm gemeint ist, ist
#     ohne Rückfrage nicht zu entscheiden; der Fall gehört dem Auftraggeber
#     vorgelegt.
#   P216-2700023-1254173 / 2 und P233-2678967-1233024 / 21 — beide nennen die
#     Velostandards des Kantons Zürich. Das ist eine Grundlage, aber keine
#     Norm mit Nummer; `normRefs` führt Normbezüge.


# ── Massnahmentexte ohne Ortsbezug ───────────────────────────────────────────
# Dieselbe Regel wie bei den Beschreibungen. Die Beilage verlässt das
# Repositorium nicht, aber sie wird weitergereicht, sobald ein eigener Schritt
# für Massnahmen gebaut wird — dann gilt dort dieselbe Anforderung.
# Schlüssel: (Standort-Kennung, Defizit-Nr).

MASSNAHMEN = {
    ('P239-2707475-1260348', '2'):
        'Im Rahmen der Instandsetzung weisse Randlinie ergänzen; auf der '
        'einmündenden Nebenstrasse zusätzlich unterbrochene Mittellinie '
        'ergänzen.',
    ('P253-2676600-1237129', '7'):
        'Berücksichtigung der Zufahrt zur Tankstelle im Rahmen einer '
        'Umgestaltung, um Konflikte mit dem Knotenpunkt der einmündenden '
        'Nebenstrasse zu vermeiden.',
}


# ── Beschreibungen im Bestand, gekürzt ──────────────────────────────────────
# Die Themenkarte am Einstieg soll bei allen Themen gleich hoch sein. Ein Text
# von 183 Zeichen sprengt sie; die übrigen Beschreibungen des Bestands liegen
# zwischen 26 und 60 Zeichen. Gekürzt wird der Sinn nicht, nur der Satzbau.
#
# Schlüssel: Themen-Kennung.

BESTAND_BESCHREIBUNG = {
    'tp-1781537561454':
        'Fussgängerstreifen und Querungsstellen auf Schulwegen, mit Blick auf '
        'den grössten Handlungsbedarf.',
}
