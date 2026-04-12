// SceneList – Szenen eines Topics als Cards
// Sterne-Anzeige (1-3) basierend auf bestem Resultat

import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Play, Plus, Star } from 'lucide-react'
import { motion } from 'motion/react'
import { getScenes, getDeficits, getBestResult, getVersuchAnzahl, berechneSterne, ml, type AppTopic, type AppScene } from '../data/appData'
import { useEffect, useState } from 'react'

interface Props {
  topic: AppTopic
  username: string
  isAdmin?: boolean
  onBack: () => void
  onSelectScene: (scene: AppScene) => void
}

// Sterne-Anzeige (1-3)
function SterneAnzeige({ sterne, size = 14 }: { sterne: 0 | 1 | 2 | 3; size?: number }) {
  const colors = ['#CCCCCC', '#B87300', '#949494', '#1A7F1F']
  // 0 = keine Sterne (nicht gespielt), 1-3 = Sterne
  if (sterne === 0) return null
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          size={size}
          fill={i <= sterne ? colors[sterne] : 'none'}
          style={{ color: i <= sterne ? colors[sterne] : 'var(--zh-color-text-disabled)' }}
        />
      ))}
    </div>
  )
}

export { SterneAnzeige }

export default function SceneList({ topic, username, isAdmin, onBack, onSelectScene }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [deficitCounts, setDeficitCounts] = useState<Record<string, number>>({})
  const [sceneStats, setSceneStats] = useState<Record<string, { sterne: 0 | 1 | 2 | 3; versuche: number; prozent: number }>>({})

  useEffect(() => {
    const sc = getScenes(topic.id)
    setScenes(sc)
    const counts: Record<string, number> = {}
    const stats: Record<string, { sterne: 0 | 1 | 2 | 3; versuche: number; prozent: number }> = {}
    sc.forEach(s => {
      counts[s.id] = getDeficits(s.id).length
      const best = getBestResult(username, s.id)
      const versuche = getVersuchAnzahl(username, s.id)
      stats[s.id] = {
        sterne: best ? berechneSterne(best.prozent) : 0,
        versuche,
        prozent: best?.prozent ?? 0,
      }
    })
    setDeficitCounts(counts)
    setSceneStats(stats)
  }, [topic.id, username])

  return (
    <div className="max-w-5xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={15} /> {t('scenes.back')}
        </button>

        <div className="flex items-end justify-between">
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '4px' }}>
              {ml(topic.nameI18n, lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
              {ml(topic.beschreibungI18n, lang)}
            </p>
          </div>
          {isAdmin && (
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Neue Szene
            </button>
          )}
        </div>
      </div>

      {/* Szenen-Grid */}
      {scenes.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>Noch keine Szenen für dieses Thema vorhanden.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenes.map((scene, i) => {
            const count = deficitCounts[scene.id] ?? 0
            const stats = sceneStats[scene.id]
            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden"
                style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', boxShadow: 'var(--zh-shadow-sm)' }}
              >
                {/* Bild-Platzhalter */}
                <div className="relative h-36 flex items-end" style={{ background: 'var(--zh-color-bg-tertiary)' }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="relative flex items-center gap-2 p-4 w-full">
                    <MapPin size={13} style={{ color: 'var(--zh-color-accent)' }} />
                    <span className="text-white font-bold text-xs uppercase tracking-wider">Szenario {i + 1}</span>
                    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: scene.kontext === 'io' ? 'rgba(0,158,224,0.8)' : 'rgba(26,127,31,0.8)', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {scene.kontext}
                    </span>
                    {/* Sterne rechts */}
                    {stats && stats.sterne > 0 && (
                      <div style={{ marginLeft: 'auto' }}>
                        <SterneAnzeige sterne={stats.sterne} size={16} />
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--zh-color-text)', fontWeight: 500, marginBottom: '4px', lineHeight: 1.4 }}>
                    {ml(scene.nameI18n, lang)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                      {count} Defizite
                    </span>
                    {stats && stats.versuche > 0 && (
                      <>
                        <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                          {stats.versuche}× gespielt
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)' }}>·</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: stats.prozent >= 90 ? '#1A7F1F' : stats.prozent >= 60 ? '#B87300' : 'var(--zh-color-text-muted)' }}>
                          Best: {stats.prozent}%
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectScene(scene)}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.02]"
                    style={{ padding: '10px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', fontSize: '14px', border: 'none', cursor: 'pointer' }}
                  >
                    <Play size={15} fill="white" /> {stats && stats.versuche > 0 ? t('scenes.retryBtn') : t('scenes.startBtn')}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
