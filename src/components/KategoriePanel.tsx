// KategoriePanel – Floating Panel nach Klick auf die Szene
// User muss Kategorie wählen, bevor der 9-Schritt-Flow startet

import { X } from 'lucide-react'
import type { DefizitKategorie } from '../data/appData'

interface Props {
  onSelect: (kategorie: DefizitKategorie) => void
  onCancel: () => void
}

const KATEGORIEN: { value: DefizitKategorie; label: string }[] = [
  { value: 'verkehrsfuehrung', label: 'Verkehrsführung'        },
  { value: 'sicht',            label: 'Sicht'                   },
  { value: 'ausruestung',      label: 'Ausrüstung'              },
  { value: 'zustand',          label: 'Zustand Verkehrsfläche'  },
  { value: 'strassenrand',     label: 'Strassenrand'            },
  { value: 'verkehrsablauf',   label: 'Verkehrsablauf'          },
  { value: 'baustelle',        label: 'Baustelle'               },
]

export default function KategoriePanel({ onSelect, onCancel }: Props) {
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
        fontFamily:     'var(--zh-font)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>
            Schritt 0 — Kategorisierung
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white' }}>Was hast du identifiziert?</h3>
        </div>
        <button
          onClick={onCancel}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: '2px', flexShrink: 0 }}
        >
          <X size={18} />
        </button>
      </div>

      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
        Wähle die Kategorie des Sicherheitsdefizits:
      </p>

      {/* Kategorie-Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        {KATEGORIEN.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            style={{
              textAlign:   'left',
              padding:     '11px 16px',
              borderRadius:'8px',
              border:      '1px solid rgba(255,255,255,0.10)',
              background:  'rgba(255,255,255,0.05)',
              color:       'white',
              fontSize:    '14px',
              fontWeight:  600,
              cursor:      'pointer',
              fontFamily:  'var(--zh-font)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,118,189,0.45)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,118,189,0.6)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.10)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={onCancel}
        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
      >
        Abbrechen
      </button>
    </div>
  )
}
