// AdminRanking – Ranglisten-Verwaltung im Admin-Dashboard
// Zeigt alle Supabase-Eintraege, erlaubt Loeschen einzelner Eintraege,
// aller Eintraege eines Users, eines Kurses oder komplettes Reset

import { useEffect, useState } from 'react'
import { Trash2, AlertTriangle, RefreshCw, Users, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase, setSupabaseStatus, type SupabaseResult } from '../../lib/supabase'
import { getAllSceneResults } from '../../data/appData'

// Lokaler Fallback-Typ (passt zu SceneResult-Struktur)
interface LocalResult {
  id: string
  username: string
  kursId: string | null
  sceneId: string
  punkte: number
  prozent: number
  dauerSekunden: number
  timestamp: string
}

export default function AdminRanking() {
  const { t } = useTranslation()
  const [results, setResults] = useState<SupabaseResult[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(false)
  const [filter, setFilter] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => Promise<void> } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Lokale Resultate als Fallback
  const [localResults, setLocalResults] = useState<LocalResult[]>([])

  async function fetchResults() {
    setLoading(true)
    if (supabase) {
      const { data, error } = await supabase.from('rsi_results').select('*').order('created_at', { ascending: false }).limit(500)
      if (!error && data) {
        setResults(data as SupabaseResult[])
        setIsOnline(true)
        setSupabaseStatus('live')
        setLoading(false)
        return
      }
      console.warn('[RSI Admin] Supabase fetch:', error?.message)
      setSupabaseStatus('offline')
    }
    // Fallback: localStorage
    const local = getAllSceneResults()
    setLocalResults(local.map(r => ({
      id: r.id,
      username: r.username,
      kursId: r.kursId,
      sceneId: r.sceneId,
      punkte: r.punkte,
      prozent: r.prozent,
      dauerSekunden: r.dauerSekunden,
      timestamp: r.timestamp,
    })).reverse())
    setIsOnline(false)
    setLoading(false)
  }

  useEffect(() => { fetchResults() }, [])

  function showFeedback(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  // ── Loeschen: einzelner Eintrag ──
  async function deleteEntry(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('rsi_results').delete().eq('id', id)
    if (error) { showFeedback(`Fehler: ${error.message}`); return }
    setResults(prev => prev.filter(r => r.id !== id))
    showFeedback('Eintrag geloescht.')
  }

  // ── Loeschen: alle Eintraege eines Users ──
  async function deleteByUsername(username: string) {
    if (!supabase) return
    const { error } = await supabase.from('rsi_results').delete().eq('username', username)
    if (error) { showFeedback(`Fehler: ${error.message}`); return }
    setResults(prev => prev.filter(r => r.username !== username))
    showFeedback(`Alle Eintraege von "${username}" geloescht.`)
  }

  // ── Loeschen: alle Eintraege eines Kurses ──
  async function deleteByKurs(kursCode: string) {
    if (!supabase) return
    const { error } = await supabase.from('rsi_results').delete().eq('kurs_code', kursCode)
    if (error) { showFeedback(`Fehler: ${error.message}`); return }
    setResults(prev => prev.filter(r => r.kurs_code !== kursCode))
    showFeedback(`Kurs "${kursCode}" zurueckgesetzt.`)
  }

  // ── Loeschen: alles ──
  async function deleteAll() {
    if (!supabase) return
    // Supabase: delete mit always-true Filter
    const { error } = await supabase.from('rsi_results').delete().gte('created_at', '1970-01-01')
    if (error) { showFeedback(`Fehler: ${error.message}`); return }
    setResults([])
    showFeedback('Alle Eintraege geloescht.')
  }

  // ── Eindeutige User + Kurse fuer Schnellaktionen ──
  const uniqueUsers = [...new Set(results.map(r => r.username))].sort()
  const uniqueKurse = [...new Set(results.filter(r => r.kurs_code).map(r => r.kurs_code!))].sort()

  // ── Gefilterte Resultate ──
  const filtered = filter.trim()
    ? results.filter(r =>
      r.username.toLowerCase().includes(filter.toLowerCase()) ||
      r.scene_id.toLowerCase().includes(filter.toLowerCase()) ||
      (r.kurs_code ?? '').toLowerCase().includes(filter.toLowerCase()))
    : results

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--zh-font)', border: 'none',
  }

  return (
    <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)', margin: 0 }}>
            {t('admin.rangliste_titel')}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '2px' }}>
            {isOnline
              ? `${results.length} Eintraege in Supabase`
              : `${localResults.length} lokale Eintraege (Supabase nicht erreichbar)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchResults} style={{ ...btnStyle, background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text-muted)', border: '1px solid var(--zh-color-border)' }}>
            <RefreshCw size={12} /> Aktualisieren
          </button>
          {isOnline && results.length > 0 && (
            <button
              onClick={() => setConfirmAction({ label: 'Alle Eintraege unwiderruflich loeschen?', action: deleteAll })}
              style={{ ...btnStyle, background: 'rgba(212,0,83,0.1)', color: '#D40053' }}
            >
              <Trash2 size={12} /> Alles zuruecksetzen
            </button>
          )}
        </div>
      </div>

      {/* Feedback-Toast */}
      {feedback && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(26,127,31,0.1)', border: '1px solid rgba(26,127,31,0.3)', color: '#1A7F1F', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
          {feedback}
        </div>
      )}

      {/* Bestaetigungs-Dialog */}
      {confirmAction && (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(212,0,83,0.06)', border: '1px solid rgba(212,0,83,0.2)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <AlertTriangle size={18} style={{ color: '#D40053', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--zh-color-text)', flex: 1 }}>
            {confirmAction.label}
          </span>
          <button
            onClick={async () => { await confirmAction.action(); setConfirmAction(null) }}
            style={{ ...btnStyle, background: '#D40053', color: 'white' }}
          >
            Ja, loeschen
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            style={{ ...btnStyle, background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text-muted)', border: '1px solid var(--zh-color-border)' }}
          >
            {t('admin.cancelBtn')}
          </button>
        </div>
      )}

      {/* Schnellaktionen: User loeschen */}
      {isOnline && uniqueUsers.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', marginBottom: '8px' }}>
            <Users size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
            {t('admin.rangliste_user')} ({uniqueUsers.length})
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {uniqueUsers.map(u => {
              const count = results.filter(r => r.username === u).length
              return (
                <div key={u} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', borderRadius: '6px',
                  background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)',
                  fontSize: '12px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--zh-color-text)' }}>{u}</span>
                  <span style={{ color: 'var(--zh-color-text-disabled)' }}>({count})</span>
                  <button
                    onClick={() => setConfirmAction({ label: `Alle ${count} Eintraege von "${u}" loeschen?`, action: () => deleteByUsername(u) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D40053', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={`Alle Eintraege von ${u} loeschen`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schnellaktionen: Kurs zuruecksetzen */}
      {isOnline && uniqueKurse.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', marginBottom: '8px' }}>
            {t('admin.rangliste_kurse')}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {uniqueKurse.map(k => {
              const count = results.filter(r => r.kurs_code === k).length
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 10px', borderRadius: '6px',
                  background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)',
                  fontSize: '12px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--zh-color-text)' }}>{k}</span>
                  <span style={{ color: 'var(--zh-color-text-disabled)' }}>({count})</span>
                  <button
                    onClick={() => setConfirmAction({ label: `Kurs "${k}" zuruecksetzen (${count} Eintraege)?`, action: () => deleteByKurs(k) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D40053', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={`Kurs ${k} zuruecksetzen`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Suchfilter */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--zh-color-text-disabled)' }} />
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filtern nach Username, Szene, Kurs..."
          style={{
            width: '100%', padding: '9px 12px 9px 34px', borderRadius: '8px',
            border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)',
            color: 'var(--zh-color-text)', fontSize: '13px', fontFamily: 'var(--zh-font)',
            boxSizing: 'border-box', outline: 'none',
          }}
        />
      </div>

      {/* Tabelle */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--zh-color-text-muted)', fontSize: '14px' }}>
          {t('status.laden')}
        </p>
      ) : isOnline ? (
        <div style={{ borderRadius: '10px', border: '1px solid var(--zh-color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--zh-color-bg-secondary)', borderBottom: '1px solid var(--zh-color-border)' }}>
                {['Username', 'Szene', 'Kurs', 'Punkte', '%', 'Dauer', 'Datum', ''].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', textAlign: h === 'Username' || h === 'Szene' || h === 'Kurs' ? 'left' : 'right' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--zh-color-border)' : 'none' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: 'var(--zh-color-text)' }}>{r.username}</td>
                  <td style={{ padding: '7px 10px', color: 'var(--zh-color-text-muted)' }}>{r.scene_id}</td>
                  <td style={{ padding: '7px 10px', color: 'var(--zh-color-text-muted)' }}>{r.kurs_code ?? '—'}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: 'var(--zh-blau)', textAlign: 'right' }}>{r.punkte}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'right', color: r.prozent >= 90 ? '#1A7F1F' : r.prozent >= 60 ? '#B87300' : 'var(--zh-color-text-muted)' }}>{r.prozent}%</td>
                  <td style={{ padding: '7px 10px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>{r.dauer_sekunden ? `${r.dauer_sekunden}s` : '—'}</td>
                  <td style={{ padding: '7px 10px', color: 'var(--zh-color-text-disabled)', textAlign: 'right', fontSize: '11px' }}>{new Date(r.created_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    <button
                      onClick={() => setConfirmAction({ label: `Eintrag von "${r.username}" (${r.punkte} Pkt.) loeschen?`, action: () => deleteEntry(r.id) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-disabled)', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title="Eintrag loeschen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)' }}>Keine Eintraege gefunden.</td></tr>
              )}
              {filtered.length > 100 && (
                <tr><td colSpan={8} style={{ padding: '10px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '11px' }}>Zeige 100 von {filtered.length} Eintraegen. Filter verwenden fuer gezieltere Ansicht.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '24px', borderRadius: '10px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', marginBottom: '8px' }}>
            Supabase nicht erreichbar — nur lokale Daten verfuegbar.
          </p>
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)' }}>
            {localResults.length} lokale Resultate. Loeschen ist nur mit Supabase-Verbindung moeglich.
          </p>
        </div>
      )}
    </div>
  )
}
