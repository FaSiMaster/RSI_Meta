// ScoringFlow – 9-Schritt bfu-Bewertungsflow
// Schritte 1,3,7: Benutzereingabe | 2,4,6,8: Matrix-Visualisierung | 5,9: Ergebnis

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, XCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { ml, type AppDeficit, type AppScene, saveRankingEntry } from '../data/appData'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// ── Berechnungsmatrizen ──
const RELEVANZ: Record<RSIDimension, Record<RSIDimension, ResultDimension>> = {
  gross:  { gross: 'hoch',   mittel: 'mittel', klein: 'gering' },
  mittel: { gross: 'hoch',   mittel: 'mittel', klein: 'gering' },
  klein:  { gross: 'mittel', mittel: 'gering', klein: 'gering' },
}

const UNFALLRISIKO: Record<ResultDimension, Record<NACADimension, ResultDimension>> = {
  hoch:   { schwer: 'hoch',   mittel: 'hoch',   leicht: 'mittel' },
  mittel: { schwer: 'hoch',   mittel: 'mittel',  leicht: 'gering' },
  gering: { schwer: 'mittel', mittel: 'gering',  leicht: 'gering' },
}

function nacaToSchwere(n: number): NACADimension {
  if (n <= 1) return 'leicht'
  if (n <= 3) return 'mittel'
  return 'schwer'
}

function resultColor(v: ResultDimension | string): string {
  if (v === 'hoch')   return 'var(--zh-rot)'
  if (v === 'mittel') return 'var(--zh-orange)'
  return 'var(--zh-blau)'
}
function resultBg(v: ResultDimension | string): string {
  if (v === 'hoch')   return 'rgba(212,0,83,0.12)'
  if (v === 'mittel') return 'rgba(184,115,0,0.12)'
  return 'rgba(0,118,189,0.12)'
}

// ── Matrix-Anzeige ──
interface MatrixDisplayProps {
  type: 'relevanz' | 'unfallrisiko'
  highlightRow?: string
  highlightCol?: string
  showIntersection?: boolean
}

function MatrixDisplay({ type, highlightRow, highlightCol, showIntersection }: MatrixDisplayProps) {
  const rows = type === 'relevanz'
    ? (['gross', 'mittel', 'klein'] as RSIDimension[])
    : (['hoch', 'mittel', 'gering'] as ResultDimension[])
  const cols = type === 'relevanz'
    ? (['gross', 'mittel', 'klein'] as RSIDimension[])
    : (['schwer', 'mittel', 'leicht'] as NACADimension[])

  const rowLabel = type === 'relevanz' ? 'Wichtigkeit' : 'Relevanz SD'
  const colLabel = type === 'relevanz' ? 'Abweichung' : 'NACA-Schwere'

  function cellValue(r: string, c: string): ResultDimension {
    if (type === 'relevanz') return RELEVANZ[r as RSIDimension][c as RSIDimension]
    return UNFALLRISIKO[r as ResultDimension][c as NACADimension]
  }

  return (
    <div>
      {/* Col-Achsen-Label */}
      <div className="flex mb-1">
        <div style={{ width: '76px' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)' }}>
          {colLabel} →
        </div>
      </div>

      {/* Col-Labels */}
      <div className="flex mb-1">
        <div style={{ width: '76px' }} />
        {cols.map(c => (
          <div
            key={c}
            style={{
              flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 700,
              textTransform: 'capitalize', padding: '4px 2px',
              color: c === highlightCol ? 'var(--zh-color-accent)' : 'var(--zh-color-text-muted)',
              background: c === highlightCol ? 'rgba(0,118,189,0.08)' : 'transparent',
              borderRadius: '6px',
            }}
          >
            {c}
          </div>
        ))}
      </div>

      {/* Row-Achsen-Label + Grid */}
      <div className="flex items-stretch">
        {/* Row-Achsen-Label */}
        <div style={{ width: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
            {rowLabel}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          {rows.map(r => (
            <div key={r} className="flex gap-1 mb-1">
              {/* Row-Label */}
              <div style={{
                width: '56px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize',
                color: r === highlightRow ? 'var(--zh-color-accent)' : 'var(--zh-color-text-muted)',
                background: r === highlightRow ? 'rgba(0,118,189,0.06)' : 'transparent',
                borderRadius: '6px',
              }}>
                {r}
              </div>

              {/* Cells */}
              {cols.map(c => {
                const val = cellValue(r, c)
                const isIntersection = r === highlightRow && c === highlightCol && showIntersection
                const isHighlightedRow = r === highlightRow
                const isHighlightedCol = c === highlightCol

                return (
                  <div
                    key={c}
                    style={{
                      flex: 1, height: '44px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, textTransform: 'capitalize',
                      transition: 'all 0.2s',
                      background: isIntersection
                        ? resultBg(val)
                        : (isHighlightedRow || isHighlightedCol)
                        ? 'var(--zh-color-bg-tertiary)'
                        : 'var(--zh-color-bg-secondary)',
                      color: (isIntersection || isHighlightedRow || isHighlightedCol)
                        ? resultColor(val)
                        : 'var(--zh-color-text-disabled)',
                      border: isIntersection
                        ? `2px solid ${resultColor(val)}`
                        : '1px solid var(--zh-color-border)',
                      boxShadow: isIntersection ? `0 0 0 3px ${resultBg(val)}` : 'none',
                      opacity: (!highlightRow && !highlightCol) ? 1
                        : (isHighlightedRow || isHighlightedCol || isIntersection) ? 1 : 0.4,
                    }}
                  >
                    {val}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Schritt-Indikator ──
function StepDots({ current, total = 9 }: { current: number; total?: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === current ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: i + 1 < current
              ? 'var(--zh-gruen)'
              : i + 1 === current
              ? 'var(--zh-color-accent)'
              : 'var(--zh-color-border)',
            transition: 'all 0.3s',
          }}
        />
      ))}
    </div>
  )
}

// ── Auswahl-Button ──
function ChoiceBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full font-bold capitalize transition-all"
      style={{
        padding: '14px 20px',
        borderRadius: 'var(--zh-radius-btn)',
        border: active ? `2px solid var(--zh-color-accent)` : '1px solid var(--zh-color-border)',
        background: active ? 'rgba(0,118,189,0.12)' : 'var(--zh-color-bg-secondary)',
        color: active ? 'var(--zh-color-accent)' : 'var(--zh-color-text)',
        fontSize: '15px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
  )
}

// ── Props ──
interface Props {
  deficit: AppDeficit
  scene: AppScene
  username: string
  onComplete: (score: number) => void
  onBack: () => void
}

export default function ScoringFlow({ deficit, scene, username, onComplete, onBack }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [step, setStep] = useState(1)
  const [showResult, setShowResult] = useState(false)
  const [wichtigkeit, setWichtigkeit] = useState<RSIDimension | null>(null)
  const [abweichung, setAbweichung] = useState<RSIDimension | null>(null)
  const [nacaScore, setNacaScore] = useState<number | null>(null)

  // Abgeleitete Werte
  const nacaSchwere: NACADimension | null = nacaScore !== null ? nacaToSchwere(nacaScore) : null
  const relevanzSD: ResultDimension | null = wichtigkeit && abweichung ? RELEVANZ[wichtigkeit][abweichung] : null
  const unfallrisiko: ResultDimension | null = relevanzSD && nacaSchwere ? UNFALLRISIKO[relevanzSD][nacaSchwere] : null

  function next() { setStep(s => Math.min(s + 1, 9)) }

  function finish() {
    setShowResult(true)
  }

  // Punkte berechnen
  const correct = deficit.correctAssessment
  const wKorrekt   = wichtigkeit === correct.wichtigkeit
  const aKorrekt   = abweichung  === correct.abweichung
  const nKorrekt   = nacaSchwere === correct.unfallschwere
  const alleKorrekt = wKorrekt && aKorrekt && nKorrekt
  const punkte = 100 + (wKorrekt ? 50 : 0) + (aKorrekt ? 50 : 0) + (nKorrekt ? 50 : 0) + (alleKorrekt ? 100 : 0)

  function handleSave() {
    saveRankingEntry({
      username,
      score: punkte,
      scenesCompleted: 1,
      timestamp: new Date().toISOString(),
    })
    onComplete(punkte)
  }

  const progressW = `${((step - 1) / 9) * 100}%`

  // ── Ergebnis-Screen ──
  if (showResult) {
    const rows = [
      { label: t('assessment.wichtigkeit'), user: wichtigkeit ?? '–', correct: correct.wichtigkeit, ok: wKorrekt },
      { label: t('assessment.abweichung'),  user: abweichung ?? '–',  correct: correct.abweichung,  ok: aKorrekt },
      { label: 'Relevanz SD',               user: relevanzSD ?? '–',  correct: RELEVANZ[correct.wichtigkeit][correct.abweichung], ok: relevanzSD === RELEVANZ[correct.wichtigkeit][correct.abweichung] },
      { label: t('assessment.nacaScore'),   user: nacaSchwere ?? '–', correct: correct.unfallschwere, ok: nKorrekt },
      { label: t('result.unfallrisiko'),    user: unfallrisiko ?? '–',correct: UNFALLRISIKO[RELEVANZ[correct.wichtigkeit][correct.abweichung]][correct.unfallschwere], ok: unfallrisiko === UNFALLRISIKO[RELEVANZ[correct.wichtigkeit][correct.abweichung]][correct.unfallschwere] },
    ]

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto w-full"
        style={{ padding: 'var(--zh-padding-page)' }}
      >
        {/* Titel + Punkte */}
        <div
          className="text-center mb-8 rounded-2xl"
          style={{ padding: '32px', background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)' }}
        >
          <h2 className="font-bold mb-2" style={{ fontSize: '22px' }}>{t('scoring.resultTitle')}</h2>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span style={{ fontSize: '42px', fontWeight: 900, color: 'var(--zh-color-accent)' }}>
              {punkte.toLocaleString('de-CH')}
            </span>
            <span style={{ fontSize: '18px', color: 'var(--zh-color-text-muted)' }}>{t('score.points')}</span>
          </div>
          {alleKorrekt && (
            <div
              className="inline-flex items-center gap-2 rounded-full font-bold mt-2"
              style={{ padding: '6px 14px', background: 'rgba(26,127,31,0.12)', color: 'var(--zh-gruen)', fontSize: '13px' }}
            >
              <CheckCircle2 size={14} /> Vollständig korrekt! +100 Bonus
            </div>
          )}
        </div>

        {/* Vergleichstabelle */}
        <div style={{ borderRadius: 'var(--zh-radius-card)', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-surface)', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '12px 20px', background: 'var(--zh-color-bg-secondary)', borderBottom: '1px solid var(--zh-color-border)' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-muted)' }}>
              Schrittweise Auswertung
            </h3>
          </div>
          {rows.map(row => (
            <div
              key={row.label}
              className="flex items-center justify-between"
              style={{ padding: '12px 20px', borderBottom: '1px solid var(--zh-color-border)' }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--zh-color-text-muted)', minWidth: '160px' }}>
                {row.label}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="capitalize font-bold rounded"
                  style={{ fontSize: '13px', padding: '3px 10px', background: row.ok ? 'rgba(26,127,31,0.1)' : 'rgba(212,0,83,0.1)', color: row.ok ? 'var(--zh-gruen)' : 'var(--zh-rot)' }}
                >
                  {String(row.user)}
                </span>
                {row.ok
                  ? <CheckCircle2 size={16} style={{ color: 'var(--zh-gruen)' }} />
                  : <XCircle size={16} style={{ color: 'var(--zh-rot)' }} />
                }
                {!row.ok && (
                  <span
                    className="capitalize rounded"
                    style={{ fontSize: '12px', padding: '2px 8px', background: 'rgba(0,118,189,0.1)', color: 'var(--zh-color-accent)' }}
                  >
                    ✓ {String(row.correct)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback + Lösung */}
        <div className="space-y-4 mb-8">
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'var(--zh-color-bg-secondary)', border: '1px solid var(--zh-color-border)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-accent)', marginBottom: '8px' }}>
              <Info size={12} style={{ display: 'inline', marginRight: '6px' }} />
              {t('result.feedback')}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-secondary)', fontStyle: 'italic', lineHeight: 1.6 }}>
              "{ml(deficit.feedback, lang)}"
            </p>
          </div>
          <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(26,127,31,0.07)', border: '1px solid rgba(26,127,31,0.2)' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-gruen)', marginBottom: '8px' }}>
              {t('result.massnahmen')}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-secondary)', lineHeight: 1.6 }}>
              {ml(deficit.solution, lang)}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full font-bold text-white transition-all hover:scale-[1.02]"
          style={{ padding: '16px', borderRadius: 'var(--zh-radius-btn)', background: 'var(--zh-dunkelblau)', fontSize: '16px' }}
        >
          {t('scoring.saveContinue')}
        </button>
      </motion.div>
    )
  }

  // ── Schritt-Layout ──
  const panelStyle = {
    borderRadius: 'var(--zh-radius-card)',
    border: '1px solid var(--zh-color-border)',
    background: 'var(--zh-color-surface)',
    padding: '32px',
    boxShadow: 'var(--zh-shadow-md)',
  }

  const hintStyle = {
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'var(--zh-color-bg-secondary)',
    border: '1px solid var(--zh-color-border)',
    fontSize: '14px',
    color: 'var(--zh-color-text-muted)',
    lineHeight: 1.5,
    marginBottom: '20px',
  }

  const weiterbtnStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: 'var(--zh-radius-btn)',
    background: 'var(--zh-dunkelblau)',
    color: 'white',
    fontSize: '15px',
    fontWeight: 700,
    marginTop: '24px',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.2s',
  }

  const dimChoices: RSIDimension[] = ['gross', 'mittel', 'klein']

  return (
    <div
      className="max-w-2xl mx-auto w-full"
      style={{ padding: 'var(--zh-padding-page)' }}
    >
      {/* Zurück */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 transition-colors"
        style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', fontWeight: 500 }}
      >
        <ArrowLeft size={15} /> {t('scenes.back')}
      </button>

      {/* Defizit-Titel */}
      <div className="mb-6">
        <h2 className="font-bold" style={{ fontSize: '20px' }}>
          {ml(deficit.title, lang)}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', marginTop: '4px' }}>
          {ml(deficit.description, lang)}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-2" style={{ height: '4px', borderRadius: '2px', background: 'var(--zh-color-bg-tertiary)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: progressW, background: 'var(--zh-color-accent)', borderRadius: '2px', transition: 'width 0.4s' }} />
      </div>
      <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '24px' }}>
        {t('scoring.stepOf', { step })}
      </p>

      <StepDots current={step} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          style={panelStyle}
        >
          {/* ── SCHRITT 1: Wichtigkeit ── */}
          {step === 1 && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step1Title')}</h3>
              <p style={hintStyle}>
                {scene.locationType === 'io' ? t('scoring.step1SubIo') : t('scoring.step1SubAo')}
                <br />
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{t('scoring.wichtigkeitHint')}</span>
              </p>
              <div className="space-y-3">
                {dimChoices.map(v => (
                  <ChoiceBtn key={v} label={v} active={wichtigkeit === v} onClick={() => { setWichtigkeit(v); setTimeout(next, 300) }} />
                ))}
              </div>
            </>
          )}

          {/* ── SCHRITT 2: Relevanz-Matrix Zeile ── */}
          {step === 2 && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step2Title')}</h3>
              <p style={{ ...hintStyle, marginBottom: '24px' }}>{t('scoring.step2Sub')}</p>
              <MatrixDisplay type="relevanz" highlightRow={wichtigkeit ?? undefined} />
              <button style={weiterbtnStyle} onClick={next}>{t('scoring.nextBtn')}</button>
            </>
          )}

          {/* ── SCHRITT 3: Abweichung ── */}
          {step === 3 && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step3Title')}</h3>
              <p style={hintStyle}>
                {t('scoring.step3Sub')}
                <br />
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{t('scoring.abweichungHint')}</span>
              </p>
              <div className="space-y-3">
                {dimChoices.map(v => (
                  <ChoiceBtn key={v} label={v} active={abweichung === v} onClick={() => { setAbweichung(v); setTimeout(next, 300) }} />
                ))}
              </div>
            </>
          )}

          {/* ── SCHRITT 4: Relevanz-Matrix Schnittpunkt ── */}
          {step === 4 && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step4Title')}</h3>
              <p style={{ ...hintStyle, marginBottom: '24px' }}>{t('scoring.step4Sub')}</p>
              <MatrixDisplay type="relevanz" highlightRow={wichtigkeit ?? undefined} highlightCol={abweichung ?? undefined} showIntersection />
              <button style={weiterbtnStyle} onClick={next}>{t('scoring.nextBtn')}</button>
            </>
          )}

          {/* ── SCHRITT 5: Relevanz SD Ergebnis ── */}
          {step === 5 && relevanzSD && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step5Title')}</h3>
              <p style={{ ...hintStyle, marginBottom: '24px' }}>{t('scoring.step5Sub')}</p>
              <div
                className="text-center rounded-2xl mb-6"
                style={{ padding: '24px', background: resultBg(relevanzSD), border: `2px solid ${resultColor(relevanzSD)}` }}
              >
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: resultColor(relevanzSD), marginBottom: '6px' }}>
                  Relevanz SD
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: resultColor(relevanzSD), textTransform: 'capitalize' }}>
                  {relevanzSD}
                </p>
              </div>
              <MatrixDisplay type="relevanz" highlightRow={wichtigkeit ?? undefined} highlightCol={abweichung ?? undefined} showIntersection />
              <button style={weiterbtnStyle} onClick={next}>{t('scoring.nextBtn')}</button>
            </>
          )}

          {/* ── SCHRITT 6: Unfallrisiko-Matrix Zeile ── */}
          {step === 6 && relevanzSD && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step6Title')}</h3>
              <p style={{ ...hintStyle, marginBottom: '24px' }}>{t('scoring.step6Sub')}</p>
              <MatrixDisplay type="unfallrisiko" highlightRow={relevanzSD} />
              <button style={weiterbtnStyle} onClick={next}>{t('scoring.nextBtn')}</button>
            </>
          )}

          {/* ── SCHRITT 7: NACA-Score ── */}
          {step === 7 && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step7Title')}</h3>
              <p style={hintStyle}>
                {t('scoring.step7Sub')}
                <br />
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{t('scoring.nacaHint')}</span>
              </p>

              {/* NACA-Gruppen */}
              <div className="space-y-3">
                {[
                  { label: t('scoring.nacaLeicht'), values: [0, 1], schwere: 'leicht' as NACADimension },
                  { label: t('scoring.nacaMittel'),  values: [2, 3], schwere: 'mittel' as NACADimension },
                  { label: t('scoring.nacaSchwer'),  values: [4, 5, 6, 7], schwere: 'schwer' as NACADimension },
                ].map(group => (
                  <div key={group.schwere}>
                    <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-muted)', marginBottom: '8px' }}>
                      {group.label}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {group.values.map(n => (
                        <button
                          key={n}
                          onClick={() => { setNacaScore(n); setTimeout(next, 300) }}
                          className="font-bold transition-all"
                          style={{
                            width: '44px', height: '44px', borderRadius: '10px',
                            fontSize: '16px',
                            border: nacaScore === n ? `2px solid ${resultColor(group.schwere)}` : '1px solid var(--zh-color-border)',
                            background: nacaScore === n ? resultBg(group.schwere) : 'var(--zh-color-bg-secondary)',
                            color: nacaScore === n ? resultColor(group.schwere) : 'var(--zh-color-text)',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="flex items-center gap-2 rounded-lg mt-6"
                style={{ padding: '10px 14px', background: 'rgba(0,118,189,0.06)', border: '1px solid rgba(0,118,189,0.15)' }}
              >
                <Info size={13} style={{ color: 'var(--zh-color-accent)', flexShrink: 0 }} />
                <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)' }}>{t('scoring.nacaSource')}</p>
              </div>
            </>
          )}

          {/* ── SCHRITT 8: Unfallrisiko-Matrix Schnittpunkt ── */}
          {step === 8 && relevanzSD && nacaSchwere && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step8Title')}</h3>
              <p style={{ ...hintStyle, marginBottom: '24px' }}>{t('scoring.step8Sub')}</p>
              <MatrixDisplay type="unfallrisiko" highlightRow={relevanzSD} highlightCol={nacaSchwere} showIntersection />
              <button style={weiterbtnStyle} onClick={next}>{t('scoring.nextBtn')}</button>
            </>
          )}

          {/* ── SCHRITT 9: Unfallrisiko Ergebnis ── */}
          {step === 9 && unfallrisiko && relevanzSD && nacaSchwere && (
            <>
              <h3 className="font-bold mb-1" style={{ fontSize: '18px' }}>{t('scoring.step9Title')}</h3>
              <p style={{ ...hintStyle, marginBottom: '24px' }}>{t('scoring.step9Sub')}</p>
              <div
                className="text-center rounded-2xl mb-6"
                style={{ padding: '24px', background: resultBg(unfallrisiko), border: `2px solid ${resultColor(unfallrisiko)}` }}
              >
                <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: resultColor(unfallrisiko), marginBottom: '6px' }}>
                  {t('result.unfallrisiko')}
                </p>
                <p style={{ fontSize: '32px', fontWeight: 900, color: resultColor(unfallrisiko), textTransform: 'capitalize' }}>
                  {unfallrisiko}
                </p>
              </div>
              <MatrixDisplay type="unfallrisiko" highlightRow={relevanzSD} highlightCol={nacaSchwere} showIntersection />
              <button style={weiterbtnStyle} onClick={finish}>{t('scoring.nextBtn')}</button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
