// AdminDashboard – Sidebar + Szenen-Chips + Defizit-Katalog mit CRUD
// Formular: kriteriumId, kontext, correctAssessment (6 Felder), isPflicht, isBooster, normRefs

import { Plus, Pencil, Trash2, X, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getTopics, getScenes, getDeficits, saveDeficit, deleteDeficit, ml,
  type AppTopic, type AppScene, type AppDeficit,
} from '../data/appData'
import { WICHTIGKEIT_TABLE, KRITERIUM_LABELS, calcRelevanzSD, calcUnfallrisiko, nacaToSchwere } from '../data/scoringEngine'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import type { NacaRaw } from '../data/scoringEngine'

// ── Badge-Farben ──
function riskBg(w: RSIDimension): { bg: string; color: string; label: string } {
  if (w === 'gross')  return { bg: '#D4005322', color: '#D40053', label: 'N' }
  if (w === 'mittel') return { bg: '#B8730022', color: '#B87300', label: 'A' }
  return { bg: '#1A7F1F22', color: '#1A7F1F', label: 'W' }
}

function emptyDeficit(sceneId: string, topicId: string): AppDeficit {
  return {
    id: `d-${Date.now()}`,
    sceneId, topicId,
    nameI18n:        { de: '', fr: '', it: '', en: '' },
    beschreibungI18n:{ de: '', fr: '', it: '', en: '' },
    kriteriumId: 'fussgaengerstreifen',
    kontext: 'io',
    correctAssessment: {
      wichtigkeit: 'mittel', abweichung: 'mittel',
      relevanzSD: 'mittel', naca: 2,
      unfallschwere: 'mittel', unfallrisiko: 'mittel',
    },
    isPflicht: true, isBooster: false,
    normRefs: ['SN 641 723'],
  }
}

// Automatisch Relevanz und Unfallrisiko neu berechnen
function recompute(d: AppDeficit): AppDeficit {
  const rs = calcRelevanzSD(d.correctAssessment.wichtigkeit, d.correctAssessment.abweichung)
  const us = nacaToSchwere(d.correctAssessment.naca)
  const ur = calcUnfallrisiko(rs, us)
  return {
    ...d,
    correctAssessment: {
      ...d.correctAssessment,
      relevanzSD: rs,
      unfallschwere: us,
      unfallrisiko: ur,
    },
  }
}

interface Props { onBack: () => void }

// Einfaches Textfeld fuer mehrsprachige Felder
function MLInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }} />
    </div>
  )
}

export default function AdminDashboard({ onBack: _onBack }: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const [topics, setTopics] = useState<AppTopic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<AppTopic | null>(null)
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [selectedScene, setSelectedScene] = useState<AppScene | null>(null)
  const [deficits, setDeficits] = useState<AppDeficit[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AppDeficit | null>(null)

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
    if (!selectedScene || !selectedTopic) return
    setEditing(emptyDeficit(selectedScene.id, selectedTopic.id))
    setModalOpen(true)
  }
  function openEdit(d: AppDeficit) { setEditing({ ...d }); setModalOpen(true) }
  function handleDelete(id: string) {
    deleteDeficit(id)
    setDeficits(prev => prev.filter(d => d.id !== id))
  }
  function handleSave() {
    if (!editing) return
    const computed = recompute(editing)
    saveDeficit(computed)
    setDeficits(getDeficits(computed.sceneId))
    setModalOpen(false)
  }

  function setCA<K extends keyof AppDeficit['correctAssessment']>(k: K, v: AppDeficit['correctAssessment'][K]) {
    if (!editing) return
    setEditing(prev => prev ? { ...prev, correctAssessment: { ...prev.correctAssessment, [k]: v } } : prev)
  }
  function setML(field: 'nameI18n' | 'beschreibungI18n', l: string, v: string) {
    if (!editing) return
    setEditing(prev => prev ? { ...prev, [field]: { ...prev[field], [l]: v } } : prev)
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'var(--zh-font)' }}>
      {/* Sidebar */}
      <aside style={{ width: '200px', minWidth: '200px', borderRight: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', display: 'flex', flexDirection: 'column', padding: '16px 0', overflowY: 'auto' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)', padding: '0 16px 8px' }}>Themenbereiche</p>
        {topics.map(tp => (
          <button key={tp.id} onClick={() => setSelectedTopic(tp)}
            style={{ textAlign: 'left', padding: '10px 16px', fontSize: '13px', fontWeight: selectedTopic?.id === tp.id ? 700 : 500, color: selectedTopic?.id === tp.id ? 'var(--zh-color-accent)' : 'var(--zh-color-text)', borderLeft: selectedTopic?.id === tp.id ? '3px solid var(--zh-blau)' : '3px solid transparent', background: selectedTopic?.id === tp.id ? 'rgba(0,118,189,0.07)' : 'transparent', border: 'none', cursor: 'pointer' }}>
            {ml(tp.nameI18n, lang)}
          </button>
        ))}
      </aside>

      {/* Hauptbereich */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {/* Szenen-Chips */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)', marginBottom: '10px' }}>Szenen</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {scenes.map(sc => (
              <button key={sc.id} onClick={() => setSelectedScene(sc)}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--zh-color-border)', background: selectedScene?.id === sc.id ? 'var(--zh-dunkelblau)' : 'var(--zh-color-surface)', color: selectedScene?.id === sc.id ? 'white' : 'var(--zh-color-text)', cursor: 'pointer' }}>
                {ml(sc.nameI18n, lang).slice(0, 30)}{ml(sc.nameI18n, lang).length > 30 ? '…' : ''}
                <span style={{ marginLeft: '5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.7 }}>{sc.kontext}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Defizit-Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>Defizite</h2>
            {selectedScene && <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '2px' }}>{deficits.length} in dieser Szene</p>}
          </div>
          <button onClick={openNew} disabled={!selectedScene}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: selectedScene ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)', color: selectedScene ? 'white' : 'var(--zh-color-text-disabled)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: selectedScene ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} /> Neues Defizit
          </button>
        </div>

        {/* Defizit-Rows */}
        {!selectedScene ? (
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>Szene auswählen</p>
        ) : deficits.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>Keine Defizite definiert.</p>
        ) : (
          <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', overflow: 'hidden', background: 'var(--zh-color-surface)' }}>
            {deficits.map((d, i) => {
              const badge = riskBg(d.correctAssessment.wichtigkeit)
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: i < deficits.length - 1 ? '1px solid var(--zh-color-border)' : 'none', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, background: badge.bg, color: badge.color, letterSpacing: '0.08em', flexShrink: 0 }}>{badge.label}</span>
                    {d.isPflicht && <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: 'rgba(212,0,83,0.12)', color: '#D40053', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Pflicht</span>}
                    {d.isBooster && <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: 'rgba(184,115,0,0.12)', color: '#B87300', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Booster</span>}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--zh-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ml(d.nameI18n, lang)}</p>
                      <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ml(d.beschreibungI18n, lang)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(d)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '12px', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                      <Pencil size={11} /> Bearbeiten
                    </button>
                    <button onClick={() => handleDelete(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '12px', color: '#D40053', cursor: 'pointer' }}>
                      <Trash2 size={11} /> Löschen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {modalOpen && editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div style={{ width: '680px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
                {editing.id.startsWith('d-') ? 'Neues Defizit' : 'Defizit bearbeiten'}
              </h3>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
            </div>

            {/* Name + Beschreibung DE/FR/IT/EN */}
            <Section label="Bezeichnung">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLInput key={l} label={l.toUpperCase()} value={editing.nameI18n[l]} onChange={v => setML('nameI18n', l, v)} />
                ))}
              </div>
            </Section>
            <Section label="Beschreibung">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLInput key={l} label={l.toUpperCase()} value={editing.beschreibungI18n[l]} onChange={v => setML('beschreibungI18n', l, v)} />
                ))}
              </div>
            </Section>

            {/* Kriterium + Kontext */}
            <Section label="Kriterium & Kontext">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sicherheitskriterium</div>
                  <select value={editing.kriteriumId} onChange={e => setEditing(prev => prev ? { ...prev, kriteriumId: e.target.value } : prev)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
                    {Object.entries(KRITERIUM_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Kontext</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['io','ao'] as const).map(k => (
                      <button key={k} onClick={() => setEditing(prev => prev ? { ...prev, kontext: k } : prev)}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: editing.kontext === k ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)', background: editing.kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)', color: editing.kontext === k ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        {k === 'io' ? 'Innerorts' : 'Ausserorts'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Vorschau Wichtigkeit */}
              {WICHTIGKEIT_TABLE[editing.kriteriumId] && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                  Wichtigkeit gemaess Tabelle: <strong style={{ color: 'var(--zh-blau)' }}>{WICHTIGKEIT_TABLE[editing.kriteriumId][editing.kontext] || '—'}</strong>
                </div>
              )}
            </Section>

            {/* correctAssessment */}
            <Section label="RSI-Bewertung (Lösung)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <SelectField label="Wichtigkeit" value={editing.correctAssessment.wichtigkeit}
                  options={[['gross','Gross'],['mittel','Mittel'],['klein','Klein']]}
                  onChange={v => setCA('wichtigkeit', v as RSIDimension)} />
                <SelectField label="Abweichung" value={editing.correctAssessment.abweichung}
                  options={[['gross','Gross'],['mittel','Mittel'],['klein','Klein']]}
                  onChange={v => setCA('abweichung', v as RSIDimension)} />
                <SelectField label="NACA (0–7)" value={String(editing.correctAssessment.naca)}
                  options={['0','1','2','3','4','5','6','7'].map(n => [n, `NACA ${n}`])}
                  onChange={v => setCA('naca', Number(v) as NacaRaw)} />
              </div>
              {/* Auto-berechnete Felder */}
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--zh-color-bg-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {(() => {
                  const rs = calcRelevanzSD(editing.correctAssessment.wichtigkeit, editing.correctAssessment.abweichung) as ResultDimension
                  const us = nacaToSchwere(editing.correctAssessment.naca) as NACADimension
                  const ur = calcUnfallrisiko(rs, us) as ResultDimension
                  return (
                    <>
                      <AutoField label="Relevanz SD" value={rs} />
                      <AutoField label="Unfallschwere" value={us} />
                      <AutoField label="Unfallrisiko" value={ur} />
                    </>
                  )
                })()}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginTop: '4px' }}>Relevanz SD, Unfallschwere und Unfallrisiko werden automatisch berechnet.</p>
            </Section>

            {/* isPflicht / isBooster */}
            <Section label="Eigenschaften">
              <div style={{ display: 'flex', gap: '16px' }}>
                {([['isPflicht','Pflicht-Defizit'],['isBooster','Booster']] as const).map(([field, lbl]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editing[field]} onChange={e => setEditing(prev => prev ? { ...prev, [field]: e.target.checked } : prev)} />
                    {lbl}
                  </label>
                ))}
              </div>
            </Section>

            {/* normRefs */}
            <Section label="Normreferenzen (kommagetrennt)">
              <input value={editing.normRefs.join(', ')} onChange={e => setEditing(prev => prev ? { ...prev, normRefs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : prev)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }} />
            </Section>

            {/* Position + Toleranz */}
            <Section label="360°-Position (theta 0–360° / phi 0–180°)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['theta','phi'] as const).map(axis => (
                  <div key={axis}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{axis}</div>
                    <input
                      type="number" min={0} max={axis === 'theta' ? 360 : 180} step={1}
                      value={editing.position?.[axis] ?? ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        setEditing(prev => prev ? {
                          ...prev,
                          position: { theta: prev.position?.theta ?? 0, phi: prev.position?.phi ?? 90, [axis]: isNaN(val) ? 0 : val },
                        } : prev)
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Toleranz: {editing.tolerance ?? 15}°
                </div>
                <input
                  type="range" min={5} max={30} step={1}
                  value={editing.tolerance ?? 15}
                  onChange={e => setEditing(prev => prev ? { ...prev, tolerance: parseInt(e.target.value) } : prev)}
                  style={{ width: '100%' }}
                />
              </div>
            </Section>

            {/* Kategorie */}
            <Section label="Kategorie">
              <select
                value={editing.kategorie ?? ''}
                onChange={e => setEditing(prev => prev ? { ...prev, kategorie: e.target.value as AppDeficit['kategorie'] || undefined } : prev)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}
              >
                <option value="">— keine —</option>
                <option value="verkehrsfuehrung">Verkehrsführung</option>
                <option value="sicht">Sicht</option>
                <option value="ausruestung">Ausrüstung</option>
                <option value="zustand">Zustand Verkehrsfläche</option>
                <option value="strassenrand">Strassenrand</option>
                <option value="verkehrsablauf">Verkehrsablauf</option>
                <option value="baustelle">Baustelle</option>
              </select>
            </Section>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', border: '1px solid var(--zh-color-border)', background: 'transparent', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Save size={14} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)', marginBottom: '8px' }}>{label}</p>
      {children}
    </div>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: [string,string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

function AutoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--zh-blau)' }}>{value}</div>
    </div>
  )
}
