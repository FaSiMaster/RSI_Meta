// Ländercodes nach ISO 3166-1 alpha-2
//
// Die Liste trägt das Feld `country` an Themenbereich, Szene, Kurs und
// Ergebnis. Sie enthält die 249 offiziell zugeteilten Codes, Stand
// 6. September 2026.
//
// Herkunft und Kreuzprüfung. Massgebend war die Tabelle der offiziell
// zugeteilten Codeelemente aus dem Artikel «ISO 3166-1 alpha-2»
// (en.wikipedia.org, abgerufen am 6. September 2026, dort 249 Codes).
// Gegengeprüft gegen zwei unabhängige Bestände: die Regionenliste des in
// Node 24 mitgelieferten ICU (CLDR) enthält alle 249 ohne Ausnahme, und die
// M49-Übersicht der Statistikabteilung der Vereinten Nationen
// (unstats.un.org) deckt 248 davon ab – sie führt Taiwan nicht, weil die
// Vereinten Nationen es nicht als eigenes Gebiet ausweisen.
//
// Nicht enthalten und warum:
//   CQ (Sark), AC, CP, DG, EA, EU, UK  – ausnahmsweise reserviert, nicht
//     zugeteilt. CQ ist der Grenzfall: der Code besteht, ICU kennt ihn, ISO
//     führt ihn aber unter «exceptionally reserved».
//   XK (Kosovo) – benutzerdefinierter Bereich, kein ISO-Code.
//   AN, BU, CS, DD, DY, FX, HV, NH, RH, SU, TP, VD, YD, YU, ZR – gelöschte
//     Codes untergegangener Staaten. ICU kennt sie weiter, ISO nicht mehr.
//
// Die Ländernamen stehen NICHT in dieser Datei. Sie kommen zur Anzeigezeit
// aus `Intl.DisplayNames` und damit in der Sprache der Oberfläche, ohne dass
// 249 Namen in vier Sprachen von Hand gepflegt werden müssen.
//
// Wichtig: Ein Code in dieser Liste heisst nur, dass das Land benennbar ist.
// Ob für ein Land ein Beurteilungsverfahren hinterlegt ist, entscheidet
// allein die Verfahrensauswahl – heute trägt einzig CH ein Verfahren.

export const ISO_3166_1_ALPHA_2 = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
  'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
  'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
  'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
] as const

/** Ländercode nach ISO 3166-1 alpha-2, zweistellig und gross geschrieben. */
export type LandCode = (typeof ISO_3166_1_ALPHA_2)[number]

/**
 * Vorgabe für jeden Datensatz ohne eigene Angabe. Bis zum ersten Datensatz
 * eines zweiten Landes trägt der ganze Bestand diesen Wert.
 */
export const LAND_VORGABE: LandCode = 'CH'

const BEKANNTE_CODES: ReadonlySet<string> = new Set(ISO_3166_1_ALPHA_2)

/** Prüft, ob ein beliebiger Wert ein zugeteilter Ländercode ist. */
export function istLandCode(wert: unknown): wert is LandCode {
  return typeof wert === 'string' && BEKANNTE_CODES.has(wert)
}

/**
 * Ländername in der gewünschten Sprache. Fällt auf den Code zurück, wenn die
 * Laufzeitumgebung `Intl.DisplayNames` nicht kennt oder den Code nicht auflöst
 * – ein Code ist immer noch eine Auskunft, ein leeres Feld nicht.
 */
export function landName(code: string, sprache: string): string {
  try {
    const anzeige = new Intl.DisplayNames([sprache], { type: 'region', fallback: 'code' })
    return anzeige.of(code) ?? code
  } catch {
    return code
  }
}

/**
 * Alle Codes mit ihrem Namen in einer Sprache, alphabetisch nach dem Namen.
 * Für Auswahlfelder im Administrationsbereich.
 */
export function laenderNachName(sprache: string): Array<{ code: LandCode; name: string }> {
  return ISO_3166_1_ALPHA_2
    .map(code => ({ code, name: landName(code, sprache) }))
    .sort((a, b) => a.name.localeCompare(b.name, sprache))
}
