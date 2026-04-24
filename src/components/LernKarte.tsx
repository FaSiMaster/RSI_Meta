// LernKarte – Wird nach dem ScoringFlow-Ergebnis angezeigt
// Zeigt Norm-Kontext, Korrektheit-Feedback und optionale Erklaerung
// Design: Dark-Glass-Aesthetik wie KategoriePanel

import { CheckCircle2, XCircle, ExternalLink, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ml, type AppDeficit } from '../data/appData'
import { KRITERIUM_LABELS } from '../data/kriteriumLabels'
import type { RSIDimension, NACADimension } from '../types'

interface Props {
  deficit: AppDeficit
  kategorieRichtig: boolean
  wichtigkeitKorrekt: boolean
  abweichungKorrekt: boolean
  nacaKorrekt: boolean
  onWeiter: () => void
}

function dimLabel(v: RSIDimension): string {
  const map: Record<RSIDimension, string> = { gross: 'Gross', mittel: 'Mittel', klein: 'Klein' }
  return map[v]
}
function nacaLabel(v: NACADimension): string {
  const map: Record<NACADimension, string> = { leicht: 'Leicht', mittel: 'Mittel', schwer: 'Schwer' }
  return map[v]
}

// Kategorie-Label
const KATEGORIE_LABELS: Record<string, string> = {
  verkehrsfuehrung: 'Verkehrsführung',
  sicht:            'Sicht',
  ausruestung:      'Ausrüstung',
  zustand:          'Zustand Verkehrsfläche',
  strassenrand:     'Strassenrand',
  verkehrsablauf:   'Verkehrsablauf',
  baustelle:        'Baustelle',
}

export default function LernKarte({ deficit, kategorieRichtig, wichtigkeitKorrekt, abweichungKorrekt, nacaKorrekt, onWeiter }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language
  const ca = deficit.correctAssessment

  const feedbackRows: { label: string; korrekt: boolean; korrekterWert: string }[] = [
    { label: t('scoring.phase_a'), korrekt: wichtigkeitKorrekt, korrekterWert: dimLabel(ca.wichtigkeit) },
    { label: t('scoring.phase_b'), korrekt: abweichungKorrekt,  korrekterWert: dimLabel(ca.abweichung) },
    { label: t('scoring.phase_d'), korrekt: nacaKorrekt,        korrekterWert: nacaLabel(ca.unfallschwere) },
  ]

  const erklaerung = deficit.erklaerungI18n ? ml(deficit.erklaerungI18n, lang).trim() : ''
  const kriteriumLabel = KRITERIUM_LABELS[deficit.kriteriumId] ?? deficit.kriteriumId

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(16px)',
      borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)',
      padding: '24px 28px', width: '420px', maxWidth: '94vw',
      maxHeight: '85vh', overflowY: 'auto',
      boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 300, fontFamily: 'var(--zh-font)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <BookOpen size={18} style={{ color: 'var(--zh-blau)', flexShrink: 0 }} />
        <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          {t('lernkarte.titel')}
        </p>
      </div>

      <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
        {ml(deficit.nameI18n, lang)}
      </h3>

      {/* Badges: Kategorie + Kriterium */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {deficit.kategorie && (
          <span style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
            background: kategorieRichtig ? 'rgba(26,127,31,0.2)' : 'rgba(184,115,0,0.2)',
            color: kategorieRichtig ? 'var(--zh-gruen)' : 'var(--zh-warnung)',
            border: `1px solid ${kategorieRichtig ? 'rgba(26,127,31,0.4)' : 'rgba(184,115,0,0.4)'}`,
          }}>
            {KATEGORIE_LABELS[deficit.kategorie] ?? deficit.kategorie}
          </span>
        )}
        <span style={{
          padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
          background: 'rgba(0,118,189,0.15)', color: 'color-mix(in srgb, var(--zh-blau) 85%, transparent)',
          border: '1px solid rgba(0,118,189,0.3)',
        }}>
          {kriteriumLabel}
        </span>
      </div>

      {/* Normreferenzen */}
      {deficit.normRefs.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.40)', marginBottom: '6px' }}>
            {t('lernkarte.normreferenz')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {deficit.normRefs.map(ref => (
              <div key={ref} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ExternalLink size={11} style={{ color: 'color-mix(in srgb, var(--zh-blau) 70%, transparent)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'color-mix(in srgb, var(--zh-blau) 85%, transparent)', fontWeight: 600 }}>
                  {ref}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Korrektheit-Feedback */}
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.40)', marginBottom: '8px' }}>
          {t('lernkarte.bewertung')}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {feedbackRows.map(row => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '7px 10px', borderRadius: '6px',
              background: row.korrekt ? 'rgba(26,127,31,0.08)' : 'rgba(212,0,83,0.08)',
              border: `1px solid ${row.korrekt ? 'rgba(26,127,31,0.25)' : 'rgba(212,0,83,0.25)'}`,
            }}>
              {row.korrekt
                ? <CheckCircle2 size={14} style={{ color: 'var(--zh-gruen)', flexShrink: 0 }} />
                : <XCircle size={14} style={{ color: 'var(--zh-rot)', flexShrink: 0 }} />}
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', flex: 1 }}>
                {row.label}
              </span>
              {!row.korrekt && (
                <span style={{ fontSize: '11px', color: 'var(--zh-rot)', fontWeight: 700 }}>
                  → {row.korrekterWert}
                </span>
              )}
              {row.korrekt && (
                <span style={{ fontSize: '11px', color: 'var(--zh-gruen)', fontWeight: 700 }}>
                  {t('lernkarte.korrekt')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Erklaerungstext (optional) */}
      {erklaerung.length > 0 && (
        <div style={{
          padding: '12px 14px', borderRadius: '8px',
          background: 'rgba(0,118,189,0.08)',
          border: '1px solid rgba(0,118,189,0.2)',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'color-mix(in srgb, var(--zh-blau) 70%, transparent)', marginBottom: '6px' }}>
            {t('lernkarte.erklaerung')}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>
            {erklaerung}
          </p>
        </div>
      )}

      {/* Beschreibung des Defizits */}
      {ml(deficit.beschreibungI18n, lang).trim().length > 0 && (
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: '16px' }}>
          {ml(deficit.beschreibungI18n, lang)}
        </p>
      )}

      {/* Weiter-Button */}
      <button
        onClick={onWeiter}
        style={{
          width: '100%', padding: '12px 20px',
          borderRadius: '8px', border: 'none',
          background: 'var(--zh-blau)', color: 'white',
          fontWeight: 700, fontSize: '14px',
          cursor: 'pointer', fontFamily: 'var(--zh-font)',
        }}
      >
        {t('lernkarte.weiter')} →
      </button>
    </div>
  )
}
