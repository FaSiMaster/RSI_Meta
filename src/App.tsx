// RSI VR Tool – App-Orchestrator Phase 2
// Views: landing | topics | scenes | scoring | admin | ranking
// FaSi Kanton Zürich · ZH Corporate Design

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getSession, saveSession, getDeficits } from './data/appData'
import type { AppTopic, AppScene, AppDeficit } from './data/appData'

import LandingPage from './components/LandingPage'
import Navbar from './components/Navbar'
import TopicDashboard from './components/TopicDashboard'
import SceneList from './components/SceneList'
import ScoringFlow from './components/ScoringFlow'
import AdminDashboard from './components/AdminDashboard'
import RankingView from './components/RankingView'

type View = 'landing' | 'topics' | 'scenes' | 'scoring' | 'admin' | 'ranking'

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [username, setUsername] = useState('')
  const [score, setScore] = useState(0)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const [currentTopic, setCurrentTopic] = useState<AppTopic | null>(null)
  const [currentScene, setCurrentScene] = useState<AppScene | null>(null)
  const [currentDeficit, setCurrentDeficit] = useState<AppDeficit | null>(null)

  // Theme + Session beim Start laden
  useEffect(() => {
    const session = getSession()
    if (session.username) {
      setUsername(session.username)
      setScore(session.totalScore)
    }
    const savedTheme = (localStorage.getItem('rsi-theme') as 'light' | 'dark') ?? 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  function handleToggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('rsi-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  function handleLogin(name: string) {
    setUsername(name)
    const session = getSession()
    session.username = name
    saveSession(session)
    setScore(session.totalScore)
    setView('topics')
  }

  function handleAdminLogin() {
    setView('admin')
  }

  function handleSelectTopic(topic: AppTopic) {
    setCurrentTopic(topic)
    setView('scenes')
  }

  function handleSelectScene(scene: AppScene) {
    const deficits = getDeficits(scene.id)
    if (deficits.length === 0) return
    setCurrentScene(scene)
    setCurrentDeficit(deficits[0])
    setView('scoring')
  }

  function handleScoringComplete(earnedScore: number) {
    const newScore = score + earnedScore
    setScore(newScore)
    const session = getSession()
    session.totalScore = newScore
    if (currentScene && !session.scenesCompleted.includes(currentScene.id)) {
      session.scenesCompleted.push(currentScene.id)
    }
    saveSession(session)
    setCurrentScene(null)
    setCurrentDeficit(null)
    setView('topics')
  }

  function handleNavigate(v: View) {
    if (v === 'topics') {
      setCurrentTopic(null)
      setCurrentScene(null)
    }
    setView(v)
  }

  const showNavbar = view !== 'landing'

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
      {/* Navbar – immer ausser auf Landing */}
      {showNavbar && (
        <Navbar
          view={view}
          username={username}
          score={score}
          theme={theme}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <LandingPage onStart={handleLogin} onAdmin={handleAdminLogin} />
            </motion.div>
          )}

          {view === 'topics' && (
            <motion.div
              key="topics"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <TopicDashboard
                username={username}
                score={score}
                onSelectTopic={handleSelectTopic}
              />
            </motion.div>
          )}

          {view === 'scenes' && currentTopic && (
            <motion.div
              key="scenes"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <SceneList
                topic={currentTopic}
                onBack={() => setView('topics')}
                onSelectScene={handleSelectScene}
              />
            </motion.div>
          )}

          {view === 'scoring' && currentScene && currentDeficit && (
            <motion.div
              key="scoring"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <ScoringFlow
                deficit={currentDeficit}
                scene={currentScene}
                username={username}
                onComplete={handleScoringComplete}
                onBack={() => setView('scenes')}
              />
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex"
              style={{ overflow: 'hidden' }}
            >
              <AdminDashboard onBack={() => setView('topics')} />
            </motion.div>
          )}

          {view === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              <RankingView
                username={username}
                onBack={() => setView('topics')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
