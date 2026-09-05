// RankingView – 4-Ebenen-Ranking: Gesamt | Kurs | Thema | Szene
// Primaer: Supabase (Live-Ranking, Realtime-Subscription)
// Fallback: localStorage (wenn Supabase nicht erreichbar)

import { Trophy, ArrowLeft, Clock, Loader2 } from 'lucide-react'
import {
  getGesamtRanking, getThemaRanking, getSzeneRanking, getKursRanking,
  getTopics, getAllScenes, getKurse, berechneSterne, ml, hashUsername,
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

type Aggregat = { username: string; score: number; szenen: number; besteProzent: number; bestandenSzenen: number }

function aggregateGesamt(results: SupabaseResult[]): Aggregat[] {
  const userMap = new Map<string, Map<string, SupabaseResult>>()
  // Bestanden zaehlt pro Szene, sobald irgendein Versuch bestanden war (v0.9.7)
  const bestandenMap = new Map<string, Set<string>>()
  results.forEach(r => {
    if (!userMap.has(r.username)) userMap.set(r.username, new Map())
    const sceneMap = userMap.get(r.username)!
    const existing = sceneMap.get(r.scene_id)
    if (!existing || r.punkte > existing.punkte) sceneMap.set(r.scene_id, r)
    if (r.bestanden === true) {
      if (!bestandenMap.has(r.username)) bestandenMap.set(r.username, new Set())
      bestandenMap.get(r.username)!.add(r.scene_id)
    }
  })
  const ranking: Aggregat[] = []
  userMap.forEach((sceneMap, username) => {
    const bests = Array.from(sceneMap.values())
    const score = bests.reduce((s, r) => s + r.punkte, 0)
    const avgP = bests.length > 0 ? Math.round(bests.reduce((s, r) => s + r.prozent, 0) / bests.length) : 0
    ranking.push({ username, score, szenen: bests.length, besteProzent: avgP, bestandenSzenen: bestandenMap.get(username)?.size ?? 0 })
  })
  return ranking.sort((a, b) => b.score - a.score)
}

function aggregateByKurs(results: SupabaseResult[], kursCode: string): Aggregat[] {
  // Case-insensitiver Match + trim, weil Zugangscode auch manuell eingegeben
  // wird (Copy-Paste, Tippfehler bei Gross-/Kleinschreibung).
  const norm = kursCode.trim().toLowerCase()
  return aggregateGesamt(results.filter(r => (r.kurs_code ?? '').trim().toLowerCase() === norm))
}

function aggregateBySceneIds(results: SupabaseResult[], sceneIds: Set<string>): Aggregat[] {
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
      bestanden: r.bestanden ?? undefined,
    }))
}

// ── Rang-Anzeige ──────────────────────────────────────────────────────────

function RangCell({ idx }: { idx: number }) {
  if (idx === 0) return <span style={{ fontWeight: 800, color: 'var(--rsi-orange)' }}>1.</span>
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

  // Eigene Zeile im Live-Ranking erkennen (v0.9.7): Supabase speichert nur
  // den Username-Hash — der Klarname-Vergleich griff dort nie. Der eigene
  // Name wird clientseitig gleich gehasht; nur die eigene Zeile zeigt den
  // Klarnamen, alle anderen bleiben pseudonymisiert.
  const [ownHash, setOwnHash] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    hashUsername(username).then(h => { if (!cancelled) setOwnHash(h) }).catch(() => {})
    return () => { cancelled = true }
  }, [username])

  function isOwnRow(rowUsername: string): boolean {
    return rowUsername === username || (ownHash != null && rowUsername === ownHash)
  }
  function displayName(rowUsername: string): string {
    return isOwnRow(rowUsername) ? username : rowUsername
  }

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
  const [gesamtLocal, setGesamtLocal] = useState<Aggregat[]>([])
  const [kursLocal, setKursLocal] = useState<Aggregat[]>([])
  const [themaLocal, setThemaLocal] = useState<Aggregat[]>([])
  const [szeneLocal, setSzeneLocal] = useState<SceneResult[]>([])

  // Stammdaten + lokale Ranking-Daten bei jedem Mount laden. Zusaetzlich
  // bei jedem 'rsi-data-loaded'-Event (Supabase-Load wurde asynchron fertig)
  // neu laden, sonst bleiben Dropdowns leer wenn die Komponente vor dem
  // Supabase-Fetch gemountet hat.
  useEffect(() => {
    function reload() {
      setTopics(getTopics().filter(tp => tp.isActive))
      setScenes(getAllScenes().filter(s => s.isActive))
      setKurse(getKurse().filter(k => k.isActive))
      setGesamtLocal(getGesamtRanking())
    }
    reload()
    window.addEventListener('rsi-data-loaded', reload)
    return () => window.removeEventListener('rsi-data-loaded', reload)
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
        // Case-insensitiv match — Zugangscode kann manuell getippt werden
        const needle = kursCodeInput.trim().toLowerCase()
        const found = kurse.find(k => k.zugangscode.trim().toLowerCase() === needle)
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
      border: isActive ? 'none' : '1px solid var(--rsi-color-border)',
      background: isActive ? 'var(--rsi-dunkelblau)' : 'transparent',
      color: isActive ? 'white' : 'var(--rsi-color-text-muted)',
      fontFamily: 'var(--rsi-font)',
    }
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    border: '1px solid var(--rsi-color-border)',
    background: 'var(--rsi-color-bg-secondary)',
    color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)',
  }

  // ── Tabellen-Renderer ──

  function renderGesamtTable(data: Aggregat[], emptyMsg: string) {
    return (
      <div style={{ borderRadius: 'var(--rsi-radius-card)', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', overflow: 'hidden', boxShadow: 'var(--rsi-shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)' }}>
              {[t('ranking.rank'), t('ranking.name'), t('ranking.score'), t('ranking.scenes'), t('ranking.bestanden'), t('ranking.avg_prozent')].map((h, hi) => (
                <th key={h} style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-muted)', textAlign: hi === 1 ? 'left' : 'right' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((entry, idx) => {
              const isOwn = isOwnRow(entry.username)
              return (
                <tr key={entry.username} style={{ borderBottom: '1px solid var(--rsi-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--rsi-color-text-muted)', textAlign: 'right' }}><RangCell idx={idx} /></td>
                  <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--rsi-blau)' : 'var(--rsi-color-text)', textAlign: 'left' }}>
                    {displayName(entry.username)}{isOwn && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--rsi-blau)', opacity: 0.7 }}>{t('ranking.du')}</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 800, color: 'var(--rsi-blau)', textAlign: 'right' }}>{entry.score.toLocaleString('de-CH')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--rsi-color-text-muted)', textAlign: 'right' }}>{entry.szenen}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: entry.bestandenSzenen > 0 ? 'var(--rsi-gruen)' : 'var(--rsi-color-text-disabled)', textAlign: 'right' }}>
                    {entry.bestandenSzenen}/{entry.szenen}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: entry.besteProzent >= 90 ? 'var(--rsi-gruen)' : entry.besteProzent >= 60 ? 'var(--rsi-orange)' : 'var(--rsi-color-text-muted)', textAlign: 'right' }}>{entry.besteProzent}%</td>
                </tr>
              )
            })}
            {data.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--rsi-color-text-disabled)', fontSize: '13px' }}>{emptyMsg}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full" style={{ padding: 'var(--rsi-padding-page)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="flex items-center gap-3 font-bold" style={{ fontSize: '24px', color: 'var(--rsi-color-text)' }}>
          <Trophy style={{ color: 'var(--rsi-orange)' }} size={24} />
          {t('ranking.title')}
          {useSupabase && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--rsi-gruen)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--rsi-gruen)' }} />
              {t('status.live')}
            </span>
          )}
        </h1>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--rsi-color-text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--rsi-font)' }}>
          <ArrowLeft size={15} /> {t('scenes.back')}
        </button>
      </div>

      {/* Tab-Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button style={pillStyle(tab === 'gesamt')} onClick={() => setTab('gesamt')}>{t('ranking.gesamt')}</button>
        <button style={pillStyle(tab === 'kurs')} onClick={() => setTab('kurs')}>{t('ranking.kurs')}</button>
        <button style={pillStyle(tab === 'thema')} onClick={() => setTab('thema')}>{t('ranking.thema')}</button>
        <button style={pillStyle(tab === 'szene')} onClick={() => setTab('szene')}>{t('ranking.szene')}</button>
      </div>

      {/* Ladeindikator */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px', color: 'var(--rsi-color-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
          <span style={{ fontSize: '14px' }}>{t('status.laden')}</span>
        </div>
      )}

      {/* ═══ TAB: GESAMT ═══ */}
      {!loading && tab === 'gesamt' && renderGesamtTable(gesamtData, t('ranking.leer'))}

      {/* ═══ TAB: KURS ═══ */}
      {!loading && tab === 'kurs' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-muted)', display: 'block', marginBottom: '6px' }}>
                {t('ranking.kurs_wählen')}
              </label>
              <select value={selectedKursId} onChange={e => { setSelectedKursId(e.target.value); setKursCodeInput('') }} style={selectStyle}>
                <option value="">— {t('ranking.kurs_wählen')} —</option>
                {kurse.map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.datum})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-muted)', display: 'block', marginBottom: '6px' }}>
                {t('ranking.zugangscode_eingeben')}
              </label>
              <input
                type="text"
                value={kursCodeInput}
                onChange={e => { setKursCodeInput(e.target.value); setSelectedKursId('') }}
                placeholder="z.B. FK-RSI-123456"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ ...selectStyle, boxSizing: 'border-box' as const }}
              />
            </div>
          </div>
          {renderGesamtTable(kursData, selectedKursId || kursCodeInput.trim() ? t('ranking.leer_kurs') : t('ranking.kurs_hinweis'))}
        </>
      )}

      {/* ═══ TAB: THEMA ═══ */}
      {!loading && tab === 'thema' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-muted)', display: 'block', marginBottom: '6px' }}>
              {t('ranking.thema_wählen')}
            </label>
            <select value={selectedTopicId} onChange={e => setSelectedTopicId(e.target.value)} style={selectStyle}>
              <option value="">— {t('ranking.thema_wählen')} —</option>
              {topics.map(tp => (
                <option key={tp.id} value={tp.id}>{ml(tp.nameI18n, lang)}</option>
              ))}
            </select>
          </div>
          {selectedTopicId && renderGesamtTable(themaData, t('ranking.leer_thema'))}
        </>
      )}

      {/* ═══ TAB: SZENE ═══ */}
      {!loading && tab === 'szene' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-muted)', display: 'block', marginBottom: '6px' }}>
              {t('ranking.szene_wählen')}
            </label>
            <select value={selectedSceneId} onChange={e => setSelectedSceneId(e.target.value)} style={selectStyle}>
              <option value="">— {t('ranking.szene_wählen')} —</option>
              {scenes.map(s => (
                <option key={s.id} value={s.id}>{ml(s.nameI18n, lang)}</option>
              ))}
            </select>
          </div>

          {selectedSceneId && (
            <div style={{ borderRadius: 'var(--rsi-radius-card)', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-bg-secondary)' }}>
                    {[t('ranking.rank'), t('ranking.name'), t('ranking.punkte'), '%', t('ranking.bestanden'), t('ranking.dauer'), t('ranking.sterne')].map((h, hi) => (
                      <th key={h} style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-muted)', textAlign: hi === 1 ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {szeneData.map((r, idx) => {
                    const isOwn = isOwnRow(r.username)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--rsi-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}><RangCell idx={idx} /></td>
                        <td style={{ padding: '10px 12px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--rsi-blau)' : 'var(--rsi-color-text)', textAlign: 'left', fontSize: '13px' }}>
                          {displayName(r.username)}{isOwn && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, color: 'var(--rsi-blau)', opacity: 0.7 }}>{t('ranking.du')}</span>}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--rsi-blau)', textAlign: 'right', fontSize: '14px' }}>{r.punkte.toLocaleString('de-CH')}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 700, color: r.prozent >= 90 ? 'var(--rsi-gruen)' : r.prozent >= 60 ? 'var(--rsi-orange)' : 'var(--rsi-color-text-muted)', textAlign: 'right' }}>{r.prozent}%</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, textAlign: 'right', fontSize: '12px', color: r.bestanden === true ? 'var(--rsi-gruen)' : r.bestanden === false ? 'var(--rsi-rot)' : 'var(--rsi-color-text-disabled)' }}>
                          {r.bestanden === true ? '✓' : r.bestanden === false ? '✗' : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--rsi-color-text-muted)', textAlign: 'right', fontSize: '12px' }}>
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
                    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--rsi-color-text-disabled)', fontSize: '13px' }}>{t('ranking.leer_szene')}</td></tr>
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
