// RankingView – Tabelle: Rang | Name | Punkte | Szenen
// Eigener Eintrag hervorgehoben

import { Trophy, ArrowLeft } from 'lucide-react'
import { getRanking, type RankingEntry } from '../data/appData'
import { useEffect, useState } from 'react'

interface Props {
  username: string
  onBack: () => void
}

export default function RankingView({ username, onBack }: Props) {
  const [entries, setEntries] = useState<RankingEntry[]>([])

  useEffect(() => { setEntries(getRanking()) }, [])

  const ownIdx = entries.findIndex(e => e.username === username)

  return (
    <div className="max-w-2xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 className="flex items-center gap-3 font-bold" style={{ fontSize: '24px', color: 'var(--zh-color-text)' }}>
          <Trophy style={{ color: 'var(--zh-orange)' }} size={24} />
          Rangliste
        </h1>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={15} /> Zurück
        </button>
      </div>

      <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden', boxShadow: 'var(--zh-shadow-sm)' }}>
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)' }}>
              {['Rang', 'Name', 'Score', 'Szenen'].map((col, ci) => (
                <th key={col} style={{ padding: '12px 20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-muted)', textAlign: ci >= 2 ? 'right' : 'left' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const isOwn = idx === ownIdx
              return (
                <tr
                  key={`${entry.username}-${idx}`}
                  style={{ borderBottom: '1px solid var(--zh-color-border)', background: isOwn ? 'rgba(0,118,189,0.08)' : 'transparent' }}
                >
                  <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: isOwn ? 700 : 400 }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: isOwn ? 700 : 500, color: isOwn ? 'var(--zh-color-accent)' : 'var(--zh-color-text)' }}>
                    {entry.username}
                    {isOwn && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-accent)', opacity: 0.7 }}>(Sie)</span>}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '15px', fontWeight: 800, color: 'var(--zh-color-accent)', textAlign: 'right' }}>
                    {entry.score.toLocaleString('de-CH')}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>
                    {entry.scenesCount}
                  </td>
                </tr>
              )
            })}
            {entries.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '32px 20px', textAlign: 'center', fontSize: '14px', color: 'var(--zh-color-text-disabled)' }}>Noch keine Eintraege.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
