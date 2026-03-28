// glossary.ts – RSI-Fachglossar mit multilingualer Unterstuetzung
// Quelle: TBA-Fachkurs FK RSI V 16.09.2020, bfu-Bericht 73, VSS SN 641 723

import type { MultiLang } from './appData'

export interface GlossaryEntry {
  id: string
  term: MultiLang
  definition: MultiLang
  quelle?: string
  kategorie: 'methodik' | 'normativ' | 'infrastruktur' | 'fahrzeug' | 'unfall'
}

export const GLOSSARY: GlossaryEntry[] = [
  // ── Methodik ──
  {
    id: 'rsi',
    term: { de: 'RSI – Road Safety Inspection', fr: 'Inspection de sécurité routière', it: 'Ispezione di sicurezza stradale', en: 'Road Safety Inspection' },
    definition: {
      de: 'Systematische Überprüfung einer bestehenden Strasse durch Sicherheitsfachleute zur Identifikation von Sicherheitsdefiziten, unabhängig vom Vorhandensein von Unfällen.',
      fr: 'Examen systématique d\'une route existante par des experts en sécurité afin d\'identifier les déficits de sécurité, indépendamment des accidents.',
      it: 'Esame sistematico di una strada esistente da parte di esperti di sicurezza per identificare i deficit di sicurezza.',
      en: 'Systematic examination of an existing road by safety experts to identify safety deficiencies, independent of accident occurrence.',
    },
    quelle: 'TBA-Fachkurs FK RSI, V 16.09.2020',
    kategorie: 'methodik',
  },
  {
    id: 'wichtigkeit',
    term: { de: 'Wichtigkeit', fr: 'Importance', it: 'Importanza', en: 'Importance' },
    definition: {
      de: 'Einschätzung, wie stark ein Kriterium zum Unfallgeschehen beiträgt (gross/mittel/klein). Wird aus der WICHTIGKEIT_TABLE nach Kriterium und Kontext (io/ao) abgelesen — nicht durch den Inspektor selbst bestimmt.',
      fr: 'Évaluation de la contribution d\'un critère à l\'accidentalité (grand/moyen/petit). Tirée du tableau des importances selon critère et contexte.',
      it: 'Valutazione di quanto un criterio contribuisce agli incidenti. Derivata dalla tabella delle importanze.',
      en: 'Assessment of how strongly a criterion contributes to accidents (high/medium/low). Read from the importance table by criterion and context.',
    },
    quelle: 'TBA-Fachkurs FK RSI, Folie 5',
    kategorie: 'methodik',
  },
  {
    id: 'abweichung',
    term: { de: 'Abweichung', fr: 'Écart', it: 'Scostamento', en: 'Deviation' },
    definition: {
      de: 'Mass der Abweichung eines vorgefundenen Zustands vom Sollzustand (gross/mittel/klein). Wird durch den Inspektor vor Ort beurteilt.',
      fr: 'Mesure de l\'écart d\'un état constaté par rapport à l\'état cible. Évalué par l\'inspecteur sur place.',
      it: 'Misura dello scostamento di uno stato riscontrato rispetto allo stato target. Valutato dall\'ispettore in loco.',
      en: 'Measure of deviation of an observed condition from the target state (high/medium/low). Assessed by the inspector on site.',
    },
    quelle: 'TBA-Fachkurs FK RSI, Folie 5',
    kategorie: 'methodik',
  },
  {
    id: 'relevanz_sd',
    term: { de: 'Relevanz SD', fr: 'Pertinence SD', it: 'Rilevanza SD', en: 'Relevance SD' },
    definition: {
      de: 'Sicherheitsdefizit-Relevanz: Ergebnis aus Wichtigkeit × Abweichung (Matrix). Drückt aus, wie sicherheitsrelevant ein Defizit ist — unabhängig von der Unfallschwere.',
      fr: 'Pertinence du déficit de sécurité: résultat de Importance × Écart (matrice).',
      it: 'Rilevanza del deficit di sicurezza: risultato di Importanza × Scostamento (matrice).',
      en: 'Safety deficit relevance: result of Importance × Deviation (matrix). Expresses how safety-relevant a deficit is.',
    },
    quelle: 'TBA-Fachkurs FK RSI, Folie 5',
    kategorie: 'methodik',
  },
  {
    id: 'unfallrisiko',
    term: { de: 'Unfallrisiko', fr: 'Risque d\'accident', it: 'Rischio di incidente', en: 'Accident Risk' },
    definition: {
      de: 'Gesamtbewertung aus Relevanz SD × Unfallschwere (Matrix). Schlüsselgrösse für die Priorisierung von Massnahmen: gering / mittel / hoch.',
      fr: 'Évaluation globale: Pertinence SD × Gravité d\'accident (matrice). Indicateur clé pour la priorisation des mesures.',
      it: 'Valutazione complessiva: Rilevanza SD × Gravità dell\'incidente (matrice).',
      en: 'Overall assessment from Relevance SD × Accident severity (matrix). Key metric for measure prioritisation.',
    },
    quelle: 'TBA-Fachkurs FK RSI, Folie 6 / SN 641 723 Abb. 2',
    kategorie: 'methodik',
  },
  {
    id: 'naca',
    term: { de: 'NACA-Skala', fr: 'Échelle NACA', it: 'Scala NACA', en: 'NACA Scale' },
    definition: {
      de: 'National Advisory Committee for Aeronautics — Schweregradskala für Verletzungen (0–7). Im RSI-Kontext zur Einschätzung der typischen Unfallschwere am beurteilten Strassenabschnitt verwendet. NACA 0–1: leicht, 2–3: mittel, 4–7: schwer.',
      fr: 'Échelle de gravité des blessures (0–7). Dans le contexte RSI pour estimer la gravité typique des accidents. NACA 0–1: léger, 2–3: moyen, 4–7: grave.',
      it: 'Scala di gravità delle lesioni (0–7). Nel contesto RSI per stimare la gravità tipica degli incidenti.',
      en: 'Injury severity scale (0–7). In RSI context for estimating typical accident severity at the assessed road section.',
    },
    quelle: 'bfu-Bericht 73',
    kategorie: 'methodik',
  },
  {
    id: 'unfallschwere',
    term: { de: 'Unfallschwere', fr: 'Gravité d\'accident', it: 'Gravità dell\'incidente', en: 'Accident Severity' },
    definition: {
      de: 'Aus dem NACA-Score abgeleitete Dimension: leicht (NACA 0–1) / mittel (NACA 2–3) / schwer (NACA 4–7). Eingangs-Grösse für die Unfallrisiko-Matrix.',
      fr: 'Dimension dérivée du score NACA: léger / moyen / grave.',
      it: 'Dimensione derivata dal punteggio NACA: lieve / moderato / grave.',
      en: 'Dimension derived from NACA score: slight / moderate / severe. Input for the accident risk matrix.',
    },
    quelle: 'bfu-Bericht 73 / TBA-Fachkurs FK RSI, Folie 6',
    kategorie: 'methodik',
  },
  {
    id: 'kontext_io',
    term: { de: 'Kontext: Innerorts (io)', fr: 'Contexte: agglomération (io)', it: 'Contesto: area urbana (io)', en: 'Context: Urban (io)' },
    definition: {
      de: 'Strassenabschnitt innerhalb der Ortsgrenze (Tempo 50 oder 30). Massgebend für die Auswahl der Wichtigkeit aus der WICHTIGKEIT_TABLE.',
      fr: 'Tronçon routier à l\'intérieur de la localité (vitesse 50 ou 30). Déterminant pour la sélection de l\'importance.',
      it: 'Tratto stradale all\'interno del centro abitato. Determinante per la selezione dell\'importanza.',
      en: 'Road section within the built-up area (speed 50 or 30). Determines importance selection from the importance table.',
    },
    quelle: 'TBA-Fachkurs FK RSI, V 16.09.2020',
    kategorie: 'methodik',
  },
  {
    id: 'kontext_ao',
    term: { de: 'Kontext: Ausserorts (ao)', fr: 'Contexte: hors localité (ao)', it: 'Contesto: fuori zona abitata (ao)', en: 'Context: Rural (ao)' },
    definition: {
      de: 'Strassenabschnitt ausserhalb der Ortsgrenze (Tempo 80+). Massgebend für die Auswahl der Wichtigkeit aus der WICHTIGKEIT_TABLE.',
      fr: 'Tronçon routier hors localité (vitesse 80+). Déterminant pour la sélection de l\'importance.',
      it: 'Tratto stradale fuori dal centro abitato. Determinante per la selezione dell\'importanza.',
      en: 'Road section outside the built-up area (speed 80+). Determines importance selection from the importance table.',
    },
    quelle: 'TBA-Fachkurs FK RSI, V 16.09.2020',
    kategorie: 'methodik',
  },
  {
    id: 'pflichtkriterium',
    term: { de: 'Pflichtkriterium', fr: 'Critère obligatoire', it: 'Criterio obbligatorio', en: 'Mandatory Criterion' },
    definition: {
      de: 'Kriterium, das in jeder RSI zwingend zu prüfen ist (isPflicht: true). Wird im Scoring-Fluss besonders hervorgehoben.',
      fr: 'Critère devant être évalué dans chaque RSI (isPflicht: true).',
      it: 'Criterio da esaminare obbligatoriamente in ogni RSI.',
      en: 'Criterion that must be checked in every RSI (isPflicht: true).',
    },
    quelle: 'TBA-Fachkurs FK RSI, V 16.09.2020',
    kategorie: 'methodik',
  },
  {
    id: 'booster',
    term: { de: 'Booster-Kriterium', fr: 'Critère booster', it: 'Criterio booster', en: 'Booster Criterion' },
    definition: {
      de: 'Kriterium mit erhöhtem Lernwert im Trainingskontext (isBooster: true). Kann für Gamification-Mechaniken herangezogen werden.',
      fr: 'Critère avec valeur d\'apprentissage accrue (isBooster: true).',
      it: 'Criterio con valore di apprendimento elevato (isBooster: true).',
      en: 'Criterion with elevated learning value in training context (isBooster: true).',
    },
    quelle: 'RSI VR Tool – didaktisches Konzept',
    kategorie: 'methodik',
  },

  // ── Normativ ──
  {
    id: 'sn_641_723',
    term: { de: 'SN 641 723', fr: 'SN 641 723', it: 'SN 641 723', en: 'SN 641 723' },
    definition: {
      de: 'VSS-Norm «Verkehrstechnische Sicherheitsprüfungen». Legt Verfahren und Mindestanforderungen für RSI-Prüfungen in der Schweiz fest. Abb. 2 enthält die normative Unfallrisiko-Matrix.',
      fr: 'Norme VSS pour les audits de sécurité routière en Suisse. La figure 2 contient la matrice de risque d\'accident normative.',
      it: 'Norma VSS per le ispezioni di sicurezza stradale in Svizzera.',
      en: 'VSS standard for road safety inspections in Switzerland. Figure 2 contains the normative accident risk matrix.',
    },
    quelle: 'VSS SN 641 723',
    kategorie: 'normativ',
  },
  {
    id: 'vss',
    term: { de: 'VSS – Vereinigung Schweizerischer Strassenfachleute', fr: 'VSS – Association suisse des professionnels de la route', it: 'VSS – Associazione svizzera dei professionisti della strada', en: 'VSS – Swiss Road Professionals' },
    definition: {
      de: 'Herausgeber der massgebenden Strassenbaunormen in der Schweiz (SN 640 xxx / SN 641 xxx). Für RSI relevant: SN 641 723.',
      fr: 'Éditeur des normes routières déterminantes en Suisse.',
      it: 'Editore delle norme stradali determinanti in Svizzera.',
      en: 'Publisher of authoritative road construction standards in Switzerland.',
    },
    kategorie: 'normativ',
  },
  {
    id: 'bfu',
    term: { de: 'bfu – Beratungsstelle für Unfallverhütung', fr: 'bpa – Bureau de prévention des accidents', it: 'upi – Ufficio prevenzione infortuni', en: 'bfu – Swiss Council for Accident Prevention' },
    definition: {
      de: 'Schweizer Fachorganisation für Unfallprävention. bfu-Bericht 73 enthält die NACA-Skala und deren Anwendung im Strassenverkehrskontext.',
      fr: 'Organisation suisse de prévention des accidents. Le rapport bpa 73 contient l\'échelle NACA.',
      it: 'Organizzazione svizzera per la prevenzione degli infortuni.',
      en: 'Swiss accident prevention organisation. bfu report 73 contains the NACA scale and its application in road traffic.',
    },
    quelle: 'bfu-Bericht 73',
    kategorie: 'normativ',
  },
  {
    id: 'tba_fachkurs',
    term: { de: 'TBA-Fachkurs FK RSI', fr: 'Cours spécialisé TBA RSI', it: 'Corso specializzato TBA RSI', en: 'TBA Specialist Course RSI' },
    definition: {
      de: 'Schulungsunterlagen des Tiefbauamts Kanton Zürich (Version 16.09.2020). Normative Grundlage für WICHTIGKEIT_TABLE, 9-Schritte-Methodik und Bewertungsmatrizen im RSI VR Tool.',
      fr: 'Matériels de formation du Service des ponts et chaussées du canton de Zurich (version 16.09.2020).',
      it: 'Materiali di formazione dell\'Ufficio delle costruzioni stradali del Cantone di Zurigo.',
      en: 'Training materials of the Canton of Zurich Road Engineering Office (version 16.09.2020).',
    },
    quelle: 'TBA-Fachkurs FK RSI, V 16.09.2020',
    kategorie: 'normativ',
  },

  // ── Infrastruktur ──
  {
    id: 'szene',
    term: { de: 'Szene (Szenario)', fr: 'Scénario', it: 'Scenario', en: 'Scene (Scenario)' },
    definition: {
      de: 'Virtueller Strassenabschnitt im RSI VR Tool, dem ein Kontext (io/ao) und ein Topic zugeordnet ist. Enthält ein oder mehrere Defizite zur Beurteilung.',
      fr: 'Tronçon routier virtuel dans l\'outil RSI VR, associé à un contexte et un thème.',
      it: 'Tratto stradale virtuale nell\'RSI VR Tool, associato a un contesto e un tema.',
      en: 'Virtual road section in the RSI VR Tool, assigned a context and topic. Contains one or more deficits to assess.',
    },
    kategorie: 'infrastruktur',
  },
  {
    id: 'defizit',
    term: { de: 'Defizit (Sicherheitsdefizit)', fr: 'Déficit (de sécurité)', it: 'Deficit (di sicurezza)', en: 'Deficit (Safety Deficit)' },
    definition: {
      de: 'Konkreter Mangel an einem Strassenabschnitt, der im RSI VR Tool beurteilt wird. Enthält correctAssessment mit allen 6 Beurteilungsdimensionen.',
      fr: 'Déficience concrète d\'un tronçon routier, évaluée dans l\'outil RSI VR.',
      it: 'Carenza concreta di un tratto stradale, valutata nell\'RSI VR Tool.',
      en: 'Concrete deficiency of a road section to be assessed in the RSI VR Tool.',
    },
    kategorie: 'infrastruktur',
  },
  {
    id: 'topic',
    term: { de: 'Topic (Themenbereich)', fr: 'Thème', it: 'Tema', en: 'Topic' },
    definition: {
      de: 'Übergeordnete Kategorie für Szenen im RSI VR Tool (z.B. Fussgänger, Velo, Knoten, Baustelle). Strukturiert den Lernpfad.',
      fr: 'Catégorie supérieure pour les scénarios (p.ex. piétons, vélos, carrefours).',
      it: 'Categoria superiore per gli scenari.',
      en: 'Top-level category for scenes in the RSI VR Tool (e.g. Pedestrians, Cycling, Junctions, Construction).',
    },
    kategorie: 'infrastruktur',
  },
  {
    id: 'kriterium',
    term: { de: 'Kriterium (Prüfkriterium)', fr: 'Critère (d\'inspection)', it: 'Criterio (di ispezione)', en: 'Criterion (Inspection Criterion)' },
    definition: {
      de: 'Eines der 58 in der WICHTIGKEIT_TABLE erfassten RSI-Prüfkriterien (kriteriumId). Jedem Defizit ist genau ein Kriterium zugeordnet.',
      fr: 'L\'un des 58 critères d\'inspection RSI enregistrés dans la WICHTIGKEIT_TABLE.',
      it: 'Uno dei 58 criteri di ispezione RSI registrati nella WICHTIGKEIT_TABLE.',
      en: 'One of the 58 RSI inspection criteria in the WICHTIGKEIT_TABLE. Each deficit is assigned exactly one criterion.',
    },
    quelle: 'TBA-Fachkurs FK RSI, V 16.09.2020',
    kategorie: 'infrastruktur',
  },

  // ── Unfall ──
  {
    id: 'pvu',
    term: { de: 'PVU – Polizeilich aufgenommener Verkehrsunfall', fr: 'Accident de la circulation recensé par la police', it: 'Incidente stradale rilevato dalla polizia', en: 'Police-recorded Road Traffic Accident' },
    definition: {
      de: 'Im MISTRA-System erfasster Unfall. Basis für statistische Unfallanalysen in der Schweiz. RSI ergänzt reaktive Unfallanalyse um proaktive Inspektion.',
      fr: 'Accident enregistré dans le système MISTRA. Base pour les analyses statistiques d\'accidents en Suisse.',
      it: 'Incidente registrato nel sistema MISTRA.',
      en: 'Accident recorded in the MISTRA system. Basis for statistical accident analysis in Switzerland.',
    },
    kategorie: 'unfall',
  },
  {
    id: 'unfallhaeufungsstelle',
    term: { de: 'Unfallhäufungsstelle', fr: 'Point noir accidentogène', it: 'Punto critico di incidentalità', en: 'Accident Blackspot' },
    definition: {
      de: 'Örtlich begrenzter Bereich mit statistisch auffälliger Unfallhäufung. RSI kann — muss aber nicht — an Unfallhäufungsstellen durchgeführt werden.',
      fr: 'Zone géographique délimitée avec une concentration statistiquement significative d\'accidents.',
      it: 'Area geografica con concentrazione statisticamente significativa di incidenti.',
      en: 'Geographically limited area with statistically significant accident concentration. RSI can — but does not have to — be conducted at blackspots.',
    },
    kategorie: 'unfall',
  },
  {
    id: 'expositionsrisiko',
    term: { de: 'Expositionsrisiko', fr: 'Risque d\'exposition', it: 'Rischio di esposizione', en: 'Exposure Risk' },
    definition: {
      de: 'Risiko aufgrund der Häufigkeit der Nutzung eines Strassenabschnitts. In der RSI-Methodik implizit über die WICHTIGKEIT_TABLE berücksichtigt.',
      fr: 'Risque lié à la fréquence d\'utilisation d\'un tronçon routier.',
      it: 'Rischio legato alla frequenza d\'uso di un tratto stradale.',
      en: 'Risk arising from the frequency of use of a road section. Implicitly considered in RSI methodology via the importance table.',
    },
    kategorie: 'unfall',
  },
  {
    id: 'fahrzeug',
    term: { de: 'Fahrverhalten / Fahrzeugkollektiv', fr: 'Comportement de conduite / Flotte de véhicules', it: 'Comportamento di guida / Flotta di veicoli', en: 'Driving Behaviour / Vehicle Fleet' },
    definition: {
      de: 'Im RSI nicht direkt beeinflussbar — RSI fokussiert auf infrastrukturelle Massnahmen. Fahrverhalten und Fahrzeugkollektiv sind externe Faktoren.',
      fr: 'Non directement influençable dans l\'RSI. L\'RSI se concentre sur les mesures d\'infrastructure.',
      it: 'Non direttamente influenzabile nell\'RSI.',
      en: 'Not directly addressable in RSI — RSI focuses on infrastructure measures. Driving behaviour and vehicle fleet are external factors.',
    },
    kategorie: 'fahrzeug',
  },
]

// ── Hilfsfunktion: Glossar nach Kategorie filtern ──
export function getGlossaryByKategorie(kategorie: GlossaryEntry['kategorie']): GlossaryEntry[] {
  return GLOSSARY.filter(e => e.kategorie === kategorie)
}

// ── Hilfsfunktion: Eintrag nach ID suchen ──
export function getGlossaryEntry(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find(e => e.id === id)
}
