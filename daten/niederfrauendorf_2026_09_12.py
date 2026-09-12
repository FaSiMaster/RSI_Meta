"""Baut die Einfuhrdatei fuer die Beispielszene Niederfrauendorf (B4).

Grundlage sind ausschliesslich freigegebene Werte. Jeder correctAssessment-Wert
stammt aus einem Entscheid; die Fundstellen stehen in
`.claude/entscheide/JOURNAL.md`:

    E-5    Designprobleme sind die zwei Massbefunde des Berichts, 8 und 13
    E-9    Befundliste, erweitert durch F-001 um 17 und 12
    F-005  Defizit 7 bleibt aussen
    F-007  Kriterium fuer Schritt 2 ist die Unfallzuordnung des Berichts
    F-009  Defizit 17 gross      F-010  Defizit 12 gross
    F-011  Defizit 9 gross       F-012  Defizit 10 gross
    F-013  Defizit 4 gross       F-014  Defizit 14 mittel
    F-015  Defizit 15 mittel
    E-10   Die Phase von 2017 kommt als unbewertete Vergleichsphase mit
    E-12   Massgebend ist der Auditbericht: Freigabe am 21. Februar 2020

Nicht aus einem Entscheid stammen die Verortungen. Sie sind am Bild abgelesen,
mit einem Gitternetz in Zehnteln, und als Vorschlag zu verstehen: wo genau ein
Befund im Bild sitzt, ist eine Bildbeurteilung und am Bildschirm zu pruefen.
Die Abstaende sind hier maschinell geprueft, damit zwei Befunde im selben Bild
nicht uebereinanderliegen und der zweite unauffindbar wird.

Aufruf:
    python daten/niederfrauendorf_2026_09_12.py

Ergebnis ist eine JSON-Datei neben diesem Skript. Eingelesen wird sie ueber
`daten/einlesen.mjs`, also durch dieselbe Pruefung und dieselben
save-Funktionen wie eine Einfuhr von Hand.
"""

from __future__ import annotations

import json
import math
import pathlib
import sys

# ── Kennungen und Pfade ─────────────────────────────────────────────────────

THEMA_ID = "de-knoten-2026"
SZENE_ID = "SZ_2026_115"

# Pfadkonvention des Bildspeichers, siehe src/components/admin/BildUpload.tsx:
# panoramas/{szeneId}/{name}.{ext}. Der Ordnername ist fuer eine Bildserie
# irrefuehrend, aber er ist gesetzt; ein zweiter Pfad waere eine Aenderung am
# Upload und gehoert nicht in diesen Schritt.
SPEICHER = (
    "https://gtweaesunpvwjlttyaab.supabase.co/storage/v1/object/public/"
    f"rsi-textures/panoramas/{SZENE_ID}/"
)

BILD_2022 = [f"{SPEICHER}nfd_2022_{i:02d}.jpg" for i in range(1, 7)]
BILD_2017 = [f"{SPEICHER}nfd_2017_{i:02d}.jpg" for i in range(1, 3)]

# Seitenverhaeltnis je Bild, gemessen an der verkleinerten Datei. Gebraucht
# wird es hier nur fuer die Abstandspruefung; zur Laufzeit liest der Viewer es
# aus dem geladenen Bild.
SV = {
    BILD_2022[0]: 2048 / 923,
    BILD_2022[1]: 2048 / 1152,
    BILD_2022[2]: 2048 / 1152,
    BILD_2022[3]: 2048 / 1152,
    BILD_2022[4]: 2048 / 1152,
    BILD_2022[5]: 2048 / 1152,
}

UKO = "de-uko-2"


def ml(de: str, fr: str, it: str, en: str) -> dict[str, str]:
    return {"de": de, "fr": fr, "it": it, "en": en}


# ── Die neun Befunde ────────────────────────────────────────────────────────
#
# «art» und «stufe» sind die Musterloesung: Schritt 1 und Schritt 2 der
# Konvention. «bild» und «pos» sind der Verortungsvorschlag.

BEFUNDE = [
    {
        "id": "SD_0101",
        "nr": 15,
        "art": "sicherheitsdefizit",
        "stufe": "mittel",
        "bild": BILD_2022[0],
        "pos": (0.52, 0.52, 0.12),
        "name": ml(
            "Minikreisverkehr in der Annäherung nicht erkennbar",
            "Mini-giratoire non reconnaissable à l'approche",
            "Minirotatoria non riconoscibile in avvicinamento",
            "Mini-roundabout not recognisable on approach",
        ),
        "beschreibung": ml(
            "Aus der Annäherung entsteht der Eindruck einer durchlaufenden Strasse. Zufahrten, Kreisfahrbahn, Kreisinsel und Beschilderung sind nicht so gestaltet, dass die Situation rechtzeitig erkannt wird.",
            "À l'approche, l'impression est celle d'une route continue. Les entrées, la chaussée annulaire, l'îlot central et la signalisation ne sont pas conçus pour que la situation soit reconnue à temps.",
            "In avvicinamento si ha l'impressione di una strada continua. Accessi, corona giratoria, isola centrale e segnaletica non sono configurati in modo da riconoscere la situazione in tempo.",
            "On approach the impression is of a road running straight through. Entries, circulatory carriageway, central island and signing are not designed so that the situation is recognised in time.",
        ),
        "erklaerung": ml(
            "Der Auditbericht hält fest, ein Minikreisverkehr solle nicht angelegt werden, wenn er bei der Annäherung nicht rechtzeitig als solcher erkennbar ist, und der Eindruck einer ununterbrochenen Strasse sei zwingend zu vermeiden. Fundstelle: Merkblatt für die Anlage von Kreisverkehren, Kapitel 2.2, zitiert im Auditbericht S. 16. Die Einstufung mittel folgt dem vereinbarten Kriterium: Regelverstoss mit benannter Folge, aber ohne Zuordnung von Unfällen.",
            "Le rapport d'audit relève qu'un mini-giratoire ne devrait pas être aménagé s'il n'est pas reconnaissable à temps à l'approche. Source: mémento sur l'aménagement des giratoires, chapitre 2.2, cité p. 16. Le classement moyen suit le critère convenu: infraction à la règle avec conséquence nommée, sans accidents attribués.",
            "Il rapporto di audit rileva che una minirotatoria non dovrebbe essere realizzata se non è riconoscibile in tempo. Fonte: promemoria sulla realizzazione di rotatorie, capitolo 2.2, citato a p. 16. La classificazione media segue il criterio concordato: violazione della regola con conseguenza indicata, senza incidenti attribuiti.",
            "The audit report states that a mini-roundabout should not be built where it cannot be recognised in time on approach. Source: guidance note on the design of roundabouts, chapter 2.2, cited on p. 16. The moderate rating follows the agreed criterion: a departure with a named consequence but no attributed accidents.",
        ),
    },
    {
        "id": "SD_0102",
        "nr": 4,
        "art": "sicherheitsdefizit",
        "stufe": "gross",
        "bild": BILD_2022[1],
        "pos": (0.13, 0.57, 0.06),
        "name": ml(
            "Keine Anlagen für den Fussverkehr am Knotenpunkt",
            "Aucun aménagement pour les piétons au carrefour",
            "Nessuna infrastruttura per i pedoni al nodo",
            "No pedestrian facilities at the junction",
        ),
        "beschreibung": ml(
            "Am Knotenpunkt fehlt jede Anlage für den Fussverkehr. Die Fahrbahn reicht bis an Bebauung, Einfriedung und Schutzplanke; Zufussgehende müssen ungeschützt auf der Fahrbahn laufen, auch auf dem Weg zur Bushaltestelle.",
            "Aucun aménagement pour les piétons n'existe au carrefour. La chaussée s'étend jusqu'aux bâtiments, aux clôtures et à la glissière; les piétons doivent marcher sans protection sur la chaussée, y compris pour rejoindre l'arrêt de bus.",
            "Al nodo manca qualsiasi infrastruttura per i pedoni. La carreggiata arriva fino agli edifici, alle recinzioni e alla barriera; i pedoni devono camminare senza protezione sulla carreggiata, anche per raggiungere la fermata dell'autobus.",
            "The junction has no pedestrian facilities at all. The carriageway extends to buildings, fences and the safety barrier; people on foot must walk unprotected on the carriageway, including on the way to the bus stop.",
        ),
        "erklaerung": ml(
            "Der Auditbericht nennt die sichere Führung des Fussverkehrs von besonderer Bedeutung und stellt fest, dass Zufussgehende hier ungeschützt auf der Fahrbahn laufen müssen; besonders nachteilig für Kinder, Schülerinnen und Schüler sowie mobilitätseingeschränkte Menschen. Fundstellen: Auditbericht S. 9 und S. 11. Drei Buslinien befahren alle vier Äste. Im Unfallgeschehen der Jahre 2020 bis 2022 ist der Fussverkehr nicht abgebildet, was bei kleinen Zahlen kein Gegenbeweis ist.",
            "Le rapport d'audit qualifie la sécurité du cheminement piéton de particulièrement importante et constate que les piétons doivent marcher sans protection sur la chaussée. Sources: p. 9 et p. 11. Trois lignes de bus empruntent les quatre branches.",
            "Il rapporto di audit definisce particolarmente importante la sicurezza dei percorsi pedonali e constata che i pedoni devono camminare senza protezione sulla carreggiata. Fonti: p. 9 e p. 11. Tre linee di autobus percorrono tutti e quattro i rami.",
            "The audit report calls safe pedestrian routing particularly important and finds that people on foot must walk unprotected on the carriageway. Sources: p. 9 and p. 11. Three bus routes use all four arms.",
        ),
    },
    {
        "id": "SD_0103",
        "nr": 9,
        "art": "sicherheitsdefizit",
        "stufe": "gross",
        "bild": BILD_2022[1],
        "pos": (0.24, 0.70, 0.05),
        "name": ml(
            "Kreisinsel ohne Bordeinfassung",
            "Îlot central sans bordure",
            "Isola centrale senza cordolo",
            "Central island without kerb",
        ),
        "beschreibung": ml(
            "Die Kreisinsel ist nicht eingefasst. Der Übergang von der Kreisfahrbahn zur Insel ist höhengleich, und die Insel wird regelmässig und ohne Komforteinbussen von Personenwagen überfahren.",
            "L'îlot central n'est pas bordé. Le passage de la chaussée annulaire à l'îlot est de niveau, et l'îlot est régulièrement franchi par des voitures sans perte de confort.",
            "L'isola centrale non è delimitata. Il passaggio dalla corona giratoria all'isola è a raso e l'isola viene regolarmente attraversata dalle automobili senza perdita di comfort.",
            "The central island has no kerb. The transition from the circulatory carriageway to the island is flush, and cars drive across the island regularly and without discomfort.",
        ),
        "erklaerung": ml(
            "Der Auditbericht nennt den Bord, zusammen mit einer wirksamen Kreisinsel, das zentrale Element zur Gewährleistung der Verkehrssicherheit des Kreisverkehrs; verlangt ist eine Einfassung von etwa 4 bis 5 cm Höhe. Fundstelle: Merkblatt für die Anlage von Kreisverkehren, Kapitel 3.7, zitiert im Auditbericht S. 13, dort als Abbildung 9. Die Wirkung ist am Ort festgestellt, nicht abgeleitet.",
            "Le rapport d'audit qualifie la bordure, avec un îlot efficace, d'élément central pour la sécurité du giratoire; une bordure de 4 à 5 cm est exigée. Source: mémento, chapitre 3.7, cité p. 13, illustration 9.",
            "Il rapporto di audit definisce il cordolo, insieme a un'isola efficace, elemento centrale per la sicurezza della rotatoria; è richiesto un cordolo di 4 a 5 cm. Fonte: promemoria, capitolo 3.7, citato a p. 13, figura 9.",
            "The audit report calls the kerb, together with an effective island, the central element for the safety of the roundabout; a kerb of about 4 to 5 cm is required. Source: guidance note, chapter 3.7, cited on p. 13, figure 9.",
        ),
    },
    {
        "id": "SD_0104",
        "nr": 8,
        "art": "gestaltung",
        "stufe": None,
        "bild": BILD_2022[1],
        "pos": (0.40, 0.72, 0.06),
        "name": ml(
            "Kreisinseldurchmesser unter dem Mindestmass",
            "Diamètre de l'îlot central sous la valeur minimale",
            "Diametro dell'isola centrale sotto la misura minima",
            "Central island diameter below the minimum",
        ),
        "beschreibung": ml(
            "Der gemessene Durchmesser der Kreisinsel beträgt 3 m. Gefordert sind mindestens 4 m.",
            "Le diamètre mesuré de l'îlot central est de 3 m. Le minimum exigé est de 4 m.",
            "Il diametro misurato dell'isola centrale è di 3 m. Il minimo richiesto è di 4 m.",
            "The measured diameter of the central island is 3 m. At least 4 m is required.",
        ),
        "erklaerung": ml(
            "Ein Gestaltungsbefund: Der Auditbericht nennt hier allein die Unterschreitung des Mindestmasses. Die Sicherheitsfolge, die fehlende Ablenkung der Geradeausströme, führt er als eigenen Befund daneben. Fundstellen: Auditbericht S. 13 für das Mass, S. 14 für die Folge. Deshalb entfällt hier die Einstufung. Diese Zuordnung ist eine Schlussfolgerung aus der Gliederung des Berichts und kein Zitat aus seinem Text.",
            "Un constat de conception: le rapport d'audit ne mentionne ici que le non-respect de la valeur minimale. La conséquence pour la sécurité figure comme constat distinct. Sources: p. 13 pour la mesure, p. 14 pour la conséquence. Cette attribution est une déduction de la structure du rapport.",
            "Un rilievo di progettazione: il rapporto di audit menziona qui solo il mancato rispetto della misura minima. La conseguenza per la sicurezza figura come rilievo separato. Fonti: p. 13 per la misura, p. 14 per la conseguenza. Questa attribuzione è una deduzione dalla struttura del rapporto.",
            "A design finding: the audit report mentions only the shortfall against the minimum dimension here. The safety consequence appears as a separate finding. Sources: p. 13 for the measurement, p. 14 for the consequence. This attribution is inferred from the structure of the report.",
        ),
    },
    {
        "id": "SD_0105",
        "nr": 13,
        "art": "gestaltung",
        "stufe": None,
        "bild": BILD_2022[1],
        "pos": (0.72, 0.58, 0.07),
        "name": ml(
            "Eckausrundungen mit unzureichenden Radien",
            "Rayons de raccordement insuffisants",
            "Raggi di raccordo insufficienti",
            "Corner radii inadequate",
        ),
        "beschreibung": ml(
            "Die Eckausrundungen der Zu- und Ausfahrten erreichen die geforderten Radien von 8 bis 10 m nicht. Die verfügbare Fläche reicht für eine regelkonforme Ausbildung nicht aus.",
            "Les rayons de raccordement des entrées et sorties n'atteignent pas les 8 à 10 m exigés. La surface disponible ne suffit pas à un aménagement conforme.",
            "I raggi di raccordo degli accessi e delle uscite non raggiungono gli 8 a 10 m richiesti. La superficie disponibile non basta per una realizzazione conforme.",
            "The corner radii of the entries and exits do not reach the required 8 to 10 m. The available area is insufficient for a compliant layout.",
        ),
        "erklaerung": ml(
            "Ein Gestaltungsbefund: Der Auditbericht schliesst aus der Nachtrassierung, dass ein Minikreisverkehr hier hinsichtlich der Eckausrundungen nicht realisierbar ist. Das ist eine Aussage über die Machbarkeit, kein benannter Unfallmechanismus, deshalb entfällt die Einstufung. Fundstelle: Auditbericht S. 15, dort als Abbildung 10. Zur Verortung: Der Bericht belegt den Befund mit einer Nachtrassierung auf einem Luftbild. Dieses Bild ist hier nicht verwendet, weil seine Nutzung ungeklärt ist; verortet ist der Befund stattdessen an der Ausfahrt, deren Geometrie im Foto sichtbar ist.",
            "Un constat de conception: le rapport conclut de la retracé qu'un mini-giratoire n'est pas réalisable ici s'agissant des rayons de raccordement. Il s'agit d'une affirmation sur la faisabilité, sans mécanisme d'accident nommé. Source: p. 15, illustration 10.",
            "Un rilievo di progettazione: il rapporto conclude dal ritracciamento che una minirotatoria non è realizzabile qui per quanto riguarda i raggi di raccordo. È un'affermazione sulla fattibilità, senza meccanismo d'incidente indicato. Fonte: p. 15, figura 10.",
            "A design finding: from the retracing exercise the report concludes that a mini-roundabout cannot be built here as regards corner radii. That is a statement about feasibility, with no named accident mechanism. Source: p. 15, figure 10.",
        ),
    },
    {
        "id": "SD_0106",
        "nr": 10,
        "art": "sicherheitsdefizit",
        "stufe": "gross",
        "bild": BILD_2022[2],
        "pos": (0.47, 0.55, 0.09),
        "name": ml(
            "Geradeausfahrende werden nicht abgelenkt",
            "Les véhicules allant tout droit ne sont pas déviés",
            "I veicoli che vanno diritti non vengono deviati",
            "Through traffic is not deflected",
        ),
        "beschreibung": ml(
            "Fahrzeuge befahren die Kreisfahrbahn kaum, sondern überfahren den Knotenpunkt nahezu geradlinig. Auch Linksabbieger nehmen den direkten Weg. Die geschwindigkeitsreduzierende Wirkung des Kreisverkehrs ist gering.",
            "Les véhicules empruntent à peine la chaussée annulaire et franchissent le carrefour presque en ligne droite. Les véhicules tournant à gauche prennent aussi le chemin direct. L'effet de réduction de vitesse est faible.",
            "I veicoli percorrono a stento la corona giratoria e attraversano il nodo quasi in linea retta. Anche chi svolta a sinistra prende la via diretta. L'effetto di riduzione della velocità è debole.",
            "Vehicles barely use the circulatory carriageway and cross the junction almost in a straight line. Left-turning vehicles also take the direct route. The speed-reducing effect is slight.",
        ),
        "erklaerung": ml(
            "Die Ablenkung der Geradeausströme durch die Kreisinsel ist der Wirkmechanismus eines Kreisverkehrs. Weil die Insel nur 3 m misst und der Bord fehlt, kann das erforderliche Ablenkmass nicht gewährleistet werden. Fundstelle: Auditbericht S. 14, die Beobachtung vor Ort und Abbildung 11 mit dem überwiegend beobachteten Fahrverhalten. Die Wirkung ist am Ort festgestellt.",
            "La déviation des flux directs par l'îlot central est le mécanisme d'action d'un giratoire. L'îlot ne mesurant que 3 m et la bordure manquant, la déviation requise ne peut être assurée. Source: p. 14 et illustration 11.",
            "La deviazione dei flussi diretti tramite l'isola centrale è il meccanismo d'azione di una rotatoria. Poiché l'isola misura solo 3 m e manca il cordolo, la deviazione richiesta non può essere garantita. Fonte: p. 14 e figura 11.",
            "Deflection of through traffic by the central island is how a roundabout works. With an island of only 3 m and no kerb, the required deflection cannot be achieved. Source: p. 14 and figure 11.",
        ),
    },
    {
        "id": "SD_0107",
        "nr": 17,
        "art": "sicherheitsdefizit",
        "stufe": "gross",
        "bild": BILD_2022[3],
        "pos": (0.66, 0.55, 0.09),
        "name": ml(
            "Engstelle in der Knotenpunktzufahrt",
            "Rétrécissement dans l'entrée du carrefour",
            "Restringimento nell'accesso al nodo",
            "Narrow section in the junction approach",
        ),
        "beschreibung": ml(
            "Etwa 5 m nach der Kreisfahrbahn beträgt die Breite 4,70 m, beidseitig begrenzt von einer Mauer und einer Schutzplanke vor einem Gebäude. Zwei sich begegnende Personenwagen benötigen 4,75 m.",
            "Environ 5 m après la chaussée annulaire, la largeur est de 4,70 m, bordée d'un mur et d'une glissière devant un bâtiment. Deux voitures qui se croisent ont besoin de 4,75 m.",
            "Circa 5 m dopo la corona giratoria la larghezza è di 4,70 m, delimitata da un muro e da una barriera davanti a un edificio. Due automobili che si incrociano necessitano di 4,75 m.",
            "About 5 m beyond the circulatory carriageway the width is 4.70 m, bounded by a wall and a safety barrier in front of a building. Two cars passing each other need 4.75 m.",
        ),
        "erklaerung": ml(
            "Der einzige Befund, dem die Unfallanalyse das laufende Geschehen unmittelbar zuordnet: fünf der zehn Unfälle im Zeitraum haben ihre Ursache in der Befahrbarkeit dieses Bereichs, darunter alle drei Längsverkehrsunfälle. Dazu kommen ungenügende Sichtbeziehungen und nicht vernachlässigbarer Schwerverkehr mit Linienbus; die Verkehrsprognose verdreifacht den Verkehr auf diesem Abschnitt. Fundstellen: Auditbericht S. 5 für die Unfälle, S. 18 für den Befund, RASt Kapitel 4.3 für den Begegnungsbedarf.",
            "Le seul constat auquel l'analyse des accidents attribue directement les faits: cinq des dix accidents ont leur cause dans la praticabilité de ce secteur. Sources: p. 5 et p. 18.",
            "L'unico rilievo a cui l'analisi degli incidenti attribuisce direttamente gli eventi: cinque dei dieci incidenti hanno la loro causa nella praticabilità di questa zona. Fonti: p. 5 e p. 18.",
            "The only finding to which the accident analysis directly attributes events: five of the ten accidents originate in the trafficability of this area. Sources: p. 5 and p. 18.",
        ),
    },
    {
        "id": "SD_0108",
        "nr": 12,
        "art": "sicherheitsdefizit",
        "stufe": "gross",
        "bild": BILD_2022[4],
        "pos": (0.60, 0.48, 0.08),
        "name": ml(
            "Fahrstreifenbreiten in Zu- und Ausfahrten zu gering",
            "Largeurs de voie insuffisantes dans les entrées et sorties",
            "Larghezze di corsia insufficienti negli accessi e nelle uscite",
            "Lane widths too narrow in entries and exits",
        ),
        "beschreibung": ml(
            "Gefordert sind 3,25 bis 3,75 m in der Zufahrt und 3,50 bis 4,00 m in der Ausfahrt. Gemessen wurden Werte ab 2,20 m; im Arm nach Reinhardsgrimma 2,50 m in der Zufahrt und 2,20 m in der Ausfahrt.",
            "Les largeurs exigées sont de 3,25 à 3,75 m en entrée et de 3,50 à 4,00 m en sortie. Les valeurs mesurées descendent à 2,20 m.",
            "Le larghezze richieste sono da 3,25 a 3,75 m in entrata e da 3,50 a 4,00 m in uscita. I valori misurati scendono a 2,20 m.",
            "The required widths are 3.25 to 3.75 m on entry and 3.50 to 4.00 m on exit. Measured values go down to 2.20 m.",
        ),
        "erklaerung": ml(
            "Der Auditbericht stellt den Bezug zum Unfallgeschehen ausdrücklich her: die beengten Verhältnisse in den Zu- und Ausfahrten spiegeln sich deutlich im aktuellen Unfallgeschehen, insbesondere im Knotenpunktarm nach Reinhardsgrimma. Fundstelle: Auditbericht S. 14 mit der Tabelle aller fünf Arme. Drei Buslinien befahren alle Äste; das Bild zeigt die Begegnung von Bus und Lastwagen.",
            "Le rapport établit expressément le lien avec les accidents: l'étroitesse des entrées et sorties se reflète nettement dans les accidents actuels. Source: p. 14 avec le tableau des cinq branches.",
            "Il rapporto stabilisce espressamente il legame con gli incidenti: la ristrettezza degli accessi e delle uscite si riflette chiaramente negli incidenti attuali. Fonte: p. 14 con la tabella dei cinque rami.",
            "The report expressly draws the link to the accident record: the constricted entries and exits are clearly reflected in current accidents. Source: p. 14 with the table of all five arms.",
        ),
    },
    {
        "id": "SD_0109",
        "nr": 14,
        "art": "sicherheitsdefizit",
        "stufe": "mittel",
        "bild": BILD_2022[5],
        "pos": (0.54, 0.55, 0.09),
        "name": ml(
            "Kreisverkehr wird nicht als solcher begriffen",
            "Le giratoire n'est pas compris comme tel",
            "La rotatoria non viene compresa come tale",
            "The roundabout is not understood as one",
        ),
        "beschreibung": ml(
            "Das Fahrverhalten eines Kreisverkehrsplatzes stellt sich kaum ein. Die Kreisinsel wird vom überwiegenden Teil der Verkehrsteilnehmenden nicht beachtet, das Zeichen 295 regelmässig überfahren und die Kreisfahrbahn kaum als solche genutzt. Daraus entstehen Unsicherheiten bei den Vorfahrtregelungen.",
            "Le comportement propre à un giratoire ne s'installe guère. L'îlot central n'est pas respecté par la majorité des usagers et la chaussée annulaire est à peine utilisée comme telle. Il en résulte des incertitudes sur les règles de priorité.",
            "Il comportamento tipico di una rotatoria non si instaura. L'isola centrale non viene rispettata dalla maggior parte degli utenti e la corona giratoria viene usata a stento come tale. Ne derivano incertezze sulle regole di precedenza.",
            "Roundabout driving behaviour barely establishes itself. Most road users disregard the central island and hardly use the circulatory carriageway as such. Uncertainty about priority rules follows.",
        ),
        "erklaerung": ml(
            "Ein Sammelbefund über die baulichen Gestaltungsdefizite. Die Einstufung mittel statt gross hat einen Grund im Bericht selbst: er hält in der Veranlassung fest, dass das permanent festgestellte Fehlverhalten ohne aktuelle Unfallfolgen bleibt. Dazu stehen die Ursachen einzeln schon in dieser Übung; gross würde dieselbe Sache doppelt gewichten. Fundstellen: Auditbericht S. 16 für den Befund, S. 8 für die Veranlassung. Dieses Bild zeigt ein zweites Fahrzeug aus einer anderen Richtung mit demselben Verhalten, und damit ein Muster statt eines Einzelfalls.",
            "Un constat de synthèse sur les défauts d'aménagement. Le classement moyen tient à ce que le rapport lui-même relève que le comportement fautif constaté reste sans conséquences d'accident actuelles. Sources: p. 16 et p. 8.",
            "Un rilievo riassuntivo sui difetti di realizzazione. La classificazione media deriva dal fatto che il rapporto stesso rileva che il comportamento scorretto constatato resta senza conseguenze attuali di incidenti. Fonti: p. 16 e p. 8.",
            "A summary finding covering the design defects. The moderate rating follows from the report itself, which notes that the persistent misbehaviour has no current accident consequences. Sources: p. 16 and p. 8.",
        ),
    },
]


def pruefe_abstaende() -> list[str]:
    """Zwei Befunde im selben Bild duerfen sich nicht ueberlappen.

    Sonst trifft ein Klick immer denselben, und der zweite ist nicht
    auffindbar. Gerechnet wird wie in trefferImBild: y im Verhaeltnis der
    Bildbreite, damit der Radius ein Kreis bleibt.
    """
    meldungen: list[str] = []
    nach_bild: dict[str, list[dict]] = {}
    for b in BEFUNDE:
        nach_bild.setdefault(b["bild"], []).append(b)

    for bild, liste in nach_bild.items():
        sv = SV[bild]
        for i in range(len(liste)):
            for j in range(i + 1, len(liste)):
                a, b = liste[i], liste[j]
                ax, ay, ar = a["pos"]
                bx, by, br = b["pos"]
                abstand = math.hypot(ax - bx, (ay - by) / sv)
                if abstand < ar + br:
                    meldungen.append(
                        f"Defizit {a['nr']} und {b['nr']} ueberlappen in "
                        f"{bild.rsplit('/', 1)[-1]}: Abstand {abstand:.3f} < "
                        f"{ar + br:.3f}"
                    )
        for b in liste:
            x, y, r = b["pos"]
            if not (0 < x < 1 and 0 < y < 1 and 0 < r <= 0.3):
                meldungen.append(f"Defizit {b['nr']}: Verortung ausserhalb des Bildes oder Radius unbrauchbar")
    return meldungen


def baue() -> dict:
    thema = {
        "id": THEMA_ID,
        "nameI18n": ml(
            "Knotenpunkte Deutschland",
            "Carrefours Allemagne",
            "Nodi Germania",
            "Junctions Germany",
        ),
        "beschreibungI18n": ml(
            "Beurteilung nach dem Verfahren der Unfallkommission: Art des Befundes, dann Einstufung.",
            "Appréciation selon la procédure de la commission des accidents: nature du constat, puis classement.",
            "Valutazione secondo la procedura della commissione infortuni: natura del rilievo, poi classificazione.",
            "Assessment under the accident commission procedure: type of finding, then classification.",
        ),
        "iconKey": "junction",
        "sortOrder": 90,
        "isActive": True,
        "country": "DE",
    }

    szene = {
        "id": SZENE_ID,
        "topicId": THEMA_ID,
        "nameI18n": ml(
            "Niederfrauendorf, Knotenpunkt S 183 und S 190",
            "Niederfrauendorf, carrefour S 183 et S 190",
            "Niederfrauendorf, nodo S 183 e S 190",
            "Niederfrauendorf, junction S 183 and S 190",
        ),
        "beschreibungI18n": ml(
            "Minikreisverkehr als Verkehrsversuch, freigegeben am 21. Februar 2020. Vier Knotenpunktarme, drei Buslinien, Tagesverkehr 639 bis 6238 Fahrzeuge je Arm.",
            "Mini-giratoire à titre d'essai, ouvert le 21 février 2020. Quatre branches, trois lignes de bus, trafic journalier de 639 à 6238 véhicules par branche.",
            "Minirotatoria come sperimentazione, aperta il 21 febbraio 2020. Quattro rami, tre linee di autobus, traffico giornaliero da 639 a 6238 veicoli per ramo.",
            "Mini-roundabout as a traffic trial, opened on 21 February 2020. Four arms, three bus routes, daily traffic of 639 to 6238 vehicles per arm.",
        ),
        "bemerkungI18n": ml(
            "Die Bilder der bewerteten Phase stammen von der Ortsbesichtigung am 12. Mai 2022. Die Vergleichsphase zeigt denselben Ort am 13. September 2017, zur Zeit der mobilen Lichtsignalanlage; dort ist nichts zu finden.",
            "Les images de la phase évaluée datent de la visite du 12 mai 2022. La phase de comparaison montre le même lieu le 13 septembre 2017.",
            "Le immagini della fase valutata risalgono al sopralluogo del 12 maggio 2022. La fase di confronto mostra lo stesso luogo il 13 settembre 2017.",
            "The images of the assessed phase are from the site visit on 12 May 2022. The comparison phase shows the same location on 13 September 2017.",
        ),
        "kontext": "io",
        "isActive": True,
        "country": "DE",
        "szenentyp": "bildserie",
        "vorschauBild1": BILD_2022[1],
        "vorschauBild2": BILD_2022[3],
        "phasen": [
            {
                "id": "ph-2022-minikreisverkehr",
                "labelI18n": ml("Minikreisverkehr", "Mini-giratoire", "Minirotatoria", "Mini-roundabout"),
                "zeitangabeI18n": ml(
                    "12. Mai 2022", "12 mai 2022", "12 maggio 2022", "12 May 2022",
                ),
                "bilder": BILD_2022,
                "bewertet": True,
            },
            {
                "id": "ph-2017-lichtsignalanlage",
                "labelI18n": ml(
                    "Mobile Lichtsignalanlage",
                    "Feux mobiles",
                    "Impianto semaforico mobile",
                    "Temporary traffic signals",
                ),
                "zeitangabeI18n": ml(
                    "13. September 2017", "13 septembre 2017", "13 settembre 2017", "13 September 2017",
                ),
                "bilder": BILD_2017,
                "bewertet": False,
            },
        ],
    }

    defizite = []
    for b in BEFUNDE:
        x, y, r = b["pos"]
        defizite.append({
            "id": b["id"],
            "sceneId": SZENE_ID,
            "topicId": THEMA_ID,
            "nameI18n": b["name"],
            "beschreibungI18n": b["beschreibung"],
            "erklaerungI18n": b["erklaerung"],
            # Der Schluessel bleibt gesetzt, weil das Datenmodell ihn verlangt.
            # Die Konvention der Unfallkommission arbeitet nicht mit der
            # WICHTIGKEIT_TABLE des Schweizer Fachkurses; der Wert traegt hier
            # keine Bewertung.
            "kriteriumId": "knoten_allgemein",
            "kontext": "io",
            "correctAssessment": {
                "verfahren": UKO,
                "schritt1": b["art"],
                "schritt2": b["stufe"],
            },
            "isPflicht": b["art"] == "sicherheitsdefizit" and b["stufe"] == "gross",
            "isBooster": False,
            # Leer und nicht mit einer deutschen Richtlinie gefuellt: das Feld
            # wird vom Waechter src/test/normnummern.test.ts gegen den
            # Schweizer Normenbestand geprueft. Die Fundstellen des
            # Auditberichts stehen in der Erklaerung.
            "normRefs": [],
            "verortung": None,
            "verortungen": {b["bild"]: {"typ": "bild", "x": x, "y": y, "r": r}},
        })

    return {
        "version": "rsi-v3",
        "erzeugt": "2026-09-12",
        "quelle": "Sicherheitsaudit im Bestand S 183/S 190 Knotenpunkt Niederfrauendorf, 15. August 2022, LASuV Niederlassung Meissen",
        "hinweis": (
            "Beispielszene fuer das Verfahren der Unfallkommission. Alle "
            "correctAssessment-Werte stammen aus den Entscheiden E-5, E-9 und "
            "F-001 bis F-015, festgehalten in .claude/entscheide/JOURNAL.md. "
            "Die Verortungen sind am Bild abgelesen und als Vorschlag zu "
            "pruefen."
        ),
        "topics": [thema],
        "scenes": [szene],
        "deficits": defizite,
    }


def pruefe_kennungen() -> list[str]:
    """Fragt die belegten Kennungen ab, bevor die Datei geschrieben wird.

    Anlass: Die erste Fassung dieses Skripts waehlte SZ_2026_101, und diese
    Kennung gehoerte schon einer Szene aus dem Projekt infra3d. Aufgefallen ist
    es erst beim Messen des Bildspeichers, wo der Ordner mit sechs Dateien
    dastand. Eine Einfuhr haette die bestehende Szene ueberschrieben.

    Ohne Netz oder ohne .env.local wird die Pruefung uebersprungen, aber
    sichtbar: eine stille Nachsicht waere hier schlimmer als keine Pruefung.
    """
    import json as _json
    import urllib.request
    import urllib.error

    env_datei = pathlib.Path(__file__).resolve().parents[1] / ".env.local"
    if not env_datei.exists():
        print("Hinweis: .env.local fehlt, Kennungen nicht gegen die Datenbank geprueft.")
        return []

    env: dict[str, str] = {}
    for zeile in env_datei.read_text(encoding="utf-8").splitlines():
        if "=" in zeile and not zeile.strip().startswith("#"):
            k, _, v = zeile.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    adresse = env.get("VITE_SUPABASE_URL", "").rstrip("/")
    schluessel = env.get("VITE_SUPABASE_ANON_KEY", "")
    if not adresse or not schluessel:
        print("Hinweis: Zugangsdaten unvollstaendig, Kennungen nicht geprueft.")
        return []

    def hol(pfad: str):
        anfrage = urllib.request.Request(
            adresse + pfad,
            headers={"apikey": schluessel, "Authorization": f"Bearer {schluessel}"},
        )
        with urllib.request.urlopen(anfrage, timeout=20) as antwort:
            return _json.loads(antwort.read())

    try:
        szenen = {str(x["id"]) for x in hol("/rest/v1/rsi_scenes?select=id")}
        defizite = {str(x["id"]) for x in hol("/rest/v1/rsi_deficits?select=id")}
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as fehler:
        print(f"Hinweis: Datenbank nicht erreichbar ({fehler}), Kennungen nicht geprueft.")
        return []

    meldungen = []
    if SZENE_ID in szenen:
        meldungen.append(f"Szenenkennung {SZENE_ID} ist belegt")
    for b in BEFUNDE:
        if b["id"] in defizite:
            meldungen.append(f"Defizitkennung {b['id']} ist belegt")
    if not meldungen:
        print(f"Kennungen geprueft: {SZENE_ID} und {len(BEFUNDE)} Defizite sind frei "
              f"({len(szenen)} Szenen und {len(defizite)} Defizite im Bestand).")
    return meldungen


def main() -> None:
    meldungen = pruefe_kennungen() + pruefe_abstaende()
    if meldungen:
        print("Nicht brauchbar:")
        for m in meldungen:
            print("  -", m)
        sys.exit(1)

    daten = baue()
    ziel = pathlib.Path(__file__).with_name("rsi-import_niederfrauendorf_2026-09-12.json")
    ziel.write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    sd = [d for d in daten["deficits"] if d["correctAssessment"]["schritt1"] == "sicherheitsdefizit"]
    gest = [d for d in daten["deficits"] if d["correctAssessment"]["schritt1"] == "gestaltung"]
    stufen: dict[str, int] = {}
    for d in sd:
        stufen[str(d["correctAssessment"]["schritt2"])] = stufen.get(str(d["correctAssessment"]["schritt2"]), 0) + 1

    print("geschrieben:", ziel.name)
    print(f"  Thema 1, Szene 1, Defizite {len(daten['deficits'])}")
    print(f"  Sicherheitsdefizite {len(sd)}, Gestaltungsbefunde {len(gest)}")
    print(f"  Einstufungen: {stufen}")
    print(f"  Pflichtbefunde: {sum(1 for d in daten['deficits'] if d['isPflicht'])}")
    print(f"  Phasen: {[p['id'] for p in daten['scenes'][0]['phasen']]}")
    print(f"  Bilder bewertet {len(BILD_2022)}, Vergleich {len(BILD_2017)}")
    print("  Verortungsabstaende geprueft: keine Ueberlappung")
    print(f"  Szenenmaximum: {len(sd)} mal 100 plus {len(gest)} mal 60 = {len(sd) * 100 + len(gest) * 60}")
    if "ß" in ziel.read_text(encoding="utf-8"):
        print("  WARNUNG: Eszett in der Ausgabe")
        sys.exit(1)
    print("  Kein Eszett.")


if __name__ == "__main__":
    main()
