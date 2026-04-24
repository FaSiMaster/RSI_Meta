// AdminDashboard – Tab-Navigation: Defizite | Themen | Kurse | Rangliste
// Defizite: Sidebar + Szenen-Chips + Defizit-CRUD + Szenen-CRUD
// Themen: Hierarchie-Ansicht + Thema-Modal
// Kurse: Kurs-Tabelle + Kurs-Modal
//
// Ab Sprint 3 (v0.6.x): Modals sind in src/components/admin/modals/ ausgelagert,
// Hilfsfelder in src/components/admin/fields/, Helpers in admin/utils/adminHelpers.ts.
// Modals halten eigenen Draft-State; dieser Parent ruft onSave(obj) mit dem fertigen Objekt.

import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ChevronUp, Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getTopics, saveTopic, deleteTopic,
  getScenes, saveScene, deleteScene, getAllScenes,
  getDeficits, saveDeficit, deleteDeficit, getAllDeficits,
  getKurse, saveKurs, deleteKurs, getKursStatus,
  getTopicsTree, ml,
  type AppTopic, type AppScene, type AppDeficit, type TopicNode, type Kurs,
} from '../data/appData'
import BildEditor from './admin/BildEditor'
import AdminRanking from './admin/AdminRanking'
import DefizitModal from './admin/modals/DefizitModal'
import SzeneModal from './admin/modals/SzeneModal'
import ThemaModal from './admin/modals/ThemaModal'
import KursModal from './admin/modals/KursModal'
import {
  emptyDeficit, emptyScene, emptyTopic, emptyKurs, riskBg,
  type AdminTab,
} from './admin/utils/adminHelpers'

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

  // Modal-States
  const [defModalOpen, setDefModalOpen] = useState(false)
  const [editingDef, setEditingDef] = useState<AppDeficit | null>(null)

  const [szeneModalOpen, setSzeneModalOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<AppScene | null>(null)
  const [szeneIsNew, setSzeneIsNew] = useState(false)

  const [bildEditorOpen, setBildEditorOpen] = useState(false)
  const [bildEditorDeficitId, setBildEditorDeficitId] = useState<string | undefined>()

  // ── Themen-Tab State ──
  const [topicsTree, setTopicsTree] = useState<TopicNode[]>([])
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [themaModalOpen, setThemaModalOpen] = useState(false)
  const [editingThema, setEditingThema] = useState<AppTopic | null>(null)
  const [themaTyp, setThemaTyp] = useState<'ober' | 'unter'>('ober')

  const [szeneGespeichertFeedback, setSzeneGespeichertFeedback] = useState(false)

  // ── Kurse-Tab State ──
  const [kurse, setKurse] = useState<Kurs[]>([])
  const [kursModalOpen, setKursModalOpen] = useState(false)
  const [editingKurs, setEditingKurs] = useState<Kurs | null>(null)

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
  function openEditDef(d: AppDeficit) {
    setEditingDef({ ...d })
    setDefModalOpen(true)
  }
  function handleDeleteDef(id: string) {
    const def = deficits.find(d => d.id === id)
    const label = def ? (def.nameI18n?.de || id) : id
    if (!window.confirm(`Defizit «${label}» wirklich löschen? Diese Aktion ist nicht rückgängig zu machen und entfernt das Defizit auch aus Supabase.`)) return
    deleteDeficit(id)
    setDeficits(prev => prev.filter(d => d.id !== id))
  }
  // Modal liefert bereits recompute()-tes Objekt
  function handleSaveDef(d: AppDeficit) {
    saveDeficit(d)
    setDeficits(getDeficits(d.sceneId))
    setDefModalOpen(false)
  }
  // Aus dem DefizitModal heraus den Verortungs-Editor öffnen:
  // Defizit zuerst speichern, damit der BildEditor den aktuellen Stand hat.
  function handleOpenBildEditorFromDef(d: AppDeficit) {
    saveDeficit(d)
    setDeficits(getDeficits(d.sceneId))
    setEditingDef(d)
    setBildEditorDeficitId(d.id)
    setBildEditorOpen(true)
    setDefModalOpen(false)
  }

  // ── Szene-Aktionen ──
  function openNewScene() {
    if (!selectedTopic) return
    setEditingScene(emptyScene(selectedTopic.id))
    setSzeneIsNew(true)
    setSzeneModalOpen(true)
  }
  function openEditScene(scene: AppScene) {
    setEditingScene({ ...scene })
    setSzeneIsNew(false)
    setSzeneModalOpen(true)
  }
  function handleDeleteScene(id: string) {
    const sc = scenes.find(s => s.id === id)
    const label = sc ? (sc.nameI18n?.de || id) : id
    const defizitCount = getDeficits(id).length
    if (!window.confirm(`Szene «${label}» wirklich löschen?\n\nDabei werden auch ${defizitCount} zugehörige Defizite gelöscht (Kaskade). Diese Aktion ist nicht rückgängig zu machen und entfernt die Daten auch aus Supabase.`)) return
    deleteScene(id)
    if (selectedTopic) {
      const sc = getScenes(selectedTopic.id)
      setScenes(sc)
      if (selectedScene?.id === id) setSelectedScene(sc[0] ?? null)
    }
  }
  function handleSaveScene(scene: AppScene) {
    saveScene(scene)
    if (selectedTopic) {
      const sc = getScenes(selectedTopic.id)
      setScenes(sc)
      const updated = sc.find(s => s.id === scene.id) ?? sc[0] ?? null
      if (!selectedScene) setSelectedScene(updated)
      else setSelectedScene(sc.find(s => s.id === selectedScene.id) ?? selectedScene)
    }
    setSzeneModalOpen(false)
    setSzeneGespeichertFeedback(true)
    setTimeout(() => setSzeneGespeichertFeedback(false), 3000)
  }
  // Aus dem SzeneModal Panorama-Editor öffnen: Szene erst speichern.
  function handleOpenBildEditorFromScene(scene: AppScene) {
    saveScene(scene)
    if (selectedTopic) {
      const sc = getScenes(selectedTopic.id)
      setScenes(sc)
      setSelectedScene(sc.find(s => s.id === scene.id) ?? selectedScene)
    }
    setBildEditorDeficitId(undefined)
    setBildEditorOpen(true)
    setSzeneModalOpen(false)
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
  function handleSaveThema(thema: AppTopic) {
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
  function handleDeleteThema(id: string) {
    const all = getTopics()
    const tp = all.find(x => x.id === id)
    if (!tp) return
    const children = all.filter(t => t.parentTopicId === id)
    const scenesAll = getAllScenes().filter(s => s.topicId === id || children.some(c => c.id === s.topicId))
    const kaskade = children.length > 0 || scenesAll.length > 0
      ? `\n\nEs werden mitgeloescht:\n- ${children.length} Untergruppe(n)\n- ${scenesAll.length} Szene(n) inkl. aller Defizite`
      : ''
    const name = ml(tp.nameI18n, lang)
    if (!window.confirm(`Themenbereich "${name}" wirklich loeschen?${kaskade}`)) return
    deleteTopic(id)
    setTopics(getTopics())
    setTopicsTree(getTopicsTree())
    if (selectedTopic?.id === id) setSelectedTopic(null)
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
    // Zuerst alle Geschwister normalisieren (1, 2, 3, …) — verhindert Duplikate
    siblings.forEach((s, i) => { s.sortOrder = i + 1 })
    const tmp = siblings[idx].sortOrder
    siblings[idx].sortOrder = siblings[swapIdx].sortOrder
    siblings[swapIdx].sortOrder = tmp
    saveTopic({ ...siblings[idx] })
    saveTopic({ ...siblings[swapIdx] })
    setTopics(getTopics())
    setTopicsTree(getTopicsTree())
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
  async function handleSaveKurs(k: Kurs) {
    const res = await saveKurs(k)
    setKurse(getKurse())
    if (!res.ok) {
      // Kurs ist lokal gespeichert, aber nicht in Supabase → andere Geraete
      // sehen ihn nicht. User muss wissen, dass eine Setup-Aktion fehlt.
      alert(
        `Kurs lokal gespeichert, aber Supabase-Sync fehlgeschlagen:\n\n${res.supabaseError ?? 'unbekannter Fehler'}\n\n` +
        'Haeufigste Ursachen:\n' +
        '1. SQL-Migration `rsi_kurse` noch nicht im Supabase-Dashboard ausgefuehrt\n' +
        '   (Datei: supabase/migrations/2026_04_24_rsi_kurse.sql)\n' +
        '2. Edge Function `admin-write` noch nicht mit v0.6.3-Code redeployt\n' +
        '3. Admin-Token abgelaufen (erneut einloggen)\n\n' +
        'Der Kurs ist aktuell NUR auf diesem Geraet verfuegbar.'
      )
      return
    }
    setKursModalOpen(false)
  }
  async function handleToggleKurs(k: Kurs) {
    const res = await saveKurs({ ...k, isActive: !k.isActive })
    setKurse(getKurse())
    if (!res.ok) {
      alert(`Kurs-Status lokal geaendert, Supabase-Sync fehlgeschlagen:\n${res.supabaseError ?? 'unbekannter Fehler'}`)
    }
  }
  async function handleDeleteKurs(id: string) {
    const res = await deleteKurs(id)
    setKurse(getKurse())
    if (!res.ok) {
      alert(`Kurs lokal entfernt, Supabase-Delete fehlgeschlagen:\n${res.supabaseError ?? 'unbekannter Fehler'}`)
    }
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

  // Limits: schützen vor DoS durch überlange Listen und Bildern im Import
  const MAX_IMPORT_ITEMS   = 500
  const MAX_BASE64_BYTES   = 2_000_000
  const ID_PATTERN         = /^[a-zA-Z0-9_-]{1,64}$/

  function isValidMultiLang(v: unknown): boolean {
    if (!v || typeof v !== 'object') return false
    const m = v as Record<string, unknown>
    return ['de', 'fr', 'it', 'en'].every(k => typeof m[k] === 'string' || m[k] === undefined)
  }

  function validateImport(data: unknown): { ok: true; data: {
    topics?: AppTopic[]; scenes?: AppScene[]; deficits?: AppDeficit[]; kurse?: Kurs[];
  } } | { ok: false; reason: string } {
    if (!data || typeof data !== 'object') return { ok: false, reason: 'Kein gültiges JSON-Objekt' }
    const d = data as Record<string, unknown>
    if (d.version !== 'rsi-v3') return { ok: false, reason: `Inkompatible Version (erwartet: rsi-v3)` }

    const cats: [string, unknown][] = [
      ['topics', d.topics], ['scenes', d.scenes], ['deficits', d.deficits], ['kurse', d.kurse],
    ]
    for (const [name, arr] of cats) {
      if (arr === undefined) continue
      if (!Array.isArray(arr)) return { ok: false, reason: `${name} ist kein Array` }
      if (arr.length > MAX_IMPORT_ITEMS) return { ok: false, reason: `${name}: mehr als ${MAX_IMPORT_ITEMS} Einträge` }
      for (const item of arr) {
        if (!item || typeof item !== 'object') return { ok: false, reason: `${name}: ungültiger Eintrag` }
        const obj = item as Record<string, unknown>
        if (typeof obj.id !== 'string' || !ID_PATTERN.test(obj.id))
          return { ok: false, reason: `${name}: ID-Format ungültig (${obj.id})` }
        if (name !== 'kurse' && !isValidMultiLang(obj.nameI18n))
          return { ok: false, reason: `${name} (${obj.id}): nameI18n ungültig` }
      }
    }

    if (Array.isArray(d.scenes)) {
      for (const sc of d.scenes as Record<string, unknown>[]) {
        for (const field of ['panoramaBildUrl', 'vorschauBild1', 'vorschauBild2']) {
          const v = sc[field]
          if (typeof v === 'string' && v.startsWith('data:') && v.length > MAX_BASE64_BYTES) {
            return { ok: false, reason: `Szene ${sc.id}: Bild in "${field}" grösser als ${MAX_BASE64_BYTES} Bytes` }
          }
        }
      }
    }

    return {
      ok: true,
      data: {
        topics:   d.topics as AppTopic[] | undefined,
        scenes:   d.scenes as AppScene[] | undefined,
        deficits: d.deficits as AppDeficit[] | undefined,
        kurse:    d.kurse as Kurs[] | undefined,
      },
    }
  }

  function handleImport(file: File) {
    const reader = new FileReader()
    reader.onload = async e => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        const check = validateImport(raw)
        if (!check.ok) {
          setImportFeedback(`Validierung fehlgeschlagen: ${check.reason}`)
          setTimeout(() => setImportFeedback(null), 5000)
          return
        }
        const data = check.data
        if (data.topics)   data.topics.forEach(saveTopic)
        if (data.scenes)   data.scenes.forEach(saveScene)
        if (data.deficits) data.deficits.forEach(saveDeficit)
        if (data.kurse)    await Promise.all(data.kurse.map(k => saveKurs(k)))
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
        setImportFeedback(`Fehler beim Import: ${msg}`)
        setTimeout(() => setImportFeedback(null), 5000)
      }
    }
    reader.readAsText(file)
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
            {importFeedback && (
              <span style={{ fontSize: '12px', color: importFeedback.startsWith('Fehler') ? 'var(--zh-rot)' : 'var(--zh-gruen)', fontWeight: 600 }}>
                {importFeedback}
              </span>
            )}
            {szeneGespeichertFeedback && (
              <span style={{ fontSize: '12px', color: 'var(--zh-gruen)', fontWeight: 600 }}>
                {t('admin.gespeichert_einstieg')}
              </span>
            )}
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
                      <button onClick={() => handleDeleteScene(sc.id)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: 'var(--zh-rot)', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={10} /> {t('admin.deleteBtn')}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{t('admin.deficits')}</h2>
                {selectedScene && <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '2px' }}>{deficits.length} in dieser Szene</p>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
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
                        {d.isPflicht && <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: 'rgba(212,0,83,0.12)', color: 'var(--zh-rot)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Pflicht</span>}
                        {d.isBooster && <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: 'rgba(184,115,0,0.12)', color: 'var(--zh-orange)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Booster</span>}
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
                        <button onClick={() => handleDeleteDef(d.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '12px', color: 'var(--zh-rot)', cursor: 'pointer' }}>
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
                      <button onClick={() => handleDeleteThema(node.topic.id)}
                        aria-label={t('admin.thema_loeschen', 'Themenbereich löschen')}
                        title={t('admin.thema_loeschen', 'Themenbereich löschen')}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: 'var(--zh-rot)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={12} />
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
                          style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: 'var(--zh-rot)', cursor: 'pointer' }}>
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
                              aktiv:     { bg: 'rgba(26,127,31,0.1)',   color: 'var(--zh-gruen)',                    label: t('kurs.aktiv') },
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
                            <button onClick={() => handleDeleteKurs(k.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(212,0,83,0.2)', background: 'rgba(212,0,83,0.06)', fontSize: '11px', color: 'var(--zh-rot)', cursor: 'pointer' }}>
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

      {/* ═══ MODALS ═══ */}
      <DefizitModal
        open={defModalOpen}
        initial={editingDef}
        scene={selectedScene}
        onClose={() => setDefModalOpen(false)}
        onSave={handleSaveDef}
        onOpenBildEditor={handleOpenBildEditorFromDef}
      />

      <SzeneModal
        open={szeneModalOpen}
        initial={editingScene}
        isNew={szeneIsNew}
        onClose={() => setSzeneModalOpen(false)}
        onSave={handleSaveScene}
        onOpenBildEditor={handleOpenBildEditorFromScene}
      />

      <ThemaModal
        open={themaModalOpen}
        initial={editingThema}
        initialTyp={themaTyp}
        onClose={() => setThemaModalOpen(false)}
        onSave={handleSaveThema}
      />

      <KursModal
        open={kursModalOpen}
        initial={editingKurs}
        topics={topics}
        onClose={() => setKursModalOpen(false)}
        onSave={handleSaveKurs}
      />

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
