// RSI VR Tool – FaSi Kanton Zürich
// Migriert aus Google_Voarbeiten: API-Calls ersetzt durch statische Daten + localStorage

import { useState, useEffect } from 'react'
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronRight,
  LayoutDashboard, Settings, ShieldAlert, Trophy,
  X, Info, MapPin, User, Eye, BarChart3, Sun, Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from './lib/utils'
import { TOPICS, SCENES, DEFICITS, getRankings, saveRanking } from './data/static'
import SceneViewer from './components/SceneViewer'
import type { Topic, Scene, Deficit, RankingEntry, RSIDimension, NACADimension, ResultDimension } from './types'

export default function App() {
  const [view, setView] = useState<'onboarding' | 'dashboard' | 'training' | 'admin' | 'leaderboard'>('onboarding')
  const [username, setUsername] = useState('')
  const [topics] = useState<Topic[]>(TOPICS)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [currentScene, setCurrentScene] = useState<Scene | null>(null)
  const [deficits, setDeficits] = useState<Deficit[]>([])
  const [foundDeficits, setFoundDeficits] = useState<string[]>([])
  const [selectedDeficit, setSelectedDeficit] = useState<Deficit | null>(null)
  const [assessmentStep, setAssessmentStep] = useState<number>(0)
  const [currentAssessment, setCurrentAssessment] = useState<{
    wichtigkeit?: RSIDimension
    abweichung?: RSIDimension
    unfallschwere?: NACADimension
  }>({})
  const [score, setScore] = useState(0)
  const [hintsActive, setHintsActive] = useState(false)
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [adminSelectedTopic, setAdminSelectedTopic] = useState<Topic | null>(null)
  const [adminSelectedScene, setAdminSelectedScene] = useState<Scene | null>(null)
  const [adminDeficits, setAdminDeficits] = useState<Deficit[]>([])

  // Gespeicherten Namen laden
  useEffect(() => {
    const saved = localStorage.getItem('rsi-username')
    if (saved) setUsername(saved)
    setRankings(getRankings())
  }, [])

  // ── Thema auswählen → Szenen laden ──
  const handleAdminTopicSelect = (topic: Topic) => {
    setAdminSelectedTopic(topic)
    setScenes(SCENES.filter(s => s.topicId === topic.id))
  }

  // ── Admin: Szene auswählen → Defizite laden ──
  const handleAdminSceneSelect = (scene: Scene) => {
    setAdminSelectedScene(scene)
    setAdminDeficits(DEFICITS.filter(d => d.sceneId === scene.id))
  }

  // ── Login ──
  const handleStart = () => {
    if (username.trim()) {
      localStorage.setItem('rsi-username', username.trim())
      setView('dashboard')
    }
  }

  // ── Dashboard: Thema wählen ──
  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic)
    setScenes(SCENES.filter(s => s.topicId === topic.id))
  }

  // ── Dashboard: Szene starten ──
  const handleSceneSelect = (scene: Scene) => {
    setCurrentScene(scene)
    setFoundDeficits([])
    setScore(0)
    setHintsActive(false)
    setDeficits(DEFICITS.filter(d => d.sceneId === scene.id))
    setView('training')
  }

  // ── Training: Hinweise ein/aus ──
  const toggleHints = () => {
    if (!hintsActive) setScore(prev => Math.max(0, prev - 250))
    setHintsActive(prev => !prev)
  }

  // ── Training: Defizit gefunden ──
  const handleDeficitFound = (deficit: Deficit) => {
    if (!foundDeficits.includes(deficit.id)) {
      setSelectedDeficit(deficit)
      setAssessmentStep(0)
      setCurrentAssessment({})
    } else {
      setSelectedDeficit(deficit)
      setAssessmentStep(3)
    }
  }

  // ── Training: Bewertungsschritt ──
  const submitAssessmentStep = (value: RSIDimension | NACADimension) => {
    const steps: Array<'wichtigkeit' | 'abweichung' | 'unfallschwere'> = ['wichtigkeit', 'abweichung', 'unfallschwere']
    const key = steps[assessmentStep]
    const newAssessment = { ...currentAssessment, [key]: value }
    setCurrentAssessment(newAssessment)

    if (assessmentStep < 2) {
      setAssessmentStep(prev => prev + 1)
    } else {
      calculatePoints(newAssessment)
      setAssessmentStep(3)
      setFoundDeficits(prev => [...prev, selectedDeficit!.id])
    }
  }

  // ── Punkte berechnen ──
  const calculatePoints = (assessment: typeof currentAssessment) => {
    if (!selectedDeficit) return
    let points = 100
    const correct = selectedDeficit.correctAssessment
    if (assessment.wichtigkeit === correct.wichtigkeit) points += 50
    if (assessment.abweichung === correct.abweichung) points += 50
    if (assessment.unfallschwere === correct.unfallschwere) points += 50
    if (
      assessment.wichtigkeit === correct.wichtigkeit &&
      assessment.abweichung === correct.abweichung &&
      assessment.unfallschwere === correct.unfallschwere
    ) points += 100
    setScore(prev => prev + points)
  }

  // ── Training abschliessen ──
  const finishTraining = () => {
    saveRanking(username, score)
    setRankings(getRankings())
    setView('leaderboard')
  }

  // ── Berechnungen für RSI-Methodik ──
  const getRelevanzSD = (w: RSIDimension, a: RSIDimension): ResultDimension => {
    if (w === 'gross') {
      if (a === 'gross') return 'hoch'
      if (a === 'mittel') return 'mittel'
      return 'gering'
    }
    if (w === 'mittel') {
      if (a === 'gross') return 'hoch'
      if (a === 'mittel') return 'mittel'
      return 'gering'
    }
    if (a === 'gross') return 'mittel'
    return 'gering'
  }

  const getUnfallrisiko = (rel: ResultDimension, s: NACADimension): ResultDimension => {
    if (rel === 'hoch') {
      if (s === 'schwer') return 'hoch'
      if (s === 'mittel') return 'hoch'
      return 'mittel'
    }
    if (rel === 'mittel') {
      if (s === 'schwer') return 'hoch'
      if (s === 'mittel') return 'mittel'
      return 'gering'
    }
    if (s === 'schwer') return 'mittel'
    return 'gering'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'gering': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'mittel': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'hoch': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className={cn(
      'h-screen w-full font-sans overflow-hidden flex flex-col transition-colors duration-700',
      view === 'onboarding' ? 'bg-[#fdfdfd] text-[#1a1a1a]' : 'bg-[#0a0a0a] text-white'
    )}>

      {/* ── Header ── */}
      <header className={cn(
        'h-20 flex items-center justify-between px-10 z-50 transition-all duration-700',
        view === 'onboarding' ? 'bg-transparent' : 'bg-black/40 backdrop-blur-xl border-b border-white/10'
      )}>
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-700',
              view === 'onboarding' ? 'bg-black text-white' : 'bg-[#003C71] text-white'
            )}
          >
            <ShieldAlert size={20} />
          </motion.div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">RSI-Immersive</h1>
            <p className={cn(
              'text-[9px] uppercase tracking-[0.2em] font-bold transition-colors duration-700',
              view === 'onboarding' ? 'text-black/40' : 'text-[#6699CC]'
            )}>
              Fachstelle Verkehrssicherheit · Kanton Zürich
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {view === 'onboarding' && (
            <button
              onClick={() => setView('admin')}
              className="text-[11px] uppercase tracking-widest font-bold text-black/40 hover:text-black transition-colors flex items-center gap-2"
            >
              <Settings size={14} /> Admin Access
            </button>
          )}

          {view !== 'onboarding' && (
            <div className="flex items-center gap-6">
              {username && (
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <User size={14} className="text-white/40" />
                  <span className="text-xs font-medium">{username}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[#003C71]/20 border border-[#003C71]/40 rounded-full">
                <Trophy size={14} className="text-[#6699CC]" />
                <span className="text-sm font-bold text-[#6699CC]">{score} Pkt.</span>
              </div>
              <nav className="flex items-center gap-4 border-l border-white/10 pl-6">
                <button
                  onClick={() => setView('dashboard')}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-[#6699CC]',
                    view === 'dashboard' ? 'text-[#6699CC]' : 'text-white/60'
                  )}
                >
                  <LayoutDashboard size={18} /> Dashboard
                </button>
                <button
                  onClick={() => setView('leaderboard')}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-[#6699CC]',
                    view === 'leaderboard' ? 'text-[#6699CC]' : 'text-white/60'
                  )}
                >
                  <BarChart3 size={18} /> Ranking
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-[#6699CC]',
                    view === 'admin' ? 'text-[#6699CC]' : 'text-white/60'
                  )}
                >
                  <Settings size={18} /> Admin
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 relative overflow-auto">
        <AnimatePresence mode="wait">

          {/* ══ ONBOARDING ══ */}
          {view === 'onboarding' && (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full relative flex items-center justify-center overflow-hidden"
            >
              <div className="max-w-6xl w-full px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center z-10">
                <div className="space-y-12">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-[72px] font-bold tracking-[-0.04em] leading-[0.9] mb-8">
                      Präzision. <br />
                      <span className={cn(
                        'italic font-serif transition-colors duration-700',
                        theme === 'light' ? 'text-black/20' : 'text-black/20'
                      )}>Sicherheit.</span> <br />
                      Immersion.
                    </h2>
                    <p className="text-xl max-w-md leading-relaxed font-medium text-black/50">
                      Entwickeln Sie den geschulten Blick für das Wesentliche. Road Safety Inspection – immersiv.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-6"
                  >
                    {[{ icon: Eye, label: 'Exploration' }, { icon: BarChart3, label: 'Analyse' }].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-6 group cursor-default">
                        <div className="w-12 h-12 rounded-full border border-black/5 flex items-center justify-center transition-all duration-500 group-hover:bg-black group-hover:text-white">
                          <Icon size={20} />
                        </div>
                        <span className="text-sm font-bold tracking-widest uppercase text-black/40 group-hover:text-black transition-colors duration-700">
                          {label}
                        </span>
                      </div>
                    ))}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="pt-10 border-t border-black/5"
                  >
                    <button
                      onClick={() => setView('admin')}
                      className="group flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-black/20 hover:text-black transition-all"
                    >
                      <Settings size={14} className="group-hover:rotate-90 transition-transform duration-500" />
                      System-Administration
                    </button>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="border rounded-[40px] p-12 bg-white border-black/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)]"
                >
                  <div className="space-y-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Willkommen.</h3>
                        <p className="text-sm text-black/40">Identifizieren Sie sich für das Ranking.</p>
                      </div>
                      <button
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/5 bg-black/5 text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-500"
                      >
                        {theme === 'light' ? <Moon size={12} /> : <Sun size={12} />}
                        {theme === 'light' ? 'Dark' : 'Light'}
                      </button>
                    </div>

                    <div className="space-y-6">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        placeholder="Ihr Name"
                        className="w-full bg-transparent border-b-2 border-black/5 focus:border-black py-4 text-xl font-bold focus:outline-none transition-colors placeholder:text-black/10"
                      />

                      <div className="flex items-center gap-4 py-4 px-6 rounded-2xl border bg-[#f8f9fa] border-black/5">
                        <div className="w-2 h-2 bg-[#003C71] rounded-full animate-pulse" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-black/40">
                          Meta Quest 3 bereit zur Kopplung
                        </p>
                      </div>

                      <button
                        onClick={handleStart}
                        disabled={!username.trim()}
                        className="w-full py-6 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-lg bg-black text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        Training starten <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ══ DASHBOARD ══ */}
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 max-w-7xl mx-auto w-full"
            >
              {!selectedTopic ? (
                <>
                  <div className="mb-12 flex items-end justify-between">
                    <div>
                      <h2 className="text-4xl font-bold tracking-tight mb-2">Themenbereiche</h2>
                      <p className="text-white/60 max-w-2xl">Wähle eine Kategorie, um spezifische Sicherheitsdefizite zu trainieren.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Dein aktueller Score</p>
                      <p className="text-3xl font-black text-[#6699CC]">{score} Pkt.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {topics.map(topic => (
                      <motion.div
                        key={topic.id}
                        whileHover={{ scale: 1.02, translateY: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTopicSelect(topic)}
                        className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer overflow-hidden transition-all hover:bg-white/10 hover:border-[#003C71]/50"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <BookOpen size={80} />
                        </div>
                        <div className="w-12 h-12 bg-[#003C71]/20 rounded-xl flex items-center justify-center text-[#6699CC] mb-6 group-hover:bg-[#003C71] group-hover:text-white transition-colors">
                          <ShieldAlert size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{topic.name}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">{topic.description}</p>
                        <div className="mt-6 flex items-center gap-2 text-[#6699CC] text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Szenen erkunden <ChevronRight size={16} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-8">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={16} /> Zurück zur Themenübersicht
                  </button>

                  <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">{selectedTopic.name}</h2>
                    <p className="text-white/60">{selectedTopic.description}</p>
                  </div>

                  {scenes.length === 0 ? (
                    <p className="text-white/40 italic">Noch keine Szenen für dieses Thema vorhanden.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {scenes.map((scene, idx) => (
                        <div
                          key={scene.id}
                          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-[#003C71]/50 transition-all"
                        >
                          <div className="h-48 overflow-hidden relative bg-[#1a2a3a]">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                            <div className="absolute bottom-4 left-4 flex items-center gap-2">
                              <MapPin size={14} className="text-[#6699CC]" />
                              <span className="text-xs font-bold uppercase tracking-wider">Szenario {idx + 1}</span>
                            </div>
                          </div>
                          <div className="p-6">
                            <p className="text-sm text-white/80 mb-6 line-clamp-2">{scene.description}</p>
                            <button
                              onClick={() => handleSceneSelect(scene)}
                              className="w-full py-3 bg-[#003C71] hover:bg-[#005299] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                              Training starten <ChevronRight size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ TRAINING ══ */}
          {view === 'training' && currentScene && (
            <motion.div
              key="training"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full relative"
            >
              <SceneViewer
                sceneUrl={currentScene.imageUrl}
                deficits={deficits}
                onDeficitFound={handleDeficitFound}
                foundIds={foundDeficits}
                showHints={hintsActive}
              />

              <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                <button
                  onClick={toggleHints}
                  className={cn(
                    'bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-bold transition-all flex items-center gap-2',
                    hintsActive ? 'bg-orange-500 text-white border-orange-400' : 'text-white/60 hover:text-white'
                  )}
                >
                  <ShieldAlert size={14} />
                  {hintsActive ? 'Hinweise aktiv' : 'Defizite einblenden (−250 Pkt.)'}
                </button>
                <button
                  onClick={() => setView('dashboard')}
                  className="bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/20 text-white hover:bg-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Deficit-Bewertungs-Panel */}
              <AnimatePresence>
                {selectedDeficit && (
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="absolute top-20 right-4 bottom-4 w-96 z-50 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
                  >
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#003C71]/20 rounded-xl flex items-center justify-center text-[#6699CC]">
                          <ShieldAlert size={20} />
                        </div>
                        <h3 className="font-bold">
                          {assessmentStep < 3 ? `RSI-Bewertung (${assessmentStep + 1}/3)` : 'Analyse-Ergebnis'}
                        </h3>
                      </div>
                      <button onClick={() => setSelectedDeficit(null)} className="text-white/40 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-auto p-6 space-y-6">
                      {assessmentStep < 3 ? (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-xl font-bold mb-2">
                              {assessmentStep === 0 && 'Wichtigkeit (Konsequenz)'}
                              {assessmentStep === 1 && 'Abweichung (Norm)'}
                              {assessmentStep === 2 && 'NACA-Score (Unfallschwere)'}
                            </h4>
                            <p className="text-sm text-white/60">
                              {assessmentStep === 0 && `Wie wichtig ist dieses Merkmal ${currentScene.locationType === 'io' ? 'innerorts (io)' : 'ausserorts (ao)'}?`}
                              {assessmentStep === 1 && 'Wie stark weicht der Ist-Zustand von der Norm ab?'}
                              {assessmentStep === 2 && 'Wie schwerwiegend wäre ein potenzieller Unfall?'}
                            </p>
                          </div>

                          {assessmentStep === 2 && currentAssessment.wichtigkeit && currentAssessment.abweichung && (
                            <div className="p-4 bg-[#003C71]/10 border border-[#003C71]/20 rounded-2xl">
                              <p className="text-[10px] uppercase tracking-widest text-[#6699CC] mb-1">Zwischenergebnis</p>
                              <p className="font-bold">
                                Relevanz SD: <span className="capitalize">{getRelevanzSD(currentAssessment.wichtigkeit, currentAssessment.abweichung)}</span>
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-3">
                            {(assessmentStep === 2
                              ? ['schwer', 'mittel', 'leicht'] as NACADimension[]
                              : ['gross', 'mittel', 'klein'] as RSIDimension[]
                            ).map((val) => (
                              <button
                                key={val}
                                onClick={() => submitAssessmentStep(val)}
                                className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#003C71] hover:border-[#003C71] transition-all text-left font-bold capitalize flex justify-between items-center group"
                              >
                                {val}
                                <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <section>
                            <div className={cn(
                              'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3',
                              getRatingColor(getUnfallrisiko(
                                getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!),
                                currentAssessment.unfallschwere!
                              ))
                            )}>
                              Unfallrisiko: {getUnfallrisiko(
                                getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!),
                                currentAssessment.unfallschwere!
                              )}
                            </div>
                            <h4 className="text-2xl font-bold mb-3">{selectedDeficit.title}</h4>
                            <p className="text-white/70 leading-relaxed">{selectedDeficit.description}</p>
                          </section>

                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(currentAssessment).map(([key, val]) => {
                              const isCorrect = val === (selectedDeficit.correctAssessment as Record<string, string>)[key]
                              return (
                                <div key={key} className={cn(
                                  'p-2 rounded-xl border text-center',
                                  isCorrect
                                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                                )}>
                                  <p className="text-[8px] uppercase tracking-tighter opacity-60 mb-1">{key}</p>
                                  <p className="text-xs font-bold capitalize">{val}</p>
                                </div>
                              )
                            })}
                          </div>

                          <section className="bg-white/5 rounded-2xl p-5 border border-white/5">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-[#6699CC] mb-3 flex items-center gap-2">
                              <Info size={14} /> Fachliche Begründung
                            </h5>
                            <p className="text-sm text-white/80 italic">"{selectedDeficit.feedback}"</p>
                          </section>

                          <section className="bg-green-500/10 rounded-2xl p-5 border border-green-500/20">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-3 flex items-center gap-2">
                              <CheckCircle2 size={14} /> Massnahmenlogik
                            </h5>
                            <p className="text-sm text-white/80">{selectedDeficit.solution}</p>
                          </section>
                        </div>
                      )}
                    </div>

                    {assessmentStep === 3 && (
                      <div className="p-6 bg-white/5 border-t border-white/10">
                        <button
                          onClick={() => setSelectedDeficit(null)}
                          className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
                        >
                          Weiter zur Exploration
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Abschluss-Overlay */}
              {foundDeficits.length === deficits.length && deficits.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-[100] bg-[#003C71]/90 backdrop-blur-md flex items-center justify-center p-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="max-w-md"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#003C71] mx-auto mb-8 shadow-2xl">
                      <Trophy size={48} />
                    </div>
                    <h2 className="text-4xl font-bold mb-2">Training abgeschlossen!</h2>
                    <div className="text-2xl font-black mb-6 flex items-center justify-center gap-2">
                      <span className="text-white/60">Score:</span>
                      <span>{score} Pkt.</span>
                    </div>
                    <p className="text-white/80 mb-8 leading-relaxed">
                      Du hast alle {deficits.length} Sicherheitsdefizite erfolgreich identifiziert und bewertet.
                    </p>
                    <button
                      onClick={finishTraining}
                      className="w-full py-4 bg-white text-[#003C71] font-bold rounded-2xl hover:bg-white/90 transition-all shadow-xl"
                    >
                      Score speichern & Ranking ansehen
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══ LEADERBOARD ══ */}
          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 max-w-2xl mx-auto w-full"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                  <Trophy className="text-yellow-500" /> Globales Ranking
                </h2>
                <button
                  onClick={() => setView('dashboard')}
                  className="text-sm text-white/60 hover:text-white"
                >
                  Zurück zum Dashboard
                </button>
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
                      <tr key={idx} className={cn(
                        'border-b border-white/5 transition-colors hover:bg-white/5',
                        entry.username === username ? 'bg-[#003C71]/10' : ''
                      )}>
                        <td className="px-6 py-4 font-mono text-white/40">#{idx + 1}</td>
                        <td className="px-6 py-4 font-bold">{entry.username}</td>
                        <td className="px-6 py-4 text-right font-black text-[#6699CC]">{entry.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ══ ADMIN ══ */}
          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 max-w-7xl mx-auto w-full space-y-8 h-full overflow-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Admin-Dashboard</h2>
                  <p className="text-white/60">Übersicht Themenbereiche, Szenen und Defizit-Kataloge nach RSI-Methodik.</p>
                </div>
                <button
                  onClick={() => setView('onboarding')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <ArrowLeft size={18} /> Abmelden
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Themenbereiche */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Themenbereiche</h3>
                  {topics.map(t => (
                    <div
                      key={t.id}
                      onClick={() => handleAdminTopicSelect(t)}
                      className={cn(
                        'p-4 border rounded-2xl flex items-center justify-between cursor-pointer transition-all',
                        adminSelectedTopic?.id === t.id
                          ? 'bg-[#003C71] border-[#003C71]'
                          : 'bg-black/40 border-white/10 hover:border-white/30'
                      )}
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
                      {SCENES.filter(s => s.topicId === adminSelectedTopic.id).map(s => (
                        <div
                          key={s.id}
                          onClick={() => handleAdminSceneSelect(s)}
                          className={cn(
                            'p-4 border rounded-2xl cursor-pointer transition-all',
                            adminSelectedScene?.id === s.id
                              ? 'bg-[#003C71] border-[#003C71]'
                              : 'bg-black/40 border-white/10 hover:border-white/30'
                          )}
                        >
                          <h4 className="font-bold text-xs">{s.description}</h4>
                          <p className="text-[10px] opacity-40 capitalize">{s.locationType === 'io' ? 'Innerorts' : 'Ausserorts'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Defizite */}
                <div className="lg:col-span-2 space-y-6">
                  {!adminSelectedScene ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center border-dashed">
                      <MapPin size={32} className="mx-auto mb-4 opacity-20" />
                      <h4 className="font-bold mb-2">Szene auswählen</h4>
                      <p className="text-sm text-white/40">Wähle eine Szene aus, um Defizite zu sehen.</p>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">
                        Defizite in dieser Szene ({adminDeficits.length})
                      </h3>
                      <div className="space-y-4">
                        {adminDeficits.length === 0 ? (
                          <p className="text-xs text-white/20 italic">Keine Defizite für diese Szene definiert.</p>
                        ) : (
                          adminDeficits.map(d => (
                            <div key={d.id} className="p-4 bg-black/40 border border-white/10 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm">{d.title}</h4>
                                <div className="flex gap-1">
                                  <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-full capitalize">{d.correctAssessment.wichtigkeit}</span>
                                  <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-full capitalize">{d.correctAssessment.abweichung}</span>
                                  <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-full capitalize">{d.correctAssessment.unfallschwere}</span>
                                </div>
                              </div>
                              <p className="text-xs text-white/50 line-clamp-2">{d.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}
