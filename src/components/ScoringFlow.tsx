// ScoringFlow – Didaktisch optimierter 5-Phasen RSI-Bewertungsflow
// TBA-Fachkurs FK RSI, V 16.09.2020 — normativ, keine Abweichungen
// Phasen: A Wichtigkeit | B Abweichung | C Relevanz SD | D Unfallschwere | E Auswertung

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { ml, type AppDeficit, type AppScene } from '../data/appData'
import {
  WICHTIGKEIT_TABLE, NORMHIERARCHIE, ABWEICHUNG_KATEGORIEN,
  calcRelevanzSD, calcUnfallrisiko,
  STEP_WEIGHTS, STEP_WEIGHT_UNIT, KRITERIUM_LABELS,
} from '../data/scoringEngine'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// ── Farbhilfen ──
function resultColor(v: ResultDimension): string {
  if (v === 'hoch')   return '#D40053'
  if (v === 'mittel') return '#B87300'
  return '#1A7F1F'
}
function resultBg(v: ResultDimension): string {
  if (v === 'hoch')   return 'rgba(212,0,83,0.10)'
  if (v === 'mittel') return 'rgba(184,115,0,0.10)'
  return 'rgba(26,127,31,0.10)'
}
function resultLabel(v: ResultDimension): string {
  const map: Record<ResultDimension, string> = { hoch: 'Hoch', mittel: 'Mittel', gering: 'Gering' }
  return map[v]
}
function dimLabel(v: RSIDimension): string {
  const map: Record<RSIDimension, string> = { gross: 'Gross', mittel: 'Mittel', klein: 'Klein' }
  return map[v]
}
function nacaGruppeLabel(v: NACADimension): string {
  const map: Record<NACADimension, string> = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' }
  return map[v]
}

// ── Phasen-Typen ──
type Phase = 'A' | 'A2' | 'B' | 'C' | 'D' | 'D2' | 'E'

function phaseToNr(p: Phase): number {
  if (p === 'A' || p === 'A2') return 1
  if (p === 'B')               return 2
  if (p === 'C')               return 3
  if (p === 'D' || p === 'D2') return 4
  return 5
}

const PHASE_KEYS = [
  'scoring.phase_a',
  'scoring.phase_b',
  'scoring.phase_c',
  'scoring.phase_d',
  'scoring.phase_e',
]

// ── Fortschrittsbalken (5 Phasen) ──
function PhaseProgress({ phase }: { phase: Phase }) {
  const { t } = useTranslation()
  const nr = phaseToNr(phase)
  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', fontWeight: 600 }}>
          {t('scoring.schritt_von', { nr })}
        </span>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {PHASE_KEYS.map((key, i) => (
            <span key={key} style={{
              fontSize: '10px', fontWeight: 700,
              padding: '2px 8px', borderRadius: '4px',
              background: i + 1 === nr
                ? 'var(--zh-dunkelblau)'
                : i + 1 < nr
                  ? 'rgba(26,127,31,0.15)'
                  : 'var(--zh-color-bg-tertiary)',
              color: i + 1 === nr
                ? 'white'
                : i + 1 < nr
                  ? '#1A7F1F'
                  : 'var(--zh-color-text-disabled)',
            }}>
              {t(key)}
            </span>
          ))}
        </div>
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: 'var(--zh-color-bg-tertiary)' }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          background: 'var(--zh-dunkelblau)',
          width: `${(nr / 5) * 100}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  )
}

// ── Kompakte Matrix (max 400px) ──
interface CompactMatrixProps {
  type: 'relevanz' | 'unfallrisiko'
  highlightRow?: string
  highlightCol?: string
  showIntersection?: boolean
}

function CompactMatrix({ type, highlightRow, highlightCol, showIntersection }: CompactMatrixProps) {
  const isR = type === 'relevanz'

  const rows = isR
    ? (['gross', 'mittel', 'klein'] as const)
    : (['hoch', 'mittel', 'gering'] as const)
  const cols = isR
    ? (['klein', 'mittel', 'gross'] as const)
    : (['leicht', 'mittel', 'schwer'] as const)
  const rowLabels = isR ? ['Gross', 'Mittel', 'Klein'] : ['Hoch', 'Mittel', 'Gering']
  const colLabels = isR ? ['Klein', 'Mittel', 'Gross'] : ['Leicht', 'Mittel', 'Schwer']
  const xLabel    = isR ? 'Abweichung →' : 'Unfallschwere (NACA) →'
  const yLabel    = isR ? 'Wichtigkeit ↓' : 'Relevanz SD ↓'

  function cellVal(row: string, col: string): ResultDimension {
    if (isR) return calcRelevanzSD(row as RSIDimension, col as RSIDimension)
    return calcUnfallrisiko(row as ResultDimension, col as NACADimension)
  }

  const AXIS_BG     = 'rgba(0,118,189,0.10)'
  const AXIS_BORDER = 'rgba(0,118,189,0.35)'
  const AXIS_COLOR  = '#0076BD'

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      {/* X-Achsen-Label */}
      <div style={{ paddingLeft: '56px', marginBottom: '3px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-disabled)', textAlign: 'center' }}>
          {xLabel}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '3px' }}>
        {/* Y-Achsen-Label (vertikal) */}
        <div style={{ width: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '10px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--zh-color-text-disabled)',
            whiteSpace: 'nowrap',
          }}>
            {yLabel}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1 }}>
          {/* Spaltenheader */}
          <div style={{ display: 'grid', gridTemplateColumns: `42px repeat(${cols.length}, 1fr)`, gap: '3px', marginBottom: '3px' }}>
            <div />
            {cols.map((col, ci) => {
              const isHL = col === highlightCol
              return (
                <div key={String(col)} style={{
                  textAlign: 'center', fontSize: '11px', fontWeight: 700,
                  padding: '5px 2px', borderRadius: '4px',
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
              <div key={String(row)} style={{ display: 'grid', gridTemplateColumns: `42px repeat(${cols.length}, 1fr)`, gap: '3px', marginBottom: '3px' }}>
                {/* Zeilenkopf */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: '6px', fontSize: '11px', fontWeight: 700,
                  borderRadius: '4px',
                  background: isRowHL ? AXIS_BG : 'var(--zh-color-bg-secondary)',
                  color: isRowHL ? AXIS_COLOR : 'var(--zh-color-text-muted)',
                  border: isRowHL ? `1px solid ${AXIS_BORDER}` : '1px solid var(--zh-color-border)',
                }}>
                  {rowLabels[ri]}
                </div>

                {/* Datenzellen */}
                {cols.map((col) => {
                  const val         = cellVal(String(row), String(col))
                  const isIntersect = showIntersection === true && row === highlightRow && col === highlightCol
                  const isAxisHL    = !isIntersect && (row === highlightRow || col === highlightCol) && (highlightRow !== undefined || highlightCol !== undefined)
                  return (
                    <div key={String(col)} style={{
                      textAlign: 'center',
                      padding: '10px 2px',
                      borderRadius: '6px',
                      minHeight: '44px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isIntersect ? '13px' : '11px',
                      fontWeight: isIntersect ? 800 : 600,
                      background: isIntersect
                        ? resultColor(val)
                        : isAxisHL
                          ? resultBg(val)
                          : 'var(--zh-color-bg-secondary)',
                      color: isIntersect ? 'white' : resultColor(val),
                      border: isIntersect
                        ? `2px solid ${resultColor(val)}`
                        : isAxisHL
                          ? `1px solid ${resultColor(val)}44`
                          : '1px solid var(--zh-color-border)',
                      transform: isIntersect ? 'scale(1.07)' : 'none',
                      transition: 'all 0.25s',
                      boxShadow: isIntersect ? `0 3px 14px ${resultColor(val)}44` : 'none',
                    }}>
                      {resultLabel(val)}
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

// ── Ergebnis-Badge ──
function ResultBadge({ label, value }: { label: string; value: ResultDimension }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '12px',
      padding: '10px 18px', borderRadius: '10px',
      background: resultBg(value),
      border: `1.5px solid ${resultColor(value)}55`,
    }}>
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)' }}>
        {label}
      </span>
      <span style={{ fontSize: '22px', fontWeight: 900, color: resultColor(value) }}>
        {resultLabel(value)}
      </span>
    </div>
  )
}

// ── Infobox ──
function InfoBox({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', gap: '10px',
      padding: '10px 14px', borderRadius: '8px',
      background: 'rgba(0,118,189,0.06)',
      border: '1px solid rgba(0,118,189,0.18)',
      marginTop: '14px',
    }}>
      <Info size={15} style={{ color: 'var(--zh-blau)', flexShrink: 0, marginTop: '1px' }} />
      <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', lineHeight: 1.5, margin: 0 }}>{text}</p>
    </div>
  )
}

// ── Weiter-Button ──
function WeiterBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      marginTop: '20px',
      padding: '11px 24px',
      borderRadius: 'var(--zh-radius-btn)',
      background: 'var(--zh-dunkelblau)',
      color: 'white', fontWeight: 700, fontSize: '14px',
      cursor: 'pointer', border: 'none', fontFamily: 'var(--zh-font)',
    }}>
      {label} →
    </button>
  )
}

// ── Normhierarchie (kompakt) ──
function NormhierarchieKompakt() {
  return (
    <div style={{ marginBottom: '14px' }}>
      {NORMHIERARCHIE.map(n => (
        <div key={n.stufe} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--zh-color-text-muted)', marginBottom: '3px' }}>
          <span style={{ fontWeight: 700, color: 'var(--zh-blau)', minWidth: '16px' }}>{n.stufe}.</span>
          <span>{n.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Props ──
interface Props {
  deficit:    AppDeficit
  scene:      AppScene
  username?:  string
  onComplete: (score: number) => void
  onBack:     () => void
}

export default function ScoringFlow({ deficit, scene, onComplete, onBack }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  const [phase, setPhase]             = useState<Phase>('A')
  const [wichtigkeit, setWichtigkeit] = useState<RSIDimension | null>(null)
  const [abweichung, setAbweichung]   = useState<RSIDimension | null>(null)
  const [nacaSchwere, setNacaSchwere] = useState<NACADimension | null>(null)

  // Abgeleitete Werte (unveraendert: gleiche Logik wie scoringEngine)
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

  // Auto-Uebergang A → A2 (nach Wichtigkeit-Auswahl, 900ms)
  useEffect(() => {
    if (wichtigkeit && phase === 'A') {
      const id = setTimeout(() => setPhase('A2'), 900)
      return () => clearTimeout(id)
    }
  }, [wichtigkeit, phase])

  // Auto-Uebergang B → C (nach Abweichung-Auswahl, 900ms)
  useEffect(() => {
    if (abweichung && phase === 'B') {
      const id = setTimeout(() => setPhase('C'), 900)
      return () => clearTimeout(id)
    }
  }, [abweichung, phase])

  // Auto-Uebergang D → D2 (nach NACA-Auswahl, 900ms)
  useEffect(() => {
    if (nacaSchwere && phase === 'D') {
      const id = setTimeout(() => setPhase('D2'), 900)
      return () => clearTimeout(id)
    }
  }, [nacaSchwere, phase])

  // Punkte berechnen (unveraendert: STEP_WEIGHTS aus scoringEngine)
  function calcScore(): number {
    const correct = [
      wichtigkeit === ca.wichtigkeit,   // Schritt 1 (User)
      true,                              // Schritt 2 (auto)
      abweichung === ca.abweichung,     // Schritt 3 (User)
      true,                              // Schritt 4 (auto)
      relevanzSD === ca.relevanzSD,     // Schritt 5 (auto-abgeleitet)
      true,                              // Schritt 6 (auto)
      nacaSchwere === ca.unfallschwere, // Schritt 7 (User)
      true,                              // Schritt 8 (auto)
      unfallrisiko === ca.unfallrisiko, // Schritt 9 (auto-abgeleitet)
    ]
    let total = 0
    STEP_WEIGHTS.forEach((w, i) => { if (correct[i]) total += w * STEP_WEIGHT_UNIT })
    return Math.round(total)
  }

  // ── PHASE A: Wichtigkeit auswaehlen ──
  function renderPhaseA() {
    return (
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '3px' }}>
          {t('scoring.wichtigkeit_titel')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '14px' }}>
          Quelle: TBA-Fachkurs FK RSI, Folie 1–2
        </p>

        {/* Kontext-Zeile */}
        <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '12px' }}>
          Kriterium: <strong style={{ color: 'var(--zh-color-text)' }}>{KRITERIUM_LABELS[deficit.kriteriumId] ?? deficit.kriteriumId}</strong>
          {' · '}
          Kontext: <strong style={{ color: 'var(--zh-color-text)' }}>{deficit.kontext === 'io' ? 'Innerorts' : 'Ausserorts'}</strong>
        </p>

        {/* Tabellenhinweis */}
        {prefillWichtigkeit && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,118,189,0.06)', border: '1px solid rgba(0,118,189,0.18)', marginBottom: '14px' }}>
            <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', margin: 0 }}>
              Gemäss Tabelle: <strong style={{ color: 'var(--zh-blau)' }}>{dimLabel(prefillWichtigkeit)}</strong> — bitte einschätzen oder bestätigen.
            </p>
          </div>
        )}

        {/* 3 Buttons nebeneinander */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {(['gross', 'mittel', 'klein'] as RSIDimension[]).map(w => {
            const isActive = wichtigkeit === w
            return (
              <button
                key={w}
                onClick={() => { if (!wichtigkeit) setWichtigkeit(w) }}
                style={{
                  padding: '8px 20px',
                  maxWidth: '120px', minWidth: '80px',
                  borderRadius: 'var(--zh-radius-btn)',
                  border: isActive ? '2px solid #1A7F1F' : '1.5px solid var(--zh-color-border)',
                  background: isActive ? 'rgba(26,127,31,0.08)' : 'var(--zh-color-surface)',
                  color: isActive ? '#1A7F1F' : 'var(--zh-color-text)',
                  fontWeight: isActive ? 700 : 500, fontSize: '14px',
                  cursor: wichtigkeit ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'var(--zh-font)',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {isActive && <CheckCircle2 size={14} />}
                {dimLabel(w)}
              </button>
            )
          })}
        </div>

        {wichtigkeit && (
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', marginTop: '10px' }}>
            Wird übertragen…
          </p>
        )}
      </div>
    )
  }

  // ── PHASE A2: Wichtigkeit besätigt + Matrix mit Zeilenmarkierung ──
  function renderPhaseA2() {
    return (
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '3px' }}>
          {t('scoring.wichtigkeit_titel')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '14px' }}>
          Quelle: TBA-Fachkurs FK RSI, Folie 1–2
        </p>

        {/* Bestätigte Auswahl anzeigen */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          {(['gross', 'mittel', 'klein'] as RSIDimension[]).map(w => {
            const isActive = wichtigkeit === w
            return (
              <div key={w} style={{
                padding: '8px 20px', maxWidth: '120px', minWidth: '80px',
                borderRadius: 'var(--zh-radius-btn)',
                border: isActive ? '2px solid #1A7F1F' : '1px solid var(--zh-color-border)',
                background: isActive ? 'rgba(26,127,31,0.08)' : 'var(--zh-color-surface)',
                color: isActive ? '#1A7F1F' : 'var(--zh-color-text-disabled)',
                fontWeight: isActive ? 700 : 400, fontSize: '14px',
                opacity: isActive ? 1 : 0.45,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {isActive && <CheckCircle2 size={14} />}
                {dimLabel(w)}
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '12px' }}>
          Deine Wichtigkeit <strong style={{ color: 'var(--zh-blau)' }}>{dimLabel(wichtigkeit!)}</strong> wird in die Relevanz-Matrix eingetragen:
        </p>

        <CompactMatrix type="relevanz" highlightRow={wichtigkeit ?? undefined} />

        <WeiterBtn
          label={`${t('scoring.nextBtn')} zur Abweichung`}
          onClick={() => setPhase('B')}
        />
      </div>
    )
  }

  // ── PHASE B: Abweichung auswaehlen ──
  function renderPhaseB() {
    return (
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '3px' }}>
          {t('scoring.abweichung_titel')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '12px' }}>
          Quelle: TBA-Fachkurs FK RSI, Folie 3
        </p>

        <NormhierarchieKompakt />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ABWEICHUNG_KATEGORIEN.map(k => {
            const isActive = abweichung === k.wert
            return (
              <button
                key={k.wert}
                onClick={() => { if (!abweichung) setAbweichung(k.wert) }}
                style={{
                  padding: '10px 14px', borderRadius: 'var(--zh-radius-btn)',
                  border: isActive ? '2px solid #1A7F1F' : '1.5px solid var(--zh-color-border)',
                  background: isActive ? 'rgba(26,127,31,0.08)' : 'var(--zh-color-surface)',
                  textAlign: 'left',
                  cursor: abweichung ? 'default' : 'pointer',
                  transition: 'all 0.15s', fontFamily: 'var(--zh-font)',
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                }}
              >
                <span style={{ marginTop: '2px', flexShrink: 0 }}>
                  {isActive
                    ? <CheckCircle2 size={15} style={{ color: '#1A7F1F' }} />
                    : <div style={{ width: '15px', height: '15px', borderRadius: '50%', border: '1.5px solid var(--zh-color-border)' }} />}
                </span>
                <span>
                  <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500, color: isActive ? '#1A7F1F' : 'var(--zh-color-text)', display: 'block' }}>
                    {k.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '2px', display: 'block' }}>
                    {k.beschreibung}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {abweichung && (
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', marginTop: '10px' }}>
            Wird übertragen…
          </p>
        )}
      </div>
    )
  }

  // ── PHASE C: Relevanz SD Ergebnis ──
  function renderPhaseC() {
    return (
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '3px' }}>
          {t('scoring.relevanz_titel')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '16px' }}>
          Quelle: TBA-Fachkurs FK RSI, Folie 4 / SN 641 723 Abb. 2
        </p>

        <CompactMatrix
          type="relevanz"
          highlightRow={wichtigkeit ?? undefined}
          highlightCol={abweichung ?? undefined}
          showIntersection
        />

        <div style={{ marginTop: '16px' }}>
          <ResultBadge label="RSI: Relevanz SD" value={relevanzSD!} />
        </div>

        <InfoBox text={t('scoring.relevanz_proxy')} />

        <WeiterBtn
          label={`${t('scoring.nextBtn')} zur Unfallschwere`}
          onClick={() => setPhase('D')}
        />
      </div>
    )
  }

  // ── PHASE D: NACA-Gruppe auswaehlen ──
  const NACA_GRUPPEN: { wert: NACADimension; color: string; titleKey: string; subKey: string }[] = [
    { wert: 'leicht', color: '#1A7F1F', titleKey: 'scoring.naca_leicht', subKey: 'scoring.naca_leicht_sub' },
    { wert: 'mittel', color: '#B87300', titleKey: 'scoring.naca_mittel', subKey: 'scoring.naca_mittel_sub' },
    { wert: 'schwer', color: '#D40053', titleKey: 'scoring.naca_schwer', subKey: 'scoring.naca_schwer_sub' },
  ]

  function renderPhaseD() {
    return (
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '3px' }}>
          {t('scoring.naca_titel')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '10px' }}>
          Quelle: TBA-Fachkurs FK RSI, Folie 5
        </p>

        {/* bfu-Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '4px', background: 'rgba(184,115,0,0.08)', border: '1px solid rgba(184,115,0,0.3)', marginBottom: '16px' }}>
          <AlertTriangle size={12} style={{ color: '#B87300' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#B87300' }}>Einstiegshilfe bfu · nicht direkt in SN 641 723</span>
        </div>

        {/* Leitfrage */}
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'rgba(0,64,124,0.06)', border: '1px solid rgba(0,64,124,0.14)', marginBottom: '18px' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-dunkelblau)', lineHeight: 1.5, margin: 0 }}>
            {t('scoring.naca_leitfrage')}
          </p>
        </div>

        {/* 3 Gruppenbuttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {NACA_GRUPPEN.map(g => {
            const isActive = nacaSchwere === g.wert
            return (
              <button
                key={g.wert}
                onClick={() => { if (!nacaSchwere) setNacaSchwere(g.wert) }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--zh-radius-btn)',
                  border: isActive ? `2px solid ${g.color}` : '1.5px solid var(--zh-color-border)',
                  background: isActive ? `${g.color}12` : 'var(--zh-color-surface)',
                  textAlign: 'left',
                  cursor: nacaSchwere ? 'default' : 'pointer',
                  transition: 'all 0.15s', fontFamily: 'var(--zh-font)',
                  width: '100%', maxWidth: '210px',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 700, color: isActive ? g.color : 'var(--zh-color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isActive && <CheckCircle2 size={14} />}
                  {t(g.titleKey)}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', lineHeight: 1.4 }}>
                  {t(g.subKey)}
                </span>
              </button>
            )
          })}
        </div>

        {nacaSchwere && (
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', marginTop: '10px' }}>
            Wird übertragen…
          </p>
        )}
      </div>
    )
  }

  // ── PHASE D2: Unfallrisiko-Matrix ──
  function renderPhaseD2() {
    const selGruppe = NACA_GRUPPEN.find(g => g.wert === nacaSchwere)
    return (
      <div>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '3px' }}>
          {t('scoring.unfallrisiko_titel')}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', marginBottom: '14px' }}>
          Quelle: TBA-Fachkurs FK RSI, Folie 6 / SN 641 723 Abb. 2
        </p>

        {/* Bestätigte NACA-Gruppe */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {NACA_GRUPPEN.map(g => {
            const isActive = g.wert === nacaSchwere
            return (
              <div key={g.wert} style={{
                padding: '8px 14px', borderRadius: 'var(--zh-radius-btn)',
                border: isActive ? `2px solid ${g.color}` : '1px solid var(--zh-color-border)',
                background: isActive ? `${g.color}12` : 'var(--zh-color-surface)',
                opacity: isActive ? 1 : 0.4,
              }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isActive ? g.color : 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {isActive && <CheckCircle2 size={13} />}
                  {t(g.titleKey)}
                </span>
              </div>
            )
          })}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '12px' }}>
          Relevanz SD <strong style={{ color: 'var(--zh-blau)' }}>{resultLabel(relevanzSD!)}</strong> × Unfallschwere <strong style={{ color: selGruppe?.color }}>{selGruppe ? t(selGruppe.titleKey) : ''}</strong> — Schnittpunkt ergibt das Unfallrisiko:
        </p>

        <CompactMatrix
          type="unfallrisiko"
          highlightRow={relevanzSD ?? undefined}
          highlightCol={nacaSchwere ?? undefined}
          showIntersection
        />

        <div style={{ marginTop: '16px' }}>
          <ResultBadge label="RSI: Unfallrisiko" value={unfallrisiko!} />
        </div>

        <WeiterBtn label={t('scoring.resultTitle')} onClick={() => setPhase('E')} />
      </div>
    )
  }

  // ── PHASE E: Auswertung ──
  function renderPhaseE() {
    const pts    = calcScore()
    const maxPts = Math.round(STEP_WEIGHTS.reduce((s, w) => s + w, 0) * STEP_WEIGHT_UNIT)
    const finalCorrect = unfallrisiko === ca.unfallrisiko

    const decisions: { label: string; user: string; correct: string; ok: boolean }[] = [
      {
        label: t('scoring.phase_a'),
        user:    wichtigkeit  ? dimLabel(wichtigkeit)          : '—',
        correct: dimLabel(ca.wichtigkeit),
        ok:      wichtigkeit === ca.wichtigkeit,
      },
      {
        label: t('scoring.phase_b'),
        user:    abweichung   ? dimLabel(abweichung)           : '—',
        correct: dimLabel(ca.abweichung),
        ok:      abweichung === ca.abweichung,
      },
      {
        label: t('scoring.phase_c'),
        user:    relevanzSD   ? resultLabel(relevanzSD)        : '—',
        correct: resultLabel(ca.relevanzSD),
        ok:      relevanzSD === ca.relevanzSD,
      },
      {
        label: t('scoring.phase_d'),
        user:    nacaSchwere  ? nacaGruppeLabel(nacaSchwere)   : '—',
        correct: nacaGruppeLabel(ca.unfallschwere),
        ok:      nacaSchwere === ca.unfallschwere,
      },
      {
        label: t('scoring.unfallrisiko_titel'),
        user:    unfallrisiko ? resultLabel(unfallrisiko)      : '—',
        correct: resultLabel(ca.unfallrisiko),
        ok:      finalCorrect,
      },
    ]

    // Punkte pro Benutzerentscheid (Schritt 1,3,5,7,9 aus STEP_WEIGHTS)
    const entscheidungsPts = [
      Math.round(STEP_WEIGHTS[0] * STEP_WEIGHT_UNIT), // Wichtigkeit
      Math.round(STEP_WEIGHTS[2] * STEP_WEIGHT_UNIT), // Abweichung
      Math.round(STEP_WEIGHTS[4] * STEP_WEIGHT_UNIT), // Relevanz SD
      Math.round(STEP_WEIGHTS[6] * STEP_WEIGHT_UNIT), // NACA
      Math.round(STEP_WEIGHTS[8] * STEP_WEIGHT_UNIT), // Unfallrisiko
    ]
    const autoBonus = Math.round(
      (STEP_WEIGHTS[1] + STEP_WEIGHTS[3] + STEP_WEIGHTS[5] + STEP_WEIGHTS[7]) * STEP_WEIGHT_UNIT
    )
    const allCorrect = decisions.every(d => d.ok)

    return (
      <div>
        {/* Ergebnis-Vergleich oben */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {[
            { labelKey: 'scoring.deine_wahl',    value: unfallrisiko, isUser: true  },
            { labelKey: 'scoring.korrekte_wahl', value: ca.unfallrisiko, isUser: false },
          ].map(({ labelKey, value, isUser }) => (
            <div key={labelKey} style={{
              padding: '14px', borderRadius: '10px',
              background: isUser
                ? (finalCorrect ? 'rgba(26,127,31,0.08)' : 'rgba(212,0,83,0.06)')
                : 'rgba(26,127,31,0.08)',
              border: isUser
                ? (finalCorrect ? '1.5px solid #1A7F1F44' : '1.5px solid #D4005344')
                : '1.5px solid #1A7F1F44',
            }}>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--zh-color-text-muted)', marginBottom: '6px' }}>
                {t(labelKey)}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)', marginBottom: '4px' }}>
                Unfallrisiko:
              </p>
              <p style={{ fontSize: '20px', fontWeight: 900, color: resultColor(value as ResultDimension) }}>
                {resultLabel(value as ResultDimension).toUpperCase()}
              </p>
              {isUser && finalCorrect && (
                <p style={{ fontSize: '12px', fontWeight: 700, color: '#1A7F1F', marginTop: '4px' }}>
                  {t('scoring.korrekt')} ✓
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Entscheidungstabelle (5 Zeilen) */}
        <div style={{ borderRadius: '8px', border: '1px solid var(--zh-color-border)', overflow: 'hidden', marginBottom: '16px' }}>
          {decisions.map((d, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 20px',
              alignItems: 'center', gap: '8px',
              padding: '9px 14px',
              borderBottom: i < decisions.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
              background: d.ok ? 'rgba(26,127,31,0.03)' : 'rgba(212,0,83,0.03)',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--zh-color-text)' }}>{d.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: d.ok ? '#1A7F1F' : '#D40053' }}>{d.user}</span>
              <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)' }}>{!d.ok && `→ ${d.correct}`}</span>
              {d.ok
                ? <CheckCircle2 size={14} style={{ color: '#1A7F1F', flexShrink: 0 }} />
                : <XCircle     size={14} style={{ color: '#D40053', flexShrink: 0 }} />}
            </div>
          ))}
        </div>

        {/* Punktevergabe */}
        <div style={{
          padding: '16px', borderRadius: '8px',
          background: allCorrect ? 'rgba(26,127,31,0.08)' : 'rgba(0,64,124,0.05)',
          border: `1px solid ${allCorrect ? '#1A7F1F33' : 'var(--zh-color-border)'}`,
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--zh-color-text)', margin: 0 }}>
              {t('scoring.punkte_erhalten')}
            </p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: allCorrect ? '#1A7F1F' : 'var(--zh-dunkelblau)' }}>
              {pts} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--zh-color-text-muted)' }}>/ {maxPts} Pkt.</span>
            </p>
          </div>
          {allCorrect && (
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#1A7F1F', marginBottom: '10px' }}>
              {t('scoring.allCorrect')}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {decisions.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--zh-color-text-muted)' }}>{d.label}</span>
                <span style={{ fontWeight: 700, color: d.ok ? '#1A7F1F' : '#D40053' }}>
                  {d.ok ? `+${entscheidungsPts[i]}` : '0'} Pkt.
                  {!d.ok && <span style={{ fontWeight: 400, color: 'var(--zh-color-text-disabled)' }}> (falsch)</span>}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid var(--zh-color-border)' }}>
              <span style={{ color: 'var(--zh-color-text-disabled)' }}>Übertrag-Schritte (automatisch)</span>
              <span style={{ fontWeight: 700, color: '#1A7F1F' }}>+{autoBonus} Pkt.</span>
            </div>
          </div>
        </div>

        {/* Normreferenzen */}
        {deficit.normRefs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', marginBottom: '6px' }}>
              {t('scoring.normRefs')}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {deficit.normRefs.map(r => (
                <span key={r} style={{ padding: '3px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(0,118,189,0.08)', color: 'var(--zh-blau)' }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <button
          onClick={() => onComplete(pts)}
          style={{
            width: '100%', padding: '12px 20px',
            borderRadius: 'var(--zh-radius-btn)',
            background: 'var(--zh-dunkelblau)',
            color: 'white', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', border: 'none', fontFamily: 'var(--zh-font)',
          }}
        >
          {t('scoring.weiter_suchen')} →
        </button>
      </div>
    )
  }

  // ── Render ──
  function renderContent() {
    switch (phase) {
      case 'A':  return renderPhaseA()
      case 'A2': return renderPhaseA2()
      case 'B':  return renderPhaseB()
      case 'C':  return renderPhaseC()
      case 'D':  return renderPhaseD()
      case 'D2': return renderPhaseD2()
      case 'E':  return renderPhaseE()
    }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--zh-color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px 14px', borderBottom: '1px solid var(--zh-color-border)', flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', color: 'var(--zh-color-text-muted)', fontWeight: 500,
            marginBottom: '10px', cursor: 'pointer',
            background: 'none', border: 'none', padding: 0, fontFamily: 'var(--zh-font)',
          }}
        >
          <ArrowLeft size={14} /> {t('scenes.back')}
        </button>

        <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginBottom: '2px' }}>
          {ml(scene.nameI18n, lang)} · {scene.kontext === 'io' ? t('admin.innerorts') : t('admin.ausserorts')}
        </p>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '2px' }}>
          {ml(deficit.nameI18n, lang)}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginBottom: '10px' }}>
          {ml(deficit.beschreibungI18n, lang)}
        </p>

        {phase !== 'E' && <PhaseProgress phase={phase} />}
      </div>

      {/* Inhalt scrollbar */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.16 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
