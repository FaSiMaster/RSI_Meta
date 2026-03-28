// Topic-Dashboard – 4-spaltiges Grid mit Themenkarten
// ZH Corporate Design, SVG-Icons pro Thema, Score-Pill oben rechts

import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { getTopics, getScenes, ml, type AppTopic } from '../data/appData'
import { useEffect, useState } from 'react'

// ── Themen-spezifische SVG-Icons ──
const TopicIcon = ({ iconKey, size = 24 }: { iconKey: AppTopic['iconKey']; size?: number }) => {
  const s = size
  switch (iconKey) {
    case 'walk':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1.5"/><path d="M9 11l1.5 1.5L12 9l1.5 3 1.5-1" /><path d="M9 16l1-3 2 2 1-2 1 3" /><path d="M10 20l2-1 2 1"/>
        </svg>
      )
    case 'bike':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>
          <path d="M6 16l3-7h6l2 4" /><path d="M9 9h4" />
        </svg>
      )
    case 'junction':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      )
    case 'construction':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="14" width="20" height="4" rx="1"/>
          <path d="M4 14l3-7h10l3 7"/>
          <path d="M8 14V9M16 14V9"/>
        </svg>
      )
  }
}

interface Props {
  username: string
  score: number
  onSelectTopic: (topic: AppTopic) => void
}

export default function TopicDashboard({ username, score, onSelectTopic }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [topics, setTopics] = useState<AppTopic[]>([])
  const [sceneCounts, setSceneCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const ts = getTopics()
    setTopics(ts)
    const counts: Record<string, number> = {}
    ts.forEach(tp => { counts[tp.id] = getScenes(tp.id).length })
    setSceneCounts(counts)
  }, [])

  return (
    <div
      className="max-w-7xl mx-auto w-full"
      style={{ padding: 'var(--zh-padding-page)' }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1
            className="font-bold tracking-tight mb-1"
            style={{ fontSize: '28px', fontWeight: 600, color: 'var(--zh-color-text)' }}
          >
            {t('topics.title')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
            {t('topics.subtitle')}
          </p>
        </div>

        {/* Score-Pill */}
        <div
          className="flex items-center gap-2 rounded-full"
          style={{
            padding: '8px 16px',
            background: 'var(--zh-dunkelblau)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          <Trophy size={14} />
          {score.toLocaleString('de-CH')} {t('score.points')}
          {username && (
            <span style={{ opacity: 0.7, fontWeight: 500, fontSize: '13px' }}>
              · {username}
            </span>
          )}
        </div>
      </div>

      {/* Topic-Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topics.map((topic, i) => {
          const sceneCount = sceneCounts[topic.id] ?? 0
          return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTopic(topic)}
              className="group cursor-pointer relative overflow-hidden"
              style={{
                borderRadius: 'var(--zh-radius-card)',
                border: '1px solid var(--zh-color-border)',
                background: 'var(--zh-color-surface)',
                padding: '24px',
                boxShadow: 'var(--zh-shadow-sm)',
                transition: 'box-shadow 0.2s',
              }}
            >
              {/* Icon */}
              <div
                className="mb-5 flex items-center justify-center rounded-xl transition-colors group-hover:text-white"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'rgba(0,118,189,0.1)',
                  color: 'var(--zh-color-accent)',
                }}
              >
                <TopicIcon iconKey={topic.iconKey} size={22} />
              </div>

              {/* Name */}
              <h3
                className="font-bold mb-1.5"
                style={{ fontSize: '16px', fontWeight: 500, color: 'var(--zh-color-text)' }}
              >
                {ml(topic.name, lang)}
              </h3>

              {/* Beschreibung */}
              <p
                className="leading-relaxed mb-5"
                style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', lineHeight: '1.5' }}
              >
                {ml(topic.description, lang)}
              </p>

              {/* Footer: Badge + Szenenanzahl */}
              <div className="flex items-center justify-between">
                <span
                  className="rounded-full font-bold uppercase"
                  style={{
                    fontSize: '10px',
                    padding: '3px 10px',
                    background: 'rgba(0,118,189,0.1)',
                    color: 'var(--zh-color-accent)',
                    letterSpacing: '0.12em',
                  }}
                >
                  RSI
                </span>
                <span
                  style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontWeight: 600 }}
                >
                  {sceneCount} {t('topics.scenesCount')}
                </span>
              </div>

              {/* Hover-Arrow */}
              <div
                className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--zh-color-accent)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
