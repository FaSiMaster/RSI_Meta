// Admin-Dashboard – Sidebar + Szenen-Chips + Defizit-Katalog
// CRUD: Topics, Scenes, Deficits; Modal-Formular; W/A/N-Badges

import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  getTopics, getScenes, getDeficits, saveDeficit, deleteDeficit, ml,
  type AppTopic, type AppScene, type AppDeficit,
} from '../data/appData'
import type { RSIDimension, NACADimension } from '../types'

// Badge-Farben nach RSI-Klasse (W/A/N)
function riskBadge(wichtigkeit: RSIDimension): { label: string; bg: string; color: string } {
  if (wichtigkeit === 'gross') return { label: 'N', bg: '#D4005322', color: '#D40053' }
  if (wichtigkeit === 'mittel') return { label: 'A', bg: '#B8730022', color: '#B87300' }
  return { label: 'W', bg: '#1A7F1F22', color: '#1A7F1F' }
}

const emptyDeficit = (): Partial<AppDeficit> => ({
  id: '',
  sceneId: '',
  position: [0, 0, 0],
  tolerance: 3,
  title: { de: '', fr: '', it: '', en: '' },
  description: { de: '', fr: '', it: '', en: '' },
  correctAssessment: { wichtigkeit: 'gross', abweichung: 'gross', unfallschwere: 'schwer' },
  feedback: { de: '', fr: '', it: '', en: '' },
  solution: { de: '', fr: '', it: '', en: '' },
})

interface Props {
  onBack: () => void
}

function mlField(obj: Record<string, string> | undefined, l: string): string {
  return obj?.[l] ?? ''
}

export default function AdminDashboard({ onBack: _onBack }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [topics, setTopics] = useState<AppTopic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<AppTopic | null>(null)
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [selectedScene, setSelectedScene] = useState<AppScene | null>(null)
  const [deficits, setDeficits] = useState<AppDeficit[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<AppDeficit>>(emptyDeficit())
  const [isNew, setIsNew] = useState(true)

  useEffect(() => {
    const ts = getTopics()
    setTopics(ts)
    if (ts.length > 0) setSelectedTopic(ts[0])
  }, [])

  useEffect(() => {
    if (!selectedTopic) return
    const sc = getScenes(selectedTopic.id)
    setScenes(sc)
    setSelectedScene(sc[0] ?? null)
  }, [selectedTopic])

  useEffect(() => {
    if (!selectedScene) { setDeficits([]); return }
    setDeficits(getDeficits(selectedScene.id))
  }, [selectedScene])

  function openNew() {
    const base = emptyDeficit()
    base.sceneId = selectedScene?.id ?? ''
    base.id = `d-${Date.now()}`
    setEditing(base)
    setIsNew(true)
    setModalOpen(true)
  }

  function openEdit(d: AppDeficit) {
    setEditing({ ...d })
    setIsNew(false)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    deleteDeficit(id)
    setDeficits(prev => prev.filter(d => d.id !== id))
  }

  function handleSave() {
    if (!editing.id || !editing.sceneId) return
    const full = editing as AppDeficit
    saveDeficit(full)
    setDeficits(getDeficits(full.sceneId))
    setModalOpen(false)
  }

  function setField<K extends keyof AppDeficit>(key: K, val: AppDeficit[K]) {
    setEditing(prev => ({ ...prev, [key]: val }))
  }

  function setMultiLangField(key: 'title' | 'description' | 'feedback' | 'solution', l: string, val: string) {
    setEditing(prev => {
      const existing = (prev[key] ?? {}) as unknown as Record<string, string>
      return { ...prev, [key]: { ...existing, [l]: val } }
    })
  }

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ fontFamily: 'var(--zh-font)' }}>

      {/* ── Sidebar – Themen ── */}
      <aside
        style={{
          width: '200px',
          minWidth: '200px',
          borderRight: '1px solid var(--zh-color-border)',
          background: 'var(--zh-color-bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          overflowY: 'auto',
        }}
      >
        <p
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--zh-color-text-disabled)',
            padding: '0 16px 8px',
          }}
        >
          {t('admin.topics')}
        </p>
        {topics.map(tp => (
          <button
            key={tp.id}
            onClick={() => setSelectedTopic(tp)}
            style={{
              textAlign: 'left',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: selectedTopic?.id === tp.id ? 700 : 500,
              color: selectedTopic?.id === tp.id ? 'var(--zh-color-accent)' : 'var(--zh-color-text)',
              borderLeft: selectedTopic?.id === tp.id ? '3px solid var(--zh-blau)' : '3px solid transparent',
              background: selectedTopic?.id === tp.id ? 'rgba(0,118,189,0.07)' : 'transparent',
            }}
          >
            {ml(tp.name, lang)}
          </button>
        ))}
      </aside>

      {/* ── Hauptbereich ── */}
      <main className="flex-1 overflow-y-auto" style={{ padding: '24px 32px' }}>

        {/* Szenen-Chips */}
        <div className="mb-6">
          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'var(--zh-color-text-disabled)',
              marginBottom: '10px',
            }}
          >
            {t('admin.scenes')}
          </p>
          <div className="flex flex-wrap gap-2">
            {scenes.map(sc => (
              <button
                key={sc.id}
                onClick={() => setSelectedScene(sc)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: '1px solid var(--zh-color-border)',
                  background: selectedScene?.id === sc.id ? 'var(--zh-dunkelblau)' : 'var(--zh-color-surface)',
                  color: selectedScene?.id === sc.id ? 'white' : 'var(--zh-color-text)',
                  transition: 'all 0.15s',
                }}
              >
                {ml(sc.description, lang).slice(0, 32)}{ml(sc.description, lang).length > 32 ? '…' : ''}
                <span
                  style={{
                    marginLeft: '6px',
                    fontSize: '9px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                    letterSpacing: '0.08em',
                  }}
                >
                  {sc.locationType}
                </span>
              </button>
            ))}
            {scenes.length === 0 && (
              <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
                {t('admin.selectTopic')}
              </p>
            )}
          </div>
        </div>

        {/* Defizit-Katalog Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
              {t('admin.deficits')}
            </h2>
            {selectedScene && (
              <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '2px' }}>
                {t('admin.deficitsCount', { count: deficits.length })}
              </p>
            )}
          </div>
          <button
            onClick={openNew}
            disabled={!selectedScene}
            className="flex items-center gap-2 font-bold text-white"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--zh-radius-btn)',
              background: selectedScene ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
              color: selectedScene ? 'white' : 'var(--zh-color-text-disabled)',
              fontSize: '13px',
              cursor: selectedScene ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={14} /> {t('admin.newDeficit')}
          </button>
        </div>

        {/* Defizit-Rows */}
        {!selectedScene ? (
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
            {t('admin.selectScene')}
          </p>
        ) : deficits.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
            {t('admin.noDeficits')}
          </p>
        ) : (
          <div
            style={{
              borderRadius: 'var(--zh-radius-card)',
              border: '1px solid var(--zh-color-border)',
              overflow: 'hidden',
              background: 'var(--zh-color-surface)',
            }}
          >
            {deficits.map((d, i) => {
              const badge = riskBadge(d.correctAssessment.wichtigkeit)
              return (
                <div
                  key={d.id}
                  className="flex items-start justify-between gap-4"
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < deficits.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* W/A/N Badge */}
                    <span
                      style={{
                        marginTop: '2px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 800,
                        background: badge.bg,
                        color: badge.color,
                        letterSpacing: '0.08em',
                        flexShrink: 0,
                      }}
                    >
                      {badge.label}
                    </span>
                    <div className="min-w-0">
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'var(--zh-color-text)',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {ml(d.title, lang)}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--zh-color-text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ml(d.description, lang)}
                      </p>
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(d)}
                      className="flex items-center gap-1"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--zh-radius-btn)',
                        border: '1px solid var(--zh-color-border)',
                        background: 'var(--zh-color-bg-secondary)',
                        fontSize: '12px',
                        color: 'var(--zh-color-text-muted)',
                      }}
                    >
                      <Pencil size={11} /> {t('admin.editBtn')}
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="flex items-center gap-1"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--zh-radius-btn)',
                        border: '1px solid rgba(212,0,83,0.2)',
                        background: 'rgba(212,0,83,0.06)',
                        fontSize: '12px',
                        color: 'var(--zh-rot)',
                      }}
                    >
                      <Trash2 size={11} /> {t('admin.deleteBtn')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div
            style={{
              width: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
              borderRadius: 'var(--zh-radius-card)',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              padding: '28px 32px',
              boxShadow: 'var(--zh-shadow-lg)',
            }}
          >
            {/* Modal-Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
                {isNew ? t('admin.modalTitleNew') : t('admin.modalTitleEdit')}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                style={{ color: 'var(--zh-color-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Felder DE/FR/IT/EN */}
            {(['de', 'fr', 'it', 'en'] as const).map(l => (
              <div key={l} className="mb-5">
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'var(--zh-color-text-disabled)',
                    marginBottom: '8px',
                  }}
                >
                  {l.toUpperCase()}
                </p>
                <div className="flex flex-col gap-2">
                  <input
                    placeholder={t('admin.fieldTitle')}
                    value={mlField(editing.title as unknown as Record<string, string>, l)}
                    onChange={e => setMultiLangField('title', l, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                    }}
                  />
                  <textarea
                    placeholder={t('admin.fieldDesc')}
                    rows={2}
                    value={mlField(editing.description as unknown as Record<string, string>, l)}
                    onChange={e => setMultiLangField('description', l, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                      resize: 'vertical',
                    }}
                  />
                  <textarea
                    placeholder={t('admin.fieldFeedback')}
                    rows={2}
                    value={mlField(editing.feedback as unknown as Record<string, string>, l)}
                    onChange={e => setMultiLangField('feedback', l, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                      resize: 'vertical',
                    }}
                  />
                  <textarea
                    placeholder={t('admin.fieldSolution')}
                    rows={2}
                    value={mlField(editing.solution as unknown as Record<string, string>, l)}
                    onChange={e => setMultiLangField('solution', l, e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            ))}

            {/* correctAssessment */}
            <div className="mb-5">
              <p
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--zh-color-text-disabled)',
                  marginBottom: '10px',
                }}
              >
                RSI-Bewertung (Lösung)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Wichtigkeit */}
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    {t('assessment.wichtigkeit')}
                  </label>
                  <select
                    value={editing.correctAssessment?.wichtigkeit ?? 'gross'}
                    onChange={e => setField('correctAssessment', {
                      ...(editing.correctAssessment ?? { wichtigkeit: 'gross', abweichung: 'gross', unfallschwere: 'schwer' }),
                      wichtigkeit: e.target.value as RSIDimension,
                    })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="gross">{t('assessment.gross')}</option>
                    <option value="mittel">{t('assessment.mittel')}</option>
                    <option value="klein">{t('assessment.klein')}</option>
                  </select>
                </div>
                {/* Abweichung */}
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    {t('assessment.abweichung')}
                  </label>
                  <select
                    value={editing.correctAssessment?.abweichung ?? 'gross'}
                    onChange={e => setField('correctAssessment', {
                      ...(editing.correctAssessment ?? { wichtigkeit: 'gross', abweichung: 'gross', unfallschwere: 'schwer' }),
                      abweichung: e.target.value as RSIDimension,
                    })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="gross">{t('assessment.gross')}</option>
                    <option value="mittel">{t('assessment.mittel')}</option>
                    <option value="klein">{t('assessment.klein')}</option>
                  </select>
                </div>
                {/* NACA */}
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '4px' }}>
                    NACA
                  </label>
                  <select
                    value={editing.correctAssessment?.unfallschwere ?? 'schwer'}
                    onChange={e => setField('correctAssessment', {
                      ...(editing.correctAssessment ?? { wichtigkeit: 'gross', abweichung: 'gross', unfallschwere: 'schwer' }),
                      unfallschwere: e.target.value as NACADimension,
                    })}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--zh-color-border)',
                      background: 'var(--zh-color-bg-secondary)',
                      color: 'var(--zh-color-text)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="schwer">{t('assessment.schwer')}</option>
                    <option value="mittel">{t('assessment.mittel')}</option>
                    <option value="leicht">{t('assessment.leicht')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal-Footer */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--zh-radius-btn)',
                  border: '1px solid var(--zh-color-border)',
                  background: 'transparent',
                  color: 'var(--zh-color-text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {t('admin.cancelBtn')}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 font-bold text-white"
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--zh-radius-btn)',
                  background: 'var(--zh-dunkelblau)',
                  fontSize: '13px',
                }}
              >
                <Save size={14} /> {t('admin.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
