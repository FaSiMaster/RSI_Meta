// SceneList – Szenen eines Topics als Cards
// Sterne-Anzeige (1-3) basierend auf bestem Resultat
// Neue Szene: Inline-Modal mit Name, Kontext, Beschreibung

import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Play, Plus, Star, X } from 'lucide-react'
import { motion } from 'motion/react'
import { getScenes, getDeficits, getBestResult, getVersuchAnzahl, berechneSterne, ml, saveScene, type AppTopic, type AppScene } from '../data/appData'
import { useEffect, useState, useCallback } from 'react'

interface Props {
  topic: AppTopic
  username: string
  isAdmin?: boolean
  onBack: () => void
  onSelectScene: (scene: AppScene) => void
}

// Sterne-Anzeige (1-3)
function SterneAnzeige({ sterne, size = 14 }: { sterne: 0 | 1 | 2 | 3; size?: number }) {
  const colors = ['#CCCCCC', '#B87300', '#949494', '#1A7F1F']
  // 0 = keine Sterne (nicht gespielt), 1-3 = Sterne
  if (sterne === 0) return null
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= sterne ? colors[sterne] : 'none'}
          style={{ color: i <= sterne ? colors[sterne] : 'var(--zh-color-text-disabled)' }}
        />
      ))}
    </div>
  )
}

export { SterneAnzeige }

// ── Neue-Szene-Modal ────────────────────────────────────────────────────────
interface NeueSzeneModalProps {
  topicId: string
  onSave: (scene: AppScene) => void
  onClose: () => void
}

function NeueSzeneModal({ topicId, onSave, onClose }: NeueSzeneModalProps) {
  const { t } = useTranslation()
  const [nameDe, setNameDe] = useState('')
  const [kontext, setKontext] = useState<'io' | 'ao'>('io')
  const [beschreibungDe, setBeschreibungDe] = useState('')
  const [validationError, setValidationError] = useState(false)

  // Escape schliesst Modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = useCallback(() => {
    if (!nameDe.trim()) {
      setValidationError(true)
      return
    }
    const newScene: AppScene = {
      id: `sc-${Date.now()}`,
      topicId,
      nameI18n: { de: nameDe.trim(), fr: '', it: '', en: '' },
      beschreibungI18n: { de: beschreibungDe.trim(), fr: '', it: '', en: '' },
      kontext,
      strassenmerkmale: [],
      vorschauBilder: [],
      vorschauBild1: null,
      vorschauBild2: null,
      panoramaBildUrl: null,
      startblick: null,
      isActive: true,
    }
    saveScene(newScene)
    onSave(newScene)
  }, [nameDe, beschreibungDe, kontext, topicId, onSave])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--zh-color-border)',
    background: 'var(--zh-color-bg-secondary)',
    color: 'var(--zh-color-text)',
    fontSize: '14px',
    fontFamily: 'var(--zh-font)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--zh-color-text-muted)',
    display: 'block',
    marginBottom: '6px',
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--zh-color-bg)',
          borderRadius: 'var(--zh-radius-card)',
          border: '1px solid var(--zh-color-border)',
          padding: '28px 32px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--zh-shadow-lg)',
          fontFamily: 'var(--zh-font)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)', margin: 0 }}>
            {t('admin.szene_neu')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Name DE (Pflichtfeld) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Name (DE) *
          </label>
          <input
            type="text"
            value={nameDe}
            onChange={e => { setNameDe(e.target.value); setValidationError(false) }}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="z.B. Innerorts – Gehweg mit Querung"
            style={{
              ...inputStyle,
              border: validationError ? '1px solid #D40053' : '1px solid var(--zh-color-border)',
            }}
            autoFocus
          />
          {validationError && (
            <p style={{ fontSize: '12px', color: '#D40053', marginTop: '4px' }}>
              Name (DE) ist ein Pflichtfeld.
            </p>
          )}
        </div>

        {/* Kontext io / ao */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            {t('admin.szene_kontext')}
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {(['io', 'ao'] as const).map(k => (
              <label
                key={k}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: kontext === k ? '2px solid var(--zh-color-accent)' : '1px solid var(--zh-color-border)',
                  background: kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: kontext === k ? 700 : 500,
                  color: kontext === k ? 'var(--zh-color-accent)' : 'var(--zh-color-text)',
                  fontFamily: 'var(--zh-font)',
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <input
                  type="radio"
                  name="kontext"
                  value={k}
                  checked={kontext === k}
                  onChange={() => setKontext(k)}
                  style={{ display: 'none' }}
                />
                {k === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')}
              </label>
            ))}
          </div>
        </div>

        {/* Beschreibung DE (optional) */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>
            {t('admin.szene_beschreibung')} (optional)
          </label>
          <textarea
            value={beschreibungDe}
            onChange={e => setBeschreibungDe(e.target.value)}
            rows={3}
            placeholder="Erläuterungstext zur Szene..."
            style={{
              ...inputStyle,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--zh-radius-btn)',
              border: '1px solid var(--zh-color-border)',
              background: 'transparent',
              color: 'var(--zh-color-text-muted)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--zh-font)',
            }}
          >
            {t('admin.cancelBtn')}
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--zh-radius-btn)',
              background: 'var(--zh-dunkelblau)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'var(--zh-font)',
            }}
          >
            {t('admin.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ────────────────────────────────────────────────────────

export default function SceneList({ topic, username, onBack, onSelectScene }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [deficitCounts, setDeficitCounts] = useState<Record<string, number>>({})
  const [sceneStats, setSceneStats] = useState<Record<string, { sterne: 0 | 1 | 2 | 3; versuche: number; prozent: number }>>({})
  const [showNeueSzeneModal, setShowNeueSzeneModal] = useState(false)

  // Szenen laden (auch nach Neuanlage)
  const loadScenes = useCallback(() => {
    const sc = getScenes(topic.id)
    setScenes(sc)
    const counts: Record<string, number> = {}
    const stats: Record<string, { sterne: 0 | 1 | 2 | 3; versuche: number; prozent: number }> = {}
    sc.forEach(s => {
      counts[s.id] = getDeficits(s.id).length
      const best = getBestResult(username, s.id)
      const versuche = getVersuchAnzahl(username, s.id)
      stats[s.id] = {
        sterne: best ? berechneSterne(best.prozent) : 0,
        versuche,
        prozent: best?.prozent ?? 0,
      }
    })
    setDeficitCounts(counts)
    setSceneStats(stats)
  }, [topic.id, username])

  useEffect(() => {
    loadScenes()
  }, [loadScenes])

  function handleNeueSzeneGespeichert() {
    setShowNeueSzeneModal(false)
    loadScenes()
  }

  return (
    <div className="max-w-5xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={15} /> {t('scenes.back')}
        </button>

        <div className="flex items-end justify-between">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '4px' }}>
              {ml(topic.nameI18n, lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
              {ml(topic.beschreibungI18n, lang)}
            </p>
          </div>
          <button
            onClick={() => setShowNeueSzeneModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'var(--zh-font)', flexShrink: 0 }}
          >
            <Plus size={14} /> {t('admin.szene_neu')}
          </button>
        </div>
      </div>

      {/* Szenen-Grid */}
      {scenes.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>Noch keine Szenen für dieses Thema vorhanden.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenes.map((scene, i) => {
            const count = deficitCounts[scene.id] ?? 0
            const stats = sceneStats[scene.id]
            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden"
                style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', boxShadow: 'var(--zh-shadow-sm)' }}
              >
                {/* Bild-Platzhalter */}
                <div className="relative h-36 flex items-end" style={{ background: 'var(--zh-color-bg-tertiary)' }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="relative flex items-center gap-2 p-4 w-full">
                    <MapPin size={13} style={{ color: 'var(--zh-color-accent)' }} />
                    <span className="text-white font-bold text-xs uppercase tracking-wider">Szenario {i + 1}</span>
                    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: scene.kontext === 'io' ? 'rgba(0,158,224,0.8)' : 'rgba(26,127,31,0.8)', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {scene.kontext}
                    </span>
                    {/* Sterne rechts */}
                    {stats && stats.sterne > 0 && (
                      <div style={{ marginLeft: 'auto' }}>
                        <SterneAnzeige sterne={stats.sterne} size={16} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--zh-color-text)', fontWeight: 500, marginBottom: '4px', lineHeight: 1.4 }}>
                    {ml(scene.nameI18n, lang)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                      {count} Defizite
                    </span>
                    {stats && stats.versuche > 0 && (
                      <>
                        <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                          {stats.versuche}× gespielt
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: stats.prozent >= 90 ? '#1A7F1F' : stats.prozent >= 60 ? '#B87300' : 'var(--zh-color-text-muted)' }}>
                          Best: {stats.prozent}%
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectScene(scene)}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.02]"
                    style={{ padding: '10px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                  >
                    <Play size={15} fill="white" /> {stats && stats.versuche > 0 ? t('scenes.retryBtn') : t('scenes.startBtn')}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Neue-Szene-Modal */}
      {showNeueSzeneModal && (
        <NeueSzeneModal
          topicId={topic.id}
          onSave={handleNeueSzeneGespeichert}
          onClose={() => setShowNeueSzeneModal(false)}
        />
      )}
    </div>
  )
}
