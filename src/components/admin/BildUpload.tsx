// BildUpload.tsx — Panorama-Bild-Auswahl gegen Supabase Storage
//
// Zwei Modi:
//   1. Bibliothek — listet alle Bilder im rsi-textures-Bucket auf, klicken
//      uebernimmt die Public-URL.
//   2. Hochladen — Drag&Drop oder File-Picker laedt direkt in den Bucket
//      und gibt die neue Public-URL zurueck.
//
// Es wird kein base64 mehr im localStorage gespeichert. Single Source ist
// Supabase Storage.

import { useEffect, useRef, useState, useCallback } from 'react'
import { Upload, FolderOpen, Library, Trash2, RefreshCw } from 'lucide-react'
import {
  uploadPanorama,
  listPanoramas,
  deletePanorama,
  extractStorageName,
  isStorageUrl,
  formatStorageDate,
  formatStorageSize,
  type StorageImage,
} from '../../lib/supabaseStorage'

interface Props {
  szeneId:       string
  aktuelleUrl?:  string | null
  onBildGeladen: (bildUrl: string, breite: number, hoehe: number) => void
}

type Phase = 'auswahl' | 'laden' | 'vorschau' | 'fehler'
type Modus = 'bibliothek' | 'hochladen'

export default function BildUpload({ aktuelleUrl, onBildGeladen }: Props) {
  const [phase, setPhase]                   = useState<Phase>('auswahl')
  const [modus, setModus]                   = useState<Modus>('bibliothek')
  const [fehlerText, setFehlerText]         = useState<string | null>(null)
  const [vorschauUrl, setVorschauUrl]       = useState<string | null>(null)
  const [vorschauName, setVorschauName]     = useState<string | null>(null)
  const [vorschauBreite, setVorschauBreite] = useState<number>(0)
  const [vorschauHoehe, setVorschauHoehe]   = useState<number>(0)
  const [isDragOver, setIsDragOver]         = useState<boolean>(false)
  const [bibliothek, setBibliothek]         = useState<StorageImage[]>([])
  const [bibLaedt, setBibLaedt]             = useState<boolean>(false)
  const [statusText, setStatusText]         = useState<string | null>(null)
  const [eigenerName, setEigenerName]       = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  function zeigeError(text: string) {
    setFehlerText(text)
    setPhase('fehler')
  }

  // Bibliothek laden
  const ladeBibliothek = useCallback(async () => {
    setBibLaedt(true)
    const list = await listPanoramas()
    setBibliothek(list)
    setBibLaedt(false)
  }, [])

  useEffect(() => {
    if (modus === 'bibliothek') ladeBibliothek()
  }, [modus, ladeBibliothek])

  // Vorschau laden (URL → Image-Maße ermitteln, dann Phase = vorschau)
  const ladeVorschau = useCallback((src: string, name?: string) => {
    setPhase('laden')
    const img = new Image()
    img.onload = () => {
      setVorschauUrl(src)
      setVorschauName(name ?? extractStorageName(src) ?? null)
      setVorschauBreite(img.naturalWidth)
      setVorschauHoehe(img.naturalHeight)
      setPhase('vorschau')
    }
    img.onerror = () => {
      setFehlerText('Bild konnte nicht geladen werden. URL pruefen oder neu hochladen.')
      setPhase('fehler')
    }
    img.src = src
  }, [])

  // Aktuelle URL beim Mount in Vorschau
  useEffect(() => {
    if (aktuelleUrl) ladeVorschau(aktuelleUrl)
  }, [aktuelleUrl, ladeVorschau])

  // Datei hochladen
  async function handleDatei(datei: File) {
    setPhase('laden')
    setStatusText(`Hochladen: ${datei.name} (${(datei.size / 1024 / 1024).toFixed(1)} MB) ...`)

    const result = await uploadPanorama(datei, eigenerName.trim() || undefined)
    setStatusText(null)

    if (!result.ok) {
      zeigeError(result.reason)
      return
    }

    setEigenerName('')
    // Bibliothek aktualisieren, dann in Vorschau
    await ladeBibliothek()
    ladeVorschau(result.image.url, result.image.name)
  }

  // Aus Bibliothek waehlen
  function handleBibliothekWahl(img: StorageImage) {
    ladeVorschau(img.url, img.name)
  }

  // Aus Bibliothek loeschen (mit Bestaetigung)
  async function handleBibliothekDelete(img: StorageImage) {
    if (!window.confirm(`Bild «${img.name}» dauerhaft aus dem Bucket loeschen?\n\nHinweis: Szenen die auf dieses Bild verweisen werden bilder­los.`)) return
    const r = await deletePanorama(img.name)
    if (!r.ok) {
      zeigeError(`Loeschen fehlgeschlagen: ${r.reason ?? 'unbekannt'}`)
      return
    }
    await ladeBibliothek()
  }

  // Seitenverhältnis-Warnung
  const seitenverhältnis = vorschauBreite > 0 && vorschauHoehe > 0
    ? vorschauBreite / vorschauHoehe : null
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
        {statusText ?? 'Panorama-Bild wird geladen...'}
      </div>
    )
  }

  // ── Phase: Fehler ──
  if (phase === 'fehler') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div role="alert" aria-live="polite" style={{ padding: '14px 16px', background: 'rgba(212,0,83,0.07)', border: '1px solid rgba(212,0,83,0.25)', borderRadius: '8px', color: '#D40053', fontSize: '13px' }}>
          {fehlerText}
        </div>
        <button onClick={() => { setPhase('auswahl'); setFehlerText(null) }} style={btnSekundaerStyle}>
          Anderes Bild waehlen
        </button>
      </div>
    )
  }

  // ── Phase: Vorschau ──
  if (phase === 'vorschau' && vorschauUrl) {
    const istStorage = isStorageUrl(vorschauUrl)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ border: '1px solid var(--zh-color-border)', borderRadius: '8px', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '200px' }}>
          <img src={vorschauUrl} alt="Vorschau" style={{ maxHeight: '200px', width: '100%', objectFit: 'contain' }} />
        </div>

        {pixelText && (
          <p style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)', margin: 0 }}>{pixelText}</p>
        )}

        {vorschauName && (
          <p style={{ fontSize: '12px', color: istStorage ? '#1A7F1F' : '#B87300', margin: 0, fontFamily: 'monospace' }}>
            {istStorage ? 'Supabase' : 'Extern'}: {vorschauName}
          </p>
        )}

        {!istStorage && vorschauUrl && (
          <div style={{ padding: '10px 14px', background: 'rgba(184,115,0,0.08)', border: '1px solid rgba(184,115,0,0.3)', borderRadius: '6px', fontSize: '12px', color: '#B87300', lineHeight: 1.5 }}>
            Hinweis: Diese URL liegt nicht im Supabase-Bucket. Empfehlung: ueber «Hochladen» in die Bibliothek bringen, damit alle Bilder zentral verwaltet sind.
          </div>
        )}

        {zeigeVerhältnisWarnung && (
          <div style={{ padding: '10px 14px', background: 'rgba(184,115,0,0.08)', border: '1px solid rgba(184,115,0,0.3)', borderRadius: '6px', fontSize: '12px', color: '#B87300', lineHeight: 1.5 }}>
            Hinweis: Panorama-Bilder haben ueblicherweise das Seitenverhaeltnis 2:1. Dieses Bild weicht davon ab.
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => onBildGeladen(vorschauUrl, vorschauBreite, vorschauHoehe)} style={btnPrimaerStyle}>
            Bild verwenden
          </button>
          <button
            onClick={() => { setPhase('auswahl'); setVorschauUrl(null); setVorschauName(null); setVorschauBreite(0); setVorschauHoehe(0) }}
            style={btnSekundaerStyle}
          >
            Anderes Bild waehlen
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
        <button style={tabStyle(modus === 'bibliothek')} onClick={() => setModus('bibliothek')}>
          <Library size={11} /> Bibliothek
        </button>
        <button style={tabStyle(modus === 'hochladen')} onClick={() => setModus('hochladen')}>
          <Upload size={11} /> Hochladen
        </button>
      </div>

      {/* ── Modus: Bibliothek ── */}
      {modus === 'bibliothek' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)', margin: 0 }}>
              Bilder im Supabase-Bucket {bibliothek.length > 0 && `(${bibliothek.length})`}
            </p>
            <button
              onClick={ladeBibliothek}
              disabled={bibLaedt}
              title="Bibliothek neu laden"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--zh-color-border)', background: 'var(--zh-color-bg-secondary)', fontSize: '11px', color: 'var(--zh-color-text-muted)', cursor: bibLaedt ? 'wait' : 'pointer', opacity: bibLaedt ? 0.5 : 1 }}
            >
              <RefreshCw size={10} /> Aktualisieren
            </button>
          </div>

          {bibLaedt && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--zh-color-text-disabled)', fontSize: '13px', border: '1px dashed var(--zh-color-border)', borderRadius: '8px' }}>
              Bibliothek wird geladen...
            </div>
          )}

          {!bibLaedt && bibliothek.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--zh-color-text-muted)', fontSize: '13px', border: '1px dashed var(--zh-color-border)', borderRadius: '8px', lineHeight: 1.6 }}>
              Noch keine Bilder im Bucket.<br />
              Wechsle zu <strong>Hochladen</strong>, um das erste Panorama zu speichern.
            </div>
          )}

          {!bibLaedt && bibliothek.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '320px', overflowY: 'auto', padding: '4px' }}>
              {bibliothek.map(img => (
                <div
                  key={img.name}
                  style={{
                    border: '1px solid var(--zh-color-border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--zh-color-bg-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--zh-blau)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--zh-color-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  onClick={() => handleBibliothekWahl(img)}
                  title={`${img.name}\n${formatStorageDate(img.createdAt)}\n${formatStorageSize(img.size)}`}
                >
                  <div style={{ aspectRatio: '2 / 1', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={img.url} alt={img.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--zh-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {img.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--zh-color-text-disabled)' }}>
                        {formatStorageSize(img.size)}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleBibliothekDelete(img) }}
                        title="Aus Bucket loeschen"
                        aria-label={`Bild ${img.name} loeschen`}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D40053', padding: '2px', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modus: Hochladen ── */}
      {modus === 'hochladen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          <div style={{ padding: '10px 14px', background: 'rgba(0,118,189,0.07)', border: '1px solid rgba(0,118,189,0.2)', borderRadius: '6px', fontSize: '12px', color: 'var(--zh-color-text-muted)', lineHeight: 1.6 }}>
            Datei wird direkt in den Supabase-Bucket <code style={{ color: 'var(--zh-blau)', fontFamily: 'monospace' }}>rsi-textures</code> geladen.
            Sie ist anschliessend in der <strong>Bibliothek</strong> fuer alle Szenen verfuegbar.
          </div>

          {/* Optionaler eigener Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zh-color-text-disabled)' }}>
              Eigener Datei-Name (optional)
            </label>
            <input
              value={eigenerName}
              onChange={e => setEigenerName(e.target.value)}
              placeholder="z.B. SZ_001_Hauptperspektive  (Endung wird automatisch ergaenzt)"
              style={inputStyle}
            />
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
            style={{ height: '160px', border: `2px dashed ${isDragOver ? '#0076BD' : 'var(--zh-color-border)'}`, borderRadius: '8px', background: isDragOver ? 'rgba(0,118,189,0.06)' : 'var(--zh-color-bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={28} color={isDragOver ? '#0076BD' : 'var(--zh-color-text-disabled)'} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: isDragOver ? '#0076BD' : 'var(--zh-color-text-muted)' }}>
              Datei hierher ziehen oder klicken
            </span>
            <span style={{ fontSize: '11px', color: 'var(--zh-color-text-disabled)' }}>
              JPG, PNG, WEBP · max. 25 MB · Empfohlen: 4096×2048 (2:1)
            </span>
          </div>

          <button onClick={() => fileInputRef.current?.click()} style={btnSekundaerStyle}>
            <FolderOpen size={12} style={{ display: 'inline', marginRight: '6px' }} /> Datei auswaehlen
          </button>
        </div>
      )}
    </div>
  )
}
