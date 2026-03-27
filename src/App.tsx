import React, { useState, useEffect, useCallback } from "react";
import { createXRStore } from "@react-three/xr";
import { Topic, Scene, Deficit, RankingEntry, RSIDimension, NACADimension, ResultDimension } from "./types";
import SceneViewer from "./SceneViewer";
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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// ── XR Store Singleton ────────────────────────────────────────────────────────
const xrStore = createXRStore();

// ── Zentraler fetch-Helper ────────────────────────────────────────────────────
// Wirft bei HTTP-Fehlern eine sprechende Exception statt still zu versagen.

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<"onboarding" | "dashboard" | "training" | "admin" | "leaderboard">("onboarding");
  const [username, setUsername] = useState("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [deficits, setDeficits] = useState<Deficit[]>([]);
  const [foundDeficits, setFoundDeficits] = useState<string[]>([]);
  const [selectedDeficit, setSelectedDeficit] = useState<Deficit | null>(null);
  const [assessmentStep, setAssessmentStep] = useState<number>(0);
  const [currentAssessment, setCurrentAssessment] = useState<{
    wichtigkeit?: RSIDimension;
    abweichung?: RSIDimension;
    unfallschwere?: NACADimension;
  }>({});
  const [score, setScore] = useState(0);
  const [hintsActive, setHintsActive] = useState(false);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [adminSelectedTopic, setAdminSelectedTopic] = useState<Topic | null>(null);
  const [adminSelectedScene, setAdminSelectedScene] = useState<Scene | null>(null);
  const [adminDeficits, setAdminDeficits] = useState<Deficit[]>([]);
  const [isEditingDeficit, setIsEditingDeficit] = useState(false);
  const [editingDeficit, setEditingDeficit] = useState<Partial<Deficit>>({});

  // Admin-Key: wird im Frontend eingegeben, per Header an geschützte Endpunkte gesendet
  const [adminKey, setAdminKey] = useState("");
  const [adminKeyInput, setAdminKeyInput] = useState("");

  // Globale Fehlermeldung (auto-dismiss nach 5 s)
  const [fetchError, setFetchError] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setFetchError(msg);
    setTimeout(() => setFetchError(null), 5000);
  }, []);

  // Hilfsfunktion für Admin-Requests mit Key-Header
  const adminFetch = useCallback(<T,>(url: string, method: string, body: unknown): Promise<T> => {
    return apiFetch<T>(url, {
      method,
      headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
      body: JSON.stringify(body),
    });
  }, [adminKey]);

  // ── Admin-Aktionen ──────────────────────────────────────────────────────────

  const handleAdminTopicSelect = (topic: Topic) => {
    setAdminSelectedTopic(topic);
    apiFetch<Scene[]>(`/api/scenes/${topic.id}`)
      .then(setScenes)
      .catch(err => showError(`Szenen konnten nicht geladen werden: ${err.message}`));
  };

  const handleAdminSceneSelect = (scene: Scene) => {
    setAdminSelectedScene(scene);
    apiFetch<Deficit[]>(`/api/deficits/${scene.id}`)
      .then(setAdminDeficits)
      .catch(err => showError(`Defizite konnten nicht geladen werden: ${err.message}`));
  };

  const saveDeficit = () => {
    const method = editingDeficit.id ? "PUT" : "POST";
    const url = editingDeficit.id
      ? `/api/admin/deficits/${editingDeficit.id}`
      : "/api/admin/deficits";

    adminFetch<Deficit>(url, method, { ...editingDeficit, sceneId: adminSelectedScene?.id })
      .then(() => {
        setIsEditingDeficit(false);
        if (adminSelectedScene) handleAdminSceneSelect(adminSelectedScene);
      })
      .catch(err => showError(`Speichern fehlgeschlagen: ${err.message}`));
  };

  // ── Initiales Laden ─────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      apiFetch<Topic[]>("/api/topics"),
      apiFetch<RankingEntry[]>("/api/rankings"),
    ])
      .then(([topicsData, rankingsData]) => {
        setTopics(topicsData);
        setRankings(rankingsData);
        setLoading(false);
      })
      .catch(err => {
        showError(`Daten konnten nicht geladen werden: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // ── Training-Aktionen ───────────────────────────────────────────────────────

  const handleStart = () => {
    if (username.trim()) setView("dashboard");
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setLoading(true);
    apiFetch<Scene[]>(`/api/scenes/${topic.id}`)
      .then(data => { setScenes(data); setLoading(false); })
      .catch(err => { showError(`Szenen konnten nicht geladen werden: ${err.message}`); setLoading(false); });
  };

  const handleSceneSelect = (scene: Scene) => {
    setCurrentScene(scene);
    setFoundDeficits([]);
    setScore(0);
    setHintsActive(false);
    setLoading(true);
    apiFetch<Deficit[]>(`/api/deficits/${scene.id}`)
      .then(data => { setDeficits(data); setView("training"); setLoading(false); })
      .catch(err => { showError(`Szene konnte nicht geladen werden: ${err.message}`); setLoading(false); });
  };

  const toggleHints = () => {
    if (!hintsActive) setScore(prev => Math.max(0, prev - 250));
    setHintsActive(prev => !prev);
  };

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
    const currentStepName = steps[assessmentStep];
    const newAssessment = { ...currentAssessment, [currentStepName]: value };
    setCurrentAssessment(newAssessment);

    if (assessmentStep < 2) {
      setAssessmentStep(prev => prev + 1);
    } else {
      calculatePoints(newAssessment);
      setAssessmentStep(3);
      setFoundDeficits(prev => [...prev, selectedDeficit!.id]);
    }
  };

  const calculatePoints = (assessment: typeof currentAssessment) => {
    if (!selectedDeficit) return;
    let points = 100;
    const correct = selectedDeficit.correctAssessment;
    if (assessment.wichtigkeit === correct.wichtigkeit) points += 50;
    if (assessment.abweichung === correct.abweichung) points += 50;
    if (assessment.unfallschwere === correct.unfallschwere) points += 50;
    if (
      assessment.wichtigkeit === correct.wichtigkeit &&
      assessment.abweichung === correct.abweichung &&
      assessment.unfallschwere === correct.unfallschwere
    ) points += 100;
    setScore(prev => prev + points);
  };

  const finishTraining = () => {
    apiFetch<{ success: boolean }>("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score }),
    })
      .then(() => apiFetch<RankingEntry[]>("/api/rankings"))
      .then(data => { setRankings(data); setView("leaderboard"); })
      .catch(err => showError(`Score konnte nicht gespeichert werden: ${err.message}`));
  };

  // ── RSI-Bewertungslogik ─────────────────────────────────────────────────────

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

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "gering": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "mittel":  return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "hoch":    return "bg-red-500/20 text-red-400 border-red-500/30";
      default:        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // ── Lade-Screen ─────────────────────────────────────────────────────────────

  if (loading && view === "onboarding") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#fdfdfd] text-[#1a1a1a]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-2 border-black/5 border-t-black rounded-full animate-spin" />
          <p className="text-black/40 font-medium tracking-[0.2em] uppercase text-[10px]">System wird geladen</p>
        </motion.div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "h-screen w-full font-sans overflow-hidden flex flex-col transition-colors duration-700",
      view === "onboarding" ? "bg-[#fdfdfd] text-[#1a1a1a]" : "bg-[#0a0a0a] text-white"
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
        "h-20 flex items-center justify-between px-10 z-50 transition-all duration-700",
        view === "onboarding" ? "bg-transparent" : "bg-black/40 backdrop-blur-xl border-b border-white/10"
      )}>
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-700",
              view === "onboarding" ? "bg-black text-white" : "bg-blue-600 text-white"
            )}
          >
            <ShieldAlert size={20} />
          </motion.div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">RSI-Immersive</h1>
            <p className={cn(
              "text-[9px] uppercase tracking-[0.2em] font-bold transition-colors duration-700",
              view === "onboarding" ? "text-black/40" : "text-blue-400"
            )}>Road Safety Inspection · FaSi Kanton Zürich</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {view === "onboarding" && (
            <button
              onClick={() => setView("admin")}
              className="text-[11px] uppercase tracking-widest font-bold text-black/40 hover:text-black transition-colors flex items-center gap-2"
            >
              <Settings size={14} /> Admin Access
            </button>
          )}
          {view !== "onboarding" && (
            <div className="flex items-center gap-6">
              {username && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <User size={14} className="text-white/40" />
                  <span className="text-xs font-medium">{username}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <Trophy size={14} className="text-blue-400" />
                <span className="text-sm font-bold text-blue-400">{score} Pkt.</span>
              </div>
              <nav className="flex items-center gap-4 border-l border-white/10 pl-6">
                <button onClick={() => setView("dashboard")} className={cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400", view === "dashboard" ? "text-blue-400" : "text-white/60")}>
                  <LayoutDashboard size={18} /> Dashboard
                </button>
                <button onClick={() => setView("leaderboard")} className={cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400", view === "leaderboard" ? "text-blue-400" : "text-white/60")}>
                  <BarChart3 size={18} /> Ranking
                </button>
                <button onClick={() => setView("admin")} className={cn("flex items-center gap-2 text-sm font-medium transition-colors hover:text-blue-400", view === "admin" ? "text-blue-400" : "text-white/60")}>
                  <Settings size={18} /> Admin
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative overflow-auto">
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
                      Präzision. <br />
                      <span className={cn("italic font-serif transition-colors duration-700", theme === "light" ? "text-black/20" : "text-white/20")}>Sicherheit.</span> <br />
                      Immersion.
                    </h2>
                    <p className={cn("text-xl max-w-md leading-relaxed font-medium transition-colors duration-700", theme === "light" ? "text-black/50" : "text-white/50")}>
                      Entwickeln Sie den geschulten Blick für das Wesentliche. Willkommen in der Zukunft der Road Safety Inspection.
                    </p>
                  </motion.div>

                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-col gap-6">
                    {[{ icon: <Eye size={20} />, label: "Exploration" }, { icon: <BarChart3 size={20} />, label: "Analyse" }].map(({ icon, label }) => (
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
                      System-Administration
                    </button>
                  </motion.div>
                </div>

                <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}
                  className={cn("border rounded-[40px] p-12 transition-all duration-700", theme === "light" ? "bg-white border-black/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)]" : "bg-white/5 border-white/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]")}
                >
                  <div className="space-y-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Willkommen.</h3>
                        <p className={cn("text-sm transition-colors duration-700", theme === "light" ? "text-black/40" : "text-white/40")}>Identifizieren Sie sich für das Ranking.</p>
                      </div>
                      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all duration-500", theme === "light" ? "border-black/5 bg-black/5 text-black hover:bg-black hover:text-white" : "border-white/5 bg-white/5 text-white hover:bg-white hover:text-black")}
                      >
                        {theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
                        {theme === "light" ? "Dark" : "Light"}
                      </button>
                    </div>

                    <div className="space-y-6">
                      <input
                        type="text" value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleStart()}
                        placeholder="Ihr Name"
                        className={cn("w-full bg-transparent border-b-2 py-4 text-xl font-bold focus:outline-none transition-colors placeholder:text-black/10", theme === "light" ? "border-black/5 focus:border-black" : "border-white/5 focus:border-white")}
                      />
                      <div className={cn("flex items-center gap-4 py-4 px-6 rounded-2xl border transition-colors duration-700", theme === "light" ? "bg-[#f8f9fa] border-black/5" : "bg-white/5 border-white/5")}>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <p className={cn("text-[11px] font-bold uppercase tracking-widest", theme === "light" ? "text-black/40" : "text-white/40")}>Meta Quest 3 bereit zur Kopplung</p>
                      </div>
                      <button onClick={handleStart} disabled={!username.trim()}
                        className={cn("w-full py-6 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg", theme === "light" ? "bg-black text-white" : "bg-white text-black", !username.trim() && "opacity-40 cursor-not-allowed hover:scale-100")}
                      >
                        Training starten <ChevronRight size={20} />
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
                      <h2 className="text-4xl font-bold tracking-tight mb-2">Themenbereiche</h2>
                      <p className="text-white/60 max-w-2xl">Wähle eine Kategorie, um spezifische Sicherheitsdefizite zu trainieren.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Dein aktueller Score</p>
                      <p className="text-3xl font-black text-blue-500">{score} Pkt.</p>
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
                        <h3 className="text-xl font-bold mb-2">{topic.name}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">{topic.description}</p>
                        <div className="mt-6 flex items-center gap-2 text-blue-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Szenen erkunden <ChevronRight size={16} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                  <button onClick={() => setSelectedTopic(null)} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={16} /> Zurück zur Themenübersicht
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">{selectedTopic.name}</h2>
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
                            <span className="text-xs font-bold uppercase tracking-wider">Szenario {scene.id.slice(-1)}</span>
                          </div>
                        </div>
                        <div className="p-6">
                          <p className="text-sm text-white/80 mb-6 line-clamp-2">{scene.description}</p>
                          <button onClick={() => handleSceneSelect(scene)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                            Training starten <ChevronRight size={18} />
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
                foundIds={foundDeficits}
                showHints={hintsActive}
                store={xrStore}
              />

              <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                <button onClick={() => void xrStore.enterVR()} className="bg-blue-600/80 backdrop-blur-md px-4 py-2 rounded-full border border-blue-400/40 text-xs font-bold text-white hover:bg-blue-500 transition-all flex items-center gap-2">
                  <Maximize2 size={14} /> VR starten
                </button>
                <button onClick={toggleHints} className={cn("bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-bold transition-all flex items-center gap-2", hintsActive ? "bg-orange-500 text-white border-orange-400" : "text-white/60 hover:text-white")}>
                  <ShieldAlert size={14} />
                  {hintsActive ? "Hinweise aktiv" : "Defizite einblenden (−250 Pkt.)"}
                </button>
                <button onClick={() => setView("dashboard")} className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/20 text-white hover:bg-red-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Deficit-Detail-Modal */}
              <AnimatePresence>
                {selectedDeficit && (
                  <motion.div initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}
                    className="absolute top-20 right-4 bottom-4 w-96 z-50 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                  >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><ShieldAlert size={20} /></div>
                        <h3 className="font-bold">{assessmentStep < 3 ? `RSI-Bewertung (${assessmentStep + 1}/3)` : "Analyse-Ergebnis"}</h3>
                      </div>
                      <button onClick={() => setSelectedDeficit(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
                    </div>

                    <div className="flex-1 overflow-auto p-6 space-y-6">
                      {assessmentStep < 3 ? (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-xl font-bold mb-2">
                              {assessmentStep === 0 && "Wichtigkeit (Konsequenz)"}
                              {assessmentStep === 1 && "Abweichung (Norm)"}
                              {assessmentStep === 2 && "NACA-Score (Unfallschwere)"}
                            </h4>
                            <p className="text-sm text-white/60">
                              {assessmentStep === 0 && `Wie wichtig ist dieses Merkmal ${currentScene?.locationType === "io" ? "innerorts (io)" : "ausserorts (ao)"}?`}
                              {assessmentStep === 1 && "Wie stark weicht der Ist-Zustand von der Norm/Soll-Vorgabe ab?"}
                              {assessmentStep === 2 && "Wie schwerwiegend wäre ein potenzieller Unfall an dieser Stelle?"}
                            </p>
                          </div>
                          {assessmentStep === 2 && currentAssessment.wichtigkeit && currentAssessment.abweichung && (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                              <p className="text-[10px] uppercase tracking-widest text-blue-400 mb-1">Zwischenergebnis</p>
                              <p className="font-bold">Relevanz SD: <span className="capitalize">{getRelevanzSD(currentAssessment.wichtigkeit, currentAssessment.abweichung)}</span></p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-3">
                            {(assessmentStep === 2 ? ["schwer", "mittel", "leicht"] : ["gross", "mittel", "klein"]).map((val) => (
                              <button key={val} onClick={() => submitAssessmentStep(val)}
                                className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-blue-600 hover:border-blue-500 transition-all text-left font-bold capitalize flex justify-between items-center group"
                              >
                                {val} <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <section>
                            <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3", getRatingColor(getUnfallrisiko(getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!), currentAssessment.unfallschwere!)))}>
                              Unfallrisiko: {getUnfallrisiko(getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!), currentAssessment.unfallschwere!)}
                            </div>
                            <h4 className="text-2xl font-bold mb-3">{selectedDeficit.title}</h4>
                            <p className="text-white/70 leading-relaxed">{selectedDeficit.description}</p>
                          </section>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(currentAssessment).map(([key, val]) => {
                              const isCorrect = val === (selectedDeficit.correctAssessment as Record<string, string>)[key];
                              return (
                                <div key={key} className={cn("p-2 rounded-xl border text-center", isCorrect ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                                  <p className="text-[8px] uppercase tracking-tighter opacity-60 mb-1">{key}</p>
                                  <p className="text-xs font-bold capitalize">{val as string}</p>
                                </div>
                              );
                            })}
                          </div>
                          <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2"><Info size={14} /> Fachliche Begründung</h5>
                            <p className="text-sm text-white/80 italic">"{selectedDeficit.feedback}"</p>
                          </section>
                          <section className="bg-green-500/10 rounded-2xl p-5 border border-green-500/20">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3 flex items-center gap-2"><CheckCircle2 size={14} /> Massnahmenlogik</h5>
                            <p className="text-sm text-white/80">{selectedDeficit.solution}</p>
                          </section>
                        </div>
                      )}
                    </div>
                    {assessmentStep === 3 && (
                      <div className="p-6 bg-white/5 border-t border-white/10">
                        <button onClick={() => setSelectedDeficit(null)} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors">
                          Weiter zur Exploration
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Abschluss-Overlay */}
              {foundDeficits.length === deficits.length && foundDeficits.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[100] bg-blue-600/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
                  <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 mx-auto mb-8 shadow-2xl"><Trophy size={48} /></div>
                    <h2 className="text-4xl font-bold mb-2">Training abgeschlossen!</h2>
                    <div className="text-2xl font-black mb-6 flex items-center justify-center gap-2">
                      <span className="text-white/60">Score:</span> <span>{score} Pkt.</span>
                    </div>
                    <p className="text-white/80 mb-8 leading-relaxed">Du hast alle {deficits.length} Sicherheitsdefizite erfolgreich identifiziert und bewertet.</p>
                    <button onClick={finishTraining} className="w-full py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-white/90 transition-all shadow-xl">
                      Score speichern & Ranking ansehen
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── Leaderboard ── */}
          {view === "leaderboard" && (
            <motion.div key="leaderboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-8 max-w-2xl mx-auto w-full">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-3xl font-bold flex items-center gap-3"><Trophy className="text-yellow-500" /> Globales Ranking</h2>
                <button onClick={() => setView("dashboard")} className="text-sm text-white/60 hover:text-white">Zurück zum Dashboard</button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40">Platz</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40">Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-white/40 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((entry, idx) => (
                      <tr key={idx} className={cn("border-b border-white/5 transition-colors hover:bg-white/5", entry.username === username ? "bg-blue-500/10" : "")}>
                        <td className="px-6 py-4 font-mono text-white/40">#{idx + 1}</td>
                        <td className="px-6 py-4 font-bold">{entry.username}</td>
                        <td className="px-6 py-4 text-right font-black text-blue-400">{entry.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ── Admin ── */}
          {view === "admin" && (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 max-w-7xl mx-auto w-full space-y-8 h-full overflow-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Admin-Dashboard</h2>
                  <p className="text-white/60">Verwalte Themenbereiche, Szenen und Defizit-Kataloge nach RSI-Methodik.</p>
                </div>
                <div className="flex items-center gap-3">
                  {/* Admin-Key-Eingabe */}
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <KeyRound size={14} className={adminKey ? "text-green-400" : "text-white/30"} />
                    <input
                      type="password"
                      placeholder="Admin-Key"
                      value={adminKeyInput}
                      onChange={e => setAdminKeyInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") setAdminKey(adminKeyInput); }}
                      className="bg-transparent text-xs w-32 focus:outline-none placeholder:text-white/20"
                    />
                    <button
                      onClick={() => setAdminKey(adminKeyInput)}
                      className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg transition-colors", adminKey ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40 hover:bg-white/20")}
                    >
                      {adminKey ? "Aktiv" : "Setzen"}
                    </button>
                  </div>
                  <button onClick={() => setView("onboarding")} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2">
                    <ArrowLeft size={18} /> Logout
                  </button>
                </div>
              </div>

              {!adminKey && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-sm">
                  <AlertTriangle size={18} className="shrink-0" />
                  Admin-Key nicht gesetzt — Schreibzugriffe auf die API werden abgewiesen. Key oben eingeben und «Setzen» klicken.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Themenbereiche */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Themenbereiche</h3>
                  {topics.map(t => (
                    <div key={t.id} onClick={() => handleAdminTopicSelect(t)}
                      className={cn("p-4 border rounded-2xl flex items-center justify-between group cursor-pointer transition-all", adminSelectedTopic?.id === t.id ? "bg-blue-600 border-blue-500" : "bg-black/40 border-white/10 hover:border-white/30")}
                    >
                      <div>
                        <h4 className="font-bold text-sm">{t.name}</h4>
                        <p className="text-[10px] opacity-40">{t.id}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Szenen */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Szenen</h3>
                  {!adminSelectedTopic ? (
                    <p className="text-xs text-white/20 italic">Wähle ein Thema aus...</p>
                  ) : (
                    <div className="space-y-3">
                      {scenes.map(s => (
                        <div key={s.id} onClick={() => handleAdminSceneSelect(s)}
                          className={cn("p-4 border rounded-2xl flex items-center justify-between group cursor-pointer transition-all", adminSelectedScene?.id === s.id ? "bg-blue-600 border-blue-500" : "bg-black/40 border-white/10 hover:border-white/30")}
                        >
                          <div className="flex items-center gap-3">
                            <img src={s.imageUrl} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" alt="" />
                            <div>
                              <h4 className="font-bold text-xs">Szene {s.id.slice(-1)}</h4>
                              <p className="text-[10px] opacity-40 capitalize">{s.locationType}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button className="w-full py-3 border border-dashed border-white/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                        <Plus size={12} /> Neue Szene
                      </button>
                    </div>
                  )}
                </div>

                {/* Defizite & Editor */}
                <div className="lg:col-span-2 space-y-6">
                  {!adminSelectedScene ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center border-dashed">
                      <MapPin size={32} className="mx-auto mb-4 opacity-20" />
                      <h4 className="font-bold mb-2">Szene auswählen</h4>
                      <p className="text-sm text-white/40">Wähle eine Szene aus, um Defizite zu bearbeiten.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Defizite in dieser Szene</h3>
                          <button
                            onClick={() => { setEditingDeficit({ title: "", description: "", correctAssessment: { wichtigkeit: "mittel", abweichung: "mittel", unfallschwere: "mittel" }, feedback: "", solution: "", position: [0, 0, -5], tolerance: 2 }); setIsEditingDeficit(true); }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                          >
                            + Neues Defizit
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {adminDeficits.map(d => (
                            <div key={d.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between group">
                              <div>
                                <h4 className="font-bold text-sm">{d.title}</h4>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-[8px] uppercase px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-md">{d.correctAssessment.wichtigkeit}</span>
                                  <span className="text-[8px] uppercase px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-md">{d.correctAssessment.abweichung}</span>
                                  <span className="text-[8px] uppercase px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded-md">{d.correctAssessment.unfallschwere}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setEditingDeficit(d); setIsEditingDeficit(true); }} className="p-2 hover:text-blue-400"><Settings size={14} /></button>
                                <button className="p-2 hover:text-red-400"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isEditingDeficit && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-blue-500/30 rounded-3xl p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold">Defizit-Editor (RSI-Methodik)</h3>
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
                            </div>

                            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-6">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400">RSI-Beurteilung (Ablauf)</h4>
                              <div className="space-y-4">
                                {([["1. Wichtigkeit", "wichtigkeit"], ["2. Abweichung", "abweichung"]] as [string, "wichtigkeit" | "abweichung"][]).map(([label, key]) => (
                                  <div key={key}>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">{label}</label>
                                    <div className="flex gap-2">
                                      {(["klein", "mittel", "gross"] as RSIDimension[]).map(v => (
                                        <button key={v} onClick={() => setEditingDeficit({ ...editingDeficit, correctAssessment: { ...editingDeficit.correctAssessment!, [key]: v } })}
                                          className={cn("flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all", editingDeficit.correctAssessment?.[key] === v ? "bg-blue-600 text-white" : "bg-white/5 text-white/40")}
                                        >{v}</button>
                                      ))}
                                    </div>
                                  </div>
                                ))}

                                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                  <p className="text-[8px] uppercase tracking-widest text-blue-400">Resultierende Relevanz SD</p>
                                  <p className="font-bold text-sm capitalize">{getRelevanzSD(editingDeficit.correctAssessment?.wichtigkeit ?? "mittel", editingDeficit.correctAssessment?.abweichung ?? "mittel")}</p>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">3. NACA-Score (Unfallschwere)</label>
                                  <div className="flex gap-2">
                                    {(["leicht", "mittel", "schwer"] as NACADimension[]).map(v => (
                                      <button key={v} onClick={() => setEditingDeficit({ ...editingDeficit, correctAssessment: { ...editingDeficit.correctAssessment!, unfallschwere: v } })}
                                        className={cn("flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all", editingDeficit.correctAssessment?.unfallschwere === v ? "bg-blue-600 text-white" : "bg-white/5 text-white/40")}
                                      >{v}</button>
                                    ))}
                                  </div>
                                </div>

                                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                  <p className="text-[8px] uppercase tracking-widest text-red-400">Finales Unfallrisiko</p>
                                  <p className="font-bold text-sm capitalize">{getUnfallrisiko(getRelevanzSD(editingDeficit.correctAssessment?.wichtigkeit ?? "mittel", editingDeficit.correctAssessment?.abweichung ?? "mittel"), editingDeficit.correctAssessment?.unfallschwere ?? "mittel")}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Fachliche Begründung (Feedback)</label>
                              <textarea value={editingDeficit.feedback ?? ""} onChange={e => setEditingDeficit({ ...editingDeficit, feedback: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 h-24" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Massnahmenlogik (Lösung)</label>
                              <textarea value={editingDeficit.solution ?? ""} onChange={e => setEditingDeficit({ ...editingDeficit, solution: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 h-24" />
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                            <button onClick={() => setIsEditingDeficit(false)} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold">Abbrechen</button>
                            <button onClick={saveDeficit} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold flex items-center gap-2">
                              <Save size={18} /> Defizit speichern
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
