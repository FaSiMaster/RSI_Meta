// Bewertungsablauf nach der Konvention der Unfallkommission (Deutschland)
//
// Zwei Schritte statt neun, und sie sind nicht ineinander verschachtelt:
//   1. Ist der Befund ein Sicherheitsdefizit oder ein Gestaltungsbefund?
//   2. Nur bei einem Sicherheitsdefizit: wie schwer wiegt es?
//
// Die beiden Teilscores werden getrennt gezeigt und nie addiert. Wer einen
// Befund als sicherheitsrelevant erkennt, hat etwas anderes bewiesen, als wer
// ihn richtig einstuft; eine gemeinsame Zahl würde genau diesen Unterschied
// verdecken, den die Übung messen soll.
//
// ── Was hier bewusst fehlt ──────────────────────────────────────────────────
//
// Keine Kategoriepunkte. Im Schweizer Ablauf trägt die Zuordnung zur
// Defizitkategorie 25 Punkte; für die Konvention wurde kein Gegenstück
// vereinbart, und einen Wert zu erfinden wäre eine Vereinbarung, die niemand
// getroffen hat. Der Hinweisabzug gilt dagegen, weil er das Auffinden im Bild
// betrifft und nicht die Bewertung; er wird auf die Szenensumme angewendet,
// nicht auf einen der beiden Teilscores.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Minus } from 'lucide-react'
import { ml, type AppDeficit, type AppScene } from '../data/appData'
import { alsUko, type UkoBefundart } from '../data/bewertung'
import {
  bewerteUko, UKO_SCHRITT1_RICHTIG, UKO_SCHRITT2_RICHTIG,
  type UkoAntwort, type UkoErgebnis,
} from '../data/punkteUko'
import { KRITERIUM_LABELS } from '../data/kriteriumLabels'
import type { RSIDimension } from '../types'

interface Props {
  deficit: AppDeficit
  scene: AppScene
  hintAbzug?: number
  onComplete: (ergebnis: UkoErgebnis, antwort: UkoAntwort) => void
  onBack: () => void
}

const ARTEN: { wert: UkoBefundart; labelKey: string }[] = [
  { wert: 'sicherheitsdefizit', labelKey: 'verfahrenUko:artSicherheitsdefizit' },
  { wert: 'gestaltung',         labelKey: 'verfahrenUko:artGestaltung' },
]

const STUFEN: { wert: RSIDimension; labelKey: string }[] = [
  { wert: 'gross',  labelKey: 'verfahrenUko:stufeGross' },
  { wert: 'mittel', labelKey: 'verfahrenUko:stufeMittel' },
  { wert: 'klein',  labelKey: 'verfahrenUko:stufeKlein' },
]

export default function ScoringFlowUko({ deficit, scene, hintAbzug = 0, onComplete, onBack }: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  const [art, setArt] = useState<UkoBefundart | null>(null)
  const [stufe, setStufe] = useState<RSIDimension | null>(null)
  const [zeigeErgebnis, setZeigeErgebnis] = useState(false)

  const soll = alsUko(deficit.correctAssessment)

  // Trägt das Defizit keine Bewertung dieser Konvention, wird hier nichts
  // gerechnet. Der Weg dorthin ist eine Fehlzuordnung im Datensatz, nicht eine
  // Eingabe der Teilnehmerin — deshalb ein Hinweis und zurück.
  if (!soll) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--rsi-color-bg)' }}>
        <Kopf onBack={onBack} t={t} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
          <div role="alert" style={{ maxWidth: '460px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <AlertTriangle size={26} style={{ color: 'var(--rsi-orange)' }} />
            <p style={{ fontSize: '14px', color: 'var(--rsi-color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              {t('land.kein_verfahren_punkte')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const schritt2Steht = art === 'sicherheitsdefizit'
  const aktiverSchritt = !art ? 1 : (schritt2Steht && !stufe ? 2 : 0)
  const fertig = art != null && (!schritt2Steht || stufe != null)

  function abschliessen() {
    if (!art) return
    setZeigeErgebnis(true)
  }

  function weiter() {
    if (!art || !soll) return
    const antwort: UkoAntwort = { schritt1: art, schritt2: schritt2Steht ? stufe : null }
    onComplete(bewerteUko(soll, antwort), antwort)
  }

  const kriteriumLabel = KRITERIUM_LABELS[deficit.kriteriumId] ?? deficit.kriteriumId

  // ── Ergebnis ──────────────────────────────────────────────────────────────
  if (zeigeErgebnis) {
    const antwort: UkoAntwort = { schritt1: art!, schritt2: schritt2Steht ? stufe : null }
    const e = bewerteUko(soll, antwort)

    return (
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--rsi-color-bg)', display: 'flex', flexDirection: 'column' }}>
        <Kopf onBack={onBack} t={t} />

        <div style={{ padding: '20px', maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--rsi-color-text-disabled)', margin: '0 0 4px' }}>
              {t('verfahrenUko:ergebnisTitel')}
            </p>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: 0 }}>
              {ml(deficit.nameI18n, lang)}
            </h2>
          </div>

          {/* Zwei Teilscores, nebeneinander und ohne Summe */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Teilscore
              titel={t('verfahrenUko:ergebnisSchritt1')}
              korrekt={e.schritt1Korrekt}
              punkte={e.schritt1Punkte}
              max={UKO_SCHRITT1_RICHTIG}
              t={t}
            />
            <Teilscore
              titel={t('verfahrenUko:ergebnisSchritt2')}
              korrekt={e.schritt2Korrekt}
              punkte={e.schritt2Punkte}
              max={e.schritt2Korrekt === null ? 0 : UKO_SCHRITT2_RICHTIG}
              t={t}
            />
          </div>

          <p style={{ fontSize: '12px', color: 'var(--rsi-color-text-disabled)', margin: 0, lineHeight: 1.6 }}>
            {t('verfahrenUko:ergebnisGetrenntHinweis')}
            {!e.schritt1Korrekt && ' ' + t('verfahrenUko:ergebnisAbzugHinweis')}
          </p>

          {/* Musterlösung gegen die abgegebene Beurteilung */}
          <div style={{ border: '1px solid var(--rsi-color-border)', borderRadius: 'var(--rsi-radius-card)', background: 'var(--rsi-color-surface)', overflow: 'hidden' }}>
            <Zeile
              label={t('verfahrenUko:schritt1Titel')}
              ist={t(art === 'sicherheitsdefizit' ? 'verfahrenUko:artSicherheitsdefizit' : 'verfahrenUko:artGestaltung')}
              soll={t(soll.schritt1 === 'sicherheitsdefizit' ? 'verfahrenUko:artSicherheitsdefizit' : 'verfahrenUko:artGestaltung')}
              korrekt={e.schritt1Korrekt}
              t={t}
            />
            <Zeile
              label={t('verfahrenUko:schritt2Titel')}
              ist={stufeText(schritt2Steht ? stufe : null, t)}
              soll={stufeText(soll.schritt2, t)}
              korrekt={e.schritt2Korrekt}
              t={t}
              letzte
            />
          </div>

          {deficit.erklaerungI18n && ml(deficit.erklaerungI18n, lang).trim() && (
            <div style={{ padding: '12px 14px', borderRadius: 'var(--rsi-radius-card)', background: 'var(--rsi-color-bg-secondary)' }}>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', margin: '0 0 6px' }}>
                {kriteriumLabel}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)', margin: 0, lineHeight: 1.65 }}>
                {ml(deficit.erklaerungI18n, lang)}
              </p>
            </div>
          )}

          {deficit.normRefs.length > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--rsi-color-text-disabled)', margin: 0 }}>
              {deficit.normRefs.join(' · ')}
            </p>
          )}

          {hintAbzug > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--rsi-warnung)', margin: 0 }}>
              −{hintAbzug.toLocaleString('de-CH')}
            </p>
          )}

          <button
            onClick={weiter}
            style={{
              alignSelf: 'flex-start', padding: '12px 26px', borderRadius: 'var(--rsi-radius-btn)',
              background: 'var(--rsi-dunkelblau)', color: 'white', border: 'none',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--rsi-font)',
            }}
          >
            {t('scoring.weiter')}
          </button>
        </div>
      </div>
    )
  }

  // ── Ablauf ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--rsi-color-bg)', display: 'flex', flexDirection: 'column' }}>
      <Kopf onBack={onBack} t={t} />

      <div style={{ padding: '20px', maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--rsi-color-text-disabled)', margin: '0 0 4px' }}>
            {t('verfahrenUko:langname')} · {scene.kontext === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')}
          </p>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: '0 0 6px' }}>
            {ml(deficit.nameI18n, lang)}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)', margin: 0, lineHeight: 1.6 }}>
            {ml(deficit.beschreibungI18n, lang)}
          </p>
        </div>

        {/* Schritt 1 */}
        <Abschnitt
          nummer={1}
          aktiv={aktiverSchritt === 1}
          titel={t('verfahrenUko:schritt1Titel')}
          frage={t('verfahrenUko:schritt1Frage')}
          hinweis={t('verfahrenUko:schritt1Hinweis')}
          t={t}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {ARTEN.map(a => (
              <Wahlknopf
                key={a.wert}
                label={t(a.labelKey)}
                gewaehlt={art === a.wert}
                onClick={() => { setArt(a.wert); if (a.wert === 'gestaltung') setStufe(null) }}
              />
            ))}
          </div>
        </Abschnitt>

        {/* Schritt 2 — nur bei einem Sicherheitsdefizit */}
        <Abschnitt
          nummer={2}
          aktiv={aktiverSchritt === 2}
          titel={t('verfahrenUko:schritt2Titel')}
          frage={t('verfahrenUko:schritt2Frage')}
          hinweis={t('verfahrenUko:schritt2Hinweis')}
          gedimmt={art === 'gestaltung'}
          t={t}
        >
          {art === 'gestaltung' ? (
            <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-disabled)', margin: 0, fontStyle: 'italic' }}>
              {t('verfahrenUko:schritt2Entfaellt')}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {STUFEN.map(s => (
                <Wahlknopf
                  key={s.wert}
                  label={t(s.labelKey)}
                  gewaehlt={stufe === s.wert}
                  deaktiviert={art == null}
                  onClick={() => setStufe(s.wert)}
                />
              ))}
            </div>
          )}
        </Abschnitt>

        <button
          onClick={abschliessen}
          disabled={!fertig}
          style={{
            alignSelf: 'flex-start', padding: '12px 26px', borderRadius: 'var(--rsi-radius-btn)',
            background: fertig ? 'var(--rsi-dunkelblau)' : 'var(--rsi-color-bg-secondary)',
            color: fertig ? 'white' : 'var(--rsi-color-text-disabled)',
            border: 'none', fontSize: '15px', fontWeight: 700,
            cursor: fertig ? 'pointer' : 'not-allowed', fontFamily: 'var(--rsi-font)',
          }}
        >
          {t('scoring.auswerten')}
        </button>
      </div>
    </div>
  )
}

// ── Bausteine ───────────────────────────────────────────────────────────────

type TFn = (k: string, o?: Record<string, unknown>) => string

function stufeText(s: RSIDimension | null, t: TFn): string {
  if (s === 'gross')  return t('verfahrenUko:stufeGross')
  if (s === 'mittel') return t('verfahrenUko:stufeMittel')
  if (s === 'klein')  return t('verfahrenUko:stufeKlein')
  return t('verfahrenUko:keineEinstufung')
}

function Kopf({ onBack, t }: { onBack: () => void; t: TFn }) {
  return (
    <div style={{ padding: '12px 20px 10px', borderBottom: '1px solid var(--rsi-color-border)', flexShrink: 0 }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
          color: 'var(--rsi-color-text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          padding: 0, fontFamily: 'var(--rsi-font)',
        }}
      >
        <ArrowLeft size={15} /> {t('land.zurueck')}
      </button>
    </div>
  )
}

function Abschnitt({
  nummer, aktiv, titel, frage, hinweis, gedimmt = false, t, children,
}: {
  nummer: number
  aktiv: boolean
  titel: string
  frage: string
  hinweis: string
  gedimmt?: boolean
  t: TFn
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        border: `1px solid ${aktiv ? 'var(--rsi-blau)' : 'var(--rsi-color-border)'}`,
        borderRadius: 'var(--rsi-radius-card)',
        background: 'var(--rsi-color-surface)',
        padding: '16px 18px',
        opacity: gedimmt ? 0.6 : 1,
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      <div>
        <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', margin: '0 0 2px' }}>
          {t('verfahrenUko:schritteVon', { n: nummer })}
        </p>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: '0 0 4px' }}>{titel}</h3>
        <p style={{ fontSize: '13.5px', color: 'var(--rsi-color-text)', margin: 0 }}>{frage}</p>
        <p style={{ fontSize: '12px', color: 'var(--rsi-color-text-disabled)', margin: '4px 0 0', lineHeight: 1.6 }}>{hinweis}</p>
      </div>
      {children}
    </section>
  )
}

function Wahlknopf({
  label, gewaehlt, deaktiviert = false, onClick,
}: { label: string; gewaehlt: boolean; deaktiviert?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={deaktiviert}
      aria-pressed={gewaehlt}
      style={{
        padding: '12px 14px', borderRadius: 'var(--rsi-radius-btn)',
        border: `1px solid ${gewaehlt ? 'var(--rsi-blau)' : 'var(--rsi-color-border)'}`,
        background: gewaehlt ? 'color-mix(in srgb, var(--rsi-blau) 13%, transparent)' : 'var(--rsi-color-bg-secondary)',
        color: deaktiviert ? 'var(--rsi-color-text-disabled)' : 'var(--rsi-color-text)',
        fontSize: '14px', fontWeight: gewaehlt ? 700 : 600,
        cursor: deaktiviert ? 'not-allowed' : 'pointer', fontFamily: 'var(--rsi-font)',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  )
}

function Teilscore({
  titel, korrekt, punkte, max, t,
}: { titel: string; korrekt: boolean | null; punkte: number; max: number; t: TFn }) {
  const farbe = korrekt === null ? 'var(--rsi-color-text-disabled)'
    : korrekt ? 'var(--rsi-grün)' : 'var(--rsi-rot)'
  return (
    <div style={{
      border: '1px solid var(--rsi-color-border)', borderRadius: 'var(--rsi-radius-card)',
      background: 'var(--rsi-color-surface)', padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', margin: 0 }}>
        {titel}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {korrekt === null ? <Minus size={18} style={{ color: farbe }} />
          : korrekt ? <CheckCircle2 size={18} style={{ color: farbe }} />
          : <XCircle size={18} style={{ color: farbe }} />}
        <span style={{ fontSize: '18px', fontWeight: 800, color: farbe, fontVariantNumeric: 'tabular-nums' }}>
          {korrekt === null ? '–' : t('verfahrenUko:ergebnisPunkte', {
            punkte: punkte.toLocaleString('de-CH'), max: max.toLocaleString('de-CH'),
          })}
        </span>
      </div>
    </div>
  )
}

function Zeile({
  label, ist, soll, korrekt, t, letzte = false,
}: { label: string; ist: string; soll: string; korrekt: boolean | null; t: TFn; letzte?: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px',
      padding: '12px 16px',
      borderBottom: letzte ? 'none' : '1px solid var(--rsi-color-border)',
      alignItems: 'baseline',
    }}>
      <div>
        <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', margin: '0 0 3px' }}>
          {label}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-muted)', margin: 0 }}>
          {t('verfahrenUko:istLabel')}: {ist}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--rsi-color-text)', margin: 0, fontWeight: 600 }}>
          {t('verfahrenUko:sollLabel')}: {soll}
        </p>
      </div>
      {korrekt === null ? <Minus size={16} style={{ color: 'var(--rsi-color-text-disabled)' }} />
        : korrekt ? <CheckCircle2 size={16} style={{ color: 'var(--rsi-grün)' }} />
        : <XCircle size={16} style={{ color: 'var(--rsi-rot)' }} />}
    </div>
  )
}
