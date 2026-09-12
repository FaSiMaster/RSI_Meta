// Bezeichnungen der Konvention der Unfallkommission (Deutschland)
//
// Eigener i18next-Namensraum, aus demselben Grund, aus dem das Schweizer
// Verfahren einen hat: die Wörter eines Verfahrens sind nicht die Wörter der
// Bedienung. Wechselt jemand das Land, wechseln die Verfahrenswörter, nicht die
// Knöpfe. Aufruf im Code: t('verfahrenUko:schritt1Titel').
//
// ── Warum der Begriff nur hier steht ────────────────────────────────────────
//
// Die Bezeichnung für einen Befund, der kein Sicherheitsdefizit ist, ist
// fachlich noch nicht endgültig. Der Datenschlüssel heisst deshalb
// `gestaltung`, und das Wort dafür steht ausschliesslich in dieser Datei, in
// vier Sprachen. Eine Umbenennung ist damit eine Änderung an vier Zeichenketten
// und berührt keinen Datensatz.
//
// Ein Norm- oder Richtlinienbezug wird der Konvention nicht zugeschrieben.
// Sie ist eine Vereinbarung mit Fachexperten; BASt, FGSV, ESAS und RSAS werden
// hier bewusst nicht genannt.

/** Kennung des Verfahrens. Liegt im Datenmodell, siehe data/bewertung.ts. */
export { VERFAHREN_UKO_ID } from '../data/bewertung'

const de = {
  name: 'Unfallkommission',
  langname: 'Verfahren der Unfallkommission',
  quelle: 'Vereinbarung mit Fachexperten. Keine Norm, keine Richtlinie.',

  schritteVon: 'Schritt {{n}} von 2',

  schritt1Titel: 'Art des Befundes',
  schritt1Frage: 'Ist der Befund ein Sicherheitsdefizit oder ein Gestaltungsbefund?',
  schritt1Hinweis: 'Ein Sicherheitsdefizit wirkt auf das Unfallgeschehen. Ein Gestaltungsbefund weicht von einem Regelmass ab, ohne dass daraus unmittelbar eine Gefahr folgt.',

  artSicherheitsdefizit: 'Sicherheitsdefizit',
  artSicherheitsdefizitKurz: 'Defizit',
  artGestaltung: 'Gestaltungsbefund',
  artGestaltungKurz: 'Gestaltung',

  schritt2Titel: 'Einstufung',
  schritt2Frage: 'Wie schwer wiegt das Sicherheitsdefizit?',
  schritt2Hinweis: 'Gross, wenn dem Befund Unfälle zugeordnet sind. Mittel bei einer benannten Sicherheitsfolge ohne Unfallzuordnung. Klein bei einer Abweichung ohne benannte Folge.',
  schritt2Entfaellt: 'Bei einem Gestaltungsbefund entfällt die Einstufung.',

  stufeGross: 'Gross',
  stufeMittel: 'Mittel',
  stufeKlein: 'Klein',

  ergebnisTitel: 'Ergebnis',
  ergebnisSchritt1: 'Erkennen',
  ergebnisSchritt2: 'Einstufen',
  ergebnisTreffer: '{{treffer}} von {{gesamt}}',
  ergebnisPunkte: '{{punkte}} von {{max}} Punkten',
  ergebnisGetrenntHinweis: 'Die beiden Schritte werden getrennt gewertet und nicht zusammengefasst.',
  ergebnisAbzugHinweis: 'Eine falsche Art kostet Punkte, weil sie den Befund verkennt.',

  sollLabel: 'Musterlösung',
  istLabel: 'Ihre Beurteilung',
  keineEinstufung: 'keine Einstufung',
} as const

const fr = {
  name: 'Commission des accidents',
  langname: 'Procédure de la commission des accidents',
  quelle: 'Convention avec des spécialistes. Ni norme ni directive.',

  schritteVon: 'Étape {{n}} sur 2',

  schritt1Titel: 'Nature du constat',
  schritt1Frage: 'Le constat est-il un déficit de sécurité ou un constat de conception?',
  schritt1Hinweis: 'Un déficit de sécurité agit sur les accidents. Un constat de conception s’écarte d’une valeur de référence sans qu’un danger en découle directement.',

  artSicherheitsdefizit: 'Déficit de sécurité',
  artSicherheitsdefizitKurz: 'Déficit',
  artGestaltung: 'Constat de conception',
  artGestaltungKurz: 'Conception',

  schritt2Titel: 'Classement',
  schritt2Frage: 'Quelle est la gravité du déficit de sécurité?',
  schritt2Hinweis: 'Grand si des accidents sont attribués au constat. Moyen en cas de conséquence nommée sans attribution d’accident. Petit en cas d’écart sans conséquence nommée.',
  schritt2Entfaellt: 'Pour un constat de conception, le classement ne s’applique pas.',

  stufeGross: 'Grand',
  stufeMittel: 'Moyen',
  stufeKlein: 'Petit',

  ergebnisTitel: 'Résultat',
  ergebnisSchritt1: 'Reconnaître',
  ergebnisSchritt2: 'Classer',
  ergebnisTreffer: '{{treffer}} sur {{gesamt}}',
  ergebnisPunkte: '{{punkte}} sur {{max}} points',
  ergebnisGetrenntHinweis: 'Les deux étapes sont évaluées séparément et ne sont pas additionnées.',
  ergebnisAbzugHinweis: 'Une nature erronée coûte des points, car elle méconnaît le constat.',

  sollLabel: 'Solution de référence',
  istLabel: 'Votre appréciation',
  keineEinstufung: 'pas de classement',
} as const

const it = {
  name: 'Commissione infortuni',
  langname: 'Procedura della commissione infortuni',
  quelle: 'Accordo con specialisti. Né norma né direttiva.',

  schritteVon: 'Passo {{n}} di 2',

  schritt1Titel: 'Natura del rilievo',
  schritt1Frage: 'Il rilievo è un deficit di sicurezza o un rilievo di progettazione?',
  schritt1Hinweis: 'Un deficit di sicurezza incide sugli incidenti. Un rilievo di progettazione si discosta da una misura di riferimento senza che ne derivi un pericolo immediato.',

  artSicherheitsdefizit: 'Deficit di sicurezza',
  artSicherheitsdefizitKurz: 'Deficit',
  artGestaltung: 'Rilievo di progettazione',
  artGestaltungKurz: 'Progettazione',

  schritt2Titel: 'Classificazione',
  schritt2Frage: 'Quanto è grave il deficit di sicurezza?',
  schritt2Hinweis: 'Grande se al rilievo sono attribuiti incidenti. Medio in caso di conseguenza indicata senza attribuzione di incidenti. Piccolo in caso di scostamento senza conseguenza indicata.',
  schritt2Entfaellt: 'Per un rilievo di progettazione la classificazione non si applica.',

  stufeGross: 'Grande',
  stufeMittel: 'Medio',
  stufeKlein: 'Piccolo',

  ergebnisTitel: 'Risultato',
  ergebnisSchritt1: 'Riconoscere',
  ergebnisSchritt2: 'Classificare',
  ergebnisTreffer: '{{treffer}} su {{gesamt}}',
  ergebnisPunkte: '{{punkte}} su {{max}} punti',
  ergebnisGetrenntHinweis: 'I due passi sono valutati separatamente e non sommati.',
  ergebnisAbzugHinweis: 'Una natura errata costa punti, perché non riconosce il rilievo.',

  sollLabel: 'Soluzione di riferimento',
  istLabel: 'La sua valutazione',
  keineEinstufung: 'nessuna classificazione',
} as const

const en = {
  name: 'Accident commission',
  langname: 'Accident commission procedure',
  quelle: 'Agreed with subject specialists. Neither a standard nor a guideline.',

  schritteVon: 'Step {{n}} of 2',

  schritt1Titel: 'Type of finding',
  schritt1Frage: 'Is the finding a safety deficiency or a design finding?',
  schritt1Hinweis: 'A safety deficiency affects the accident record. A design finding departs from a reference dimension without an immediate hazard following from it.',

  artSicherheitsdefizit: 'Safety deficiency',
  artSicherheitsdefizitKurz: 'Deficiency',
  artGestaltung: 'Design finding',
  artGestaltungKurz: 'Design',

  schritt2Titel: 'Classification',
  schritt2Frage: 'How serious is the safety deficiency?',
  schritt2Hinweis: 'Major where accidents are attributed to the finding. Moderate where a safety consequence is named without accident attribution. Minor where a departure has no named consequence.',
  schritt2Entfaellt: 'For a design finding, no classification applies.',

  stufeGross: 'Major',
  stufeMittel: 'Moderate',
  stufeKlein: 'Minor',

  ergebnisTitel: 'Result',
  ergebnisSchritt1: 'Recognition',
  ergebnisSchritt2: 'Classification',
  ergebnisTreffer: '{{treffer}} of {{gesamt}}',
  ergebnisPunkte: '{{punkte}} of {{max}} points',
  ergebnisGetrenntHinweis: 'The two steps are scored separately and are not combined.',
  ergebnisAbzugHinweis: 'Choosing the wrong type costs points, because it misreads the finding.',

  sollLabel: 'Model answer',
  istLabel: 'Your assessment',
  keineEinstufung: 'no classification',
} as const

/** Alle Sprachen des Namensraums. Der Schlüsselsatz ist in allen gleich. */
export const VERFAHREN_UKO = { de, fr, it, en } as const

export type VerfahrenUkoSchluessel = keyof typeof de
