// Wer hinter den Inhalten eines Landes steht – eine Karte für zwei Orte
//
// Angezeigt beim Themenbereich und auf dem Rückmeldebildschirm jeder Szene.
// Beide Male dieselbe Auskunft aus derselben Quelle: Wäre sie zweimal
// geschrieben, liefen die beiden Fassungen irgendwann auseinander.
//
// Ist für ein Land nichts eingetragen, schweigt die Karte nicht, sondern sagt
// es: noch nicht bestimmt, Inhalte vorläufig, keine Freigabe durch eine Stelle
// dieses Landes, nur zu Trainingszwecken. Das gilt bis zum Eintrag für jedes
// Land, auch für die Schweiz.

import { useTranslation } from 'react-i18next'
import { ShieldCheck, ShieldAlert } from 'lucide-react'
import { landName } from '../data/laender'
import { getZustaendigkeit, istLeer } from '../data/zustaendigkeit'

interface Props {
  /** Land nach ISO 3166-1 alpha-2. */
  country: string | undefined | null
  /** Kompakt: kleinere Schrift, weniger Abstand – für den Rückmeldebildschirm. */
  kompakt?: boolean
}

export default function ZustaendigkeitKarte({ country, kompakt = false }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const eintrag = getZustaendigkeit(country)
  const offen = istLeer(eintrag)
  const land = country ? landName(country, lang) : t('land.zust_gruppe_ohne')

  const zeilen: Array<{ label: string; wert: string }> = offen
    ? [
        { label: t('land.zust_organisation'), wert: t('land.zust_offen_org') },
        { label: t('land.zust_hinweis'), wert: t('land.zust_offen_hinweis') },
      ]
    : [
        { label: t('land.zust_organisation'), wert: eintrag!.organisation },
        { label: t('land.zust_grundlage'), wert: eintrag!.grundlage },
        { label: t('land.zust_stand'), wert: eintrag!.stand },
        { label: t('land.zust_hinweis'), wert: eintrag!.hinweis },
      ].filter(z => z.wert.trim() !== '')

  const rand = offen ? 'var(--rsi-orange)' : 'var(--rsi-color-border)'
  const grund = offen
    ? 'color-mix(in srgb, var(--rsi-orange) 8%, transparent)'
    : 'var(--rsi-color-bg-secondary)'

  return (
    <section
      aria-label={t('land.zust_titel')}
      style={{
        borderRadius: 'var(--rsi-radius-card)',
        border: `1px solid ${rand}`,
        background: grund,
        padding: kompakt ? '12px 14px' : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: kompakt ? '6px' : '10px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: offen ? 'var(--rsi-orange)' : 'var(--rsi-color-text-muted)', display: 'flex' }}>
          {offen ? <ShieldAlert size={kompakt ? 14 : 16} /> : <ShieldCheck size={kompakt ? 14 : 16} />}
        </span>
        <h3 style={{
          margin: 0,
          fontSize: kompakt ? '11px' : '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: offen ? 'var(--rsi-orange)' : 'var(--rsi-color-text-muted)',
        }}>
          {t('land.zust_titel')} · {land}
        </h3>
      </div>

      <dl style={{
        margin: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: kompakt ? '2px 12px' : '4px 14px',
        fontSize: kompakt ? '12px' : '13px',
        lineHeight: 1.5,
      }}>
        {zeilen.map(z => (
          <div key={z.label} style={{ display: 'contents' }}>
            <dt style={{ color: 'var(--rsi-color-text-disabled)', whiteSpace: 'nowrap' }}>{z.label}</dt>
            <dd style={{ margin: 0, color: 'var(--rsi-color-text)' }}>{z.wert}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
