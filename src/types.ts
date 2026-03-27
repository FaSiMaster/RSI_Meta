// ── i18n ──────────────────────────────────────────────────────────────────────

export interface I18nString {
  de: string;
  fr?: string;
  en?: string;
  it?: string;
}

export type SupportedLang = "de" | "fr" | "en" | "it";

/** Gibt den lokalisierten String zurück, Fallback: Deutsch */
export function resolveI18n(s: I18nString | string, lang: SupportedLang = "de"): string {
  if (typeof s === "string") return s;
  return s[lang] ?? s.de;
}

// ── Themenbereiche ─────────────────────────────────────────────────────────────

export interface Topic {
  id: string;
  name: string;              // Backwards-Compat (Phase 1)
  nameI18n?: I18nString;     // bevorzugt ab Phase 2
  description: string;
  descriptionI18n?: I18nString;
  icon?: string;             // Lucide Icon-Name (z. B. "Car", "Footprints")
  parentTopicId?: string;    // Unterthema-Hierarchie, max. 2 Ebenen
  order?: number;            // Drag-and-Drop-Reihenfolge
  archived?: boolean;        // Soft-Delete (Ranking-History bleibt erhalten)
}

// ── Szenen ─────────────────────────────────────────────────────────────────────

export interface Scene {
  id: string;
  topicId: string;
  imageUrl: string;
  description: string;
  locationType: "io" | "ao"; // io = innerorts, ao = ausserorts
  difficulty?: "leicht" | "mittel" | "schwer";
}

// ── RSI-Dimensionen ────────────────────────────────────────────────────────────

export type RSIDimension  = "gross" | "mittel" | "klein";
export type NACADimension = "leicht" | "mittel" | "schwer";
export type ResultDimension = "gering" | "mittel" | "hoch";

// ── Defizit-Kategorie (Admin-konfigurierbar) ───────────────────────────────────

export interface DeficitCategory {
  id: string;
  nameI18n: I18nString;
  icon?: string;    // Lucide Icon-Name
  color?: string;   // Hex-Farbe oder Tailwind-Token
}

// ── Defizit-Zone (Verortung) ───────────────────────────────────────────────────

export interface DeficitZone {
  type: "point" | "polygon";
  /** Normalisierte 2D-Koordinaten [0–1] oder sphärische Grad-Werte [theta, phi] */
  coordinates: number[][];
  /** 3D-Äquivalent (Backwards-Compat mit position: [x,y,z]) */
  position3d?: [number, number, number];
}

// ── Normen-Verweis ─────────────────────────────────────────────────────────────

export interface DeficitReference {
  label: string;
  url?: string;
  normCode?: string; // z. B. "VSS 40 886", "ASTRA 15009"
}

// ── Defizit ────────────────────────────────────────────────────────────────────

export interface Deficit {
  id: string;
  sceneId: string;

  /** Legacy 3D-Position (Phase 1) */
  position: [number, number, number];
  /** Klick-Toleranz in Welteinheiten */
  tolerance: number;
  /** Erweiterte Verortung (Phase 2) */
  zone?: DeficitZone;

  title: string;
  description: string;
  categoryId?: string; // ref → DeficitCategory.id

  correctAssessment: {
    wichtigkeit:   RSIDimension;
    abweichung:    RSIDimension;
    unfallschwere: NACADimension;
  };

  feedback: string;
  solution: string;
  references?: DeficitReference[];

  /** Pflicht-Defizit: muss gefunden werden, sonst kein Abschluss */
  isMandatory?: boolean;
  /** Bonus-Defizit: schwer zu finden → 1.5× Score */
  isBooster?: boolean;
}

// ── Ranking ────────────────────────────────────────────────────────────────────

export type RankingScope = "topic" | "total" | "course";

export interface RankingEntry {
  userId?: string;       // Phase 2 (Login)
  username: string;
  scope: RankingScope;
  scopeId: string;       // topicId | "total" | courseId
  score: number;
  completedScenes: number;
  timestamp: string;
}

// ── Kurs / Veranstaltungs-Ranking ──────────────────────────────────────────────

export interface Course {
  id: string;
  name: string;
  date: string;              // ISO date string
  accessCode: string;        // Teilnehmer-Code (z. B. "FASI-2026-A")
  topicIds: string[];        // Themenbereiche im Kurs
  participantIds: string[];  // Phase 2: User-IDs
  createdAt: string;
  active: boolean;
}

// ── Glossar ────────────────────────────────────────────────────────────────────

export interface GlossaryEntry {
  id: string;
  term: string;
  termI18n?: I18nString;
  definition: string;
  definitionI18n?: I18nString;
  sourceNorm?: string; // z. B. "VSS 40 886"
}

// ── User-Fortschritt ───────────────────────────────────────────────────────────

export interface UserProgress {
  username: string;
  score: number;
  completedScenes: string[];
  foundDeficits: string[];
  timestamp: string;
  courseId?: string;
}
