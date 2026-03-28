// KlickFeedback – 2-Sekunden-Rückmeldung nach Klick in der Szene
// Varianten: kein_treffer | bereits_gefunden | kategorie_falsch | richtig

import { useEffect } from 'react'
import { CheckCircle2, Info, AlertCircle } from 'lucide-react'

export type KlickFeedbackType = 'kein_treffer' | 'bereits_gefunden' | 'kategorie_falsch' | 'richtig'

interface Props {
  type: KlickFeedbackType
  onClose: () => void
}

const CONFIGS: Record<KlickFeedbackType, {
  icon: React.ReactNode
  bg: string
  color: string
  title: string
  sub: string
  dauer: number
}> = {
  kein_treffer: {
    icon:  <Info size={18} />,
    bg:    'rgba(0,0,0,0.78)',
    color: '#F0F0F0',
    title: 'Kein Sicherheitsdefizit an dieser Stelle.',
    sub:   'Versuche es an einer anderen Stelle.',
    dauer: 2000,
  },
  bereits_gefunden: {
    icon:  <Info size={18} />,
    bg:    'rgba(0,64,124,0.88)',
    color: 'white',
    title: 'Dieses Defizit hast du bereits gefunden.',
    sub:   '',
    dauer: 2000,
  },
  kategorie_falsch: {
    icon:  <AlertCircle size={18} />,
    bg:    'rgba(184,115,0,0.92)',
    color: 'white',
    title: 'Gefunden — aber falsche Kategorie.',
    sub:   '-10% Abzug. Weiter zur RSI-Bewertung...',
    dauer: 1800,
  },
  richtig: {
    icon:  <CheckCircle2 size={18} />,
    bg:    'rgba(26,127,31,0.92)',
    color: 'white',
    title: 'Richtige Kategorie!',
    sub:   'Weiter zur RSI-Bewertung...',
    dauer: 1500,
  },
}

export default function KlickFeedback({ type, onClose }: Props) {
  const cfg = CONFIGS[type]

  useEffect(() => {
    const t = setTimeout(onClose, cfg.dauer)
    return () => clearTimeout(t)
  }, [onClose, cfg.dauer])

  return (
    <div
      style={{
        position:    'absolute',
        top:         '50%',
        left:        '50%',
        transform:   'translate(-50%, -50%)',
        background:  cfg.bg,
        color:       cfg.color,
        borderRadius:'12px',
        padding:     '16px 24px',
        maxWidth:    '400px',
        width:       '90%',
        backdropFilter: 'blur(14px)',
        display:     'flex',
        alignItems:  'flex-start',
        gap:         '12px',
        boxShadow:   '0 8px 32px rgba(0,0,0,0.5)',
        zIndex:      200,
        pointerEvents: 'none',
        fontFamily:  'var(--zh-font)',
      }}
    >
      <div style={{ flexShrink: 0, marginTop: '1px' }}>{cfg.icon}</div>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }}>{cfg.title}</p>
        {cfg.sub && <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '3px' }}>{cfg.sub}</p>}
      </div>
    </div>
  )
}
