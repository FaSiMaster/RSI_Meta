// BildUpload.tsx – Panoramabild-Upload-Komponente
// Empfohlener Weg: /textures/dateiname.webp (Vercel CDN)
// Alternativ: lokale Datei als base64 (nur für kleine Test-Bilder)

import { useEffect, useRef, useState, useCallback } from 'react'
import { Upload, FolderOpen, Link } from 'lucide-react'

interface Props {
  szeneId:       string
  aktuelleUrl?:  string | null
  onBildGeladen: (bildData: string, breite: number, hoehe: number) => void
  // Maximale Breite für base64-Bilder (wird automatisch runterskaliert)
  // Default: 0 = keine Komprimierung (Panorama). Für Vorschaubilder z.B. 400
  maxBreite?:    number
}

type Phase = 'auswahl' | 'laden' | 'vorschau' | 'fehler'
type Modus = 'pfad' | 'datei'

// Bekannte Texturen in public/textures/
const VERFUEGBARE_TEXTUREN = [
  'street-360.jpg',
  'sc1.webp',
  'sc2.webp',
  'sc3.webp',
  'sc4.webp',
  '5.webp',
]

// Bild auf Canvas verkleinern und als JPEG base64 zurückgeben
function komprimiereBild(dataUrl: string, maxBreite: number): Promise<{ url: string; breite: number; hoehe: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > maxBreite) {
        h = Math.round(h * (maxBreite / w))
        w = maxBreite
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas nicht verfügbar')); return }
      ctx.drawImage(img, 0, 0, w, h)
      const url = canvas.toDataURL('image/jpeg', 0.7)
      resolve({ url, breite: w, hoehe: h })
    }
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'))
    img.src = dataUrl
  })
}

export default function BildUpload({ aktuelleUrl, onBildGeladen, maxBreite = 0 }: Props) {
  const [phase, setPhase]               = useState<Phase>('auswahl')
  const [fehlerText, setFehlerText]     = useState<string | null>(null)
  const [vorschauUrl, setVorschauUrl]   = useState<string | null>(null)
  const [vorschauBreite, setVorschauBreite] = useState<number>(0)
  const [vorschauHoehe, setVorschauHoehe]   = useState<number>(0)
  const [urlInput, setUrlInput]         = useState<string>('')
  const [isDragOver, setIsDragOver]     = useState<boolean>(false)
  const [modus, setModus]               = useState<Modus>('pfad')

  const fileInputRef = useRef<HTMLInputElement>(null)

  function zeigeError(text: string) {
    setFehlerText(text)
    setPhase('fehler')
  }

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

  useEffect(() => {
    if (aktuelleUrl) ladeVorschau(aktuelleUrl)
  }, [aktuelleUrl, ladeVorschau])

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
    reader.onload = async e => {
      const dataUrl = e.target?.result as string
      if (maxBreite > 0) {
        // Automatisch verkleinern für localStorage
        try {
          const { url } = await komprimiereBild(dataUrl, maxBreite)
          ladeVorschau(url)
        } catch {
          zeigeError('Bild konnte nicht komprimiert werden.')
        }
      } else {
        ladeVorschau(dataUrl)
      }
    }
    reader.readAsDataURL(datei)
  }

  function handleUrlLaden() {
    const val = urlInput.trim()
    if (!val) return
    ladeVorschau(val)
  }

  function handleTexturWählen(name: string) {
    const pfad = `/textures/${name}`
    setUrlInput(pfad)
    ladeVorschau(pfad)
  }

  // Seitenverhältnis-Warnung (mehr als 10% Abweichung von 2:1)
  const seitenverhältnis = vorschauBreite > 0 && vorschauHoehe > 0
    ? vorschauBreite / vorschauHoehe
    : null
  const zeigeVerhältnisWarnung = seitenverhältnis !== null
    && Math.abs(seitenverhältnis - 2.0) / 2.0 > 0.1

  const pixelText = vorschauBreite > 0 && vorschauHoehe > 0
    ? `${vorschauBreite.toLocaleString('de-CH')} × ${vorschauHoehe.toLocaleString('de-CH')} Pixel`
    : ''

  // ── Stile ──
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

  const tabStyle = (aktiv: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: aktiv ? 'none' : '1px solid var(--zh-color-border)',
    background: aktiv ? 'var(--zh-dunkelblau)' : 'transparent',
    color: aktiv ? 'white' : 'var(--zh-color-text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--zh-font)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  })

  // ── Phase: Laden ──
  if (phase === 'laden') {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px', border: '1px dashed var(--zh-color-border)', borderRadius: '8px' }}>
        Panoramabild wird geladen...
      </div>
    )
  }

  // ── Phase: Fehler ──
  if (phase === 'fehler') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ padding: '14px 16px', background: 'rgba(212,0,83,0.07)', border: '1px solid rgba(212,0,83,0.25)', borderRadius: '8px', color: '#D40053', fontSize: '13px' }}>
          {fehlerText}
        </div>
        <button onClick={() => { setPhase('auswahl'); setFehlerText(null) }} style={btnSekundaerStyle}>
          Anderes Bild wählen
        </button>
      </div>
    )
  }

  // ── Phase: Vorschau ──
  if (phase === 'vorschau' && vorschauUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ border: '1px solid var(--zh-color-border)', borderRadius: '8px', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '200px' }}>
          <img src={vorschauUrl} alt="Vorschau" style={{ maxHeight: '200px', width: '100%', objectFit: 'contain' }} />
        </div>
        {pixelText && (
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', margin: 0 }}>{pixelText}</p>
        )}
        {/* Pfad-Anzeige wenn kein base64 */}
        {!vorschauUrl.startsWith('data:') && (
          <p style={{ fontSize: '12px', color: 'var(--zh-blau)', margin: 0, fontFamily: 'monospace' }}>
            {vorschauUrl}
          </p>
        )}
        {/* base64-Info */}
        {vorschauUrl.startsWith('data:') && (
          <div style={{ padding: '10px 14px', background: maxBreite > 0 ? 'rgba(26,127,31,0.07)' : 'rgba(184,115,0,0.08)', border: `1px solid ${maxBreite > 0 ? 'rgba(26,127,31,0.3)' : 'rgba(184,115,0,0.3)'}`, borderRadius: '6px', fontSize: '12px', color: maxBreite > 0 ? '#1A7F1F' : '#B87300', lineHeight: 1.5 }}>
            {maxBreite > 0
              ? `Bild wird automatisch auf max. ${maxBreite}px Breite komprimiert (JPEG 70%).`
              : <>Lokale Datei: Nur für Tests geeignet. Für Produktion Bild in <code style={{ margin: '0 4px', fontFamily: 'monospace' }}>public/textures/</code> ablegen.</>
            }
          </div>
        )}
        {zeigeVerhältnisWarnung && (
          <div style={{ padding: '10px 14px', background: 'rgba(184,115,0,0.08)', border: '1px solid rgba(184,115,0,0.3)', borderRadius: '6px', fontSize: '12px', color: '#B87300', lineHeight: 1.5 }}>
            Hinweis: Panoramabilder haben üblicherweise das Seitenverhältnis 2:1. Dieses Bild weicht davon ab.
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => onBildGeladen(vorschauUrl, vorschauBreite, vorschauHoehe)} style={btnPrimaerStyle}>
            Bild verwenden
          </button>
          <button onClick={() => { setPhase('auswahl'); setVorschauUrl(null); setVorschauBreite(0); setVorschauHoehe(0) }} style={btnSekundaerStyle}>
            Anderes Bild wählen
          </button>
        </div>
      </div>
    )
  }

  // ── Phase: Auswahl ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Modus-Tabs */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button style={tabStyle(modus === 'pfad')} onClick={() => setModus('pfad')}>
          <Link size={11} /> Vercel-Pfad
        </button>
        <button style={tabStyle(modus === 'datei')} onClick={() => setModus('datei')}>
          <FolderOpen size={11} /> Lokale Datei
        </button>
      </div>

      {/* ── Modus: Pfad (empfohlen) ── */}
      {modus === 'pfad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Info-Banner */}
          <div style={{ padding: '10px 14px', background: 'rgba(0,118,189,0.07)', border: '1px solid rgba(0,118,189,0.2)', borderRadius: '6px', fontSize: '12px', color: 'var(--zh-color-text-muted)', lineHeight: 1.6 }}>
            Bild in <code style={{ color: 'var(--zh-blau)', fontFamily: 'monospace' }}>public/textures/</code> ablegen
            → committen → Pfad hier eingeben. Bilder sind dann auf allen Geräten verfügbar.
          </div>

          {/* Verfuegbare Texturen */}
          {VERFUEGBARE_TEXTUREN.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', marginBottom: '6px' }}>
                Verfügbar in /textures/
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {VERFUEGBARE_TEXTUREN.map(name => (
                  <button
                    key={name}
                    onClick={() => handleTexturWählen(name)}
                    style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '12px', color: 'var(--zh-blau)', cursor: 'pointer', fontFamily: 'monospace' }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* URL-Eingabe */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="/textures/mein-panorama.webp"
              onKeyDown={e => { if (e.key === 'Enter') handleUrlLaden() }}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={handleUrlLaden} style={{ ...btnPrimaerStyle }}>
              Laden
            </button>
          </div>
        </div>
      )}

      {/* ── Modus: Lokale Datei ── */}
      {modus === 'datei' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Warnung */}
          <div style={{ padding: '10px 14px', background: 'rgba(184,115,0,0.07)', border: '1px solid rgba(184,115,0,0.25)', borderRadius: '6px', fontSize: '12px', color: '#B87300', lineHeight: 1.6 }}>
            Lokale Dateien werden als base64 in localStorage gespeichert — nur für Tests geeignet.
            Für Produktion Pfad-Modus verwenden.
          </div>

          {/* Verstecktes File-Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleDatei(e.target.files[0]) }}
          />

          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => { e.preventDefault(); setIsDragOver(false); const d = e.dataTransfer.files[0]; if (d) handleDatei(d) }}
            style={{ height: '140px', border: `2px dashed ${isDragOver ? '#0076BD' : 'var(--zh-color-border)'}`, borderRadius: '8px', background: isDragOver ? 'rgba(0,118,189,0.06)' : 'var(--zh-color-bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} color={isDragOver ? '#0076BD' : 'var(--zh-color-text-disabled)'} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: isDragOver ? '#0076BD' : 'var(--zh-color-text-muted)' }}>
              Datei hierher ziehen oder klicken
            </span>
            <span style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)' }}>
              JPG, PNG, WEBP · max. 20 MB
            </span>
          </div>

          <button onClick={() => fileInputRef.current?.click()} style={btnSekundaerStyle}>
            Datei auswählen
          </button>
        </div>
      )}
    </div>
  )
}
