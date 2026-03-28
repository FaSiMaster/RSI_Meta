// RSI VR Tool – App-Orchestrator Phase 2+
// Views: landing | topics | scenes | viewer | scoring | szenenabschluss | admin | ranking
// FaSi Kanton Zürich · ZH Corporate Design

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  getSession, saveSession, getDeficits, getAllScenes, saveRankingEntry,
} from './data/appData'
import type { AppTopic, AppScene, AppDeficit, FoundDeficit } from './data/appData'

import LandingPage     from './components/LandingPage'
import Navbar          from './components/Navbar'
import TopicDashboard  from './components/TopicDashboard'
import SceneList       from './components/SceneList'
import SceneViewer     from './components/SceneViewer'
import type { DeficitConfirmedPayload } from './components/SceneViewer'
import ScoringFlow     from './components/ScoringFlow'
import SzenenAbschluss from './components/SzenenAbschluss'
import AdminDashboard  from './components/AdminDashboard'
import RankingView     from './components/RankingView'

type View = 'landing' | 'topics' | 'scenes' | 'viewer' | 'scoring' | 'szenenabschluss' | 'admin' | 'ranking'

export default function App() {
  const [view, setView]     = useState<View>('landing')
  const [username, setUsername] = useState('')
  const [score, setScore]   = useState(0)
  const [theme, setTheme]   = useState<'light' | 'dark'>('light')

  const [currentTopic, setCurrentTopic] = useState<AppTopic | null>(null)
  const [currentScene, setCurrentScene] = useState<AppScene | null>(null)
  const [sceneDeficits, setSceneDeficits] = useState<AppDeficit[]>([])

  // ── Viewer-Zustand ──────────────────────────────────────────────────────────
  const [foundDeficits,  setFoundDeficits]  = useState<FoundDeficit[]>([])
  const [hintActive,     setHintActive]     = useState(false)
  const [sceneScore,     setSceneScore]     = useState(0)

  // Pending-Daten waehrend ScoringFlow
  const [scoringDeficit,        setScoringDeficit]        = useState<AppDeficit | null>(null)
  const [pendingKatRichtig,     setPendingKatRichtig]     = useState(true)
  const [pendingHintPenalty,    setPendingHintPenalty]    = useState(false)

  // Session + Theme beim Start laden
  useEffect(() => {
    const session = getSession()
    if (session.username) {
      setUsername(session.username)
      setScore(session.score)
    }
    const saved = (localStorage.getItem('rsi-theme') as 'light' | 'dark') ?? 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  function handleToggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('rsi-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  function handleLogin(name: string) {
    const session = getSession()
    session.username = name
    saveSession(session)
    setUsername(name)
    setScore(session.score)
    setView('topics')
  }

  function handleSelectTopic(topic: AppTopic) {
    setCurrentTopic(topic)
    setView('scenes')
  }

  // Szene starten → Viewer oeffnen
  function handleSelectScene(scene: AppScene) {
    const defs = getDeficits(scene.id)
    if (defs.length === 0) return
    setCurrentScene(scene)
    setSceneDeficits(defs)
    setFoundDeficits([])
    setHintActive(false)
    setSceneScore(0)
    setScoringDeficit(null)
    setView('viewer')
  }

  // ── Defizit im Viewer bestaetigt → ScoringFlow starten ────────────────────
  function handleDeficitConfirmed(payload: DeficitConfirmedPayload) {
    setScoringDeficit(payload.deficit)
    setPendingKatRichtig(payload.kategorieRichtig)
    setPendingHintPenalty(payload.hintPenalty)
    setView('scoring')
  }

  // ── ScoringFlow abgeschlossen ──────────────────────────────────────────────
  function handleScoringComplete(rawPts: number) {
    if (!scoringDeficit) return

    // Strafen anwenden
    const multiplier = (pendingKatRichtig ? 1 : 0.9) * (pendingHintPenalty ? 0.5 : 1)
    const finalPts   = Math.round(rawPts * multiplier)

    const entry: FoundDeficit = {
      deficitId:        scoringDeficit.id,
      kategorieRichtig: pendingKatRichtig,
      pointsEarned:     finalPts,
      hintPenalty:      pendingHintPenalty,
    }

    const updatedFound = [...foundDeficits, entry]
    const updatedSceneScore = sceneScore + finalPts
    const newTotalScore = score + finalPts

    setFoundDeficits(updatedFound)
    setSceneScore(updatedSceneScore)
    setScore(newTotalScore)

    const session = getSession()
    session.score = newTotalScore
    saveSession(session)

    setScoringDeficit(null)
    setView('viewer')
  }

  // ── Szene beenden (manuell oder alle gefunden) ─────────────────────────────
  function handleBeenden() {
    if (!currentScene) return

    const session = getSession()
    if (!session.completedScenes.includes(currentScene.id)) {
      session.completedScenes.push(currentScene.id)
      saveSession(session)
    }
    saveRankingEntry({
      username,
      score,
      scenesCount: session.completedScenes.length,
      timestamp: new Date().toISOString(),
    })

    setView('szenenabschluss')
  }

  // ── Hint aktivieren ────────────────────────────────────────────────────────
  function handleHintActivate() {
    setHintActive(true)
  }

  // ── Naechste Szene (gleiche Topic) ─────────────────────────────────────────
  function handleNextScene() {
    if (!currentScene || !currentTopic) { setView('scenes'); return }
    const allScenes = getAllScenes().filter(s => s.topicId === currentTopic.id && s.isActive)
    const idx = allScenes.findIndex(s => s.id === currentScene.id)
    const next = allScenes[idx + 1]
    if (next) {
      handleSelectScene(next)
    } else {
      setView('scenes')
    }
  }

  function handleNavigate(v: View) {
    if (v === 'topics') {
      setCurrentTopic(null)
      setCurrentScene(null)
    }
    setView(v)
  }

  // Naechste Szene vorhanden?
  const nextSceneExists = (() => {
    if (!currentScene || !currentTopic) return false
    const all = getAllScenes().filter(s => s.topicId === currentTopic.id && s.isActive)
    const idx = all.findIndex(s => s.id === currentScene.id)
    return idx >= 0 && idx < all.length - 1
  })()

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: '100dvh',
        background: 'var(--zh-color-bg)',
        color: 'var(--zh-color-text)',
        fontFamily: 'var(--zh-font)',
      }}
    >
      {view !== 'landing' && view !== 'viewer' && (
        <Navbar
          view={view}
          username={username}
          score={score}
          theme={theme}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
        />
      )}

      <div className="flex-1 flex flex-col overflow-auto">
        <AnimatePresence mode="wait">

          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1">
              <LandingPage onStart={handleLogin} onAdmin={() => setView('admin')} />
            </motion.div>
          )}

          {view === 'topics' && (
            <motion.div key="topics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <TopicDashboard username={username} score={score} onSelectTopic={handleSelectTopic} />
            </motion.div>
          )}

          {view === 'scenes' && currentTopic && (
            <motion.div key="scenes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <SceneList topic={currentTopic} onBack={() => setView('topics')} onSelectScene={handleSelectScene} />
            </motion.div>
          )}

          {view === 'viewer' && currentScene && (
            <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
              <SceneViewer
                scene={currentScene}
                deficits={sceneDeficits}
                foundDeficits={foundDeficits}
                hintActive={hintActive}
                onDeficitConfirmed={handleDeficitConfirmed}
                onHintActivate={handleHintActivate}
                onBeenden={handleBeenden}
              />
            </motion.div>
          )}

          {view === 'scoring' && currentScene && scoringDeficit && (
            <motion.div key={`scoring-${scoringDeficit.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
              <ScoringFlow
                deficit={scoringDeficit}
                scene={currentScene}
                username={username}
                onComplete={handleScoringComplete}
                onBack={() => setView('viewer')}
              />
            </motion.div>
          )}

          {view === 'szenenabschluss' && currentScene && (
            <motion.div key="szenenabschluss" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <SzenenAbschluss
                scene={currentScene}
                deficits={sceneDeficits}
                foundDeficits={foundDeficits}
                sceneScore={sceneScore}
                totalScore={score}
                onToTopics={() => { setCurrentScene(null); setView('topics') }}
                onToRanking={() => setView('ranking')}
                onNextScene={nextSceneExists ? handleNextScene : null}
              />
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex" style={{ overflow: 'hidden' }}>
              <AdminDashboard onBack={() => setView('topics')} />
            </motion.div>
          )}

          {view === 'ranking' && (
            <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <RankingView username={username} onBack={() => setView('topics')} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
