// RSI VR Tool – App-Orchestrator Phase 2+
// Views: landing | topics | scenes | einstieg | viewer | scoring | szenenabschluss | admin | ranking
// FaSi Kanton Zürich · ZH Corporate Design

import { useState, useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  getSession, saveSession, getDeficits, getAllScenes, saveRankingEntry,
  saveSceneResult, getVersuchAnzahl, getGesamtScore,
} from './data/appData'
import { MAX_PUNKTE_PRO_DEFIZIT } from './data/scoreCalc'
import type { AppTopic, AppScene, AppDeficit, FoundDeficit, DefizitResult, SceneResult } from './data/appData'

import { initSupabaseData, resetCache as resetSupabaseCache } from './data/supabaseSync'
import { xrStore } from './xrStore'
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
import TrainingEinstieg from './components/TrainingEinstieg'

type View = 'landing' | 'topics' | 'scenes' | 'einstieg' | 'viewer' | 'scoring' | 'szenenabschluss' | 'admin' | 'ranking'

export default function App() {
  const [view, setView]     = useState<View>('landing')
  const [username, setUsername] = useState('')
  const [score, setScore]   = useState(0)
  const [theme, setTheme]   = useState<'light' | 'dark'>('light')
  const [kursId, setKursId] = useState<string | null>(null)
  const [kursName, setKursName] = useState<string | null>(null)

  const [currentTopic, setCurrentTopic] = useState<AppTopic | null>(null)
  const [currentScene, setCurrentScene] = useState<AppScene | null>(null)
  const [sceneDeficits, setSceneDeficits] = useState<AppDeficit[]>([])

  // ── Viewer-Zustand ──────────────────────────────────────────────────────────
  const [foundDeficits,  setFoundDeficits]  = useState<FoundDeficit[]>([])
  const [hintActive,     setHintActive]     = useState(false)
  const [sceneScore,     setSceneScore]     = useState(0)

  // Pending-Daten während ScoringFlow
  const [scoringDeficit,        setScoringDeficit]        = useState<AppDeficit | null>(null)
  const [pendingKatRichtig,     setPendingKatRichtig]     = useState(true)
  const [pendingHintPenalty,    setPendingHintPenalty]    = useState(false)

  // Bewertungen aus dem Viewer-Overlay
  const [pendingWichtigkeit, setPendingWichtigkeit] = useState<'gross' | 'mittel' | 'klein' | null>(null)
  const [pendingAbweichung,  setPendingAbweichung]  = useState<'gross' | 'mittel' | 'klein' | null>(null)
  const [pendingNacaSchwere, setPendingNacaSchwere]  = useState<'leicht' | 'mittel' | 'schwer' | null>(null)

  // Zeiterfassung
  const [sceneStartTime, setSceneStartTime] = useState<number>(0)
  const deficitStartTime = useRef<number>(0)

  // Defizit-Einzelresultate (für SceneResult)
  const [defizitResults, setDefizitResults] = useState<DefizitResult[]>([])

  // Letztes SceneResult (für SzenenAbschluss)
  const [lastSceneResult, setLastSceneResult] = useState<SceneResult | null>(null)

  // Session + Theme + Supabase-Sync beim Start laden
  useEffect(() => {
    const session = getSession()
    if (session.username) {
      setUsername(session.username)
      setScore(session.score)
    }
    if (session.kursId) setKursId(session.kursId)
    if (session.kursName) setKursName(session.kursName)
    const saved = (localStorage.getItem('rsi-theme') as 'light' | 'dark') ?? 'light'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
    // Admin-Daten aus Supabase laden (Topics, Scenes, Deficits)
    initSupabaseData().catch(() => {})
  }, [])

  function handleToggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('rsi-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  function handleLogin(name: string, kursCode: string | null, kursName: string | null = null) {
    const session = getSession()
    session.username = name
    session.kursId = kursCode
    session.kursName = kursName
    saveSession(session)
    setUsername(name)
    setScore(session.score)
    setKursId(kursCode)
    setKursName(kursName)
    setView('topics')
  }

  function handleLogout() {
    setUsername('')
    setScore(0)
    setKursId(null)
    setKursName(null)
    setCurrentTopic(null)
    setCurrentScene(null)
    saveSession({ username: '', score: 0, completedScenes: [] })
    sessionStorage.removeItem('rsi-admin-auth')
    // Supabase-Cache leeren, damit nächster Login frische Daten holt
    resetSupabaseCache()
    setView('landing')
  }

  function handleSelectTopic(topic: AppTopic) {
    setCurrentTopic(topic)
    setView('scenes')
  }

  // Szene starten → Einstieg-Screen anzeigen
  function handleSelectScene(scene: AppScene) {
    const defs = getDeficits(scene.id)
    setCurrentScene(scene)
    setSceneDeficits(defs)
    setFoundDeficits([])
    setHintActive(false)
    setSceneScore(0)
    setScoringDeficit(null)
    setDefizitResults([])
    setView('einstieg')
  }

  // Einstieg bestätigt → Viewer öffnen
  function handleEinstiegStart() {
    setSceneStartTime(Date.now())
    setView('viewer')
  }

  // ── Defizit im Viewer bestätigt → ScoringFlow (Auswertung) starten ────────
  function handleDeficitConfirmed(payload: DeficitConfirmedPayload) {
    setScoringDeficit(payload.deficit)
    setPendingKatRichtig(payload.kategorieRichtig)
    setPendingHintPenalty(payload.hintPenalty)
    setPendingWichtigkeit(payload.userWichtigkeit)
    setPendingAbweichung(payload.userAbweichung)
    setPendingNacaSchwere(payload.userNacaSchwere)
    deficitStartTime.current = payload.bewertungStartMs
    // VR beenden damit der HTML-ScoringFlow sichtbar ist
    xrStore.getState().session?.end()
    setView('scoring')
  }

  // ── ScoringFlow abgeschlossen ──────────────────────────────────────────────
  // finalPts = Punkte nach Strafen (Kategorie + Hint), rohPts = Punkte vor Strafen
  function handleScoringComplete(finalPts: number, rohPts: number) {
    if (!scoringDeficit) return

    const entry: FoundDeficit = {
      deficitId:        scoringDeficit.id,
      kategorieRichtig: pendingKatRichtig,
      pointsEarned:     finalPts,
      hintPenalty:      pendingHintPenalty,
    }

    // Defizit-Einzelresultat für SceneResult
    const ca = scoringDeficit.correctAssessment
    const defResult: DefizitResult = {
      deficitId:          scoringDeficit.id,
      kategorieRichtig:   pendingKatRichtig,
      hintPenalty:        pendingHintPenalty,
      punkteRoh:          rohPts,
      punkteFinal:        finalPts,
      dauerSekunden:      Math.round((Date.now() - deficitStartTime.current) / 1000),
      wichtigkeitKorrekt: pendingWichtigkeit === ca.wichtigkeit,
      abweichungKorrekt:  pendingAbweichung === ca.abweichung,
      nacaKorrekt:        pendingNacaSchwere === ca.unfallschwere,
    }

    const updatedFound = [...foundDeficits, entry]
    const updatedSceneScore = sceneScore + finalPts
    const updatedDefResults = [...defizitResults, defResult]

    setFoundDeficits(updatedFound)
    setSceneScore(updatedSceneScore)
    setDefizitResults(updatedDefResults)

    // Gesamt-Score wird bei Szenenende als Best-of berechnet (nicht mehr kumulativ)
    setScoringDeficit(null)
    setView('viewer')
  }

  // ── Szene beenden (manuell oder alle gefunden) ─────────────────────────────
  function handleBeenden() {
    if (!currentScene || !currentTopic) return

    const dauerSekunden = Math.round((Date.now() - sceneStartTime) / 1000)
    const maxPunkte = sceneDeficits.length * MAX_PUNKTE_PRO_DEFIZIT
    const prozent = maxPunkte > 0 ? Math.round((sceneScore / maxPunkte) * 100) : 0
    const versuch = getVersuchAnzahl(username, currentScene.id) + 1

    // SceneResult speichern
    const result: SceneResult = {
      id:             `sr-${Date.now()}`,
      sceneId:        currentScene.id,
      topicId:        currentTopic.id,
      username,
      punkte:         sceneScore,
      maxPunkte,
      prozent,
      gefunden:       foundDeficits.length,
      total:          sceneDeficits.length,
      versuch,
      timestamp:      new Date().toISOString(),
      dauerSekunden,
      kursId:         kursId ?? null,
      defizitResults: defizitResults,
    }
    saveSceneResult(result)
    setLastSceneResult(result)

    // Gesamt-Score als Best-of aktualisieren
    const bestOfTotal = getGesamtScore(username)
    setScore(bestOfTotal)

    const session = getSession()
    session.score = bestOfTotal
    if (!session.completedScenes.includes(currentScene.id)) {
      session.completedScenes.push(currentScene.id)
    }
    saveSession(session)

    // Legacy-Ranking ebenfalls aktualisieren (Rückwärtskompatibilität)
    saveRankingEntry({
      username,
      score: bestOfTotal,
      scenesCount: session.completedScenes.length,
      timestamp: new Date().toISOString(),
      kursId: kursId ?? null,
      stunde: new Date().toISOString().slice(0, 10),
    })

    setView('szenenabschluss')
  }

  // ── Hint aktivieren ────────────────────────────────────────────────────────
  function handleHintActivate() {
    setHintActive(true)
  }

  // ── Nächste Szene (gleiche Topic) ─────────────────────────────────────────
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

  // Nächste Szene vorhanden? Nur neu berechnen wenn sich Szene oder Thema ändern.
  const nextSceneExists = useMemo(() => {
    if (!currentScene || !currentTopic) return false
    const all = getAllScenes().filter(s => s.topicId === currentTopic.id && s.isActive)
    const idx = all.findIndex(s => s.id === currentScene.id)
    return idx >= 0 && idx < all.length - 1
  }, [currentScene?.id, currentTopic?.id])

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
          kursName={kursName}
          onNavigate={handleNavigate}
          onToggleTheme={handleToggleTheme}
          onLogout={handleLogout}
        />
      )}

      <div className="flex-1 flex flex-col" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        <AnimatePresence mode="wait">

          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1">
              <LandingPage onStart={(name, kursCode, kursName) => handleLogin(name, kursCode, kursName ?? null)} onAdmin={() => setView('admin')} />
            </motion.div>
          )}

          {view === 'topics' && (
            <motion.div key="topics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <TopicDashboard username={username} score={score} onSelectTopic={handleSelectTopic} />
            </motion.div>
          )}

          {view === 'scenes' && currentTopic && (
            <motion.div key="scenes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <SceneList
                topic={currentTopic}
                username={username}
                isAdmin={sessionStorage.getItem('rsi-admin-auth') === '1'}
                onBack={() => setView('topics')}
                onSelectScene={handleSelectScene}
              />
            </motion.div>
          )}

          {view === 'einstieg' && currentScene && currentTopic && (
            <motion.div key="einstieg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col">
              <TrainingEinstieg
                scene={currentScene}
                topic={currentTopic}
                onStart={handleEinstiegStart}
                onBack={() => setView('scenes')}
              />
            </motion.div>
          )}

          {/* SceneViewer bleibt während Scoring gemountet (XR-Session läuft weiter,
              VR wird via xrStore.exitVR() beendet). ScoringFlow als Overlay darüber. */}
          {(view === 'viewer' || view === 'scoring') && currentScene && (
            <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col" style={{ overflow: 'hidden', position: 'relative' }}>
              <SceneViewer
                scene={currentScene}
                deficits={sceneDeficits}
                foundDeficits={foundDeficits}
                hintActive={hintActive}
                onDeficitConfirmed={handleDeficitConfirmed}
                onHintActivate={handleHintActivate}
                onBeenden={handleBeenden}
              />
              {view === 'scoring' && scoringDeficit && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,0.92)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 200,
                  overflowY: 'auto',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <ScoringFlow
                    deficit={scoringDeficit}
                    scene={currentScene}
                    username={username}
                    kategorieRichtig={pendingKatRichtig}
                    hintPenalty={pendingHintPenalty}
                    onComplete={handleScoringComplete}
                    onBack={() => setView('viewer')}
                    prefillWichtigkeit={pendingWichtigkeit ?? undefined}
                    prefillAbweichung={pendingAbweichung ?? undefined}
                    prefillNacaSchwere={pendingNacaSchwere ?? undefined}
                  />
                </div>
              )}
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
                sceneResult={lastSceneResult}
                username={username}
                onToTopics={() => { setCurrentScene(null); setView('topics') }}
                onToRanking={() => setView('ranking')}
                onNextScene={nextSceneExists ? handleNextScene : null}
              />
            </motion.div>
          )}

          {view === 'admin' && sessionStorage.getItem('rsi-admin-auth') === '1' && (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex-1 flex" style={{ overflow: 'hidden' }}>
              <AdminDashboard />
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
