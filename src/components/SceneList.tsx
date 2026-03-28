// Szenen-Liste eines Topics
// Zurück-Button, Szenen-Cards mit Starten-Button, Admin: + Neue Szene

import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, Play, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { getScenes, getDeficits, ml, type AppTopic, type AppScene } from '../data/appData'
import { useEffect, useState } from 'react'

interface Props {
  topic: AppTopic
  isAdmin?: boolean
  onBack: () => void
  onSelectScene: (scene: AppScene) => void
}

export default function SceneList({ topic, isAdmin, onBack, onSelectScene }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [scenes, setScenes] = useState<AppScene[]>([])
  const [deficitCounts, setDeficitCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const sc = getScenes(topic.id)
    setScenes(sc)
    const counts: Record<string, number> = {}
    sc.forEach(s => { counts[s.id] = getDeficits(s.id).length })
    setDeficitCounts(counts)
  }, [topic.id])

  return (
    <div
      className="max-w-5xl mx-auto w-full"
      style={{ padding: 'var(--zh-padding-page)' }}
    >
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-5 transition-colors"
          style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500 }}
        >
          <ArrowLeft size={15} /> {t('scenes.back')}
        </button>

        <div className="flex items-end justify-between">
          <div>
            <h1
              className="font-bold tracking-tight mb-1"
              style={{ fontSize: '28px', fontWeight: 600, color: 'var(--zh-color-text)' }}
            >
              {ml(topic.name, lang)}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
              {ml(topic.description, lang)}
            </p>
          </div>

          {isAdmin && (
            <button
              className="flex items-center gap-2 font-bold text-white transition-colors"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--zh-radius-btn)',
                background: 'var(--zh-dunkelblau)',
                fontSize: '13px',
              }}
            >
              <Plus size={14} /> {t('scenes.addNew')}
            </button>
          )}
        </div>
      </div>

      {/* Szenen-Grid */}
      {scenes.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic' }}>
          {t('dashboard.noScenes')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenes.map((scene, i) => {
            const count = deficitCounts[scene.id] ?? 0
            return (
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="overflow-hidden"
                style={{
                  borderRadius: 'var(--zh-radius-card)',
                  border: '1px solid var(--zh-color-border)',
                  background: 'var(--zh-color-surface)',
                  boxShadow: 'var(--zh-shadow-sm)',
                }}
              >
                {/* Bild-Platzhalter */}
                <div
                  className="relative h-40 flex items-end"
                  style={{ background: 'var(--zh-color-bg-tertiary)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="relative flex items-center gap-2 p-4">
                    <MapPin size={13} style={{ color: 'var(--zh-color-accent)' }} />
                    <span className="text-white font-bold text-xs uppercase tracking-wider">
                      {t('dashboard.scenario')} {i + 1}
                    </span>
                    {/* io/ao Badge */}
                    <span
                      className="rounded font-bold uppercase"
                      style={{
                        padding: '2px 7px',
                        fontSize: '9px',
                        background: scene.locationType === 'io' ? 'rgba(0,158,224,0.8)' : 'rgba(26,127,31,0.8)',
                        color: 'white',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {scene.locationType}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <p
                    className="mb-1 leading-snug"
                    style={{ fontSize: '14px', color: 'var(--zh-color-text)', fontWeight: 500 }}
                  >
                    {ml(scene.description, lang)}
                  </p>
                  <p
                    className="mb-5"
                    style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}
                  >
                    {count} {t('admin.deficits')}
                  </p>

                  <button
                    onClick={() => onSelectScene(scene)}
                    disabled={count === 0}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      padding: '10px',
                      borderRadius: 'var(--zh-radius-btn)',
                      background: 'var(--zh-dunkelblau)',
                      fontSize: '14px',
                    }}
                  >
                    <Play size={15} fill="white" /> {t('scenes.startBtn')}
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
