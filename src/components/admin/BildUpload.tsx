// BildUpload.tsx – Panoramabild-Upload-Komponente (Phase 3A)
// Unterstuetzt Datei-Upload (Drag & Drop, Datei-Dialog) und URL-Eingabe

import { useEffect, useRef, useState, useCallback } from 'react'
import { Upload } from 'lucide-react'

interface Props {
  szeneId:       string
  aktuelleUrl?:  string | null  // bestehende panoramaBildUrl (falls gesetzt)
  onBildGeladen: (bildData: string, breite: number, hoehe: number) => void
}

type Phase = 'auswahl' | 'laden' | 'vorschau' | 'fehler'

export default function BildUpload({ aktuelleUrl, onBildGeladen }: Props) {
  const [phase, setPhase]               = useState<Phase>('auswahl')
  const [fehlerText, setFehlerText]     = useState<string | null>(null)
  const [vorschauUrl, setVorschauUrl]   = useState<string | null>(null)
  const [vorschauBreite, setVorschauBreite] = useState<number>(0)
  const [vorschauHoehe, setVorschauHoehe]   = useState<number>(0)
  const [urlInput, setUrlInput]         = useState<string>('')
  const [isDragOver, setIsDragOver]     = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hilfsfunktion: Fehler anzeigen
  function zeigeError(text: string) {
    setFehlerText(text)
    setPhase('fehler')
  }

  // Hilfsfunktion: Vorschau aus Bild-URL oder Data-URL laden
  const ladeVorschau = useCallback((src: string) => {
    setPhase('laden')
    const img = new Image()
    img.onload = () => {
      setVorschauUrl(src)
      setVorschauBreite(img.naturalWidth)
      setVorschauHoehe(img.naturalHeight)
      setPhase('vorschau')
    }
    img.onerror = () => {
      setFehlerText('Das Bild konnte nicht geladen werden.')
      setPhase('fehler')
    }
    img.src = src
  }, [])

  // Bei Mount: bestehende URL als Vorschau laden
  useEffect(() => {
    if (aktuelleUrl) ladeVorschau(aktuelleUrl)
  }, [aktuelleUrl, ladeVorschau])

  // Datei-Handling (Weg 1: Drag & Drop, Weg 2: Datei-Dialog)
  function handleDatei(datei: File) {
    const erlaubteTypen = ['image/jpeg', 'image/png', 'image/webp']
    if (!erlaubteTypen.includes(datei.type)) {
      zeigeError('Dieses Dateiformat wird nicht unterstützt. Erlaubt sind JPG, PNG und WEBP.')
      return
    }
    if (datei.size > 20 * 1024 * 1024) {
      zeigeError('Das Bild ist zu gross. Maximale Dateigrösse: 20 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      ladeVorschau(dataUrl)
    }
    reader.readAsDataURL(datei)
  }

  // URL-Weg (Weg 3)
  function handleUrlLaden() {
    if (!urlInput.trim()) return
    ladeVorschau(urlInput.trim())
  }

  // Seitenverhältnis-Warnung (mehr als 10% Abweichung von 2:1)
  const seitenverhaeltnis = vorschauBreite > 0 && vorschauHoehe > 0
    ? vorschauBreite / vorschauHoehe
    : null
  const zeigeVerhaeltnisWarnung = seitenverhaeltnis !== null
    && Math.abs(seitenverhaeltnis - 2.0) / 2.0 > 0.1

  // Pixel-Anzeige im Schweizer Format
  const pixelText = vorschauBreite > 0 && vorschauHoehe > 0
    ? `${vorschauBreite.toLocaleString('de-CH')} × ${vorschauHoehe.toLocaleString('de-CH')} Pixel`
    : ''

  // Gemeinsame Stil-Variablen
  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid var(--zh-color-border)',
    background: 'var(--zh-color-bg-secondary)',
    color: 'var(--zh-color-text)',
    fontSize: '13px',
    fontFamily: 'var(--zh-font)',
  }

  const btnPrimaerStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    background: 'var(--zh-dunkelblau)',
    color: 'white',
    fontSize: '13px',
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--zh-font)',
    whiteSpace: 'nowrap',
  }

  const btnSekundaerStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    background: 'transparent',
    color: 'var(--zh-color-text-muted)',
    fontSize: '13px',
    fontWeight: 600,
    border: '1px solid var(--zh-color-border)',
    cursor: 'pointer',
    fontFamily: 'var(--zh-font)',
    whiteSpace: 'nowrap',
  }

  // ── Phase: Laden ──
  if (phase === 'laden') {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'var(--zh-color-text-disabled)',
        fontSize: '13px',
        border: '1px dashed var(--zh-color-border)',
        borderRadius: '8px',
      }}>
        Panoramabild wird geladen...
      </div>
    )
  }

  // ── Phase: Fehler ──
  if (phase === 'fehler') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          padding: '14px 16px',
          background: 'rgba(212,0,83,0.07)',
          border: '1px solid rgba(212,0,83,0.25)',
          borderRadius: '8px',
          color: '#D40053',
          fontSize: '13px',
        }}>
          {fehlerText}
        </div>
        <button
          onClick={() => { setPhase('auswahl'); setFehlerText(null) }}
          style={btnSekundaerStyle}
        >
          Anderes Bild wählen
        </button>
      </div>
    )
  }

  // ── Phase: Vorschau ──
  if (phase === 'vorschau' && vorschauUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Vorschau-Bild */}
        <div style={{
          border: '1px solid var(--zh-color-border)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxHeight: '200px',
        }}>
          <img
            src={vorschauUrl}
            alt="Vorschau"
            style={{ maxHeight: '200px', width: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Abmessungen */}
        {pixelText && (
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', margin: 0 }}>
            {pixelText}
          </p>
        )}

        {/* Seitenverhältnis-Warnung */}
        {zeigeVerhaeltnisWarnung && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(184,115,0,0.08)',
            border: '1px solid rgba(184,115,0,0.3)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#B87300',
            lineHeight: 1.5,
          }}>
            Hinweis: Panoramabilder haben üblicherweise das Seitenverhältnis 2:1 (Breite:Höhe).
            Dieses Bild weicht davon ab und könnte verzerrt dargestellt werden.
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onBildGeladen(vorschauUrl, vorschauBreite, vorschauHoehe)}
            style={btnPrimaerStyle}
          >
            Bild verwenden
          </button>
          <button
            onClick={() => {
              setPhase('auswahl')
              setVorschauUrl(null)
              setVorschauBreite(0)
              setVorschauHoehe(0)
            }}
            style={btnSekundaerStyle}
          >
            Anderes Bild wählen
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Auswahl ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Verstecktes File-Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files?.[0]) handleDatei(e.target.files[0])
        }}
      />

      {/* Dropzone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setIsDragOver(false)
          const datei = e.dataTransfer.files[0]
          if (datei) handleDatei(datei)
        }}
        style={{
          height: '180px',
          border: `2px dashed ${isDragOver ? '#0076BD' : 'var(--zh-color-border)'}`,
          borderRadius: '8px',
          background: isDragOver ? 'rgba(0,118,189,0.06)' : 'var(--zh-color-bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={32} color={isDragOver ? '#0076BD' : 'var(--zh-color-text-disabled)'} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: isDragOver ? '#0076BD' : 'var(--zh-color-text-muted)' }}>
          Panoramabild hierher ziehen
        </span>
        <span style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)' }}>
          JPG, PNG, WEBP · max. 20 MB
        </span>
      </div>

      {/* Datei-Button + URL-Zeile */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={btnPrimaerStyle}
        >
          Datei auswählen
        </button>
        <span style={{ fontSize: '12px', color: 'var(--zh-color-text-disabled)', flexShrink: 0 }}>oder</span>
        <input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder="Panorama-URL (equirectangulär) oder base64"
          onKeyDown={e => { if (e.key === 'Enter') handleUrlLaden() }}
          style={{ ...inputStyle, flex: 1, minWidth: '120px' }}
        />
        <button
          onClick={handleUrlLaden}
          style={{ ...btnSekundaerStyle, flexShrink: 0 }}
        >
          Laden
        </button>
      </div>
    </div>
  )
}
