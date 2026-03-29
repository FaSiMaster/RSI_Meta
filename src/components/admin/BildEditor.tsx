// BildEditor.tsx – Canvas-basierter Verortungs-Editor fuer 360°-Panoramabilder
// Ermoeglicht das Setzen von Punkt-, Polygon- und Gruppen-Verortungen fuer Defizite

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Save, Eye, EyeOff } from 'lucide-react'
import type { AppScene, AppDeficit } from '../../data/appData'
import {
  type SphericalPos,
  type DefizitVerortung,
  pixelToSpherical,
  sphericalToPixel,
} from '../../utils/sphereCoords'

// ── Typen ──
type Modus = 'idle' | 'startblick' | 'punkt' | 'polygon' | 'gruppe'

// Bekannte Texturen in public/textures/
const VERFUEGBARE_TEXTUREN = [
  'street-360.jpg',
  'sc1.webp',
  'sc2.webp',
  'sc3.webp',
  'sc4.webp',
  '5.webp',
]

interface Props {
  scene: AppScene
  deficits: AppDeficit[]
  onSave: (updatedScene: AppScene, updatedDeficits: AppDeficit[]) => void
  onClose: () => void
  initialDeficitId?: string
}

// Farbe nach Unfallrisiko
function risikoFarbe(risiko: string): string {
  if (risiko === 'hoch')   return '#D40053'
  if (risiko === 'mittel') return '#B87300'
  return '#1A7F1F'
}

// Fadenkreuz zeichnen
function drawFadenkreuz(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  const size = 14
  ctx.beginPath()
  ctx.moveTo(x - size, y)
  ctx.lineTo(x + size, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x, y + size)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, 6, 0, Math.PI * 2)
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.restore()
}

export default function BildEditor({ scene, deficits, onSave, onClose, initialDeficitId }: Props) {
  // ── State ──
  const [urlInput, setUrlInput]                 = useState<string>(scene.panoramaBildUrl ?? '')
  const [bildGeladen, setBildGeladen]           = useState<boolean>(false)
  const [bildFehler, setBildFehler]             = useState<string | null>(null)
  const [bildBreite, setBildBreite]             = useState<number>(0)
  const [bildHoehe, setBildHoehe]               = useState<number>(0)
  const [modus, setModus]                       = useState<Modus>('idle')
  const [selectedDeficitId, setSelectedDeficitId] = useState<string | null>(initialDeficitId ?? null)
  const [polygonInProgress, setPolygonInProgress] = useState<SphericalPos[]>([])
  const [toleranz, setToleranz]                 = useState<number>(15)
  const [verortungenSichtbar, setVerortungenSichtbar] = useState<boolean>(true)
  const [localScene, setLocalScene]             = useState<AppScene>({ ...scene })
  const [localDeficits, setLocalDeficits]       = useState<AppDeficit[]>(deficits.map(d => ({ ...d })))
  const [gruppeIdsSelected, setGruppeIdsSelected] = useState<string[]>([])
  const [sichtbarIds, setSichtbarIds]           = useState<Set<string>>(new Set(deficits.map(d => d.id)))

  // ── Refs ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Auto-Laden beim Mount wenn URL bekannt ──
  useEffect(() => {
    if (imgRef.current && urlInput.trim()) {
      imgRef.current.src = urlInput.trim()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bild laden ──
  const handleImgLoad = useCallback(() => {
    if (!imgRef.current) return
    setBildBreite(imgRef.current.naturalWidth)
    setBildHoehe(imgRef.current.naturalHeight)
    setBildGeladen(true)
    setBildFehler(null)
  }, [])

  const handleImgError = useCallback(() => {
    setBildGeladen(false)
    setBildFehler('Das Bild konnte nicht geladen werden. Bitte die URL prüfen.')
  }, [])

  function handleLaden() {
    if (!imgRef.current || !urlInput.trim()) return
    setBildGeladen(false)
    setBildFehler(null)
    imgRef.current.src = urlInput.trim()
  }

  // ── Canvas-Zeichnung ──
  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !bildGeladen || !img || bildBreite === 0 || bildHoehe === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas-Dimensionen responsiv setzen
    const containerWidth = containerRef.current?.clientWidth ?? 600
    canvas.width  = containerWidth
    canvas.height = Math.round(containerWidth * (bildHoehe / bildBreite))

    const cw = canvas.width
    const ch = canvas.height

    // Hintergrundbild zeichnen
    ctx.drawImage(img, 0, 0, cw, ch)

    if (!verortungenSichtbar) return

    // Startblick zeichnen
    if (localScene.startblick) {
      const { x, y } = sphericalToPixel(localScene.startblick, bildBreite, bildHoehe)
      const cx = (x / bildBreite) * cw
      const cy = (y / bildHoehe) * ch
      drawFadenkreuz(ctx, cx, cy, '#0076BD')
    }

    // Defizit-Verortungen zeichnen
    localDeficits.forEach(d => {
      if (!sichtbarIds.has(d.id)) return
      if (!d.verortung && !d.position) return

      const farbe = risikoFarbe(d.correctAssessment.unfallrisiko)
      const isSelected = d.id === selectedDeficitId

      if (d.verortung) {
        drawVerortung(ctx, d.verortung, farbe, isSelected, cw, ch)
      } else if (d.position) {
        // Fallback: alte position
        const { x, y } = sphericalToPixel(d.position, bildBreite, bildHoehe)
        const px = (x / bildBreite) * cw
        const py = (y / bildHoehe) * ch
        const tol = d.tolerance ?? 15
        const tolPx = (tol / 360) * cw

        ctx.save()
        ctx.beginPath()
        ctx.arc(px, py, 6, 0, Math.PI * 2)
        ctx.fillStyle = farbe
        ctx.fill()
        // Toleranz-Ring gestrichelt
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(px, py, tolPx, 0, Math.PI * 2)
        ctx.strokeStyle = farbe
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.6
        ctx.stroke()
        ctx.restore()
      }
    })

    // Polygon in Bearbeitung
    if (polygonInProgress.length > 0) {
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      polygonInProgress.forEach((pt, i) => {
        const { x, y } = sphericalToPixel(pt, bildBreite, bildHoehe)
        const px = (x / bildBreite) * cw
        const py = (y / bildHoehe) * ch
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      })
      ctx.stroke()
      // Punkte markieren
      polygonInProgress.forEach(pt => {
        const { x, y } = sphericalToPixel(pt, bildBreite, bildHoehe)
        const px = (x / bildBreite) * cw
        const py = (y / bildHoehe) * ch
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = 'white'
        ctx.fill()
      })
      ctx.restore()
    }

  }, [bildGeladen, bildBreite, bildHoehe, localScene, localDeficits, polygonInProgress,
      verortungenSichtbar, selectedDeficitId, sichtbarIds])

  // Hilfsfunktion: Verortung zeichnen
  function drawVerortung(
    ctx: CanvasRenderingContext2D,
    v: DefizitVerortung,
    farbe: string,
    isSelected: boolean,
    cw: number,
    ch: number,
  ) {
    ctx.save()
    if (v.typ === 'punkt') {
      const { x, y } = sphericalToPixel(v.position, bildBreite, bildHoehe)
      const px = (x / bildBreite) * cw
      const py = (y / bildHoehe) * ch
      const tolPx = (v.toleranz / 360) * cw

      ctx.beginPath()
      ctx.arc(px, py, isSelected ? 8 : 6, 0, Math.PI * 2)
      ctx.fillStyle = farbe
      ctx.fill()
      if (isSelected) {
        ctx.lineWidth = 2
        ctx.strokeStyle = 'white'
        ctx.stroke()
      }
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(px, py, tolPx, 0, Math.PI * 2)
      ctx.strokeStyle = farbe
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.6
      ctx.stroke()
    } else if (v.typ === 'polygon') {
      ctx.beginPath()
      v.punkte.forEach((pt, i) => {
        const { x, y } = sphericalToPixel(pt, bildBreite, bildHoehe)
        const px = (x / bildBreite) * cw
        const py = (y / bildHoehe) * ch
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      })
      ctx.closePath()
      ctx.fillStyle = farbe + '33'
      ctx.fill()
      ctx.strokeStyle = farbe
      ctx.lineWidth = isSelected ? 2.5 : 1.5
      ctx.stroke()
      // Eckpunkte
      v.punkte.forEach(pt => {
        const { x, y } = sphericalToPixel(pt, bildBreite, bildHoehe)
        const px = (x / bildBreite) * cw
        const py = (y / bildHoehe) * ch
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = farbe
        ctx.fill()
      })
    } else if (v.typ === 'gruppe') {
      ctx.setLineDash([8, 4])
      ctx.strokeStyle = farbe
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.7
      v.elemente.forEach(el => drawVerortung(ctx, el, farbe, false, cw, ch))
    }
    ctx.restore()
  }

  // ── Klick auf Canvas ──
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!bildGeladen || bildBreite === 0) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (bildBreite / rect.width)
    const y = (e.clientY - rect.top)  * (bildHoehe  / rect.height)
    const coord = pixelToSpherical(x, y, bildBreite, bildHoehe)

    if (modus === 'startblick') {
      setLocalScene(prev => ({ ...prev, startblick: coord }))
      setModus('idle')
    } else if (modus === 'punkt' && selectedDeficitId) {
      setLocalDeficits(prev => prev.map(d =>
        d.id === selectedDeficitId
          ? { ...d, verortung: { typ: 'punkt', position: coord, toleranz } }
          : d
      ))
      setModus('idle')
    } else if (modus === 'polygon') {
      setPolygonInProgress(prev => [...prev, coord])
    }
  }

  // ── Doppelklick → Polygon schliessen ──
  function handleCanvasDblClick() {
    if (modus === 'polygon' && polygonInProgress.length >= 3 && selectedDeficitId) {
      setLocalDeficits(prev => prev.map(d =>
        d.id === selectedDeficitId
          ? { ...d, verortung: { typ: 'polygon', punkte: polygonInProgress, toleranz } }
          : d
      ))
      setPolygonInProgress([])
      setModus('idle')
    }
  }

  // ── Gruppe erstellen ──
  function handleGruppeErstellen() {
    if (!selectedDeficitId || gruppeIdsSelected.length === 0) return
    const elemente: DefizitVerortung[] = gruppeIdsSelected
      .map(id => localDeficits.find(d => d.id === id)?.verortung)
      .filter((v): v is DefizitVerortung => v != null)

    if (elemente.length === 0) return
    setLocalDeficits(prev => prev.map(d =>
      d.id === selectedDeficitId
        ? { ...d, verortung: { typ: 'gruppe', elemente } }
        : d
    ))
    setGruppeIdsSelected([])
    setModus('idle')
  }

  // ── Sichtbarkeit eines Defizits umschalten ──
  function toggleSichtbar(id: string) {
    setSichtbarIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ── Verortungstyp-Label ──
  function verortungLabel(d: AppDeficit): string {
    if (d.verortung?.typ === 'punkt')   return 'Punkt'
    if (d.verortung?.typ === 'polygon') return 'Polygon'
    if (d.verortung?.typ === 'gruppe')  return 'Gruppe'
    if (d.position) return 'Manuell'
    return '—'
  }

  // ── Modus-Schaltflaeche Stil ──
  function modusBtnStyle(aktiv: boolean): React.CSSProperties {
    return {
      padding: '6px 12px',
      borderRadius: '6px',
      border: aktiv ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
      background: aktiv ? 'rgba(0,118,189,0.12)' : 'var(--zh-color-bg-secondary)',
      color: aktiv ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)',
      fontSize: '12px',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'var(--zh-font)',
      whiteSpace: 'nowrap' as const,
    }
  }

  // Anzahl Polygon-Punkte in Bearbeitung
  const polygonPunkte = polygonInProgress.length

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '960px', maxWidth: '98vw',
        height: '680px', maxHeight: '92vh',
        borderRadius: 'var(--zh-radius-card)',
        border: '1px solid var(--zh-color-border)',
        background: 'var(--zh-color-surface)',
        boxShadow: 'var(--zh-shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--zh-font)',
      }}>

        {/* verstecktes img-Element */}
        <img
          ref={imgRef}
          style={{ display: 'none' }}
          onLoad={handleImgLoad}
          onError={handleImgError}
          alt=""
          crossOrigin="anonymous"
        />

        {/* ── TOOLBAR ── */}
        <div style={{
          height: '52px', padding: '0 16px',
          display: 'flex', alignItems: 'center', gap: '8px',
          borderBottom: '1px solid var(--zh-color-border)',
          background: 'var(--zh-color-bg-secondary)',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* Texturen-Schnellauswahl */}
          <select
            value=""
            onChange={e => {
              const val = e.target.value
              if (!val) return
              const pfad = `/textures/${val}`
              setUrlInput(pfad)
              if (imgRef.current) { imgRef.current.src = pfad }
            }}
            style={{
              padding: '5px 8px', borderRadius: '6px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-bg-secondary)',
              color: 'var(--zh-color-text)',
              fontSize: '12px', fontFamily: 'var(--zh-font)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <option value="">Textur wählen…</option>
            {VERFUEGBARE_TEXTUREN.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* URL-Eingabe */}
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="/textures/panorama.webp oder https://..."
            style={{
              flex: 1, padding: '6px 10px', borderRadius: '6px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              color: 'var(--zh-color-text)',
              fontSize: '13px', fontFamily: 'var(--zh-font)',
              minWidth: 0,
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleLaden() }}
          />
          <button onClick={handleLaden} style={modusBtnStyle(false)}>Laden</button>

          <div style={{ width: '1px', background: 'var(--zh-color-border)', height: '28px', flexShrink: 0 }} />

          {/* Modus-Buttons */}
          <button onClick={() => setModus(modus === 'startblick' ? 'idle' : 'startblick')}
            style={modusBtnStyle(modus === 'startblick')}>
            Startblick
          </button>
          <button
            onClick={() => { if (selectedDeficitId) setModus(modus === 'punkt' ? 'idle' : 'punkt') }}
            style={{ ...modusBtnStyle(modus === 'punkt'), opacity: selectedDeficitId ? 1 : 0.4 }}
            title={selectedDeficitId ? '' : 'Zuerst ein Sicherheitsdefizit auswählen'}
          >
            Punkt
          </button>
          <button
            onClick={() => {
              if (selectedDeficitId) {
                if (modus === 'polygon') {
                  setPolygonInProgress([])
                  setModus('idle')
                } else {
                  setModus('polygon')
                }
              }
            }}
            style={{ ...modusBtnStyle(modus === 'polygon'), opacity: selectedDeficitId ? 1 : 0.4 }}
            title={selectedDeficitId ? '' : 'Zuerst ein Sicherheitsdefizit auswählen'}
          >
            {modus === 'polygon'
              ? `Polygon (${polygonPunkte} Pkt.) – Doppelklick zum Schliessen`
              : 'Polygon'}
          </button>
          <button
            onClick={() => { if (selectedDeficitId) setModus(modus === 'gruppe' ? 'idle' : 'gruppe') }}
            style={{ ...modusBtnStyle(modus === 'gruppe'), opacity: selectedDeficitId ? 1 : 0.4 }}
            title={selectedDeficitId ? '' : 'Zuerst ein Sicherheitsdefizit auswählen'}
          >
            Gruppe
          </button>

          <div style={{ width: '1px', background: 'var(--zh-color-border)', height: '28px', flexShrink: 0 }} />

          {/* Toleranzradius */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', whiteSpace: 'nowrap' }}>
              Toleranzradius: {toleranz}°
            </span>
            <input type="range" min={5} max={30} step={1} value={toleranz}
              onChange={e => setToleranz(parseInt(e.target.value))}
              style={{ width: '70px' }} />
          </div>

          {/* Einblenden/Ausblenden */}
          <button
            onClick={() => setVerortungenSichtbar(v => !v)}
            title={verortungenSichtbar ? 'Verortungen ausblenden' : 'Verortungen einblenden'}
            style={{ ...modusBtnStyle(verortungenSichtbar), padding: '6px 8px' }}
          >
            {verortungenSichtbar ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>

          {/* Schliessen */}
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: '4px', marginLeft: 'auto', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* ── HAUPTBEREICH ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Canvas-Bereich */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              overflow: 'auto',
              background: '#111',
              position: 'relative',
              cursor: modus !== 'idle' ? 'crosshair' : 'default',
            }}
          >
            {!bildGeladen && !bildFehler && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--zh-color-text-disabled)', fontSize: '13px',
              }}>
                {urlInput ? 'Panoramabild wird geladen...' : 'URL eingeben und auf «Laden» klicken.'}
              </div>
            )}
            {bildFehler && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#D40053', fontSize: '13px', padding: '24px', textAlign: 'center',
              }}>
                {bildFehler}
              </div>
            )}
            <canvas
              ref={canvasRef}
              style={{ display: bildGeladen ? 'block' : 'none', maxWidth: '100%' }}
              onClick={handleCanvasClick}
              onDoubleClick={handleCanvasDblClick}
            />

            {/* Modus-Hinweisleiste */}
            {modus !== 'idle' && (
              <div style={{
                position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,64,124,0.9)', color: 'white',
                padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                pointerEvents: 'none',
              }}>
                {modus === 'startblick' && 'Ins Bild klicken → Startblick setzen'}
                {modus === 'punkt'      && 'Ins Bild klicken → Punkt setzen'}
                {modus === 'polygon'    && 'Klicken: Punkt hinzufügen | Doppelklick: Polygon schliessen'}
                {modus === 'gruppe'     && 'Sicherheitsdefizite in der Seitenleiste auswählen, dann «Gruppe erstellen»'}
              </div>
            )}
          </div>

          {/* ── SEITENLEISTE ── */}
          <div style={{
            width: '240px', minWidth: '240px',
            borderLeft: '1px solid var(--zh-color-border)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--zh-color-border)',
              fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)',
            }}>
              Sicherheitsdefizite ({localDeficits.length})
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {localDeficits.map(d => {
                const isSelected = d.id === selectedDeficitId
                const farbe = risikoFarbe(d.correctAssessment.unfallrisiko)
                const isVisible = sichtbarIds.has(d.id)
                const vLabel = verortungLabel(d)
                const showCheckbox = modus === 'gruppe'

                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDeficitId(d.id)}
                    style={{
                      padding: '9px 14px',
                      borderBottom: '1px solid var(--zh-color-border)',
                      background: isSelected ? 'rgba(0,118,189,0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--zh-blau)' : '3px solid transparent',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                    }}
                  >
                    {showCheckbox && (
                      <input
                        type="checkbox"
                        checked={gruppeIdsSelected.includes(d.id)}
                        onChange={e => {
                          e.stopPropagation()
                          setGruppeIdsSelected(prev =>
                            e.target.checked
                              ? [...prev, d.id]
                              : prev.filter(id => id !== d.id)
                          )
                        }}
                        style={{ marginTop: '2px', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '12px', fontWeight: 600,
                        color: isSelected ? 'var(--zh-blau)' : 'var(--zh-color-text)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {d.nameI18n.de || d.id}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: farbe, flexShrink: 0,
                          display: 'inline-block',
                        }} />
                        <span style={{ fontSize: '10px', color: 'var(--zh-color-text-muted)' }}>
                          {vLabel}
                        </span>
                      </div>
                    </div>
                    {/* Sichtbarkeit umschalten */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleSichtbar(d.id) }}
                      title={isVisible ? 'Ausblenden' : 'Einblenden'}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: isVisible ? 'var(--zh-color-text-muted)' : 'var(--zh-color-text-disabled)',
                        padding: '2px', flexShrink: 0,
                      }}
                    >
                      {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Gruppe-Modus: Erstellen-Button */}
            {modus === 'gruppe' && (
              <div style={{ padding: '12px 14px', borderTop: '1px solid var(--zh-color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginBottom: '8px' }}>
                  {gruppeIdsSelected.length} Sicherheitsdefizite ausgewählt
                </div>
                <button
                  onClick={handleGruppeErstellen}
                  disabled={gruppeIdsSelected.length === 0 || !selectedDeficitId}
                  style={{
                    width: '100%', padding: '8px', borderRadius: '6px',
                    background: gruppeIdsSelected.length > 0 ? 'var(--zh-dunkelblau)' : 'var(--zh-color-bg-tertiary)',
                    color: gruppeIdsSelected.length > 0 ? 'white' : 'var(--zh-color-text-disabled)',
                    border: 'none', fontSize: '12px', fontWeight: 700,
                    cursor: gruppeIdsSelected.length > 0 ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--zh-font)',
                  }}
                >
                  Gruppe erstellen
                </button>
              </div>
            )}

            {/* Startblick-Anzeige */}
            {localScene.startblick && (
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--zh-color-border)',
                fontSize: '11px',
                color: 'var(--zh-color-text-muted)',
              }}>
                <span style={{ fontWeight: 700, color: '#0076BD' }}>Startblick:</span>{' '}
                θ={Math.round(localScene.startblick.theta)}°, φ={Math.round(localScene.startblick.phi)}°
                <button
                  onClick={() => setLocalScene(prev => ({ ...prev, startblick: null }))}
                  style={{
                    marginLeft: '8px', background: 'none', border: 'none',
                    cursor: 'pointer', color: '#D40053', fontSize: '11px',
                  }}
                >
                  Entfernen
                </button>
              </div>
            )}

            {/* Verortungs-Detailbox */}
            {selectedDeficitId && (() => {
              const d = localDeficits.find(x => x.id === selectedDeficitId)
              if (!d?.verortung) return null
              return (
                <div style={{
                  padding: '10px 14px',
                  borderTop: '1px solid var(--zh-color-border)',
                  fontSize: '11px', color: 'var(--zh-color-text-muted)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--zh-color-text)' }}>
                    Verortung
                  </div>
                  {d.verortung.typ === 'punkt' && (
                    <>
                      <div>Typ: <strong>Punkt</strong></div>
                      <div>
                        Position: θ={Math.round(d.verortung.position.theta)}°,
                        φ={Math.round(d.verortung.position.phi)}°
                      </div>
                      <div>Toleranzradius: {d.verortung.toleranz}°</div>
                    </>
                  )}
                  {d.verortung.typ === 'polygon' && (
                    <>
                      <div>Typ: <strong>Polygon</strong></div>
                      <div>Eckpunkte: {d.verortung.punkte.length}</div>
                    </>
                  )}
                  {d.verortung.typ === 'gruppe' && (
                    <>
                      <div>Typ: <strong>Gruppe</strong></div>
                      <div>Elemente: {d.verortung.elemente.length}</div>
                    </>
                  )}
                  <button
                    onClick={() => setLocalDeficits(prev => prev.map(x =>
                      x.id === d.id ? { ...x, verortung: null } : x
                    ))}
                    style={{
                      marginTop: '6px', background: 'none', border: '1px solid rgba(212,0,83,0.3)',
                      borderRadius: '4px', cursor: 'pointer', color: '#D40053',
                      fontSize: '11px', padding: '3px 8px', fontFamily: 'var(--zh-font)',
                    }}
                  >
                    Verortung löschen
                  </button>
                </div>
              )
            })()}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--zh-color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--zh-color-bg-secondary)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '12px', color: 'var(--zh-color-text-muted)' }}>
            {bildGeladen
              ? `${bildBreite.toLocaleString('de-CH')} × ${bildHoehe.toLocaleString('de-CH')} Pixel`
              : 'Kein Bild geladen'}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px', borderRadius: 'var(--zh-radius-btn)',
                border: '1px solid var(--zh-color-border)', background: 'transparent',
                color: 'var(--zh-color-text-muted)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--zh-font)',
              }}
            >
              Abbrechen
            </button>
            <button
              onClick={() => onSave(localScene, localDeficits)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 18px', borderRadius: 'var(--zh-radius-btn)',
                background: 'var(--zh-dunkelblau)', color: 'white',
                fontWeight: 700, fontSize: '13px', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--zh-font)',
              }}
            >
              <Save size={14} /> Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
