// RankingView – 3 Tabs: Ewige Rangliste | Kurs-Rangliste | Tagesrangliste
// Jeder Tab mit eigenem Filter und Tabelle

import { Trophy, ArrowLeft } from 'lucide-react'
import { getRankingGesamt, getRankingByKurs, getRankingByStunde, getKurse, type RankingEntry, type Kurs } from '../data/appData'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  username: string
  onBack: () => void
}

type RankingTab = 'ewig' | 'kurs' | 'tag'

// Rang-Anzeige ohne Emojis
function RangCell({ idx }: { idx: number }) {
  if (idx === 0) return <span style={{ fontWeight: 800, color: '#B87300' }}>1.</span>
  if (idx === 1) return <span style={{ fontWeight: 800, color: '#6B7280' }}>2.</span>
  if (idx === 2) return <span style={{ fontWeight: 800, color: '#7C4A00' }}>3.</span>
  return <span>#{idx + 1}</span>
}

// Gemeinsame Tabellenstruktur
function RankingTable({
  entries,
  username,
  columns,
  emptyLabel,
}: {
  entries: RankingEntry[]
  username: string
  columns: { key: string; label: string; align?: 'left' | 'right' }[]
  emptyLabel: string
}) {
  const { t } = useTranslation()
  const ownIdx = entries.findIndex(e => e.username === username)

  return (
    <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden', boxShadow: 'var(--zh-shadow-sm)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)' }}>
            <th style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-muted)', textAlign: 'left' }}>
              {t('ranking.rank')}
            </th>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-muted)', textAlign: col.align ?? 'left' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isOwn = idx === ownIdx
            return (
              <tr key={`${entry.id ?? entry.username}-${idx}`}
                style={{ borderBottom: '1px solid var(--zh-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: isOwn ? 700 : 400 }}>
                  <RangCell idx={idx} />
                </td>
                {columns.map(col => {
                  if (col.key === 'username') return (
                    <td key={col.key} style={{ padding: '14px 20px', fontSize: '14px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--zh-color-accent)' : 'var(--zh-color-text)', textAlign: col.align ?? 'left' }}>
                      {entry.username}
                      {isOwn && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-accent)', opacity: 0.7 }}>(Sie)</span>}
                    </td>
                  )
                  if (col.key === 'score') return (
                    <td key={col.key} style={{ padding: '14px 20px', fontSize: '15px', fontWeight: 800, color: 'var(--zh-color-accent)', textAlign: col.align ?? 'right' }}>
                      {entry.score.toLocaleString('de-CH')}
                    </td>
                  )
                  if (col.key === 'scenesCount') return (
                    <td key={col.key} style={{ padding: '14px 20px', fontSize: '14px', color: 'var(--zh-color-text-muted)', textAlign: col.align ?? 'right' }}>
                      {entry.scenesCount}
                    </td>
                  )
                  if (col.key === 'datum') return (
                    <td key={col.key} style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--zh-color-text-muted)', textAlign: col.align ?? 'left' }}>
                      {new Date(entry.timestamp).toLocaleDateString('de-CH')}
                    </td>
                  )
                  if (col.key === 'zeit') return (
                    <td key={col.key} style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--zh-color-text-muted)', textAlign: col.align ?? 'left' }}>
                      {new Date(entry.timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  )
                  return <td key={col.key} />
                })}
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} style={{ padding: '32px 20px', textAlign: 'center', fontSize: '14px', color: 'var(--zh-color-text-disabled)' }}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function RankingView({ username, onBack }: Props) {
  const { t } = useTranslation()

  const [tab, setTab] = useState<RankingTab>('ewig')

  // Ewige Rangliste
  const [ewigEntries, setEwigEntries] = useState<RankingEntry[]>([])

  // Kurs-Rangliste
  const [kurse, setKurse] = useState<Kurs[]>([])
  const [selectedKursId, setSelectedKursId] = useState<string>('')
  const [kursCodeInput, setKursCodeInput] = useState('')
  const [kursEntries, setKursEntries] = useState<RankingEntry[]>([])

  // Tagesrangliste
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [tagEntries, setTagEntries] = useState<RankingEntry[]>([])

  useEffect(() => {
    setEwigEntries(getRankingGesamt())
    setKurse(getKurse())
  }, [])

  useEffect(() => {
    if (selectedKursId) {
      setKursEntries(getRankingByKurs(selectedKursId))
    } else if (kursCodeInput.trim()) {
      const found = kurse.find(k => k.zugangscode === kursCodeInput.trim())
      if (found) setKursEntries(getRankingByKurs(found.id))
      else setKursEntries([])
    } else {
      setKursEntries([])
    }
  }, [selectedKursId, kursCodeInput, kurse])

  useEffect(() => {
    if (selectedDate) {
      setTagEntries(getRankingByStunde(selectedDate))
    }
  }, [selectedDate])

  // Tab-Pill-Style
  function pillStyle(isActive: boolean): React.CSSProperties {
    return {
      padding: '6px 16px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      border: isActive ? 'none' : '1px solid var(--zh-color-border)',
      background: isActive ? 'var(--zh-dunkelblau)' : 'transparent',
      color: isActive ? 'white' : 'var(--zh-color-text-muted)',
      fontFamily: 'var(--zh-font)',
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="flex items-center gap-3 font-bold" style={{ fontSize: '24px', color: 'var(--zh-color-text)' }}>
          <Trophy style={{ color: 'var(--zh-orange)' }} size={24} />
          {t('ranking.title')}
        </h1>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--zh-font)' }}
        >
          <ArrowLeft size={15} /> {t('einstieg.zurueck')}
        </button>
      </div>

      {/* Tab-Pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button style={pillStyle(tab === 'ewig')} onClick={() => setTab('ewig')}>{t('ranking.ewig')}</button>
        <button style={pillStyle(tab === 'kurs')} onClick={() => setTab('kurs')}>{t('ranking.kurs')}</button>
        <button style={pillStyle(tab === 'tag')} onClick={() => setTab('tag')}>{t('ranking.tag')}</button>
      </div>

      {/* ═══ TAB: EWIGE RANGLISTE ═══ */}
      {tab === 'ewig' && (
        <RankingTable
          entries={ewigEntries}
          username={username}
          columns={[
            { key: 'username', label: t('ranking.name') },
            { key: 'score', label: t('ranking.score'), align: 'right' },
            { key: 'scenesCount', label: t('ranking.scenes'), align: 'right' },
            { key: 'datum', label: 'Datum' },
          ]}
          emptyLabel={t('ranking.leer')}
        />
      )}

      {/* ═══ TAB: KURS-RANGLISTE ═══ */}
      {tab === 'kurs' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
                {t('ranking.kurs_waehlen')}
              </label>
              <select value={selectedKursId} onChange={e => { setSelectedKursId(e.target.value); setKursCodeInput('') }}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}>
                <option value="">— {t('ranking.kurs_waehlen')} —</option>
                {kurse.filter(k => k.isActive).map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.datum})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
                {t('ranking.kurs_code')}
              </label>
              <input
                type="text"
                value={kursCodeInput}
                onChange={e => { setKursCodeInput(e.target.value); setSelectedKursId('') }}
                placeholder="FK-RSI-123456"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <RankingTable
            entries={kursEntries}
            username={username}
            columns={[
              { key: 'username', label: t('ranking.name') },
              { key: 'score', label: t('ranking.score'), align: 'right' },
              { key: 'scenesCount', label: t('ranking.scenes'), align: 'right' },
            ]}
            emptyLabel={t('ranking.leer')}
          />
        </>
      )}

      {/* ═══ TAB: TAGESRANGLISTE ═══ */}
      {tab === 'tag' && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', display: 'block', marginBottom: '6px' }}>
              {t('ranking.tag_waehlen')}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)' }}
            />
          </div>
          <RankingTable
            entries={tagEntries}
            username={username}
            columns={[
              { key: 'username', label: t('ranking.name') },
              { key: 'score', label: t('ranking.score'), align: 'right' },
              { key: 'scenesCount', label: t('ranking.scenes'), align: 'right' },
              { key: 'zeit', label: 'Zeit' },
            ]}
            emptyLabel={t('ranking.leer')}
          />
        </>
      )}
    </div>
  )
}
