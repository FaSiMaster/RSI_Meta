// Wer steht hinter den Inhalten eines Landes
//
// Je Land ein Datensatz: welche Stelle die Inhalte verantwortet, auf welcher
// Grundlage, mit welchem Stand, und was sonst dazu zu sagen ist. Angezeigt
// wird er beim Themenbereich und auf dem Rückmeldebildschirm jeder Szene.
//
// Warum die Angaben NICHT im Code stehen: Das Werkzeug ist seit v0.12.0 ein
// privates Projekt, und ein Wächter hält den Quellbaum frei von
// Behördenbezügen. Eine im Code vorbelegte Trägerschaft würde ihn brechen –
// also wird sie eingetragen, nicht ausgeliefert. Bis das geschieht, sagt die
// Anwendung für jedes Land dasselbe: noch nicht bestimmt, Inhalte vorläufig,
// keine Freigabe durch eine Stelle dieses Landes, nur zu Trainingszwecken.
//
// Die Felder sind einsprachig. Sie tragen Eigennamen und Fundstellen, und die
// werden nicht übersetzt; wer sie einträgt, wählt die Sprache. Was die
// Anwendung von sich aus sagt – der Vorläufigkeitshinweis –, steht dagegen in
// allen vier Sprachen in den Sprachdateien.
//
// Ablage: localStorage. Bewusst keine eigene Tabelle in Supabase, weil dieser
// Schritt kein Backend anfassen soll. Verteilt wird über Ausfuhr und Einfuhr
// im Administrationsbereich; ohne das bleibt der Eintrag auf dem Gerät, auf
// dem er gemacht wurde.

import { istLandCode, type LandCode } from './laender'
import { logger } from '../lib/logger'

export interface Zustaendigkeit {
  /** Land nach ISO 3166-1 alpha-2. */
  country: LandCode
  /** Stelle, welche die Inhalte verantwortet. Leer = noch nicht bestimmt. */
  organisation: string
  /** Fachliche Grundlage: Kurs, Norm, Fassung. */
  grundlage: string
  /** Stand der Inhalte, frei formuliert (Datum oder Fassung). */
  stand: string
  /** Was sonst zu sagen ist, etwa zur Verbindlichkeit. */
  hinweis: string
  /** Zeitpunkt der letzten Änderung, ms seit Epoch. */
  geaendertAm?: number
}

const K_ZUSTAENDIGKEIT = 'rsi-v3-zustaendigkeiten'

/** Ein Datensatz gilt als leer, wenn keine der vier Angaben gefüllt ist. */
export function istLeer(z: Zustaendigkeit | null | undefined): boolean {
  if (!z) return true
  return [z.organisation, z.grundlage, z.stand, z.hinweis]
    .every(feld => (feld ?? '').trim() === '')
}

export function leereZustaendigkeit(country: LandCode): Zustaendigkeit {
  return { country, organisation: '', grundlage: '', stand: '', hinweis: '' }
}

export function getZustaendigkeiten(): Zustaendigkeit[] {
  try {
    const roh = localStorage.getItem(K_ZUSTAENDIGKEIT)
    if (!roh) return []
    const liste = JSON.parse(roh) as Zustaendigkeit[]
    // Ein Datensatz ohne gültigen Ländercode gehört zu keinem Land und wird
    // beim Lesen übergangen – er würde sonst unter einer Kennung erscheinen,
    // die es nicht gibt.
    return liste.filter(z => istLandCode(z.country))
  } catch {
    return []
  }
}

export function getZustaendigkeit(country: string | undefined | null): Zustaendigkeit | null {
  if (!country) return null
  return getZustaendigkeiten().find(z => z.country === country) ?? null
}

export function saveZustaendigkeit(z: Zustaendigkeit): void {
  if (!istLandCode(z.country)) {
    logger.warn(`Zuständigkeit nicht gespeichert: «${z.country}» ist kein Ländercode.`)
    return
  }
  const liste = getZustaendigkeiten()
  const eintrag: Zustaendigkeit = { ...z, geaendertAm: Date.now() }
  const i = liste.findIndex(x => x.country === z.country)
  if (i >= 0) liste[i] = eintrag; else liste.push(eintrag)
  try {
    localStorage.setItem(K_ZUSTAENDIGKEIT, JSON.stringify(liste))
  } catch (e) {
    logger.error('Zuständigkeit konnte nicht gespeichert werden:', e)
  }
}

export function deleteZustaendigkeit(country: string): void {
  const liste = getZustaendigkeiten().filter(z => z.country !== country)
  try {
    localStorage.setItem(K_ZUSTAENDIGKEIT, JSON.stringify(liste))
  } catch (e) {
    logger.error('Zuständigkeit konnte nicht entfernt werden:', e)
  }
}

/** Für Ausfuhr und Einfuhr im Administrationsbereich. */
export function setZustaendigkeiten(liste: Zustaendigkeit[]): void {
  const gueltig = liste.filter(z => istLandCode(z.country))
  try {
    localStorage.setItem(K_ZUSTAENDIGKEIT, JSON.stringify(gueltig))
  } catch (e) {
    logger.error('Zuständigkeiten konnten nicht geschrieben werden:', e)
  }
}
