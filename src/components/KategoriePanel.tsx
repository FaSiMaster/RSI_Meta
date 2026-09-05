// KategoriePanel – Floating Panel nach Klick auf die Szene
// User muss Kategorie wählen, bevor der Bewertungsflow startet

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DefizitKategorie } from '../data/appData'

interface Props {
  onSelect: (kategorie: DefizitKategorie) => void
  onCancel: () => void
}

// defKey (Review R-11): Einzeiler-Definition pro Kategorie, damit die
// überlappenden Begriffe (Sicht/Verkehrsführung/Strassenrand) abgegrenzt sind.
const KATEGORIE_KEYS: { value: DefizitKategorie; key: string; defKey: string }[] = [
  { value: 'verkehrsfuehrung', key: 'kategorie.verkehrsfuehrung', defKey: 'kategorie.def_verkehrsfuehrung' },
  { value: 'sicht',            key: 'kategorie.sicht',            defKey: 'kategorie.def_sicht'            },
  { value: 'ausruestung',      key: 'kategorie.ausruestung',      defKey: 'kategorie.def_ausruestung'      },
  { value: 'zustand',          key: 'kategorie.zustand',          defKey: 'kategorie.def_zustand'          },
  { value: 'strassenrand',     key: 'kategorie.strassenrand',     defKey: 'kategorie.def_strassenrand'     },
  { value: 'verkehrsablauf',   key: 'kategorie.verkehrsablauf',   defKey: 'kategorie.def_verkehrsablauf'   },
  { value: 'baustelle',        key: 'kategorie.baustelle',        defKey: 'kategorie.def_baustelle'        },
]

export default function KategoriePanel({ onSelect, onCancel }: Props) {
  const { t } = useTranslation()

  // ESC schliesst das Panel (WCAG 2.1.2)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      style={{
        position:       'absolute',
        top:            '50%',
        left:           '50%',
        transform:      'translate(-50%, -50%)',
        background:     'rgba(0,0,0,0.90)',
        backdropFilter: 'blur(16px)',
        borderRadius:   '14px',
        border:         '1px solid rgba(255,255,255,0.12)',
        padding:        '24px 28px',
        width:          '380px',
        maxWidth:       '92vw',
        boxShadow:      '0 16px 48px rgba(0,0,0,0.7)',
        zIndex:         300,
        fontFamily:     'var(--rsi-font)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>
            {t('kategorie.schritt_label')}
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white' }}>{t('kategorie.frage')}</h3>
        </div>
        <button
          onClick={onCancel}
          aria-label={t('admin.cancelBtn')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', padding: '2px', flexShrink: 0 }}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
        {t('kategorie.subtitle')}
      </p>

      {/* Kategorie-Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        {KATEGORIE_KEYS.map(({ value, key, defKey }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            style={{
              textAlign:   'left',
              padding:     '9px 16px',
              borderRadius:'8px',
              border:      '1px solid rgba(255,255,255,0.10)',
              background:  'rgba(255,255,255,0.05)',
              color:       'white',
              fontSize:    '14px',
              fontWeight:  600,
              cursor:      'pointer',
              fontFamily:  'var(--rsi-font)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,118,189,0.45)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,118,189,0.6)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)' }}
          >
            <span style={{ display: 'block' }}>{t(key)}</span>
            <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.50)', fontWeight: 400, marginTop: '2px' }}>
              {t(defKey)}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--rsi-font)' }}
      >
        {t('admin.cancelBtn')}
      </button>
    </div>
  )
}
