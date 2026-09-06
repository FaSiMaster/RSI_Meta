// TopicDashboard – Themenkarten + Anleitung + RSI-Methodik
// ZH Corporate Design, SVG-Icons, Schritt-für-Schritt + aufklappbare Methodik

import { motion, AnimatePresence } from 'motion/react'
import { Trophy, Eye, MousePointerClick, BarChart3, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { getSichtbareTopics, getScenes, getTopicCountry, ml, type AppTopic } from '../data/appData'
import { landName } from '../data/laender'
import ZustaendigkeitKarte from './ZustaendigkeitKarte'
import { getTopicIcon } from '../data/topicIcons'
import { useEffect, useState, type CSSProperties } from 'react'
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
  /** Kurs-Id oder Zugangscode der laufenden Session; null = freies Training */
  kursId: string | null
  onSelectTopic: (topic: AppTopic) => void
}

export default function TopicDashboard({ username, score, kursId, onSelectTopic }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [topics, setTopics] = useState<AppTopic[]>([])
  const [sceneCounts, setSceneCounts] = useState<Record<string, number>>({})
  const [showMethodik, setShowMethodik] = useState(false)

  // ── Landfilter (v0.16.3) ──
  // Der Filter blendet aus, er sperrt nicht: Vorgabe ist «alle Länder», und
  // die zuletzt getroffene Wahl bleibt auf dem Gerät gemerkt. Wer nur mit
  // einem Land arbeitet, sieht davon nichts – die Bedienung erscheint erst ab
  // dem zweiten.
  const K_LANDFILTER = 'rsi-v3-landfilter'
  const [landFilter, setLandFilter] = useState<string>(() => {
    try { return localStorage.getItem(K_LANDFILTER) ?? '' } catch { return '' }
  })

  function waehleLand(code: string): void {
    setLandFilter(code)
    try {
      if (code) localStorage.setItem(K_LANDFILTER, code)
      else localStorage.removeItem(K_LANDFILTER)
    } catch { /* Merken ist Zugabe, kein Muss */ }
  }

  useEffect(() => {
    // v0.10.1: strikte Kurs-Sicht + isActive-Filter (archivierte Themen
    // erschienen vorher weiterhin im Teilnehmer-Dashboard)
    const ts = getSichtbareTopics(kursId)
    setTopics(ts)
    const counts: Record<string, number> = {}
    ts.forEach(tp => { counts[tp.id] = getScenes(tp.id).length })
    setSceneCounts(counts)
  }, [kursId])

  // Oberste Themen nach Land gruppieren. Die Reihenfolge folgt dem
  // Ländernamen in der Sprache der Oberfläche, nicht dem Code – «Schweiz»
  // steht im Deutschen an anderer Stelle als «Suisse» im Französischen.
  const oberste = topics.filter(tp => !tp.parentTopicId)
  const laender = Array.from(new Set(oberste.map(tp => getTopicCountry(tp.id, topics))))
    .sort((a, b) => landName(a, lang).localeCompare(landName(b, lang), lang))
  const mehrereLaender = laender.length > 1

  const sichtbareLaender = landFilter && laender.some(c => c === landFilter) ? [landFilter] : laender
  const gruppen = sichtbareLaender.map(code => ({
    code,
    name: landName(code, lang),
    themen: oberste.filter(tp => getTopicCountry(tp.id, topics) === code),
  })).filter(g => g.themen.length > 0)

  function filterPille(aktiv: boolean): CSSProperties {
    return {
      padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
      cursor: 'pointer', fontFamily: 'var(--rsi-font)',
      border: aktiv ? 'none' : '1px solid var(--rsi-color-border)',
      background: aktiv ? 'var(--rsi-dunkelblau)' : 'transparent',
      color: aktiv ? 'white' : 'var(--rsi-color-text-muted)',
    }
  }

  // Schritt-für-Schritt Daten – mit erweitertem Tooltip-Text (E-2)
  const schritte = [
    { nr: 1, icon: <Eye size={20} />,                title: t('guide.step1_title'), desc: t('guide.step1_desc'), detail: t('guide.step1_detail', t('guide.step1_desc')) },
    { nr: 2, icon: <MousePointerClick size={20} />,  title: t('guide.step2_title'), desc: t('guide.step2_desc'), detail: t('guide.step2_detail', t('guide.step2_desc')) },
    { nr: 3, icon: <BookOpen size={20} />,           title: t('guide.step3_title'), desc: t('guide.step3_desc'), detail: t('guide.step3_detail', t('guide.step3_desc')) },
    { nr: 4, icon: <BarChart3 size={20} />,          title: t('guide.step4_title'), desc: t('guide.step4_desc'), detail: t('guide.step4_detail', t('guide.step4_desc')) },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full" style={{ padding: 'var(--rsi-padding-page)' }}>
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--rsi-color-text)', marginBottom: '4px' }}>{t('topics.title')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--rsi-color-text-muted)' }}>{t('topics.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', background: 'var(--rsi-dunkelblau)', color: 'white', fontSize: '14px', fontWeight: 700 }}>
          <Trophy size={14} />
          {score.toLocaleString('de-CH')} Pkt.
          {username && <span style={{ opacity: 0.7, fontWeight: 500, fontSize: '13px' }}>· {username}</span>}
        </div>
      </div>

      {/* Landfilter – erscheint erst ab dem zweiten Land. Er blendet aus,
          er sperrt nicht: «Alle Länder» bleibt die Vorgabe. */}
      {mehrereLaender && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)' }}>
            {t('land.label')}
          </span>
          <button
            onClick={() => waehleLand('')}
            aria-pressed={landFilter === ''}
            style={filterPille(landFilter === '')}
          >
            {t('land.filter_alle')}
          </button>
          {laender.map(code => (
            <button
              key={code}
              onClick={() => waehleLand(code)}
              aria-pressed={landFilter === code}
              style={filterPille(landFilter === code)}
            >
              {landName(code, lang)}
            </button>
          ))}
        </div>
      )}

      {/* Themen, nach Land gruppiert. Bei nur einem Land bleibt die
          Überschrift weg – sie sagte in jeder Zeile dasselbe. */}
      {gruppen.map(gruppe => (
        <section key={gruppe.code} style={{ marginBottom: '28px' }}>
          {mehrereLaender && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: 0 }}>
                {gruppe.name}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--rsi-color-text-disabled)' }}>
                {gruppe.themen.length}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {gruppe.themen.map((topic, i) => {
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
              style={{ borderRadius: 'var(--rsi-radius-card)', border: '1px solid var(--rsi-color-border)', background: 'var(--rsi-color-surface)', padding: '24px', boxShadow: 'var(--rsi-shadow-sm)' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(0,118,189,0.1)', color: 'var(--rsi-color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <TopicIcon iconKey={topic.iconKey} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--rsi-color-text)', marginBottom: '6px' }}>
                {ml(topic.nameI18n, lang)}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
                {ml(topic.beschreibungI18n, lang)}
              </p>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '20px', background: 'rgba(0,118,189,0.1)', color: 'var(--rsi-color-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>RSI</span>
                <span style={{ fontSize: '12px', color: 'var(--rsi-color-text-disabled)', fontWeight: 600 }}>{sceneCount} {t('topics.scenesCount')}</span>
              </div>
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--rsi-color-accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </motion.div>
            )
            })}
          </div>

          {/* Wer hinter den Inhalten dieses Landes steht */}
          <div style={{ marginTop: '14px' }}>
            <ZustaendigkeitKarte country={gruppe.code} kompakt />
          </div>
        </section>
      ))}

      {/* E-1: Visueller Trenner zwischen Themen-Bereich und «So funktioniert» */}
      <div style={{
        marginTop: '56px', marginBottom: '32px',
        height: '1px', background: 'var(--rsi-color-border)',
      }} />

      {/* ── Schritt-für-Schritt Anleitung ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          padding: '24px',
          borderRadius: 'var(--rsi-radius-card)',
          background: 'var(--rsi-color-bg-secondary)',
          border: '1px solid var(--rsi-color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '6px',
            background: 'var(--rsi-dunkelblau)', color: 'white',
            fontSize: '13px', fontWeight: 800,
          }}>?</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: 0 }}>
            {t('guide.title')}
          </h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)', marginBottom: '20px', marginLeft: '38px' }}>
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
                borderRadius: 'var(--rsi-radius-card)',
                border: '1px solid var(--rsi-color-border)',
                background: 'var(--rsi-color-surface)',
                padding: '20px',
                position: 'relative',
                cursor: 'help',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.borderColor = 'var(--rsi-blau)'
                e.currentTarget.style.boxShadow = 'var(--rsi-shadow-sm)'
                const ext = e.currentTarget.querySelector<HTMLDivElement>('.step-detail')
                if (ext) ext.style.opacity = '1'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = 'var(--rsi-color-border)'
                e.currentTarget.style.boxShadow = 'none'
                const ext = e.currentTarget.querySelector<HTMLDivElement>('.step-detail')
                if (ext) ext.style.opacity = '0'
              }}
            >
              {/* Schrittnummer */}
              <div style={{
                position: 'absolute', top: '12px', right: '12px',
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'var(--rsi-color-bg-tertiary)',
                color: 'var(--rsi-color-text-disabled)',
                fontSize: '11px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.nr}
              </div>

              {/* Icon */}
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(0,64,124,0.08)', color: 'var(--rsi-dunkelblau)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px',
              }}>
                {s.icon}
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--rsi-color-text)', marginBottom: '6px' }}>
                {s.title}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--rsi-color-text-muted)', lineHeight: 1.5 }}>
                {s.desc}
              </p>

              {/* E-2: Detail-Erklaerung beim Hover (zusaetzlich zum native title-Tooltip) */}
              {s.detail && s.detail !== s.desc && (
                <div className="step-detail" style={{
                  marginTop: '10px', padding: '8px 10px',
                  borderTop: '1px dashed var(--rsi-color-border)',
                  fontSize: '11px', color: 'var(--rsi-blau)', lineHeight: 1.5,
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
                  color: 'var(--rsi-color-border)', zIndex: 2,
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
          borderRadius: 'var(--rsi-radius-card)',
          border: '1px solid var(--rsi-color-border)',
          background: 'var(--rsi-color-surface)',
          overflow: 'hidden',
          marginBottom: '48px',
        }}
      >
        {/* Header – immer sichtbar */}
        <button
          onClick={() => setShowMethodik(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '20px 24px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--rsi-font)', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px',
              background: 'rgba(0,64,124,0.08)', color: 'var(--rsi-dunkelblau)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--rsi-color-text)' }}>
                {t('verfahren:methodik_title')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--rsi-color-text-muted)' }}>
                {t('verfahren:methodik_subtitle')}
              </div>
            </div>
          </div>
          <div style={{ color: 'var(--rsi-color-text-muted)' }}>
            {showMethodik ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {/* Inhalt – aufklappbar */}
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
                borderTop: '1px solid var(--rsi-color-border)',
                paddingTop: '20px',
              }}>
                {/* 3-spaltig: Relevanz-Matrix | Unfallrisiko-Matrix | NACA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Relevanz-Matrix */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-muted)', marginBottom: '10px' }}>
                      {t('verfahren:methodik_relevanz_title')}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-disabled)', marginBottom: '10px' }}>
                      {t('verfahren:methodik_relevanz_desc')}
                    </p>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle(), textAlign: 'left' }}>{t('verfahren:methodik_wichtigkeit')}</th>
                          <th style={thStyle()}>{t('verfahren:dim_klein')}</th>
                          <th style={thStyle()}>{t('verfahren:dim_mittel')}</th>
                          <th style={thStyle()}>{t('verfahren:dim_gross')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('verfahren:dim_gross')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('verfahren:result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('verfahren:result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('verfahren:dim_mittel')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('verfahren:result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('verfahren:result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('verfahren:dim_klein')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('verfahren:result_mittel')}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: '9px', color: 'var(--rsi-color-text-disabled)', marginTop: '6px' }}>
                      {t('verfahren:methodik_achse')}: {t('verfahren:methodik_zeile_wichtigkeit')}, {t('verfahren:methodik_spalte_abweichung')}
                    </div>
                  </div>

                  {/* Unfallrisiko-Matrix */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-muted)', marginBottom: '10px' }}>
                      {t('verfahren:methodik_risiko_title')}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-disabled)', marginBottom: '10px' }}>
                      {t('verfahren:methodik_risiko_desc')}
                    </p>
                    <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle(), textAlign: 'left' }}>{t('verfahren:methodik_relevanz_sd')}</th>
                          <th style={thStyle()}>{t('verfahren:schwere_leicht')}</th>
                          <th style={thStyle()}>{t('verfahren:schwere_mittel')}</th>
                          <th style={thStyle()}>{t('verfahren:schwere_schwer')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('verfahren:result_hoch')}</td>
                          <td style={tdCell('mittel')}>{t('verfahren:result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('verfahren:result_hoch')}</td>
                          <td style={tdCell('hoch')}>{t('verfahren:result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('verfahren:result_mittel')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('verfahren:result_mittel')}</td>
                          <td style={tdCell('hoch')}>{t('verfahren:result_hoch')}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdStyle(), fontWeight: 600 }}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('gering')}>{t('verfahren:result_gering')}</td>
                          <td style={tdCell('mittel')}>{t('verfahren:result_mittel')}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: '9px', color: 'var(--rsi-color-text-disabled)', marginTop: '6px' }}>
                      {t('verfahren:methodik_achse')}: {t('verfahren:methodik_zeile_relevanz')}, {t('verfahren:methodik_spalte_schwere')}
                    </div>
                  </div>

                  {/* NACA-Skala */}
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--rsi-color-text-muted)', marginBottom: '10px' }}>
                      {t('verfahren:methodik_naca_title')}
                    </h4>
                    <p style={{ fontSize: '11px', color: 'var(--rsi-color-text-disabled)', marginBottom: '10px' }}>
                      {t('verfahren:methodik_naca_desc')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <NacaBar label={t('verfahren:schwere_leicht')} range="NACA 0–1" color="var(--rsi-gruen)" width="33%" />
                      <NacaBar label={t('verfahren:schwere_mittel')} range="NACA 2–3" color="var(--rsi-orange)" width="50%" />
                      <NacaBar label={t('verfahren:schwere_schwer')} range="NACA 4–7" color="var(--rsi-rot)" width="100%" />
                    </div>
                  </div>
                </div>

                {/* E-3: Quellen-Block als eigenstaendiger Absatz unter den 3 Spalten */}
                <div style={{
                  marginTop: '24px', paddingTop: '16px',
                  borderTop: '1px solid var(--rsi-color-border)',
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  fontSize: '11px', color: 'var(--rsi-color-text-muted)', lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', minWidth: '80px' }}>
                    {t('verfahren:methodik_quellen')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
                    <span>Fachkurs FK RSI (V 16.09.2020)</span>
                    <span>·</span>
                    <span>bfu-Bericht 73 (NACA)</span>
                    <span>·</span>
                    <span>SN 641 723:2016 Abb. 2</span>
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
      <div style={{ width: '70px', fontSize: '11px', fontWeight: 600, color: 'var(--rsi-color-text)', flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, height: '22px', borderRadius: '4px', background: 'var(--rsi-color-bg-secondary)', position: 'relative', overflow: 'hidden' }}>
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
    color: 'var(--rsi-color-text-muted)',
    borderBottom: '2px solid var(--rsi-color-border)',
  }
}

function tdStyle(): React.CSSProperties {
  return {
    padding: '6px 8px',
    borderBottom: '1px solid var(--rsi-color-border)',
    color: 'var(--rsi-color-text)',
  }
}

function tdCell(level: 'gering' | 'mittel' | 'hoch'): React.CSSProperties {
  const bg = level === 'hoch' ? 'rgba(212,0,83,0.1)' : level === 'mittel' ? 'rgba(184,115,0,0.1)' : 'rgba(26,127,31,0.1)'
  const color = level === 'hoch' ? 'var(--rsi-rot)' : level === 'mittel' ? 'var(--rsi-orange)' : 'var(--rsi-gruen)'
  return {
    padding: '6px 8px',
    textAlign: 'center',
    fontWeight: 600,
    borderBottom: '1px solid var(--rsi-color-border)',
    background: bg,
    color,
    borderRadius: '2px',
  }
}
