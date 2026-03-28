// ScoringFlow – 9-Schritt FaSi/bfu-Bewertungsflow
// TBA-Fachkurs FK RSI, V 16.09.2020 — normativ, keine Abweichungen
// Schritte 1,3,7: User-Input | 2,4,6,8: Automatisch | 5,9: Ergebnis

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Info, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { ml, type AppDeficit, type AppScene } from '../data/appData'
import {
  WICHTIGKEIT_TABLE, NORMHIERARCHIE, ABWEICHUNG_KATEGORIEN, NACA_TABLE,
  calcRelevanzSD, calcUnfallrisiko, nacaToSchwere,
  STEP_WEIGHTS, STEP_WEIGHT_UNIT, KRITERIUM_LABELS,
} from '../data/scoringEngine'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'

// ── Hilfsfunktionen ──
function resultColor(v: ResultDimension): string {
  if (v === 'hoch')   return '#D40053'
  if (v === 'mittel') return '#B87300'
  return '#1A7F1F'
}
function resultBg(v: ResultDimension): string {
  if (v === 'hoch')   return 'rgba(212,0,83,0.12)'
  if (v === 'mittel') return 'rgba(184,115,0,0.12)'
  return 'rgba(26,127,31,0.12)'
}
function dimensionLabel(v: RSIDimension | ResultDimension): string {
  const map: Record<string, string> = {
    gross: 'Gross', mittel: 'Mittel', klein: 'Klein',
    hoch: 'Hoch', gering: 'Gering',
  }
  return map[v] ?? v
}
function nacaLabel(v: NACADimension): string {
  return v === 'leicht' ? 'Leicht (0–1)' : v === 'mittel' ? 'Mittel (2–3)' : 'Schwer (4–7)'
}

// ── Relevanz-Matrix (3×3) ──
const R_ROWS: RSIDimension[] = ['gross', 'mittel', 'klein']
const R_COLS: RSIDimension[] = ['klein', 'mittel', 'gross']
const U_ROWS: ResultDimension[] = ['hoch', 'mittel', 'gering']
const U_COLS: NACADimension[] = ['leicht', 'mittel', 'schwer']

interface MatrixProps {
  type: 'relevanz' | 'unfallrisiko'
  highlightRow?: string
  highlightCol?: string
  showIntersection?: boolean
}
function Matrix({ type, highlightRow, highlightCol, showIntersection }: MatrixProps) {
  const isR = type === 'relevanz'
  const rows = isR ? R_ROWS : U_ROWS
  const cols = isR ? R_COLS : U_COLS
  const colLabel = isR ? ['Klein', 'Mittel', 'Gross'] : ['Leicht', 'Mittel', 'Schwer']
  const rowLabel = isR ? ['Gross', 'Mittel', 'Klein'] : ['Hoch', 'Mittel', 'Gering']
  const xAxisLabel = isR ? 'Abweichung' : 'Unfallschwere (NACA)'
  const yAxisLabel = isR ? 'Wichtigkeit' : 'Relevanz SD'

  function cellValue(row: string, col: string): ResultDimension {
    if (isR) return calcRelevanzSD(row as RSIDimension, col as RSIDimension)
    return calcUnfallrisiko(row as ResultDimension, col as NACADimension)
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', marginBottom: '6px', textAlign: 'center' }}>
        {xAxisLabel} →
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${cols.length}, 1fr)`, gap: '3px', minWidth: '320px' }}>
        {/* Leere Ecke + Spaltenheader */}
        <div style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)', textAlign: 'right', paddingRight: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', paddingBottom: '4px' }}>
          {yAxisLabel} ↓
        </div>
        {cols.map((col, ci) => (
          <div
            key={col}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 700,
              padding: '6px 4px',
              borderRadius: '4px',
              background: col === highlightCol ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
              color: col === highlightCol ? 'white' : 'var(--zh-color-text-muted)',
            }}
          >
            {colLabel[ci]}
          </div>
        ))}
        {/* Daten-Zeilen */}
        {rows.map((row, ri) => (
          <React.Fragment key={`row-${row}`}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '10px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                padding: '4px 10px 4px 4px',
                background: row === highlightRow ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
                color: row === highlightRow ? 'white' : 'var(--zh-color-text-muted)',
              }}
            >
              {rowLabel[ri]}
            </div>
            {cols.map(col => {
              const val = cellValue(row, col)
              const isIntersect = showIntersection && row === highlightRow && col === highlightCol
              const isRowH = row === highlightRow && !showIntersection
              const isColH = col === highlightCol && !showIntersection
              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    textAlign: 'center',
                    padding: '8px 4px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: isIntersect ? 900 : 700,
                    background: isIntersect
                      ? resultColor(val)
                      : (isRowH || isColH)
                        ? resultBg(val)
                        : 'var(--zh-color-bg-secondary)',
                    color: isIntersect ? 'white' : resultColor(val),
                    border: isIntersect ? `2px solid ${resultColor(val)}` : '1px solid var(--zh-color-border)',
                    transform: isIntersect ? 'scale(1.08)' : 'none',
                    transition: 'all 0.2s',
                    boxShadow: isIntersect ? `0 4px 16px ${resultColor(val)}44` : 'none',
                  }}
                >
                  {dimensionLabel(val)}
                </div>
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ── Auswahl-Button ──
function ChoiceBtn({ label, sub, active, onClick }: { label: string; sub?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 20px',
        borderRadius: 'var(--zh-radius-btn)',
        border: active ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
        background: active ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)',
        color: active ? 'var(--zh-color-accent)' : 'var(--zh-color-text)',
        fontWeight: active ? 700 : 500,
        fontSize: '15px',
        textAlign: 'left',
        width: '100%',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div>{label}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginTop: '4px', fontWeight: 400 }}>{sub}</div>}
    </button>
  )
}

// ── Fortschrittsbalken ──
function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ padding: '0 32px', marginBottom: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', fontWeight: 600 }}>
          Schritt {step} von 9
        </span>
        <span style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)' }}>
          {Math.round((step / 9) * 100)}%
        </span>
      </div>
      <div style={{ height: '4px', borderRadius: '2px', background: 'var(--zh-color-bg-tertiary)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: '2px',
            background: 'var(--zh-dunkelblau)',
            width: `${(step / 9) * 100}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

// ── Infobox ──
function InfoBox({ text }: { text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '8px',
        background: 'rgba(0,118,189,0.07)',
        border: '1px solid rgba(0,118,189,0.2)',
        marginTop: '16px',
        marginBottom: '8px',
      }}
    >
      <Info size={16} style={{ color: 'var(--zh-blau)', flexShrink: 0, marginTop: '1px' }} />
      <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

// ── Props + State ──
interface Props {
  deficit: AppDeficit
  scene: AppScene
  username: string
  onComplete: (score: number) => void
  onBack: () => void
}

export default function ScoringFlow({ deficit, scene, onComplete, onBack }: Omit<Props, 'username'> & { username?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.language

  const [step, setStep] = useState(1)
  const [showFeedback, setShowFeedback] = useState(false)
  const [wichtigkeit, setWichtigkeit] = useState<RSIDimension | null>(null)
  const [abweichung, setAbweichung] = useState<RSIDimension | null>(null)
  const [nacaRaw, setNacaRaw] = useState<number | null>(null)

  // Vorbelegte Wichtigkeit aus WICHTIGKEIT_TABLE
  const tableWert = WICHTIGKEIT_TABLE[deficit.kriteriumId]
  const prefillWichtigkeit: RSIDimension | null = tableWert
    ? (tableWert[deficit.kontext] as RSIDimension | '') || null
    : null

  // Abgeleitete Werte
  const nacaSchwere: NACADimension | null = nacaRaw !== null ? nacaToSchwere(nacaRaw) : null
  const relevanzSD: ResultDimension | null = wichtigkeit && abweichung ? calcRelevanzSD(wichtigkeit, abweichung) : null
  const unfallrisiko: ResultDimension | null = relevanzSD && nacaSchwere ? calcUnfallrisiko(relevanzSD, nacaSchwere) : null

  // Korrekte Antworten
  const ca = deficit.correctAssessment

  // Punkte berechnen
  function calcScore(): number {
    const correct = [
      wichtigkeit === ca.wichtigkeit,
      true, // Schritt 2 automatisch
      abweichung === ca.abweichung,
      true, // Schritt 4 automatisch
      relevanzSD === ca.relevanzSD,
      true, // Schritt 6 automatisch
      nacaSchwere === ca.unfallschwere,
      true, // Schritt 8 automatisch
      unfallrisiko === ca.unfallrisiko,
    ]
    let total = 0
    STEP_WEIGHTS.forEach((w, i) => { if (correct[i]) total += w * STEP_WEIGHT_UNIT })
    return Math.round(total)
  }

  function goNext() { setStep(s => Math.min(s + 1, 9)) }

  function handleSave() {
    const pts = calcScore()
    onComplete(pts)
  }

  // ── Step-Render ──
  function renderStep() {
    switch (step) {
      // ── Schritt 1: Wichtigkeit (User-Input) ──
      case 1: return (
        <div>
          <StepHeader nr={1} titel="Wichtigkeit des Sicherheitskriteriums" normRef="TBA-Fachkurs FK RSI, Folie 1–2" />
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', marginBottom: '6px' }}>
              Kriterium: <strong style={{ color: 'var(--zh-color-text)' }}>{KRITERIUM_LABELS[deficit.kriteriumId] ?? deficit.kriteriumId}</strong>
            </p>
            <p style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)' }}>
              Kontext: <strong style={{ color: 'var(--zh-color-text)' }}>{deficit.kontext === 'io' ? 'Innerorts (io)' : 'Ausserorts (ao)'}</strong>
            </p>
            <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginTop: '8px' }}>
              {deficit.kontext === 'io'
                ? 'Wie wichtig ist dieses Merkmal innerorts?'
                : 'Wie wichtig ist dieses Merkmal ausserorts?'}
            </p>
          </div>
          {prefillWichtigkeit && (
            <InfoBox text={`Gemaess WICHTIGKEIT_TABLE (TBA-Fachkurs): ${prefillWichtigkeit.toUpperCase()} — bitte bestaetigen oder anpassen.`} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            {(['gross', 'mittel', 'klein'] as RSIDimension[]).map(w => (
              <ChoiceBtn key={w} label={dimensionLabel(w)} active={wichtigkeit === w}
                onClick={() => { setWichtigkeit(w); setTimeout(goNext, 280) }} />
            ))}
          </div>
        </div>
      )

      // ── Schritt 2: Übertrag Wichtigkeit (automatisch) ──
      case 2: return (
        <div>
          <StepHeader nr={2} titel="Übertrag Wichtigkeit → Relevanz-Matrix" normRef="TBA-Fachkurs FK RSI, Folie 4" auto />
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '20px' }}>
            Die Wichtigkeit <strong>{dimensionLabel(wichtigkeit!)}</strong> wird auf die Y-Achse der Relevanz-Matrix übertragen.
          </p>
          <Matrix type="relevanz" highlightRow={wichtigkeit ?? undefined} />
          <WeiterBtn onClick={goNext} />
        </div>
      )

      // ── Schritt 3: Abweichung (User-Input) ──
      case 3: return (
        <div>
          <StepHeader nr={3} titel="Abweichung des Sicherheitskriteriums zur Norm" normRef="TBA-Fachkurs FK RSI, Folie 3" />
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '10px' }}>Normhierarchie — massgebende Grundlage:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {NORMHIERARCHIE.map(n => (
                <div key={n.stufe} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--zh-blau)', minWidth: '18px' }}>{n.stufe}.</span>
                  <span>{n.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ABWEICHUNG_KATEGORIEN.map(k => (
              <ChoiceBtn key={k.wert} label={`${k.label} — ${k.beschreibung}`}
                sub={k.beispiel ? `Bsp.: ${k.beispiel}` : undefined}
                active={abweichung === k.wert}
                onClick={() => { setAbweichung(k.wert); setTimeout(goNext, 280) }} />
            ))}
          </div>
        </div>
      )

      // ── Schritt 4: Übertrag Abweichung (automatisch) ──
      case 4: return (
        <div>
          <StepHeader nr={4} titel="Übertrag Abweichung → Relevanz-Matrix" normRef="TBA-Fachkurs FK RSI, Folie 4" auto />
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '20px' }}>
            Wichtigkeit <strong>{dimensionLabel(wichtigkeit!)}</strong> (Zeile) × Abweichung <strong>{dimensionLabel(abweichung!)}</strong> (Spalte) — Schnittpunkt ergibt die Relevanz SD.
          </p>
          <Matrix type="relevanz" highlightRow={wichtigkeit ?? undefined} highlightCol={abweichung ?? undefined} />
          <WeiterBtn onClick={goNext} />
        </div>
      )

      // ── Schritt 5: Relevanz SD (Ergebnis, automatisch) ──
      case 5: return (
        <div>
          <StepHeader nr={5} titel="Ergebnis Sicherheitsdefizit — RSI: Relevanz SD" normRef="TBA-Fachkurs FK RSI, Folie 4 / SN 641 723 Abb. 2" auto />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '3px 10px', borderRadius: '4px', background: '#D40053', color: 'white' }}>
              RSI: Relevanz SD
            </span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: resultColor(relevanzSD!) }}>
              {dimensionLabel(relevanzSD!)}
            </span>
          </div>
          <Matrix type="relevanz" highlightRow={wichtigkeit ?? undefined} highlightCol={abweichung ?? undefined} showIntersection />
          <InfoBox text="Die Relevanz des Sicherheitsdefizits entspricht der Eintrittswahrscheinlichkeit eines Unfalls gemaess SN 641 723 Abb. 2. Der FaSi/bfu-Lehrweg macht diesen Zusammenhang explizit sichtbar." />
          <WeiterBtn onClick={goNext} />
        </div>
      )

      // ── Schritt 6: Übertrag Relevanz SD → Unfallrisiko-Matrix (automatisch) ──
      case 6: return (
        <div>
          <StepHeader nr={6} titel="Übertrag Relevanz SD → Unfallrisiko-Matrix" normRef="TBA-Fachkurs FK RSI, Folie 6" auto />
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '20px' }}>
            Relevanz SD <strong>{dimensionLabel(relevanzSD!)}</strong> wird auf die Y-Achse der Unfallrisiko-Matrix übertragen.
          </p>
          <Matrix type="unfallrisiko" highlightRow={relevanzSD ?? undefined} />
          <WeiterBtn onClick={goNext} />
        </div>
      )

      // ── Schritt 7: NACA-Score (User-Input) ──
      case 7: return (
        <div>
          <StepHeader nr={7} titel="Potenzielle Unfallschwere (NACA-Score)" normRef="TBA-Fachkurs FK RSI, Folie 5" />
          {/* Pflicht-Leitfrage */}
          <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(0,64,124,0.07)', border: '1px solid rgba(0,64,124,0.15)', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--zh-dunkelblau)', lineHeight: 1.4 }}>
              „Stell dir vor, ein Unfall passiert genau hier — wie schwer waeren die wahrscheinlichen Verletzungen?"
            </p>
          </div>
          {/* Pflicht-Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <AlertTriangle size={13} style={{ color: 'var(--zh-orange)' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--zh-orange)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Einstiegshilfe bfu · nicht direkt in SN 641 723
            </span>
          </div>
          {/* NACA-Tabelle gruppiert */}
          {(['leicht', 'mittel', 'schwer'] as NACADimension[]).map(gruppe => {
            const entries = NACA_TABLE.filter(n => n.rsi === gruppe)
            const gruppeColor = gruppe === 'schwer' ? '#D40053' : gruppe === 'mittel' ? '#B87300' : '#1A7F1F'
            return (
              <div key={gruppe} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: gruppeColor, marginBottom: '6px' }}>
                  {gruppe.charAt(0).toUpperCase() + gruppe.slice(1)} (NACA {gruppe === 'leicht' ? '0–1' : gruppe === 'mittel' ? '2–3' : '4–7'})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {entries.map(n => (
                    <button
                      key={n.naca}
                      onClick={() => { setNacaRaw(n.naca); setTimeout(goNext, 280) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: nacaRaw === n.naca ? `2px solid ${gruppeColor}` : '1px solid var(--zh-color-border)',
                        background: nacaRaw === n.naca ? `${gruppeColor}12` : 'var(--zh-color-surface)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '18px', fontWeight: 900, color: gruppeColor, minWidth: '24px', fontFamily: 'monospace' }}>{n.naca}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--zh-color-text)', display: 'block' }}>{n.verletzung}</span>
                        <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)' }}>{n.konsequenz}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )

      // ── Schritt 8: Übertrag Unfallschwere (automatisch) ──
      case 8: return (
        <div>
          <StepHeader nr={8} titel="Übertrag Unfallschwere → Unfallrisiko-Matrix" normRef="TBA-Fachkurs FK RSI, Folie 6" auto />
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '20px' }}>
            Relevanz SD <strong>{dimensionLabel(relevanzSD!)}</strong> (Zeile) × Unfallschwere <strong>{nacaLabel(nacaSchwere!)}</strong> (Spalte) — Schnittpunkt ergibt das Unfallrisiko.
          </p>
          <Matrix type="unfallrisiko" highlightRow={relevanzSD ?? undefined} highlightCol={nacaSchwere ?? undefined} />
          <WeiterBtn onClick={() => setShowFeedback(true)} />
        </div>
      )

      // ── Schritt 9: Unfallrisiko (Ergebnis, automatisch) ──
      default: return null
    }
  }

  // ── Feedback-Screen ──
  function renderFeedback() {
    const ca = deficit.correctAssessment
    const correct = [
      wichtigkeit === ca.wichtigkeit,
      true,
      abweichung === ca.abweichung,
      true,
      relevanzSD === ca.relevanzSD,
      true,
      nacaSchwere === ca.unfallschwere,
      true,
      unfallrisiko === ca.unfallrisiko,
    ]
    const stepLabels = [
      'Wichtigkeit', 'Übertrag Wichtigkeit', 'Abweichung', 'Übertrag Abweichung',
      'Relevanz SD', 'Übertrag Relevanz SD', 'NACA-Einstufung', 'Übertrag Unfallschwere',
      'Unfallrisiko',
    ]
    const userAnswers = [
      wichtigkeit ? dimensionLabel(wichtigkeit) : '—',
      '✓ Automatisch',
      abweichung ? dimensionLabel(abweichung) : '—',
      '✓ Automatisch',
      relevanzSD ? dimensionLabel(relevanzSD) : '—',
      '✓ Automatisch',
      nacaSchwere ? nacaLabel(nacaSchwere) : '—',
      '✓ Automatisch',
      unfallrisiko ? dimensionLabel(unfallrisiko) : '—',
    ]
    const correctAnswers = [
      dimensionLabel(ca.wichtigkeit),
      '✓ Automatisch',
      dimensionLabel(ca.abweichung),
      '✓ Automatisch',
      dimensionLabel(ca.relevanzSD),
      '✓ Automatisch',
      nacaLabel(ca.unfallschwere),
      '✓ Automatisch',
      dimensionLabel(ca.unfallrisiko),
    ]
    const pts = calcScore()
    const maxPts = Math.round(STEP_WEIGHTS.reduce((s, w) => s + w, 0) * STEP_WEIGHT_UNIT)
    const allCorrect = correct.every(Boolean)

    return (
      <div>
        {/* Ergebnis-Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '3px 10px', borderRadius: '4px', background: '#D40053', color: 'white' }}>
              RSI: Unfallrisiko
            </span>
            <span style={{ fontSize: '26px', fontWeight: 900, color: resultColor(unfallrisiko!) }}>
              {dimensionLabel(unfallrisiko!)}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
            Normref: TBA-Fachkurs FK RSI, Folie 6 / SN 641 723 Abb. 2
          </p>
        </div>

        {/* Unfallrisiko-Matrix Ergebnis */}
        <div style={{ marginBottom: '24px' }}>
          <Matrix type="unfallrisiko" highlightRow={relevanzSD ?? undefined} highlightCol={nacaSchwere ?? undefined} showIntersection />
        </div>

        {/* Alle 9 Schritte */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--zh-color-text)', marginBottom: '10px' }}>Auswertung aller 9 Schritte:</p>
          <div
            style={{
              borderRadius: 'var(--zh-radius-card)',
              border: '1px solid var(--zh-color-border)',
              overflow: 'hidden',
            }}
          >
            {stepLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '24px 24px 1fr 1fr 1fr',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 16px',
                  borderBottom: i < 8 ? '1px solid var(--zh-color-border)' : 'none',
                  background: correct[i] ? 'rgba(26,127,31,0.04)' : 'rgba(212,0,83,0.04)',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', fontWeight: 700, fontFamily: 'monospace' }}>{i + 1}</span>
                {correct[i]
                  ? <CheckCircle2 size={15} style={{ color: '#1A7F1F' }} />
                  : <XCircle size={15} style={{ color: '#D40053' }} />}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--zh-color-text)' }}>{label}</span>
                <span style={{ fontSize: '12px', color: correct[i] ? '#1A7F1F' : '#D40053', fontWeight: correct[i] ? 400 : 700 }}>
                  {userAnswers[i]}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
                  {!correct[i] && `→ ${correctAnswers[i]}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Punkte */}
        <div
          style={{
            padding: '20px',
            borderRadius: 'var(--zh-radius-card)',
            background: allCorrect ? 'rgba(26,127,31,0.08)' : 'rgba(0,118,189,0.06)',
            border: `1px solid ${allCorrect ? '#1A7F1F33' : 'var(--zh-color-border)'}`,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginBottom: '4px' }}>Erzielte Punkte</p>
            <p style={{ fontSize: '28px', fontWeight: 900, color: allCorrect ? '#1A7F1F' : 'var(--zh-color-accent)' }}>
              {pts} <span style={{ fontSize: '16px', fontWeight: 500 }}>/ {maxPts} Pkt.</span>
            </p>
          </div>
          {allCorrect && (
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A7F1F' }}>Alles korrekt! 🏆</div>
          )}
        </div>

        {/* Defizit-Info */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)', marginBottom: '6px' }}>Normreferenzen</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {deficit.normRefs.map(r => (
              <span key={r} style={{ padding: '3px 9px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: 'rgba(0,118,189,0.08)', color: 'var(--zh-blau)' }}>{r}</span>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 'var(--zh-radius-btn)',
            background: 'var(--zh-dunkelblau)',
            color: 'white',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Speichern & weiter →
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--zh-color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 32px 16px', borderBottom: '1px solid var(--zh-color-border)' }}>
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--zh-color-text-muted)', fontWeight: 500, marginBottom: '12px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        >
          <ArrowLeft size={14} /> Zurück
        </button>
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', marginBottom: '3px' }}>
            {ml(scene.nameI18n, lang)} · {scene.kontext === 'io' ? 'Innerorts' : 'Ausserorts'}
          </p>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--zh-color-text)' }}>
            {ml(deficit.nameI18n, lang)}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--zh-color-text-muted)', marginTop: '3px' }}>
            {ml(deficit.beschreibungI18n, lang)}
          </p>
        </div>
        {!showFeedback && <ProgressBar step={step} />}
      </div>

      {/* Inhalt */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={showFeedback ? 'feedback' : step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            {showFeedback ? renderFeedback() : renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── Hilfs-Subkomponenten ──
function StepHeader({ nr, titel, normRef, auto }: { nr: number; titel: string; normRef: string; auto?: boolean }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{
          width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: auto ? 'var(--zh-color-bg-tertiary)' : 'var(--zh-dunkelblau)',
          color: auto ? 'var(--zh-color-text-muted)' : 'white',
          fontSize: '13px', fontWeight: 800, flexShrink: 0,
        }}>{nr}</span>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--zh-color-text)' }}>{titel}</h3>
        {auto && (
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 7px', borderRadius: '4px', background: 'var(--zh-color-bg-tertiary)', color: 'var(--zh-color-text-disabled)' }}>
            Automatisch
          </span>
        )}
      </div>
      <p style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)', paddingLeft: '38px' }}>
        Quelle: {normRef}
      </p>
    </div>
  )
}

function WeiterBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: '24px',
        padding: '12px 28px',
        borderRadius: 'var(--zh-radius-btn)',
        background: 'var(--zh-dunkelblau)',
        color: 'white',
        fontWeight: 700,
        fontSize: '14px',
        cursor: 'pointer',
        border: 'none',
      }}
    >
      Weiter →
    </button>
  )
}
