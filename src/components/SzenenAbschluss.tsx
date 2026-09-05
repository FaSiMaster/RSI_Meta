// SzenenAbschluss – Abschluss-Screen nach Szenenende
// Zeigt Punkte, Sterne, Versuche, Best-of, Zeitstatistik

import { useState } from 'react'
import { Trophy, CheckCircle2, XCircle, ArrowLeft, ChevronRight, BarChart3, Clock, TrendingUp, Award, FileDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ml, getBestResult, getVersuchAnzahl, berechneSterne, type AppScene, type AppDeficit, type FoundDeficit, type SceneResult } from '../data/appData'
import { istBestanden, kriteriumFuerSzene } from '../data/bestandenKriterium'
import { SterneAnzeige } from './SceneList'

interface Props {
  scene:          AppScene
  deficits:       AppDeficit[]
  foundDeficits:  FoundDeficit[]
  sceneScore:     number
  totalScore:     number
  sceneResult:    SceneResult | null
  username:       string
  onToTopics:     () => void
  onToRanking:    () => void
  onNextScene:    (() => void) | null
  /** Nur für den PDF-Bericht (v0.11.0) — Kopfangaben, sonst nicht verwendet. */
  themaName?:     string | null
  kursName?:      string | null
}

function formatDauer(sekunden: number): string {
  const min = Math.floor(sekunden / 60)
  const sek = sekunden % 60
  if (min === 0) return `${sek}s`
  return `${min}m ${sek}s`
}

export default function SzenenAbschluss({
  scene, deficits, foundDeficits, sceneScore, totalScore,
  sceneResult, username,
  onToTopics, onToRanking, onNextScene,
  themaName = null, kursName = null,
}: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  // PDF-Bericht (v0.11.0): pdfmake wird erst beim Klick geladen (eigener Chunk).
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'laeuft' | 'fehler'>('idle')

  async function handlePdfExport() {
    if (!sceneResult) return
    setPdfStatus('laeuft')
    try {
      const [{ baueTeilnehmerBericht }, { exportTeilnehmerPdf }] = await Promise.all([
        import('../data/berichtModel'),
        import('../utils/pdfExport'),
      ])
      const bericht = baueTeilnehmerBericht(sceneResult, scene, deficits, lang, themaName, kursName)
      await exportTeilnehmerPdf(bericht, t, lang)
      setPdfStatus('idle')
    } catch {
      setPdfStatus('fehler')
      setTimeout(() => setPdfStatus('idle'), 4000)
    }
  }

  const foundMap = new Map(foundDeficits.map(f => [f.deficitId, f]))
  const foundCount = foundDeficits.length
  const allFound = foundCount === deficits.length

  // Bestanden-Kriterium (v0.9.7): live aus den Props berechnet, damit auch
  // ohne gespeichertes Feld (Legacy-Resultate) der korrekte Stand erscheint.
  const kriterium = kriteriumFuerSzene(scene)
  const pflichtTotal = deficits.filter(d => d.isPflicht).length
  const pflichtGefunden = deficits.filter(d => d.isPflicht && foundMap.has(d.id)).length
  const prozentAktuell = sceneResult?.prozent ?? 0
  const bestanden = istBestanden(prozentAktuell, pflichtGefunden, pflichtTotal, kriterium)
  const pflichtFehlt = kriterium.allePflicht ? pflichtTotal - pflichtGefunden : 0

  // Review R-15: Standort-Vermerk für verpasste Defizite — wo wäre es
  // verortet gewesen? (Perspektiven-Ids auf Standort-Labels auflösen)
  const perspLabel = new Map((scene.perspektiven ?? []).map(p => [p.id, p.label]))
  function standorteFür(d: AppDeficit): string {
    const keys = d.verortungen ? Object.keys(d.verortungen) : []
    const labels = keys.map(k => k === 'haupt' ? t('szene.haupt') : (perspLabel.get(k) ?? k))
    if (labels.length === 0 && d.verortung) labels.push(t('szene.haupt'))
    return labels.join(', ')
  }

  // Statistik
  const best = getBestResult(username, scene.id)
  const versuche = getVersuchAnzahl(username, scene.id)
  const prozent = sceneResult?.prozent ?? 0
  const sterne = berechneSterne(prozent)
  const istNeuerBestwert = best && sceneResult && sceneResult.punkte >= best.punkte
  const dauerSek = sceneResult?.dauerSekunden ?? 0
  const avgDefizitZeit = sceneResult && sceneResult.defizitResults.length > 0
    ? Math.round(sceneResult.defizitResults.reduce((s, d) => s + d.dauerSekunden, 0) / sceneResult.defizitResults.length)
    : 0

  return (
    <div
      style={{
        flex: 1, overflow: 'auto', background: 'var(--rsi-color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px', fontFamily: 'var(--rsi-font)',
      }}
    >
      <div style={{ maxWidth: '680px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: allFound ? 'rgba(26,127,31,0.1)' : 'rgba(0,118,189,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Trophy size={24} style={{ color: allFound ? 'var(--rsi-gruen)' : 'var(--rsi-blau)' }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--rsi-color-text)', marginBottom: '4px' }}>
            {t('completion.titel')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)' }}>
            {ml(scene.nameI18n, lang)} · {scene.kontext === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')}
          </p>

          {/* Sterne */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', gap: '4px' }}>
            <SterneAnzeige sterne={sterne} size={28} />
          </div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: sterne === 3 ? 'var(--rsi-gruen)' : sterne === 2 ? 'var(--rsi-orange)' : 'var(--rsi-color-text-muted)', marginTop: '6px' }}>
            {t('completion.prozent_korrekt', { prozent })}
          </p>
          {istNeuerBestwert && versuche > 1 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '4px 12px', borderRadius: '12px', background: 'rgba(26,127,31,0.1)', border: '1px solid rgba(26,127,31,0.3)' }}>
              <TrendingUp size={13} style={{ color: 'var(--rsi-gruen)' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--rsi-gruen)' }}>{t('completion.neuer_bestwert')}</span>
            </div>
          )}

          {/* Bestanden-Badge (v0.9.7) */}
          <div style={{ marginTop: '10px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 16px', borderRadius: '14px',
              background: bestanden ? 'rgba(26,127,31,0.12)' : 'rgba(212,0,83,0.08)',
              border: `1px solid ${bestanden ? 'rgba(26,127,31,0.4)' : 'rgba(212,0,83,0.3)'}`,
            }}>
              <Award size={14} style={{ color: bestanden ? 'var(--rsi-gruen)' : 'var(--rsi-rot)' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: bestanden ? 'var(--rsi-gruen)' : 'var(--rsi-rot)' }}>
                {bestanden ? t('completion.bestanden') : t('completion.nicht_bestanden')}
              </span>
            </div>
            {!bestanden && (
              <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-muted)', marginTop: '5px' }}>
                {pflichtFehlt > 0 && t('completion.bestanden_grund_pflicht', { fehlt: pflichtFehlt })}
                {pflichtFehlt > 0 && kriterium.minProzent != null && prozentAktuell < kriterium.minProzent && ' · '}
                {kriterium.minProzent != null && prozentAktuell < kriterium.minProzent &&
                  t('completion.bestanden_grund_prozent', { prozent: prozentAktuell, min: kriterium.minProzent })}
              </p>
            )}
          </div>
        </div>

        {/* Score-Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '8px', marginBottom: '16px',
        }}>
          {[
            { label: t('completion.punkte'), value: sceneScore.toLocaleString('de-CH'), color: 'var(--rsi-blau)' },
            { label: t('completion.gefunden'), value: `${foundCount}/${deficits.length}`, color: allFound ? 'var(--rsi-gruen)' : 'var(--rsi-color-text)' },
            { label: t('completion.versuch'), value: `#${versuche}`, color: 'var(--rsi-color-text)' },
            { label: t('completion.dauer'), value: formatDauer(dauerSek), color: 'var(--rsi-color-text-muted)' },
          ].map(card => (
            <div key={card.label} style={{
              borderRadius: '10px', border: '1px solid var(--rsi-color-border)',
              background: 'var(--rsi-color-surface)', padding: '14px 10px', textAlign: 'center',
            }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', marginBottom: '6px' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Persönliche Statistik */}
        {best && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px', marginBottom: '16px',
          }}>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--rsi-color-bg-secondary)', border: '1px solid var(--rsi-color-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-disabled)', marginBottom: '4px' }}>{t('completion.bester_versuch')}</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--rsi-gruen)' }}>{best.prozent}%</p>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--rsi-color-bg-secondary)', border: '1px solid var(--rsi-color-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-disabled)', marginBottom: '4px' }}>{t('completion.versuche_total')}</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--rsi-color-text)' }}>{versuche}</p>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--rsi-color-bg-secondary)', border: '1px solid var(--rsi-color-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-disabled)', marginBottom: '4px' }}>{t('completion.avg_zeit')}</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--rsi-color-text-muted)' }}>
                <Clock size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                {avgDefizitZeit}s
              </p>
            </div>
          </div>
        )}

        {/* Gesamt-Score (Best-of) */}
        <div style={{
          padding: '12px 18px', borderRadius: '8px',
          background: 'var(--rsi-color-bg-secondary)', border: '1px solid var(--rsi-color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)', fontWeight: 600 }}>
            {t('completion.gesamtscore')}
          </span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--rsi-blau)' }}>
            {totalScore.toLocaleString('de-CH')} {t('completion.pkt')}
          </span>
        </div>

        {/* Defizit-Aufschlüsselung */}
        <div style={{
          borderRadius: '10px', border: '1px solid var(--rsi-color-border)',
          overflow: 'hidden', background: 'var(--rsi-color-surface)', marginBottom: '24px',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 1fr auto 60px auto',
            gap: '8px', padding: '8px 16px',
            borderBottom: '1px solid var(--rsi-color-border)',
            background: 'var(--rsi-color-bg-secondary)',
          }}>
            {['', t('completion.col_defizit'), t('completion.pkt'), t('completion.col_zeit'), t('completion.col_status')].map((h, i) => (
              <span key={i} style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', textAlign: i >= 2 ? 'right' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {deficits.map((d, i) => {
            const found = foundMap.get(d.id)
            const defResult = sceneResult?.defizitResults.find(dr => dr.deficitId === d.id)
            return (
              <div
                key={d.id}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr auto 60px auto',
                  alignItems: 'center', gap: '8px',
                  padding: '10px 16px',
                  borderBottom: i < deficits.length - 1 ? '1px solid var(--rsi-color-border)' : 'none',
                  background: found ? 'rgba(26,127,31,0.03)' : 'rgba(212,0,83,0.03)',
                }}
              >
                {found
                  ? <CheckCircle2 size={14} style={{ color: 'var(--rsi-gruen)' }} />
                  : <XCircle     size={14} style={{ color: 'var(--rsi-rot)' }} />}

                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--rsi-color-text)', marginBottom: '2px' }}>
                    {ml(d.nameI18n, lang)}
                  </p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {d.isPflicht && (
                      <span style={{ fontSize: '8px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.1)', color: 'var(--rsi-rot)', textTransform: 'uppercase' }}>
                        {t('completion.pflicht')}
                      </span>
                    )}
                    {found && !found.kategorieRichtig && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(184,115,0,0.1)', color: 'var(--rsi-orange)' }}>
                        {t('completion.kat_chip')}
                      </span>
                    )}
                    {found?.hintPenalty && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,0,0,0.07)', color: 'var(--rsi-color-text-muted)' }}>
                        {t('completion.hinweis_chip', { abzug: found.hintAbzug ?? 25 })}
                      </span>
                    )}
                    {!found && standorteFür(d).length > 0 && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,118,189,0.08)', color: 'var(--rsi-blau)' }}>
                        {t('completion.standort_chip', { orte: standorteFür(d) })}
                      </span>
                    )}
                    {defResult && !defResult.wichtigkeitKorrekt && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.06)', color: 'var(--rsi-rot)' }}>W</span>
                    )}
                    {defResult && !defResult.abweichungKorrekt && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.06)', color: 'var(--rsi-rot)' }}>A</span>
                    )}
                    {defResult && !defResult.nacaKorrekt && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.06)', color: 'var(--rsi-rot)' }}>N</span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: '12px', fontWeight: 700, color: found ? 'var(--rsi-blau)' : 'var(--rsi-color-text-disabled)', textAlign: 'right' }}>
                  {found ? found.pointsEarned.toLocaleString('de-CH') : '—'}
                </span>

                <span style={{ fontSize: '11px', color: 'var(--rsi-color-text-muted)', textAlign: 'right' }}>
                  {defResult ? `${defResult.dauerSekunden}s` : '—'}
                </span>

                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textAlign: 'center',
                  background: found ? 'rgba(26,127,31,0.1)' : 'rgba(212,0,83,0.08)',
                  color: found ? 'var(--rsi-gruen)' : 'var(--rsi-rot)',
                }}>
                  {found ? t('completion.gefunden_status') : t('completion.verpasst_status')}
                </span>
              </div>
            )
          })}
        </div>

        {/* Aktions-Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={onToTopics}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', color: 'var(--rsi-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--rsi-font)' }}
          >
            <ArrowLeft size={14} /> {t('completion.zu_themen')}
          </button>
          <button
            onClick={onToRanking}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', color: 'var(--rsi-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--rsi-font)' }}
          >
            <BarChart3 size={14} /> {t('nav.ranking')}
          </button>
          {sceneResult && (
            <button
              onClick={handlePdfExport}
              disabled={pdfStatus === 'laeuft'}
              title={t('bericht.export_btn')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', borderRadius: '8px',
                border: '1px solid var(--rsi-color-border)',
                background: 'var(--rsi-color-surface)',
                color: pdfStatus === 'fehler' ? 'var(--rsi-rot)' : 'var(--rsi-color-text-muted)',
                fontSize: '13px', fontWeight: 600,
                cursor: pdfStatus === 'laeuft' ? 'progress' : 'pointer',
                opacity: pdfStatus === 'laeuft' ? 0.6 : 1,
                fontFamily: 'var(--rsi-font)',
              }}
            >
              <FileDown size={14} />
              {pdfStatus === 'laeuft' ? t('bericht.export_laeuft')
                : pdfStatus === 'fehler' ? t('bericht.export_fehler')
                : t('bericht.export_btn')}
            </button>
          )}
          {onNextScene && (
            <button
              onClick={onNextScene}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: 'var(--rsi-dunkelblau)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', marginLeft: 'auto', fontFamily: 'var(--rsi-font)' }}
            >
              {t('szene.nächste')} <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
