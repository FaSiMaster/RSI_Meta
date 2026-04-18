// AdminDashboard – Tab-Navigation: Defizite | Themen | Kurse
// Defizite: Sidebar + Szenen-Chips + Defizit-CRUD + Szenen-CRUD
// Themen: Hierarchie-Ansicht + Thema-Modal
// Kurse: Kurs-Tabelle + Kurs-Modal

import { Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronRight, ChevronUp, Download, Upload, Eye, EyeOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getTopics, saveTopic, deleteTopic,
  getScenes, saveScene, deleteScene, getAllScenes,
  getDeficits, saveDeficit, deleteDeficit, getAllDeficits,
  getKurse, saveKurs, deleteKurs, getKursStatus,
  getTopicsTree, getOberthemen, getNextSortOrder, ml,
  type AppTopic, type AppScene, type AppDeficit, type TopicNode, type Kurs, type StrassenMerkmal,
} from '../data/appData'
import { WICHTIGKEIT_TABLE, calcRelevanzSD, calcUnfallrisiko, nacaToSchwere } from '../data/scoringEngine'
import { KRITERIUM_LABELS } from '../data/kriteriumLabels'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import type { NacaRaw } from '../data/scoringEngine'
import BildEditor from './admin/BildEditor'
import { STRASSENMERKMALE_KATALOG } from '../data/strassenmerkmale'
import BildUpload from './admin/BildUpload'
import AdminRanking from './admin/AdminRanking'

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
    verortung: null,
  }
}

function emptyScene(topicId: string): AppScene {
  return {
    id: `sc-${Date.now()}`,
    topicId,
    nameI18n: { de: '', fr: '', it: '', en: '' },
    beschreibungI18n: { de: '', fr: '', it: '', en: '' },
    kontext: 'io',
    strassenmerkmale: [],
    vorschauBilder: [],
    vorschauBild1: null,
    vorschauBild2: null,
    panoramaBildUrl: null,
    startblick: null,
    isActive: true,
  }
}

function emptyTopic(parentTopicId: string | null = null): AppTopic {
  return {
    id: `tp-${Date.now()}`,
    nameI18n: { de: '', fr: '', it: '', en: '' },
    beschreibungI18n: { de: '', fr: '', it: '', en: '' },
    sortOrder: getNextSortOrder(parentTopicId),
    isActive: true,
    parentTopicId,
    createdAt: Date.now(),
  }
}

function emptyKurs(): Kurs {
  return {
    id: `k-${Date.now()}`,
    name: '',
    datum: new Date().toISOString().slice(0, 10),
    zugangscode: '',
    topicIds: [],
    isActive: true,
    createdAt: Date.now(),
    gueltigVon: null,
    gueltigBis: null,
    passwort: null,
  }
}

function generateKursCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString()
  return `FK-RSI-${digits}`
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

// Einfaches Textfeld für mehrsprachige Felder
function MLInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <input value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
    </div>
  )
}

// Mehrsprachiges Textarea
function MLTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', resize: 'vertical', boxSizing: 'border-box' }} />
    </div>
  )
}

type AdminTab = 'defizite' | 'themen' | 'kurse' | 'rangliste'
type VorschauModus = 'kein' | 'panorama' | 'upload'

function getVorschauModus(val: string | null | undefined): VorschauModus {
  if (!val) return 'kein'
  if (val === 'panorama') return 'panorama'
  return 'upload'
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [activeTab, setActiveTab] = useState<AdminTab>('defizite')
  const [importFeedback, setImportFeedback] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  // ── Defizite-Tab State ──
  const [topics, setTopics] = useState<AppTopic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<AppTopic | null>(null)
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [selectedScene, setSelectedScene] = useState<AppScene | null>(null)
  const [deficits, setDeficits] = useState<AppDeficit[]>([])
  const [defModalOpen, setDefModalOpen] = useState(false)
  const [editingDef, setEditingDef] = useState<AppDeficit | null>(null)

  // Szene-Modal State
  const [szeneModalOpen, setSzeneModalOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<AppScene | null>(null)
  const [szeneIsNew, setSzeneIsNew] = useState(false)

  // Panorama-Vorschau State (nach BildUpload)
  const [panoramaVorschau, setPanoramaVorschau] = useState<{
    url: string; breite: number; hoehe: number
  } | null>(null)

  // BildEditor State
  const [bildEditorOpen, setBildEditorOpen] = useState(false)
  const [bildEditorDeficitId, setBildEditorDeficitId] = useState<string | undefined>()

  // ── Themen-Tab State ──
  const [topicsTree, setTopicsTree] = useState<TopicNode[]>([])
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [themaModalOpen, setThemaModalOpen] = useState(false)
  const [editingThema, setEditingThema] = useState<AppTopic | null>(null)
  const [themaTyp, setThemaTyp] = useState<'ober' | 'unter'>('ober')

  // Vorschaubild-Modus für das Szene-Modal
  const [vorschau1Modus, setVorschau1Modus] = useState<VorschauModus>('kein')
  const [vorschau2Modus, setVorschau2Modus] = useState<VorschauModus>('kein')
  const [szeneGespeichertFeedback, setSzeneGespeichertFeedback] = useState(false)

  // ── Kurse-Tab State ──
  const [kurse, setKurse] = useState<Kurs[]>([])
  const [kursModalOpen, setKursModalOpen] = useState(false)
  const [editingKurs, setEditingKurs] = useState<Kurs | null>(null)
  const [showKursPasswort, setShowKursPasswort] = useState(false)

  // Daten laden
  useEffect(() => {
    const ts = getTopics()
    setTopics(ts)
    if (ts.length > 0) setSelectedTopic(ts[0])
    setTopicsTree(getTopicsTree())
    setKurse(getKurse())
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

  // ── Defizit-Aktionen ──
  function openNewDef() {
    if (!selectedScene || !selectedTopic) return
    setEditingDef(emptyDeficit(selectedScene.id, selectedTopic.id))
    setDefModalOpen(true)
  }
  function openEditDef(d: AppDeficit) { setEditingDef({ ...d }); setDefModalOpen(true) }
  function handleDeleteDef(id: string) {
    deleteDeficit(id)
    setDeficits(prev => prev.filter(d => d.id !== id))
  }
  function handleSaveDef() {
    if (!editingDef) return
    const computed = recompute(editingDef)
    saveDeficit(computed)
    setDeficits(getDeficits(computed.sceneId))
    setDefModalOpen(false)
  }
  function setCA<K extends keyof AppDeficit['correctAssessment']>(k: K, v: AppDeficit['correctAssessment'][K]) {
    if (!editingDef) return
    setEditingDef(prev => prev ? { ...prev, correctAssessment: { ...prev.correctAssessment, [k]: v } } : prev)
  }
  function setML(field: 'nameI18n' | 'beschreibungI18n', l: string, v: string) {
    if (!editingDef) return
    setEditingDef(prev => prev ? { ...prev, [field]: { ...prev[field], [l]: v } } : prev)
  }

  // ── Szene-Aktionen ──
  function openNewScene() {
    if (!selectedTopic) return
    setEditingScene(emptyScene(selectedTopic.id))
    setPanoramaVorschau(null)
    setSzeneIsNew(true)
    setVorschau1Modus('kein')
    setVorschau2Modus('kein')
    setSzeneModalOpen(true)
  }
  function openEditScene(scene: AppScene) {
    setEditingScene({ ...scene })
    setPanoramaVorschau(null)
    setSzeneIsNew(false)
    setVorschau1Modus(getVorschauModus(scene.vorschauBild1))
    setVorschau2Modus(getVorschauModus(scene.vorschauBild2))
    setSzeneModalOpen(true)
  }
  function handleDeleteScene(id: string) {
    deleteScene(id)
    if (selectedTopic) {
      const sc = getScenes(selectedTopic.id)
      setScenes(sc)
      if (selectedScene?.id === id) setSelectedScene(sc[0] ?? null)
    }
  }
  function handleSaveScene() {
    if (!editingScene) return
    // vorschauBilder (Legacy) normalisieren
    const vorschauBilder = (editingScene.vorschauBilder ?? []).filter(s => s.trim().length > 0)
    // Strassenmerkmale: FR/IT/EN mit DE-Wert vorbefüllen wenn leer
    const strassenmerkmale = (editingScene.strassenmerkmale ?? []).map(m => ({
      ...m,
      labelI18n: {
        de: m.labelI18n.de,
        fr: m.labelI18n.fr || m.labelI18n.de,
        it: m.labelI18n.it || m.labelI18n.de,
        en: m.labelI18n.en || m.labelI18n.de,
      },
      wertI18n: {
        de: m.wertI18n.de,
        fr: m.wertI18n.fr || m.wertI18n.de,
        it: m.wertI18n.it || m.wertI18n.de,
        en: m.wertI18n.en || m.wertI18n.de,
      },
    }))
    saveScene({ ...editingScene, vorschauBilder, strassenmerkmale })
    if (selectedTopic) {
      const sc = getScenes(selectedTopic.id)
      setScenes(sc)
      const updated = sc.find(s => s.id === editingScene.id) ?? sc[0] ?? null
      if (!selectedScene) setSelectedScene(updated)
      else setSelectedScene(sc.find(s => s.id === selectedScene.id) ?? selectedScene)
    }
    setSzeneModalOpen(false)
    setSzeneGespeichertFeedback(true)
    setTimeout(() => setSzeneGespeichertFeedback(false), 3000)
  }
  function setSceneML(field: 'nameI18n' | 'beschreibungI18n', l: string, v: string) {
    if (!editingScene) return
    setEditingScene(prev => prev ? { ...prev, [field]: { ...(prev[field] ?? { de:'', fr:'', it:'', en:'' }), [l]: v } } : prev)
  }
  // Merkmale aus dem Katalog initialisieren (falls leer)
  function initMerkmaleFromKatalog() {
    if (!editingScene) return
    const existing = editingScene.strassenmerkmale ?? []
    if (existing.length > 0) return // Bereits befüllt
    const merkmale: StrassenMerkmal[] = []
    for (const kat of STRASSENMERKMALE_KATALOG) {
      for (const m of kat.merkmale) {
        merkmale.push({
          id: m.id,
          labelI18n: { de: m.label, fr: m.label, it: m.label, en: m.label },
          wertI18n: { de: '', fr: '', it: '', en: '' },
        })
      }
    }
    setEditingScene(prev => prev ? { ...prev, strassenmerkmale: merkmale } : prev)
  }
  function addMerkmal() {
    if (!editingScene) return
    const neu: StrassenMerkmal = {
      labelI18n: { de: '', fr: '', it: '', en: '' },
      wertI18n: { de: '', fr: '', it: '', en: '' },
    }
    setEditingScene(prev => prev ? { ...prev, strassenmerkmale: [...(prev.strassenmerkmale ?? []), neu] } : prev)
  }
  function updateMerkmal(i: number, field: 'labelI18n' | 'wertI18n', val: string) {
    if (!editingScene) return
    setEditingScene(prev => {
      if (!prev) return prev
      const list = [...(prev.strassenmerkmale ?? [])]
      list[i] = { ...list[i], [field]: { ...list[i][field], de: val } }
      return { ...prev, strassenmerkmale: list }
    })
  }
  function removeMerkmal(i: number) {
    if (!editingScene) return
    setEditingScene(prev => {
      if (!prev) return prev
      const list = [...(prev.strassenmerkmale ?? [])]
      list.splice(i, 1)
      return { ...prev, strassenmerkmale: list }
    })
  }

  // ── Themen-Aktionen ──
  function toggleExpand(id: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function openNewThema() {
    setEditingThema(emptyTopic())
    setThemaTyp('ober')
    setThemaModalOpen(true)
  }
  function handleSaveThema() {
    if (!editingThema) return
    const thema: AppTopic = {
      ...editingThema,
      parentTopicId: themaTyp === 'unter' ? (editingThema.parentTopicId ?? null) : null,
    }
    saveTopic(thema)
    setTopics(getTopics())
    setTopicsTree(getTopicsTree())
    setThemaModalOpen(false)
  }
  function handleArchiveThema(id: string) {
    const all = getTopics()
    const tp = all.find(x => x.id === id)
    if (!tp) return
    saveTopic({ ...tp, isActive: false })
    setTopics(getTopics())
    setTopicsTree(getTopicsTree())
  }
  function moveThema(id: string, dir: 'up' | 'down') {
    const all = getTopics()
    const item = all.find(t => t.id === id)
    if (!item) return
    // Nur Geschwister sortieren (gleiche Ebene: gleicher parentTopicId)
    const siblings = all
      .filter(t => (t.parentTopicId ?? null) === (item.parentTopicId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = siblings.findIndex(t => t.id === id)
    if (idx < 0) return
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return
    // Zuerst alle Geschwister normalisieren (1, 2, 3, ...) — verhindert Duplikate
    siblings.forEach((s, i) => { s.sortOrder = i + 1 })
    // Dann die beiden tauschen
    const tmp = siblings[idx].sortOrder
    siblings[idx].sortOrder = siblings[swapIdx].sortOrder
    siblings[swapIdx].sortOrder = tmp
    // Alle betroffenen speichern
    saveTopic({ ...siblings[idx] })
    saveTopic({ ...siblings[swapIdx] })
    setTopics(getTopics())
    setTopicsTree(getTopicsTree())
  }
  function setThemaML(field: 'nameI18n' | 'beschreibungI18n', l: string, v: string) {
    if (!editingThema) return
    setEditingThema(prev => prev ? { ...prev, [field]: { ...prev[field], [l]: v } } : prev)
  }

  // ── Kurs-Aktionen ──
  function openNewKurs() {
    setEditingKurs(emptyKurs())
    setKursModalOpen(true)
  }
  function openEditKurs(k: Kurs) {
    setEditingKurs({ ...k })
    setKursModalOpen(true)
  }
  function handleSaveKurs() {
    if (!editingKurs) return
    saveKurs(editingKurs)
    setKurse(getKurse())
    setKursModalOpen(false)
  }
  function handleToggleKurs(k: Kurs) {
    saveKurs({ ...k, isActive: !k.isActive })
    setKurse(getKurse())
  }
  function handleDeleteKurs(id: string) {
    deleteKurs(id)
    setKurse(getKurse())
  }

  // ── Export / Import ──
  function handleExport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 'rsi-v3',
      topics:   getTopics(),
      scenes:   getAllScenes(),
      deficits: getAllDeficits(),
      kurse:    getKurse(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const datum = new Date().toISOString().slice(0, 10)
    a.href     = url
    a.download = `rsi-daten-${datum}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.version !== 'rsi-v3') throw new Error('Falsches Format')
        if (data.topics)   { data.topics.forEach(saveTopic) }
        if (data.scenes)   { data.scenes.forEach(saveScene) }
        if (data.deficits) { data.deficits.forEach(saveDeficit) }
        if (data.kurse)    { data.kurse.forEach(saveKurs) }
        // Alle States neu laden
        const ts = getTopics()
        setTopics(ts)
        setTopicsTree(getTopicsTree())
        setKurse(getKurse())
        if (selectedTopic) {
          const sc = getScenes(selectedTopic.id)
          setScenes(sc)
          setSelectedScene(sc[0] ?? null)
        }
        const count = (data.topics?.length ?? 0) + (data.scenes?.length ?? 0) + (data.deficits?.length ?? 0)
        setImportFeedback(`Import erfolgreich: ${count} Datensätze geladen.`)
        setTimeout(() => setImportFeedback(null), 4000)
      } catch {
        setImportFeedback('Fehler: Datei konnte nicht importiert werden.')
        setTimeout(() => setImportFeedback(null), 4000)
      }
    }
    reader.readAsText(file)
  }

  function toggleKursTopic(topicId: string) {
    if (!editingKurs) return
    const ids = editingKurs.topicIds.includes(topicId)
      ? editingKurs.topicIds.filter(id => id !== topicId)
      : [...editingKurs.topicIds, topicId]
    setEditingKurs(prev => prev ? { ...prev, topicIds: ids } : prev)
  }

  // ── Tab-Pill-Style ──
  const tabPill = (tab: AdminTab, label: string) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '7px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        border: activeTab === tab ? 'none' : '1px solid var(--zh-color-border)',
        background: activeTab === tab ? 'var(--zh-dunkelblau)' : 'transparent',
        color: activeTab === tab ? 'white' : 'var(--zh-color-text-muted)',
        fontFamily: 'var(--zh-font)',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', fontFamily: 'var(--zh-font)' }}>

      {/* Sidebar (nur bei Defizite-Tab) */}
      {activeTab === 'defizite' && (
        <aside style={{ width: '200px', minWidth: '200px', borderRight: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', display: 'flex', flexDirection: 'column', padding: '16px 0', overflowY: 'auto' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)', padding: '0 16px 8px' }}>
            {t('admin.topics')}
          </p>
          {topics.map(tp => (
            <button key={tp.id} onClick={() => setSelectedTopic(tp)}
              style={{ textAlign: 'left', padding: '10px 16px', fontSize: '13px', fontWeight: selectedTopic?.id === tp.id ? 700 : 500, color: selectedTopic?.id === tp.id ? 'var(--zh-color-accent)' : 'var(--zh-color-text)', borderLeft: selectedTopic?.id === tp.id ? '3px solid var(--zh-blau)' : '3px solid transparent', background: selectedTopic?.id === tp.id ? 'rgba(0,118,189,0.07)' : 'transparent', border: 'none', cursor: 'pointer' }}>
              {ml(tp.nameI18n, lang)}
            </button>
          ))}
        </aside>
      )}

      {/* Hauptbereich */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

        {/* Tab-Navigation + Export/Import */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {tabPill('defizite', t('admin.deficits'))}
            {tabPill('themen', t('admin.topics'))}
            {tabPill('kurse', t('admin.kurse'))}
            {tabPill('rangliste', t('admin.rangliste_titel'))}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Feedback */}
            {importFeedback && (
              <span style={{ fontSize: '12px', color: importFeedback.startsWith('Fehler') ? '#D40053' : '#1A7F1F', fontWeight: 600 }}>
                {importFeedback}
              </span>
            )}
            {szeneGespeichertFeedback && (
              <span style={{ fontSize: '12px', color: '#1A7F1F', fontWeight: 600 }}>
                {t('admin.gespeichert_einstieg')}
              </span>
            )}
            {/* Verstecktes File-Input */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) { handleImport(e.target.files[0]); e.target.value = '' } }}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}
            >
              <Upload size={12} /> Importieren
            </button>
            <button
              onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, border: 'none', background: 'var(--zh-dunkelblau)', color: 'white', cursor: 'pointer' }}
            >
              <Download size={12} /> Exportieren
            </button>
          </div>
        </div>

        {/* ═══ TAB: DEFIZITE ═══ */}
        {activeTab === 'defizite' && (
          <>
            {/* Szenen-Chips + Neue Szene */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)' }}>
                  {t('admin.scenes')}
                </p>
                <button onClick={openNewScene} disabled={!selectedTopic}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', color: 'var(--zh-color-text)', cursor: selectedTopic ? 'pointer' : 'not-allowed', opacity: selectedTopic ? 1 : 0.5 }}>
                  <Plus size={11} /> {t('admin.szene_neu')}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {scenes.map(sc => {
                  const isSelected = selectedScene?.id === sc.id
                  const name = ml(sc.nameI18n, lang)
                  return (
                    <div key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${isSelected ? 'var(--zh-blau)' : 'var(--zh-color-border)'}`, background: isSelected ? 'rgba(0,118,189,0.07)' : 'var(--zh-color-surface)' }}>
                      <button onClick={() => setSelectedScene(sc)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--zh-blau)' : 'var(--zh-color-text)' }}>
                          {name.slice(0, 40)}{name.length > 40 ? '…' : ''}
                        </span>
                        <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: isSelected ? 'var(--zh-blau)' : 'var(--zh-color-text-disabled)', opacity: 0.8 }}>{sc.kontext}</span>
                      </button>
                      <button onClick={() => openEditScene(sc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '11px', color: 'var(--zh-color-text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                        <Pencil size={10} /> {t('admin.editBtn')}
                      </button>
                      <button onClick={() => handleDeleteScene(sc.id)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: '#D40053', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={10} /> {t('admin.deleteBtn')}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Defizit-Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{t('admin.deficits')}</h2>
                {selectedScene && <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '2px' }}>{deficits.length} in dieser Szene</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* BildEditor öffnen (nur wenn Szene mit Panorama vorhanden) */}
                {selectedScene?.panoramaBildUrl && (
                  <button
                    onClick={() => { setBildEditorDeficitId(undefined); setBildEditorOpen(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: 'rgba(0,118,189,0.12)', color: 'var(--zh-blau)', fontWeight: 700, fontSize: '13px', border: '1px solid rgba(0,118,189,0.3)', cursor: 'pointer' }}>
                    {t('admin.panorama_editor')}
                  </button>
                )}
                <button onClick={openNewDef} disabled={!selectedScene}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: selectedScene ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)', color: selectedScene ? 'white' : 'var(--zh-color-text-disabled)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: selectedScene ? 'pointer' : 'not-allowed' }}>
                  <Plus size={14} /> {t('admin.newDeficit')}
                </button>
              </div>
            </div>

            {/* Defizit-Rows */}
            {!selectedScene ? (
              <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>Szene auswählen</p>
            ) : deficits.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>{t('admin.noDeficits')}</p>
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
                        {d.verortung && <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: 'rgba(0,118,189,0.1)', color: 'var(--zh-blau)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>{d.verortung.typ}</span>}
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--zh-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ml(d.nameI18n, lang)}</p>
                          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ml(d.beschreibungI18n, lang)}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => openEditDef(d)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '12px', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                          <Pencil size={11} /> {t('admin.editBtn')}
                        </button>
                        <button onClick={() => handleDeleteDef(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '12px', color: '#D40053', cursor: 'pointer' }}>
                          <Trash2 size={11} /> {t('admin.deleteBtn')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: THEMEN ═══ */}
        {activeTab === 'themen' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{t('admin.topics')}</h2>
              <button onClick={openNewThema}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> {t('admin.thema_neu')}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topicsTree.map(node => (
                <div key={node.topic.id} style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden' }}>
                  {/* Oberthema-Zeile */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: expandedTopics.has(node.topic.id) && node.children.length > 0 ? '1px solid var(--zh-color-border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {node.children.length > 0 ? (
                        <button onClick={() => toggleExpand(node.topic.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: 0, display: 'flex' }}>
                          {expandedTopics.has(node.topic.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      ) : (
                        <span style={{ width: '16px' }} />
                      )}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{ml(node.topic.nameI18n, lang)}</span>
                      {!node.topic.isActive && (
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-disabled)', background: 'var(--zh-color-bg-tertiary)', padding: '2px 7px', borderRadius: '4px' }}>Archiviert</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button onClick={() => moveThema(node.topic.id, 'up')} style={{ background: 'none', border: '1px solid var(--zh-color-border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: '3px 6px', display: 'flex' }}>
                        <ChevronUp size={13} />
                      </button>
                      <button onClick={() => moveThema(node.topic.id, 'down')} style={{ background: 'none', border: '1px solid var(--zh-color-border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: '3px 6px', display: 'flex' }}>
                        <ChevronDown size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingThema(emptyTopic(node.topic.id))
                          setThemaTyp('unter')
                          setThemaModalOpen(true)
                        }}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '11px', fontWeight: 600, color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                        + {t('admin.gruppe_neu')}
                      </button>
                      <button onClick={() => handleArchiveThema(node.topic.id)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '11px', fontWeight: 600, color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                        {t('admin.thema_archivieren')}
                      </button>
                    </div>
                  </div>

                  {/* Unterthemen */}
                  {expandedTopics.has(node.topic.id) && node.children.map((child, ci) => (
                    <div key={child.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 10px 42px', borderBottom: ci < node.children.length - 1 ? '1px solid var(--zh-color-border)' : 'none', background: 'var(--zh-color-bg-secondary)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--zh-color-text)' }}>{ml(child.nameI18n, lang)}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleArchiveThema(child.id)}
                          style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'transparent', fontSize: '11px', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                          {t('admin.thema_archivieren')}
                        </button>
                        <button onClick={() => { deleteTopic(child.id); setTopics(getTopics()); setTopicsTree(getTopicsTree()) }}
                          style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: '#D40053', cursor: 'pointer' }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ═══ TAB: KURSE ═══ */}
        {activeTab === 'kurse' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{t('admin.kurse')}</h2>
              <button onClick={openNewKurs}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Plus size={14} /> {t('admin.kurs_neu')}
              </button>
            </div>

            {kurse.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>Noch keine Kurse erfasst.</p>
            ) : (
              <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', overflow: 'hidden', background: 'var(--zh-color-surface)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--zh-color-bg-secondary)', borderBottom: '1px solid var(--zh-color-border)' }}>
                      {[t('admin.kurs_name'), t('admin.kurs_datum'), t('admin.kurs_code'), t('admin.kurs_aktiv'), 'Aktionen'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kurse.map((k, i) => (
                      <tr key={k.id} style={{ borderBottom: i < kurse.length - 1 ? '1px solid var(--zh-color-border)' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--zh-color-text)' }}>{k.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--zh-color-text-muted)' }}>{k.datum}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <code style={{ fontSize: '12px', background: 'var(--zh-color-bg-secondary)', padding: '2px 8px', borderRadius: '4px', color: 'var(--zh-blau)', fontFamily: 'monospace' }}>{k.zugangscode}</code>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {(() => {
                            const status = getKursStatus(k)
                            const statusConfig = {
                              aktiv:     { bg: 'rgba(26,127,31,0.1)',   color: '#1A7F1F',                    label: t('kurs.aktiv') },
                              bald:      { bg: 'rgba(0,118,189,0.1)',   color: 'var(--zh-blau)',             label: t('kurs.bald') },
                              abgelaufen:{ bg: 'var(--zh-color-bg-tertiary)', color: 'var(--zh-color-text-disabled)', label: t('kurs.abgelaufen') },
                              inaktiv:   { bg: 'var(--zh-color-bg-tertiary)', color: 'var(--zh-color-text-disabled)', label: 'Inaktiv' },
                            }[status]
                            return (
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: statusConfig.bg, color: statusConfig.color }}>
                                {statusConfig.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => openEditKurs(k)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '11px', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                              <Pencil size={10} /> {t('admin.editBtn')}
                            </button>
                            <button onClick={() => handleToggleKurs(k)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'transparent', fontSize: '11px', color: 'var(--zh-color-text-muted)', cursor: 'pointer' }}>
                              {t('admin.kurs_deaktivieren')}
                            </button>
                            <button onClick={() => handleDeleteKurs(k.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: '#D40053', cursor: 'pointer' }}>
                              <Trash2 size={10} /> {t('admin.kurs_löschen')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: RANGLISTE ═══ */}
        {activeTab === 'rangliste' && (
          <AdminRanking />
        )}
      </main>

      {/* ═══ MODAL: DEFIZIT ═══ */}
      {defModalOpen && editingDef && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDefModalOpen(false) }}>
          <div style={{ width: '680px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
                {editingDef.id.startsWith('d-') ? t('admin.modalTitleNew') : t('admin.modalTitleEdit')}
              </h3>
              <button onClick={() => setDefModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
            </div>

            <Section label={t('admin.fieldTitle')}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLInput key={l} label={l.toUpperCase()} value={editingDef.nameI18n[l]} onChange={v => setML('nameI18n', l, v)} />
                ))}
              </div>
            </Section>
            <Section label={t('admin.fieldDesc')}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLInput key={l} label={l.toUpperCase()} value={editingDef.beschreibungI18n[l]} onChange={v => setML('beschreibungI18n', l, v)} />
                ))}
              </div>
            </Section>

            <Section label="Kriterium & Kontext">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sicherheitskriterium</div>
                  <select value={editingDef.kriteriumId} onChange={e => setEditingDef(prev => prev ? { ...prev, kriteriumId: e.target.value } : prev)}
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
                      <button key={k} onClick={() => setEditingDef(prev => prev ? { ...prev, kontext: k } : prev)}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: editingDef.kontext === k ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)', background: editingDef.kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)', color: editingDef.kontext === k ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                        {k === 'io' ? 'Innerorts' : 'Ausserorts'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {WICHTIGKEIT_TABLE[editingDef.kriteriumId] && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                  Wichtigkeit gemäss Tabelle: <strong style={{ color: 'var(--zh-blau)' }}>{WICHTIGKEIT_TABLE[editingDef.kriteriumId][editingDef.kontext] || '—'}</strong>
                </div>
              )}
            </Section>

            <Section label="RSI-Bewertung (Lösung)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <SelectField label="Wichtigkeit" value={editingDef.correctAssessment.wichtigkeit}
                  options={[['gross','Gross'],['mittel','Mittel'],['klein','Klein']]}
                  onChange={v => setCA('wichtigkeit', v as RSIDimension)} />
                <SelectField label="Abweichung" value={editingDef.correctAssessment.abweichung}
                  options={[['gross','Gross'],['mittel','Mittel'],['klein','Klein']]}
                  onChange={v => setCA('abweichung', v as RSIDimension)} />
                <SelectField label="NACA (0–7)" value={String(editingDef.correctAssessment.naca)}
                  options={['0','1','2','3','4','5','6','7'].map(n => [n, `NACA ${n}`])}
                  onChange={v => setCA('naca', Number(v) as NacaRaw)} />
              </div>
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'var(--zh-color-bg-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {(() => {
                  const rs = calcRelevanzSD(editingDef.correctAssessment.wichtigkeit, editingDef.correctAssessment.abweichung) as ResultDimension
                  const us = nacaToSchwere(editingDef.correctAssessment.naca) as NACADimension
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

            <Section label="Eigenschaften">
              <div style={{ display: 'flex', gap: '16px' }}>
                {([['isPflicht','Pflichtdefizit'],['isBooster','Booster']] as const).map(([field, lbl]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editingDef[field]} onChange={e => setEditingDef(prev => prev ? { ...prev, [field]: e.target.checked } : prev)} />
                    {lbl}
                  </label>
                ))}
              </div>
            </Section>

            <Section label="Normreferenzen (kommagetrennt)">
              <input value={editingDef.normRefs.join(', ')} onChange={e => setEditingDef(prev => prev ? { ...prev, normRefs: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : prev)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
            </Section>

            <Section label="360°-Position (θ 0–360° / φ 0–180°)">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['theta','phi'] as const).map(axis => (
                  <div key={axis}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{axis}</div>
                    <input type="number" min={0} max={axis === 'theta' ? 360 : 180} step={1}
                      value={editingDef.position?.[axis] ?? ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value)
                        setEditingDef(prev => prev ? {
                          ...prev,
                          position: { theta: prev.position?.theta ?? 0, phi: prev.position?.phi ?? 90, [axis]: isNaN(val) ? 0 : val },
                        } : prev)
                      }}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Toleranzradius: {editingDef.tolerance ?? 15}°
                </div>
                <input type="range" min={5} max={30} step={1}
                  value={editingDef.tolerance ?? 15}
                  onChange={e => setEditingDef(prev => prev ? { ...prev, tolerance: parseInt(e.target.value) } : prev)}
                  style={{ width: '100%' }} />
              </div>
            </Section>

            <Section label="Kategorie">
              <select value={editingDef.kategorie ?? ''}
                onChange={e => setEditingDef(prev => prev ? { ...prev, kategorie: e.target.value as AppDeficit['kategorie'] || undefined } : prev)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
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

            {/* Verortung im Bild */}
            <Section label={t('admin.verortung')}>
              {selectedScene?.panoramaBildUrl ? (
                <div>
                  {editingDef.verortung && (
                    <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                      Aktuell: <strong style={{ color: 'var(--zh-blau)' }}>{editingDef.verortung.typ}</strong>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (editingDef) {
                        // Defizit zuerst speichern, damit BildEditor den aktuellen Stand hat
                        const computed = recompute(editingDef)
                        saveDeficit(computed)
                        setDeficits(getDeficits(computed.sceneId))
                        setEditingDef(computed)
                        setBildEditorDeficitId(computed.id)
                        setBildEditorOpen(true)
                        setDefModalOpen(false)
                      }
                    }}
                    style={{
                      padding: '8px 16px', borderRadius: '6px',
                      background: 'rgba(0,118,189,0.1)', color: 'var(--zh-blau)',
                      border: '1px solid rgba(0,118,189,0.3)',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--zh-font)',
                    }}
                  >
                    {t('admin.panorama_editor')}
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
                  Zuerst Panoramabild für diese Szene setzen.
                </p>
              )}
            </Section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setDefModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', border: '1px solid var(--zh-color-border)', background: 'transparent', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('admin.cancelBtn')}</button>
              <button onClick={handleSaveDef} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Save size={14} /> {t('admin.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: SZENE ═══ */}
      {szeneModalOpen && editingScene && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSzeneModalOpen(false) }}>
          <div style={{ width: '680px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{szeneIsNew ? t('admin.szene_neu') : t('admin.szene_bearbeiten')}</h3>
              <button onClick={() => setSzeneModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
            </div>

            <Section label="Szenenname">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLInput key={l} label={l.toUpperCase()} value={(editingScene.nameI18n as unknown as Record<string,string>)[l] ?? ''} onChange={v => setSceneML('nameI18n', l, v)} />
                ))}
              </div>
            </Section>

            <Section label={t('admin.szene_beschreibung')}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLTextarea key={l} label={l.toUpperCase()} value={(editingScene.beschreibungI18n as unknown as Record<string,string> | undefined)?.[l] ?? ''} onChange={v => setSceneML('beschreibungI18n', l, v)} />
                ))}
              </div>
            </Section>

            <Section label={t('admin.szene_kontext')}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['io','ao'] as const).map(k => (
                  <button key={k} onClick={() => setEditingScene(prev => prev ? { ...prev, kontext: k } : prev)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: editingScene.kontext === k ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)', background: editingScene.kontext === k ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)', color: editingScene.kontext === k ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                    {k === 'io' ? 'Innerorts' : 'Ausserorts'}
                  </button>
                ))}
              </div>
            </Section>

            <Section label={t('admin.merkmale_label')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(editingScene.strassenmerkmale ?? []).length === 0 && (
                  <button onClick={initMerkmaleFromKatalog} style={{ padding: '10px 14px', borderRadius: '6px', border: '1px dashed var(--zh-color-border)', background: 'rgba(0,118,189,0.04)', color: 'var(--zh-blau)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    Katalog laden (Funktionalität)
                  </button>
                )}
                {(editingScene.strassenmerkmale ?? []).map((m, i) => {
                  // Katalog-Optionen finden (falls id vorhanden)
                  const katalogDef = m.id ? STRASSENMERKMALE_KATALOG.flatMap(k => k.merkmale).find(d => d.id === m.id) : null
                  return (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {katalogDef ? katalogDef.label : 'Label (DE)'}
                        </div>
                        {!katalogDef ? (
                          <input value={m.labelI18n.de} onChange={e => updateMerkmal(i, 'labelI18n', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
                        ) : null}
                      </div>
                      <div style={{ flex: 1 }}>
                        {katalogDef ? (
                          <select
                            value={m.wertI18n.de}
                            onChange={e => updateMerkmal(i, 'wertI18n', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box', cursor: 'pointer' }}
                          >
                            <option value="">— auswählen —</option>
                            {katalogDef.optionen.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input value={m.wertI18n.de} onChange={e => updateMerkmal(i, 'wertI18n', e.target.value)}
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
                        )}
                      </div>
                      <button onClick={() => removeMerkmal(i)} style={{ padding: '7px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', color: '#D40053', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
                {(editingScene.strassenmerkmale ?? []).length > 0 && (
                  <button onClick={addMerkmal} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px dashed var(--zh-color-border)', background: 'transparent', color: 'var(--zh-blau)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    {t('admin.merkmale_hinzufügen')}
                  </button>
                )}
              </div>
            </Section>

            {/* 360°-Panoramabild via BildUpload */}
            <Section label="360°-Panoramabild">
              <BildUpload
                szeneId={editingScene.id}
                aktuelleUrl={editingScene.panoramaBildUrl}
                onBildGeladen={(url, breite, hoehe) => {
                  setEditingScene(prev => prev ? { ...prev, panoramaBildUrl: url } : prev)
                  setPanoramaVorschau({ url, breite, hoehe })
                }}
              />
              {panoramaVorschau && (
                <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginTop: '6px' }}>
                  Geladen: {panoramaVorschau.breite.toLocaleString('de-CH')} × {panoramaVorschau.hoehe.toLocaleString('de-CH')} Pixel
                </p>
              )}
              {editingScene.panoramaBildUrl && (
                <button
                  onClick={() => { handleSaveScene(); setBildEditorOpen(true) }}
                  style={{
                    marginTop: '8px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '6px',
                    background: 'rgba(0,118,189,0.1)', color: 'var(--zh-blau)',
                    border: '1px solid rgba(0,118,189,0.3)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--zh-font)',
                  }}
                >
                  Verortungs-Editor öffnen
                </button>
              )}
            </Section>

            {/* Perspektiven (mehrere Panorama-Bilder pro Szene) */}
            <Section label="Perspektiven (Standortwechsel)">
              <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginBottom: '10px' }}>
                Mehrere Panoramabilder für dieselbe Szene. Defizite können pro Perspektive neu verortet werden.
              </p>
              {(editingScene.perspektiven ?? []).map((p, i) => (
                <div key={p.id} style={{
                  padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid var(--zh-color-border)',
                  background: 'var(--zh-color-bg-secondary)',
                  marginBottom: '8px',
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-blau)', minWidth: '20px' }}>{i + 1}</span>
                    <input
                      value={p.label}
                      onChange={e => {
                        const updated = [...(editingScene.perspektiven ?? [])]
                        updated[i] = { ...updated[i], label: e.target.value }
                        setEditingScene(prev => prev ? { ...prev, perspektiven: updated } : prev)
                      }}
                      placeholder="Label (z.B. Standort A)"
                      style={{
                        flex: 1, padding: '5px 8px', borderRadius: '4px',
                        border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)',
                        color: 'var(--zh-color-text)', fontSize: '12px', fontFamily: 'var(--zh-font)',
                      }}
                    />
                    <button
                      onClick={() => {
                        const updated = (editingScene.perspektiven ?? []).filter((_, j) => j !== i)
                        setEditingScene(prev => prev ? { ...prev, perspektiven: updated } : prev)
                      }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#D40053', padding: '2px', flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Panoramabild für Perspektive */}
                  <BildUpload
                    szeneId={`${editingScene.id}-${p.id}`}
                    aktuelleUrl={p.bildUrl || null}
                    onBildGeladen={(url) => {
                      const updated = [...(editingScene.perspektiven ?? [])]
                      updated[i] = { ...updated[i], bildUrl: url }
                      setEditingScene(prev => prev ? { ...prev, perspektiven: updated } : prev)
                    }}
                  />
                  {p.bildUrl && (
                    <p style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)', marginTop: '4px' }}>
                      {p.bildUrl}
                    </p>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  const newP = {
                    id: `persp-${Date.now()}`,
                    label: `Standort ${(editingScene.perspektiven ?? []).length + 1}`,
                    bildUrl: '',
                  }
                  setEditingScene(prev => prev ? {
                    ...prev,
                    perspektiven: [...(prev.perspektiven ?? []), newP],
                  } : prev)
                }}
                style={{
                  padding: '7px 14px', borderRadius: '6px',
                  border: '1px dashed var(--zh-color-border)',
                  background: 'transparent', color: 'var(--zh-blau)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--zh-font)',
                }}
              >
                + Perspektive hinzufügen
              </button>
            </Section>

            {/* Vorschaubilder */}
            <Section label={t('admin.einstieg_titel')}>
              {/* Vorschaubild 1 */}
              <VorschaubildEditor
                key={`${editingScene.id}-1`}
                label={t('admin.vorschau1')}
                value={editingScene.vorschauBild1}
                panoramaBildUrl={editingScene.panoramaBildUrl}
                modus={vorschau1Modus}
                onModusChange={m => {
                  setVorschau1Modus(m)
                  if (m === 'kein') setEditingScene(prev => prev ? { ...prev, vorschauBild1: null } : prev)
                  if (m === 'panorama') setEditingScene(prev => prev ? { ...prev, vorschauBild1: 'panorama' } : prev)
                }}
                onBildGeladen={url => {
                  setEditingScene(prev => prev ? { ...prev, vorschauBild1: url } : prev)
                  setVorschau1Modus('upload')
                }}
                szeneId={editingScene.id}
              />

              {/* Vorschaubild 2 */}
              <VorschaubildEditor
                key={`${editingScene.id}-2`}
                label={t('admin.vorschau2')}
                value={editingScene.vorschauBild2}
                panoramaBildUrl={editingScene.panoramaBildUrl}
                modus={vorschau2Modus}
                onModusChange={m => {
                  setVorschau2Modus(m)
                  if (m === 'kein') setEditingScene(prev => prev ? { ...prev, vorschauBild2: null } : prev)
                  if (m === 'panorama') setEditingScene(prev => prev ? { ...prev, vorschauBild2: 'panorama' } : prev)
                }}
                onBildGeladen={url => {
                  setEditingScene(prev => prev ? { ...prev, vorschauBild2: url } : prev)
                  setVorschau2Modus('upload')
                }}
                szeneId={editingScene.id}
              />

              {/* Mehrsprachiger Hinweis für Merkmale */}
              <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginTop: '4px' }}>
                {t('admin.mehrsprachen_hinweis')}
              </p>
            </Section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setSzeneModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', border: '1px solid var(--zh-color-border)', background: 'transparent', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('admin.cancelBtn')}</button>
              <button onClick={handleSaveScene} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Save size={14} /> {t('admin.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: THEMA ═══ */}
      {themaModalOpen && editingThema && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setThemaModalOpen(false) }}>
          <div style={{ width: '560px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{editingThema.nameI18n.de ? t('admin.szene_bearbeiten') : t('admin.thema_neu')}</h3>
              <button onClick={() => setThemaModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
            </div>

            <Section label="Bezeichnung">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLInput key={l} label={l.toUpperCase()} value={(editingThema.nameI18n as unknown as Record<string,string>)[l] ?? ''} onChange={v => setThemaML('nameI18n', l, v)} />
                ))}
              </div>
            </Section>

            <Section label="Beschreibung (optional)">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['de','fr','it','en'] as const).map(l => (
                  <MLTextarea key={l} label={l.toUpperCase()} value={(editingThema.beschreibungI18n as unknown as Record<string,string>)[l] ?? ''} onChange={v => setThemaML('beschreibungI18n', l, v)} />
                ))}
              </div>
            </Section>

            <Section label={t('admin.thema_typ')}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {(['ober','unter'] as const).map(typ => (
                  <label key={typ} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                    <input type="radio" checked={themaTyp === typ} onChange={() => setThemaTyp(typ)} />
                    {typ === 'ober' ? t('admin.oberthema') : t('admin.unterthema')}
                  </label>
                ))}
              </div>
            </Section>

            {themaTyp === 'unter' && (
              <Section label={t('admin.thema_oberthema_wählen')}>
                <select
                  value={editingThema.parentTopicId ?? ''}
                  onChange={e => setEditingThema(prev => prev ? { ...prev, parentTopicId: e.target.value || null } : prev)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
                  <option value="">— Bitte auswählen —</option>
                  {getOberthemen().map(ot => (
                    <option key={ot.id} value={ot.id}>{ml(ot.nameI18n, lang)}</option>
                  ))}
                </select>
              </Section>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setThemaModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', border: '1px solid var(--zh-color-border)', background: 'transparent', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('admin.cancelBtn')}</button>
              <button onClick={handleSaveThema} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Save size={14} /> {t('admin.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: KURS ═══ */}
      {kursModalOpen && editingKurs && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setKursModalOpen(false) }}>
          <div style={{ width: '520px', maxHeight: '88vh', overflowY: 'auto', borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '28px 32px', boxShadow: 'var(--zh-shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{t('admin.kurs_neu')}</h3>
              <button onClick={() => setKursModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)' }}><X size={18} /></button>
            </div>

            <Section label={t('admin.kurs_name')}>
              <input value={editingKurs.name} onChange={e => setEditingKurs(prev => prev ? { ...prev, name: e.target.value } : prev)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
            </Section>

            <Section label={t('admin.kurs_datum')}>
              <input type="date" value={editingKurs.datum} onChange={e => setEditingKurs(prev => prev ? { ...prev, datum: e.target.value } : prev)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
            </Section>

            <Section label={`${t('admin.gueltig_von')} / ${t('admin.gueltig_bis')}`}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('admin.gueltig_von')}</div>
                  <input type="datetime-local"
                    value={editingKurs.gueltigVon != null ? new Date(editingKurs.gueltigVon).toISOString().slice(0, 16) : ''}
                    onChange={e => setEditingKurs(prev => prev ? { ...prev, gueltigVon: e.target.value ? new Date(e.target.value).getTime() : null } : prev)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '12px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-disabled)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('admin.gueltig_bis')}</div>
                  <input type="datetime-local"
                    value={editingKurs.gueltigBis != null ? new Date(editingKurs.gueltigBis).toISOString().slice(0, 16) : ''}
                    onChange={e => setEditingKurs(prev => prev ? { ...prev, gueltigBis: e.target.value ? new Date(e.target.value).getTime() : null } : prev)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '12px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }} />
                </div>
              </div>
            </Section>

            <Section label={t('admin.passwort')}>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKursPasswort ? 'text' : 'password'}
                  value={editingKurs.passwort ?? ''}
                  onChange={e => setEditingKurs(prev => prev ? { ...prev, passwort: e.target.value || null } : prev)}
                  placeholder={t('admin.passwort_hinweis')}
                  style={{ width: '100%', padding: '8px 40px 8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKursPasswort(v => !v)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  {showKursPasswort ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginTop: '4px' }}>{t('admin.passwort_hinweis')}</p>
            </Section>

            <Section label={t('admin.kurs_code')}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={editingKurs.zugangscode} onChange={e => setEditingKurs(prev => prev ? { ...prev, zugangscode: e.target.value } : prev)}
                  placeholder="FK-RSI-123456"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }} />
                <button onClick={() => setEditingKurs(prev => prev ? { ...prev, zugangscode: generateKursCode() } : prev)}
                  style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-blau)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t('admin.kurs_generieren')}
                </button>
              </div>
            </Section>

            <Section label={t('admin.kurs_topics')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topics.filter(tp => tp.isActive).map(tp => (
                  <label key={tp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--zh-color-text)', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={editingKurs.topicIds.includes(tp.id)}
                      onChange={() => toggleKursTopic(tp.id)} />
                    {ml(tp.nameI18n, lang)}
                  </label>
                ))}
              </div>
            </Section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setKursModalOpen(false)} style={{ padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', border: '1px solid var(--zh-color-border)', background: 'transparent', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{t('admin.cancelBtn')}</button>
              <button onClick={handleSaveKurs} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                <Save size={14} /> {t('admin.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BILD-EDITOR ═══ */}
      {bildEditorOpen && selectedScene && (
        <BildEditor
          scene={selectedScene}
          deficits={deficits}
          initialDeficitId={bildEditorDeficitId}
          onSave={(updatedScene, updatedDeficits) => {
            saveScene(updatedScene)
            updatedDeficits.forEach(saveDeficit)
            setSelectedScene(updatedScene)
            if (selectedTopic) {
              setScenes(getScenes(selectedTopic.id))
            }
            setDeficits(getDeficits(updatedScene.id))
            setBildEditorOpen(false)
          }}
          onClose={() => setBildEditorOpen(false)}
        />
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
      <div style={{ padding: '7px 10px', borderRadius: '6px', background: 'var(--zh-color-bg-tertiary)', color: 'var(--zh-color-text)', fontSize: '13px', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

// ── VorschaubildEditor – 3 Optionen: Kein Bild / Aus Panorama / Eigenes Bild ──
interface VorschaubildEditorProps {
  label: string
  value: string | null | undefined
  panoramaBildUrl: string | null | undefined
  modus: VorschauModus
  onModusChange: (m: VorschauModus) => void
  onBildGeladen: (url: string) => void
  szeneId: string
}

function VorschaubildEditor({
  label, value, panoramaBildUrl, modus, onModusChange, onBildGeladen, szeneId,
}: VorschaubildEditorProps) {
  const hasPanorama = !!panoramaBildUrl
  // Bild-Quelle für Vorschau aufloesen
  const previewUrl = value === 'panorama'
    ? (panoramaBildUrl ?? null)
    : (value ?? null)

  const btnStyle = (aktiv: boolean, disabled = false): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: aktiv ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
    background: aktiv ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)',
    color: aktiv ? 'var(--zh-blau)' : disabled ? 'var(--zh-color-text-disabled)' : 'var(--zh-color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--zh-font)',
    opacity: disabled ? 0.55 : 1,
  })

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)',
        marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {label}
      </div>

      {/* Optionen-Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onModusChange('panorama')}
          disabled={!hasPanorama}
          style={btnStyle(modus === 'panorama', !hasPanorama)}
        >
          Aus Panorama übernehmen
        </button>
        <button
          onClick={() => onModusChange('upload')}
          style={btnStyle(modus === 'upload')}
        >
          Eigenes Bild hochladen
        </button>
        <button
          onClick={() => onModusChange('kein')}
          style={btnStyle(modus === 'kein')}
        >
          Kein Bild
        </button>
      </div>

      {/* Kein Panorama vorhanden */}
      {modus === 'panorama' && !hasPanorama && (
        <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic', marginBottom: '8px' }}>
          Zuerst ein Panoramabild für diese Szene hochladen.
        </p>
      )}

      {/* BildUpload-Komponente */}
      {modus === 'upload' && (
        <div style={{ marginBottom: '10px' }}>
          <BildUpload
            szeneId={`${szeneId}-vorschau`}
            aktuelleUrl={value && value !== 'panorama' ? value : null}
            onBildGeladen={(url) => onBildGeladen(url)}
            maxBreite={400}
          />
        </div>
      )}

      {/* Vorschau (80px) */}
      {previewUrl && (
        <div style={{
          height: '80px',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid var(--zh-color-border)',
          background: '#000',
          marginTop: '6px',
        }}>
          <img
            src={previewUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: value === 'panorama' ? 0.75 : 1,
            }}
          />
        </div>
      )}
    </div>
  )
}
