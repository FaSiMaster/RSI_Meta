// SzenenAbschluss – Abschluss-Screen nach Szenenende
// Zeigt Punkte, Sterne, Versuche, Best-of, Zeitstatistik

import { Trophy, CheckCircle2, XCircle, ArrowLeft, ChevronRight, BarChart3, Clock, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ml, getBestResult, getVersuchAnzahl, berechneSterne, type AppScene, type AppDeficit, type FoundDeficit, type SceneResult } from '../data/appData'
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
}: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  const foundMap = new Map(foundDeficits.map(f => [f.deficitId, f]))
  const foundCount = foundDeficits.length
  const allFound = foundCount === deficits.length

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
        flex: 1, overflow: 'auto', background: 'var(--zh-color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px', fontFamily: 'var(--zh-font)',
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
            <Trophy size={24} style={{ color: allFound ? '#1A7F1F' : 'var(--zh-blau)' }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--zh-color-text)', marginBottom: '4px' }}>
            {t('completion.titel')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)' }}>
            {ml(scene.nameI18n, lang)} · {scene.kontext === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')}
          </p>

          {/* Sterne */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', gap: '4px' }}>
            <SterneAnzeige sterne={sterne} size={28} />
          </div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: sterne === 3 ? '#1A7F1F' : sterne === 2 ? '#B87300' : 'var(--zh-color-text-muted)', marginTop: '6px' }}>
            {prozent}% korrekt
          </p>
          {istNeuerBestwert && versuche > 1 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', padding: '4px 12px', borderRadius: '12px', background: 'rgba(26,127,31,0.1)', border: '1px solid rgba(26,127,31,0.3)' }}>
              <TrendingUp size={13} style={{ color: '#1A7F1F' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1A7F1F' }}>Neuer Bestwert!</span>
            </div>
          )}
        </div>

        {/* Score-Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '8px', marginBottom: '16px',
        }}>
          {[
            { label: 'Punkte', value: sceneScore.toLocaleString('de-CH'), color: 'var(--zh-blau)' },
            { label: 'Gefunden', value: `${foundCount}/${deficits.length}`, color: allFound ? '#1A7F1F' : 'var(--zh-color-text)' },
            { label: 'Versuch', value: `#${versuche}`, color: 'var(--zh-color-text)' },
            { label: 'Dauer', value: formatDauer(dauerSek), color: 'var(--zh-color-text-muted)' },
          ].map(card => (
            <div key={card.label} style={{
              borderRadius: '10px', border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)', padding: '14px 10px', textAlign: 'center',
            }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', marginBottom: '6px' }}>
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
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', marginBottom: '4px' }}>Bester Versuch</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1A7F1F' }}>{best.prozent}%</p>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', marginBottom: '4px' }}>Versuche total</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--zh-color-text)' }}>{versuche}</p>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)', textAlign: 'center' }}>
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', marginBottom: '4px' }}>Ø Zeit/Defizit</p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--zh-color-text-muted)' }}>
                <Clock size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                {avgDefizitZeit}s
              </p>
            </div>
          </div>
        )}

        {/* Gesamt-Score (Best-of) */}
        <div style={{
          padding: '12px 18px', borderRadius: '8px',
          background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', fontWeight: 600 }}>
            Gesamtscore (Best-of)
          </span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--zh-blau)' }}>
            {totalScore.toLocaleString('de-CH')} Pkt.
          </span>
        </div>

        {/* Defizit-Aufschlüsselung */}
        <div style={{
          borderRadius: '10px', border: '1px solid var(--zh-color-border)',
          overflow: 'hidden', background: 'var(--zh-color-surface)', marginBottom: '24px',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 1fr auto 60px auto',
            gap: '8px', padding: '8px 16px',
            borderBottom: '1px solid var(--zh-color-border)',
            background: 'var(--zh-color-bg-secondary)',
          }}>
            {['', 'Defizit', 'Pkt.', 'Zeit', 'Status'].map((h, i) => (
              <span key={i} style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', textAlign: i >= 2 ? 'right' : 'left' }}>
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
                  borderBottom: i < deficits.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
                  background: found ? 'rgba(26,127,31,0.03)' : 'rgba(212,0,83,0.03)',
                }}
              >
                {found
                  ? <CheckCircle2 size={14} style={{ color: '#1A7F1F' }} />
                  : <XCircle     size={14} style={{ color: '#D40053' }} />}

                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--zh-color-text)', marginBottom: '2px' }}>
                    {ml(d.nameI18n, lang)}
                  </p>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {d.isPflicht && (
                      <span style={{ fontSize: '8px', fontWeight: 800, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.1)', color: '#D40053', textTransform: 'uppercase' }}>
                        Pflicht
                      </span>
                    )}
                    {found && !found.kategorieRichtig && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(184,115,0,0.1)', color: '#B87300' }}>
                        Kat. -10%
                      </span>
                    )}
                    {found?.hintPenalty && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,0,0,0.07)', color: 'var(--zh-color-text-muted)' }}>
                        Hint -50%
                      </span>
                    )}
                    {defResult && !defResult.wichtigkeitKorrekt && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.06)', color: '#D40053' }}>W</span>
                    )}
                    {defResult && !defResult.abweichungKorrekt && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.06)', color: '#D40053' }}>A</span>
                    )}
                    {defResult && !defResult.nacaKorrekt && (
                      <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(212,0,83,0.06)', color: '#D40053' }}>N</span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: '12px', fontWeight: 700, color: found ? 'var(--zh-blau)' : 'var(--zh-color-text-disabled)', textAlign: 'right' }}>
                  {found ? found.pointsEarned.toLocaleString('de-CH') : '—'}
                </span>

                <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', textAlign: 'right' }}>
                  {defResult ? `${defResult.dauerSekunden}s` : '—'}
                </span>

                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textAlign: 'center',
                  background: found ? 'rgba(26,127,31,0.1)' : 'rgba(212,0,83,0.08)',
                  color: found ? '#1A7F1F' : '#D40053',
                }}>
                  {found ? 'Gefunden' : 'Verpasst'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Aktions-Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={onToTopics}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            <ArrowLeft size={14} /> Themen
          </button>
          <button
            onClick={onToRanking}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            <BarChart3 size={14} /> Rangliste
          </button>
          {onNextScene && (
            <button
              onClick={onNextScene}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: 'var(--zh-dunkelblau)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none', marginLeft: 'auto', fontFamily: 'var(--zh-font)' }}
            >
              Nächste Szene <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
