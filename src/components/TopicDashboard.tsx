// TopicDashboard – 4-spaltiges Grid mit Themenkarten
// ZH Corporate Design, SVG-Icons, io/ao-Badge, Szenenanzahl

import { motion } from 'motion/react'
import { Trophy } from 'lucide-react'
import { getTopics, getScenes, ml, type AppTopic } from '../data/appData'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const TopicIcon = ({ iconKey, size = 22 }: { iconKey: AppTopic['iconKey']; size?: number }) => {
  const s = size
  switch (iconKey) {
    case 'walk': return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="1.5"/><path d="M9 11l1.5 1.5L12 9l1.5 3 1.5-1" /><path d="M9 16l1-3 2 2 1-2 1 3" /><path d="M10 20l2-1 2 1"/>
      </svg>
    )
    case 'bike': return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="16" r="3"/><circle cx="18" cy="16" r="3"/>
        <path d="M6 16l3-7h6l2 4" /><path d="M9 9h4" />
      </svg>
    )
    case 'junction': return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    )
    case 'construction': return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="14" width="20" height="4" rx="1"/>
        <path d="M4 14l3-7h10l3 7"/><path d="M8 14V9M16 14V9"/>
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
  const { i18n } = useTranslation()
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
    <div className="max-w-7xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '4px' }}>Themenbereiche</h1>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>Wählen Sie einen Bereich, um spezifische Sicherheitsdefizite zu trainieren.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: 'var(--zh-dunkelblau)', color: 'white', fontSize: '14px', fontWeight: 700 }}>
          <Trophy size={14} />
          {score.toLocaleString('de-CH')} Pkt.
          {username && <span style={{ opacity: 0.7, fontWeight: 500, fontSize: '13px' }}>· {username}</span>}
        </div>
      </div>

      {/* Grid */}
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
              style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', padding: '24px', boxShadow: 'var(--zh-shadow-sm)' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(0,118,189,0.1)', color: 'var(--zh-color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <TopicIcon iconKey={topic.iconKey} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--zh-color-text)', marginBottom: '6px' }}>
                {ml(topic.nameI18n, lang)}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                {ml(topic.beschreibungI18n, lang)}
              </p>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,118,189,0.1)', color: 'var(--zh-color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>RSI</span>
                <span style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontWeight: 600 }}>{sceneCount} Szenen</span>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--zh-color-accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
