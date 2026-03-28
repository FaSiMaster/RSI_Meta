// SzenenAbschluss – Abschluss-Screen nach Szenenende
// Zeigt Punkte, gefundene Defizite, Aufschlüsselung

import { Trophy, CheckCircle2, XCircle, ArrowLeft, ChevronRight, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ml, type AppScene, type AppDeficit, type FoundDeficit } from '../data/appData'

interface Props {
  scene:          AppScene
  deficits:       AppDeficit[]
  foundDeficits:  FoundDeficit[]
  sceneScore:     number
  totalScore:     number
  onToTopics:     () => void
  onToRanking:    () => void
  onNextScene:    (() => void) | null
}

export default function SzenenAbschluss({
  scene, deficits, foundDeficits, sceneScore, totalScore,
  onToTopics, onToRanking, onNextScene,
}: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const foundMap = new Map(foundDeficits.map(f => [f.deficitId, f]))
  const foundCount = foundDeficits.length
  const pflichtDefs = deficits.filter(d => d.isPflicht)
  const foundPflicht = pflichtDefs.filter(d => foundMap.has(d.id)).length
  const allFound = foundCount === deficits.length

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--zh-color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px',
        fontFamily: 'var(--zh-font)',
      }}
    >
      <div style={{ maxWidth: '680px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: allFound ? 'rgba(26,127,31,0.1)' : 'rgba(0,118,189,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Trophy size={24} style={{ color: allFound ? '#1A7F1F' : 'var(--zh-blau)' }} />
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--zh-color-text)', marginBottom: '6px' }}>
            Szene abgeschlossen
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
            {ml(scene.nameI18n, lang)} · {scene.kontext === 'io' ? 'Innerorts' : 'Ausserorts'}
          </p>
        </div>

        {/* Score-Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px', marginBottom: '20px',
        }}>
          {[
            { label: 'Punkte Szene', value: sceneScore.toLocaleString('de-CH'), color: 'var(--zh-blau)' },
            { label: 'Gefunden', value: `${foundCount} / ${deficits.length}`, color: allFound ? '#1A7F1F' : 'var(--zh-color-text)' },
            { label: 'Pflicht', value: `${foundPflicht} / ${pflichtDefs.length}`, color: foundPflicht === pflichtDefs.length ? '#1A7F1F' : '#D40053' },
          ].map(card => (
            <div key={card.label} style={{
              borderRadius: '12px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              padding: '20px 16px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', marginBottom: '8px' }}>
                {card.label}
              </p>
              <p style={{ fontSize: '28px', fontWeight: 900, color: card.color }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Gesamt-Score */}
        <div style={{
          padding: '14px 20px', borderRadius: '8px',
          background: 'var(--zh-color-bg-secondary)',
          border: '1px solid var(--zh-color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', fontWeight: 600 }}>Gesamtscore</span>
          <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--zh-blau)' }}>
            {totalScore.toLocaleString('de-CH')} Pkt.
          </span>
        </div>

        {/* Defizit-Aufschlüsselung */}
        <div style={{
          borderRadius: '12px',
          border: '1px solid var(--zh-color-border)',
          overflow: 'hidden',
          background: 'var(--zh-color-surface)',
          marginBottom: '28px',
        }}>
          {/* Tabellenkopf */}
          <div style={{
            display: 'grid', gridTemplateColumns: '24px 1fr auto 100px',
            gap: '12px', padding: '10px 20px',
            borderBottom: '1px solid var(--zh-color-border)',
            background: 'var(--zh-color-bg-secondary)',
          }}>
            {['', 'Defizit', 'Pkt.', 'Status'].map((h, i) => (
              <span key={i} style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', textAlign: i >= 2 ? 'right' : 'left' }}>
                {h}
              </span>
            ))}
          </div>

          {deficits.map((d, i) => {
            const found = foundMap.get(d.id)
            return (
              <div
                key={d.id}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr auto 100px',
                  alignItems: 'center', gap: '12px',
                  padding: '12px 20px',
                  borderBottom: i < deficits.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
                  background: found ? 'rgba(26,127,31,0.03)' : 'rgba(212,0,83,0.03)',
                }}
              >
                {found
                  ? <CheckCircle2 size={14} style={{ color: '#1A7F1F' }} />
                  : <XCircle     size={14} style={{ color: '#D40053' }} />}

                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--zh-color-text)', marginBottom: '2px' }}>
                    {ml(d.nameI18n, lang)}
                  </p>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {d.isPflicht && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: 'rgba(212,0,83,0.1)', color: '#D40053', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Pflicht
                      </span>
                    )}
                    {d.isBooster && (
                      <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: 'rgba(184,115,0,0.1)', color: '#B87300', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Booster
                      </span>
                    )}
                    {found && !found.kategorieRichtig && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(184,115,0,0.1)', color: '#B87300' }}>
                        Kategorie -10%
                      </span>
                    )}
                    {found?.hintPenalty && (
                      <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(0,0,0,0.07)', color: 'var(--zh-color-text-muted)' }}>
                        Hint -50%
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ fontSize: '13px', fontWeight: 700, color: found ? 'var(--zh-blau)' : 'var(--zh-color-text-disabled)', textAlign: 'right' }}>
                  {found ? `${found.pointsEarned.toLocaleString('de-CH')}` : '—'}
                </span>

                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '4px', textAlign: 'center',
                  background: found ? 'rgba(26,127,31,0.1)' : 'rgba(212,0,83,0.08)',
                  color:      found ? '#1A7F1F'             : '#D40053',
                }}>
                  {found ? 'Gefunden' : 'Nicht gefunden'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Aktions-Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={onToTopics}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 20px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', color: 'var(--zh-color-text-muted)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            <ArrowLeft size={15} /> Themen
          </button>
          <button
            onClick={onToRanking}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 20px', borderRadius: '8px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', color: 'var(--zh-color-text-muted)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            <BarChart3 size={15} /> Rangliste
          </button>
          {onNextScene && (
            <button
              onClick={onNextScene}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '11px 20px', borderRadius: '8px', background: 'var(--zh-dunkelblau)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', border: 'none', marginLeft: 'auto', fontFamily: 'var(--zh-font)' }}
            >
              Nächste Szene <ChevronRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
