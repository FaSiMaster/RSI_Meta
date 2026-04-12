// RankingView – 3-Ebenen-Ranking: Gesamt | Thema | Szene
// Gesamt = Summe bester Resultate pro Szene
// Thema = Best-of pro Topic
// Szene = Alle Versuche einer Szene

import { Trophy, ArrowLeft, Clock } from 'lucide-react'
import {
  getGesamtRanking, getThemaRanking, getSzeneRanking,
  getTopics, getAllScenes, berechneSterne, ml,
  type AppTopic, type AppScene, type SceneResult,
} from '../data/appData'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SterneAnzeige } from './SceneList'

interface Props {
  username: string
  onBack: () => void
}

type RankingTab = 'gesamt' | 'thema' | 'szene'

// Rang-Anzeige
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

export default function RankingView({ username, onBack }: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const [tab, setTab] = useState<RankingTab>('gesamt')
  const [topics, setTopics] = useState<AppTopic[]>([])
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<string>('')
  const [selectedSceneId, setSelectedSceneId] = useState<string>('')

  // Ranking-Daten
  const [gesamtData, setGesamtData] = useState<{ username: string; score: number; szenen: number; besteProzent: number }[]>([])
  const [themaData, setThemaData] = useState<{ username: string; score: number; szenen: number; besteProzent: number }[]>([])
  const [szeneData, setSzeneData] = useState<SceneResult[]>([])

  useEffect(() => {
    setTopics(getTopics().filter(t => t.isActive))
    setScenes(getAllScenes().filter(s => s.isActive))
    setGesamtData(getGesamtRanking())
  }, [])

  useEffect(() => {
    if (selectedTopicId) {
      setThemaData(getThemaRanking(selectedTopicId))
    } else {
      setThemaData([])
    }
  }, [selectedTopicId])

  useEffect(() => {
    if (selectedSceneId) {
      setSzeneData(getSzeneRanking(selectedSceneId))
    } else {
      setSzeneData([])
    }
  }, [selectedSceneId])

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

  return (
    <div className="max-w-2xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="flex items-center gap-3 font-bold" style={{ fontSize: '24px', color: 'var(--zh-color-text)' }}>
          <Trophy style={{ color: 'var(--zh-orange)' }} size={24} />
          Rangliste
        </h1>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--zh-font)' }}>
          <ArrowLeft size={15} /> Zurück
        </button>
      </div>

      {/* Tab-Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button style={pillStyle(tab === 'gesamt')} onClick={() => setTab('gesamt')}>Gesamt</button>
        <button style={pillStyle(tab === 'thema')} onClick={() => setTab('thema')}>Nach Thema</button>
        <button style={pillStyle(tab === 'szene')} onClick={() => setTab('szene')}>Nach Szene</button>
      </div>

      {/* ═══ TAB: GESAMT ═══ */}
      {tab === 'gesamt' && (
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
              {gesamtData.map((entry, idx) => {
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
              {gesamtData.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px' }}>Noch keine Resultate vorhanden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ TAB: THEMA ═══ */}
      {tab === 'thema' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
              Thema wählen
            </label>
            <select value={selectedTopicId} onChange={e => setSelectedTopicId(e.target.value)} style={selectStyle}>
              <option value="">— Thema wählen —</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>{ml(t.nameI18n, lang)}</option>
              ))}
            </select>
          </div>

          {selectedTopicId && (
            <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)' }}>
                    {['Rang', 'Name', 'Score', 'Szenen', 'Ø %'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', textAlign: h === 'Name' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {themaData.map((entry, idx) => {
                    const isOwn = entry.username === username
                    return (
                      <tr key={entry.username} style={{ borderBottom: '1px solid var(--zh-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}><RangCell idx={idx} /></td>
                        <td style={{ padding: '12px 16px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--zh-blau)' : 'var(--zh-color-text)', textAlign: 'left' }}>{entry.username}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--zh-blau)', textAlign: 'right' }}>{entry.score.toLocaleString('de-CH')}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>{entry.szenen}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: entry.besteProzent >= 90 ? '#1A7F1F' : '#B87300', textAlign: 'right' }}>{entry.besteProzent}%</td>
                      </tr>
                    )
                  })}
                  {themaData.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px' }}>Keine Resultate für dieses Thema.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB: SZENE ═══ */}
      {tab === 'szene' && (
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
                    {['Rang', 'Name', 'Punkte', '%', 'Gefunden', 'Dauer', 'Sterne'].map(h => (
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
                        <td style={{ padding: '10px 12px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>{r.gefunden}/{r.total}</td>
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
                    <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px' }}>Keine Resultate für diese Szene.</td></tr>
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
