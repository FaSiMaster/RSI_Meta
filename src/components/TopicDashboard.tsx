// TopicDashboard – Themenkarten + Anleitung + RSI-Methodik
// ZH Corporate Design, SVG-Icons, Schritt-für-Schritt + aufklappbare Methodik

import { motion, AnimatePresence } from 'motion/react'
import { Trophy, Eye, MousePointerClick, BarChart3, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { getTopics, getScenes, ml, type AppTopic } from '../data/appData'
import { getTopicIcon } from '../data/topicIcons'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// D-4: Pikogramm aus zentralem Katalog (src/data/topicIcons.ts).
// Backwards-Compat: alte iconKey-Werte 'walk'/'bike'/'junction'/'construction'
// sind im Katalog enthalten und liefern dasselbe semantische Pikogramm.
const TopicIcon = ({ iconKey, size = 22 }: { iconKey: string | undefined | null; size?: number }) => {
  const def = getTopicIcon(iconKey)
  const Icon = def.Icon
  return <Icon size={size} />
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
  const [showMethodik, setShowMethodik] = useState(false)

  useEffect(() => {
    const ts = getTopics()
    setTopics(ts)
    const counts: Record<string, number> = {}
    ts.forEach(tp => { counts[tp.id] = getScenes(tp.id).length })
    setSceneCounts(counts)
  }, [])

  // Schritt-für-Schritt Daten — mit erweitertem Tooltip-Text (E-2)
  const schritte = [
    { nr: 1, icon: <Eye size={20} />,                title: t('guide.step1_title'), desc: t('guide.step1_desc'), detail: t('guide.step1_detail', t('guide.step1_desc')) },
    { nr: 2, icon: <MousePointerClick size={20} />,  title: t('guide.step2_title'), desc: t('guide.step2_desc'), detail: t('guide.step2_detail', t('guide.step2_desc')) },
    { nr: 3, icon: <BookOpen size={20} />,           title: t('guide.step3_title'), desc: t('guide.step3_desc'), detail: t('guide.step3_detail', t('guide.step3_desc')) },
    { nr: 4, icon: <BarChart3 size={20} />,          title: t('guide.step4_title'), desc: t('guide.step4_desc'), detail: t('guide.step4_detail', t('guide.step4_desc')) },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full" style={{ padding: 'var(--zh-padding-page)' }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '4px' }}>{t('topics.title')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>{t('topics.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: 'var(--zh-dunkelblau)', color: 'white', fontSize: '14px', fontWeight: 700 }}>
          <Trophy size={14} />
          {score.toLocaleString('de-CH')} Pkt.
          {username && <span style={{ opacity: 0.7, fontWeight: 500, fontSize: '13px' }}>· {username}</span>}
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
                <span style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontWeight: 600 }}>{sceneCount} {t('topics.scenesCount')}</span>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--zh-color-accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* E-1: Visueller Trenner zwischen Themen-Bereich und «So funktioniert» */}
      <div style={{
        marginTop: '56px', marginBottom: '32px',
        height: '1px', background: 'var(--zh-color-border)',
      }} />

      {/* ── Schritt-für-Schritt Anleitung ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          padding: '24px',
          borderRadius: 'var(--zh-radius-card)',
          background: 'var(--zh-color-bg-secondary)',
          border: '1px solid var(--zh-color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'var(--zh-dunkelblau)', color: 'white',
            fontSize: '13px', fontWeight: 800,
          }}>?</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--zh-color-text)', margin: 0 }}>
            {t('guide.title')}
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '20px', marginLeft: '38px' }}>
          {t('guide.subtitle')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {schritte.map((s, i) => (
            <div
              key={s.nr}
              tabIndex={0}
              role="article"
              aria-label={`Schritt ${s.nr}: ${s.title}. ${s.detail}`}
              title={s.detail}
              style={{
                borderRadius: 'var(--zh-radius-card)',
                border: '1px solid var(--zh-color-border)',
                background: 'var(--zh-color-surface)',
                padding: '20px',
                position: 'relative',
                cursor: 'help',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = 'var(--zh-blau)'
                e.currentTarget.style.boxShadow = 'var(--zh-shadow-sm)'
                const ext = e.currentTarget.querySelector<HTMLDivElement>('.step-detail')
                if (ext) ext.style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'var(--zh-color-border)'
                e.currentTarget.style.boxShadow = 'none'
                const ext = e.currentTarget.querySelector<HTMLDivElement>('.step-detail')
                if (ext) ext.style.opacity = '0'
              }}
            >
              {/* Schrittnummer */}
              <div style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'var(--zh-color-bg-tertiary)',
                color: 'var(--zh-color-text-disabled)',
                fontSize: '11px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.nr}
              </div>

              {/* Icon */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(0,64,124,0.08)', color: 'var(--zh-dunkelblau)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px',
              }}>
                {s.icon}
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--zh-color-text)', marginBottom: '6px' }}>
                {s.title}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', lineHeight: 1.5 }}>
                {s.desc}
              </p>

              {/* E-2: Detail-Erklaerung beim Hover (zusaetzlich zum native title-Tooltip) */}
              {s.detail && s.detail !== s.desc && (
                <div className="step-detail" style={{
                  marginTop: '10px', padding: '8px 10px',
                  borderTop: '1px dashed var(--zh-color-border)',
                  fontSize: '11px', color: 'var(--zh-blau)', lineHeight: 1.5,
                  opacity: 0, transition: 'opacity 0.2s',
                  pointerEvents: 'none',
                }}>
                  {s.detail}
                </div>
              )}

              {/* Verbindungspfeil (nicht beim letzten) */}
              {i < schritte.length - 1 && (
                <div className="hidden lg:block" style={{
                  position: 'absolute', right: '-14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--zh-color-border)', zIndex: 2,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── RSI-Methodik (aufklappbar) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{
          marginTop: '32px',
          borderRadius: 'var(--zh-radius-card)',
          border: '1px solid var(--zh-color-border)',
          background: 'var(--zh-color-surface)',
          overflow: 'hidden',
          marginBottom: '48px',
        }}
      >
        {/* Header — immer sichtbar */}
        <button
          onClick={() => setShowMethodik(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '20px 24px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--zh-font)', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(0,64,124,0.08)', color: 'var(--zh-dunkelblau)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
                {t('methodik.title')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                {t('methodik.subtitle')}
              </div>
            </div>
          </div>
          <div style={{ color: 'var(--zh-color-text-muted)' }}>
            {showMethodik ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {/* Inhalt — aufklappbar */}
        <AnimatePresence>
          {showMethodik && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '0 24px 24px',
                borderTop: '1px solid var(--zh-color-border)',
                paddingTop: '20px',
              }}>
                {/* 3-spaltig: Relevanz-Matrix | Unfallrisiko-Matrix | NACA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Relevanz-Matrix */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', marginBottom: '10px' }}>
                      {t('methodik.relevanz_title')}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '10px' }}>
                      {t('methodik.relevanz_desc')}
                    </p>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle(), textAlign: 'left' }}>{t('methodik.wichtigkeit')}</th>
                          <th style={thStyle()}>{t('scoring.dim_klein')}</th>
                          <th style={thStyle()}>{t('scoring.dim_mittel')}</th>
                          <th style={thStyle()}>{t('scoring.dim_gross')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('scoring.dim_gross')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('scoring.result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('scoring.result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('scoring.dim_mittel')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('scoring.result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('scoring.result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('scoring.dim_klein')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('scoring.result_mittel')}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: '9px', color: 'var(--zh-color-text-disabled)', marginTop: '6px' }}>
                      {t('methodik.achse')}: {t('methodik.zeile_wichtigkeit')}, {t('methodik.spalte_abweichung')}
                    </div>
                  </div>

                  {/* Unfallrisiko-Matrix */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', marginBottom: '10px' }}>
                      {t('methodik.risiko_title')}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '10px' }}>
                      {t('methodik.risiko_desc')}
                    </p>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle(), textAlign: 'left' }}>{t('methodik.relevanz_sd')}</th>
                          <th style={thStyle()}>{t('scoring.schwere_leicht')}</th>
                          <th style={thStyle()}>{t('scoring.schwere_mittel')}</th>
                          <th style={thStyle()}>{t('scoring.schwere_schwer')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('scoring.result_hoch')}</td>
                          <td style={tdCell('mittel')}>{t('scoring.result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('scoring.result_hoch')}</td>
                          <td style={tdCell('hoch')}>{t('scoring.result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('scoring.result_mittel')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('scoring.result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('scoring.result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('gering')}>{t('scoring.result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('scoring.result_mittel')}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: '9px', color: 'var(--zh-color-text-disabled)', marginTop: '6px' }}>
                      {t('methodik.achse')}: {t('methodik.zeile_relevanz')}, {t('methodik.spalte_schwere')}
                    </div>
                  </div>

                  {/* NACA-Skala */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', marginBottom: '10px' }}>
                      {t('methodik.naca_title')}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '10px' }}>
                      {t('methodik.naca_desc')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <NacaBar label={t('scoring.schwere_leicht')} range="NACA 0–1" color="#1A7F1F" width="33%" />
                      <NacaBar label={t('scoring.schwere_mittel')} range="NACA 2–3" color="#B87300" width="50%" />
                      <NacaBar label={t('scoring.schwere_schwer')} range="NACA 4–7" color="#D40053" width="100%" />
                    </div>
                  </div>
                </div>

                {/* E-3: Quellen-Block als eigenstaendiger Absatz unter den 3 Spalten */}
                <div style={{
                  marginTop: '24px', paddingTop: '16px',
                  borderTop: '1px solid var(--zh-color-border)',
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  fontSize: '11px', color: 'var(--zh-color-text-muted)', lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', minWidth: '80px' }}>
                    {t('methodik.quellen')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                    <span>TBA-Fachkurs FK RSI (V 16.09.2020)</span>
                    <span>·</span>
                    <span>bfu-Bericht 73 (NACA)</span>
                    <span>·</span>
                    <span>SN 641 723 Abb. 2</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Hilfskomponenten ──

function NacaBar({ label, range, color, width }: { label: string; range: string; color: string; width: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '70px', fontSize: '11px', fontWeight: 600, color: 'var(--zh-color-text)', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: '22px', borderRadius: '4px', background: 'var(--zh-color-bg-secondary)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          width, height: '100%', borderRadius: '4px',
          background: color, opacity: 0.15,
        }} />
        <span style={{
          position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '10px', fontWeight: 700, color,
        }}>
          {range}
        </span>
      </div>
    </div>
  )
}

// ── Tabellen-Styles ──

function thStyle(): React.CSSProperties {
  return {
    padding: '6px 8px',
    textAlign: 'center',
    fontWeight: 700,
    color: 'var(--zh-color-text-muted)',
    borderBottom: '2px solid var(--zh-color-border)',
  }
}

function tdStyle(): React.CSSProperties {
  return {
    padding: '6px 8px',
    borderBottom: '1px solid var(--zh-color-border)',
    color: 'var(--zh-color-text)',
  }
}

function tdCell(level: 'gering' | 'mittel' | 'hoch'): React.CSSProperties {
  const bg = level === 'hoch' ? 'rgba(212,0,83,0.1)' : level === 'mittel' ? 'rgba(184,115,0,0.1)' : 'rgba(26,127,31,0.1)'
  const color = level === 'hoch' ? '#D40053' : level === 'mittel' ? '#B87300' : '#1A7F1F'
  return {
    padding: '6px 8px',
    textAlign: 'center',
    fontWeight: 600,
    borderBottom: '1px solid var(--zh-color-border)',
    background: bg,
    color,
    borderRadius: '2px',
  }
}
