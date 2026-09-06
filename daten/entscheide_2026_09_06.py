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
    # Der Text nennt zwei Normen. «VSS 640 070» mischt zwei Nummernkreise;
    # gemeint ist SN 640 070 «Fussgängerverkehr; Grundnorm». Belegt über
    # SN 641 700:2022, Anhang G, Ziff. 16, Tab. 2, S. 12: Dort steht die Norm
    # unter dem Sicherheitskriterium «Fussgängerlängsführung, Art und
    # Geometrie», und genau darum geht es im Defizit (Trottoirbreite).
    #
    # Vorbehalt zu VSS 40 273a: Der Bericht zitiert sie für eine lichte Höhe
    # von 3,00 m. Die Norm heisst «Knoten; Sichtverhältnisse in Knoten in
    # einer Ebene»; das Lichtraumprofil steht nach Tab. 2 in VSS 40 201. Die
    # Zitation bleibt so, wie der Bericht sie führt — sie zu berichtigen wäre
    # eine stille Sachänderung. Der Fall gehört dem Auftraggeber vorgelegt.
    ('P243-2705336-1242585', '15'): ['VSS 40 273a', 'SN 640 070'],
    ('P216-2700023-1254173', '3'): ['VSS 40 201'],
}

# Nicht eingetragen, mit Grund:
#
#   P254-2676390-1246987 / 11 — der Text nennt «VSS, resp. RL Kt. ZH» ohne
#     Nummer. Eine Nummer hier zu setzen hiesse, sie zu erfinden.
#   P216-2700023-1254173 / 2 und P233-2678967-1233024 / 21 — beide nennen die
#     Velostandards des Kantons Zürich. Das ist eine Grundlage, aber keine
#     Norm mit Nummer; `normRefs` führt Normbezüge.
#   P260-2687395-1242447 / 15 und P253-2676600-1237129 / 3 — beide nennen ein
#     Signal nach Signalisationsverordnung (Nr. 4.11, SSV 2.50). Das ist ein
#     Erlass, keine Norm.
#   P233-2678967-1233024 / 18 — «Norm 40 100a» steht im Massnahmentext, nicht
#     in der Beschreibung des Defizits. `normRefs` beschreibt den Mangel.


# ── Normbezug über das Sicherheitskriterium ──────────────────────────────────
# Zweite Quelle neben dem Berichtstext: SN 641 700:2022 «Strassenverkehrs-
# sicherheit; Grundnorm», Anhang G, Ziff. 16, Tabelle 2 «Thematische Zuordnung
# der sicherheitsrelevanten Normen», S. 11–14. Die Norm ordnet dort jedem
# Sicherheitskriterium Normen zu und sagt selbst, die Liste sei nicht
# abschliessend.
#
# Aufgenommen ist nur, was in Tab. 2 unter einem Kriterium steht, das den
# Gegenstand des Defizits trifft. Nicht aufgenommen sind Kriterien, deren
# Zuordnung in Tab. 2 vierzehn Normen umfasst (Knoten) oder wo Tab. 2 gar kein
# entsprechendes Kriterium führt. Eine Auswahl daraus wäre ein fachliches
# Urteil, keine Wiedergabe.
#
# Ohne Zuordnung bleiben deshalb: knotengeometrie und querschnitt (Liste zu
# umfangreich), signale_wegweiser (Tab. 2 führt «Signalisation» mit sechs
# Normen, keine davon trifft den Einzelfall erkennbar), sichtweite_allgemein,
# bankette, risse, flicke, randabschluesse_randstein und
# angebot_vertraeglichkeit (Tab. 2 führt kein entsprechendes Kriterium).

NORMREFS_KRITERIUM = {
    # Tab. 2, S. 12, Thema «Sicht»
    'anhaltesichtweite':  ['VSS 40 090b', 'VSS 40 110', 'SN 640 660'],
    'knotensichtweite':   ['VSS 40 273', 'SN 640 660'],
    # Tab. 2, S. 11, Thema «Verkehrsführung»
    'visuelle_linienfuehrung': ['VSS 40 140'],
    # Tab. 2, S. 13, Thema «Strassenraum», Kriterium «Festes Hindernis»
    'abstand_feste_hindernisse': ['VSS 40 569'],
    # Tab. 2, S. 12, Thema «Langsamverkehr»
    'fussgaengerfuehrung_geometrie': ['SN 640 070', 'SN 640 075', 'VSS 40 201'],
    'velolaengsfuehrung_art': ['SN 640 060', 'SN 640 064', 'VSS 40 201',
                               'VSS 40 252'],
    'fussgaengerquerung_ohne_vortritt': ['VSS 40 240', 'VSS 40 241',
                                         'VSS 40 242', 'VSS 40 246',
                                         'VSS 40 247'],
    # Tab. 2, S. 12, Thema «Ausrüstung»
    'markierung': ['SN 640 850', 'VSS 40 851', 'SN 640 852', 'VSS 40 854',
                   'VSS 40 862'],
}


# ── Normbezug für ein einzelnes Defizit ──────────────────────────────────────
# Dritte Quelle. Bei «knotengeometrie» führt Tab. 2 vierzehn Normen, beim
# «querschnitt» acht — für das Kriterium als Ganzes ist daraus keine Auswahl zu
# treffen, für das einzelne Defizit schon: Massgebend ist, welcher Gegenstand
# im Defizittext vorkommt.
#
# **Das ist eine Schlussfolgerung, keine Normvorgabe.** Belegt ist, dass Tab. 2
# diese Normen unter diesem Kriterium führt (S. 11). Nicht belegt ist, dass
# gerade diese und keine andere den Einzelfall trifft. Freigegeben von Stevo am
# 6. September 2026.
#
# Bewusst nicht gesetzt, bei allen vier Knotenfällen: VSS 40 022, 40 023 und
# 40 024 (Leistungsfähigkeit — kein Defizit spricht von Kapazität), VSS 40 261
# (kreuzungsfreie Knoten), VSS 40 263 (Kreisverkehr), VSS 40 273
# (Sichtverhältnisse — eigenes Kriterium, hier nicht der Mangel), VSS 40 835
# (Lichtsignalanlagen), VSS 40 040 (Strassentypen). Bei den beiden
# Querschnittsfällen: VSS 40 052 (Wendeanlagen), VSS 40 105 (Kurven-
# verbreiterung, und der Titel dieser Norm ist ohnehin strittig), VSS 40 120
# (Quergefälle), VSS 40 202 (Erarbeitung — ein Verfahren, kein Mass),
# VSS 40 880 (Bushaltestellen), VSS 71 253 (Bahn).

NORMREFS_DEFIZIT = {
    # «Einmündung überbreit. Unklare Vortrittsverhältnisse. Trottoirüberfahrt
    # nicht nach einschlägigen Vorgaben ausgebildet.» Die Szene sind
    # Grundstücksausfahrten. VSS 40 242 steht in Tab. 2 unter
    # «Fussgängerquerungen», nicht unter Knoten — aufgenommen, weil der Text
    # die Trottoirüberfahrt ausdrücklich nennt.
    ('P254-2676390-1246987', '11'): ['SN 640 250', 'VSS 40 262', 'VSS 40 251',
                                     'VSS 40 050', 'VSS 40 242'],
    # «Ausgestaltung Knotenzufahrt entspricht nicht Norm (unklar ob
    # Trottoirüberfahrt oder Kein Vortritt Knoten).» Ohne VSS 40 050, weil
    # keine Grundstückszufahrt im Spiel ist. Das endende Trottoir gehörte zu
    # SN 640 070; nicht gesetzt, weil das Defizit als Knotengeometrie erfasst
    # ist und nicht als Fussgängerführung.
    ('P255-2676349-1235949', '5'): ['SN 640 250', 'VSS 40 262', 'VSS 40 251',
                                    'VSS 40 242'],
    # «Grosszügige Ein- und Abbiegeradien.» VSS 40 271 wegen der Schleppkurven
    # — belegt allerdings am Massnahmentext, nicht an der Beschreibung.
    ('P260-2687395-1242447', '17'): ['SN 640 250', 'VSS 40 262', 'VSS 40 251',
                                     'VSS 40 271'],
    # «Einmündung in spitzem Winkel … Gefährdung des querenden Veloverkehrs.»
    ('P233-2678967-1233024', '19'): ['SN 640 250', 'VSS 40 262', 'VSS 40 251',
                                     'VSS 40 252'],
    # «Fahrbahnbreite knapp 6,0 m. Massgebender Begegnungsfall (LW/PW).»
    # Der Begegnungsfall ist der Gegenstand der Grundabmessungen.
    ('P254-2676144-1246650', '3'): ['VSS 40 200', 'VSS 40 201'],
    # Nennt VSS 40 201 selbst; VSS 40 200 kommt als Rahmen dazu.
    ('P216-2700023-1254173', '3'): ['VSS 40 200'],
}


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
    # Der Quelltext nennt zwei Strassennamen, einen davon abgekürzt
    # («Knoten Zumikerstr./ In der Hinterzelg»). Gefunden wurde er nicht von
    # der Prüfung, sondern beim Lesen: Sie suchte nach «Zumikerstrasse» und
    # nach ganzen Wörtern, und beides passte nicht. Die Prüfung kennt seither
    # auch die abgekürzte Form.
    ('P260-2687395-1242447', '18'):
        'Zurückschneiden der Hecke prüfen, Verkehrsspiegel montieren | '
        'Fahrverbot auf dem Verbindungsweg prüfen, um weiteren Verkehr zu '
        'vermeiden; die Erschliessung bleibt über den benachbarten Knoten '
        'sichergestellt.',
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
