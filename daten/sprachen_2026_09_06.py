# -*- coding: utf-8 -*-
"""Französisch, Italienisch und Englisch zu den Datensätzen vom 6. September 2026.

Die deutschen Texte stehen in `entscheide_2026_09_06.py` und in der Auswahl;
hier stehen die drei anderen Sprachen. Getrennt gehalten, weil das Deutsche
belegt ist — es stammt aus dem Inspektionsbericht — und die Übersetzung nicht.
Wer die Übersetzung prüfen will, liest diese Datei allein.

Grundsätze:

* Die Fachbegriffe folgen dem Sprachgebrauch der Normen: Anhaltesichtweite →
  «distance de visibilité d'arrêt», «distanza di visibilità di arresto»,
  «stopping sight distance».
* Zahlen tragen die Schreibweise der Zielsprache: Komma als Dezimaltrenner in
  Französisch und Italienisch, Punkt im Englischen; vor dem Prozentzeichen ein
  Abstand ausser im Englischen.
* Was im deutschen Text als Messwert steht, bleibt derselbe Messwert. Übersetzt
  wird die Sprache, nicht die Sache.
* Kein Ortsbezug — dieselbe Regel wie im Deutschen.
"""

# ── Themen ───────────────────────────────────────────────────────────────────

THEMEN = {
    'tp-sicht': {
        'name': {
            'fr': 'Visibilité',
            'it': 'Visibilità',
            'en': 'Sight',
        },
        'beschreibung': {
            'fr': "Les conditions de visibilité comme champ d'examen propre. "
                  'Regroupe les thèmes ci-dessous.',
            'it': "Le condizioni di visibilità come campo d'esame a sé stante. "
                  'Raggruppa i temi sottostanti.',
            'en': 'Sight conditions as a field of their own. Groups the topics '
                  'below.',
        },
    },
    'tp-sicht-knoten': {
        'name': {
            'fr': 'Visibilité aux intersections',
            'it': 'Visibilità alle intersezioni',
            'en': 'Sight at intersections',
        },
        'beschreibung': {
            'fr': 'Débouchés, accès et sorties de propriété. Le regard porte '
                  'sur le côté.',
            'it': 'Immissioni, accessi e uscite da fondi privati. Lo sguardo '
                  'va di lato.',
            'en': 'Junctions, accesses and private exits. The gaze goes '
                  'sideways.',
        },
    },
    'tp-sicht-strecke': {
        'name': {
            'fr': 'Visibilité en section courante',
            'it': 'Visibilità sulla tratta',
            'en': 'Sight along the road',
        },
        'beschreibung': {
            'fr': "Distances de visibilité d'arrêt, en courbe et de "
                  "dépassement. Le regard porte vers l'avant.",
            'it': 'Distanze di visibilità di arresto, in curva e di sorpasso. '
                  'Lo sguardo va in avanti.',
            'en': 'Stopping, curve and overtaking sight distance. The gaze '
                  'goes ahead.',
        },
    },
    'tp-strassenrand-ao': {
        'name': {
            'fr': 'Bord de la route hors localité',
            'it': 'Bordo strada fuori località',
            'en': 'Roadside outside built-up areas',
        },
        'beschreibung': {
            'fr': "L'espace latéral en cas de sortie de route: obstacles, "
                  'accotement, dispositifs de retenue.',
            'it': 'Lo spazio laterale in caso di uscita di strada: ostacoli, '
                  'banchina, dispositivi di ritenuta.',
            'en': 'The roadside when a vehicle leaves the carriageway: '
                  'obstacles, verge, restraint systems.',
        },
    },
    'tp-ausruestung': {
        'name': {
            'fr': 'Équipement',
            'it': 'Equipaggiamento',
            'en': 'Equipment',
        },
        'beschreibung': {
            'fr': "Signalisation, marquage, guidage optique. Ici, l'exercice "
                  'est le classement, non la recherche.',
            'it': 'Segnaletica, demarcazione, guida ottica. Qui conta la '
                  'classificazione, non la ricerca.',
            'en': 'Signing, marking, optical guidance. Here the exercise is '
                  'rating, not finding.',
        },
    },
}


# ── Szenen ───────────────────────────────────────────────────────────────────
# Schlüssel: Standort-Kennung wie in entscheide_2026_09_06.SZENEN.

SZENEN = {
    'P254-2676390-1246987': {
        'name': {
            'fr': 'Sorties de propriété sur route principale, en localité, '
                  '50 km/h',
            'it': 'Uscite da fondi privati su strada principale, in località, '
                  '50 km/h',
            'en': 'Private exits onto a main road, built-up area, 50 km/h',
        },
        'bemerkung': {
            'fr': 'Plusieurs accès sur une courte distance. Observez depuis '
                  'quelle position regarde la personne qui attend.',
            'it': 'Più accessi su un breve tratto. Osservi da quale posizione '
                  'guarda chi attende.',
            'en': 'Several accesses over a short stretch. Note the position '
                  'the waiting person looks from.',
        },
    },
    'P255-2676349-1235949': {
        'name': {
            'fr': "Branche d'intersection avec îlot central, en localité, "
                  '50 km/h',
            'it': "Ramo d'intersezione con isola spartitraffico, in località, "
                  '50 km/h',
            'en': 'Junction approach with central island, built-up area, '
                  '50 km/h',
        },
        'bemerkung': {
            'fr': 'Le chemin débouche sur une route principale. Examinez la '
                  'visibilité des deux côtés.',
            'it': 'Il percorso si immette in una strada principale. Verifichi '
                  'la visibilità in entrambe le direzioni.',
            'en': 'The access road joins a main road. Check the sight in both '
                  'directions.',
        },
    },
    'P253-2676600-1237129': {
        'name': {
            'fr': "Sortie de propriété près de l'accès à une station-service, "
                  'en localité, 50 km/h',
            'it': "Uscita da fondo privato accanto all'accesso a una stazione "
                  'di servizio, in località, 50 km/h',
            'en': 'Private exit next to a filling-station access, built-up '
                  'area, 50 km/h',
        },
        'bemerkung': {
            'fr': "Deux accès sont proches l'un de l'autre. La question est de "
                  'savoir qui voit qui.',
            'it': 'Due accessi sono vicini tra loro. La domanda è chi vede '
                  'chi.',
            'en': 'Two accesses lie close together. The question is who sees '
                  'whom.',
        },
    },
    'P252-2675601-1259482': {
        'name': {
            'fr': "Débouché d'un chemin d'accès en courbe avec talus, hors "
                  'localité',
            'it': "Immissione di una strada d'accesso in curva con scarpata, "
                  'fuori località',
            'en': 'Access road joining in a curve with embankment, outside '
                  'built-up area',
        },
        'bemerkung': {
            'fr': 'Le chemin débouche dans une courbe. La visibilité vers la '
                  'gauche est la question décisive.',
            'it': 'La strada si immette in curva. La visibilità verso sinistra '
                  'è la questione decisiva.',
            'en': 'The road joins in a curve. Sight to the left is the '
                  'decisive question.',
        },
    },
    'P254-2676144-1246650': {
        'name': {
            'fr': 'Accès agricole oblique, hors localité, 50 km/h',
            'it': 'Accesso agricolo obliquo, fuori località, 50 km/h',
            'en': 'Skewed farm access, outside built-up area, 50 km/h',
        },
        'bemerkung': {
            'fr': "L'accès rencontre la chaussée obliquement. Observez ce que "
                  'cela signifie pour le regard vers la gauche.',
            'it': "L'accesso incontra la carreggiata obliquamente. Osservi che "
                  'cosa significa per lo sguardo verso sinistra.',
            'en': 'The access meets the carriageway at a skew angle. Note what '
                  'that means for the view to the left.',
        },
    },
    'P260-2687395-1242447': {
        'name': {
            'fr': "Approche d'un passage piéton en courbe, en localité, "
                  '50 km/h',
            'it': 'Avvicinamento a un passaggio pedonale in curva, in '
                  'località, 50 km/h',
            'en': 'Approach to a pedestrian crossing in a curve, built-up '
                  'area, 50 km/h',
        },
        'bemerkung': {
            'fr': 'Trois défauts au même endroit. Visibilité et géométrie de '
                  "l'intersection sont ici liées.",
            'it': 'Tre carenze nello stesso punto. Visibilità e geometria '
                  "dell'intersezione sono qui collegate.",
            'en': 'Three deficiencies at one place. Sight distance and '
                  'junction geometry are linked here.',
        },
    },
    'P255-2676459-1236358': {
        'name': {
            'fr': 'Stationnement perpendiculaire au giratoire, en localité, '
                  '50 km/h',
            'it': 'Parcheggio perpendicolare alla rotatoria, in località, '
                  '50 km/h',
            'en': 'Perpendicular parking at the roundabout, built-up area, '
                  '50 km/h',
        },
        'bemerkung': {
            'fr': 'La visibilité en marche arrière est le cœur du sujet. Le '
                  'reste est un exercice de classement.',
            'it': 'La visibilità in retromarcia è il nocciolo. Il resto è un '
                  'esercizio di classificazione.',
            'en': 'Sight when reversing is the core. The rest is a rating '
                  'exercise.',
        },
    },
    'P243-2705336-1242585': {
        'name': {
            'fr': 'Courbe avec mur et végétation, en localité, 60 km/h',
            'it': 'Curva con muro e vegetazione, in località, 60 km/h',
            'en': 'Curve with wall and planting, built-up area, 60 km/h',
        },
        'bemerkung': {
            'fr': "La distance de visibilité d'arrêt tient à trois causes. "
                  'Trouvez-les toutes les trois.',
            'it': 'La distanza di visibilità di arresto dipende da tre cause. '
                  'Le trovi tutte e tre.',
            'en': 'The stopping sight distance has three causes. Find all '
                  'three.',
        },
    },
    'P248-2676493-1231985': {
        'name': {
            'fr': 'Arrêt de bus à une intersection en pente, en localité, '
                  '50 km/h',
            'it': "Fermata del bus a un'intersezione in pendenza, in località, "
                  '50 km/h',
            'en': 'Bus stop at a junction on a gradient, built-up area, '
                  '50 km/h',
        },
        'bemerkung': {
            'fr': "L'emplacement de l'arrêt agit sur plusieurs défauts à la "
                  'fois.',
            'it': 'La posizione della fermata incide su più carenze insieme.',
            'en': 'The location of the stop affects several deficiencies at '
                  'once.',
        },
    },
    'P233-2678967-1233024': {
        'name': {
            'fr': 'Débouché à angle aigu avec végétation, hors localité, '
                  '80 km/h',
            'it': 'Immissione ad angolo acuto con vegetazione, fuori località, '
                  '80 km/h',
            'en': 'Junction at an acute angle with vegetation, outside '
                  'built-up area, 80 km/h',
        },
        'bemerkung': {
            'fr': 'La végétation est saisonnière. Jugez la situation en '
                  'période de végétation.',
            'it': 'La vegetazione è stagionale. Valuti la situazione nel '
                  'periodo vegetativo.',
            'en': 'The vegetation is seasonal. Judge the state during the '
                  'growing season.',
        },
    },
    'P244-2712124-1242475': {
        'name': {
            'fr': 'Mur de soutènement sans dispositif de retenue, hors '
                  'localité, 80 km/h',
            'it': 'Muro di sostegno senza dispositivo di ritenuta, fuori '
                  'località, 80 km/h',
            'en': 'Retaining wall without restraint system, outside built-up '
                  'area, 80 km/h',
        },
        'bemerkung': {
            'fr': "Ici, le sujet est l'espace latéral, non la chaussée.",
            'it': 'Qui il tema è lo spazio laterale, non la carreggiata.',
            'en': 'The roadside is the subject here, not the carriageway.',
        },
    },
    'P239-2707475-1260348': {
        'name': {
            'fr': 'Courbe devant un talus sans guidage optique, hors localité, '
                  '80 km/h',
            'it': 'Curva davanti a una scarpata senza guida ottica, fuori '
                  'località, 80 km/h',
            'en': 'Curve before an embankment without optical guidance, '
                  'outside built-up area, 80 km/h',
        },
        'bemerkung': {
            'fr': "Ici, l'exercice est le classement, non la recherche: le "
                  "constat est net, l'urgence faible.",
            'it': "Qui l'esercizio è la classificazione, non la ricerca: il "
                  "riscontro è netto, l'urgenza modesta.",
            'en': 'Here the exercise is rating, not finding: the finding is '
                  'clear, the pressure to act small.',
        },
    },
    'P216-2700023-1254173': {
        'name': {
            'fr': 'Bandes cyclables en traversée de village, en localité, '
                  '50 km/h',
            'it': 'Corsie ciclabili in attraversamento di paese, in località, '
                  '50 km/h',
            'en': 'Cycle lanes through a village, built-up area, 50 km/h',
        },
        'bemerkung': {
            'fr': 'La largeur de la bande cyclable est mesurable. Les deux '
                  'autres défauts relèvent du classement.',
            'it': 'La larghezza della corsia ciclabile è misurabile. Le altre '
                  'due carenze sono classificazione.',
            'en': 'The width of the cycle lane can be measured. The other two '
                  'deficiencies are a matter of rating.',
        },
    },
}


# ── Sicherheitskriterien ─────────────────────────────────────────────────────
# Der Name eines Defizits ist die Bezeichnung seines Sicherheitskriteriums.
# Die deutsche Fassung steht in src/data/kriteriumLabels.ts und wird von dort
# gelesen; sie steht hier nur zur Kontrolle, damit eine Änderung dort auffällt.

KRITERIEN = {
    'abstand_feste_hindernisse': {
        'de': 'Abstand feste Hindernisse',
        'fr': 'Distance aux obstacles fixes',
        'it': 'Distanza dagli ostacoli fissi',
        'en': 'Clearance to fixed obstacles',
    },
    'angebot_vertraeglichkeit': {
        'de': 'Angebot / Verträglichkeit',
        'fr': 'Offre / compatibilité',
        'it': 'Offerta / compatibilità',
        'en': 'Provision / compatibility',
    },
    'anhaltesichtweite': {
        'de': 'Anhaltesichtweite',
        'fr': "Distance de visibilité d'arrêt",
        'it': 'Distanza di visibilità di arresto',
        'en': 'Stopping sight distance',
    },
    'bankette': {
        'de': 'Bankette',
        'fr': 'Accotements',
        'it': 'Banchine',
        'en': 'Verges',
    },
    'flicke': {
        'de': 'Flicke',
        'fr': 'Rapiéçages',
        'it': 'Rappezzi',
        'en': 'Patches',
    },
    'fussgaengerfuehrung_geometrie': {
        'de': 'Fussgängerführung (Geometrie)',
        'fr': 'Cheminement piéton (géométrie)',
        'it': 'Percorso pedonale (geometria)',
        'en': 'Pedestrian route (geometry)',
    },
    'fussgaengerquerung_ohne_vortritt': {
        'de': 'Fussgängerquerung ohne Vortritt',
        'fr': 'Traversée piétonne sans priorité',
        'it': 'Attraversamento pedonale senza precedenza',
        'en': 'Pedestrian crossing without priority',
    },
    'knotengeometrie': {
        'de': 'Knotengeometrie',
        'fr': "Géométrie de l'intersection",
        'it': "Geometria dell'intersezione",
        'en': 'Junction geometry',
    },
    'knotensichtweite': {
        'de': 'Knotensichtweite',
        'fr': 'Distance de visibilité aux intersections',
        'it': 'Distanza di visibilità alle intersezioni',
        'en': 'Intersection sight distance',
    },
    'markierung': {
        'de': 'Markierung',
        'fr': 'Marquage',
        'it': 'Demarcazione',
        'en': 'Road marking',
    },
    'querschnitt': {
        'de': 'Querschnitt',
        'fr': 'Profil en travers',
        'it': 'Sezione trasversale',
        'en': 'Cross section',
    },
    'randabschluesse_randstein': {
        'de': 'Randabschlüsse / Randstein',
        'fr': 'Bordures',
        'it': 'Cordoli',
        'en': 'Kerbs',
    },
    'risse': {
        'de': 'Risse',
        'fr': 'Fissures',
        'it': 'Fessure',
        'en': 'Cracks',
    },
    'sichtweite_allgemein': {
        'de': 'Sichtweite (allgemein)',
        'fr': 'Distance de visibilité (générale)',
        'it': 'Distanza di visibilità (generale)',
        'en': 'Sight distance (general)',
    },
    'signale_wegweiser': {
        'de': 'Signale / Wegweiser',
        'fr': 'Signaux / indicateurs de direction',
        'it': 'Segnali / indicatori di direzione',
        'en': 'Signs / direction signs',
    },
    'velolaengsfuehrung_art': {
        'de': 'Velolängsführung (Art)',
        'fr': 'Aménagement cyclable longitudinal (type)',
        'it': 'Percorso ciclabile longitudinale (tipo)',
        'en': 'Longitudinal cycle facility (type)',
    },
    'visuelle_linienfuehrung': {
        'de': 'Visuelle Linienführung',
        'fr': 'Tracé visuel',
        'it': 'Tracciato visivo',
        'en': 'Visual alignment',
    },
}


# ── Strassenmerkmale ─────────────────────────────────────────────────────────
# Bezeichnung des Merkmals. Die deutsche Fassung steht im Katalog
# src/data/strassenmerkmale.ts und wird von dort gelesen.

MERKMAL_LABEL = {
    'strassenklassierung': {
        'fr': 'Classification de la route',
        'it': 'Classificazione della strada',
        'en': 'Road classification',
    },
    'funktion_strasse': {
        'fr': 'Fonction de la route',
        'it': 'Funzione della strada',
        'en': 'Function of the road',
    },
    'haupt_nebenstrasse': {
        'fr': 'Route principale ou secondaire',
        'it': 'Strada principale o secondaria',
        'en': 'Main or secondary road',
    },
    'lage_io_ao': {
        'fr': 'Situation en ou hors localité',
        'it': 'Ubicazione in o fuori località',
        'en': 'Inside or outside built-up area',
    },
    'ausnahmetransportroute': {
        'fr': 'Itinéraire pour transports exceptionnels',
        'it': 'Itinerario per trasporti eccezionali',
        'en': 'Route for exceptional transports',
    },
    'verkehrslastklasse': {
        'fr': 'Classe de charge de trafic',
        'it': 'Classe di carico di traffico',
        'en': 'Traffic load class',
    },
    'laengsgefaelle': {
        'fr': 'Déclivité longitudinale dans le périmètre',
        'it': 'Pendenza longitudinale nel perimetro',
        'en': 'Longitudinal gradient in the perimeter',
    },
    'strassenbeleuchtung': {
        'fr': 'Éclairage public',
        'it': 'Illuminazione stradale',
        'en': 'Street lighting',
    },
    'lichtsignalanlage': {
        'fr': 'Installation de signaux lumineux',
        'it': 'Impianto semaforico',
        'en': 'Traffic signal installation',
    },
    'signalisierte_geschwindigkeit': {
        'fr': 'Vitesse signalée',
        'it': 'Velocità segnalata',
        'en': 'Posted speed limit',
    },
    'dtv': {
        'fr': 'Trafic journalier moyen (véh./24 h)',
        'it': 'Traffico giornaliero medio (veic./24 h)',
        'en': 'Average daily traffic (veh./24 h)',
    },
    'begegnungsfall': {
        'fr': 'Cas de croisement déterminant',
        'it': 'Caso di incrocio determinante',
        'en': 'Governing meeting case',
    },
    'verkehrsqualitaet': {
        'fr': 'Qualité du trafic (LOS)',
        'it': 'Qualità del traffico (LOS)',
        'en': 'Level of service (LOS)',
    },
    'trottoir': {
        'fr': 'Trottoir',
        'it': 'Marciapiede',
        'en': 'Footway',
    },
    'fussgaengerstreifen': {
        'fr': 'Passages piétons',
        'it': 'Passaggi pedonali',
        'en': 'Pedestrian crossings',
    },
    'veloroute': {
        'fr': 'Itinéraire cyclable',
        'it': 'Itinerario ciclabile',
        'en': 'Cycle route',
    },
    'veloinfrastruktur': {
        'fr': 'Infrastructure cyclable',
        'it': 'Infrastruttura ciclabile',
        'en': 'Cycle infrastructure',
    },
    'buslinie': {
        'fr': 'Ligne de bus',
        'it': 'Linea di autobus',
        'en': 'Bus route',
    },
    'bushaltestellen': {
        'fr': 'Arrêts de bus',
        'it': 'Fermate del bus',
        'en': 'Bus stops',
    },
    'landwirtschaftsverkehr': {
        'fr': 'Trafic agricole',
        'it': 'Traffico agricolo',
        'en': 'Agricultural traffic',
    },
    'strassenbahn': {
        'fr': 'Tramway',
        'it': 'Tranvia',
        'en': 'Tramway',
    },
}

# Wert des Merkmals. Schlüssel ist der deutsche Wert, wie ihn
# merkmale_lesen.py schreibt. Zahlenwerte (DTV) stehen nicht hier: Sie sind in
# jeder Sprache dieselbe Zahl, tragen aber je Sprache einen anderen
# Tausendertrenner — das erledigt anlegen.py.
MERKMAL_WERT = {
    'HVS Kanton': {
        'fr': 'Route principale cantonale',
        'it': 'Strada principale cantonale',
        'en': 'Cantonal main road',
    },
    'RVS': {
        'fr': 'Route de liaison régionale',
        'it': 'Strada di collegamento regionale',
        'en': 'Regional connecting road',
    },
    'verkehrsorientiert (Basisnetz)': {
        'fr': 'Orientée trafic (réseau de base)',
        'it': 'Orientata al traffico (rete di base)',
        'en': 'Traffic-oriented (base network)',
    },
    'Hauptstrasse': {
        'fr': 'Route principale',
        'it': 'Strada principale',
        'en': 'Main road',
    },
    'Nebenstrasse, vortrittsberichtigt': {
        'fr': 'Route secondaire, prioritaire',
        'it': 'Strada secondaria, con precedenza',
        'en': 'Secondary road, with right of way',
    },
    'innerorts': {
        'fr': 'en localité',
        'it': 'in località',
        'en': 'inside built-up area',
    },
    'ausserorts': {
        'fr': 'hors localité',
        'it': 'fuori località',
        'en': 'outside built-up area',
    },
    'inner- und ausserorts': {
        'fr': 'en et hors localité',
        'it': 'in e fuori località',
        'en': 'inside and outside built-up area',
    },
    'Typ II': {
        'fr': 'Type II',
        'it': 'Tipo II',
        'en': 'Type II',
    },
    'keine': {
        'fr': 'aucune',
        'it': 'nessuna',
        'en': 'none',
    },
    'T3': {'fr': 'T3', 'it': 'T3', 'en': 'T3'},
    'T4': {'fr': 'T4', 'it': 'T4', 'en': 'T4'},
    '< 3 %': {'fr': '< 3 %', 'it': '< 3 %', 'en': '< 3%'},
    '3–6 %': {'fr': '3–6 %', 'it': '3–6 %', 'en': '3–6%'},
    'nein': {'fr': 'non', 'it': 'no', 'en': 'no'},
    'ja': {'fr': 'oui', 'it': 'sì', 'en': 'yes'},
    'ja, mehrere': {
        'fr': 'oui, plusieurs',
        'it': 'sì, più di uno',
        'en': 'yes, several',
    },
    'ja, ganze Nacht': {
        'fr': 'oui, toute la nuit',
        'it': 'sì, tutta la notte',
        'en': 'yes, all night',
    },
    '50 km/h': {'fr': '50 km/h', 'it': '50 km/h', 'en': '50 km/h'},
    '60 km/h': {'fr': '60 km/h', 'it': '60 km/h', 'en': '60 km/h'},
    '80 km/h': {'fr': '80 km/h', 'it': '80 km/h', 'en': '80 km/h'},
    'mehrere Geschwindigkeiten': {
        'fr': 'plusieurs vitesses',
        'it': 'più velocità',
        'en': 'several speed limits',
    },
    'LKW-PW': {
        'fr': 'camion – voiture de tourisme',
        'it': 'autocarro – autovettura',
        'en': 'lorry – passenger car',
    },
    'LOS A': {'fr': 'LOS A', 'it': 'LOS A', 'en': 'LOS A'},
    'LOS C': {'fr': 'LOS C', 'it': 'LOS C', 'en': 'LOS C'},
    'beidseitig lückenlos': {
        'fr': 'des deux côtés, sans interruption',
        'it': 'su entrambi i lati, senza interruzioni',
        'en': 'both sides, continuous',
    },
    'einseitig lückenlos': {
        'fr': "d'un côté, sans interruption",
        'it': 'su un lato, senza interruzioni',
        'en': 'one side, continuous',
    },
    'lückenhaft oder nicht vorhanden': {
        'fr': 'discontinu ou inexistant',
        'it': 'discontinuo o assente',
        'en': 'discontinuous or absent',
    },
    'Radstreifen': {
        'fr': 'Bande cyclable',
        'it': 'Corsia ciclabile',
        'en': 'Cycle lane',
    },
    'Radweg': {
        'fr': 'Piste cyclable',
        'it': 'Pista ciclabile',
        'en': 'Cycle track',
    },
    'keiner oder selten': {
        'fr': 'aucun ou rare',
        'it': 'nessuno o raro',
        'en': 'none or rare',
    },
    'regelmässig': {
        'fr': 'régulier',
        'it': 'regolare',
        'en': 'regular',
    },
}


# ── Lernkarte ────────────────────────────────────────────────────────────────
# Die Erklärung auf der Lernkarte gibt wieder, was der Inspektionsbericht als
# Massnahme vorschlägt. Der Rahmen ist fest, der Inhalt kommt aus den Daten.

ERKLAERUNG_RAHMEN = {
    'de': 'Im Inspektionsbericht vorgeschlagen ({art}): {text}',
    'fr': "Proposé dans le rapport d'inspection ({art}): {text}",
    'it': 'Proposto nel rapporto di ispezione ({art}): {text}',
    'en': 'Proposed in the inspection report ({art}): {text}',
}

# Massnahmenart. Die Quelle trennt mehrere Arten mit Strichpunkt; anlegen.py
# zerlegt sie und setzt sie je Sprache wieder zusammen.
MASSNAHMENART = {
    'Sofortmassnahme': {
        'fr': 'mesure immédiate',
        'it': 'misura immediata',
        'en': 'immediate measure',
    },
    'kurzfristig': {
        'fr': 'à court terme',
        'it': 'a breve termine',
        'en': 'short term',
    },
    'Detailprüfung': {
        'fr': 'examen de détail',
        'it': 'esame di dettaglio',
        'en': 'detailed examination',
    },
    'Sanierungsprojekt': {
        'fr': 'projet d’assainissement',
        'it': 'progetto di risanamento',
        'en': 'rehabilitation project',
    },
}


# ── Beschreibungen der Defizite ──────────────────────────────────────────────
# Schlüssel: (Standort-Kennung, Defizit-Nr aus dem RSI-Bericht) — wie in
# entscheide_2026_09_06.BESCHREIBUNGEN.

BESCHREIBUNGEN = {
    ('P239-2707475-1260348', '1'): {
        'fr': 'Tracé visuel insuffisant et mauvaise perception du '
              "développement de la courbe, directement avant un talus muni "
              "d'un banc.",
        'it': 'Tracciato visivo insufficiente e scarsa riconoscibilità '
              'dell’andamento della curva, direttamente davanti a una '
              'scarpata con panchina.',
        'en': 'Insufficient visual alignment and poor recognisability of the '
              'course of the curve, directly before an embankment with a '
              'bench.',
    },
    ('P239-2707475-1260348', '2'): {
        'fr': 'La ligne de bord blanche manque sur tout le périmètre; sur la '
              'route secondaire débouchante, la ligne de guidage et la ligne '
              'médiane discontinues manquent également.',
        'it': 'La linea di margine bianca manca su tutto il perimetro; sulla '
              'strada secondaria che si immette mancano anche la linea di '
              'guida e la linea mediana discontinue.',
        'en': 'The white edge line is missing throughout the perimeter; on the '
              'joining secondary road the broken guide line and centre line '
              'are missing as well.',
    },
    ('P254-2676144-1246650', '1'): {
        'fr': 'Accès agricole oblique. La distance de visibilité vers la '
              'gauche sur le trafic motorisé est réduite par des pylônes à '
              'haute tension.',
        'it': 'Accesso agricolo obliquo. La distanza di visibilità verso '
              'sinistra sul traffico motorizzato è limitata da tralicci '
              'dell’alta tensione.',
        'en': 'Skewed farm access. Sight distance to the left towards motor '
              'traffic is restricted by high-voltage pylons.',
    },
    ('P254-2676144-1246650', '3'): {
        'fr': 'Largeur de chaussée de près de 6,0 m. Le cas de croisement '
              "déterminant (camion/voiture de tourisme) n'est possible qu'à "
              'vitesse réduite.',
        'it': 'Larghezza della carreggiata di quasi 6,0 m. Il caso di incrocio '
              'determinante (autocarro/autovettura) è possibile solo a '
              'velocità ridotta.',
        'en': 'Carriageway width just under 6.0 m. The governing meeting case '
              '(lorry/passenger car) is possible only at reduced speed.',
    },
    ('P254-2676390-1246987', '10'): {
        'fr': 'La visibilité depuis les sorties de propriété sur le trafic '
              'motorisé et cycliste est réduite par la végétation. Les accès '
              'aux parcelles se font directement sur la chaussée. Les '
              'conditions de visibilité sont par endroits fortement '
              'restreintes. Largeur du chemin piéton < 1,0 m.',
        'it': 'La visibilità dalle uscite dei fondi privati sul traffico '
              'motorizzato e ciclistico è limitata dalla vegetazione. Gli '
              'accessi ai fondi avvengono direttamente sulla carreggiata. Le '
              'condizioni di visibilità sono in parte fortemente limitate. '
              'Larghezza del percorso pedonale < 1,0 m.',
        'en': 'Sight from the private exits towards motor and cycle traffic is '
              'restricted by vegetation. Property accesses lead directly onto '
              'the carriageway. Sight conditions are severely restricted in '
              'places. Width of the footpath < 1.0 m.',
    },
    ('P254-2676390-1246987', '11'): {
        'fr': 'Débouché surlargé. Régime de priorité peu clair (signalisation '
              'et marquage manquants). La traversée de trottoir n’est pas '
              'aménagée selon les prescriptions applicables.',
        'it': 'Immissione sovradimensionata. Regime di precedenza poco chiaro '
              '(segnaletica e demarcazione mancanti). L’attraversamento del '
              'marciapiede non è realizzato secondo le prescrizioni '
              'applicabili.',
        'en': 'Excessively wide junction mouth. Unclear priority regime '
              '(missing signing and marking). The footway crossing is not '
              'built to the applicable requirements.',
    },
    ('P216-2700023-1254173', '2'): {
        'fr': 'Largeur des bandes cyclables: 1,80 m selon les standards '
              'cyclables cantonaux, tab. 4.3-1, pour les liaisons cyclables '
              'principales; mesuré sur place env. 1,25 m.',
        'it': 'Larghezza delle corsie ciclabili: 1,80 m secondo gli standard '
              'ciclabili cantonali, tab. 4.3-1, per i collegamenti ciclabili '
              'principali; misurato sul posto circa 1,25 m.',
        'en': 'Width of the cycle lanes: 1.80 m according to the cantonal '
              'cycling standards, tab. 4.3-1, for main cycle links; measured '
              'on site approx. 1.25 m.',
    },
    ('P216-2700023-1254173', '3'): {
        'fr': 'Profil en travers selon la norme VSS 40 201, camion – voiture '
              'de tourisme – vélo, 30 km/h: 7,10 m (réduction de vitesse lors '
              'du dépassement). Profil existant env. 7,00 m, TJM env. '
              '4200 véh./jour.',
        'it': 'Sezione trasversale secondo la norma VSS 40 201, autocarro – '
              'autovettura – bicicletta, 30 km/h: 7,10 m (riduzione della '
              'velocità durante il sorpasso). Sezione esistente circa 7,00 m, '
              'TGM circa 4200 veic./giorno.',
        'en': 'Cross section according to standard VSS 40 201, lorry – '
              'passenger car – bicycle, 30 km/h: 7.10 m (speed reduction when '
              'overtaking). Existing cross section approx. 7.00 m, ADT approx. '
              '4200 veh./day.',
    },
    ('P216-2700023-1254173', '4'): {
        'fr': 'Distance de visibilité en direction du centre du village '
              'réduite par une haie.',
        'it': 'Distanza di visibilità in direzione del centro del paese '
              'limitata da una siepe.',
        'en': 'Sight distance towards the village centre restricted by a '
              'hedge.',
    },
    ('P243-2705336-1242585', '16'): {
        'fr': "Dans la courbe, la distance de visibilité d'arrêt nécessaire "
              "n'est pas assurée, en raison d'un mur, d'un bâtiment et de la "
              'végétation. Disponible env. 40 m; selon la norme VSS 40 090b '
              '«Projectation, bases – distances de visibilité», 70 m seraient '
              'nécessaires à V = 60 km/h (avec une déclivité de 6 %). Pour les '
              'mêmes raisons, la distance de visibilité de dépassement '
              "nécessaire n'est pas assurée; selon la norme, 450 m seraient "
              'nécessaires à V = 60 km/h.',
        'it': 'Nel tratto in curva la distanza di visibilità di arresto '
              'necessaria non è garantita, a causa di un muro, di un edificio '
              'e della vegetazione. Disponibile circa 40 m; secondo la norma '
              'VSS 40 090b «Progettazione, basi – distanze di visibilità» '
              'sarebbero necessari 70 m a V = 60 km/h (con una pendenza del '
              '6 %). Per gli stessi motivi non è garantita la distanza di '
              'visibilità di sorpasso necessaria; secondo la norma sarebbero '
              'necessari 450 m a V = 60 km/h.',
        'en': 'In the curve the required stopping sight distance is not '
              'available, because of a wall, a building and planting. '
              'Available approx. 40 m; according to standard VSS 40 090b '
              '"Design, principles – sight distances", 70 m would be required '
              'at V = 60 km/h (with a 6% gradient). For the same reasons the '
              'required overtaking sight distance is not available; according '
              'to the standard, 450 m would be required at V = 60 km/h.',
    },
    ('P243-2705336-1242585', '18'): {
        'fr': 'Fin du cheminement piéton des deux côtés sans possibilité de '
              'traverser pour rejoindre l’autre côté de la chaussée. '
              'L’endroit de traversée supposé est mal visible. Du côté '
              'intérieur de la courbe, env. 50 m des deux côtés; du côté '
              'extérieur, env. 75 m des deux côtés; selon la norme '
              'VSS 40 241, 75 m sont nécessaires à 60 km/h.',
        'it': 'Fine del percorso pedonale su entrambi i lati senza possibilità '
              'di attraversare verso l’altro lato della carreggiata. Il punto '
              'di attraversamento presunto è poco visibile. Sul lato interno '
              'della curva circa 50 m su entrambi i lati, sul lato esterno '
              'circa 75 m su entrambi i lati; secondo la norma VSS 40 241 a '
              '60 km/h sono necessari 75 m.',
        'en': 'The footway ends on both sides without a crossing facility to '
              'reach the other side of the carriageway. The presumed crossing '
              'point is poorly visible. On the inside of the curve approx. '
              '50 m on both sides, on the outside approx. 75 m on both sides; '
              'according to standard VSS 40 241, 75 m are required at '
              '60 km/h.',
    },
    ('P243-2705336-1242585', '15'): {
        'fr': 'Largeur du trottoir env. 1,70 m; la largeur nécessaire selon la '
              'norme VSS 640 070 est de 2 m, ponctuellement > 1,50 m. Hauteur '
              'libre réduite sous un arbre: 1,70 m disponibles, 3,00 m '
              'nécessaires selon la norme VSS 40 273a (également en raison de '
              "la distance de visibilité d'arrêt).",
        'it': 'Larghezza del marciapiede circa 1,70 m; la larghezza necessaria '
              'secondo la norma VSS 640 070 è di 2 m, puntualmente > 1,50 m. '
              'Altezza libera ridotta sotto un albero: 1,70 m disponibili, '
              '3,00 m necessari secondo la norma VSS 40 273a (anche a causa '
              'della distanza di visibilità di arresto).',
        'en': 'Width of the footway approx. 1.70 m; the required width '
              'according to standard VSS 640 070 is 2 m, locally > 1.50 m. '
              'Restricted headroom under a tree: 1.70 m available, 3.00 m '
              'required according to standard VSS 40 273a (also because of the '
              'stopping sight distance).',
    },
    ('P248-2676493-1231985', '14'): {
        'fr': "Distance de visibilité d'arrêt non respectée: Sa requise = 38 m "
              '(v = 40 km/h, i = −4 %), Sa disponible = env. 29 m.',
        'it': 'Distanza di visibilità di arresto non rispettata: Sa richiesta '
              '= 38 m (v = 40 km/h, i = −4 %), Sa disponibile = circa 29 m.',
        'en': 'Stopping sight distance not met: Sa required = 38 m '
              '(v = 40 km/h, i = −4%), Sa available = approx. 29 m.',
    },
    ('P248-2676493-1231985', '10'): {
        'fr': "Emplacement de l'arrêt de bus inadapté. Il masque la vue, n'est "
              'pas sans obstacles, implique une entrée par l’intersection et '
              'le marquage STOP, et gêne la traversée des piétons.',
        'it': 'Ubicazione della fermata del bus inadatta. Ostacola la vista, '
              'non è priva di barriere, comporta l’entrata attraverso '
              'l’intersezione e la demarcazione STOP e ostacola '
              'l’attraversamento dei pedoni.',
        'en': 'Location of the bus stop unsuitable. It obstructs sight, is not '
              'barrier-free, entails entering across the junction and the STOP '
              'marking, and hinders pedestrians crossing.',
    },
    ('P248-2676493-1231985', '11'): {
        'fr': 'Distances de visibilité vers la droite insuffisantes – miroir '
              'sur le côté opposé (non chauffé).',
        'it': 'Distanze di visibilità verso destra insufficienti – specchio '
              'sul lato opposto (non riscaldato).',
        'en': 'Sight distances to the right insufficient – mirror on the '
              'opposite side (unheated).',
    },
    ('P244-2712124-1242475', '6'): {
        'fr': 'Le dispositif de retenue passif manque du côté amont au début '
              'du mur de soutènement.',
        'it': 'Il dispositivo di ritenuta passivo manca sul lato a monte '
              'all’inizio del muro di sostegno.',
        'en': 'The passive restraint system is missing on the uphill side at '
              'the start of the retaining wall.',
    },
    ('P244-2712124-1242475', '7'): {
        'fr': 'Accotement manquant le long du mur de soutènement – le mur '
              "empiète sur le gabarit d'espace libre.",
        'it': 'Banchina mancante lungo il muro di sostegno – il muro sporge '
              'nella sagoma limite.',
        'en': 'Verge missing along the retaining wall – the wall projects into '
              'the clearance profile.',
    },
    ('P244-2712124-1242475', '5'): {
        'fr': 'Sa disponible env. 50 m; Sa requise env. 60 m (Vp 60, '
              'déclivité 12 %).',
        'it': 'Sa disponibile circa 50 m; Sa richiesta circa 60 m (Vp 60, '
              'pendenza 12 %).',
        'en': 'Sa available approx. 50 m; Sa required approx. 60 m (Vp 60, '
              '12% gradient).',
    },
    ('P255-2676349-1235949', '6'): {
        'fr': 'Visibilité depuis le chemin d’accès vers le nord réduite par la '
              'végétation (env. 40 m).',
        'it': 'Visibilità dalla strada d’accesso verso nord limitata dalla '
              'vegetazione (circa 40 m).',
        'en': 'Sight from the access road towards the north restricted by '
              'planting (approx. 40 m).',
    },
    ('P255-2676349-1235949', '5'): {
        'fr': "L'aménagement de la branche d'intersection n'est pas conforme à "
              "la norme (on ne sait pas s'il s'agit d'une traversée de "
              'trottoir ou d’une intersection avec «cédez le passage»); le '
              'trottoir sud se termine simplement sur la chaussée.',
        'it': "La configurazione del ramo d'intersezione non è conforme alla "
              'norma (non è chiaro se si tratti di un attraversamento del '
              'marciapiede o di un’intersezione con «dare precedenza»); il '
              'marciapiede a sud termina semplicemente sulla strada.',
        'en': 'The design of the junction approach does not conform to the '
              'standard (it is unclear whether it is a footway crossing or a '
              'give-way junction); the southern footway simply ends at the '
              'road.',
    },
    ('P255-2676349-1235949', '8'): {
        'fr': "Ligne de dissuasion devant l'îlot central interrompue.",
        'it': "Linea di dissuasione davanti all'isola spartitraffico "
              'interrotta.',
        'en': 'Deterrent line before the central island interrupted.',
    },
    ('P260-2687395-1242447', '15'): {
        'fr': "La distance de visibilité sur la zone d'approche sud du passage "
              'piéton est inférieure à la valeur normative (requis: 55 m, '
              'existant: env. 37 m). Vue masquée par les usagers de la route, '
              'sans réduction due à la courbe puisque r > 40 m. La distance de '
              'perception du signal n° 4.11 de 110 m (existant: env. 60 m) '
              "n'est pas respectée.",
        'it': 'La distanza di visibilità sulla zona di avvicinamento sud del '
              'passaggio pedonale è inferiore al valore normativo (richiesto: '
              '55 m, esistente: circa 37 m). Vista ostacolata dagli utenti '
              'della strada, senza riduzione dovuta alla curva poiché '
              'r > 40 m. La distanza di percezione del segnale n. 4.11 di '
              '110 m (esistente: circa 60 m) non è rispettata.',
        'en': 'Sight distance to the southern approach area of the pedestrian '
              'crossing falls below the standard value (required: 55 m, '
              'actual: approx. 37 m). Sight obstructed by road users, no '
              'reduction due to the curve since r > 40 m. The recognition '
              'distance of 110 m for sign no. 4.11 (actual: approx. 60 m) is '
              'not met.',
    },
    ('P260-2687395-1242447', '18'): {
        'fr': 'La distance de visibilité vers la gauche sur la chaussée est '
              'inférieure à la valeur normative (requis: entre 50 et 70 m, '
              'existant: env. 15 m); vitesse élevée du trafic cycliste en '
              'descente le long du bord de la chaussée.',
        'it': 'La distanza di visibilità verso sinistra sulla carreggiata è '
              'inferiore al valore normativo (richiesto: tra 50 e 70 m, '
              'esistente: circa 15 m); velocità elevata del traffico '
              'ciclistico in discesa lungo il bordo della carreggiata.',
        'en': 'Intersection sight distance to the left along the carriageway '
              'falls below the standard value (required: between 50 and 70 m, '
              'actual: approx. 15 m); high speed of cycle traffic downhill '
              'along the edge of the carriageway.',
    },
    ('P260-2687395-1242447', '17'): {
        'fr': 'De généreux rayons d’entrée et de sortie ainsi que de larges '
              'voies sur les branches d’entrée et de sortie favorisent des '
              'vitesses élevées dans l’intersection.',
        'it': 'Raggi di entrata e di uscita generosi e corsie larghe nei rami '
              'di entrata e di uscita favoriscono velocità elevate '
              'nell’intersezione.',
        'en': 'Generous entry and exit radii and wide lanes on the approach '
              'and exit arms encourage high speeds through the junction.',
    },
    ('P233-2678967-1233024', '18'): {
        'fr': "La distance de visibilité d'arrêt est insuffisante en période "
              'de végétation. À une vitesse pratiquée de 80 km/h et une '
              'déclivité d’environ 4,5 %, une distance de visibilité d’au '
              'moins 120 m est nécessaire (existant: env. 85 m).',
        'it': 'La distanza di visibilità di arresto è insufficiente nel '
              'periodo vegetativo. A una velocità praticata di 80 km/h e con '
              'una pendenza di circa 4,5 % è necessaria una distanza di '
              'visibilità di almeno 120 m (esistente: circa 85 m).',
        'en': 'The stopping sight distance is insufficient during the growing '
              'season. At a driven speed of 80 km/h and a gradient of about '
              '4.5%, a sight distance of at least 120 m is required (actual: '
              'approx. 85 m).',
    },
    ('P233-2678967-1233024', '19'): {
        'fr': 'Débouché à angle aigu. De ce fait, presque aucun freinage lors '
              'du virage à droite dans la route secondaire débouchante (mise '
              'en danger du trafic cycliste traversant).',
        'it': 'Immissione ad angolo acuto. Di conseguenza quasi nessuna '
              'frenata nella svolta a destra verso la strada secondaria che si '
              'immette (pericolo per il traffico ciclistico che attraversa).',
        'en': 'Junction at an acute angle. As a result there is hardly any '
              'braking when turning right into the joining secondary road '
              '(endangering cyclists crossing).',
    },
    ('P233-2678967-1233024', '21'): {
        'fr': 'Selon les standards cyclables cantonaux, le tourner-à-gauche '
              'indirect doit être annoncé par la signalisation correspondante '
              'environ 25,00 m à 30,00 m avant l’endroit concerné.',
        'it': 'Secondo gli standard ciclabili cantonali, la svolta a sinistra '
              'indiretta deve essere annunciata con la segnaletica '
              'corrispondente circa 25,00 m a 30,00 m prima del punto '
              'interessato.',
        'en': 'According to the cantonal cycling standards, the indirect left '
              'turn must be announced with the corresponding signing about '
              '25.00 m to 30.00 m before the location concerned.',
    },
    ('P252-2675601-1259482', '14'): {
        'fr': 'Depuis le chemin d’accès débouchant, la distance de visibilité '
              'vers la gauche est réduite à environ 70 m en raison du talus '
              'dans la courbe, au lieu de la distance de visibilité minimale '
              'requise de 120 m pour une route de liaison régionale.',
        'it': 'Dalla strada d’accesso che si immette, la distanza di '
              'visibilità verso sinistra è ridotta a circa 70 m a causa della '
              'scarpata in curva, invece della distanza di visibilità minima '
              'richiesta di 120 m per una strada di collegamento regionale.',
        'en': 'From the joining access road, sight distance to the left is '
              'reduced to about 70 m because of the embankment in the curve, '
              'instead of the required minimum sight distance of 120 m for a '
              'regional connecting road.',
    },
    ('P252-2675601-1259482', '13'): {
        'fr': "Il manque un accotement, de sorte qu'en cas de léger écart de "
              'la chaussée aucun espace de dégagement n’est disponible (p. ex. '
              'lors du croisement de deux bus). De plus, il existe une '
              'différence de hauteur marquée entre la balise et la chaussée; '
              'les réflecteurs se trouvent presque au niveau de la chaussée '
              'plutôt qu’à la hauteur des phares des véhicules.',
        'it': 'Manca una banchina, per cui in caso di lieve uscita dalla '
              'carreggiata non è disponibile alcuno spazio di scampo (per '
              'esempio all’incrocio di due autobus). Inoltre vi è una netta '
              'differenza di quota tra il delineatore e la carreggiata; i '
              'catarifrangenti si trovano quasi a livello della carreggiata '
              'anziché all’altezza dei fari dei veicoli.',
        'en': 'A verge is missing, so that no recovery space is available if a '
              'vehicle slightly leaves the carriageway (for example when two '
              'buses meet). In addition there is a marked difference in height '
              'between the guide post and the carriageway; the reflectors sit '
              'almost at carriageway level instead of at the height of vehicle '
              'headlights.',
    },
    ('P252-2675601-1259482', '12'): {
        'fr': 'La chaussée présente par endroits de nombreuses fissures, ce '
              'qui indique un état globalement mauvais.',
        'it': 'La carreggiata presenta a tratti numerose fessure, il che '
              'indica uno stato complessivamente scadente.',
        'en': 'The carriageway shows numerous cracks in places, which points '
              'to a poor overall condition.',
    },
    ('P253-2676600-1237129', '1'): {
        'fr': 'Les conditions de visibilité depuis la sortie de propriété sur '
              'le trottoir sont insuffisantes à gauche comme à droite et se '
              'situent à env. 8–9 m au lieu de la distance de visibilité '
              'minimale de 15 m prescrite par la norme VSS 40 273 (avec une '
              'déclivité longitudinale de 0 %). Motif: situation bâtie et '
              'stationnement.',
        'it': 'Le condizioni di visibilità dall’uscita del fondo privato sul '
              'marciapiede sono insufficienti a sinistra e a destra e si '
              'attestano su circa 8–9 m invece della distanza di visibilità '
              'minima di 15 m prescritta dalla norma VSS 40 273 (con una '
              'pendenza longitudinale dello 0 %). Motivo: situazione edificata '
              'e parcheggio.',
        'en': 'Sight conditions from the private exit onto the footway are '
              'inadequate to the left and to the right and amount to approx. '
              '8–9 m instead of the minimum sight distance of 15 m required by '
              'standard VSS 40 273 (with a longitudinal gradient of 0%). '
              'Reason: built situation and parking.',
    },
    ('P253-2676600-1237129', '7'): {
        'fr': "L'accès à la station-service favorise la traversée de "
              "l'intersection par-dessus la ligne d'attente de la route "
              'secondaire débouchante. Cela peut facilement conduire à des '
              'conflits entre les véhicules sortant de cette route et ceux qui '
              "entrent à la station-service. De manière générale, l'accès à la "
              "station-service n'est pas clairement réglé ni aménagé sans "
              'ambiguïté.',
        'it': 'L’accesso alla stazione di servizio favorisce l’attraversamento '
              'dell’intersezione oltre la linea di attesa della strada '
              'secondaria che si immette. Ciò può facilmente causare conflitti '
              'tra i veicoli che escono da questa strada e quelli che entrano '
              'nella stazione di servizio. In generale l’accesso alla stazione '
              'di servizio non è chiaramente regolato né configurato in modo '
              'univoco.',
        'en': 'The access to the filling station encourages crossing the '
              'junction over the waiting line of the joining secondary road. '
              'This can easily lead to conflicts between vehicles leaving that '
              'road and vehicles entering the filling station. In general the '
              'access to the filling station is neither clearly regulated nor '
              'unambiguously designed.',
    },
    ('P253-2676600-1237129', '3'): {
        'fr': 'Le signal SSV 2.50 «interdiction de parquer» est en partie en '
              'mauvais état; en particulier, la flèche directionnelle du '
              'panneau de répétition n’est presque plus perceptible.',
        'it': 'Il segnale OSStr 2.50 «divieto di parcheggio» è in parte in '
              'cattivo stato; in particolare la freccia direzionale del '
              'cartello di ripetizione è quasi non più percepibile.',
        'en': 'Sign SSV 2.50 "no parking" is partly in poor condition; in '
              'particular the direction arrow on the repeater plate is barely '
              'perceptible any more.',
    },
    ('P255-2676459-1236358', '22'): {
        'fr': 'Stationnement perpendiculaire privé; visibilité fortement '
              'réduite en marche arrière sur le trottoir et la chaussée; la '
              'case de stationnement est du moins surlongue.',
        'it': 'Parcheggio perpendicolare privato; visibilità fortemente '
              'ridotta in retromarcia sul marciapiede e sulla carreggiata; lo '
              'stallo è perlomeno più lungo del necessario.',
        'en': 'Private perpendicular parking; sight severely restricted when '
              'reversing onto footway and road; the parking bay is at least '
              'over-long.',
    },
    ('P255-2676459-1236358', '19'): {
        'fr': 'Sur les trois îlots centraux du giratoire, la bordure est trop '
              'basse pour les personnes malvoyantes.',
        'it': 'Su tutte e tre le isole spartitraffico della rotatoria il '
              'cordolo è troppo basso per le persone ipovedenti.',
        'en': 'At all three central islands of the roundabout the kerb is too '
              'low for people with impaired vision.',
    },
    ('P255-2676459-1236358', '20'): {
        'fr': 'Diverses fissures, en grande partie réparées.',
        'it': 'Diverse fessure, in gran parte riparate.',
        'en': 'Various cracks, largely repaired.',
    },
}


# ── Massnahmentexte ──────────────────────────────────────────────────────────
# Der Text, den der Inspektionsbericht als Massnahme vorschlägt. Er bildet den
# Inhalt der Lernkarte. Der senkrechte Strich der Quelle trennt mehrere
# Massnahmen; anlegen.py macht daraus Sätze.

MASSNAHMEN = {
    ('P239-2707475-1260348', '1'): {
        'fr': 'Mettre en place un dispositif de retenue, éventuellement avec '
              'protection contre le sous-glissement pour les motocyclistes; au '
              'minimum toutefois des balises simples. Peut se faire dans le '
              'cadre de la remise en état.',
        'it': 'Realizzare un dispositivo di ritenuta, eventualmente con '
              'protezione contro il sottoscorrimento per i motociclisti; come '
              'minimo però delineatori semplici. Può avvenire nell’ambito '
              'della manutenzione.',
        'en': 'Install a vehicle restraint system, possibly with underride '
              'protection for motorcyclists; at least simple guide posts. Can '
              'be done as part of the maintenance work.',
    },
    ('P239-2707475-1260348', '2'): {
        'fr': 'Compléter la ligne de bord blanche dans le cadre de la remise '
              'en état; sur la route secondaire débouchante, compléter en '
              'outre la ligne médiane discontinue.',
        'it': 'Completare la linea di margine bianca nell’ambito della '
              'manutenzione; sulla strada secondaria che si immette '
              'completare inoltre la linea mediana discontinua.',
        'en': 'Add the white edge line as part of the maintenance work; on the '
              'joining secondary road additionally add the broken centre '
              'line.',
    },
    ('P254-2676144-1246650', '1'): {
        'fr': "Examiner le déplacement ainsi qu'une disposition "
              "perpendiculaire de l'accès agricole.",
        'it': 'Esaminare lo spostamento e una disposizione perpendicolare '
              'dell’accesso agricolo.',
        'en': 'Examine relocating the farm access and arranging it at right '
              'angles.',
    },
    ('P254-2676144-1246650', '3'): {
        'fr': 'Élargir le profil en travers selon les exigences de la norme '
              'VSS 40 201.',
        'it': 'Allargare la sezione trasversale secondo i requisiti della '
              'norma VSS 40 201.',
        'en': 'Widen the cross section in accordance with standard '
              'VSS 40 201.',
    },
    ('P254-2676390-1246987', '10'): {
        'fr': 'Tailler la végétation. Examiner un agrandissement de la '
              'distance entre la chaussée et les accès aux parcelles et aux '
              'maisons. Examiner une protection construite des accès aux '
              'maisons (p. ex. rétrécissement latéral). Examiner le tracé du '
              'trottoir et du cheminement piéton.',
        'it': 'Potare la vegetazione. Esaminare un aumento della distanza tra '
              'la carreggiata e gli accessi ai fondi e alle case. Esaminare '
              'una protezione costruita degli accessi alle case (per esempio '
              'restringimento laterale). Esaminare il tracciato del '
              'marciapiede e del percorso pedonale.',
        'en': 'Cut back the vegetation. Examine increasing the distance '
              'between the carriageway and the property and house accesses. '
              'Examine structural protection of the house accesses (e.g. '
              'lateral narrowing). Examine the routing of footway and '
              'footpath.',
    },
    ('P254-2676390-1246987', '11'): {
        'fr': 'Compléter la signalisation et le marquage «cédez le passage». '
              'Examiner un redimensionnement. Examiner la traversée de '
              'trottoir.',
        'it': 'Completare la segnaletica e la demarcazione «dare precedenza». '
              'Esaminare un ridimensionamento. Esaminare l’attraversamento '
              'del marciapiede.',
        'en': 'Add give-way signing and marking. Examine a resizing. Examine '
              'the footway crossing.',
    },
    ('P216-2700023-1254173', '2'): {
        'fr': 'Examiner la largeur de la bande cyclable, marquer '
              'éventuellement une bande de 1,50 m. Examiner la disposition de '
              'la bande cyclable, largeur minimale 1,80 m; examen combiné avec '
              'le choix du profil en travers, voir le défaut n° 3.',
        'it': 'Esaminare la larghezza della corsia ciclabile, eventualmente '
              'demarcare una corsia di 1,50 m. Esaminare la disposizione della '
              'corsia ciclabile, larghezza minima 1,80 m; esame combinato con '
              'la scelta della sezione trasversale, vedi carenza n. 3.',
        'en': 'Examine the width of the cycle lane, possibly mark a lane of '
              '1.50 m. Examine the arrangement of the cycle lane, minimum '
              'width 1.80 m; examine together with the choice of cross '
              'section, see deficiency no. 3.',
    },
    ('P216-2700023-1254173', '3'): {
        'fr': 'Examiner en relation avec le défaut n° 2. Examiner la largeur '
              'de la chaussée (chaussée à voie centrale banalisée ou bande '
              'cyclable de 1,80 m).',
        'it': 'Esaminare in relazione con la carenza n. 2. Esaminare la '
              'larghezza della carreggiata (carreggiata con corsia centrale o '
              'corsia ciclabile di 1,80 m).',
        'en': 'Examine in connection with deficiency no. 2. Examine the '
              'carriageway width (core carriageway or cycle lane of 1.80 m).',
    },
    ('P216-2700023-1254173', '4'): {
        'fr': 'Examiner les distances de visibilité; tailler la végétation '
              'afin que la visibilité soit assurée.',
        'it': 'Esaminare le distanze di visibilità; potare la vegetazione '
              'affinché la visibilità sia garantita.',
        'en': 'Examine the sight distances; cut back the planting so that '
              'sight is assured.',
    },
    ('P243-2705336-1242585', '16'): {
        'fr': 'Poser une ligne de sécurité continue. Examiner un abaissement '
              'de la vitesse maximale signalée.',
        'it': 'Posare una linea di sicurezza continua. Esaminare un abbassamento '
              'della velocità massima segnalata.',
        'en': 'Apply a continuous safety line. Examine lowering the posted '
              'speed limit.',
    },
    ('P243-2705336-1242585', '18'): {
        'fr': 'Examiner le besoin d’une traversée piétonne.',
        'it': 'Esaminare la necessità di un attraversamento pedonale.',
        'en': 'Examine the need for a pedestrian crossing.',
    },
    ('P243-2705336-1242585', '15'): {
        'fr': 'Tailler la végétation. Prévoir un élargissement du trottoir '
              'dans le cadre d’un projet d’assainissement ou de construction '
              'nouvelle.',
        'it': 'Potare la vegetazione. Prevedere un allargamento del '
              'marciapiede nell’ambito di un progetto di risanamento o di '
              'nuova costruzione.',
        'en': 'Cut back the planting. Provide for a widening of the footway as '
              'part of a rehabilitation or new construction project.',
    },
    ('P248-2676493-1231985', '14'): {
        'fr': 'Tailler les haies et démontrer à nouveau la distance de '
              "visibilité. Si la distance de visibilité d'arrêt n'est pas "
              'atteinte après la taille, créer une berme de visibilité avec, '
              'le cas échéant, une adaptation des murs de soutènement.',
        'it': 'Potare le siepi e dimostrare nuovamente la distanza di '
              'visibilità. Se dopo la potatura la distanza di visibilità di '
              'arresto non è rispettata, creare una berma di visibilità con '
              'eventuale adattamento dei muri di sostegno.',
        'en': 'Cut back the hedges and demonstrate the sight distance again. '
              'If the stopping sight distance is still not met after cutting '
              'back, create a visibility berm, adapting the retaining walls if '
              'necessary.',
    },
    ('P248-2676493-1231985', '10'): {
        'fr': "Assainissement, y compris examen d'un déplacement de "
              "l'emplacement de l'arrêt de bus.",
        'it': 'Risanamento, compreso l’esame di uno spostamento della '
              'posizione della fermata del bus.',
        'en': 'Rehabilitation, including examining a relocation of the bus '
              'stop.',
    },
    ('P248-2676493-1231985', '11'): {
        'fr': "Réaménager l'intersection afin de respecter les distances de "
              'visibilité et de supprimer le miroir. Chauffer le miroir.',
        'it': 'Riconfigurare l’intersezione per rispettare le distanze di '
              'visibilità e sopprimere lo specchio. Riscaldare lo specchio.',
        'en': 'Redesign the junction so that the sight distances are met and '
              'the mirror can be removed. Heat the mirror.',
    },
    ('P244-2712124-1242475', '6'): {
        'fr': 'Mettre en place un dispositif de protection passif.',
        'it': 'Realizzare un dispositivo di protezione passivo.',
        'en': 'Install a passive protection device.',
    },
    ('P244-2712124-1242475', '7'): {
        'fr': "Marquage d'une ligne de bord.",
        'it': 'Demarcazione di una linea di margine.',
        'en': 'Marking of an edge line.',
    },
    ('P244-2712124-1242475', '5'): {
        'fr': 'Examiner une réduction de la vitesse à 60 km/h. Décaisser le '
              'talus (création d’une berme de visibilité).',
        'it': 'Esaminare una riduzione della velocità a 60 km/h. Sbancare la '
              'scarpata (creazione di una berma di visibilità).',
        'en': 'Examine a speed reduction to 60 km/h. Cut back the embankment '
              '(creating a visibility berm).',
    },
    ('P255-2676349-1235949', '6'): {
        'fr': 'Réduire la végétation.',
        'it': 'Ridurre la vegetazione.',
        'en': 'Reduce the planting.',
    },
    ('P255-2676349-1235949', '5'): {
        'fr': "Aménager l'intersection conformément à la norme.",
        'it': 'Configurare l’intersezione conformemente alla norma.',
        'en': 'Build the junction in accordance with the standard.',
    },
    ('P255-2676349-1235949', '8'): {
        'fr': 'Marquer une ligne de dissuasion continue.',
        'it': 'Demarcare una linea di dissuasione continua.',
        'en': 'Mark a continuous deterrent line.',
    },
    ('P260-2687395-1242447', '15'): {
        'fr': "Déplacer l'armoire de distribution: examiner les possibilités à "
              "court terme, sinon adapter dans le cadre du projet "
              "d'intersection. Améliorer la distance de perception (vue sur le "
              'signal 4.11 sur l’îlot) en taillant les buissons et la haie du '
              'côté intérieur de la courbe.',
        'it': 'Spostare la cassetta di distribuzione: esaminare le possibilità '
              'a breve termine, altrimenti adattare nell’ambito del progetto '
              'dell’intersezione. Migliorare la distanza di percezione (vista '
              'sul segnale 4.11 sull’isola) potando arbusti e siepe sul lato '
              'interno della curva.',
        'en': 'Relocate the distribution cabinet: examine short-term options, '
              'otherwise adapt as part of the junction project. Improve the '
              'recognition distance (view of sign 4.11 on the island) by '
              'cutting back shrubs and hedge on the inside of the curve.',
    },
    ('P260-2687395-1242447', '18'): {
        'fr': 'Examiner une taille de la haie, monter un miroir routier. '
              "Examiner une interdiction de circuler sur le chemin de liaison "
              'afin d’éviter du trafic supplémentaire; la desserte reste '
              'assurée par l’intersection voisine.',
        'it': 'Esaminare una potatura della siepe, montare uno specchio '
              'stradale. Esaminare un divieto di circolazione sul percorso di '
              'collegamento per evitare traffico supplementare; '
              'l’accessibilità resta garantita tramite l’intersezione '
              'vicina.',
        'en': 'Examine cutting back the hedge, install a traffic mirror. '
              'Examine a traffic ban on the connecting path to avoid further '
              'traffic; access remains assured via the neighbouring junction.',
    },
    ('P260-2687395-1242447', '17'): {
        'fr': "Redimensionner l'intersection dans le cadre d'un projet "
              "d'assainissement (en tenant compte des courbes de giration), "
              'réduire les rayons d’entrée et de sortie afin que le passage '
              'piéton se raccorde aussi à une bordure droite. Examiner un '
              'rétrécissement des voies au moyen de marquages.',
        'it': 'Ridimensionare l’intersezione nell’ambito di un progetto di '
              'risanamento (tenendo conto delle curve di sterzata), ridurre i '
              'raggi di entrata e di uscita affinché anche il passaggio '
              'pedonale si raccordi a un bordo diritto. Esaminare un '
              'restringimento delle corsie mediante demarcazioni.',
        'en': 'Resize the junction as part of a rehabilitation project (taking '
              'swept paths into account), reduce entry and exit radii so that '
              'the pedestrian crossing also meets a straight kerb line. '
              'Examine narrowing the lanes by means of markings.',
    },
    ('P233-2678967-1233024', '18'): {
        'fr': 'Agrandir le rayon de courbe selon la norme 40 100a. Pendant les '
              "phases de forte croissance, l'herbe doit être fauchée à "
              "intervalles réguliers par l'entretien. Les agriculteurs doivent "
              "être rendus attentifs au fait que, lors de la plantation de "
              'cultures, le champ de visibilité nécessaire doit rester '
              'durablement dégagé.',
        'it': 'Aumentare il raggio della curva secondo la norma 40 100a. '
              'Durante le fasi di crescita intensa l’erba deve essere falciata '
              'a intervalli regolari dalla manutenzione. Gli agricoltori '
              'vanno resi attenti al fatto che, nella coltivazione, il campo '
              'di visibilità necessario deve restare durevolmente libero.',
        'en': 'Increase the curve radius in accordance with standard 40 100a. '
              'During periods of intensive growth the grass must be mown at '
              'regular intervals by maintenance staff. Farmers must be made '
              'aware that, when planting crops, the required sight area has to '
              'be kept clear permanently.',
    },
    ('P233-2678967-1233024', '19'): {
        'fr': "Il convient d'examiner si une adaptation de la géométrie de "
              "l'intersection est nécessaire pour améliorer la conduite du "
              'trafic et la sécurité routière.',
        'it': 'Occorre esaminare se sia necessario un adattamento della '
              'geometria dell’intersezione per migliorare la conduzione del '
              'traffico e la sicurezza stradale.',
        'en': 'It should be examined whether the junction geometry needs to be '
              'adapted to improve traffic guidance and road safety.',
    },
    ('P233-2678967-1233024', '21'): {
        'fr': 'Compléter la signalisation directionnelle par le signal '
              'correspondant pour le tourner-à-gauche indirect.',
        'it': 'Completare la segnaletica direzionale con il segnale '
              'corrispondente per la svolta a sinistra indiretta.',
        'en': 'Complete the direction signing with the corresponding sign for '
              'the indirect left turn.',
    },
    ('P252-2675601-1259482', '14'): {
        'fr': "Évaluer les possibilités d'adapter la zone de talus ou le "
              "concept d'exploitation et d'aménagement (p. ex. 60 km/h).",
        'it': 'Valutare le possibilità di adattare la zona della scarpata o il '
              'concetto di esercizio e configurazione (per esempio 60 km/h).',
        'en': 'Assess the options for adapting the embankment area or the '
              'operating and design concept (e.g. 60 km/h).',
    },
    ('P252-2675601-1259482', '13'): {
        'fr': "Réaliser un accotement conforme à la norme dans le cadre d'un "
              'réaménagement.',
        'it': 'Realizzare una banchina conforme alla norma nell’ambito di una '
              'riconfigurazione.',
        'en': 'Build a verge that conforms to the standard as part of a '
              'redesign.',
    },
    ('P252-2675601-1259482', '12'): {
        'fr': 'Assainir la chaussée.',
        'it': 'Risanare la carreggiata.',
        'en': 'Rehabilitate the carriageway.',
    },
    ('P253-2676600-1237129', '1'): {
        'fr': "Tenir compte de l'aménagement et de la largeur du trottoir dans "
              'le cadre d’un réaménagement; limiter la surface de '
              'stationnement.',
        'it': 'Tenere conto della configurazione e della larghezza del '
              'marciapiede nell’ambito di una riconfigurazione; limitare la '
              'superficie di parcheggio.',
        'en': 'Take the design and width of the footway into account in a '
              'redesign; limit the parking area.',
    },
    ('P253-2676600-1237129', '7'): {
        'fr': "Tenir compte de l'accès à la station-service dans le cadre d'un "
              "réaménagement, afin d'éviter les conflits avec l'intersection "
              'de la route secondaire débouchante.',
        'it': 'Tenere conto dell’accesso alla stazione di servizio nell’ambito '
              'di una riconfigurazione, per evitare conflitti con '
              'l’intersezione della strada secondaria che si immette.',
        'en': 'Take the filling-station access into account in a redesign, in '
              'order to avoid conflicts with the junction of the joining '
              'secondary road.',
    },
    ('P253-2676600-1237129', '3'): {
        'fr': 'Remplacer le signal ou examiner le besoin dans le cadre d’un '
              'aménagement clair et univoque de la chaussée.',
        'it': 'Sostituire il segnale oppure esaminare la necessità nell’ambito '
              'di una configurazione chiara e univoca della carreggiata.',
        'en': 'Replace the sign, or examine the need for it as part of a clear '
              'and unambiguous design of the carriageway.',
    },
    ('P255-2676459-1236358', '22'): {
        'fr': 'Supprimer le stationnement perpendiculaire privé ou au moins le '
              'disposer en stationnement longitudinal. Soit dans le cadre '
              'd’une nouvelle construction sur la parcelle, soit lors de '
              'l’assainissement de la route cantonale.',
        'it': 'Sopprimere il parcheggio perpendicolare privato o perlomeno '
              'disporlo come parcheggio longitudinale. Sia nell’ambito di una '
              'nuova edificazione della particella, sia in occasione del '
              'risanamento della strada cantonale.',
        'en': 'Remove the private perpendicular parking, or at least arrange '
              'it as parallel parking. Either as part of new development on '
              'the plot or when the cantonal road is rehabilitated.',
    },
    ('P255-2676459-1236358', '19'): {
        'fr': 'Réaliser la bordure conformément à la norme.',
        'it': 'Realizzare il cordolo conformemente alla norma.',
        'en': 'Build the kerb in accordance with the standard.',
    },
    ('P255-2676459-1236358', '20'): {
        'fr': "Renouveler le revêtement dans le cadre de l'assainissement.",
        'it': 'Rinnovare la pavimentazione nell’ambito del risanamento.',
        'en': 'Renew the surfacing as part of the rehabilitation.',
    },
}
