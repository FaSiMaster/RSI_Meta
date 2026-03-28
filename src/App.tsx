// RSI VR Tool – FaSi Kanton Zürich
// ZH Design-System (FaSi_VIZ) + i18n DE/FR/IT/EN + Dark Mode

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, BookOpen, CheckCircle2, ChevronRight,
  LayoutDashboard, Settings, ShieldAlert, Trophy,
  X, Info, MapPin, User, Eye, BarChart3, Sun, Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from './lib/utils'
import { TOPICS, SCENES, DEFICITS, getRankings, saveRanking } from './data/static'
import SceneViewer from './components/SceneViewer'
import LanguageSwitcher from './components/LanguageSwitcher'
import type { Topic, Scene, Deficit, RankingEntry, RSIDimension, NACADimension, ResultDimension } from './types'

export default function App() {
  const { t } = useTranslation()

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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('rsi-theme') as 'light' | 'dark') ?? 'dark'
  })
  const [adminSelectedTopic, setAdminSelectedTopic] = useState<Topic | null>(null)
  const [adminSelectedScene, setAdminSelectedScene] = useState<Scene | null>(null)
  const [adminDeficits, setAdminDeficits] = useState<Deficit[]>([])

  // Theme auf html setzen
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('rsi-theme', theme)
  }, [theme])

  // Gespeicherten Namen laden
  useEffect(() => {
    const saved = localStorage.getItem('rsi-username')
    if (saved) setUsername(saved)
    setRankings(getRankings())
  }, [])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  // ── Admin: Thema auswählen ──
  const handleAdminTopicSelect = (topic: Topic) => {
    setAdminSelectedTopic(topic)
    setScenes(SCENES.filter(s => s.topicId === topic.id))
  }

  // ── Admin: Szene auswählen ──
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

  // ── Bewertungsschritt ──
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

  // ── RSI-Methodik ──
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
      case 'gering': return 'text-[var(--zh-blau)] border-[var(--zh-blau)]/40 bg-[var(--zh-blau)]/10'
      case 'mittel': return 'text-[var(--zh-orange)] border-[var(--zh-orange)]/40 bg-[var(--zh-orange)]/10'
      case 'hoch':   return 'text-[var(--zh-rot)] border-[var(--zh-rot)]/40 bg-[var(--zh-rot)]/10'
      default:       return 'text-[var(--zh-color-text-muted)] border-[var(--zh-color-border)] bg-[var(--zh-color-bg-tertiary)]'
    }
  }

  const isDark = theme === 'dark'

  return (
    <div
      className="h-screen w-full overflow-hidden flex flex-col"
      style={{
        background: 'var(--zh-color-bg)',
        color: 'var(--zh-color-text)',
        fontFamily: 'var(--zh-font)',
      }}
    >
      {/* ── Navbar ── */}
      <header
        className="flex items-center justify-between px-8 z-50 shrink-0"
        style={{
          height: 'var(--zh-navbar-h)',
          borderBottom: '1px solid var(--zh-color-border)',
          background: isDark ? 'rgba(0,0,0,0.6)' : 'var(--zh-color-bg)',
          backdropFilter: isDark ? 'blur(16px)' : 'none',
        }}
      >
        {/* Logo + Titel */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: 'var(--zh-dunkelblau)' }}
          >
            <ShieldAlert size={16} />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight leading-none">RSI-Immersive</span>
            <p
              className="text-[9px] uppercase tracking-[0.18em] font-bold leading-none mt-0.5"
              style={{ color: 'var(--zh-color-text-muted)' }}
            >
              Fachstelle Verkehrssicherheit · Kanton Zürich
            </p>
          </div>
        </div>

        {/* Rechte Seite */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />

          {/* Theme-Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-bg-secondary)',
              color: 'var(--zh-color-text-muted)',
            }}
            title={isDark ? t('onboarding.lightMode') : t('onboarding.darkMode')}
          >
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {view === 'onboarding' && (
            <button
              onClick={() => setView('admin')}
              className="text-[11px] uppercase tracking-widest font-bold transition-colors flex items-center gap-1.5"
              style={{ color: 'var(--zh-color-text-muted)' }}
            >
              <Settings size={13} /> {t('nav.adminAccess')}
            </button>
          )}

          {view !== 'onboarding' && (
            <div className="flex items-center gap-4">
              {username && (
                <div
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    border: '1px solid var(--zh-color-border)',
                    background: 'var(--zh-color-bg-secondary)',
                    color: 'var(--zh-color-text-secondary)',
                  }}
                >
                  <User size={12} style={{ color: 'var(--zh-color-text-muted)' }} />
                  {username}
                </div>
              )}
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  border: '1px solid var(--zh-color-accent)',
                  background: isDark ? 'rgba(122,182,226,0.1)' : 'rgba(0,118,189,0.08)',
                  color: 'var(--zh-color-accent)',
                }}
              >
                <Trophy size={13} />
                {score} {t('score.points')}
              </div>
              <nav className="flex items-center gap-1 pl-4" style={{ borderLeft: '1px solid var(--zh-color-border)' }}>
                {[
                  { key: 'dashboard' as const, icon: LayoutDashboard, label: t('nav.dashboard') },
                  { key: 'leaderboard' as const, icon: BarChart3, label: t('nav.ranking') },
                  { key: 'admin' as const, icon: Settings, label: t('nav.admin') },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      background: view === key ? 'var(--zh-color-bg-tertiary)' : 'transparent',
                      color: view === key ? 'var(--zh-color-accent)' : 'var(--zh-color-text-muted)',
                    }}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
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
              className="h-full flex items-center justify-center overflow-hidden"
              style={{ padding: '0 var(--zh-padding-page)' }}
            >
              <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                {/* Links */}
                <div className="space-y-12">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <h2
                      className="font-bold tracking-[-0.04em] leading-[0.9] mb-6"
                      style={{ fontSize: 'clamp(48px,7vw,72px)', color: 'var(--zh-color-text)' }}
                    >
                      {t('onboarding.headline1')} <br />
                      <span style={{ color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
                        {t('onboarding.headline2')}
                      </span> <br />
                      {t('onboarding.headline3')}
                    </h2>
                    <p className="text-xl max-w-md leading-relaxed font-medium" style={{ color: 'var(--zh-color-text-muted)' }}>
                      {t('onboarding.subtitle')}
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col gap-5"
                  >
                    {[
                      { icon: Eye, label: t('onboarding.exploration') },
                      { icon: BarChart3, label: t('onboarding.analysis') },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-5 group cursor-default">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group-hover:text-white"
                          style={{
                            border: '1px solid var(--zh-color-border)',
                            color: 'var(--zh-color-text-muted)',
                          }}
                        >
                          <Icon size={18} />
                        </div>
                        <span
                          className="text-sm font-bold tracking-widest uppercase transition-colors duration-300 group-hover:text-[var(--zh-color-text)]"
                          style={{ color: 'var(--zh-color-text-muted)' }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="pt-8"
                    style={{ borderTop: '1px solid var(--zh-color-border)' }}
                  >
                    <button
                      onClick={() => setView('admin')}
                      className="group flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors"
                      style={{ color: 'var(--zh-color-text-disabled)' }}
                    >
                      <Settings size={13} className="group-hover:rotate-90 transition-transform duration-500" />
                      {t('onboarding.systemAdmin')}
                    </button>
                  </motion.div>
                </div>

                {/* Login-Card */}
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="p-10"
                  style={{
                    borderRadius: '24px',
                    border: '1px solid var(--zh-color-border)',
                    background: 'var(--zh-color-surface)',
                    boxShadow: 'var(--zh-shadow-lg)',
                  }}
                >
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-2xl font-bold mb-1" style={{ color: 'var(--zh-color-text)' }}>
                        {t('onboarding.welcome')}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--zh-color-text-muted)' }}>
                        {t('onboarding.identifyRanking')}
                      </p>
                    </div>

                    <div className="space-y-5">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                        placeholder={t('onboarding.namePlaceholder')}
                        className="w-full bg-transparent py-3 text-xl font-bold focus:outline-none transition-colors"
                        style={{
                          borderBottom: '2px solid var(--zh-color-border)',
                          color: 'var(--zh-color-text)',
                          caretColor: 'var(--zh-color-accent)',
                        }}
                      />

                      <div
                        className="flex items-center gap-3 px-5 py-3 rounded-xl"
                        style={{
                          background: 'var(--zh-color-bg-secondary)',
                          border: '1px solid var(--zh-color-border)',
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full animate-pulse"
                          style={{ background: 'var(--zh-gruen)' }}
                        />
                        <p
                          className="text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--zh-color-text-muted)' }}
                        >
                          {t('onboarding.questReady')}
                        </p>
                      </div>

                      <button
                        onClick={handleStart}
                        disabled={!username.trim()}
                        className="w-full py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ background: 'var(--zh-dunkelblau)', borderRadius: 'var(--zh-radius-btn)' }}
                      >
                        {t('onboarding.startTraining')} <ChevronRight size={20} />
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
              className="max-w-7xl mx-auto w-full"
              style={{ padding: 'var(--zh-padding-page)' }}
            >
              {!selectedTopic ? (
                <>
                  <div className="mb-10 flex items-end justify-between">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight mb-1">{t('dashboard.topics')}</h2>
                      <p style={{ color: 'var(--zh-color-text-muted)' }}>{t('dashboard.selectCategory')}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-xs font-bold uppercase tracking-widest mb-1"
                        style={{ color: 'var(--zh-color-text-muted)' }}
                      >
                        {t('dashboard.currentScore')}
                      </p>
                      <p className="text-3xl font-black" style={{ color: 'var(--zh-color-accent)' }}>
                        {score} {t('score.points')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {topics.map(topic => (
                      <motion.div
                        key={topic.id}
                        whileHover={{ scale: 1.02, translateY: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTopicSelect(topic)}
                        className="group relative cursor-pointer overflow-hidden transition-all p-6"
                        style={{
                          borderRadius: 'var(--zh-radius-card)',
                          border: '1px solid var(--zh-color-border)',
                          background: 'var(--zh-color-surface)',
                          boxShadow: 'var(--zh-shadow-sm)',
                        }}
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <BookOpen size={80} />
                        </div>
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-colors group-hover:text-white"
                          style={{
                            background: isDark ? 'rgba(122,182,226,0.12)' : 'rgba(0,118,189,0.08)',
                            color: 'var(--zh-color-accent)',
                          }}
                        >
                          <ShieldAlert size={22} />
                        </div>
                        <h3 className="text-lg font-bold mb-1.5">{topic.name}</h3>
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: 'var(--zh-color-text-muted)' }}
                        >
                          {topic.description}
                        </p>
                        <div
                          className="mt-5 flex items-center gap-1.5 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: 'var(--zh-color-accent)' }}
                        >
                          {t('dashboard.exploreSzenen')} <ChevronRight size={15} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-7">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{ color: 'var(--zh-color-text-muted)' }}
                  >
                    <ArrowLeft size={15} /> {t('dashboard.backToTopics')}
                  </button>

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">{selectedTopic.name}</h2>
                    <p style={{ color: 'var(--zh-color-text-muted)' }}>{selectedTopic.description}</p>
                  </div>

                  {scenes.length === 0 ? (
                    <p className="italic" style={{ color: 'var(--zh-color-text-disabled)' }}>
                      {t('dashboard.noScenes')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {scenes.map((scene, idx) => (
                        <div
                          key={scene.id}
                          className="overflow-hidden transition-all"
                          style={{
                            borderRadius: 'var(--zh-radius-card)',
                            border: '1px solid var(--zh-color-border)',
                            background: 'var(--zh-color-surface)',
                            boxShadow: 'var(--zh-shadow-sm)',
                          }}
                        >
                          <div className="h-44 overflow-hidden relative" style={{ background: 'var(--zh-color-bg-tertiary)' }}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-3 left-4 flex items-center gap-2">
                              <MapPin size={13} style={{ color: 'var(--zh-color-accent)' }} />
                              <span
                                className="text-xs font-bold uppercase tracking-wider text-white"
                              >
                                {t('dashboard.scenario')} {idx + 1}
                              </span>
                            </div>
                          </div>
                          <div className="p-5">
                            <p
                              className="text-sm mb-5 line-clamp-2"
                              style={{ color: 'var(--zh-color-text-secondary)' }}
                            >
                              {scene.description}
                            </p>
                            <button
                              onClick={() => handleSceneSelect(scene)}
                              className="w-full py-2.5 font-bold text-sm transition-colors flex items-center justify-center gap-2 text-white"
                              style={{
                                background: 'var(--zh-dunkelblau)',
                                borderRadius: 'var(--zh-radius-btn)',
                              }}
                            >
                              {t('dashboard.startTraining')} <ChevronRight size={16} />
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

              {/* Oben rechts: Hints + Exit */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button
                  onClick={toggleHints}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2',
                    hintsActive
                      ? 'text-white'
                      : 'text-white/60 hover:text-white'
                  )}
                  style={{
                    background: hintsActive
                      ? 'var(--zh-orange)'
                      : 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <ShieldAlert size={13} />
                  {hintsActive ? t('training.hintsActive') : t('training.showHints')}
                </button>
                <button
                  onClick={() => setView('dashboard')}
                  className="p-2 rounded-full text-white hover:text-white transition-colors"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Defizit-Bewertungs-Panel */}
              <AnimatePresence>
                {selectedDeficit && (
                  <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    className="absolute top-16 right-4 bottom-4 w-96 z-50 flex flex-col overflow-hidden"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(24px)',
                      boxShadow: 'var(--zh-shadow-lg)',
                    }}
                  >
                    {/* Panel-Header */}
                    <div
                      className="p-5 flex items-center justify-between shrink-0"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{
                            background: isDark ? 'rgba(122,182,226,0.15)' : 'rgba(0,64,124,0.1)',
                            color: 'var(--zh-color-accent)',
                          }}
                        >
                          <ShieldAlert size={18} />
                        </div>
                        <h3 className="font-bold text-sm">
                          {assessmentStep < 3
                            ? t('assessment.title', { step: assessmentStep + 1 })
                            : t('assessment.result')}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedDeficit(null)}
                        style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
                        className="hover:opacity-100 transition-opacity"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Panel-Inhalt */}
                    <div className="flex-1 overflow-auto p-5 space-y-5">
                      {assessmentStep < 3 ? (
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-lg font-bold mb-1">
                              {assessmentStep === 0 && t('assessment.wichtigkeit')}
                              {assessmentStep === 1 && t('assessment.abweichung')}
                              {assessmentStep === 2 && t('assessment.nacaScore')}
                            </h4>
                            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                              {assessmentStep === 0 && (
                                currentScene.locationType === 'io'
                                  ? t('assessment.wichtigkeitHint_io')
                                  : t('assessment.wichtigkeitHint_ao')
                              )}
                              {assessmentStep === 1 && t('assessment.abweichungHint')}
                              {assessmentStep === 2 && t('assessment.nacaHint')}
                            </p>
                          </div>

                          {assessmentStep === 2 && currentAssessment.wichtigkeit && currentAssessment.abweichung && (
                            <div
                              className="p-4 rounded-xl"
                              style={{
                                background: isDark ? 'rgba(122,182,226,0.1)' : 'rgba(0,118,189,0.06)',
                                border: '1px solid rgba(0,118,189,0.2)',
                              }}
                            >
                              <p
                                className="text-[10px] uppercase tracking-widest mb-1"
                                style={{ color: 'var(--zh-color-accent)' }}
                              >
                                {t('assessment.zwischenergebnis')}
                              </p>
                              <p className="font-bold text-sm">
                                {t('assessment.relevanzSD')}:{' '}
                                <span className="capitalize">
                                  {t(`result.${getRelevanzSD(currentAssessment.wichtigkeit, currentAssessment.abweichung)}` as `result.${string}`)}
                                </span>
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-2.5">
                            {(assessmentStep === 2
                              ? ['schwer', 'mittel', 'leicht'] as NACADimension[]
                              : ['gross', 'mittel', 'klein'] as RSIDimension[]
                            ).map((val) => (
                              <button
                                key={val}
                                onClick={() => submitAssessmentStep(val)}
                                className="p-3.5 rounded-xl text-left font-bold text-sm flex justify-between items-center group transition-all"
                                style={{
                                  border: '1px solid var(--zh-color-border)',
                                  background: 'var(--zh-color-bg-secondary)',
                                  color: 'var(--zh-color-text)',
                                }}
                              >
                                {t(`assessment.${val}` as `assessment.${string}`)}
                                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--zh-color-accent)' }} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <section>
                            <div className={cn(
                              'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-3',
                              getRatingColor(getUnfallrisiko(
                                getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!),
                                currentAssessment.unfallschwere!
                              ))
                            )}>
                              {t('result.unfallrisiko')}: {t(`result.${getUnfallrisiko(
                                getRelevanzSD(currentAssessment.wichtigkeit!, currentAssessment.abweichung!),
                                currentAssessment.unfallschwere!
                              )}` as `result.${string}`)}
                            </div>
                            <h4 className="text-xl font-bold mb-2">{selectedDeficit.title}</h4>
                            <p className="text-sm leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>
                              {selectedDeficit.description}
                            </p>
                          </section>

                          {/* Bewertungsvergleich */}
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(currentAssessment).map(([key, val]) => {
                              const isCorrect = val === (selectedDeficit.correctAssessment as Record<string, string>)[key]
                              return (
                                <div
                                  key={key}
                                  className="p-2 rounded-xl border text-center"
                                  style={{
                                    background: isCorrect ? 'rgba(26,127,31,0.1)' : 'rgba(212,0,83,0.1)',
                                    border: `1px solid ${isCorrect ? 'rgba(26,127,31,0.3)' : 'rgba(212,0,83,0.3)'}`,
                                    color: isCorrect ? 'var(--zh-gruen)' : 'var(--zh-rot)',
                                  }}
                                >
                                  <p className="text-[8px] uppercase tracking-tighter opacity-60 mb-0.5">{key}</p>
                                  <p className="text-xs font-bold capitalize">{val}</p>
                                </div>
                              )
                            })}
                          </div>

                          <section
                            className="p-4 rounded-xl"
                            style={{
                              background: 'var(--zh-color-bg-secondary)',
                              border: '1px solid var(--zh-color-border)',
                            }}
                          >
                            <h5
                              className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                              style={{ color: 'var(--zh-color-accent)' }}
                            >
                              <Info size={13} /> {t('result.feedback')}
                            </h5>
                            <p className="text-sm italic" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)' }}>
                              "{selectedDeficit.feedback}"
                            </p>
                          </section>

                          <section
                            className="p-4 rounded-xl"
                            style={{
                              background: 'rgba(26,127,31,0.08)',
                              border: '1px solid rgba(26,127,31,0.25)',
                            }}
                          >
                            <h5
                              className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
                              style={{ color: 'var(--zh-gruen)' }}
                            >
                              <CheckCircle2 size={13} /> {t('result.massnahmen')}
                            </h5>
                            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)' }}>
                              {selectedDeficit.solution}
                            </p>
                          </section>
                        </div>
                      )}
                    </div>

                    {assessmentStep === 3 && (
                      <div
                        className="p-4 shrink-0"
                        style={{ borderTop: '1px solid var(--zh-color-border)' }}
                      >
                        <button
                          onClick={() => setSelectedDeficit(null)}
                          className="w-full py-3 font-bold rounded-xl transition-colors text-sm text-white"
                          style={{ background: 'var(--zh-dunkelblau)', borderRadius: 'var(--zh-radius-btn)' }}
                        >
                          {t('result.continueExploration')}
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
                  className="absolute inset-0 z-[100] flex items-center justify-center p-6 text-center text-white"
                  style={{ background: 'rgba(0,64,124,0.92)', backdropFilter: 'blur(12px)' }}
                >
                  <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="max-w-md"
                  >
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-7 shadow-2xl"
                      style={{ color: 'var(--zh-dunkelblau)' }}>
                      <Trophy size={40} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{t('completion.title')}</h2>
                    <div className="text-2xl font-black mb-5 flex items-center justify-center gap-2">
                      <span className="opacity-60">{t('completion.score')}:</span>
                      <span>{score} {t('score.points')}</span>
                    </div>
                    <p className="opacity-80 mb-7 leading-relaxed">
                      {t('completion.allFound', { count: deficits.length })}
                    </p>
                    <button
                      onClick={finishTraining}
                      className="w-full py-4 font-bold rounded-2xl transition-all hover:opacity-90 shadow-xl"
                      style={{ background: 'white', color: 'var(--zh-dunkelblau)' }}
                    >
                      {t('completion.saveScore')}
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
              className="max-w-2xl mx-auto w-full"
              style={{ padding: 'var(--zh-padding-page)' }}
            >
              <div className="mb-7 flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Trophy style={{ color: 'var(--zh-orange)' }} />
                  {t('leaderboard.title')}
                </h2>
                <button
                  onClick={() => setView('dashboard')}
                  className="text-sm font-medium transition-colors"
                  style={{ color: 'var(--zh-color-text-muted)' }}
                >
                  {t('leaderboard.backToDashboard')}
                </button>
              </div>

              <div
                className="overflow-hidden"
                style={{
                  borderRadius: 'var(--zh-radius-card)',
                  border: '1px solid var(--zh-color-border)',
                  background: 'var(--zh-color-surface)',
                }}
              >
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)' }}>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--zh-color-text-muted)' }}>
                        {t('leaderboard.rank')}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--zh-color-text-muted)' }}>
                        {t('leaderboard.name')}
                      </th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-right" style={{ color: 'var(--zh-color-text-muted)' }}>
                        {t('leaderboard.score')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="transition-colors"
                        style={{
                          borderBottom: '1px solid var(--zh-color-border)',
                          background: entry.username === username
                            ? (isDark ? 'rgba(122,182,226,0.08)' : 'rgba(0,118,189,0.05)')
                            : 'transparent',
                        }}
                      >
                        <td className="px-5 py-3 font-mono text-sm" style={{ color: 'var(--zh-color-text-muted)' }}>
                          #{idx + 1}
                        </td>
                        <td className="px-5 py-3 font-bold text-sm">{entry.username}</td>
                        <td className="px-5 py-3 text-right font-black text-sm" style={{ color: 'var(--zh-color-accent)' }}>
                          {entry.score}
                        </td>
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-7xl mx-auto w-full space-y-7 h-full overflow-auto"
              style={{ padding: 'var(--zh-padding-page)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{t('admin.title')}</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--zh-color-text-muted)' }}>{t('admin.subtitle')}</p>
                </div>
                <button
                  onClick={() => setView('onboarding')}
                  className="px-4 py-2 text-sm font-bold flex items-center gap-2 transition-colors"
                  style={{
                    borderRadius: 'var(--zh-radius-btn)',
                    border: '1px solid var(--zh-color-border)',
                    background: 'var(--zh-color-bg-secondary)',
                    color: 'var(--zh-color-text)',
                  }}
                >
                  <ArrowLeft size={16} /> {t('admin.logout')}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Themenbereiche */}
                <div
                  className="p-5 space-y-3"
                  style={{
                    borderRadius: 'var(--zh-radius-card)',
                    border: '1px solid var(--zh-color-border)',
                    background: 'var(--zh-color-surface)',
                  }}
                >
                  <h3
                    className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{ color: 'var(--zh-color-text-muted)' }}
                  >
                    {t('admin.topics')}
                  </h3>
                  {topics.map(t2 => (
                    <div
                      key={t2.id}
                      onClick={() => handleAdminTopicSelect(t2)}
                      className="p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                      style={{
                        border: '1px solid',
                        borderColor: adminSelectedTopic?.id === t2.id ? 'var(--zh-dunkelblau)' : 'var(--zh-color-border)',
                        background: adminSelectedTopic?.id === t2.id ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-secondary)',
                        color: adminSelectedTopic?.id === t2.id ? 'white' : 'var(--zh-color-text)',
                      }}
                    >
                      <div>
                        <h4 className="font-bold text-sm">{t2.name}</h4>
                        <p className="text-[10px] opacity-50 mt-0.5">{t2.id}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Szenen */}
                <div
                  className="p-5 space-y-3"
                  style={{
                    borderRadius: 'var(--zh-radius-card)',
                    border: '1px solid var(--zh-color-border)',
                    background: 'var(--zh-color-surface)',
                  }}
                >
                  <h3
                    className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{ color: 'var(--zh-color-text-muted)' }}
                  >
                    {t('admin.scenes')}
                  </h3>
                  {!adminSelectedTopic ? (
                    <p className="text-xs italic" style={{ color: 'var(--zh-color-text-disabled)' }}>
                      {t('admin.selectTopic')}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {SCENES.filter(s => s.topicId === adminSelectedTopic.id).map(s => (
                        <div
                          key={s.id}
                          onClick={() => handleAdminSceneSelect(s)}
                          className="p-3.5 rounded-xl cursor-pointer transition-all"
                          style={{
                            border: '1px solid',
                            borderColor: adminSelectedScene?.id === s.id ? 'var(--zh-dunkelblau)' : 'var(--zh-color-border)',
                            background: adminSelectedScene?.id === s.id ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-secondary)',
                            color: adminSelectedScene?.id === s.id ? 'white' : 'var(--zh-color-text)',
                          }}
                        >
                          <h4 className="font-bold text-xs">{s.description}</h4>
                          <p className="text-[10px] opacity-50 capitalize mt-0.5">
                            {s.locationType === 'io' ? t('admin.innerorts') : t('admin.ausserorts')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Defizite */}
                <div className="lg:col-span-2">
                  {!adminSelectedScene ? (
                    <div
                      className="p-10 text-center border-dashed"
                      style={{
                        borderRadius: 'var(--zh-radius-card)',
                        border: '2px dashed var(--zh-color-border)',
                        background: 'var(--zh-color-surface)',
                      }}
                    >
                      <MapPin
                        size={28}
                        className="mx-auto mb-3 opacity-25"
                        style={{ color: 'var(--zh-color-text-muted)' }}
                      />
                      <h4 className="font-bold mb-1">{t('admin.deficits')}</h4>
                      <p className="text-sm" style={{ color: 'var(--zh-color-text-muted)' }}>
                        {t('admin.selectScene')}
                      </p>
                    </div>
                  ) : (
                    <div
                      className="p-5"
                      style={{
                        borderRadius: 'var(--zh-radius-card)',
                        border: '1px solid var(--zh-color-border)',
                        background: 'var(--zh-color-surface)',
                      }}
                    >
                      <h3
                        className="text-xs font-bold uppercase tracking-widest mb-5"
                        style={{ color: 'var(--zh-color-text-muted)' }}
                      >
                        {t('admin.deficitsCount', { count: adminDeficits.length })}
                      </h3>
                      <div className="space-y-3">
                        {adminDeficits.length === 0 ? (
                          <p className="text-xs italic" style={{ color: 'var(--zh-color-text-disabled)' }}>
                            {t('admin.noDeficits')}
                          </p>
                        ) : (
                          adminDeficits.map(d => (
                            <div
                              key={d.id}
                              className="p-4 rounded-xl space-y-2"
                              style={{
                                border: '1px solid var(--zh-color-border)',
                                background: 'var(--zh-color-bg-secondary)',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm">{d.title}</h4>
                                <div className="flex gap-1">
                                  {[d.correctAssessment.wichtigkeit, d.correctAssessment.abweichung, d.correctAssessment.unfallschwere].map((val, i) => (
                                    <span
                                      key={i}
                                      className="text-[9px] px-2 py-0.5 rounded-full capitalize font-bold"
                                      style={{
                                        background: 'var(--zh-color-bg-tertiary)',
                                        color: 'var(--zh-color-text-muted)',
                                        border: '1px solid var(--zh-color-border)',
                                      }}
                                    >
                                      {val}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <p
                                className="text-xs line-clamp-2"
                                style={{ color: 'var(--zh-color-text-muted)' }}
                              >
                                {d.description}
                              </p>
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
