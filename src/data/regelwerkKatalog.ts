// Regelwerk-Katalog — Referenzliste für das Norm-Suchfeld im Defizit-Editor.
//
// QUELLE DER ZUORDNUNG (Stand 6. September 2026):
// SN 641 700:2022 «Strassenverkehrssicherheit; Grundnorm», Anhang G, Ziff. 16,
// Tabelle 2 «Thematische Zuordnung der sicherheitsrelevanten Normen», S. 11–14.
// Die Norm sagt dort selbst, die Tabelle sei «nicht abschliessend».
//
// Nummer und Titel stammen aus dieser Tabelle. Das Feld `jahr` ist die im
// Normenkorpus (Projekt vss_Normen) geführte Ausgabe; fehlt es, ist die Norm
// dort nicht im Bestand — das heisst «hier nicht gefunden», nicht «existiert
// nicht».
//
// WARUM DIE DATEI NEU GESCHRIEBEN WURDE: Der frühere Stand ordnete Nummern
// und Titel frei zu. Elf Einträge trugen einen Titel, der zu einer anderen
// Norm gehört — VSS 40 201 stand als «Fussverkehr — Grundnorm» (richtig:
// Geometrisches Normalprofil), VSS 40 281 als «Knoten mit Lichtsignalanlagen»
// (richtig: Parkieren), VSS 40 360 als «Verkehrsführung in Knoten —
// Markierungen» (richtig: Strassenentwässerung). Eine Referenzliste mit
// falschen Titeln führt dazu, dass eine falsche Norm zitiert wird.
//
// KEINE GÜLTIGKEITSANGABE: Der Korpus führt ein Feld `gueltigkeit`, das für
// diesen Zweck nicht taugt. Es steht bei VSS 40 241:2019 auf «veraltet»,
// obwohl diese Ausgabe gilt und SN 640 241:2000 abgelöst hat — fachlich
// bestätigt am 23.08.2026 im Projekt QuerCheck. Das Feld ist ausserdem nur
// bei 1536 von 3882 Einträgen gesetzt, Stand 15.06.2026. Wer die geltende
// Fassung braucht, prüft sie am Original.
//
// Diese Datei enthält keine normative Logik — keine Punkte, keine Matrizen,
// keine Bewertungen. Sie ist Suchhilfe.

export interface RegelwerkEintrag {
  nummer: string  // vollständig mit Leerzeichen, z.B. "VSS 40 273"
  titel:  string  // Titel laut SN 641 700:2022, Tab. 2
  jahr?:  string  // Ausgabe laut Normenkorpus; fehlt = dort nicht im Bestand
  themen: string[]  // Sicherheitskriterium aus Tab. 2 plus Suchwörter
}

export const REGELWERK_KATALOG: RegelwerkEintrag[] = [
  // ── Infrastruktur-Sicherheitsinstrumente (ISSI) ────────────────
  // Nicht aus Tab. 2, sondern die Verfahrensnormen selbst.
  //
  // Die Umnummerierung von SN 641 xxx auf VSS 41 xxx ist NICHT flächendeckend
  // erfolgt. Das Gesamt-Normenverzeichnis VSS 41 001, Ausgabe 2024-10, führt
  // beide Kreise nebeneinander: die Folgeabschätzung als VSS 41 721 und die
  // Netzeinstufung als VSS 41 725, das Audit und die Inspektion dagegen als
  // SN 641 722 und SN 641 723.
  //
  // Die Ausgabejahre stammen NICHT aus dem Verzeichnis: Dessen Textextraktion
  // ist spaltenverschoben, die Jahre stehen dort neben der falschen Nummer.
  // Sie kommen aus dem Normenbestand, der die PDF selbst führt
  // (SN_641722_2017_de.pdf, SN_641723_2016_de_v2.pdf).
  //
  // Für «VSS 41 723» gibt es damit keinen Beleg — weder im Verzeichnis noch
  // im Normenbestand. Der Katalog führt deshalb die Nummern, die das
  // Verzeichnis führt. Dass der Bestand SN 641 723 als «veraltet» markiert
  // (Stand 15.06.2026), heisst nicht zwingend «umgenummert»; dasselbe Feld
  // steht auch bei der geltenden VSS 40 241:2019 auf «veraltet».
  { nummer: 'SN 641 700', titel: 'Strassenverkehrssicherheit; Grundnorm', jahr: '2022',
    themen: ['grundnorm', 'issi', 'sicherheit'] },
  { nummer: 'VSS 41 721', titel: 'Strassenverkehrssicherheit; Folgeabschätzung (RIA)', jahr: '2023',
    themen: ['ria', 'issi', 'folgeabschaetzung', 'planung'] },
  { nummer: 'SN 641 722', titel: 'Strassenverkehrssicherheit; Audit (RSA)', jahr: '2017',
    themen: ['rsa', 'issi', 'audit', 'projekt'] },
  { nummer: 'SN 641 723', titel: 'Strassenverkehrssicherheit; Inspektion (RSI)', jahr: '2016',
    themen: ['rsi', 'issi', 'inspektion', 'verfahren'] },
  { nummer: 'VSS 41 725', titel: 'Strassenverkehrssicherheit; Netzeinstufung (NSM)', jahr: '2001',
    themen: ['nsm', 'issi', 'netz', 'einstufung'] },

  // ── Verkehrsführung: horizontale Linienführung ─────────────────
  { nummer: 'SN 640 060', titel: 'Leichter Zweiradverkehr; Grundlagen', jahr: '2000',
    themen: ['horizontale linienfuehrung', 'velolaengsfuehrung', 'velo', 'zweirad'] },
  { nummer: 'VSS 40 100', titel: 'Linienführung; Elemente der horizontalen Linienführung',
    themen: ['horizontale linienfuehrung', 'kurve', 'radius', 'trassierung'] },
  // Widerspruch der Quellen: Tab. 2 führt VSS 40 105 als «Verbreiterung der
  // Fahrbahn in Kurven», der Korpus als «Strassenablauf ausserhalb Fahrbahn»
  // (2012). Beide Belege stehen; welcher gilt, ist am Original zu prüfen.
  { nummer: 'VSS 40 105', titel: 'Verbreiterung der Fahrbahn in Kurven [Widerspruch prüfen]', jahr: '2012',
    themen: ['horizontale linienfuehrung', 'querprofil', 'kurve', 'verbreiterung'] },
  { nummer: 'VSS 40 198', titel: 'Kurven; Kehren (Wendeplatten)',
    themen: ['horizontale linienfuehrung', 'kehre', 'wendeplatte'] },
  { nummer: 'VSS 40 271', titel: 'Kontrolle der Befahrbarkeit',
    themen: ['horizontale linienfuehrung', 'knoten', 'befahrbarkeit', 'schleppkurve'] },

  // ── Verkehrsführung: vertikale Linienführung ───────────────────
  { nummer: 'VSS 40 110', titel: 'Linienführung; Elemente der vertikalen Linienführung', jahr: '2019',
    themen: ['vertikale linienfuehrung', 'anhaltesichtweite', 'kuppe', 'wanne', 'gefaelle'] },
  { nummer: 'VSS 40 138', titel: 'Linienführung; Zusatzstreifen in Steigungen und Gefällen', jahr: '2019',
    themen: ['vertikale linienfuehrung', 'zusatzstreifen', 'steigung', 'gefaelle'] },

  // ── Verkehrsführung: räumliche, optische Linienführung ─────────
  { nummer: 'VSS 40 140', titel: 'Linienführung; Optische Anforderungen', jahr: '2019',
    themen: ['optische linienfuehrung', 'visuelle linienfuehrung', 'sichtbarkeit', 'leitwirkung'] },

  // ── Verkehrsführung: Verkehrsfluss und Querprofil ──────────────
  { nummer: 'VSS 40 052', titel: 'Wendeanlagen', jahr: '2019',
    themen: ['querprofil', 'wenden', 'wendeanlage'] },
  { nummer: 'VSS 40 120', titel: 'Linienführung; Quergefälle in Geraden und Kurven, Quergefällsänderung', jahr: '2019',
    themen: ['querprofil', 'quergefaelle', 'kurve'] },
  { nummer: 'VSS 40 200', titel: 'Geometrisches Normalprofil; Allgemeine Grundsätze, Begriffe und Elemente',
    themen: ['querprofil', 'normalprofil', 'gnp', 'grundsaetze'] },
  { nummer: 'VSS 40 201', titel: 'Geometrisches Normalprofil; Grundabmessungen und Lichtraumprofil der Verkehrsteilnehmer', jahr: '2019',
    themen: ['querprofil', 'normalprofil', 'gnp', 'lichtraumprofil', 'verkehrsfluss',
             'fussgaengerlaengsfuehrung', 'velolaengsfuehrung', 'begegnungsfall'] },
  { nummer: 'VSS 40 202', titel: 'Geometrisches Normalprofil; Erarbeitung', jahr: '2021',
    themen: ['querprofil', 'normalprofil', 'gnp', 'erarbeitung'] },
  { nummer: 'VSS 40 303', titel: 'Strassenprojektierung; Entwurf von Hauptverkehrsstrassen innerorts', jahr: '2013',
    themen: ['verkehrsfluss', 'gestaltungselemente', 'innerorts', 'hauptverkehrsstrasse'] },
  { nummer: 'VSS 40 880', titel: 'Bushaltestellen', jahr: '2023',
    themen: ['verkehrsfluss', 'querprofil', 'bus', 'haltestelle'] },
  { nummer: 'VSS 71 253', titel: 'Schiene – Strasse, Parallelführung und Annäherung; Abstand und Schutzmassnahmen', jahr: '2018',
    themen: ['querprofil', 'passive sicherheit', 'bahn', 'schiene'] },

  // ── Knoten: Typ, Elemente und Geometrie ────────────────────────
  { nummer: 'VSS 40 022', titel: 'Leistungsfähigkeit, Verkehrsqualität, Belastbarkeit; Knoten ohne Lichtsignalanlage', jahr: '2019',
    themen: ['knotengeometrie', 'leistungsfaehigkeit', 'knoten'] },
  { nummer: 'VSS 40 023', titel: 'Leistungsfähigkeit, Verkehrsqualität, Belastbarkeit; Knoten mit Lichtsignalanlagen',
    themen: ['knotengeometrie', 'leistungsfaehigkeit', 'lichtsignal', 'lsa'] },
  { nummer: 'VSS 40 024', titel: 'Leistungsfähigkeit, Verkehrsqualität, Belastbarkeit; Knoten mit Kreisverkehr',
    themen: ['knotengeometrie', 'leistungsfaehigkeit', 'kreisel', 'kreisverkehr'] },
  { nummer: 'VSS 40 040', titel: 'Projektierung, Grundlagen; Strassentypen',
    themen: ['knotengeometrie', 'projektierung', 'strassentyp'] },
  { nummer: 'VSS 40 050', titel: 'Grundstückzufahrten; Anordnung und Gestaltung', jahr: '2019',
    themen: ['knotengeometrie', 'grundstueckzufahrt', 'zufahrt', 'ausfahrt'] },
  { nummer: 'SN 640 250', titel: 'Knoten; Grundnorm', jahr: '1998',
    themen: ['knotengeometrie', 'knoten', 'grundnorm'] },
  { nummer: 'VSS 40 251', titel: 'Knoten; Knotenelemente', jahr: '2019',
    themen: ['knotengeometrie', 'knotenelement', 'knoten'] },
  { nummer: 'VSS 40 252', titel: 'Knoten; Führung des Veloverkehrs', jahr: '1994',
    themen: ['knotengeometrie', 'veloquerung', 'velolaengsfuehrung', 'linksabbiegen', 'velo'] },
  { nummer: 'VSS 40 261', titel: 'Knoten; Kreuzungsfreie Knoten', jahr: '2020',
    themen: ['knotengeometrie', 'kreuzungsfrei', 'knoten'] },
  { nummer: 'VSS 40 262', titel: 'Knoten; Knoten in einer Ebene (ohne Kreisverkehr)', jahr: '2019',
    themen: ['knotengeometrie', 'knoten', 'einmuendung', 'kreuzung'] },
  { nummer: 'VSS 40 263', titel: 'Knoten; Knoten mit Kreisverkehr', jahr: '2019',
    themen: ['knotengeometrie', 'kreisel', 'kreisverkehr'] },
  { nummer: 'VSS 40 273', titel: 'Knoten; Sichtverhältnisse in Knoten in einer Ebene',
    themen: ['knotensichtweite', 'knotengeometrie', 'vortrittsregelung', 'sicht', 'sichtweite'] },
  { nummer: 'VSS 40 835', titel: 'Lichtsignalanlagen; Abschätzen der Leistungsfähigkeit', jahr: '2021',
    themen: ['knotengeometrie', 'lichtsignal', 'lsa', 'leistungsfaehigkeit'] },

  // ── Langsamverkehr: Fussgängerquerungen ────────────────────────
  { nummer: 'VSS 40 240', titel: 'Querungen für den Fussgänger- und leichten Zweiradverkehr; Grundlagen', jahr: '2019',
    themen: ['fussgaengerquerung', 'querung', 'fussgaenger', 'grundlagen'] },
  { nummer: 'VSS 40 241', titel: 'Querungen für den Fussgänger- und leichten Zweiradverkehr; Fussgängerstreifen', jahr: '2019',
    themen: ['fussgaengerquerung', 'fussgaengerstreifen', 'querung'] },
  { nummer: 'VSS 40 242', titel: 'Querungen für den Langsamverkehr; Trottoirüberfahrten', jahr: '2022',
    themen: ['fussgaengerquerung', 'trottoirueberfahrt', 'trottoir'] },
  { nummer: 'VSS 40 246', titel: 'Anlagen des Fuss- und Veloverkehrs; Unterführungen', jahr: '2019',
    themen: ['fussgaengerquerung', 'veloquerung', 'unterfuehrung'] },
  { nummer: 'VSS 40 247', titel: 'Querungen für den Fussgänger- und leichten Zweiradverkehr; Überführungen',
    themen: ['fussgaengerquerung', 'veloquerung', 'ueberfuehrung'] },

  // ── Langsamverkehr: Längsführung ───────────────────────────────
  { nummer: 'SN 640 070', titel: 'Fussgängerverkehr; Grundnorm', jahr: '2014',
    themen: ['fussgaengerlaengsfuehrung', 'fussverkehr', 'trottoir', 'gehweg', 'grundnorm'] },
  { nummer: 'SN 640 075', titel: 'Fussgängerverkehr; Hindernisfreier Verkehrsraum', jahr: '2014',
    themen: ['fussgaengerlaengsfuehrung', 'hindernisfrei', 'randstein', 'sehbehindert'] },
  { nummer: 'SN 640 064', titel: 'Führung des leichten Zweiradverkehrs auf Strassen mit öffentlichem Verkehr', jahr: '2009',
    themen: ['velolaengsfuehrung', 'ausruestung', 'velo', 'oeffentlicher verkehr'] },

  // ── Sicht ──────────────────────────────────────────────────────
  // Tab. 2 schreibt «VSS 40 090» ohne Ausgabesuffix; im Korpus liegt die
  // Norm als VSS 40 090b:2019.
  { nummer: 'VSS 40 090b', titel: 'Projektierung, Grundlagen; Sichtweiten', jahr: '2019',
    themen: ['anhaltesichtweite', 'ueberholsichtweite', 'sicht', 'sichtweite', 'bremsweg'] },
  // Nicht in Tab. 2. Die Vorgängerausgabe von VSS 40 273; ein Defizit der
  // Auswahl vom 6. September 2026 zitiert sie, deshalb steht sie hier.
  { nummer: 'VSS 40 273a', titel: 'Knoten; Sichtverhältnisse in Knoten in einer Ebene', jahr: '1998',
    themen: ['knotensichtweite', 'sicht', 'knoten', 'vorgaengerausgabe'] },
  { nummer: 'SN 640 660', titel: 'Grünräume; Grundlagen und Projektierung', jahr: '2004',
    themen: ['anhaltesichtweite', 'knotensichtweite', 'bepflanzung', 'vegetation', 'hecke'] },

  // ── Ausrüstung: Signalisation ──────────────────────────────────
  { nummer: 'VSS 40 822', titel: 'Leiteinrichtungen; Art, Ausführung und Anordnung', jahr: '2024',
    themen: ['signalisation', 'leiteinrichtung', 'leitpfosten', 'optische leiteinrichtung'] },
  { nummer: 'VSS 40 837', titel: 'Lichtsignalanlagen; Übergangszeiten und Mindestzeiten', jahr: '2019',
    themen: ['signalisation', 'lichtsignal', 'lsa'] },
  { nummer: 'VSS 40 838', titel: 'Lichtsignalanlagen; Zwischenzeiten', jahr: '2019',
    themen: ['signalisation', 'lichtsignal', 'lsa'] },
  { nummer: 'VSS 40 845', titel: 'Signale; Anordnung auf Autobahnen und Autostrassen',
    themen: ['signalisation', 'signal', 'autobahn'] },
  { nummer: 'VSS 40 846', titel: 'Signale; Anordnung an Haupt- und Nebenstrassen', jahr: '2021',
    themen: ['signalisation', 'signal', 'wegweiser', 'hauptstrasse'] },
  { nummer: 'VSS 40 847', titel: 'Strassensignale; Anordnung an Kreisverkehrsplätzen', jahr: '2021',
    themen: ['signalisation', 'signal', 'kreisel'] },

  // ── Ausrüstung: Markierung ─────────────────────────────────────
  { nummer: 'SN 640 850', titel: 'Markierungen; Ausgestaltung und Anwendungsbereiche',
    themen: ['markierung', 'randlinie', 'mittellinie', 'leitlinie'] },
  { nummer: 'VSS 40 851', titel: 'Besondere Markierungen; Anwendungsbereiche, Formen und Abmessungen', jahr: '2019',
    themen: ['markierung', 'besondere markierung'] },
  { nummer: 'SN 640 852', titel: 'Markierungen; Taktil-visuelle Markierungen für blinde und sehbehinderte Fussgänger', jahr: '2007',
    themen: ['markierung', 'taktil', 'sehbehindert', 'blind'] },
  { nummer: 'VSS 40 854', titel: 'Markierungen; Anordnung auf Autobahnen und Autostrassen',
    themen: ['markierung', 'autobahn'] },
  { nummer: 'VSS 40 862', titel: 'Markierungen; Anwendungen auf Haupt- und Nebenstrassen', jahr: '2021',
    themen: ['markierung', 'hauptstrasse', 'nebenstrasse', 'randlinie', 'abweislinie'] },

  // ── Ausrüstung: passive Sicherheit ─────────────────────────────
  { nummer: 'SN 640 560', titel: 'Passive Sicherheit im Strassenraum; Grundnorm', jahr: '2018',
    themen: ['passive sicherheit', 'strassenrand', 'grundnorm'] },
  { nummer: 'VSS 40 561', titel: 'Passive Sicherheit im Strassenraum; Fahrzeug-Rückhaltesysteme', jahr: '2019',
    themen: ['passive sicherheit', 'rueckhaltesystem', 'leitplanke', 'schutzeinrichtung'] },
  { nummer: 'VSS 40 562', titel: 'Passive Sicherheit im Strassenraum; Massnahmen in Siedlungsgebieten', jahr: '2024',
    themen: ['passive sicherheit', 'siedlungsgebiet', 'innerorts'] },
  { nummer: 'VSS 40 568', titel: 'Passive Sicherheit im Strassenraum; Geländer', jahr: '2019',
    themen: ['passive sicherheit', 'gelaender'] },
  { nummer: 'VSS 40 569', titel: 'Passive Sicherheit im Strassenraum; Tragkonstruktionen der Strassenausstattung', jahr: '2019',
    themen: ['passive sicherheit', 'festes hindernis', 'abstand feste hindernisse', 'mast'] },

  // ── Ausrüstung: Beleuchtung, besondere Situationen, Entwässerung ─
  { nummer: 'VSS 40 551', titel: 'Öffentliche Beleuchtung in Strassentunneln, Galerien und Unterführungen; Grundnorm', jahr: '2021',
    themen: ['beleuchtung', 'tunnel', 'unterfuehrung'] },
  { nummer: 'VSS 71 512', titel: 'Bahnübergang; Basisdokumentation', jahr: '2013',
    themen: ['ausruestung', 'bahnuebergang', 'bahn'] },
  { nummer: 'SN 640 340', titel: 'Strassenentwässerung; Grundlagen',
    themen: ['entwaesserung', 'grundlagen'] },
  { nummer: 'VSS 40 350', titel: 'Oberflächenentwässerung von Strassen; Regenintensitäten', jahr: '2019',
    themen: ['entwaesserung', 'regen'] },
  { nummer: 'VSS 40 356', titel: 'Strassenentwässerung; Ablauf, Strassenablauf', jahr: '2019',
    themen: ['entwaesserung', 'ablauf', 'schacht'] },
  { nummer: 'VSS 40 366', titel: 'Strassenentwässerung; Aufsätze und Abdeckungen', jahr: '2003',
    themen: ['entwaesserung', 'aufsatz', 'abdeckung', 'schachtdeckel'] },

  // ── Gestaltung ─────────────────────────────────────────────────
  { nummer: 'VSS 40 212', titel: 'Entwurf des Strassenraums; Gestaltungselemente', jahr: '2019',
    themen: ['gestaltungselemente', 'verkehrsfluss', 'strassenraum'] },
  { nummer: 'VSS 40 213', titel: 'Entwurf des Strassenraums; Verkehrsberuhigungselemente', jahr: '2019',
    themen: ['gestaltungselemente', 'verkehrsberuhigung', 'tempo 30'] },
  { nummer: 'VSS 40 214', titel: 'Entwurf des Strassenraums; Farbliche Gestaltung von Strassenoberflächen', jahr: '2019',
    themen: ['gestaltungselemente', 'farbe', 'strassenoberflaeche'] },
  { nummer: 'VSS 40 215', titel: 'Entwurf des Strassenraums; Mehrzweckstreifen', jahr: '2019',
    themen: ['gestaltungselemente', 'mehrzweckstreifen'] },
  { nummer: 'VSS 40 512', titel: 'Eigenschaften der Fahrbahnoberflächen; Griffigkeitsmessungen', jahr: '2019',
    themen: ['strassenoberflaeche', 'griffigkeit', 'belag'] },

  // ── Strassenraum: Ablenkung und Baustelle ──────────────────────
  { nummer: 'VSS 40 885', titel: 'Temporäre Signalisation, Leiteinrichtungen; Signalisation von Baustellen auf Autobahnen und Autostrassen', jahr: '2019',
    themen: ['ablenkung', 'baustelle', 'temporaere signalisation', 'autobahn'] },
  { nummer: 'VSS 40 886', titel: 'Baustellen; Signalisation von Baustellen auf Haupt- und Nebenstrassen', jahr: '1998',
    themen: ['ablenkung', 'baustelle', 'temporaere signalisation'] },
  { nummer: 'SSV', titel: 'Signalisationsverordnung (SR 741.21), Art. 95 ff. — Reklamen im Strassenbereich',
    themen: ['ablenkung', 'reklame', 'werbung', 'verordnung', 'ssv'] },

  // ── Natürliche Umgebung ────────────────────────────────────────
  { nummer: 'SN 640 990', titel: 'Naturgefahren auf Strasseninfrastrukturen; Grundnorm', jahr: '2019',
    themen: ['naturgefahren', 'felssturz', 'rutschung', 'lawine'] },
  { nummer: 'VSS 40 693', titel: 'Fauna und Verkehr; Wildzäune',
    themen: ['naturgefahren', 'wild', 'zaun', 'fauna'] },
  { nummer: 'VSS 40 694', titel: 'Fauna und Verkehr; Schutzmassnahmen', jahr: '2019',
    themen: ['naturgefahren', 'wild', 'fauna', 'schutzmassnahme'] },

  // ── Betrieb und Unterhalt ──────────────────────────────────────
  { nummer: 'VSS 40 080', titel: 'Projektierung, Grundlagen; Geschwindigkeit als Projektierungselement',
    themen: ['geschwindigkeit', 'projektierung', 'betrieb'] },
  { nummer: 'SN 640 750', titel: 'Winterdienst; Grundnorm', jahr: '2018',
    themen: ['instandhaltung', 'winterdienst', 'unterhalt'] },
  { nummer: 'VSS 40 931', titel: 'Erhaltungsmanagement; Erhaltungsstrategien für Fahrbahnen', jahr: '2019',
    themen: ['instandhaltung', 'erhaltungsmanagement', 'fahrbahn', 'risse', 'flicke'] },
  { nummer: 'VSS 40 963', titel: 'Erhaltungsmanagement der technischen Ausrüstungen (EMT); Planung, Ausführung und Dokumentation der Erhaltungstätigkeiten', jahr: '2019',
    themen: ['instandhaltung', 'erhaltungsmanagement', 'ausruestung'] },
  { nummer: 'VSS 40 980', titel: 'Erhaltungsmanagement in Agglomerationen; Grundnorm', jahr: '2019',
    themen: ['instandhaltung', 'erhaltungsmanagement', 'agglomeration'] },

  // ── Verletzungsschwere ─────────────────────────────────────────
  // Nicht aus Tab. 2. Grundlage der NACA-Einstufung in Schritt 7 der
  // RSI-Methodik.
  { nummer: 'bfu Bericht 73', titel: 'NACA-Skala; Verletzungsschwere',
    themen: ['bfu', 'naca', 'unfallschwere', 'verletzung'] },
]

// Suche durch Nummer + Titel + Themen-Schluesselwoerter (case-insensitive,
// Umlaute reduziert).
export function searchRegelwerk(query: string, limit = 12): RegelwerkEintrag[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const norm = (s: string) => s.toLowerCase()
    .replace(/[äàáâ]/g, 'a').replace(/[öòóô]/g, 'o').replace(/[üùúû]/g, 'u')
    .replace(/[éèê]/g, 'e').replace(/ß/g, 'ss')
  const qn = norm(q)

  const scored: { item: RegelwerkEintrag; score: number }[] = []
  for (const n of REGELWERK_KATALOG) {
    let score = 0
    if (norm(n.nummer).includes(qn)) score += 10
    if (norm(n.titel).includes(qn)) score += 5
    for (const t of n.themen) {
      if (norm(t).includes(qn)) score += 2
    }
    if (score > 0) scored.push({ item: n, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(s => s.item)
}

// String → fuer Speicherung/Anzeige formatieren.
// Ohne Ausgabejahr, weil bestehende Defizite den String in dieser Form
// gespeichert haben.
export function formatRegelwerkString(n: RegelwerkEintrag): string {
  return `${n.nummer} — ${n.titel}`
}
