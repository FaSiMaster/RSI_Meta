import { useEffect, useState } from 'react'
import { createXRStore } from '@react-three/xr'

type XRStoreType = ReturnType<typeof createXRStore>

interface VRButtonProps {
  store: XRStoreType
}

export function VRButton({ store }: VRButtonProps) {
  const [vrSupported, setVrSupported] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-vr')
        .then(setVrSupported)
        .catch(() => setVrSupported(false))
    } else {
      setVrSupported(false)
    }
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '2.5rem',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: '#FFFFFF',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#8899AA',
            marginBottom: '0.25rem',
          }}
        >
          Fachstelle Verkehrssicherheit · Kanton Zürich
        </p>
        <h1
          style={{
            fontSize: '1.375rem',
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.02em',
          }}
        >
          RSI VR Tool
        </h1>
        <p
          style={{
            fontSize: '0.8125rem',
            color: '#7788AA',
            marginTop: '0.25rem',
          }}
        >
          Road Safety Inspection – Immersive Strassenbeurteilung
        </p>
      </div>

      {/* VR Button */}
      <div style={{ pointerEvents: 'auto', textAlign: 'center' }}>
        <button
          onClick={() => void store.enterVR()}
          disabled={vrSupported === false}
          style={{
            padding: '0.875rem 3rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            fontFamily: 'system-ui, Arial, sans-serif',
            background: vrSupported === false ? '#333344' : '#003C71',
            color: vrSupported === false ? '#667788' : '#FFFFFF',
            border: `2px solid ${vrSupported === false ? '#445566' : '#003C71'}`,
            borderRadius: '4px',
            cursor: vrSupported === false ? 'not-allowed' : 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (vrSupported !== false) {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#005299'
            }
          }}
          onMouseLeave={(e) => {
            if (vrSupported !== false) {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#003C71'
            }
          }}
        >
          {vrSupported === null
            ? 'Prüfe VR...'
            : vrSupported
            ? 'VR-Session starten'
            : 'WebXR nicht verfügbar'}
        </button>

        <p
          style={{
            marginTop: '0.625rem',
            color: '#556677',
            fontSize: '0.6875rem',
            letterSpacing: '0.04em',
          }}
        >
          {vrSupported
            ? 'Meta Quest Browser erkannt'
            : 'Emulator: Chrome → Immersive Web Emulator aktivieren'}
        </p>
      </div>
    </div>
  )
}
