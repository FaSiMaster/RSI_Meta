// KlickFeedback – 2-Sekunden-Rückmeldung nach Klick in der Szene
// Varianten: kein_treffer | bereits_gefunden | kategorie_falsch | richtig

import { useEffect } from 'react'
import { CheckCircle2, Info, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type KlickFeedbackType = 'kein_treffer' | 'bereits_gefunden' | 'kategorie_falsch' | 'richtig'

interface Props {
  type: KlickFeedbackType
  onClose: () => void
}

const CFG_STATIC: Record<KlickFeedbackType, {
  icon: React.ReactNode
  bg: string
  color: string
  titleKey: string
  subKey: string
  dauer: number
}> = {
  kein_treffer: {
    icon:     <Info size={18} />,
    bg:       'rgba(0,0,0,0.78)',
    color:    '#F0F0F0',
    titleKey: 'szene.kein_treffer',
    subKey:   'szene.kein_treffer_sub',
    dauer:    2000,
  },
  bereits_gefunden: {
    icon:     <Info size={18} />,
    bg:       'rgba(0,64,124,0.88)',
    color:    'white',
    titleKey: 'szene.bereits_gefunden',
    subKey:   '',
    dauer:    2000,
  },
  kategorie_falsch: {
    icon:     <AlertCircle size={18} />,
    bg:       'rgba(184,115,0,0.92)',
    color:    'white',
    titleKey: 'szene.kategorie_falsch',
    subKey:   'szene.kategorie_falsch_sub',
    dauer:    1800,
  },
  richtig: {
    icon:     <CheckCircle2 size={18} />,
    bg:       'rgba(26,127,31,0.92)',
    color:    'white',
    titleKey: 'szene.kategorie_richtig',
    subKey:   'szene.weiter_bewertung',
    dauer:    1500,
  },
}

export default function KlickFeedback({ type, onClose }: Props) {
  const { t } = useTranslation()
  const cfg = CFG_STATIC[type]

  useEffect(() => {
    const timer = setTimeout(onClose, cfg.dauer)
    return () => clearTimeout(timer)
  }, [onClose, cfg.dauer])

  const title = t(cfg.titleKey)
  const sub = cfg.subKey ? t(cfg.subKey) : ''

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
        <p style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }}>{title}</p>
        {sub && <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '3px' }}>{sub}</p>}
      </div>
    </div>
  )
}
