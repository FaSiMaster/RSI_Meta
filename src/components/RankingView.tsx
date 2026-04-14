// RankingView – 4-Ebenen-Ranking: Gesamt | Kurs | Thema | Szene
// Primaer: Supabase (Live-Ranking, Realtime-Subscription)
// Fallback: localStorage (wenn Supabase nicht erreichbar)

import { Trophy, ArrowLeft, Clock, Loader2 } from 'lucide-react'
import {
  getGesamtRanking, getThemaRanking, getSzeneRanking, getKursRanking,
  getTopics, getAllScenes, getKurse, berechneSterne, ml,
  type AppTopic, type AppScene, type SceneResult, type Kurs,
} from '../data/appData'
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SterneAnzeige } from './SceneList'
import { supabase, setSupabaseStatus, type SupabaseResult } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Props {
  username: string
  onBack: () => void
}

type RankingTab = 'gesamt' | 'kurs' | 'thema' | 'szene'

// ── Hilfsfunktionen: Supabase-Resultate aggregieren ─────────────────────────

function aggregateGesamt(results: SupabaseResult[]): { username: string; score: number; szenen: number; besteProzent: number }[] {
  const userMap = new Map<string, Map<string, SupabaseResult>>()
  results.forEach(r => {
    if (!userMap.has(r.username)) userMap.set(r.username, new Map())
    const sceneMap = userMap.get(r.username)!
    const existing = sceneMap.get(r.scene_id)
    if (!existing || r.punkte > existing.punkte) sceneMap.set(r.scene_id, r)
  })
  const ranking: { username: string; score: number; szenen: number; besteProzent: number }[] = []
  userMap.forEach((sceneMap, username) => {
    const bests = Array.from(sceneMap.values())
    const score = bests.reduce((s, r) => s + r.punkte, 0)
    const avgP = bests.length > 0 ? Math.round(bests.reduce((s, r) => s + r.prozent, 0) / bests.length) : 0
    ranking.push({ username, score, szenen: bests.length, besteProzent: avgP })
  })
  return ranking.sort((a, b) => b.score - a.score)
}

function aggregateByKurs(results: SupabaseResult[], kursCode: string): { username: string; score: number; szenen: number; besteProzent: number }[] {
  return aggregateGesamt(results.filter(r => r.kurs_code === kursCode))
}

function aggregateBySceneIds(results: SupabaseResult[], sceneIds: Set<string>): { username: string; score: number; szenen: number; besteProzent: number }[] {
  return aggregateGesamt(results.filter(r => sceneIds.has(r.scene_id)))
}

function szeneResults(results: SupabaseResult[], sceneId: string): SceneResult[] {
  return results
    .filter(r => r.scene_id === sceneId)
    .sort((a, b) => b.punkte - a.punkte)
    .map(r => ({
      id: r.id,
      sceneId: r.scene_id,
      topicId: '',
      username: r.username,
      punkte: r.punkte,
      maxPunkte: 0,
      prozent: r.prozent,
      gefunden: 0,
      total: 0,
      versuch: 1,
      timestamp: r.created_at,
      dauerSekunden: r.dauer_sekunden ?? 0,
      kursId: r.kurs_code,
      defizitResults: [],
    }))
}

// ── Rang-Anzeige ──────────────────────────────────────────────────────────

function RangCell({ idx }: { idx: number }) {
  if (idx === 0) return <span style={{ fontWeight: 800, color: '#B87300' }}>1.</span>
  if (idx === 1) return <span style={{ fontWeight: 800, color: '#6B7280' }}>2.</span>
  if (idx === 2) return <span style={{ fontWeight: 800, color: '#7C4A00' }}>3.</span>
  return <span>#{idx + 1}</span>
}

function formatDauer(sek: number): string {
  const min = Math.floor(sek / 60)
  const s = sek % 60
  if (min === 0) return `${s}s`
  return `${min}m ${s}s`
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────

export default function RankingView({ username, onBack }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  const [tab, setTab] = useState<RankingTab>('gesamt')
  const [topics, setTopics] = useState<AppTopic[]>([])
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [selectedSceneId, setSelectedSceneId] = useState<string>('')
  const [kurse, setKurse] = useState<Kurs[]>([])
  const [selectedKursId, setSelectedKursId] = useState<string>('')
  const [kursCodeInput, setKursCodeInput] = useState('')

  // Supabase-Daten
  const [sbResults, setSbResults] = useState<SupabaseResult[]>([])
  const [loading, setLoading] = useState(true)
  const [useSupabase, setUseSupabase] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Lokale Fallback-Daten
  const [gesamtLocal, setGesamtLocal] = useState<{ username: string; score: number; szenen: number; besteProzent: number }[]>([])
  const [kursLocal, setKursLocal] = useState<{ username: string; score: number; szenen: number; besteProzent: number }[]>([])
  const [themaLocal, setThemaLocal] = useState<{ username: string; score: number; szenen: number; besteProzent: number }[]>([])
  const [szeneLocal, setSzeneLocal] = useState<SceneResult[]>([])

  // Stammdaten + lokale Ranking-Daten bei jedem Mount laden
  useEffect(() => {
    setTopics(getTopics().filter(tp => tp.isActive))
    setScenes(getAllScenes().filter(s => s.isActive))
    setKurse(getKurse().filter(k => k.isActive))
    setGesamtLocal(getGesamtRanking())
  }, [])

  // Lokale Daten nochmal nach 1s auffrischen (faengt gerade gespeicherte Resultate ab)
  useEffect(() => {
    const t = setTimeout(() => setGesamtLocal(getGesamtRanking()), 1000)
    return () => clearTimeout(t)
  }, [])

  // Supabase: Initial-Fetch + Realtime
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchAll() {
      const { data, error } = await supabase!.from('rsi_results').select('*').order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        console.warn('[RSI] Supabase fetch fehlgeschlagen:', error.message)
        setSupabaseStatus('offline')
        setLoading(false)
        return
      }
      setSbResults(data as SupabaseResult[])
      setUseSupabase(true)
      setSupabaseStatus('live')
      setLoading(false)
    }

    fetchAll()

    // Nachladen nach 2s (faengt fire-and-forget Inserts ab die noch unterwegs sind)
    const refreshTimer = setTimeout(() => { if (!cancelled) fetchAll() }, 2000)

    // Realtime-Subscription
    const channel = supabase.channel('rsi_results_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rsi_results' }, (payload) => {
        const newRow = payload.new as SupabaseResult
        setSbResults(prev => [newRow, ...prev])
        setSupabaseStatus('live')
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSupabaseStatus('live')
        }
      })
    channelRef.current = channel

    return () => {
      cancelled = true
      clearTimeout(refreshTimer)
      channel.unsubscribe()
    }
  }, [])

  // Lokale Fallback-Daten bei Tab-Wechsel laden (nur wenn kein Supabase)
  useEffect(() => {
    if (useSupabase) return
    if (tab === 'kurs') {
      if (selectedKursId) setKursLocal(getKursRanking(selectedKursId))
      else if (kursCodeInput.trim()) {
        const found = kurse.find(k => k.zugangscode === kursCodeInput.trim())
        if (found) setKursLocal(getKursRanking(found.id))
        else setKursLocal([])
      } else setKursLocal([])
    }
    if (tab === 'thema' && selectedTopicId) {
      setThemaLocal(getThemaRanking(selectedTopicId))
    }
    if (tab === 'szene' && selectedSceneId) {
      setSzeneLocal(getSzeneRanking(selectedSceneId))
    }
  }, [tab, selectedKursId, kursCodeInput, selectedTopicId, selectedSceneId, kurse, useSupabase])

  // ── Aggregierte Daten (Supabase oder localStorage) ──

  const gesamtData = useSupabase ? aggregateGesamt(sbResults) : gesamtLocal

  const kursData = useSupabase
    ? (() => {
      let code = ''
      if (selectedKursId) {
        const k = kurse.find(x => x.id === selectedKursId)
        code = k?.zugangscode ?? ''
      } else if (kursCodeInput.trim()) {
        code = kursCodeInput.trim()
      }
      return code ? aggregateByKurs(sbResults, code) : []
    })()
    : kursLocal

  const themaData = useSupabase
    ? (() => {
      if (!selectedTopicId) return []
      const topicSceneIds = new Set(scenes.filter(s => s.topicId === selectedTopicId).map(s => s.id))
      return aggregateBySceneIds(sbResults, topicSceneIds)
    })()
    : themaLocal

  const szeneData = useSupabase
    ? (selectedSceneId ? szeneResults(sbResults, selectedSceneId) : [])
    : szeneLocal

  // ── Styles ──

  function pillStyle(isActive: boolean): React.CSSProperties {
    return {
      padding: '6px 16px', borderRadius: '20px',
      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
      border: isActive ? 'none' : '1px solid var(--zh-color-border)',
      background: isActive ? 'var(--zh-dunkelblau)' : 'transparent',
      color: isActive ? 'white' : 'var(--zh-color-text-muted)',
      fontFamily: 'var(--zh-font)',
    }
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid var(--zh-color-border)',
    background: 'var(--zh-color-bg-secondary)',
    color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)',
  }

  // ── Tabellen-Renderer ──

  function renderGesamtTable(data: { username: string; score: number; szenen: number; besteProzent: number }[], emptyMsg: string) {
    return (
      <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden', boxShadow: 'var(--zh-shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)' }}>
              {['Rang', 'Name', 'Score', 'Szenen', 'Ø %'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', textAlign: h === 'Name' ? 'left' : 'right' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry, idx) => {
              const isOwn = entry.username === username
              return (
                <tr key={entry.username} style={{ borderBottom: '1px solid var(--zh-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}><RangCell idx={idx} /></td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--zh-blau)' : 'var(--zh-color-text)', textAlign: 'left' }}>
                    {entry.username}{isOwn && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--zh-blau)', opacity: 0.7 }}>(Du)</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 800, color: 'var(--zh-blau)', textAlign: 'right' }}>{entry.score.toLocaleString('de-CH')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>{entry.szenen}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: entry.besteProzent >= 90 ? '#1A7F1F' : entry.besteProzent >= 60 ? '#B87300' : 'var(--zh-color-text-muted)', textAlign: 'right' }}>{entry.besteProzent}%</td>
                </tr>
              )
            })}
            {data.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px' }}>{emptyMsg}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="flex items-center gap-3 font-bold" style={{ fontSize: '24px', color: 'var(--zh-color-text)' }}>
          <Trophy style={{ color: 'var(--zh-orange)' }} size={24} />
          {t('ranking.title')}
          {useSupabase && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#1A7F1F', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1A7F1F' }} />
              {t('status.live')}
            </span>
          )}
        </h1>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--zh-font)' }}>
          <ArrowLeft size={15} /> {t('scenes.back')}
        </button>
      </div>

      {/* Tab-Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button style={pillStyle(tab === 'gesamt')} onClick={() => setTab('gesamt')}>Gesamt</button>
        <button style={pillStyle(tab === 'kurs')} onClick={() => setTab('kurs')}>Kurs</button>
        <button style={pillStyle(tab === 'thema')} onClick={() => setTab('thema')}>Thema</button>
        <button style={pillStyle(tab === 'szene')} onClick={() => setTab('szene')}>Szene</button>
      </div>

      {/* Ladeindikator */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px', color: 'var(--zh-color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontSize: '14px' }}>{t('status.laden')}</span>
        </div>
      )}

      {/* ═══ TAB: GESAMT ═══ */}
      {!loading && tab === 'gesamt' && renderGesamtTable(gesamtData, 'Noch keine Resultate vorhanden.')}

      {/* ═══ TAB: KURS ═══ */}
      {!loading && tab === 'kurs' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
                Kurs wählen
              </label>
              <select value={selectedKursId} onChange={e => { setSelectedKursId(e.target.value); setKursCodeInput('') }} style={selectStyle}>
                <option value="">— Kurs wählen —</option>
                {kurse.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.datum})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
                Oder Zugangscode eingeben
              </label>
              <input
                type="text"
                value={kursCodeInput}
                onChange={e => { setKursCodeInput(e.target.value); setSelectedKursId('') }}
                placeholder="FaSi4safety"
                style={{ ...selectStyle, boxSizing: 'border-box' as const }}
              />
            </div>
          </div>
          {renderGesamtTable(kursData, selectedKursId || kursCodeInput.trim() ? 'Noch keine Resultate für diesen Kurs.' : 'Bitte einen Kurs wählen oder Zugangscode eingeben.')}
        </>
      )}

      {/* ═══ TAB: THEMA ═══ */}
      {!loading && tab === 'thema' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
              Thema wählen
            </label>
            <select value={selectedTopicId} onChange={e => setSelectedTopicId(e.target.value)} style={selectStyle}>
              <option value="">— Thema wählen —</option>
              {topics.map(tp => (
                <option key={tp.id} value={tp.id}>{ml(tp.nameI18n, lang)}</option>
              ))}
            </select>
          </div>
          {selectedTopicId && renderGesamtTable(themaData, 'Keine Resultate für dieses Thema.')}
        </>
      )}

      {/* ═══ TAB: SZENE ═══ */}
      {!loading && tab === 'szene' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
              Szene wählen
            </label>
            <select value={selectedSceneId} onChange={e => setSelectedSceneId(e.target.value)} style={selectStyle}>
              <option value="">— Szene wählen —</option>
              {scenes.map(s => (
                <option key={s.id} value={s.id}>{ml(s.nameI18n, lang)}</option>
              ))}
            </select>
          </div>

          {selectedSceneId && (
            <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)' }}>
                    {['Rang', 'Name', 'Punkte', '%', 'Dauer', 'Sterne'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', textAlign: h === 'Name' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {szeneData.map((r, idx) => {
                    const isOwn = r.username === username
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--zh-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}><RangCell idx={idx} /></td>
                        <td style={{ padding: '10px 12px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--zh-blau)' : 'var(--zh-color-text)', textAlign: 'left', fontSize: '13px' }}>{r.username}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--zh-blau)', textAlign: 'right', fontSize: '14px' }}>{r.punkte.toLocaleString('de-CH')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: r.prozent >= 90 ? '#1A7F1F' : r.prozent >= 60 ? '#B87300' : 'var(--zh-color-text-muted)', textAlign: 'right' }}>{r.prozent}%</td>
                        <td style={{ padding: '10px 12px', color: 'var(--zh-color-text-muted)', textAlign: 'right', fontSize: '12px' }}>
                          <Clock size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                          {formatDauer(r.dauerSekunden)}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <SterneAnzeige sterne={berechneSterne(r.prozent)} size={13} />
                        </td>
                      </tr>
                    )
                  })}
                  {szeneData.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px' }}>Keine Resultate für diese Szene.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
