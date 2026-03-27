import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronRight, CheckCircle2, XCircle, Star, AlertTriangle, BookOpen } from "lucide-react";
import { cn } from "../lib/utils";
import {
  Deficit,
  DeficitCategory,
  RSIDimension,
  NACADimension,
  ResultDimension,
  GlossaryEntry,
  SupportedLang,
} from "../types";
import { GlossaryTooltip } from "./GlossaryTooltip";

// ── RSI-Hilfslogik ─────────────────────────────────────────────────────────────

function getRelevanzSD(w: RSIDimension, a: RSIDimension): ResultDimension {
  if (w === "gross") return a === "gross" ? "hoch" : a === "mittel" ? "mittel" : "gering";
  if (w === "mittel") return a === "gross" ? "hoch" : a === "mittel" ? "mittel" : "gering";
  return a === "gross" ? "mittel" : "gering";
}

function getUnfallrisiko(rel: ResultDimension, s: NACADimension): ResultDimension {
  if (rel === "hoch")   return s === "leicht" ? "mittel" : "hoch";
  if (rel === "mittel") return s === "schwer" ? "hoch" : s === "mittel" ? "mittel" : "gering";
  return s === "schwer" ? "mittel" : "gering";
}

function calculatePoints(
  assessment: { wichtigkeit: RSIDimension; abweichung: RSIDimension; unfallschwere: NACADimension },
  correct: Deficit["correctAssessment"],
  isBooster: boolean,
): number {
  let pts = 100;
  if (assessment.wichtigkeit   === correct.wichtigkeit)   pts += 50;
  if (assessment.abweichung    === correct.abweichung)    pts += 50;
  if (assessment.unfallschwere === correct.unfallschwere) pts += 50;
  if (
    assessment.wichtigkeit   === correct.wichtigkeit &&
    assessment.abweichung    === correct.abweichung &&
    assessment.unfallschwere === correct.unfallschwere
  ) pts += 100; // Vollständig korrekt: Bonus
  if (isBooster) pts = Math.round(pts * 1.5);
  return pts;
}

// ── Typen ──────────────────────────────────────────────────────────────────────

interface ClickResult {
  deficit: Deficit | null;
  assessment: { wichtigkeit: RSIDimension; abweichung: RSIDimension; unfallschwere: NACADimension };
  points: number;
  categoryId: string | null;
}

interface Props {
  /** 3D-Klickpunkt auf der Sphere */
  clickPoint: [number, number, number];
  deficits: Deficit[];
  categories: DeficitCategory[];
  glossary: GlossaryEntry[];
  locationType: "io" | "ao";
  lang?: SupportedLang;
  onResult: (result: ClickResult) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

// ── Komponente ─────────────────────────────────────────────────────────────────

export default function DeficitContextMenu({
  clickPoint,
  deficits,
  categories,
  glossary,
  locationType,
  lang = "de",
  onResult,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<Partial<{
    wichtigkeit: RSIDimension;
    abweichung: RSIDimension;
    unfallschwere: NACADimension;
  }>>({});
  const [result, setResult] = useState<ClickResult | null>(null);

  // ── Suche nächstes Defizit (Toleranz-Check) ───────────────────────────────────
  const findNearestDeficit = (): Deficit | null => {
    const [cx, cy, cz] = clickPoint;
    const clickVec = { x: cx, y: cy, z: cz };
    let best: Deficit | null = null;
    let bestDist = Infinity;

    for (const d of deficits) {
      const dx = d.position[0] - clickVec.x;
      const dy = d.position[1] - clickVec.y;
      const dz = d.position[2] - clickVec.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < d.tolerance && dist < bestDist) {
        bestDist = dist;
        best = d;
      }
    }
    return best;
  };

  // ── Step 2: Bewertung abschliessen ────────────────────────────────────────────
  const finishAssessment = (
    finalAssessment: { wichtigkeit: RSIDimension; abweichung: RSIDimension; unfallschwere: NACADimension },
  ) => {
    const found = findNearestDeficit();
    const pts = found
      ? calculatePoints(finalAssessment, found.correctAssessment, found.isBooster ?? false)
      : 0;

    const res: ClickResult = {
      deficit: found,
      assessment: finalAssessment,
      points: pts,
      categoryId: selectedCategoryId,
    };
    setResult(res);
    setStep(3);
  };

  const handleUnfallschwere = (val: NACADimension) => {
    const full = { ...assessment, unfallschwere: val } as {
      wichtigkeit: RSIDimension;
      abweichung: RSIDimension;
      unfallschwere: NACADimension;
    };
    finishAssessment(full);
  };

  const handleClose = () => {
    if (result) onResult(result);
    onClose();
  };

  const ratingColor = (r: string) => {
    if (r === "hoch")   return "bg-red-500/20 text-red-400 border-red-500/30";
    if (r === "mittel") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        className="absolute top-20 right-4 bottom-4 w-96 z-50 bg-black/85 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-white/30 mb-0.5">
              {t("clickflow.title")}
            </p>
            <h3 className="font-bold text-sm">
              {step === 1 && t("clickflow.step1_subtitle")}
              {step === 2 && t("clickflow.step2_subtitle")}
              {step === 3 && t("clickflow.step3_subtitle")}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {([1, 2, 3] as Step[]).map(s => (
                <div
                  key={s}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    s <= step ? "bg-blue-400" : "bg-white/10",
                  )}
                />
              ))}
            </div>
            <button onClick={handleClose} className="text-white/30 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">

          {/* ── Step 1: Kategorie ── */}
          {step === 1 && (
            <div className="space-y-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategoryId(cat.id); setStep(2); }}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600/20 hover:border-blue-500/40 transition-all text-left flex items-center justify-between group"
                >
                  <span className="font-bold text-sm">
                    {cat.nameI18n[lang] ?? cat.nameI18n.de}
                  </span>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-blue-400 transition-colors" />
                </button>
              ))}
              <button
                onClick={() => { setSelectedCategoryId(null); setStep(2); }}
                className="w-full p-3 border border-dashed border-white/10 rounded-2xl text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-all"
              >
                {t("clickflow.no_category")}
              </button>
            </div>
          )}

          {/* ── Step 2: RSI-Beurteilung ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Wichtigkeit */}
              {!assessment.wichtigkeit && (
                <>
                  <div>
                    <h4 className="font-bold mb-1">{t("training.wichtigkeit_title")}</h4>
                    <p className="text-xs text-white/50 mb-3">
                      {locationType === "io"
                        ? t("training.wichtigkeit_hint_io")
                        : t("training.wichtigkeit_hint_ao")}
                    </p>
                    <div className="space-y-2">
                      {(["gross", "mittel", "klein"] as RSIDimension[]).map(v => (
                        <button
                          key={v}
                          onClick={() => setAssessment(prev => ({ ...prev, wichtigkeit: v }))}
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600 hover:border-blue-500 transition-all text-left font-bold capitalize text-sm flex justify-between items-center group"
                        >
                          {t(`dimensions.${v}`)} <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Abweichung */}
              {assessment.wichtigkeit && !assessment.abweichung && (
                <>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                    <span className="text-white/30">{t("training.wichtigkeit_title")}:</span>{" "}
                    <span className="font-bold capitalize">{t(`dimensions.${assessment.wichtigkeit}`)}</span>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{t("training.abweichung_title")}</h4>
                    <p className="text-xs text-white/50 mb-3">{t("training.abweichung_hint")}</p>
                    <div className="space-y-2">
                      {(["gross", "mittel", "klein"] as RSIDimension[]).map(v => (
                        <button
                          key={v}
                          onClick={() => setAssessment(prev => ({ ...prev, abweichung: v }))}
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600 hover:border-blue-500 transition-all text-left font-bold capitalize text-sm flex justify-between items-center group"
                        >
                          {t(`dimensions.${v}`)} <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Unfallschwere */}
              {assessment.wichtigkeit && assessment.abweichung && (
                <>
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs">
                    <p className="text-blue-400 font-bold text-[9px] uppercase tracking-widest mb-1">
                      {t("training.relevanz_sd")}
                    </p>
                    <p className="font-bold capitalize">
                      {t(`dimensions.${getRelevanzSD(assessment.wichtigkeit, assessment.abweichung)}`)}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{t("training.unfallschwere_title")}</h4>
                    <p className="text-xs text-white/50 mb-3">{t("training.unfallschwere_hint")}</p>
                    <div className="space-y-2">
                      {(["schwer", "mittel", "leicht"] as NACADimension[]).map(v => (
                        <button
                          key={v}
                          onClick={() => handleUnfallschwere(v)}
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600 hover:border-blue-500 transition-all text-left font-bold capitalize text-sm flex justify-between items-center group"
                        >
                          {t(`dimensions.${v}`)} <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Auflösung ── */}
          {step === 3 && result && (
            <div className="space-y-5">
              {result.deficit ? (
                <>
                  {/* Gefunden! */}
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <CheckCircle2 size={24} className="text-green-400 shrink-0" />
                    <div>
                      <p className="font-bold text-green-400">{t("training.deficit_found")}</p>
                      <p className="text-xs text-white/50">+{result.points} Pkt.</p>
                    </div>
                    {result.deficit.isBooster && (
                      <div className="ml-auto flex items-center gap-1 text-yellow-400">
                        <Star size={14} />
                        <span className="text-xs font-bold">{t("training.booster_label")}</span>
                      </div>
                    )}
                  </div>

                  {/* Unfallrisiko */}
                  <div>
                    <div className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3",
                      ratingColor(getUnfallrisiko(
                        getRelevanzSD(result.assessment.wichtigkeit, result.assessment.abweichung),
                        result.assessment.unfallschwere,
                      )),
                    )}>
                      {t("training.unfallrisiko")}: {t(`dimensions.${getUnfallrisiko(
                        getRelevanzSD(result.assessment.wichtigkeit, result.assessment.abweichung),
                        result.assessment.unfallschwere,
                      )}`)}
                    </div>
                    <h4 className="text-xl font-bold mb-2">{result.deficit.title}</h4>
                    <p className="text-sm text-white/70 leading-relaxed">{result.deficit.description}</p>
                  </div>

                  {/* Vergleich Beurteilung */}
                  <div className="grid grid-cols-3 gap-2">
                    {(["wichtigkeit", "abweichung", "unfallschwere"] as const).map(key => {
                      const isCorrect = result.assessment[key] === result.deficit!.correctAssessment[key];
                      return (
                        <div key={key} className={cn(
                          "p-2 rounded-xl border text-center",
                          isCorrect
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400",
                        )}>
                          <p className="text-[8px] uppercase tracking-tighter opacity-60 mb-1">{key}</p>
                          <p className="text-xs font-bold capitalize">{t(`dimensions.${result.assessment[key]}`)}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-2">
                        {t("training.technical_reason")}
                      </p>
                      <p className="text-sm text-white/80 italic">"{result.deficit.feedback}"</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-green-400 mb-2">
                        {t("training.action_logic")}
                      </p>
                      <p className="text-sm text-white/80">{result.deficit.solution}</p>
                    </div>
                  </div>

                  {/* Normen-Verweise */}
                  {result.deficit.references && result.deficit.references.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2 flex items-center gap-1">
                        <BookOpen size={11} /> {t("training.references")}
                      </p>
                      {result.deficit.references.map((ref, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                          {ref.normCode && (
                            <span className="font-mono bg-white/5 px-2 py-0.5 rounded">{ref.normCode}</span>
                          )}
                          {ref.url
                            ? <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{ref.label}</a>
                            : <span>{ref.label}</span>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Kein Defizit getroffen */
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <XCircle size={40} className="text-white/20" />
                  <p className="font-bold">{t("training.no_deficit_here")}</p>
                  <p className="text-xs text-white/40">Die Bewertung wird nicht gewertet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className="p-5 border-t border-white/10 shrink-0">
            <button
              onClick={handleClose}
              className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
            >
              {t("training.continue_btn")}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
