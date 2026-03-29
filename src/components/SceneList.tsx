// SceneList – Szenen eines Topics als Cards
// Zurück-Button, io/ao-Badge, Defizit-Count, "Starten"-Button

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
  const { i18n } = useTranslation()
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
    <div className="max-w-5xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500, marginBottom: '20px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={15} /> Zurück
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
                  <div className="relative flex items-center gap-2 p-4">
                    <MapPin size={13} style={{ color: 'var(--zh-color-accent)' }} />
                    <span className="text-white font-bold text-xs uppercase tracking-wider">Szenario {i + 1}</span>
                    <span style={{ padding: '2px 7px', borderRadius: '4px', fontSize: '9px', fontWeight: 700, background: scene.kontext === 'io' ? 'rgba(0,158,224,0.8)' : 'rgba(26,127,31,0.8)', color: 'white', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {scene.kontext}
                    </span>
                  </div>
                </div>

                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--zh-color-text)', fontWeight: 500, marginBottom: '4px', lineHeight: 1.4 }}>
                    {ml(scene.nameI18n, lang)}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginBottom: '16px' }}>
                    {count} Defizite
                  </p>
                  <button
                    onClick={() => onSelectScene(scene)}
                    disabled={count === 0}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ padding: '10px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', fontSize: '14px', border: 'none', cursor: count === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    <Play size={15} fill="white" /> Training starten
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
