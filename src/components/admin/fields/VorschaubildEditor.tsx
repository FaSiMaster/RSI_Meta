// VorschaubildEditor — 3 Optionen: Kein Bild / Aus Panorama / Eigenes Bild
import BildUpload from '../BildUpload'
import type { VorschauModus } from '../utils/adminHelpers'

interface VorschaubildEditorProps {
  label: string
  value: string | null | undefined
  panoramaBildUrl: string | null | undefined
  modus: VorschauModus
  onModusChange: (m: VorschauModus) => void
  onBildGeladen: (url: string) => void
  szeneId: string
}

export function VorschaubildEditor({
  label, value, panoramaBildUrl, modus, onModusChange, onBildGeladen, szeneId,
}: VorschaubildEditorProps) {
  const hasPanorama = !!panoramaBildUrl
  // Bild-Quelle für Vorschau aufloesen
  const previewUrl = value === 'panorama'
    ? (panoramaBildUrl ?? null)
    : (value ?? null)

  const btnStyle = (aktiv: boolean, disabled = false): React.CSSProperties => ({
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: aktiv ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
    background: aktiv ? 'rgba(0,118,189,0.08)' : 'var(--zh-color-surface)',
    color: aktiv ? 'var(--zh-blau)' : disabled ? 'var(--zh-color-text-disabled)' : 'var(--zh-color-text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--zh-font)',
    opacity: disabled ? 0.55 : 1,
  })

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '11px', fontWeight: 700, color: 'var(--zh-color-text-disabled)',
        marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em',
      }}>
        {label}
      </div>

      {/* Optionen-Buttons */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => onModusChange('panorama')}
          disabled={!hasPanorama}
          style={btnStyle(modus === 'panorama', !hasPanorama)}
        >
          Aus Panorama übernehmen
        </button>
        <button
          onClick={() => onModusChange('upload')}
          style={btnStyle(modus === 'upload')}
        >
          Eigenes Bild hochladen
        </button>
        <button
          onClick={() => onModusChange('kein')}
          style={btnStyle(modus === 'kein')}
        >
          Kein Bild
        </button>
      </div>

      {/* Kein Panorama vorhanden */}
      {modus === 'panorama' && !hasPanorama && (
        <p style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', fontStyle: 'italic', marginBottom: '8px' }}>
          Zuerst ein Panoramabild für diese Szene hochladen.
        </p>
      )}

      {/* BildUpload-Komponente */}
      {modus === 'upload' && (
        <div style={{ marginBottom: '10px' }}>
          <BildUpload
            szeneId={szeneId}
            aktuelleUrl={value && value !== 'panorama' ? value : null}
            defaultRole="perspektive"
            perspektivenNr={99}
            perspektivenLabel="vorschau"
            onBildGeladen={(url) => onBildGeladen(url)}
          />
        </div>
      )}

      {/* Vorschau (80px) */}
      {previewUrl && (
        <div style={{
          height: '80px',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid var(--zh-color-border)',
          background: '#000',
          marginTop: '6px',
        }}>
          <img
            src={previewUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: value === 'panorama' ? 0.75 : 1,
            }}
          />
        </div>
      )}
    </div>
  )
}
