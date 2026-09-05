// SceneList – Szenen eines Topics als Cards
// Sterne-Anzeige (1-3) basierend auf bestem Resultat
// Neue Szene: Inline-Modal mit Name, Kontext, Beschreibung
// v0.11.1: Bericht des besten Versuchs direkt von der Szenenkarte abrufbar

import { useTranslation } from 'react-i18next'
import { ArrowLeft, FileDown, MapPin, Play, Plus, Star, X } from 'lucide-react'
import { motion } from 'motion/react'
import { getScenes, getAllScenes, getDeficits, getBestResult, getVersuchAnzahl, getSceneResultsForUser, getSession, berechneSterne, ml, saveScene, type AppTopic, type AppScene, type SceneResult } from '../data/appData'
import { generateSceneId } from '../data/idGenerator'
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
  const colors = ['#CCCCCC', 'var(--rsi-orange)', '#949494', 'var(--rsi-gruen)']
  // 0 = keine Sterne (nicht gespielt), 1-3 = Sterne
  if (sterne === 0) return null
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= sterne ? colors[sterne] : 'none'}
          style={{ color: i <= sterne ? colors[sterne] : 'var(--rsi-color-text-disabled)' }}
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
      id: generateSceneId(getAllScenes()),
      topicId,
      nameI18n: { de: nameDe.trim(), fr: '', it: '', en: '' },
      beschreibungI18n: { de: beschreibungDe.trim(), fr: '', it: '', en: '' },
      bemerkungI18n: { de: '', fr: '', it: '', en: '' },
      kontext,
      strassenmerkmale: [],
      vorschauBilder: [],
      vorschauBild1: null,
      vorschauBild2: null,
      panoramaBildUrl: null,
      startblick: null,
      isActive: true,
      createdAt: Date.now(),
    }
    saveScene(newScene)
    onSave(newScene)
  }, [nameDe, beschreibungDe, kontext, topicId, onSave])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid var(--rsi-color-border)',
    background: 'var(--rsi-color-bg-secondary)',
    color: 'var(--rsi-color-text)',
    fontSize: '14px',
    fontFamily: 'var(--rsi-font)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--rsi-color-text-muted)',
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
          background: 'var(--rsi-color-bg)',
          borderRadius: 'var(--rsi-radius-card)',
          border: '1px solid var(--rsi-color-border)',
          padding: '28px 32px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: 'var(--rsi-shadow-lg)',
          fontFamily: 'var(--rsi-font)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: 0 }}>
            {t('admin.szene_neu')}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rsi-color-text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
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
              border: validationError ? '1px solid var(--rsi-rot)' : '1px solid var(--rsi-color-border)',
            }}
            autoFocus
          />
          {validationError && (
            <p style={{ fontSize: '12px', color: 'var(--rsi-rot)', marginTop: '4px' }}>
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
                  border: kontext === k ? '2px solid var(--rsi-color-accent)' : '1px solid var(--rsi-color-border)',
                  background: kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--rsi-color-bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: kontext === k ? 700 : 500,
                  color: kontext === k ? 'var(--rsi-color-accent)' : 'var(--rsi-color-text)',
                  fontFamily: 'var(--rsi-font)',
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
              borderRadius: 'var(--rsi-radius-btn)',
              border: '1px solid var(--rsi-color-border)',
              background: 'transparent',
              color: 'var(--rsi-color-text-muted)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--rsi-font)',
            }}
          >
            {t('admin.cancelBtn')}
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--rsi-radius-btn)',
              background: 'var(--rsi-dunkelblau)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              fontFamily: 'var(--rsi-font)',
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

type SzenenStats = {
  sterne: 0 | 1 | 2 | 3
  versuche: number
  prozent: number
  bestanden: boolean
  /** Bestes eigenes Resultat – Grundlage fuer den nachtraeglichen PDF-Bericht. */
  best: SceneResult | null
}

type PdfStatus = 'idle' | 'laeuft' | 'fehler'

export default function SceneList({ topic, username, isAdmin = false, onBack, onSelectScene }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [deficitCounts, setDeficitCounts] = useState<Record<string, number>>({})
  const [sceneStats, setSceneStats] = useState<Record<string, SzenenStats>>({})
  const [showNeueSzeneModal, setShowNeueSzeneModal] = useState(false)
  // Export-Status je Szene (v0.11.1) – pdfmake wird erst beim Klick geladen.
  const [pdfStatus, setPdfStatus] = useState<Record<string, PdfStatus>>({})

  // Szenen laden (auch nach Neuanlage)
  const loadScenes = useCallback(() => {
    const sc = getScenes(topic.id)
    setScenes(sc)
    const counts: Record<string, number> = {}
    const stats: Record<string, SzenenStats> = {}
    sc.forEach(s => {
      counts[s.id] = getDeficits(s.id).length
      const best = getBestResult(username, s.id)
      const versuche = getVersuchAnzahl(username, s.id)
      stats[s.id] = {
        sterne: best ? berechneSterne(best.prozent) : 0,
        versuche,
        prozent: best?.prozent ?? 0,
        // Bestanden sobald irgendein Versuch das Kriterium erfuellt hat (v0.9.7)
        bestanden: getSceneResultsForUser(username, s.id).some(r => r.bestanden === true),
        best,
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

  /**
   * Bericht des besten Versuchs erzeugen (v0.11.1).
   * Grundlage ist das lokal gespeicherte SceneResult – der Bericht ist deshalb
   * nur auf dem Geraet abrufbar, auf dem die Szene absolviert wurde.
   */
  async function handlePdfExport(scene: AppScene) {
    const best = sceneStats[scene.id]?.best
    if (!best) return
    setPdfStatus(s => ({ ...s, [scene.id]: 'laeuft' }))
    try {
      const [{ baueTeilnehmerBericht }, { exportTeilnehmerPdf }] = await Promise.all([
        import('../data/berichtModel'),
        import('../utils/pdfExport'),
      ])
      const bericht = baueTeilnehmerBericht(
        best,
        scene,
        getDeficits(scene.id),
        lang,
        ml(topic.nameI18n, lang) || null,
        getSession().kursName ?? null,
      )
      await exportTeilnehmerPdf(bericht, t, lang)
      setPdfStatus(s => ({ ...s, [scene.id]: 'idle' }))
    } catch {
      setPdfStatus(s => ({ ...s, [scene.id]: 'fehler' }))
      setTimeout(() => setPdfStatus(s => ({ ...s, [scene.id]: 'idle' })), 4000)
    }
  }

  return (
    <div className="max-w-5xl mx-auto w-full" style={{ padding: 'var(--rsi-padding-page)' }}>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--rsi-color-text-muted)', fontWeight: 500, marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={15} /> {t('scenes.back')}
        </button>

        <div className="flex items-end justify-between">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--rsi-color-text)', marginBottom: '4px' }}>
              {ml(topic.nameI18n, lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--rsi-color-text-muted)' }}>
              {ml(topic.beschreibungI18n, lang)}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowNeueSzeneModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--rsi-radius-btn)', background: 'var(--rsi-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'var(--rsi-font)', flexShrink: 0 }}
            >
              <Plus size={14} /> {t('admin.szene_neu')}
            </button>
          )}
        </div>
      </div>

      {/* Szenen-Grid */}
      {scenes.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--rsi-color-text-disabled)', fontStyle: 'italic' }}>{t('dashboard.noScenes')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenes.map((scene, i) => {
            const count = deficitCounts[scene.id] ?? 0
            const stats = sceneStats[scene.id]
            const status = pdfStatus[scene.id] ?? 'idle'
            const kannBericht = !!stats?.best
            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden"
                style={{ borderRadius: 'var(--rsi-radius-card)', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', boxShadow: 'var(--rsi-shadow-sm)' }}
              >
                {/* Szenen-Vorschaubild */}
                <div className="relative h-36 flex items-end" style={{ background: 'var(--rsi-color-bg-tertiary)', overflow: 'hidden' }}>
                  {(() => {
                    const imgUrl = scene.vorschauBild1 === 'panorama' ? scene.panoramaBildUrl : scene.vorschauBild1
                    return imgUrl ? (
                      <img src={imgUrl} alt={`Panorama-Vorschau: ${ml(scene.nameI18n, lang) || `Szenario ${i + 1}`}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="relative flex items-center gap-2 p-4 w-full">
                    <MapPin size={13} style={{ color: 'var(--rsi-color-accent)' }} />
                    <span className="text-white font-bold text-xs uppercase tracking-wider">Szenario {i + 1}</span>
                    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: scene.kontext === 'io' ? 'rgba(0,158,224,0.8)' : 'rgba(26,127,31,0.8)', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {scene.kontext}
                    </span>
                    {/* Bestanden-Badge + Sterne rechts */}
                    {stats?.bestanden && (
                      <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: 'rgba(26,127,31,0.85)', color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {t('scenes.bestanden_badge')}
                      </span>
                    )}
                    {stats && stats.sterne > 0 && (
                      <div style={{ marginLeft: stats.bestanden ? '0' : 'auto' }}>
                        <SterneAnzeige sterne={stats.sterne} size={16} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--rsi-color-text)', fontWeight: 500, marginBottom: '4px', lineHeight: 1.4 }}>
                    {ml(scene.nameI18n, lang)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--rsi-color-text-muted)' }}>
                      {t('scenes.defizite_count', { count })}
                    </span>
                    {stats && stats.versuche > 0 && (
                      <>
                        <span style={{ fontSize: '10px', color: 'var(--rsi-color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: '12px', color: 'var(--rsi-color-text-muted)' }}>
                          {t('scenes.versuche_count', { count: stats.versuche })}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--rsi-color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: stats.prozent >= 90 ? 'var(--rsi-gruen)' : stats.prozent >= 60 ? 'var(--rsi-orange)' : 'var(--rsi-color-text-muted)' }}>
                          {t('scenes.best_prozent', { prozent: stats.prozent })}
                        </span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <button
                      onClick={() => onSelectScene(scene)}
                      className="flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.02]"
                      style={{ flex: 1, padding: '10px', borderRadius: 'var(--rsi-radius-btn)', background: 'var(--rsi-dunkelblau)', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                    >
                      <Play size={15} fill="white" /> {stats && stats.versuche > 0 ? t('scenes.retryBtn') : t('scenes.startBtn')}
                    </button>
                    {/* Bericht des besten Versuchs – erscheint erst nach dem ersten Durchlauf */}
                    {kannBericht && (
                      <button
                        onClick={() => handlePdfExport(scene)}
                        disabled={status === 'laeuft'}
                        title={t('scenes.bericht_titel')}
                        aria-label={t('scenes.bericht_titel')}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '10px 14px',
                          borderRadius: 'var(--rsi-radius-btn)',
                          border: '1px solid var(--rsi-color-border)',
                          background: 'var(--rsi-color-surface)',
                          color: status === 'fehler' ? 'var(--rsi-rot)' : 'var(--rsi-color-text-muted)',
                          cursor: status === 'laeuft' ? 'progress' : 'pointer',
                          opacity: status === 'laeuft' ? 0.6 : 1,
                          fontFamily: 'var(--rsi-font)',
                          flexShrink: 0,
                        }}
                      >
                        <FileDown size={15} />
                      </button>
                    )}
                  </div>
                  {status === 'fehler' && (
                    <p style={{ fontSize: '11px', color: 'var(--rsi-rot)', marginTop: '6px' }}>
                      {t('bericht.export_fehler')}
                    </p>
                  )}
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
