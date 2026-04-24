// ScoringFlow – Kompakter 1-Screen RSI-Bewertungsflow
// TBA-Fachkurs FK RSI, V 16.09.2020 — normativ, keine Abweichungen
// Alle 3 Benutzerentscheide auf einem Screen, Matrizen ausklappbar

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, XCircle, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { ml, type AppDeficit, type AppScene } from '../data/appData'
import LernKarte from './LernKarte'
import {
  WICHTIGKEIT_TABLE, NORMHIERARCHIE, ABWEICHUNG_KATEGORIEN,
  calcRelevanzSD, calcUnfallrisiko,
} from '../data/scoringEngine'
import { KRITERIUM_LABELS } from '../data/kriteriumLabels'
import { calcScore as calcScorePure, MAX_PUNKTE_PRO_DEFIZIT } from '../data/scoreCalc'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// ── Farbhilfen ──
function resultColor(v: ResultDimension): string {
  if (v === 'hoch')   return 'var(--zh-rot)'
  if (v === 'mittel') return 'var(--zh-orange)'
  return 'var(--zh-gruen)'
}
function resultBg(v: ResultDimension): string {
  if (v === 'hoch')   return 'rgba(212,0,83,0.10)'
  if (v === 'mittel') return 'rgba(184,115,0,0.10)'
  return 'rgba(26,127,31,0.10)'
}
function resultLabel(v: ResultDimension, t: (k: string) => string): string {
  const map: Record<ResultDimension, string> = { hoch: t('scoring.result_hoch'), mittel: t('scoring.result_mittel'), gering: t('scoring.result_gering') }
  return map[v]
}
function dimLabel(v: RSIDimension, t: (k: string) => string): string {
  const map: Record<RSIDimension, string> = { gross: t('scoring.dim_gross'), mittel: t('scoring.dim_mittel'), klein: t('scoring.dim_klein') }
  return map[v]
}
function nacaGruppeLabel(v: NACADimension, t: (k: string) => string): string {
  const map: Record<NACADimension, string> = { leicht: t('scoring.schwere_leicht'), mittel: t('scoring.schwere_mittel'), schwer: t('scoring.schwere_schwer') }
  return map[v]
}

// ── Kompakte Matrix (max 360px) ──
interface CompactMatrixProps {
  type: 'relevanz' | 'unfallrisiko'
  highlightRow?: string
  highlightCol?: string
  showIntersection?: boolean
  // Korrekte Lösung markieren (zweiter Marker)
  correctRow?: string
  correctCol?: string
}

function CompactMatrix({ type, highlightRow, highlightCol, showIntersection, correctRow, correctCol }: CompactMatrixProps) {
  const isR = type === 'relevanz'

  const rows = isR
    ? (['gross', 'mittel', 'klein'] as const)
    : (['hoch', 'mittel', 'gering'] as const)
  const cols = isR
    ? (['klein', 'mittel', 'gross'] as const)
    : (['leicht', 'mittel', 'schwer'] as const)
  const { t } = useTranslation()
  const rowLabels = isR
    ? [t('scoring.dim_gross'), t('scoring.dim_mittel'), t('scoring.dim_klein')]
    : [t('scoring.result_hoch'), t('scoring.result_mittel'), t('scoring.result_gering')]
  const colLabels = isR
    ? [t('scoring.dim_klein'), t('scoring.dim_mittel'), t('scoring.dim_gross')]
    : [t('scoring.schwere_leicht'), t('scoring.schwere_mittel'), t('scoring.schwere_schwer')]
  const xLabel    = isR ? t('scoring.matrix_abweichung') : t('scoring.matrix_unfallschwere')
  const yLabel    = isR ? t('scoring.matrix_wichtigkeit') : t('scoring.matrix_relevanz')

  function cellVal(row: string, col: string): ResultDimension {
    if (isR) return calcRelevanzSD(row as RSIDimension, col as RSIDimension)
    return calcUnfallrisiko(row as ResultDimension, col as NACADimension)
  }

  const AXIS_BG     = 'rgba(0,118,189,0.10)'
  const AXIS_BORDER = 'rgba(0,118,189,0.35)'
  const AXIS_COLOR  = 'var(--zh-blau)'

  return (
    <div style={{ maxWidth: '360px' }}>
      {/* X-Achsen-Label */}
      <div style={{ paddingLeft: '40px', marginBottom: '2px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-disabled)', textAlign: 'center' }}>
          {xLabel} →
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2px' }}>
        {/* Y-Achsen-Label (vertikal) */}
        <div style={{ width: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '9px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--zh-color-text-disabled)',
            whiteSpace: 'nowrap',
          }}>
            {yLabel} ↓
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1 }}>
          {/* Spaltenheader */}
          <div style={{ display: 'grid', gridTemplateColumns: `36px repeat(${cols.length}, 1fr)`, gap: '2px', marginBottom: '2px' }}>
            <div />
            {cols.map((col, ci) => {
              const isHL = col === highlightCol
              return (
                <div key={String(col)} style={{
                  textAlign: 'center', fontSize: '10px', fontWeight: 700,
                  padding: '3px 2px', borderRadius: '3px',
                  background: isHL ? AXIS_BG : 'var(--zh-color-bg-secondary)',
                  color: isHL ? AXIS_COLOR : 'var(--zh-color-text-muted)',
                  border: isHL ? `1px solid ${AXIS_BORDER}` : '1px solid var(--zh-color-border)',
                }}>
                  {colLabels[ci]}
                </div>
              )
            })}
          </div>

          {/* Datenzeilen */}
          {rows.map((row, ri) => {
            const isRowHL = row === highlightRow
            return (
              <div key={String(row)} style={{ display: 'grid', gridTemplateColumns: `36px repeat(${cols.length}, 1fr)`, gap: '2px', marginBottom: '2px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: '4px', fontSize: '10px', fontWeight: 700,
                  borderRadius: '3px',
                  background: isRowHL ? AXIS_BG : 'var(--zh-color-bg-secondary)',
                  color: isRowHL ? AXIS_COLOR : 'var(--zh-color-text-muted)',
                  border: isRowHL ? `1px solid ${AXIS_BORDER}` : '1px solid var(--zh-color-border)',
                }}>
                  {rowLabels[ri]}
                </div>

                {cols.map((col) => {
                  const val         = cellVal(String(row), String(col))
                  const isIntersect = showIntersection === true && row === highlightRow && col === highlightCol
                  const isCorrect   = correctRow !== undefined && correctCol !== undefined && row === correctRow && col === correctCol
                  const isAxisHL    = !isIntersect && !isCorrect && (row === highlightRow || col === highlightCol) && (highlightRow !== undefined || highlightCol !== undefined)
                  const showCorrectMarker = isCorrect && !isIntersect
                  const userCorrect = isIntersect && isCorrect
                  const userWrong   = isIntersect && !isCorrect
                  return (
                    <div key={String(col)} style={{
                      textAlign: 'center',
                      padding: '6px 2px',
                      borderRadius: '4px',
                      minHeight: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px',
                      fontSize: (isIntersect || showCorrectMarker) ? '11px' : '10px',
                      fontWeight: (isIntersect || showCorrectMarker) ? 800 : 600,
                      background: userCorrect
                        ? 'var(--zh-gruen)'
                        : userWrong
                          ? 'rgba(212,0,83,0.18)'
                          : showCorrectMarker
                            ? 'rgba(26,127,31,0.18)'
                            : isAxisHL
                              ? resultBg(val)
                              : 'var(--zh-color-bg-secondary)',
                      color: userCorrect
                        ? 'white'
                        : userWrong
                          ? 'var(--zh-rot)'
                          : showCorrectMarker
                            ? 'var(--zh-gruen)'
                            : resultColor(val),
                      border: userCorrect
                        ? '2px solid var(--zh-gruen)'
                        : userWrong
                          ? '2px solid var(--zh-rot)'
                          : showCorrectMarker
                            ? '2px solid var(--zh-gruen)'
                            : isAxisHL
                              ? `1px solid ${resultColor(val)}44`
                              : '1px solid var(--zh-color-border)',
                      transform: (isIntersect || showCorrectMarker) ? 'scale(1.05)' : 'none',
                      transition: 'all 0.25s',
                      boxShadow: userCorrect ? '0 2px 10px rgba(26,127,31,0.4)' : userWrong ? '0 2px 10px rgba(212,0,83,0.25)' : showCorrectMarker ? '0 2px 10px rgba(26,127,31,0.25)' : 'none',
                    }}>
                      {userCorrect && '✓ '}
                      {userWrong && '✗ '}
                      {showCorrectMarker && '✓ '}
                      {resultLabel(val, t)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Ausklappbarer Bereich ──
function Collapsible({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderRadius: '8px', border: '1px solid var(--zh-color-border)', overflow: 'hidden', marginTop: '10px' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', background: 'var(--zh-color-bg-secondary)',
          border: 'none', cursor: 'pointer', fontFamily: 'var(--zh-font)',
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--zh-color-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--zh-color-text-muted)' }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 12px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Schritt-Karte ──
interface StepCardProps {
  nr: number
  title: string
  subtitle?: string
  isActive: boolean
  isCompleted: boolean
  // E-5: Wenn gesetzt und isCompleted, erscheint ein «Aendern»-Link rechts
  onChange?: () => void
  changeLabel?: string
  children: React.ReactNode
}

function StepCard({ nr, title, subtitle, isActive, isCompleted, onChange, changeLabel, children }: StepCardProps) {
  return (
    <div style={{
      borderRadius: '10px',
      border: isActive
        ? '2px solid var(--zh-blau)'
        : isCompleted
          ? '1.5px solid color-mix(in srgb, var(--zh-gruen) 27%, transparent)'
          : '1.5px solid var(--zh-color-border)',
      background: isActive
        ? 'var(--zh-color-surface)'
        : 'var(--zh-color-bg-secondary)',
      padding: '14px 16px',
      transition: 'all 0.2s',
      opacity: !isActive && !isCompleted ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isActive ? '10px' : '0' }}>
        {/* Schritt-Nummer */}
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 800,
          background: isCompleted ? 'var(--zh-gruen)' : isActive ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
          color: (isCompleted || isActive) ? 'white' : 'var(--zh-color-text-disabled)',
          flexShrink: 0,
        }}>
          {isCompleted ? <CheckCircle2 size={14} /> : nr}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{title}</span>
          {subtitle && (
            <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginLeft: '8px' }}>{subtitle}</span>
          )}
        </div>
        {/* E-5: Aendern-Link nach Auswahl */}
        {isCompleted && onChange && (
          <button
            onClick={onChange}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '11px', fontWeight: 600,
              color: 'var(--zh-blau)', textDecoration: 'underline',
              padding: '4px 6px', minHeight: '28px',
              fontFamily: 'var(--zh-font)',
            }}
          >
            {changeLabel ?? 'Aendern'}
          </button>
        )}
      </div>
      {isActive && children}
    </div>
  )
}

// ── NACA-Gruppen ──
const NACA_GRUPPEN: { wert: NACADimension; color: string; titleKey: string; subKey: string }[] = [
  { wert: 'leicht', color: 'var(--zh-gruen)', titleKey: 'scoring.naca_leicht', subKey: 'scoring.naca_leicht_sub' },
  { wert: 'mittel', color: 'var(--zh-orange)', titleKey: 'scoring.naca_mittel', subKey: 'scoring.naca_mittel_sub' },
  { wert: 'schwer', color: 'var(--zh-rot)', titleKey: 'scoring.naca_schwer', subKey: 'scoring.naca_schwer_sub' },
]

// ── Props ──
interface Props {
  deficit:    AppDeficit
  scene:      AppScene
  username?:  string
  kategorieRichtig?: boolean
  hintPenalty?:      boolean
  onComplete: (finalScore: number, rohScore: number) => void
  onBack:     () => void
  // Vorgefuellte Bewertungen aus dem Viewer-Overlay
  prefillWichtigkeit?: RSIDimension
  prefillAbweichung?:  RSIDimension
  prefillNacaSchwere?: NACADimension
}

export default function ScoringFlow({ deficit, scene, kategorieRichtig = true, hintPenalty = false, onComplete, onBack, prefillWichtigkeit: propW, prefillAbweichung: propA, prefillNacaSchwere: propN }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  // Wenn Bewertungen vom Viewer kommen, direkt als Ergebnis-Screen starten
  const hasPrefill = propW != null && propA != null && propN != null
  const [wichtigkeit, setWichtigkeit] = useState<RSIDimension | null>(propW ?? null)
  const [abweichung, setAbweichung]   = useState<RSIDimension | null>(propA ?? null)
  const [nacaSchwere, setNacaSchwere] = useState<NACADimension | null>(propN ?? null)
  const [showResult, setShowResult]   = useState(hasPrefill)
  const [showLernKarte, setShowLernKarte] = useState(false)
  const [showMethodik, setShowMethodik] = useState(false)

  // Abgeleitete Werte
  const relevanzSD: ResultDimension | null =
    wichtigkeit && abweichung ? calcRelevanzSD(wichtigkeit, abweichung) : null
  const unfallrisiko: ResultDimension | null =
    relevanzSD && nacaSchwere ? calcUnfallrisiko(relevanzSD, nacaSchwere) : null

  // Vorbelegung aus WICHTIGKEIT_TABLE
  const tableWert = WICHTIGKEIT_TABLE[deficit.kriteriumId]
  const prefillWichtigkeit: RSIDimension | null = tableWert
    ? ((tableWert[deficit.kontext] as RSIDimension | '') || null)
    : null

  const ca = deficit.correctAssessment

  // Aktiver Schritt
  const activeStep = !wichtigkeit ? 1 : !abweichung ? 2 : !nacaSchwere ? 3 : 0

  // Punkte berechnen (Pure Function aus scoreCalc.ts)
  function calcScore(): number {
    return calcScorePure([
      wichtigkeit === ca.wichtigkeit,
      true,
      abweichung === ca.abweichung,
      true,
      relevanzSD === ca.relevanzSD,
      true,
      nacaSchwere === ca.unfallschwere,
      true,
      unfallrisiko === ca.unfallrisiko,
    ])
  }

  // Bewertung abschliessen
  function handleSubmit() {
    setShowResult(true)
  }

  // ── Methodik-Overlay ──
  function renderMethodik() {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}
        onClick={() => setShowMethodik(false)}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--zh-color-bg)', borderRadius: '14px',
            padding: '24px', maxWidth: '560px', width: '100%',
            maxHeight: '80vh', overflowY: 'auto',
            boxShadow: 'var(--zh-shadow-lg)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '16px' }}>
            RSI 9-Schritte-Methodik
          </h3>

          {/* Normhierarchie */}
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Normhierarchie (Abweichungsbewertung)
          </p>
          <div style={{ marginBottom: '16px' }}>
            {NORMHIERARCHIE.map(n => (
              <div key={n.stufe} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700, color: 'var(--zh-blau)', minWidth: '16px' }}>{n.stufe}.</span>
                <span>{n.label}</span>
              </div>
            ))}
          </div>

          {/* Relevanz-Matrix */}
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Relevanz-Matrix (Wichtigkeit x Abweichung)
          </p>
          <div style={{ marginBottom: '16px' }}>
            <CompactMatrix type="relevanz" />
          </div>

          {/* Unfallrisiko-Matrix */}
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Unfallrisiko-Matrix (Relevanz SD x Unfallschwere)
          </p>
          <div style={{ marginBottom: '16px' }}>
            <CompactMatrix type="unfallrisiko" />
          </div>

          {/* NACA-Erklaerung */}
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            NACA-Einstufung → Unfallschwere
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
            {NACA_GRUPPEN.map(g => (
              <div key={g.wert} style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'center' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: g.color }}>{t(g.titleKey)}</span>
                <span style={{ color: 'var(--zh-color-text-muted)' }}>{t(g.subKey)}</span>
              </div>
            ))}
          </div>

          {/* Abweichung-Kategorien */}
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Abweichungskategorien
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            {ABWEICHUNG_KATEGORIEN.map(k => (
              <div key={k.wert} style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                <strong style={{ color: 'var(--zh-color-text)' }}>{k.label}:</strong> {k.beschreibung}
              </div>
            ))}
          </div>

          {/* Quellen */}
          <div style={{
            padding: '10px 12px', borderRadius: '8px',
            background: 'rgba(0,118,189,0.06)', border: '1px solid rgba(0,118,189,0.18)',
          }}>
            <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              <strong>Quellen:</strong> TBA-Fachkurs FK RSI (V 16.09.2020), bfu-Bericht 73 (NACA), SN 641 723 Abb. 2
            </p>
          </div>

          <button
            onClick={() => setShowMethodik(false)}
            style={{
              marginTop: '16px', width: '100%', padding: '10px',
              borderRadius: 'var(--zh-radius-btn)',
              background: 'var(--zh-dunkelblau)', color: 'white',
              fontWeight: 700, fontSize: '13px', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--zh-font)',
            }}
          >
            Schliessen
          </button>
        </motion.div>
      </motion.div>
    )
  }

  // ── Ergebnis-Screen ──
  function renderResult() {
    const rawPts = calcScore()
    const maxPts = MAX_PUNKTE_PRO_DEFIZIT
    // Kategorie additiv + Hinweis-Abzug
    const katPts       = kategorieRichtig ? 25 : 0
    const hintAbzug    = hintPenalty ? 25 : 0
    const ptsVorBonus  = Math.max(0, rawPts + katPts - hintAbzug)
    // D-9: Booster-Bonus (10 % oder 20 %) auf den finalen Score
    const boosterPct   = deficit.isBooster ? (deficit.boosterBonusProzent ?? 10) : 0
    const pts          = Math.round(ptsVorBonus * (1 + boosterPct / 100))
    const finalCorrect = unfallrisiko === ca.unfallrisiko

    const decisions: { label: string; user: string; correct: string; ok: boolean }[] = [
      { label: t('scoring.phase_a'), user: wichtigkeit ? dimLabel(wichtigkeit, t) : '—', correct: dimLabel(ca.wichtigkeit, t), ok: wichtigkeit === ca.wichtigkeit },
      { label: t('scoring.phase_b'), user: abweichung ? dimLabel(abweichung, t) : '—', correct: dimLabel(ca.abweichung, t), ok: abweichung === ca.abweichung },
      { label: t('scoring.phase_c'), user: relevanzSD ? resultLabel(relevanzSD, t) : '—', correct: resultLabel(ca.relevanzSD, t), ok: relevanzSD === ca.relevanzSD },
      { label: t('scoring.phase_d'), user: nacaSchwere ? nacaGruppeLabel(nacaSchwere, t) : '—', correct: nacaGruppeLabel(ca.unfallschwere, t), ok: nacaSchwere === ca.unfallschwere },
      { label: t('scoring.unfallrisiko_titel'), user: unfallrisiko ? resultLabel(unfallrisiko, t) : '—', correct: resultLabel(ca.unfallrisiko, t), ok: finalCorrect },
    ]

    const allCorrect = decisions.every(d => d.ok) && kategorieRichtig

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Ergebnis-Vergleich */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { labelKey: 'scoring.deine_wahl', value: unfallrisiko, isUser: true },
            { labelKey: 'scoring.korrekte_wahl', value: ca.unfallrisiko, isUser: false },
          ].map(({ labelKey, value, isUser }) => (
            <div key={labelKey} style={{
              padding: '12px', borderRadius: '10px',
              background: isUser
                ? (finalCorrect ? 'rgba(26,127,31,0.08)' : 'rgba(212,0,83,0.06)')
                : 'rgba(26,127,31,0.08)',
              border: isUser
                ? (finalCorrect
                    ? '1.5px solid color-mix(in srgb, var(--zh-gruen) 27%, transparent)'
                    : '1.5px solid color-mix(in srgb, var(--zh-rot) 27%, transparent)')
                : '1.5px solid color-mix(in srgb, var(--zh-gruen) 27%, transparent)',
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-muted)', marginBottom: '4px' }}>
                {t(labelKey)}
              </p>
              <p style={{ fontSize: '18px', fontWeight: 900, color: resultColor(value as ResultDimension), margin: 0 }}>
                {resultLabel(value as ResultDimension, t).toUpperCase()}
              </p>
              {isUser && finalCorrect && (
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-gruen)', marginTop: '2px', margin: 0 }}>
                  {t('scoring.korrekt')} ✓
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Entscheidungstabelle */}
        <div style={{ borderRadius: '8px', border: '1px solid var(--zh-color-border)', overflow: 'hidden', marginBottom: '12px' }}>
          {decisions.map((d, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 20px',
              alignItems: 'center', gap: '6px',
              padding: '7px 12px',
              borderBottom: i < decisions.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
              background: d.ok ? 'rgba(26,127,31,0.03)' : 'rgba(212,0,83,0.03)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--zh-color-text)' }}>{d.label}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: d.ok ? 'var(--zh-gruen)' : 'var(--zh-rot)' }}>{d.user}</span>
              <span style={{ fontSize: '10px', color: 'var(--zh-color-text-muted)' }}>{!d.ok && `→ ${d.correct}`}</span>
              {d.ok
                ? <CheckCircle2 size={13} style={{ color: 'var(--zh-gruen)', flexShrink: 0 }} />
                : <XCircle     size={13} style={{ color: 'var(--zh-rot)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Punkte */}
        <div style={{
          padding: '12px 14px', borderRadius: '8px',
          background: allCorrect ? 'rgba(26,127,31,0.08)' : 'rgba(0,64,124,0.05)',
          border: `1px solid ${allCorrect ? 'color-mix(in srgb, var(--zh-gruen) 20%, transparent)' : 'var(--zh-color-border)'}`,
          marginBottom: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
              {t('scoring.punkte_erhalten')}
            </span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: pts === maxPts ? 'var(--zh-gruen)' : 'var(--zh-dunkelblau)' }}>
              {pts} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--zh-color-text-muted)' }}>/ {maxPts} Pkt.</span>
            </span>
          </div>
          {allCorrect && !hintPenalty && kategorieRichtig && (
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-gruen)', marginBottom: '8px' }}>
              {t('scoring.allCorrect')}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--zh-color-text-muted)' }}>Kategorie</span>
              <span style={{ fontWeight: 700, color: kategorieRichtig ? 'var(--zh-gruen)' : 'var(--zh-rot)' }}>
                {kategorieRichtig ? '+25' : '0'} Pkt.
              </span>
            </div>
            {[0, 1, 3].map(i => {
              const d = decisions[i]
              const ptsStep = [25, 25, 25][[0, 1, 3].indexOf(i)]
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--zh-color-text-muted)' }}>{d.label}</span>
                  <span style={{ fontWeight: 700, color: d.ok ? 'var(--zh-gruen)' : 'var(--zh-rot)' }}>
                    {d.ok ? `+${ptsStep}` : '0'} Pkt.
                  </span>
                </div>
              )
            })}
            {hintPenalty && (
              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--zh-color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--zh-orange)' }}>{t('scoring.hinweis_genutzt')}</span>
                <span style={{ fontWeight: 700, color: 'var(--zh-orange)' }}>−25 Pkt.</span>
              </div>
            )}
          </div>
        </div>

        {/* Matrizen mit Vergleich (User-Wahl vs. korrekt) */}
        <Collapsible title="Relevanz-Matrix" defaultOpen={!allCorrect}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: resultColor(relevanzSD ?? 'gering'), display: 'inline-block' }} />
              Deine Wahl
            </span>
            {relevanzSD !== ca.relevanzSD && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--zh-gruen)', border: '1px dashed var(--zh-gruen)', display: 'inline-block' }} />
                Korrekt
              </span>
            )}
          </div>
          <CompactMatrix
            type="relevanz"
            highlightRow={wichtigkeit ?? undefined}
            highlightCol={abweichung ?? undefined}
            showIntersection
            correctRow={ca.wichtigkeit}
            correctCol={ca.abweichung}
          />
        </Collapsible>
        <Collapsible title="Unfallrisiko-Matrix" defaultOpen={!allCorrect}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: resultColor(unfallrisiko ?? 'gering'), display: 'inline-block' }} />
              Deine Wahl
            </span>
            {unfallrisiko !== ca.unfallrisiko && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--zh-gruen)', border: '1px dashed var(--zh-gruen)', display: 'inline-block' }} />
                Korrekt
              </span>
            )}
          </div>
          <CompactMatrix
            type="unfallrisiko"
            highlightRow={relevanzSD ?? undefined}
            highlightCol={nacaSchwere ?? undefined}
            showIntersection
            correctRow={ca.relevanzSD}
            correctCol={ca.unfallschwere}
          />
        </Collapsible>

        {/* Normreferenzen */}
        {deficit.normRefs.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {deficit.normRefs.map(r => (
                <span key={r} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'rgba(0,118,189,0.08)', color: 'var(--zh-blau)' }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weiter-Button → zeigt LernKarte */}
        <button
          onClick={() => setShowLernKarte(true)}
          style={{
            width: '100%', padding: '12px 20px', marginTop: '16px',
            borderRadius: 'var(--zh-radius-btn)',
            background: 'var(--zh-dunkelblau)',
            color: 'white', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', border: 'none', fontFamily: 'var(--zh-font)',
          }}
        >
          {t('scoring.weiter_suchen')} →
        </button>

        {/* LernKarte-Overlay */}
        {showLernKarte && (
          <LernKarte
            deficit={deficit}
            kategorieRichtig={kategorieRichtig}
            wichtigkeitKorrekt={wichtigkeit === ca.wichtigkeit}
            abweichungKorrekt={abweichung === ca.abweichung}
            nacaKorrekt={nacaSchwere === ca.unfallschwere}
            onWeiter={() => onComplete(pts, rawPts)}
          />
        )}
      </motion.div>
    )
  }

  // ── Haupt-Render ──
  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--zh-color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header — kompakt */}
      <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--zh-color-border)', flexShrink: 0 }}>
        <button
          onClick={() => {
            // Warnung wenn bereits Eingaben gemacht und Ergebnis noch nicht angezeigt
            const hatEingaben = wichtigkeit != null || abweichung != null || nacaSchwere != null
            if (hatEingaben && !showResult) {
              if (!window.confirm(t('scoring.verwerfenConfirm'))) return
            }
            onBack()
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '12px', color: 'var(--zh-color-text-muted)', fontWeight: 500,
            marginBottom: '6px', cursor: 'pointer',
            background: 'none', border: 'none', padding: 0, fontFamily: 'var(--zh-font)',
          }}
        >
          <ArrowLeft size={13} /> {t('scenes.back')}
        </button>

        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginBottom: '1px' }}>
          {ml(scene.nameI18n, lang)} · {scene.kontext === 'io' ? t('admin.innerorts') : t('admin.ausserorts')}
        </p>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '1px' }}>
          {ml(deficit.nameI18n, lang)}
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', margin: 0 }}>
          {ml(deficit.beschreibungI18n, lang)}
        </p>
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 30px' }}>

        {showResult ? renderResult() : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* ── Schritt 1: Wichtigkeit ── */}
            <StepCard
              nr={1}
              title={t('scoring.phase_a')}
              subtitle={`${KRITERIUM_LABELS[deficit.kriteriumId] ?? deficit.kriteriumId} · ${deficit.kontext === 'io' ? 'io' : 'ao'}`}
              isActive={activeStep === 1}
              isCompleted={!!wichtigkeit}
              changeLabel={t('scoring.aendern')}
              onChange={() => { setWichtigkeit(null); setAbweichung(null); setNacaSchwere(null) }}
            >
              <div>
                {prefillWichtigkeit && (
                  <div style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,118,189,0.06)', border: '1px solid rgba(0,118,189,0.18)', marginBottom: '10px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', margin: 0 }}>
                      Gemäss Tabelle: <strong style={{ color: 'var(--zh-blau)' }}>{dimLabel(prefillWichtigkeit, t)}</strong>
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(['klein', 'mittel', 'gross'] as RSIDimension[]).map(w => {
                    const isActive = wichtigkeit === w
                    return (
                      <button
                        key={w}
                        onClick={() => { if (!wichtigkeit) setWichtigkeit(w) }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 'var(--zh-radius-btn)',
                          border: isActive ? '2px solid var(--zh-gruen)' : '1.5px solid var(--zh-color-border)',
                          background: isActive ? 'rgba(26,127,31,0.08)' : 'var(--zh-color-surface)',
                          color: isActive ? 'var(--zh-gruen)' : 'var(--zh-color-text)',
                          fontWeight: isActive ? 700 : 500, fontSize: '13px',
                          cursor: wichtigkeit ? 'default' : 'pointer',
                          transition: 'all 0.15s',
                          fontFamily: 'var(--zh-font)',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>
                          {isActive
                            ? <CheckCircle2 size={14} style={{ color: 'var(--zh-gruen)' }} />
                            : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid var(--zh-color-border)' }} />}
                        </span>
                        {dimLabel(w, t)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </StepCard>

            {/* ── Schritt 2: Abweichung ── */}
            <StepCard
              nr={2}
              title={t('scoring.phase_b')}
              isActive={activeStep === 2}
              isCompleted={!!abweichung}
              changeLabel={t('scoring.aendern')}
              onChange={() => { setAbweichung(null); setNacaSchwere(null) }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {ABWEICHUNG_KATEGORIEN.map(k => {
                  const isActive = abweichung === k.wert
                  return (
                    <button
                      key={k.wert}
                      onClick={() => { if (!abweichung) setAbweichung(k.wert) }}
                      style={{
                        padding: '8px 12px', borderRadius: 'var(--zh-radius-btn)',
                        border: isActive ? '2px solid var(--zh-gruen)' : '1.5px solid var(--zh-color-border)',
                        background: isActive ? 'rgba(26,127,31,0.08)' : 'var(--zh-color-surface)',
                        textAlign: 'left',
                        cursor: abweichung ? 'default' : 'pointer',
                        transition: 'all 0.15s', fontFamily: 'var(--zh-font)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}
                    >
                      <span style={{ flexShrink: 0 }}>
                        {isActive
                          ? <CheckCircle2 size={14} style={{ color: 'var(--zh-gruen)' }} />
                          : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid var(--zh-color-border)' }} />}
                      </span>
                      <span>
                        <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--zh-gruen)' : 'var(--zh-color-text)', display: 'block' }}>
                          {k.label}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', display: 'block' }}>
                          {k.beschreibung}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </StepCard>

            {/* Zwischenergebnis: Relevanz SD (automatisch) */}
            {relevanzSD && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 14px', borderRadius: '8px',
                  background: resultBg(relevanzSD),
                  border: `1px solid ${resultColor(relevanzSD)}33`,
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--zh-color-text-muted)' }}>
                  Relevanz SD
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: resultColor(relevanzSD) }}>
                  {resultLabel(relevanzSD, t)}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)', marginLeft: 'auto' }}>auto</span>
              </motion.div>
            )}

            {/* ── Schritt 3: NACA-Schwere ── */}
            <StepCard
              nr={3}
              title={t('scoring.phase_d')}
              isActive={activeStep === 3}
              isCompleted={!!nacaSchwere}
              changeLabel={t('scoring.aendern')}
              onChange={() => { setNacaSchwere(null) }}
            >
              <div>
                {/* bfu-Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(184,115,0,0.08)', border: '1px solid rgba(184,115,0,0.3)', marginBottom: '10px' }}>
                  <AlertTriangle size={11} style={{ color: 'var(--zh-orange)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-orange)' }}>{t('scoring.bfu_badge')}</span>
                </div>

                {/* Leitfrage */}
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,64,124,0.06)', border: '1px solid rgba(0,64,124,0.14)', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--zh-dunkelblau)', lineHeight: 1.4, margin: 0 }}>
                    {t('scoring.naca_leitfrage')}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {NACA_GRUPPEN.map(g => {
                    const isActive = nacaSchwere === g.wert
                    return (
                      <button
                        key={g.wert}
                        onClick={() => { if (!nacaSchwere) setNacaSchwere(g.wert) }}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--zh-radius-btn)',
                          border: isActive ? `2px solid ${g.color}` : '1.5px solid var(--zh-color-border)',
                          background: isActive ? `${g.color}12` : 'var(--zh-color-surface)',
                          textAlign: 'left',
                          cursor: nacaSchwere ? 'default' : 'pointer',
                          transition: 'all 0.15s', fontFamily: 'var(--zh-font)',
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                      >
                        <span style={{ flexShrink: 0 }}>
                          {isActive
                            ? <CheckCircle2 size={14} style={{ color: g.color }} />
                            : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid var(--zh-color-border)' }} />}
                        </span>
                        <span>
                          <span style={{ fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isActive ? g.color : 'var(--zh-color-text)', display: 'block' }}>
                            {t(g.titleKey)}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--zh-color-text-muted)', lineHeight: 1.3, display: 'block' }}>
                            {t(g.subKey)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </StepCard>

            {/* Zwischenergebnis: Unfallrisiko (automatisch) */}
            {unfallrisiko && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 14px', borderRadius: '8px',
                  background: resultBg(unfallrisiko),
                  border: `1px solid ${resultColor(unfallrisiko)}33`,
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--zh-color-text-muted)' }}>
                  Unfallrisiko
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: resultColor(unfallrisiko) }}>
                  {resultLabel(unfallrisiko, t)}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)', marginLeft: 'auto' }}>auto</span>
              </motion.div>
            )}

            {/* Bewertung abschliessen */}
            {unfallrisiko && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <button
                  onClick={handleSubmit}
                  style={{
                    width: '100%', padding: '12px 20px',
                    borderRadius: 'var(--zh-radius-btn)',
                    background: 'var(--zh-dunkelblau)',
                    color: 'white', fontWeight: 700, fontSize: '14px',
                    cursor: 'pointer', border: 'none', fontFamily: 'var(--zh-font)',
                  }}
                >
                  {t('scoring.resultTitle')} →
                </button>
              </motion.div>
            )}

            {/* Methodik-Link */}
            <button
              onClick={() => setShowMethodik(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'none', border: 'none', padding: '4px 0',
                cursor: 'pointer', fontFamily: 'var(--zh-font)',
                fontSize: '11px', fontWeight: 600, color: 'var(--zh-blau)',
              }}
            >
              <Info size={13} /> Wie funktioniert die Bewertung?
            </button>
          </div>
        )}
      </div>

      {/* Methodik-Overlay */}
      <AnimatePresence>
        {showMethodik && renderMethodik()}
      </AnimatePresence>
    </div>
  )
}
