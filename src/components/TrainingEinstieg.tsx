// TrainingEinstieg – Szenen-Einführungsbildschirm vor dem SceneViewer
// Zeigt Breadcrumb, Kontext-Badge, Vorschaubilder, Erlaeuterungstext,
// Strassenmerkmale-Tabelle, Hinweis-Box und Start/Zurueck-Buttons

import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ml, type AppScene, type AppTopic, type StrassenMerkmal } from '../data/appData'

interface Props {
  scene: AppScene
  topic: AppTopic
  onStart: () => void
  onBack: () => void
}

// Platzhalter-Merkmale wenn keine vorhanden
function buildPlaceholderMerkmale(kontext: 'io' | 'ao'): StrassenMerkmal[] {
  const kontextWert: StrassenMerkmal['wertI18n'] = kontext === 'io'
    ? { de: 'Innerorts', fr: 'En localité', it: 'In zona abitata', en: 'Built-up area' }
    : { de: 'Ausserorts', fr: 'Hors localité', it: 'Fuori zona', en: 'Rural area' }

  return [
    {
      labelI18n: { de: 'Kontext', fr: 'Contexte', it: 'Contesto', en: 'Context' },
      wertI18n: kontextWert,
    },
    {
      labelI18n: { de: 'Strassentyp', fr: 'Type de route', it: 'Tipo di strada', en: 'Road type' },
      wertI18n: { de: '—', fr: '—', it: '—', en: '—' },
    },
    {
      labelI18n: { de: 'Signalisierte Geschwindigkeit', fr: 'Vitesse signalisée', it: 'Velocità segnalata', en: 'Posted speed' },
      wertI18n: { de: '—', fr: '—', it: '—', en: '—' },
    },
    {
      labelI18n: { de: 'Verkehrsmittel', fr: 'Moyens de transport', it: 'Mezzi di trasporto', en: 'Transport modes' },
      wertI18n: { de: '—', fr: '—', it: '—', en: '—' },
    },
  ]
}

export default function TrainingEinstieg({ scene, topic, onStart, onBack }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const kontextLabel = scene.kontext === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')
  const kontextColor = scene.kontext === 'io' ? '#0076BD' : '#1A7F1F'
  const kontextBg = scene.kontext === 'io' ? 'rgba(0,118,189,0.1)' : 'rgba(26,127,31,0.1)'

  const merkmale = (scene.strassenmerkmale && scene.strassenmerkmale.length > 0)
    ? scene.strassenmerkmale
    : buildPlaceholderMerkmale(scene.kontext)

  const beschreibung = scene.beschreibungI18n
    ? ml(scene.beschreibungI18n, lang)
    : ''

  const vorschau0 = scene.vorschauBilder?.[0] ?? null
  const vorschau1 = scene.vorschauBilder?.[1] ?? null

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', width: '100%', padding: '32px 24px', fontFamily: 'var(--zh-font)' }}>

      {/* Header: Breadcrumb + Kontext-Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '14px', color: 'var(--zh-color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: 'var(--zh-color-text)' }}>{ml(topic.nameI18n, lang)}</span>
          <span style={{ opacity: 0.4 }}>›</span>
          <span>{ml(scene.nameI18n, lang)}</span>
        </div>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          background: kontextBg,
          color: kontextColor,
          border: `1px solid ${kontextColor}33`,
        }}>
          {kontextLabel}
        </span>
      </div>

      {/* Vorschaubilder */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {[vorschau0, vorschau1].map((url, i) => (
          <div key={i} style={{
            height: '160px',
            background: 'var(--zh-color-bg-tertiary)',
            border: '1px solid var(--zh-color-border)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            overflow: 'hidden',
          }}>
            {url ? (
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--zh-color-text-disabled)" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', textAlign: 'center', padding: '0 12px' }}>
                  {t('einstieg.kein_bild')}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Erlaeuterungstext – immer anzeigen, Platzhalter wenn leer */}
      <p style={{ fontSize: '15px', lineHeight: 1.6, color: beschreibung ? 'var(--zh-color-text-muted)' : 'var(--zh-color-text-disabled)', fontStyle: beschreibung ? 'normal' : 'italic', marginBottom: '24px' }}>
        {beschreibung || t('einstieg.kein_beschrieb')}
      </p>

      {/* Strassenmerkmale-Tabelle */}
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-color-text-disabled)', marginBottom: '8px' }}>
          {t('einstieg.merkmale')}
        </p>
        <div style={{ borderRadius: '8px', border: '1px solid var(--zh-color-border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--zh-color-bg-secondary)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', borderBottom: '1px solid var(--zh-color-border)' }}>
                  {t('admin.merkmale_label')}
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-muted)', borderBottom: '1px solid var(--zh-color-border)' }}>
                  {t('admin.merkmale_wert')}
                </th>
              </tr>
            </thead>
            <tbody>
              {merkmale.map((m, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--zh-color-surface)' : 'var(--zh-color-bg-secondary)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--zh-color-text-muted)', borderBottom: i < merkmale.length - 1 ? '1px solid var(--zh-color-border)' : 'none' }}>
                    {ml(m.labelI18n, lang)}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--zh-color-text)', fontWeight: 600, borderBottom: i < merkmale.length - 1 ? '1px solid var(--zh-color-border)' : 'none' }}>
                    {ml(m.wertI18n, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hinweis-Box */}
      <div style={{
        display: 'flex',
        gap: '12px',
        background: 'rgba(0,118,189,0.07)',
        border: '1px solid rgba(0,118,189,0.2)',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '32px',
        alignItems: 'flex-start',
      }}>
        <Info size={18} color="var(--zh-blau)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--zh-color-text-muted)', margin: 0 }}>
          {t('einstieg.hinweis')}
        </p>
      </div>

      {/* Footer-Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--zh-radius-btn)',
            border: '1px solid var(--zh-color-border)',
            background: 'transparent',
            color: 'var(--zh-color-text-muted)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--zh-font)',
          }}
        >
          {t('einstieg.zurueck')}
        </button>
        <button
          onClick={onStart}
          style={{
            padding: '11px 28px',
            borderRadius: 'var(--zh-radius-btn)',
            background: 'var(--zh-dunkelblau)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            fontFamily: 'var(--zh-font)',
          }}
        >
          {t('einstieg.starten')} →
        </button>
      </div>
    </div>
  )
}
