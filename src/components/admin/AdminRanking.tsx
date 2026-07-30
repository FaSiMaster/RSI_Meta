// AdminRanking – Ranglisten-Verwaltung im Admin-Dashboard
// Zeigt alle Supabase-Einträge, erlaubt Löschen einzelner Einträge,
// aller Einträge eines Users, eines Kurses oder komplettes Reset

import { useEffect, useState } from 'react'
import { Trash2, AlertTriangle, RefreshCw, Users, Search, FileDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase, setSupabaseStatus, type SupabaseResult } from '../../lib/supabase'
import { getAllSceneResults, getAllScenes, getDeficits, ml, type DefizitResult } from '../../data/appData'
import { deleteResultsSupabase } from '../../data/supabaseSync'

/** Serverseitige Usernamen sind SHA-256-Hashes — fuer die Anzeige gekuerzt. */
function kurzName(name: string): string {
  return /^[0-9a-f]{64}$/i.test(name) ? `${name.slice(0, 10)}…` : name
}

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
  const { t, i18n } = useTranslation()
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

  // Loeschungen laufen seit v0.9.9 ueber die Edge Function admin-write
  // (service_role). Direkte anon-Deletes wurden von der RLS still verworfen —
  // die Buttons taten vorher nur scheinbar etwas.

  // ── Löschen: einzelner Eintrag ──
  async function deleteEntry(id: string) {
    if (!supabase) return
    try {
      await deleteResultsSupabase({ id })
      setResults(prev => prev.filter(r => r.id !== id))
      showFeedback('Eintrag gelöscht.')
    } catch (err) {
      showFeedback(`Fehler: ${err instanceof Error ? err.message : err}`)
    }
  }

  // ── Löschen: alle Einträge eines Users ──
  async function deleteByUsername(username: string) {
    if (!supabase) return
    try {
      const n = await deleteResultsSupabase({ username })
      setResults(prev => prev.filter(r => r.username !== username))
      showFeedback(`${n} Einträge von "${username}" gelöscht.`)
    } catch (err) {
      showFeedback(`Fehler: ${err instanceof Error ? err.message : err}`)
    }
  }

  // ── Löschen: alle Einträge eines Kurses ──
  async function deleteByKurs(kursCode: string) {
    if (!supabase) return
    try {
      const n = await deleteResultsSupabase({ kurs_code: kursCode })
      setResults(prev => prev.filter(r => r.kurs_code !== kursCode))
      showFeedback(`Kurs "${kursCode}" zurückgesetzt (${n} Einträge).`)
    } catch (err) {
      showFeedback(`Fehler: ${err instanceof Error ? err.message : err}`)
    }
  }

  // ── Löschen: alles ──
  async function deleteAll() {
    if (!supabase) return
    try {
      const n = await deleteResultsSupabase({ all: true })
      setResults([])
      showFeedback(`Alle Einträge gelöscht (${n}).`)
    } catch (err) {
      showFeedback(`Fehler: ${err instanceof Error ? err.message : err}`)
    }
  }

  // ── PDF-Export (v0.11.0) ──────────────────────────────────────────────────
  // pdfmake wird erst beim Klick nachgeladen (eigener Chunk, rund 1 MB).
  const [pdfBusy, setPdfBusy] = useState<string | null>(null)

  const szenenNamen = new Map(getAllScenes().map(s => [s.id, ml(s.nameI18n, i18n.language)]))

  async function exportKurs(kursCode: string) {
    setPdfBusy(kursCode)
    try {
      const { exportKursPdf } = await import('../../utils/pdfExport')
      const zeilen = results
        .filter(r => r.kurs_code === kursCode)
        .map(r => ({
          teilnehmer:    kurzName(r.username),
          szene:         szenenNamen.get(r.scene_id) ?? r.scene_id,
          datumIso:      r.created_at,
          punkte:        r.punkte,
          maxPunkte:     r.detail?.maxPunkte ?? null,
          prozent:       r.prozent,
          dauerSekunden: r.dauer_sekunden,
          bestanden:     r.bestanden ?? null,
        }))
      await exportKursPdf({ kursName: kursCode, zeilen, anonymisiert: isOnline }, t, i18n.language)
    } catch (err) {
      showFeedback(`${t('bericht.export_fehler')} ${err instanceof Error ? err.message : ''}`)
    } finally {
      setPdfBusy(null)
    }
  }

  /**
   * Einzelbericht aus einer Serverzeile. Die Befundliste kann nur gefuellt
   * werden, wenn die Zeile die `detail`-Spalte hat (ab v0.11.0 plus Migration).
   * Aeltere Zeilen ergeben einen Bericht mit Kopfdaten und Hinweis.
   */
  async function exportEinzel(r: SupabaseResult) {
    setPdfBusy(r.id)
    try {
      const [{ baueDefizitListe }, { exportTeilnehmerPdf }] = await Promise.all([
        import('../../data/berichtModel'),
        import('../../utils/pdfExport'),
      ])
      const scene = getAllScenes().find(s => s.id === r.scene_id) ?? null
      const deficits = scene ? getDeficits(scene.id) : []
      const detail = r.detail ?? null
      const defizitResults = (detail?.defizitResults ?? []) as DefizitResult[]

      await exportTeilnehmerPdf({
        teilnehmer:        kurzName(r.username),
        szene:             scene ? ml(scene.nameI18n, i18n.language) : r.scene_id,
        szeneBeschreibung: scene ? ml(scene.beschreibungI18n, i18n.language) : '',
        thema:             null,
        kurs:              r.kurs_code,
        datumIso:          r.created_at,
        dauerSekunden:     r.dauer_sekunden ?? 0,
        versuch:           detail?.versuch ?? 1,
        punkte:            r.punkte,
        maxPunkte:         detail?.maxPunkte ?? 0,
        prozent:           r.prozent,
        bestanden:         r.bestanden ?? null,
        gefunden:          detail?.gefunden ?? defizitResults.length,
        total:             detail?.total ?? deficits.length,
        pflichtGefunden:   detail?.pflichtGefunden ?? null,
        pflichtTotal:      detail?.pflichtTotal ?? null,
        defizite:          detail ? baueDefizitListe(deficits, defizitResults, i18n.language) : [],
      }, t, i18n.language)
    } catch (err) {
      showFeedback(`${t('bericht.export_fehler')} ${err instanceof Error ? err.message : ''}`)
    } finally {
      setPdfBusy(null)
    }
  }

  // ── Eindeutige User + Kurse für Schnellaktionen ──
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
              ? `${results.length} Einträge in Supabase`
              : `${localResults.length} lokale Einträge (Supabase nicht erreichbar)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchResults} style={{ ...btnStyle, background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text-muted)', border: '1px solid var(--zh-color-border)' }}>
            <RefreshCw size={12} /> Aktualisieren
          </button>
          {isOnline && results.length > 0 && (
            <button
              onClick={() => setConfirmAction({ label: 'Alle Einträge unwiderruflich löschen?', action: deleteAll })}
              style={{ ...btnStyle, background: 'rgba(212,0,83,0.1)', color: 'var(--zh-rot)' }}
            >
              <Trash2 size={12} /> Alles zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Feedback-Toast */}
      {feedback && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(26,127,31,0.1)', border: '1px solid rgba(26,127,31,0.3)', color: 'var(--zh-gruen)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
          {feedback}
        </div>
      )}

      {/* Bestätigungs-Dialog */}
      {confirmAction && (
        <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(212,0,83,0.06)', border: '1px solid rgba(212,0,83,0.2)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <AlertTriangle size={18} style={{ color: 'var(--zh-rot)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--zh-color-text)', flex: 1 }}>
            {confirmAction.label}
          </span>
          <button
            onClick={async () => { await confirmAction.action(); setConfirmAction(null) }}
            style={{ ...btnStyle, background: 'var(--zh-rot)', color: 'white' }}
          >
            Ja, löschen
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            style={{ ...btnStyle, background: 'var(--zh-color-bg-secondary)', color: 'var(--zh-color-text-muted)', border: '1px solid var(--zh-color-border)' }}
          >
            {t('admin.cancelBtn')}
          </button>
        </div>
      )}

      {/* Schnellaktionen: User löschen */}
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
                    onClick={() => setConfirmAction({ label: `Alle ${count} Einträge von "${u}" löschen?`, action: () => deleteByUsername(u) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-rot)', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={`Alle Einträge von ${u} löschen`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Schnellaktionen: Kurs zurücksetzen */}
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
                    onClick={() => exportKurs(k)}
                    disabled={pdfBusy === k}
                    style={{ background: 'none', border: 'none', cursor: pdfBusy === k ? 'progress' : 'pointer', color: 'var(--zh-blau)', padding: '2px', display: 'flex', alignItems: 'center', opacity: pdfBusy === k ? 0.5 : 1 }}
                    title={t('bericht.export_kurs_btn')}
                  >
                    <FileDown size={12} />
                  </button>
                  <button
                    onClick={() => setConfirmAction({ label: `Kurs "${k}" zurücksetzen (${count} Einträge)?`, action: () => deleteByKurs(k) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-rot)', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title={`Kurs ${k} zurücksetzen`}
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
                  <td style={{ padding: '7px 10px', fontWeight: 700, textAlign: 'right', color: r.prozent >= 90 ? 'var(--zh-gruen)' : r.prozent >= 60 ? 'var(--zh-orange)' : 'var(--zh-color-text-muted)' }}>{r.prozent}%</td>
                  <td style={{ padding: '7px 10px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>{r.dauer_sekunden ? `${r.dauer_sekunden}s` : '—'}</td>
                  <td style={{ padding: '7px 10px', color: 'var(--zh-color-text-disabled)', textAlign: 'right', fontSize: '11px' }}>{new Date(r.created_at).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => exportEinzel(r)}
                        disabled={pdfBusy === r.id}
                        style={{ background: 'none', border: 'none', cursor: pdfBusy === r.id ? 'progress' : 'pointer', color: 'var(--zh-blau)', padding: '2px', display: 'flex', alignItems: 'center', opacity: pdfBusy === r.id ? 0.5 : 1 }}
                        title={t('bericht.export_btn')}
                      >
                        <FileDown size={12} />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ label: `Eintrag von "${r.username}" (${r.punkte} Pkt.) löschen?`, action: () => deleteEntry(r.id) })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-disabled)', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Eintrag löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)' }}>Keine Einträge gefunden.</td></tr>
              )}
              {filtered.length > 100 && (
                <tr><td colSpan={8} style={{ padding: '10px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '11px' }}>Zeige 100 von {filtered.length} Einträgen. Filter verwenden für gezieltere Ansicht.</td></tr>
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
            {localResults.length} lokale Resultate. Löschen ist nur mit Supabase-Verbindung möglich.
          </p>
        </div>
      )}
    </div>
  )
}
