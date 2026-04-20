// TrainingEinstieg – Szenen-Einführungsbildschirm vor dem SceneViewer
// Zeigt Breadcrumb, Kontext-Badge, Vorschaubilder, Beschreibungstext,
// Strassenmerkmale-Tabelle, Hinweis-Box und Start/Zurück-Buttons

import { Camera, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ml, type AppScene, type AppTopic } from '../data/appData'

interface Props {
  scene: AppScene
  topic: AppTopic
  onStart: () => void
  onBack: () => void
}

// Loest vorschauBild-Wert auf: 'panorama' → panoramaBildUrl, null/''/undefined → null
function resolveVorschauBild(
  val: string | null | undefined,
  panoramaUrl: string | null | undefined,
): string | null {
  if (!val) return null
  if (val === 'panorama') return panoramaUrl ?? null
  return val
}

export default function TrainingEinstieg({ scene, topic, onStart, onBack }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const kontextLabel = scene.kontext === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')
  const kontextColor = scene.kontext === 'io' ? '#0076BD' : '#1A7F1F'
  const kontextBg    = scene.kontext === 'io' ? 'rgba(0,118,189,0.1)' : 'rgba(26,127,31,0.1)'

  // Vorschaubilder: neue Felder zuerst, Fallback auf Legacy-Array
  const rawBild1 = scene.vorschauBild1 !== undefined
    ? scene.vorschauBild1
    : (scene.vorschauBilder?.[0] ?? null)
  const rawBild2 = scene.vorschauBild2 !== undefined
    ? scene.vorschauBild2
    : (scene.vorschauBilder?.[1] ?? null)

  const vorschau0 = resolveVorschauBild(rawBild1, scene.panoramaBildUrl)
  const vorschau1 = resolveVorschauBild(rawBild2, scene.panoramaBildUrl)

  // Beschreibungstext nur wenn nicht leer
  const beschreibung = scene.beschreibungI18n
    ? ml(scene.beschreibungI18n, lang).trim()
    : ''

  // D-3: Optionaler Trainer-Hinweis (Bemerkung)
  const bemerkung = scene.bemerkungI18n
    ? ml(scene.bemerkungI18n, lang).trim()
    : ''

  // Strassenmerkmale nur wenn vorhanden
  const merkmale = (scene.strassenmerkmale ?? []).filter(
    m => m.labelI18n.de.trim().length > 0 || m.wertI18n.de.trim().length > 0,
  )
  const zeigeMerkmale = merkmale.length > 0

  return (
    <div
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        width: '100%',
        padding: '32px 24px 40px',
        fontFamily: 'var(--zh-font)',
        overflowY: 'auto',
      }}
    >
      {/* Header: Breadcrumb + Kontext-Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div style={{
          fontSize: '14px',
          color: 'var(--zh-color-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--zh-color-text)' }}>
            {ml(topic.nameI18n, lang)}
          </span>
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
          flexShrink: 0,
        }}>
          {kontextLabel}
        </span>
      </div>

      {/* Vorschaubilder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '24px',
      }}>
        {[vorschau0, vorschau1].map((url, i) => (
          <div key={i} style={{
            height: '150px',
            background: 'var(--zh-color-bg-secondary)',
            border: '1px solid var(--zh-color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            {url ? (
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <>
                <Camera size={22} color="var(--zh-color-text-disabled)" />
                <span style={{
                  fontSize: '12px',
                  color: 'var(--zh-color-text-disabled)',
                  textAlign: 'center',
                  padding: '0 12px',
                }}>
                  {t('einstieg.kein_bild')}
                </span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Beschreibungstext – immer sichtbar, Platzhalter wenn leer */}
      <p style={{
        fontSize: '15px',
        lineHeight: 1.6,
        color: beschreibung.length > 0 ? 'var(--zh-color-text-muted)' : 'var(--zh-color-text-disabled)',
        fontStyle: beschreibung.length > 0 ? 'normal' : 'italic',
        marginBottom: '24px',
      }}>
        {beschreibung.length > 0 ? beschreibung : t('einstieg.kein_beschrieb')}
      </p>

      {/* D-3: Trainer-Hinweis (optional) */}
      {bemerkung.length > 0 && (
        <div
          role="note"
          style={{
            display: 'flex', gap: '12px',
            padding: '14px 16px', marginBottom: '24px',
            borderRadius: '10px',
            background: 'rgba(184,115,0,0.08)',
            border: '1px solid rgba(184,115,0,0.3)',
            color: '#8B5500', fontSize: '14px', lineHeight: 1.55,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px' }}>!</span>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0, marginBottom: '4px' }}>
              Hinweis
            </p>
            {bemerkung}
          </div>
        </div>
      )}

      {/* Strassenmerkmale-Tabelle – nur wenn Einträge vorhanden */}
      {zeigeMerkmale && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--zh-color-text-disabled)',
            marginBottom: '8px',
          }}>
            {t('einstieg.merkmale')}
          </p>
          <div style={{
            borderRadius: '8px',
            border: '1px solid var(--zh-color-border)',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--zh-color-bg-secondary)' }}>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--zh-color-text-muted)',
                    borderBottom: '1px solid var(--zh-color-border)',
                  }}>
                    {t('admin.merkmale_label')}
                  </th>
                  <th style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--zh-color-text-muted)',
                    borderBottom: '1px solid var(--zh-color-border)',
                  }}>
                    {t('admin.merkmale_wert')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {merkmale.map((m, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0
                        ? 'var(--zh-color-surface)'
                        : 'var(--zh-color-bg-secondary)',
                    }}
                  >
                    <td style={{
                      padding: '10px 16px',
                      color: 'var(--zh-color-text-muted)',
                      borderBottom: i < merkmale.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
                    }}>
                      {ml(m.labelI18n, lang)}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      color: 'var(--zh-color-text)',
                      fontWeight: 600,
                      borderBottom: i < merkmale.length - 1 ? '1px solid var(--zh-color-border)' : 'none',
                    }}>
                      {ml(m.wertI18n, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hinweis-Box (immer sichtbar) */}
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
        <p style={{
          fontSize: '14px',
          lineHeight: 1.6,
          color: 'var(--zh-color-text-muted)',
          margin: 0,
        }}>
          {t('einstieg.hinweis')}
        </p>
      </div>

      {/* Footer-Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
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
          {t('einstieg.zurück')}
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
