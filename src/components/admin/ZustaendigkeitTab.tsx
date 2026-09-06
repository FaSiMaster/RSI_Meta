// Zuständigkeiten pflegen – je Land ein Datensatz
//
// Bearbeitet werden nur Länder, für die es Themenbereiche gibt. Ein Eintrag
// für ein Land ohne Inhalte wäre eine Auskunft über nichts.
//
// Die Angaben liegen auf diesem Gerät und wandern über Ausfuhr und Einfuhr –
// das steht auch am Bildschirm, damit niemand annimmt, sie seien nach dem
// Speichern überall sichtbar.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, Check } from 'lucide-react'
import { getTopics, getTopicCountry } from '../../data/appData'
import { landName, type LandCode } from '../../data/laender'
import {
  getZustaendigkeit, saveZustaendigkeit, leereZustaendigkeit, istLeer,
  type Zustaendigkeit,
} from '../../data/zustaendigkeit'

export default function ZustaendigkeitTab() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [laender, setLaender] = useState<LandCode[]>([])
  const [gewaehlt, setGewaehlt] = useState<LandCode | null>(null)
  const [entwurf, setEntwurf] = useState<Zustaendigkeit | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  useEffect(() => {
    const themen = getTopics()
    const codes = Array.from(new Set(
      themen.filter(tp => !tp.parentTopicId).map(tp => getTopicCountry(tp.id, themen)),
    )).sort((a, b) => landName(a, lang).localeCompare(landName(b, lang), lang))
    setLaender(codes)
    setGewaehlt(prev => prev ?? codes[0] ?? null)
  }, [lang])

  useEffect(() => {
    if (!gewaehlt) { setEntwurf(null); return }
    setEntwurf(getZustaendigkeit(gewaehlt) ?? leereZustaendigkeit(gewaehlt))
    setGespeichert(false)
  }, [gewaehlt])

  function feld(name: keyof Zustaendigkeit, wert: string): void {
    setEntwurf(prev => prev ? { ...prev, [name]: wert } : prev)
    setGespeichert(false)
  }

  function speichern(): void {
    if (!entwurf) return
    saveZustaendigkeit(entwurf)
    setGespeichert(true)
  }

  const eingabeStil: React.CSSProperties = {
    width: '100%', padding: '9px 11px', borderRadius: '6px',
    border: '1px solid var(--rsi-color-border)',
    background: 'var(--rsi-color-bg-secondary)',
    color: 'var(--rsi-color-text)', fontSize: '13px', fontFamily: 'var(--rsi-font)',
  }

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--rsi-color-text)', margin: '0 0 4px' }}>
          {t('land.zust_titel')}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--rsi-color-text-muted)', margin: 0, lineHeight: 1.6 }}>
          {t('land.zust_pflege_hinweis')}
        </p>
      </div>

      {laender.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--rsi-color-text-disabled)' }}>
          {t('land.zust_kein_eintrag')}
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="zust-land" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', marginBottom: '6px' }}>
              {t('land.label')}
            </label>
            <select
              id="zust-land"
              value={gewaehlt ?? ''}
              onChange={e => setGewaehlt(e.target.value as LandCode)}
              style={eingabeStil}
            >
              {laender.map(code => {
                const eintrag = getZustaendigkeit(code)
                const marke = istLeer(eintrag) ? ` – ${t('land.zust_offen_org')}` : ''
                return <option key={code} value={code}>{landName(code, lang)}{marke}</option>
              })}
            </select>
          </div>

          {entwurf && (
            <>
              {([
                ['organisation', t('land.zust_organisation')],
                ['grundlage', t('land.zust_grundlage')],
                ['stand', t('land.zust_stand')],
              ] as const).map(([name, label]) => (
                <div key={name}>
                  <label htmlFor={`zust-${name}`} style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', marginBottom: '6px' }}>
                    {label}
                  </label>
                  <input
                    id={`zust-${name}`}
                    value={entwurf[name] as string}
                    onChange={e => feld(name, e.target.value)}
                    style={eingabeStil}
                  />
                </div>
              ))}

              <div>
                <label htmlFor="zust-hinweis" style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--rsi-color-text-disabled)', marginBottom: '6px' }}>
                  {t('land.zust_hinweis')}
                </label>
                <textarea
                  id="zust-hinweis"
                  value={entwurf.hinweis}
                  onChange={e => feld('hinweis', e.target.value)}
                  rows={3}
                  style={{ ...eingabeStil, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={speichern}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--rsi-radius-btn)', background: 'var(--rsi-dunkelblau)', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', fontFamily: 'var(--rsi-font)' }}
                >
                  <Save size={14} /> {t('admin.saveBtn')}
                </button>
                {gespeichert && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600, color: 'var(--rsi-gruen)' }}>
                    <Check size={13} /> {t('admin.saveBtn')}
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
