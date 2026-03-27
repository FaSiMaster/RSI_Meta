import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createXRStore } from "@react-three/xr";
import {
  Topic, Scene, Deficit, RankingEntry, RSIDimension, NACADimension, ResultDimension,
  DeficitCategory, GlossaryEntry, Course,
} from "./types";
import { apiFetch } from "./lib/api";
import { SUPPORTED_LANGS, SupportedLang, setLang } from "./i18n/index";
import SceneViewer from "./SceneViewer";
import Leaderboard from "./components/Leaderboard";
import DeficitContextMenu from "./components/DeficitContextMenu";
import TopicManager from "./components/TopicManager";
import GlossaryAdmin from "./components/GlossaryAdmin";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LayoutDashboard,
  Maximize2,
  Settings,
  ShieldAlert,
  Trophy,
  X,
  Info,
  MapPin,
  User,
  Eye,
  Plus,
  Trash2,
  Save,
  BarChart3,
  Sun,
  Moon,
  Star,
  Globe,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// ── XR Store Singleton ─────────────────────────────────────────────────────────
const xrStore = createXRStore();

// ── Typen ──────────────────────────────────────────────────────────────────────

type View = "onboarding" | "dashboard" | "training" | "admin" | "leaderboard";

type AdminTab = "deficits" | "topics" | "courses" | "glossary" | "categories";

interface ClickResult {
  deficit: Deficit | null;
  assessment: { wichtigkeit: RSIDimension; abweichung: RSIDimension; unfallschwere: NACADimension };
  points: number;
  categoryId: string | null;
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const { t, i18n } = useTranslation();

  // ── UI-State ─────────────────────────────────────────────────────────────────
  const [view, setView]   = useState<View>("onboarding");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [lang, setLangState] = useState<SupportedLang>((i18n.language ?? "de") as SupportedLang);

  const switchLang = (l: SupportedLang) => { setLang(l); setLangState(l); };

  // ── User-State ────────────────────────────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [courseCodeInput, setCourseCodeInput] = useState("");
  const [activeCourseId, setActiveCourseId]   = useState<string | undefined>();

  // ── Daten-State ──────────────────────────────────────────────────────────────
  const [topics,     setTopics]     = useState<Topic[]>([]);
  const [scenes,     setScenes]     = useState<Scene[]>([]);
  const [deficits,   setDeficits]   = useState<Deficit[]>([]);
  const [categories, setCategories] = useState<DeficitCategory[]>([]);
  const [glossary,   setGlossary]   = useState<GlossaryEntry[]>([]);
  const [courses,    setCourses]    = useState<Course[]>([]);
  const [rankings,   setRankings]   = useState<RankingEntry[]>([]);

  // ── Training-State ────────────────────────────────────────────────────────────
  const [selectedTopic,    setSelectedTopic]    = useState<Topic | null>(null);
  const [currentScene,     setCurrentScene]     = useState<Scene | null>(null);
  const [foundDeficits,    setFoundDeficits]    = useState<string[]>([]);
  const [score,            setScore]            = useState(0);
  const [hintsActive,      setHintsActive]      = useState(false);
  const [completedTopics,  setCompletedTopics]  = useState<string[]>([]);

  // Context-Menu (Click-Flow)
  const [clickPoint,    setClickPoint]    = useState<[number, number, number] | null>(null);
  const [showClickMenu, setShowClickMenu] = useState(false);

  // Legacy Assessment (für gefundene Defizit-Marker mit Hints)
  const [selectedDeficit,   setSelectedDeficit]   = useState<Deficit | null>(null);
  const [assessmentStep,    setAssessmentStep]     = useState(0);
  const [currentAssessment, setCurrentAssessment] = useState<{
    wichtigkeit?: RSIDimension;
    abweichung?: RSIDimension;
    unfallschwere?: NACADimension;
  }>({});

  // ── Admin-State ───────────────────────────────────────────────────────────────
  const [adminKey,           setAdminKey]           = useState("");
  const [adminKeyInput,      setAdminKeyInput]      = useState("");
  const [adminTab,           setAdminTab]           = useState<AdminTab>("deficits");
  const [adminSelectedTopic, setAdminSelectedTopic] = useState<Topic | null>(null);
  const [adminSelectedScene, setAdminSelectedScene] = useState<Scene | null>(null);
  const [adminDeficits,      setAdminDeficits]      = useState<Deficit[]>([]);
  const [isEditingDeficit,   setIsEditingDeficit]   = useState(false);
  const [editingDeficit,     setEditingDeficit]     = useState<Partial<Deficit>>({});
  const [showDeficitEditor,  setShowDeficitEditor]  = useState(false);

  // ── Fehler-State ──────────────────────────────────────────────────────────────
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  const showError = useCallback((msg: string) => {
    setFetchError(msg);
    setTimeout(() => setFetchError(null), 5000);
  }, []);

  // ── Admin-Fetch ───────────────────────────────────────────────────────────────
  const adminFetch = useCallback(<T,>(url: string, method: string, body: unknown): Promise<T> => {
    return apiFetch<T>(url, {
      method,
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
      body: JSON.stringify(body),
    });
  }, [adminKey]);

  // ── Initiales Laden ───────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiFetch<Topic[]>("/api/topics"),
      apiFetch<RankingEntry[]>("/api/rankings"),
      apiFetch<DeficitCategory[]>("/api/categories"),
      apiFetch<GlossaryEntry[]>("/api/glossary"),
      apiFetch<Course[]>("/api/courses"),
    ])
      .then(([topicsData, rankingsData, catsData, glossaryData, coursesData]) => {
        setTopics(topicsData);
        setRankings(rankingsData);
        setCategories(catsData);
        setGlossary(glossaryData);
        setCourses(coursesData);
        setLoading(false);
      })
      .catch(err => {
        showError(`${t("errors.load_topics")}: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // ── RSI-Bewertungslogik ───────────────────────────────────────────────────────

  const getRelevanzSD = (w: RSIDimension, a: RSIDimension): ResultDimension => {
    if (w === "gross") return a === "gross" ? "hoch" : a === "mittel" ? "mittel" : "gering";
    if (w === "mittel") return a === "gross" ? "hoch" : a === "mittel" ? "mittel" : "gering";
    return a === "gross" ? "mittel" : "gering";
  };

  const getUnfallrisiko = (rel: ResultDimension, s: NACADimension): ResultDimension => {
    if (rel === "hoch")   return s === "leicht" ? "mittel" : "hoch";
    if (rel === "mittel") return s === "schwer" ? "hoch" : s === "mittel" ? "mittel" : "gering";
    return s === "schwer" ? "mittel" : "gering";
  };

  const getRatingColor = (r: string) => {
    if (r === "hoch")   return "bg-red-500/20 text-red-400 border-red-500/30";
    if (r === "mittel") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const calculatePoints = (
    assessment: { wichtigkeit: RSIDimension; abweichung: RSIDimension; unfallschwere: NACADimension },
    correct: Deficit["correctAssessment"],
    isBooster = false,
  ) => {
    let pts = 100;
    if (assessment.wichtigkeit   === correct.wichtigkeit)   pts += 50;
    if (assessment.abweichung    === correct.abweichung)    pts += 50;
    if (assessment.unfallschwere === correct.unfallschwere) pts += 50;
    if (
      assessment.wichtigkeit   === correct.wichtigkeit &&
      assessment.abweichung    === correct.abweichung &&
      assessment.unfallschwere === correct.unfallschwere
    ) pts += 100;
    if (isBooster) pts = Math.round(pts * 1.5);
    return pts;
  };

  // ── Training-Aktionen ─────────────────────────────────────────────────────────

  const handleStart = () => {
    if (!username.trim()) return;
    // Kurs-Code prüfen
    if (courseCodeInput.trim()) {
      const course = courses.find(c => c.accessCode === courseCodeInput.trim() && c.active);
      if (course) setActiveCourseId(course.id);
      else showError(t("ranking.course_not_found"));
    }
    setView("dashboard");
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setLoading(true);
    apiFetch<Scene[]>(`/api/scenes/${topic.id}`)
      .then(data => { setScenes(data); setLoading(false); })
      .catch(err => { showError(`${t("errors.load_scenes")}: ${err.message}`); setLoading(false); });
  };

  const handleSceneSelect = (scene: Scene) => {
    setCurrentScene(scene);
    setFoundDeficits([]);
    setScore(0);
    setHintsActive(false);
    setShowClickMenu(false);
    setSelectedDeficit(null);
    setLoading(true);
    apiFetch<Deficit[]>(`/api/deficits/${scene.id}`)
      .then(data => { setDeficits(data); setView("training"); setLoading(false); })
      .catch(err => { showError(`${t("errors.load_deficits")}: ${err.message}`); setLoading(false); });
  };

  const toggleHints = () => {
    if (!hintsActive) setScore(prev => Math.max(0, prev - 250));
    setHintsActive(prev => !prev);
  };

  // ── Click-Flow (blind klicken ohne Hints) ────────────────────────────────────

  const handleBlindClick = (point: [number, number, number]) => {
    if (hintsActive) return; // Im Hints-Modus nicht aktiv
    setClickPoint(point);
    setShowClickMenu(true);
  };

  const handleClickResult = (result: ClickResult) => {
    if (result.deficit && !foundDeficits.includes(result.deficit.id)) {
      setFoundDeficits(prev => [...prev, result.deficit!.id]);
      setScore(prev => prev + result.points);
    }
  };

  // ── Hints-Modus: Klick auf Marker ────────────────────────────────────────────

  const handleDeficitFound = (deficit: Deficit) => {
    if (!foundDeficits.includes(deficit.id)) {
      setSelectedDeficit(deficit);
      setAssessmentStep(0);
      setCurrentAssessment({});
    } else {
      setSelectedDeficit(deficit);
      setAssessmentStep(3);
    }
  };

  const submitAssessmentStep = (value: string) => {
    const steps = ["wichtigkeit", "abweichung", "unfallschwere"] as const;
    const key   = steps[assessmentStep];
    const next  = { ...currentAssessment, [key]: value };
    setCurrentAssessment(next);

    if (assessmentStep < 2) {
      setAssessmentStep(prev => prev + 1);
    } else {
      const full = next as { wichtigkeit: RSIDimension; abweichung: RSIDimension; unfallschwere: NACADimension };
      const pts  = calculatePoints(full, selectedDeficit!.correctAssessment, selectedDeficit!.isBooster);
      setScore(prev => prev + pts);
      setAssessmentStep(3);
      setFoundDeficits(prev => [...prev, selectedDeficit!.id]);
    }
  };

  // ── Training abschliessen ─────────────────────────────────────────────────────

  const finishTraining = () => {
    // Prüfen ob alle Themen abgeschlossen
    const newCompleted = selectedTopic
      ? [...new Set([...completedTopics, selectedTopic.id])]
      : completedTopics;
    setCompletedTopics(newCompleted);

    const scope   = activeCourseId ? "course" : (selectedTopic ? "topic" : "total");
    const scopeId = activeCourseId ?? selectedTopic?.id ?? "total";

    // Topic-Score speichern
    if (selectedTopic) {
      apiFetch("/api/rankings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, score, scope: "topic", scopeId: selectedTopic.id, completedScenes: foundDeficits.length }),
      }).catch(() => {});
    }

    // Kurs/Total-Score speichern
    apiFetch<{ success: boolean }>("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score, scope, scopeId, completedScenes: foundDeficits.length }),
    })
      .then(() => apiFetch<RankingEntry[]>("/api/rankings"))
      .then(data => { setRankings(data); setView("leaderboard"); })
      .catch(err => showError(`${t("errors.save_score")}: ${err.message}`));
  };

  // ── Admin-Aktionen ────────────────────────────────────────────────────────────

  const handleAdminTopicSelect = (topic: Topic) => {
    setAdminSelectedTopic(topic);
    setAdminSelectedScene(null);
    setAdminDeficits([]);
    apiFetch<Scene[]>(`/api/scenes/${topic.id}`)
      .then(setScenes)
      .catch(err => showError(`${t("errors.load_scenes")}: ${err.message}`));
  };

  const handleAdminSceneSelect = (scene: Scene) => {
    setAdminSelectedScene(scene);
    apiFetch<Deficit[]>(`/api/deficits/${scene.id}`)
      .then(setAdminDeficits)
      .catch(err => showError(`${t("errors.load_deficits")}: ${err.message}`));
  };

  const saveDeficit = () => {
    const method = editingDeficit.id ? "PUT" : "POST";
    const url    = editingDeficit.id
      ? `/api/admin/deficits/${editingDeficit.id}`
      : "/api/admin/deficits";

    adminFetch<Deficit>(url, method, { ...editingDeficit, sceneId: adminSelectedScene?.id })
      .then(() => {
        setIsEditingDeficit(false);
        if (adminSelectedScene) handleAdminSceneSelect(adminSelectedScene);
      })
      .catch(err => showError(`${t("errors.save_deficit")}: ${err.message}`));
  };

  const deleteDeficit = (id: string) => {
    apiFetch(`/api/admin/deficits/${id}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": adminKey },
    })
      .then(() => { if (adminSelectedScene) handleAdminSceneSelect(adminSelectedScene); })
      .catch(err => showError(`Löschen fehlgeschlagen: ${err.message}`));
  };

  // ── Lade-Screen ───────────────────────────────────────────────────────────────

  if (loading && view === "onboarding") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fdfdfd] text-[#1a1a1a]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-2 border-black/5 border-t-black rounded-full animate-spin" />
          <p className="text-black/40 font-medium tracking-[0.2em] uppercase text-[10px]">{t("app.loading")}</p>
        </motion.div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "h-screen w-full font-sans overflow-hidden flex flex-col transition-colors duration-700",
      view === "onboarding" ? "bg-[#fdfdfd] text-[#1a1a1a]" : "bg-[#0a0a0a] text-white",
    )}>

      {/* ── Globale Fehlerbenachrichtigung ── */}
      <AnimatePresence>
        {fetchError && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-lg"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="text-sm font-medium">{fetchError}</span>
            <button onClick={() => setFetchError(null)} className="ml-2 opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className={cn(
        "h-20 flex items-center justify-between px-10 z-50 transition-all duration-700 shrink-0",
        view === "onboarding" ? "bg-transparent" : "bg-black/40 backdrop-blur-xl border-b border-white/10",
      )}>
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-700",
              view === "onboarding" ? "bg-black text-white" : "bg-blue-600 text-white",
            )}
          >
            <ShieldAlert size={20} />
          </motion.div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">{t("app.name")}</h1>
            <p className={cn(
              "text-[9px] uppercase tracking-[0.2em] font-bold transition-colors duration-700",
              view === "onboarding" ? "text-black/40" : "text-blue-400",
            )}>
              {t("app.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Sprachumschalter */}
          <div className="flex items-center gap-1">
            <Globe size={12} className={view === "onboarding" ? "text-black/30" : "text-white/30"} />
            {SUPPORTED_LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => switchLang(l.code)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all",
                  lang === l.code
                    ? (view === "onboarding" ? "text-black bg-black/10" : "text-white bg-white/10")
                    : (view === "onboarding" ? "text-black/30 hover:text-black" : "text-white/30 hover:text-white"),
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {view === "onboarding" && (
            <button
              onClick={() => setView("admin")}
              className="text-[11px] uppercase tracking-widest font-bold text-black/40 hover:text-black transition-colors flex items-center gap-2"
            >
              <Settings size={14} /> {t("nav.adminAccess")}
            </button>
          )}

          {view !== "onboarding" && (
            <div className="flex items-center gap-5">
              {username && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <User size={14} className="text-white/40" />
                  <span className="text-xs font-medium">{username}</span>
                </div>
              )}
              {activeCourseId && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                  <GraduationCap size={13} className="text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">
                    {courses.find(c => c.id === activeCourseId)?.name ?? "Kurs"}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <Trophy size={14} className="text-blue-400" />
                <span className="text-sm font-bold text-blue-400">{score.toLocaleString("de-CH")} Pkt.</span>
              </div>
              <nav className="flex items-center gap-4 border-l border-white/10 pl-5">
                <button onClick={() => setView("dashboard")} className={cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400", view === "dashboard" ? "text-blue-400" : "text-white/60")}>
                  <LayoutDashboard size={16} /> {t("nav.dashboard")}
                </button>
                <button onClick={() => setView("leaderboard")} className={cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400", view === "leaderboard" ? "text-blue-400" : "text-white/60")}>
                  <BarChart3 size={16} /> {t("nav.ranking")}
                </button>
                <button onClick={() => setView("admin")} className={cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400", view === "admin" ? "text-blue-400" : "text-white/60")}>
                  <Settings size={16} /> {t("nav.admin")}
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-auto min-h-0">
        <AnimatePresence mode="wait">

          {/* ── Onboarding ── */}
          {view === "onboarding" && (
            <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full relative flex items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <motion.div
                  animate={{ rotateY: [0, 360], scale: [1, 1.1, 1] }}
                  transition={{ rotateY: { duration: 60, repeat: Infinity, ease: "linear" }, scale: { duration: 20, repeat: Infinity, ease: "easeInOut" } }}
                  className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%]"
                  style={{ backgroundImage: `url('https://picsum.photos/seed/road360/2000/1000')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px)", borderRadius: "50%" }}
                />
              </div>

              <div className="max-w-6xl w-full px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center z-10">
                <div className="space-y-12">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <h2 className="text-[80px] font-bold tracking-[-0.04em] leading-[0.9] mb-8">
                      {t("onboarding.title1")} <br />
                      <span className={cn("italic font-serif transition-colors duration-700", theme === "light" ? "text-black/20" : "text-white/20")}>{t("onboarding.title2")}</span> <br />
                      {t("onboarding.title3")}
                    </h2>
                    <p className={cn("text-xl max-w-md leading-relaxed font-medium transition-colors duration-700", theme === "light" ? "text-black/50" : "text-white/50")}>
                      {t("onboarding.subtitle")}
                    </p>
                  </motion.div>

                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col gap-6">
                    {[{ icon: <Eye size={20} />, label: t("onboarding.exploration") }, { icon: <BarChart3 size={20} />, label: t("onboarding.analysis") }].map(({ icon, label }) => (
                      <div key={label} className="flex items-center gap-6 group cursor-default">
                        <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500", theme === "light" ? "border-black/5 group-hover:bg-black group-hover:text-white" : "border-white/5 group-hover:bg-white group-hover:text-black")}>
                          {icon}
                        </div>
                        <span className={cn("text-sm font-bold tracking-widest uppercase transition-colors duration-700", theme === "light" ? "text-black/40 group-hover:text-black" : "text-white/40 group-hover:text-white")}>{label}</span>
                      </div>
                    ))}
                  </motion.div>

                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className={cn("pt-10 border-t transition-colors duration-700", theme === "light" ? "border-black/5" : "border-white/5")}>
                    <button onClick={() => setView("admin")} className={cn("group flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all", theme === "light" ? "text-black/20 hover:text-black" : "text-white/20 hover:text-white")}>
                      <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                      {t("nav.systemAdmin")}
                    </button>
                  </motion.div>
                </div>

                <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
                  className={cn("border rounded-[40px] p-12 transition-all duration-700", theme === "light" ? "bg-white border-black/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)]" : "bg-white/5 border-white/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]")}
                >
                  <div className="space-y-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{t("onboarding.welcome")}</h3>
                        <p className={cn("text-sm transition-colors duration-700", theme === "light" ? "text-black/40" : "text-white/40")}>{t("onboarding.welcome_hint")}</p>
                      </div>
                      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-500", theme === "light" ? "border-black/5 bg-black/5 text-black hover:bg-black hover:text-white" : "border-white/5 bg-white/5 text-white hover:bg-white hover:text-black")}
                      >
                        {theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
                        {theme === "light" ? t("theme.dark") : t("theme.light")}
                      </button>
                    </div>

                    <div className="space-y-5">
                      <input
                        type="text" value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleStart()}
                        placeholder={t("onboarding.name_placeholder")}
                        className={cn("w-full bg-transparent border-b-2 py-4 text-xl font-bold focus:outline-none transition-colors placeholder:text-black/10", theme === "light" ? "border-black/5 focus:border-black" : "border-white/5 focus:border-white")}
                      />

                      {/* Kurs-Code */}
                      <div className={cn("flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors", theme === "light" ? "border-black/5" : "border-white/5")}>
                        <GraduationCap size={16} className={theme === "light" ? "text-black/20" : "text-white/20"} />
                        <input
                          type="text"
                          value={courseCodeInput}
                          onChange={e => setCourseCodeInput(e.target.value)}
                          placeholder={t("onboarding.course_code_placeholder")}
                          className={cn("flex-1 bg-transparent text-sm focus:outline-none", theme === "light" ? "placeholder:text-black/20" : "placeholder:text-white/20")}
                        />
                      </div>

                      <div className={cn("flex items-center gap-4 py-4 px-6 rounded-2xl border transition-colors duration-700", theme === "light" ? "bg-[#f8f9fa] border-black/5" : "bg-white/5 border-white/5")}>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <p className={cn("text-[11px] font-bold uppercase tracking-widest", theme === "light" ? "text-black/40" : "text-white/40")}>{t("onboarding.quest_ready")}</p>
                      </div>

                      <button onClick={handleStart} disabled={!username.trim()}
                        className={cn("w-full py-6 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg", theme === "light" ? "bg-black text-white" : "bg-white text-black", !username.trim() && "opacity-40 cursor-not-allowed hover:scale-100")}
                      >
                        {t("onboarding.start_btn")} <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>

              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }} className={cn("absolute bottom-10 left-1/2 -translate-x-1/2", theme === "light" ? "text-black/20" : "text-white/20")}>
                <div className="w-px h-12 bg-current mx-auto" />
              </motion.div>
            </motion.div>
          )}

          {/* ── Dashboard ── */}
          {view === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-8 max-w-7xl mx-auto w-full">
              {!selectedTopic ? (
                <>
                  <div className="mb-12 flex items-end justify-between">
                    <div>
                      <h2 className="text-4xl font-bold tracking-tight mb-2">{t("dashboard.topics_title")}</h2>
                      <p className="text-white/60 max-w-2xl">{t("dashboard.topics_subtitle")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">{t("dashboard.current_score")}</p>
                      <p className="text-3xl font-black text-blue-500">{score.toLocaleString("de-CH")} {t("dashboard.points")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {topics.map(topic => (
                      <motion.div key={topic.id} whileHover={{ scale: 1.02, translateY: -4 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleTopicSelect(topic)}
                        className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all hover:bg-white/10 hover:border-blue-500/50"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><BookOpen size={80} /></div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <ShieldAlert size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{topic.nameI18n?.[lang] ?? topic.name}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">{topic.description}</p>
                        {completedTopics.includes(topic.id) && (
                          <div className="mt-3 flex items-center gap-1 text-green-400 text-xs font-bold">
                            <CheckCircle2 size={12} /> Abgeschlossen
                          </div>
                        )}
                        <div className="mt-4 flex items-center gap-2 text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          {t("dashboard.explore_scenes")} <ChevronRight size={16} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                  <button onClick={() => setSelectedTopic(null)} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={16} /> {t("dashboard.back_to_topics")}
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">{selectedTopic.nameI18n?.[lang] ?? selectedTopic.name}</h2>
                    <p className="text-white/60">{selectedTopic.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scenes.map(scene => (
                      <div key={scene.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-blue-500/50 transition-all">
                        <div className="h-48 overflow-hidden relative">
                          <img src={scene.imageUrl} alt={scene.description} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                          <div className="absolute bottom-4 left-4 flex items-center gap-2">
                            <MapPin size={14} className="text-blue-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">{t("dashboard.scenario")} {scene.id.slice(-1)}</span>
                          </div>
                          {scene.difficulty && (
                            <div className={cn(
                              "absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                              scene.difficulty === "schwer" ? "bg-red-500/80 text-white" :
                              scene.difficulty === "mittel" ? "bg-yellow-500/80 text-black" :
                              "bg-green-500/80 text-black",
                            )}>
                              {t(`dimensions.${scene.difficulty}`)}
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-white/80 mb-6 line-clamp-2">{scene.description}</p>
                          <button onClick={() => handleSceneSelect(scene)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            {t("dashboard.start_training")} <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Training ── */}
          {view === "training" && currentScene && (
            <motion.div key="training" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full relative">
              <SceneViewer
                sceneUrl={currentScene.imageUrl}
                deficits={deficits}
                onDeficitFound={handleDeficitFound}
                onBlindClick={handleBlindClick}
                foundIds={foundDeficits}
                showHints={hintsActive}
                store={xrStore}
              />

              {/* Overlay-Controls */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                <button onClick={() => void xrStore.enterVR()} className="bg-blue-600/80 backdrop-blur-md px-4 py-2 rounded-full border border-blue-400/40 text-xs font-bold text-white hover:bg-blue-500 transition-all flex items-center gap-2">
                  <Maximize2 size={14} /> {t("training.vr_start")}
                </button>
                <button onClick={toggleHints} className={cn("bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-bold transition-all flex items-center gap-2", hintsActive ? "bg-orange-500 text-white border-orange-400" : "text-white/60 hover:text-white")}>
                  <ShieldAlert size={14} />
                  {hintsActive ? t("training.hints_active") : t("training.hints_toggle")}
                </button>
                <button onClick={() => { setView("dashboard"); setShowClickMenu(false); }} className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/20 text-white hover:bg-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Click-Flow Context-Menu (blind klicken ohne Hints) */}
              {showClickMenu && clickPoint && !hintsActive && (
                <DeficitContextMenu
                  clickPoint={clickPoint}
                  deficits={deficits}
                  categories={categories}
                  glossary={glossary}
                  locationType={currentScene.locationType}
                  lang={lang}
                  onResult={result => {
                    handleClickResult(result);
                    setShowClickMenu(false);
                  }}
                  onClose={() => setShowClickMenu(false)}
                />
              )}

              {/* Hints-Modus: Assessment-Panel für Marker-Klicks */}
              <AnimatePresence>
                {hintsActive && selectedDeficit && (
                  <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
                    className="absolute top-20 right-4 bottom-4 w-96 z-50 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                  >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><ShieldAlert size={20} /></div>
                        <h3 className="font-bold">{assessmentStep < 3 ? t("training.assessment_step", { step: assessmentStep + 1 }) : t("training.assessment_result")}</h3>
                      </div>
                      <button onClick={() => setSelectedDeficit(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-auto p-6 space-y-6">
                      {assessmentStep < 3 ? (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-xl font-bold mb-2">
                              {assessmentStep === 0 && t("training.wichtigkeit_title")}
                              {assessmentStep === 1 && t("training.abweichung_title")}
                              {assessmentStep === 2 && t("training.unfallschwere_title")}
                            </h4>
                            <p className="text-sm text-white/60">
                              {assessmentStep === 0 && (currentScene?.locationType === "io" ? t("training.wichtigkeit_hint_io") : t("training.wichtigkeit_hint_ao"))}
                              {assessmentStep === 1 && t("training.abweichung_hint")}
                              {assessmentStep === 2 && t("training.unfallschwere_hint")}
                            </p>
                          </div>
                          {assessmentStep === 2 && currentAssessment.wichtigkeit && currentAssessment.abweichung && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                              <p className="text-[10px] uppercase tracking-widest text-blue-400 mb-1">{t("training.intermediate_result")}</p>
                              <p className="font-bold">{t("training.relevanz_sd")}: <span className="capitalize">{t(`dimensions.${getRelevanzSD(currentAssessment.wichtigkeit, currentAssessment.abweichung)}`)}</span></p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-3">
                            {(assessmentStep === 2 ? ["schwer", "mittel", "leicht"] : ["gross", "mittel", "klein"]).map((val) => (
                              <button key={val} onClick={() => submitAssessmentStep(val)}
                                className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 hover:border-blue-500 transition-all text-left font-bold capitalize flex justify-between items-center group"
                              >
                                {t(`dimensions.${val}`)} <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <section>
                            <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3", getRatingColor(getUnfallrisiko(getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!), currentAssessment.unfallschwere!)))}>
                              {t("training.unfallrisiko")}: {t(`dimensions.${getUnfallrisiko(getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!), currentAssessment.unfallschwere!)}`)}
                            </div>
                            {selectedDeficit.isBooster && (
                              <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold mb-3">
                                <Star size={12} /> {t("training.booster_label")}
                              </div>
                            )}
                            <h4 className="text-2xl font-bold mb-3">{selectedDeficit.title}</h4>
                            <p className="text-white/70 leading-relaxed">{selectedDeficit.description}</p>
                          </section>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(currentAssessment).map(([key, val]) => {
                              const isCorrect = val === (selectedDeficit.correctAssessment as Record<string, string>)[key];
                              return (
                                <div key={key} className={cn("p-2 rounded-xl border text-center", isCorrect ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                                  <p className="text-[8px] uppercase tracking-tighter opacity-60 mb-1">{key}</p>
                                  <p className="text-xs font-bold capitalize">{t(`dimensions.${val as string}`)}</p>
                                </div>
                              );
                            })}
                          </div>
                          <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Info size={14} /> {t("training.technical_reason")}</h5>
                            <p className="text-sm text-white/80 italic">"{selectedDeficit.feedback}"</p>
                          </section>
                          <section className="bg-green-500/10 rounded-2xl p-5 border border-green-500/20">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3 flex items-center gap-2"><CheckCircle2 size={14} /> {t("training.action_logic")}</h5>
                            <p className="text-sm text-white/80">{selectedDeficit.solution}</p>
                          </section>
                        </div>
                      )}
                    </div>
                    {assessmentStep === 3 && (
                      <div className="p-6 bg-white/5 border-t border-white/10">
                        <button onClick={() => setSelectedDeficit(null)} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors">
                          {t("training.continue_btn")}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Abschluss-Overlay */}
              {foundDeficits.length === deficits.length && deficits.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] bg-blue-600/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
                  <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 mx-auto mb-8 shadow-2xl"><Trophy size={48} /></div>
                    <h2 className="text-4xl font-bold mb-2">{t("finish.title")}</h2>
                    <div className="text-2xl font-black mb-6 flex items-center justify-center gap-2">
                      <span className="text-white/60">{t("finish.score_label")}</span> <span>{score.toLocaleString("de-CH")} {t("finish.points")}</span>
                    </div>
                    <p className="text-white/80 mb-8 leading-relaxed">{t("finish.summary", { count: deficits.length })}</p>
                    <button onClick={finishTraining} className="w-full py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-white/90 transition-all shadow-xl">
                      {t("finish.save_btn")}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Leaderboard ── */}
          {view === "leaderboard" && (
            <Leaderboard
              username={username}
              topics={topics}
              completedTopicIds={completedTopics}
              activeCourseId={activeCourseId}
              onBack={() => setView("dashboard")}
            />
          )}

          {/* ── Admin ── */}
          {view === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 max-w-7xl mx-auto w-full space-y-8 h-full overflow-auto"
            >
              {/* Admin-Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">{t("admin.title")}</h2>
                  <p className="text-white/60">{t("admin.subtitle")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <KeyRound size={14} className={adminKey ? "text-green-400" : "text-white/30"} />
                    <input
                      type="password"
                      placeholder={t("admin.key_placeholder")}
                      value={adminKeyInput}
                      onChange={e => setAdminKeyInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") setAdminKey(adminKeyInput); }}
                      className="bg-transparent text-xs w-32 focus:outline-none placeholder:text-white/20"
                    />
                    <button
                      onClick={() => setAdminKey(adminKeyInput)}
                      className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg transition-colors", adminKey ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40 hover:bg-white/20")}
                    >
                      {adminKey ? t("admin.key_active") : t("admin.key_set_btn")}
                    </button>
                  </div>
                  <button onClick={() => setView("onboarding")} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2">
                    <ArrowLeft size={18} /> {t("nav.logout")}
                  </button>
                </div>
              </div>

              {!adminKey && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-sm">
                  <AlertTriangle size={18} className="shrink-0" />
                  {t("admin.key_missing")}
                </div>
              )}

              {/* Admin-Tab-Navigation */}
              <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
                {([
                  { key: "deficits",   label: t("admin.deficits_panel") },
                  { key: "topics",     label: t("admin.topics_tab") },
                  { key: "courses",    label: t("admin.courses_tab") },
                  { key: "glossary",   label: t("admin.glossary_tab") },
                  { key: "categories", label: t("admin.categories_tab") },
                ] as { key: AdminTab; label: string }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAdminTab(tab.key)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                      adminTab === tab.key ? "bg-blue-600 text-white" : "text-white/40 hover:text-white/80",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Defizite ── */}
              {adminTab === "deficits" && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  {/* Themenbereiche */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{t("admin.topics_panel")}</h3>
                    {topics.map(t_ => (
                      <div key={t_.id} onClick={() => handleAdminTopicSelect(t_)}
                        className={cn("p-4 border rounded-2xl cursor-pointer transition-all", adminSelectedTopic?.id === t_.id ? "bg-blue-600 border-blue-500" : "bg-black/40 border-white/10 hover:border-white/30")}
                      >
                        <h4 className="font-bold text-sm">{t_.name}</h4>
                        <p className="text-[10px] opacity-40">{t_.id}</p>
                      </div>
                    ))}
                  </div>

                  {/* Szenen */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{t("admin.scenes_panel")}</h3>
                    {!adminSelectedTopic ? (
                      <p className="text-xs text-white/20 italic">{t("admin.select_topic")}</p>
                    ) : (
                      <div className="space-y-3">
                        {scenes.map(s => (
                          <div key={s.id} onClick={() => handleAdminSceneSelect(s)}
                            className={cn("p-4 border rounded-2xl cursor-pointer transition-all", adminSelectedScene?.id === s.id ? "bg-blue-600 border-blue-500" : "bg-black/40 border-white/10 hover:border-white/30")}
                          >
                            <div className="flex items-center gap-3">
                              <img src={s.imageUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" alt="" />
                              <div>
                                <h4 className="font-bold text-xs">{t("dashboard.scenario")} {s.id.slice(-1)}</h4>
                                <p className="text-[10px] opacity-40 capitalize">{s.locationType}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="w-full py-3 border border-dashed border-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                          <Plus size={12} /> {t("admin.new_scene")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Defizite & Editor */}
                  <div className="lg:col-span-2 space-y-6">
                    {!adminSelectedScene ? (
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center border-dashed">
                        <MapPin size={32} className="mx-auto mb-4 opacity-20" />
                        <h4 className="font-bold mb-2">{t("admin.select_scene").split(" ")[0]}</h4>
                        <p className="text-sm text-white/40">{t("admin.select_scene")}</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">{t("admin.deficits_panel")}</h3>
                            <button
                              onClick={() => {
                                setEditingDeficit({ title: "", description: "", correctAssessment: { wichtigkeit: "mittel", abweichung: "mittel", unfallschwere: "mittel" }, feedback: "", solution: "", position: [0, 0, -5], tolerance: 2 });
                                setIsEditingDeficit(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                            >
                              + {t("admin.new_deficit")}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            {adminDeficits.map(d => (
                              <div key={d.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between group">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-sm">{d.title}</h4>
                                    {d.isMandatory && <span className="text-[8px] uppercase bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-md font-bold">Pflicht</span>}
                                    {d.isBooster  && <span className="text-[8px] uppercase bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"><Star size={8} /> Bonus</span>}
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-[8px] uppercase px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md">{d.correctAssessment.wichtigkeit}</span>
                                    <span className="text-[8px] uppercase px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-md">{d.correctAssessment.abweichung}</span>
                                    <span className="text-[8px] uppercase px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-md">{d.correctAssessment.unfallschwere}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => { setEditingDeficit(d); setIsEditingDeficit(true); }} className="p-2 hover:text-blue-400 text-white/40 transition-colors"><Settings size={14} /></button>
                                  <button onClick={() => deleteDeficit(d.id)} className="p-2 hover:text-red-400 text-white/40 transition-colors"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Defizit-Editor */}
                        {isEditingDeficit && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-blue-500/30 rounded-3xl p-8 space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xl font-bold">{t("admin.deficit_editor_title")}</h3>
                              <button onClick={() => setIsEditingDeficit(false)}><X size={20} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Titel</label>
                                  <input value={editingDeficit.title ?? ""} onChange={e => setEditingDeficit({ ...editingDeficit, title: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Beschreibung</label>
                                  <textarea value={editingDeficit.description ?? ""} onChange={e => setEditingDeficit({ ...editingDeficit, description: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 h-24" />
                                </div>
                                {/* Mechaniken */}
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input type="checkbox" checked={editingDeficit.isMandatory ?? false} onChange={e => setEditingDeficit({ ...editingDeficit, isMandatory: e.target.checked })} className="rounded" />
                                    <span className="font-bold text-red-400">Pflicht-Defizit</span>
                                  </label>
                                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input type="checkbox" checked={editingDeficit.isBooster ?? false} onChange={e => setEditingDeficit({ ...editingDeficit, isBooster: e.target.checked })} className="rounded" />
                                    <span className="font-bold text-yellow-400 flex items-center gap-1"><Star size={10} /> Bonus</span>
                                  </label>
                                </div>
                              </div>

                              {/* RSI-Beurteilung */}
                              <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-5">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400">{t("admin.rsi_assessment")}</h4>
                                {([["1. Wichtigkeit", "wichtigkeit"], ["2. Abweichung", "abweichung"]] as [string, "wichtigkeit" | "abweichung"][]).map(([label, key]) => (
                                  <div key={key}>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">{label}</label>
                                    <div className="flex gap-2">
                                      {(["klein", "mittel", "gross"] as RSIDimension[]).map(v => (
                                        <button key={v} onClick={() => setEditingDeficit({ ...editingDeficit, correctAssessment: { ...editingDeficit.correctAssessment!, [key]: v } })}
                                          className={cn("flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all", editingDeficit.correctAssessment?.[key] === v ? "bg-blue-600 text-white" : "bg-white/5 text-white/40")}
                                        >{t(`dimensions.${v}`)}</button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                  <p className="text-[8px] uppercase tracking-widest text-blue-400">{t("admin.intermediate")}</p>
                                  <p className="font-bold text-sm capitalize">{t(`dimensions.${getRelevanzSD(editingDeficit.correctAssessment?.wichtigkeit ?? "mittel", editingDeficit.correctAssessment?.abweichung ?? "mittel")}`)}</p>
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">3. NACA-Score</label>
                                  <div className="flex gap-2">
                                    {(["leicht", "mittel", "schwer"] as NACADimension[]).map(v => (
                                      <button key={v} onClick={() => setEditingDeficit({ ...editingDeficit, correctAssessment: { ...editingDeficit.correctAssessment!, unfallschwere: v } })}
                                        className={cn("flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all", editingDeficit.correctAssessment?.unfallschwere === v ? "bg-blue-600 text-white" : "bg-white/5 text-white/40")}
                                      >{t(`dimensions.${v}`)}</button>
                                    ))}
                                  </div>
                                </div>
                                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                  <p className="text-[8px] uppercase tracking-widest text-red-400">{t("admin.final_risk")}</p>
                                  <p className="font-bold text-sm capitalize">{t(`dimensions.${getUnfallrisiko(getRelevanzSD(editingDeficit.correctAssessment?.wichtigkeit ?? "mittel", editingDeficit.correctAssessment?.abweichung ?? "mittel"), editingDeficit.correctAssessment?.unfallschwere ?? "mittel")}`)}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">{t("training.technical_reason")}</label>
                                <textarea value={editingDeficit.feedback ?? ""} onChange={e => setEditingDeficit({ ...editingDeficit, feedback: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 h-24" />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">{t("training.action_logic")}</label>
                                <textarea value={editingDeficit.solution ?? ""} onChange={e => setEditingDeficit({ ...editingDeficit, solution: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 h-24" />
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                              <button onClick={() => setIsEditingDeficit(false)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold">{t("admin.cancel")}</button>
                              <button onClick={saveDeficit} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold flex items-center gap-2">
                                <Save size={18} /> {t("admin.save_deficit")}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab: Themen-Verwaltung ── */}
              {adminTab === "topics" && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <TopicManager
                    topics={topics}
                    adminKey={adminKey}
                    onTopicsChanged={setTopics}
                    onError={showError}
                  />
                </div>
              )}

              {/* ── Tab: Kurse ── */}
              {adminTab === "courses" && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">{t("admin.courses_tab")}</h3>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors">
                      <Plus size={12} /> {t("admin.new_course")}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {courses.map(c => (
                      <div key={c.id} className="flex items-center gap-4 p-4 bg-black/40 border border-white/10 rounded-2xl">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold">{c.name}</h4>
                            {c.active && <span className="text-[9px] font-bold uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">{t("admin.course_active")}</span>}
                          </div>
                          <div className="flex gap-4 text-xs text-white/40">
                            <span>{c.date}</span>
                            <span className="font-mono bg-white/5 px-2 py-0.5 rounded">{c.accessCode}</span>
                            <span>{c.topicIds.length} Themen</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Glossar ── */}
              {adminTab === "glossary" && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <GlossaryAdmin adminKey={adminKey} onError={showError} />
                </div>
              )}

              {/* ── Tab: Kategorien ── */}
              {adminTab === "categories" && (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">{t("admin.categories_tab")}</h3>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold transition-colors">
                      <Plus size={12} /> Neue Kategorie
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categories.map(cat => (
                      <div key={cat.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl">
                        <p className="font-bold text-sm">{cat.nameI18n[lang] ?? cat.nameI18n.de}</p>
                        <p className="text-[10px] text-white/30 mt-1">{cat.id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
