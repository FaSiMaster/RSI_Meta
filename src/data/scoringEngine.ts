// scoringEngine.ts – FaSi/bfu-Bewertungslogik (TBA-Fachkurs FK RSI, V 16.09.2020)
// Normativ: Keine Abweichungen von den Matrizen erlaubt.

import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// ── Wichtigkeitstabelle (Schritt 1) ──
// Quelle: TBA-Fachkurs FK RSI, Folie 2 — massgebend fuer Kanton ZH
export type WichtigkeitWert = RSIDimension | ''
export const WICHTIGKEIT_TABLE: Record<string, { io: WichtigkeitWert; ao: WichtigkeitWert }> = {
  // Verkehrsfuehrung
  visuelle_linienfuehrung:           { io: 'klein',  ao: 'gross'  },
  angebot_vertraeglichkeit:          { io: 'gross',  ao: 'gross'  },
  miv_oev_lw:                        { io: 'mittel', ao: 'mittel' },
  verkehrsfuehrung_diverse:          { io: 'mittel', ao: 'mittel' },
  mobilitaetseingeschraenkte:        { io: 'gross',  ao: 'gross'  },
  kinder_schulweg:                   { io: 'gross',  ao: 'gross'  },
  geometrie_verkehrsanlage:          { io: 'mittel', ao: 'mittel' },
  knotengeometrie:                   { io: 'gross',  ao: 'gross'  },
  querschnitt:                       { io: 'mittel', ao: 'gross'  },
  // Langsamverkehrsfuehrung
  fussgaengerstreifen:               { io: 'gross',  ao: 'gross'  },
  fussgaengerquerung_ohne_vortritt:  { io: 'gross',  ao: 'gross'  },
  fussgaengerfuehrung_art:           { io: 'gross',  ao: 'gross'  },
  fussgaengerfuehrung_geometrie:     { io: 'mittel', ao: 'gross'  },
  erkennungsdistanz:                 { io: 'mittel', ao: 'gross'  },
  veloquerung_linksabbiegen:         { io: 'gross',  ao: 'gross'  },
  velolaengsfuehrung_art:            { io: 'mittel', ao: 'gross'  },
  velolaengsfuehrung_geometrie:      { io: 'mittel', ao: 'mittel' },
  // Sicht
  anhaltesichtweite:                 { io: 'gross',  ao: 'gross'  },
  ueberholsichtweite:                { io: '',       ao: 'gross'  },
  knotensichtweite:                  { io: 'gross',  ao: 'gross'  },
  sichtweite_allgemein:              { io: 'gross',  ao: 'gross'  },
  // Ausruestung
  fahrzeugrueckhaltesystem:          { io: 'klein',  ao: 'mittel' },
  anlagen_ruhender_verkehr:          { io: 'gross',  ao: 'mittel' },
  mittelinsel:                       { io: 'mittel', ao: 'mittel' },
  gelaender:                         { io: 'klein',  ao: 'mittel' },
  entwaesserung:                     { io: 'mittel', ao: 'gross'  },
  beleuchtung:                       { io: 'gross',  ao: 'mittel' },
  optische_leiteinrichtung:          { io: 'mittel', ao: 'gross'  },
  leiteinrichtung:                   { io: 'mittel', ao: 'gross'  },
  signale_wegweiser:                 { io: 'mittel', ao: 'mittel' },
  markierung:                        { io: 'mittel', ao: 'gross'  },
  lichtsignalanlagen:                { io: 'mittel', ao: 'gross'  },
  // Gestaltung
  fgso:                              { io: 'klein',  ao: 'klein'  },
  bauliches_gestaltungselement:      { io: 'klein',  ao: 'mittel' },
  bepflanzung_strassenraum:          { io: 'gross',  ao: 'gross'  },
  // Zustand Verkehrsflaeche
  spurrinnen:                        { io: 'mittel', ao: 'gross'  },
  risse:                             { io: 'klein',  ao: 'mittel' },
  flicke:                            { io: 'klein',  ao: 'mittel' },
  unebenheiten:                      { io: 'mittel', ao: 'mittel' },
  griffigkeit:                       { io: 'mittel', ao: 'gross'  },
  wellblechverformungen:             { io: 'klein',  ao: 'mittel' },
  schachtdeckel_einlaufschacht:      { io: 'klein',  ao: 'mittel' },
  // Strassenrand
  bankette:                          { io: 'klein',  ao: 'gross'  },
  abstand_feste_hindernisse:         { io: 'gross',  ao: 'gross'  },
  umgebung_bepflanzung:              { io: 'mittel', ao: 'gross'  },
  randabschluesse_randstein:         { io: 'klein',  ao: 'mittel' },
  // Verkehrsablauf
  geschwindigkeit:                   { io: 'gross',  ao: 'gross'  },
  blickverhalten:                    { io: 'mittel', ao: 'mittel' },
  abstandsverhalten:                 { io: 'klein',  ao: 'mittel' },
  ablenkung:                         { io: 'mittel', ao: 'gross'  },
  verkehrszusammensetzung:           { io: 'mittel', ao: 'mittel' },
  // Baustellen
  temporaere_signalisation:          { io: 'gross',  ao: 'gross'  },
  absperrlatten:                     { io: 'gross',  ao: 'mittel' },
  beleuchtung_baustelle:             { io: 'gross',  ao: 'gross'  },
  platten:                           { io: 'mittel', ao: 'mittel' },
  grubensicherung:                   { io: 'mittel', ao: 'gross'  },
  // Spezifische Themen
  tunnelanlagen:                     { io: 'klein',  ao: 'klein'  },
  kunstbauten:                       { io: 'klein',  ao: 'klein'  },
  tempo30_begegnungszonen:           { io: 'gross',  ao: ''       },
}

// Lesbare Labels fuer die Dropdown-Auswahl im Admin
export const KRITERIUM_LABELS: Record<string, string> = {
  visuelle_linienfuehrung:           'Visuelle Linienfuehrung',
  angebot_vertraeglichkeit:          'Angebot / Vertraeglichkeit',
  miv_oev_lw:                        'MIV / OEV / LW',
  verkehrsfuehrung_diverse:          'Verkehrsfuehrung (diverse)',
  mobilitaetseingeschraenkte:        'Mobilitaetseingeschraenkte',
  kinder_schulweg:                   'Kinder / Schulweg',
  geometrie_verkehrsanlage:          'Geometrie Verkehrsanlage',
  knotengeometrie:                   'Knotengeometrie',
  querschnitt:                       'Querschnitt',
  fussgaengerstreifen:               'Fussgaengerstreifen',
  fussgaengerquerung_ohne_vortritt:  'Fussgaengerquerung ohne Vortritt',
  fussgaengerfuehrung_art:           'Fussgaengerfuehrung (Art)',
  fussgaengerfuehrung_geometrie:     'Fussgaengerfuehrung (Geometrie)',
  erkennungsdistanz:                 'Erkennungsdistanz',
  veloquerung_linksabbiegen:         'Veloquerung / Linksabbiegen',
  velolaengsfuehrung_art:            'Velolaengsfuehrung (Art)',
  velolaengsfuehrung_geometrie:      'Velolaengsfuehrung (Geometrie)',
  anhaltesichtweite:                 'Anhaltesichtweite',
  ueberholsichtweite:                'Ueberholsichtweite',
  knotensichtweite:                  'Knotensichtweite',
  sichtweite_allgemein:              'Sichtweite (allgemein)',
  fahrzeugrueckhaltesystem:          'Fahrzeugrueckhaltesystem',
  anlagen_ruhender_verkehr:          'Anlagen ruhender Verkehr',
  mittelinsel:                       'Mittelinsel',
  gelaender:                         'Gelaender',
  entwaesserung:                     'Entwaesserung',
  beleuchtung:                       'Beleuchtung',
  optische_leiteinrichtung:          'Optische Leiteinrichtung',
  leiteinrichtung:                   'Leiteinrichtung',
  signale_wegweiser:                 'Signale / Wegweiser',
  markierung:                        'Markierung',
  lichtsignalanlagen:                'Lichtsignalanlagen',
  fgso:                              'FGSO',
  bauliches_gestaltungselement:      'Bauliches Gestaltungselement',
  bepflanzung_strassenraum:          'Bepflanzung Strassenraum',
  spurrinnen:                        'Spurrinnen',
  risse:                             'Risse',
  flicke:                            'Flicke',
  unebenheiten:                      'Unebenheiten',
  griffigkeit:                       'Griffigkeit',
  wellblechverformungen:             'Wellblechverformungen',
  schachtdeckel_einlaufschacht:      'Schachtdeckel / Einlaufschacht',
  bankette:                          'Bankette',
  abstand_feste_hindernisse:         'Abstand feste Hindernisse',
  umgebung_bepflanzung:              'Umgebung / Bepflanzung',
  randabschluesse_randstein:         'Randabschluesse / Randstein',
  geschwindigkeit:                   'Geschwindigkeit',
  blickverhalten:                    'Blickverhalten',
  abstandsverhalten:                 'Abstandsverhalten',
  ablenkung:                         'Ablenkung',
  verkehrszusammensetzung:           'Verkehrszusammensetzung',
  temporaere_signalisation:          'Temporaere Signalisation',
  absperrlatten:                     'Absperrlatten',
  beleuchtung_baustelle:             'Beleuchtung (Baustelle)',
  platten:                           'Platten',
  grubensicherung:                   'Grubensicherung',
  tunnelanlagen:                     'Tunnelanlagen',
  kunstbauten:                       'Kunstbauten',
  tempo30_begegnungszonen:           'Tempo-30 / Begegnungszonen',
}

// ── Normhierarchie (Schritt 3) ──
// Quelle: TBA-Fachkurs FK RSI, Folie 3
export const NORMHIERARCHIE = [
  { stufe: 1, label: 'Gesetze und Verordnungen (SVG SR 741.01, SSV SR 741.21)' },
  { stufe: 2, label: 'Kantonale Richtlinien, Normalien und Merkblaetter TBA' },
  { stufe: 3, label: 'SN-/VSS-Normen, andere anwendbare Standards' },
  { stufe: 4, label: 'Empfehlungen, Ergebnisse aus Forschungsarbeit' },
  { stufe: 5, label: 'Dokumentiertes Expertenwissen Auditor/-Team' },
]

export const ABWEICHUNG_KATEGORIEN: { wert: RSIDimension; label: string; beschreibung: string; beispiel?: string }[] = [
  {
    wert: 'klein',
    label: 'Klein',
    beschreibung: 'Keine, geringe oder irrelevante Abweichung zur Norm',
  },
  {
    wert: 'mittel',
    label: 'Mittel',
    beschreibung: 'Abweichung zur Norm ist sachlich begruendet',
    beispiel: 'Durchfahrtsbreite FGSI = 4 m statt 3.75 m, Grund: Vorgaben SI',
  },
  {
    wert: 'gross',
    label: 'Gross',
    beschreibung: 'Infolge Abweichung zur Norm ist die Verkehrsanlage nicht mehr sicher',
    beispiel: 'Geforderter horizontaler Mindestradius 80 km/h = 240 m, Ist = 100 m',
  },
]

// ── Relevanz-Matrix (Schritt 5) ──
// Quelle: TBA-Fachkurs FK RSI, Folie 4 / bfu-Werkzeugkasten 2018
// Y-Achse = Wichtigkeit (Schritt 2), X-Achse = Abweichung (Schritt 4)
export function calcRelevanzSD(
  wichtigkeit: RSIDimension,
  abweichung:  RSIDimension
): ResultDimension {
  const matrix: Record<RSIDimension, Record<RSIDimension, ResultDimension>> = {
    gross:  { klein: 'gering', mittel: 'mittel', gross: 'hoch'   },
    mittel: { klein: 'gering', mittel: 'mittel', gross: 'hoch'   },
    klein:  { klein: 'gering', mittel: 'gering', gross: 'mittel' },
  }
  return matrix[wichtigkeit][abweichung]
}

// ── NACA-Tabelle (Schritt 7) ──
// Quelle: TBA-Fachkurs FK RSI, Folie 5 — bfu-Adaptation
// ACHTUNG: NACA ist bfu-Einstiegshilfe, NICHT direkt in SN 641 723
export type NacaRaw = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export const NACA_TABLE: {
  naca: NacaRaw
  verletzung: string
  konsequenz: string
  rsi: NACADimension
}[] = [
  { naca: 0, verletzung: 'Keine Verletzung',                                      konsequenz: '---',                                       rsi: 'leicht' },
  { naca: 1, verletzung: 'Geringfuegige Verletzung',                              konsequenz: 'ambulante Behandlung',                      rsi: 'leicht' },
  { naca: 2, verletzung: 'Leichte bis maessig schwere Verletzung',                konsequenz: 'ambulante Behandlung',                      rsi: 'mittel' },
  { naca: 3, verletzung: 'Maessig bis schwere Verletzung, nicht lebensbedrohlich',konsequenz: 'stationaere Behandlung',                    rsi: 'mittel' },
  { naca: 4, verletzung: 'Schwere Verletzung',                                    konsequenz: 'akute Lebensgefahr nicht auszuschliessen',  rsi: 'schwer' },
  { naca: 5, verletzung: 'Akute Lebensgefahr',                                    konsequenz: 'akute Lebensgefahr',                        rsi: 'schwer' },
  { naca: 6, verletzung: 'Atem- und/oder Kreislaufstillstand',                    konsequenz: 'Reanimation',                               rsi: 'schwer' },
  { naca: 7, verletzung: 'Toedliche Verletzung',                                  konsequenz: 'Tod',                                       rsi: 'schwer' },
]

export function nacaToSchwere(n: number): NACADimension {
  if (n <= 1) return 'leicht'
  if (n <= 3) return 'mittel'
  return 'schwer'
}

// ── Unfallrisiko-Matrix (Schritt 9) ──
// Quelle: TBA-Fachkurs FK RSI, Folie 6 / bfu-Werkzeugkasten 2018
// Y-Achse = Relevanz SD (Schritt 6), X-Achse = Unfallschwere via NACA (Schritt 8)
export function calcUnfallrisiko(
  relevanzSD:    ResultDimension,
  unfallschwere: NACADimension
): ResultDimension {
  const matrix: Record<ResultDimension, Record<NACADimension, ResultDimension>> = {
    hoch:   { leicht: 'mittel', mittel: 'hoch',   schwer: 'hoch'   },
    mittel: { leicht: 'gering', mittel: 'mittel',  schwer: 'hoch'   },
    gering: { leicht: 'gering', mittel: 'gering',  schwer: 'mittel' },
  }
  return matrix[relevanzSD][unfallschwere]
}

// Schritt-Gewichtungen fuer Punkteberechnung
// Schritte 2, 4, 6, 8 sind Uebertraege (immer korrekt)
export const STEP_WEIGHTS = [25, 0, 25, 0, 0, 0, 25, 0, 0] as const
export const STEP_WEIGHT_UNIT = 1
export const KATEGORIE_PUNKTE = 25

export type StepResult = {
  stepNr:      number
  input:       string
  output:      string
  isAutomatic: boolean
  normRef:     string
}
