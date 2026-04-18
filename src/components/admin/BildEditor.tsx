// BildEditor.tsx – Canvas-basierter Verortungs-Editor für 360°-Panoramabilder
// Ermöglicht das Setzen von Punkt-, Polygon- und Gruppen-Verortungen für Defizite
// Unterstützt Perspektiven: pro Standort separate Verortungen

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Save, Eye, EyeOff, MapPin } from 'lucide-react'
import type { AppScene, AppDeficit } from '../../data/appData'
import {
  type SphericalPos,
  type DefizitVerortung,
  pixelToSpherical,
  sphericalToPixel,
} from '../../utils/sphereCoords'

// ── Typen ──
type Modus = 'idle' | 'startblick' | 'punkt' | 'polygon' | 'gruppe' | 'standort'

// Bekannte Texturen in public/textures/
const VERFUEGBARE_TEXTUREN = [
  'street-360.jpg',
  'sc1.webp',
  'sc2.webp',
  'sc3.webp',
  'sc4.webp',
  '5.webp',
  'cobblestone_street_night.webp',
  'modern_buildings_night.webp',
  'neuer_zollhof.webp',
  'st_peters_square_night.webp',
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

  // Perspektiven
  const perspektiven = scene.perspektiven ?? []
  const hatPerspektiven = perspektiven.length > 0
  const [aktivePerspektiveId, setAktivePerspektiveId] = useState<string | null>(null)
  const aktivePerspektive = perspektiven.find(p => p.id === aktivePerspektiveId) ?? null
  const [standortZielId, setStandortZielId] = useState<string | null>(null)
  // Navigation von einer Perspektive aus: Ziel-ID ('haupt' oder perspektiveId)
  const [navMarkerZiel, setNavMarkerZiel] = useState<string | null>(null)
  // Flag: verhindert doppeltes Laden beim Mount
  const mountedRef = useRef(false)

  // Drag & Drop State
  type DragTarget =
    | { type: 'startblick' }
    | { type: 'punkt'; deficitId: string }
    | { type: 'polygonPunkt'; deficitId: string; punktIndex: number }
    | { type: 'standort'; perspektiveId: string }
    | { type: 'navMarker'; perspektiveId: string; zielId: string }
    | { type: 'pan'; startClientX: number; startClientY: number; startPanX: number; startPanY: number }
    | null
  const [dragging, setDragging] = useState<DragTarget>(null)
  const isDragging = useRef(false)

  // ── Refs ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Zoom & Pan ──
  const [zoom, setZoom] = useState(1)
  const [pan, setPan]   = useState({ x: 0, y: 0 })

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // ── Auto-Laden beim Mount wenn URL bekannt ──
  useEffect(() => {
    if (imgRef.current && urlInput.trim()) {
      imgRef.current.src = urlInput.trim()
    }
    mountedRef.current = true
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Perspektivenwechsel: Bild laden + Modus zurücksetzen ──
  useEffect(() => {
    if (!mountedRef.current) return
    // Standort-Modus aufräumen (sonst landet der nächste Klick auf der falschen Perspektive)
    setModus('idle')
    setStandortZielId(null)
    setNavMarkerZiel(null)
    if (aktivePerspektive) {
      const url = aktivePerspektive.bildUrl
      if (url && imgRef.current) {
        setUrlInput(url)
        setBildGeladen(false)
        setBildFehler(null)
        imgRef.current.src = url
      }
    } else {
      // Zurück zum Hauptbild
      const url = scene.panoramaBildUrl ?? ''
      setUrlInput(url)
      if (url && imgRef.current) {
        setBildGeladen(false)
        setBildFehler(null)
        imgRef.current.src = url
      }
    }
  // Bewusst nur auf aktivePerspektiveId — scene.panoramaBildUrl und imgRef
  // sind stabile Referenzen über die Modal-Lebenszeit, würden sonst eine
  // Ping-Pong-Schleife auslösen.
  }, [aktivePerspektiveId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Aktive Verortung für ein Defizit holen ──
  // Bei aktiver Perspektive: NUR die perspektivenspezifische Verortung zeigen
  // KEIN Fallback auf Haupt-Verortung (sonst verwechselt man die Positionen)
  function getAktiveVerortung(d: AppDeficit): DefizitVerortung | null | undefined {
    if (aktivePerspektiveId) {
      return d.verortungen?.[aktivePerspektiveId] ?? null
    }
    return d.verortung
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

    // Clear + Zoom/Pan anwenden
    ctx.clearRect(0, 0, cw, ch)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Hintergrundbild zeichnen
    ctx.drawImage(img, 0, 0, cw, ch)

    if (!verortungenSichtbar) { ctx.restore(); return }

    // Startblick zeichnen (perspektivenabhängig)
    const aktStartblick = aktivePerspektiveId
      ? (localScene.perspektiven ?? []).find(p => p.id === aktivePerspektiveId)?.startblick
      : localScene.startblick
    if (aktStartblick) {
      const { x, y } = sphericalToPixel(aktStartblick, bildBreite, bildHoehe)
      const cx = (x / bildBreite) * cw
      const cy = (y / bildHoehe) * ch
      drawFadenkreuz(ctx, cx, cy, '#0076BD')
    }

    // Standort-/Nav-Diamant zeichnen (gemeinsame Funktion)
    function drawDiamant(pos: SphericalPos, label: string, isZiel: boolean, farbe: string) {
      if (!ctx) return
      const { x, y } = sphericalToPixel(pos, bildBreite, bildHoehe)
      const px = (x / bildBreite) * cw
      const py = (y / bildHoehe) * ch
      ctx.save()
      const r = isZiel ? 12 : 10
      ctx.beginPath()
      ctx.moveTo(px, py - r)
      ctx.lineTo(px + r, py)
      ctx.lineTo(px, py + r)
      ctx.lineTo(px - r, py)
      ctx.closePath()
      ctx.fillStyle = farbe
      ctx.fill()
      ctx.strokeStyle = isZiel ? '#F0A500' : 'white'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.font = 'bold 11px sans-serif'
      ctx.fillStyle = 'white'
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'
      ctx.lineWidth = 3
      ctx.textAlign = 'left'
      ctx.strokeText(label, px + r + 6, py + 4)
      ctx.fillText(label, px + r + 6, py + 4)
      ctx.restore()
    }

    // Standort-Positionen zeichnen (nur im Haupt-Panorama)
    if (!aktivePerspektiveId) {
      (localScene.perspektiven ?? []).forEach((p, i) => {
        if (!p.standortPosition) return
        drawDiamant(p.standortPosition, p.label || `Standort ${i + 1}`, p.id === standortZielId, '#0076BD')
      })
    }

    // NavMarker zeichnen (wenn auf einer Perspektive: Marker zu anderen Standorten)
    if (aktivePerspektiveId) {
      const aktPersp = (localScene.perspektiven ?? []).find(p => p.id === aktivePerspektiveId)
      const markers = aktPersp?.navMarker ?? {}
      Object.entries(markers).forEach(([zielId, pos]) => {
        const zielPersp = (localScene.perspektiven ?? []).find(p => p.id === zielId)
        const label = zielId === 'haupt' ? 'Haupt-Panorama' : (zielPersp?.label || zielId)
        drawDiamant(pos, label, zielId === navMarkerZiel, zielId === 'haupt' ? '#00407C' : '#0076BD')
      })
    }

    // Defizit-Verortungen zeichnen (perspektivenabhängig)
    localDeficits.forEach(d => {
      if (!sichtbarIds.has(d.id)) return

      const verortung = getAktiveVerortung(d)
      if (!verortung && !d.position) return

      const farbe = risikoFarbe(d.correctAssessment.unfallrisiko)
      const isSelected = d.id === selectedDeficitId

      if (verortung) {
        drawVerortung(ctx, verortung, farbe, isSelected, cw, ch)
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

    // Zoom/Pan-Transform beenden
    ctx.restore()

  }, [bildGeladen, bildBreite, bildHoehe, localScene, localDeficits, polygonInProgress,
      verortungenSichtbar, selectedDeficitId, sichtbarIds, aktivePerspektiveId, standortZielId, navMarkerZiel,
      zoom, pan]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Maus-Position → sphärische Koordinaten ──
  function mouseToCoord(e: React.MouseEvent<HTMLCanvasElement>): SphericalPos | null {
    if (!bildGeladen || bildBreite === 0) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    // Maus im Canvas-Pixel-Raum
    const cx = (e.clientX - rect.left) * (canvas.width  / rect.width)
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height)
    // Zoom/Pan rückrechnen → Canvas-Basis-Koordinaten (bei zoom=1, pan=0)
    const baseX = (cx - pan.x) / zoom
    const baseY = (cy - pan.y) / zoom
    // Basis-Canvas → Bildpixel
    const x = baseX * (bildBreite / canvas.width)
    const y = baseY * (bildHoehe  / canvas.height)
    return pixelToSpherical(x, y, bildBreite, bildHoehe)
  }

  // ── Treffer-Test: ist die Maus nahe genug an einem Punkt? ──
  // mouseX/mouseY sind im getBoundingClientRect-Raum (CSS-Pixel relativ zum Canvas)
  function hitTestPunkt(mouseX: number, mouseY: number, pos: SphericalPos, schwelle: number = 12): boolean {
    const canvas = canvasRef.current
    if (!canvas) return false
    const rect = canvas.getBoundingClientRect()
    // Maus → Canvas-Pixel
    const cx = mouseX * (canvas.width  / rect.width)
    const cy = mouseY * (canvas.height / rect.height)
    // Punkt → Canvas-Pixel mit Zoom/Pan
    const { x, y } = sphericalToPixel(pos, bildBreite, bildHoehe)
    const px = (x / bildBreite) * canvas.width  * zoom + pan.x
    const py = (y / bildHoehe)  * canvas.height * zoom + pan.y
    const dx = cx - px
    const dy = cy - py
    // Schwellwert auch skalieren damit Treffer gleich präzise bleibt
    return Math.sqrt(dx * dx + dy * dy) <= schwelle
  }

  // ── Verortung speichern (perspektivenabhängig) ──
  function saveVerortung(deficitId: string, neueVerortung: DefizitVerortung) {
    setLocalDeficits(prev => prev.map(d => {
      if (d.id !== deficitId) return d
      if (aktivePerspektiveId) {
        return { ...d, verortungen: { ...(d.verortungen ?? {}), [aktivePerspektiveId]: neueVerortung } }
      }
      return { ...d, verortung: neueVerortung }
    }))
  }

  // ── MouseDown: Drag starten oder Modus-Aktion ──
  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!bildGeladen || bildBreite === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    // Im idle-Modus: prüfen ob ein bestehender Punkt/Startblick angeklickt wird (Drag)
    if (modus === 'idle') {
      // Standort-Marker ziehbar? (nur im Haupt-Panorama)
      if (!aktivePerspektiveId) {
        for (const p of (localScene.perspektiven ?? [])) {
          if (p.standortPosition && hitTestPunkt(mx, my, p.standortPosition, 14)) {
            setDragging({ type: 'standort', perspektiveId: p.id })
            isDragging.current = false
            return
          }
        }
      }

      // NavMarker ziehbar? (wenn auf einer Perspektive)
      if (aktivePerspektiveId) {
        const aktPersp = (localScene.perspektiven ?? []).find(p => p.id === aktivePerspektiveId)
        const markers = aktPersp?.navMarker ?? {}
        for (const [zielId, pos] of Object.entries(markers)) {
          if (hitTestPunkt(mx, my, pos, 14)) {
            setDragging({ type: 'navMarker', perspektiveId: aktivePerspektiveId, zielId })
            isDragging.current = false
            return
          }
        }
      }

      // Startblick ziehbar?
      const aktStartblick = aktivePerspektiveId
        ? (localScene.perspektiven ?? []).find(p => p.id === aktivePerspektiveId)?.startblick
        : localScene.startblick
      if (aktStartblick && hitTestPunkt(mx, my, aktStartblick, 16)) {
        setDragging({ type: 'startblick' })
        isDragging.current = false
        return
      }

      // Defizit-Punkt ziehbar?
      for (const d of localDeficits) {
        const v = getAktiveVerortung(d)
        if (v?.typ === 'punkt' && hitTestPunkt(mx, my, v.position)) {
          setSelectedDeficitId(d.id)
          setDragging({ type: 'punkt', deficitId: d.id })
          isDragging.current = false
          return
        }
        if (v?.typ === 'polygon') {
          for (let pi = 0; pi < v.punkte.length; pi++) {
            if (hitTestPunkt(mx, my, v.punkte[pi])) {
              setSelectedDeficitId(d.id)
              setDragging({ type: 'polygonPunkt', deficitId: d.id, punktIndex: pi })
              isDragging.current = false
              return
            }
          }
        }
      }

      // Kein Marker getroffen → Pan starten (verschiebt Canvas-Inhalt)
      setDragging({
        type: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      })
      isDragging.current = false
    }
  }

  // ── MouseMove: Drag durchführen ──
  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging) return

    // Pan: einfacher Canvas-Pixel-Offset, kein Bild-Koord nötig
    if (dragging.type === 'pan') {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const sx = canvas.width  / rect.width
      const sy = canvas.height / rect.height
      const dx = (e.clientX - dragging.startClientX) * sx
      const dy = (e.clientY - dragging.startClientY) * sy
      setPan({ x: dragging.startPanX + dx, y: dragging.startPanY + dy })
      isDragging.current = true
      return
    }

    const coord = mouseToCoord(e)
    if (!coord) return
    isDragging.current = true

    if (dragging.type === 'startblick') {
      if (aktivePerspektiveId) {
        setLocalScene(prev => ({
          ...prev,
          perspektiven: (prev.perspektiven ?? []).map(p =>
            p.id === aktivePerspektiveId ? { ...p, startblick: coord } : p
          ),
        }))
      } else {
        setLocalScene(prev => ({ ...prev, startblick: coord }))
      }
    } else if (dragging.type === 'standort') {
      setLocalScene(prev => ({
        ...prev,
        perspektiven: (prev.perspektiven ?? []).map(p =>
          p.id === dragging.perspektiveId ? { ...p, standortPosition: coord } : p
        ),
      }))
    } else if (dragging.type === 'navMarker') {
      setLocalScene(prev => ({
        ...prev,
        perspektiven: (prev.perspektiven ?? []).map(p =>
          p.id === dragging.perspektiveId
            ? { ...p, navMarker: { ...(p.navMarker ?? {}), [dragging.zielId]: coord } }
            : p
        ),
      }))
    } else if (dragging.type === 'punkt') {
      const neueVerortung: DefizitVerortung = { typ: 'punkt', position: coord, toleranz }
      saveVerortung(dragging.deficitId, neueVerortung)
    } else if (dragging.type === 'polygonPunkt') {
      setLocalDeficits(prev => prev.map(d => {
        if (d.id !== dragging.deficitId) return d
        const v = getAktiveVerortung(d)
        if (v?.typ !== 'polygon') return d
        const neuePunkte = [...v.punkte]
        neuePunkte[dragging.punktIndex] = coord
        const neueVerortung: DefizitVerortung = { typ: 'polygon', punkte: neuePunkte, toleranz: v.toleranz }
        if (aktivePerspektiveId) {
          return { ...d, verortungen: { ...(d.verortungen ?? {}), [aktivePerspektiveId]: neueVerortung } }
        }
        return { ...d, verortung: neueVerortung }
      }))
    }
  }

  // ── MouseUp: Drag beenden oder Klick-Aktion ──
  function handleCanvasMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (dragging) {
      // War es ein echtes Drag oder nur ein Klick auf den Punkt?
      if (!isDragging.current) {
        // Nur angeklickt, kein Drag — Auswahl beibehalten
      }
      setDragging(null)
      isDragging.current = false
      return
    }

    // Kein Drag → normaler Klick (Modus-Aktionen)
    const coord = mouseToCoord(e)
    if (!coord) return

    if (modus === 'standort' && standortZielId && !aktivePerspektiveId) {
      // Haupt-Panorama → Standort-Position für eine Perspektive setzen
      setLocalScene(prev => ({
        ...prev,
        perspektiven: (prev.perspektiven ?? []).map(p =>
          p.id === standortZielId ? { ...p, standortPosition: coord } : p
        ),
      }))
      setStandortZielId(null)
      setModus('idle')
    } else if (modus === 'standort' && navMarkerZiel && aktivePerspektiveId) {
      // Perspektive → NavMarker zu einem anderen Standort setzen
      setLocalScene(prev => ({
        ...prev,
        perspektiven: (prev.perspektiven ?? []).map(p =>
          p.id === aktivePerspektiveId
            ? { ...p, navMarker: { ...(p.navMarker ?? {}), [navMarkerZiel]: coord } }
            : p
        ),
      }))
      setNavMarkerZiel(null)
      setModus('idle')
    } else if (modus === 'startblick') {
      if (aktivePerspektiveId) {
        setLocalScene(prev => ({
          ...prev,
          perspektiven: (prev.perspektiven ?? []).map(p =>
            p.id === aktivePerspektiveId ? { ...p, startblick: coord } : p
          ),
        }))
      } else {
        setLocalScene(prev => ({ ...prev, startblick: coord }))
      }
      setModus('idle')
    } else if (modus === 'punkt' && selectedDeficitId) {
      saveVerortung(selectedDeficitId, { typ: 'punkt', position: coord, toleranz })
      setModus('idle')
    } else if (modus === 'polygon') {
      setPolygonInProgress(prev => [...prev, coord])
    }
  }

  // ── Doppelklick → Polygon schliessen ──
  function handleCanvasDblClick() {
    if (modus === 'polygon' && polygonInProgress.length >= 3 && selectedDeficitId) {
      saveVerortung(selectedDeficitId, { typ: 'polygon', punkte: polygonInProgress, toleranz })
      setPolygonInProgress([])
      setModus('idle')
    }
  }

  // ── Gruppe erstellen ──
  function handleGruppeErstellen() {
    if (!selectedDeficitId || gruppeIdsSelected.length === 0) return
    const elemente: DefizitVerortung[] = gruppeIdsSelected
      .map(id => {
        const d = localDeficits.find(x => x.id === id)
        if (!d) return null
        return getAktiveVerortung(d) ?? null
      })
      .filter((v): v is DefizitVerortung => v != null)

    if (elemente.length === 0) return
    saveVerortung(selectedDeficitId, { typ: 'gruppe', elemente })
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
    const v = getAktiveVerortung(d)
    if (v?.typ === 'punkt')   return aktivePerspektiveId ? 'Punkt (P)' : 'Punkt'
    if (v?.typ === 'polygon') return aktivePerspektiveId ? 'Polygon (P)' : 'Polygon'
    if (v?.typ === 'gruppe')  return aktivePerspektiveId ? 'Gruppe (P)' : 'Gruppe'
    if (d.position) return 'Manuell'
    return '—'
  }

  // ── Modus-Button Stil ──
  function modusBtnStyle(aktiv: boolean): React.CSSProperties {
    return {
      padding: '5px 10px',
      borderRadius: '6px',
      border: aktiv ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
      background: aktiv ? 'rgba(0,118,189,0.12)' : 'var(--zh-color-bg-secondary)',
      color: aktiv ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)',
      fontSize: '11px',
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'var(--zh-font)',
      whiteSpace: 'nowrap' as const,
    }
  }

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
        height: '700px', maxHeight: '94vh',
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

        {/* ── TOOLBAR ZEILE 1: Bild + Modus ── */}
        <div style={{
          padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: '6px',
          borderBottom: '1px solid var(--zh-color-border)',
          background: 'var(--zh-color-bg-secondary)',
          flexShrink: 0,
          flexWrap: 'wrap',
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
              padding: '4px 6px', borderRadius: '4px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-bg-secondary)',
              color: 'var(--zh-color-text)',
              fontSize: '11px', fontFamily: 'var(--zh-font)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <option value="">Textur…</option>
            {VERFUEGBARE_TEXTUREN.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* URL-Eingabe */}
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="/textures/panorama.webp"
            style={{
              flex: 1, padding: '4px 8px', borderRadius: '4px',
              border: '1px solid var(--zh-color-border)',
              background: 'var(--zh-color-surface)',
              color: 'var(--zh-color-text)',
              fontSize: '12px', fontFamily: 'var(--zh-font)',
              minWidth: '120px',
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleLaden() }}
          />
          <button onClick={handleLaden} style={modusBtnStyle(false)}>Laden</button>

          <div style={{ width: '1px', background: 'var(--zh-color-border)', height: '24px', flexShrink: 0 }} />

          {/* Modus-Buttons */}
          <button onClick={() => setModus(modus === 'startblick' ? 'idle' : 'startblick')}
            style={modusBtnStyle(modus === 'startblick')}>
            Startblick
          </button>
          <button
            onClick={() => { if (selectedDeficitId) setModus(modus === 'punkt' ? 'idle' : 'punkt') }}
            style={{ ...modusBtnStyle(modus === 'punkt'), opacity: selectedDeficitId ? 1 : 0.4 }}>
            Punkt
          </button>
          <button
            onClick={() => {
              if (selectedDeficitId) {
                if (modus === 'polygon') { setPolygonInProgress([]); setModus('idle') }
                else { setModus('polygon') }
              }
            }}
            style={{ ...modusBtnStyle(modus === 'polygon'), opacity: selectedDeficitId ? 1 : 0.4 }}>
            {modus === 'polygon' ? `Polygon (${polygonPunkte}) – Dblklick` : 'Polygon'}
          </button>
          <button
            onClick={() => { if (selectedDeficitId) setModus(modus === 'gruppe' ? 'idle' : 'gruppe') }}
            style={{ ...modusBtnStyle(modus === 'gruppe'), opacity: selectedDeficitId ? 1 : 0.4 }}>
            Gruppe
          </button>

          <div style={{ width: '1px', background: 'var(--zh-color-border)', height: '24px', flexShrink: 0 }} />

          {/* Toleranzradius */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', color: 'var(--zh-color-text-muted)', whiteSpace: 'nowrap' }}>
              Tol: {toleranz}°
            </span>
            <input type="range" min={5} max={30} step={1} value={toleranz}
              onChange={e => setToleranz(parseInt(e.target.value))}
              style={{ width: '50px' }} />
          </div>

          {/* Sichtbarkeit */}
          <button
            onClick={() => setVerortungenSichtbar(v => !v)}
            title={verortungenSichtbar ? 'Ausblenden' : 'Einblenden'}
            style={{ ...modusBtnStyle(verortungenSichtbar), padding: '5px 7px' }}
          >
            {verortungenSichtbar ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          {/* Schliessen */}
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--zh-color-text-muted)', padding: '4px', marginLeft: 'auto', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* ── TOOLBAR ZEILE 2: Perspektiven-Standortwahl (nur wenn vorhanden) ── */}
        {hatPerspektiven && (
          <div style={{
            padding: '5px 12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            borderBottom: '1px solid var(--zh-color-border)',
            background: aktivePerspektiveId ? 'rgba(0,118,189,0.04)' : 'var(--zh-color-bg-secondary)',
            flexShrink: 0,
          }}>
            <MapPin size={14} style={{ color: 'var(--zh-blau)', flexShrink: 0 }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--zh-color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px' }}>
              Standort:
            </span>

            {/* Haupt-Panorama */}
            <button
              onClick={() => setAktivePerspektiveId(null)}
              style={{
                padding: '4px 10px', borderRadius: '6px',
                border: !aktivePerspektiveId ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
                background: !aktivePerspektiveId ? 'rgba(0,118,189,0.15)' : 'var(--zh-color-surface)',
                color: !aktivePerspektiveId ? 'var(--zh-blau)' : 'var(--zh-color-text-muted)',
                fontSize: '11px', fontWeight: 700,
                cursor: !aktivePerspektiveId ? 'default' : 'pointer',
                fontFamily: 'var(--zh-font)',
              }}
            >
              Haupt-Panorama
            </button>

            {/* Perspektiven-Buttons */}
            {perspektiven.map((p, i) => {
              const isActive = p.id === aktivePerspektiveId
              const hatBild = !!p.bildUrl
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (!hatBild) return
                    setAktivePerspektiveId(p.id)
                  }}
                  title={hatBild ? (p.bildUrl || `Perspektive ${i + 1}`) : 'Kein Bild hinterlegt'}
                  style={{
                    padding: '4px 10px', borderRadius: '6px',
                    border: isActive ? '2px solid var(--zh-blau)' : '1px solid var(--zh-color-border)',
                    background: isActive ? 'rgba(0,118,189,0.15)' : 'var(--zh-color-surface)',
                    color: isActive ? 'var(--zh-blau)' : hatBild ? 'var(--zh-color-text-muted)' : 'var(--zh-color-text-disabled)',
                    fontSize: '11px', fontWeight: 700,
                    cursor: hatBild ? (isActive ? 'default' : 'pointer') : 'not-allowed',
                    fontFamily: 'var(--zh-font)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    opacity: hatBild ? 1 : 0.5,
                  }}
                >
                  <MapPin size={11} />
                  {p.label || `Standort ${i + 1}`}
                </button>
              )
            })}

            {aktivePerspektiveId && (
              <span style={{ fontSize: '10px', color: 'var(--zh-blau)', fontWeight: 600, marginLeft: '8px' }}>
                Verortungen werden für diese Perspektive gespeichert
              </span>
            )}
          </div>
        )}

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
              cursor: dragging?.type === 'pan' ? 'grabbing' : dragging ? 'grabbing' : modus !== 'idle' ? 'crosshair' : bildGeladen ? 'grab' : 'default',
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
              style={{ display: bildGeladen ? 'block' : 'none', maxWidth: '100%', cursor: dragging?.type === 'pan' ? 'grabbing' : dragging ? 'grabbing' : modus !== 'idle' ? 'crosshair' : 'grab' }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onDoubleClick={handleCanvasDblClick}
              onWheel={e => {
                if (!bildGeladen) return
                e.preventDefault()
                const canvas = canvasRef.current
                if (!canvas) return
                const rect = canvas.getBoundingClientRect()
                // Ankerpunkt unter Maus halten
                const mx = (e.clientX - rect.left) * (canvas.width  / rect.width)
                const my = (e.clientY - rect.top)  * (canvas.height / rect.height)
                const factor = e.deltaY > 0 ? 0.9 : 1.1
                const newZoom = Math.min(5, Math.max(1, zoom * factor))
                const scale = newZoom / zoom
                setPan({ x: mx - (mx - pan.x) * scale, y: my - (my - pan.y) * scale })
                setZoom(newZoom)
              }}
            />

            {/* Zoom-Kontrollen */}
            {bildGeladen && (
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 10 }}>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(5, z + 0.25))}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '18px', fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}
                  title="Reinzoomen"
                >+</button>
                <button
                  type="button"
                  onClick={resetView}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                  title="Standardansicht"
                >1:1</button>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(1, z - 0.25))}
                  style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '18px', fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}
                  title="Rauszoomen"
                >−</button>
                <div style={{ padding: '2px 4px', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  {Math.round(zoom * 100)}%
                </div>
              </div>
            )}

            {/* Modus-Hinweisleiste */}
            {(modus !== 'idle' || dragging) && (
              <div style={{
                position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                background: dragging ? 'rgba(26,127,31,0.9)' : 'rgba(0,64,124,0.9)', color: 'white',
                padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                pointerEvents: 'none',
              }}>
                {dragging?.type === 'pan' && 'Panning — loslassen zum Fixieren'}
                {dragging && dragging.type !== 'pan' && 'Ziehen zum Verschieben — loslassen zum Platzieren'}
                {!dragging && modus === 'startblick' && 'Ins Bild klicken → Startblick setzen'}
                {!dragging && modus === 'punkt'      && 'Ins Bild klicken → Punkt setzen'}
                {!dragging && modus === 'polygon'    && 'Klicken: Punkt hinzufügen | Doppelklick: Polygon schliessen'}
                {!dragging && modus === 'standort'   && 'Ins Bild klicken → Standort-Position setzen'}
                {!dragging && modus === 'gruppe'     && 'Defizite in der Seitenleiste auswählen, dann «Gruppe erstellen»'}
              </div>
            )}
            {/* Idle-Hinweis */}
            {modus === 'idle' && !dragging && bildGeladen && (
              <div style={{
                position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.6)',
                padding: '4px 12px', borderRadius: '4px', fontSize: '11px',
                pointerEvents: 'none',
              }}>
                Mausrad: Zoom · Ziehen: Pan · Marker direkt greifbar
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
              padding: '8px 14px',
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
                      padding: '8px 14px',
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
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--zh-color-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)', marginBottom: '6px' }}>
                  {gruppeIdsSelected.length} Defizite ausgewählt
                </div>
                <button
                  onClick={handleGruppeErstellen}
                  disabled={gruppeIdsSelected.length === 0 || !selectedDeficitId}
                  style={{
                    width: '100%', padding: '7px', borderRadius: '6px',
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

            {/* Startblick-Anzeige (perspektivenabhängig) */}
            {(() => {
              const aktStartblick = aktivePerspektiveId
                ? (localScene.perspektiven ?? []).find(p => p.id === aktivePerspektiveId)?.startblick
                : localScene.startblick
              if (!aktStartblick) return null
              return (
                <div style={{
                  padding: '8px 14px',
                  borderTop: '1px solid var(--zh-color-border)',
                  fontSize: '11px', color: 'var(--zh-color-text-muted)',
                }}>
                  <span style={{ fontWeight: 700, color: '#0076BD' }}>
                    Startblick{aktivePerspektiveId ? ` (${aktivePerspektive?.label ?? 'Perspektive'})` : ''}:
                  </span>{' '}
                  θ={Math.round(aktStartblick.theta)}°, φ={Math.round(aktStartblick.phi)}°
                  <button
                    onClick={() => {
                      if (aktivePerspektiveId) {
                        setLocalScene(prev => ({
                          ...prev,
                          perspektiven: (prev.perspektiven ?? []).map(p =>
                            p.id === aktivePerspektiveId ? { ...p, startblick: null } : p
                          ),
                        }))
                      } else {
                        setLocalScene(prev => ({ ...prev, startblick: null }))
                      }
                    }}
                    style={{
                      marginLeft: '8px', background: 'none', border: 'none',
                      cursor: 'pointer', color: '#D40053', fontSize: '11px',
                    }}
                  >
                    Entfernen
                  </button>
                </div>
              )
            })()}

            {/* Verortungs-Detailbox */}
            {selectedDeficitId && (() => {
              const d = localDeficits.find(x => x.id === selectedDeficitId)
              if (!d) return null
              const aktVerortung = getAktiveVerortung(d)
              if (!aktVerortung) return null
              return (
                <div style={{
                  padding: '8px 14px',
                  borderTop: '1px solid var(--zh-color-border)',
                  fontSize: '11px', color: 'var(--zh-color-text-muted)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--zh-color-text)' }}>
                    Verortung {aktivePerspektiveId ? `(${aktivePerspektive?.label ?? 'Perspektive'})` : ''}
                  </div>
                  {aktVerortung.typ === 'punkt' && (
                    <>
                      <div>Typ: <strong>Punkt</strong></div>
                      <div>θ={Math.round(aktVerortung.position.theta)}°, φ={Math.round(aktVerortung.position.phi)}°</div>
                      <div>Toleranz: {aktVerortung.toleranz}°</div>
                    </>
                  )}
                  {aktVerortung.typ === 'polygon' && (
                    <>
                      <div>Typ: <strong>Polygon</strong></div>
                      <div>Eckpunkte: {aktVerortung.punkte.length}</div>
                    </>
                  )}
                  {aktVerortung.typ === 'gruppe' && (
                    <>
                      <div>Typ: <strong>Gruppe</strong></div>
                      <div>Elemente: {aktVerortung.elemente.length}</div>
                    </>
                  )}
                  <button
                    onClick={() => setLocalDeficits(prev => prev.map(x => {
                      if (x.id !== d.id) return x
                      if (aktivePerspektiveId && x.verortungen) {
                        const updated = { ...x.verortungen }
                        delete updated[aktivePerspektiveId]
                        return { ...x, verortungen: Object.keys(updated).length > 0 ? updated : null }
                      }
                      return { ...x, verortung: null }
                    }))}
                    style={{
                      marginTop: '5px', background: 'none', border: '1px solid rgba(212,0,83,0.3)',
                      borderRadius: '4px', cursor: 'pointer', color: '#D40053',
                      fontSize: '11px', padding: '3px 8px', fontFamily: 'var(--zh-font)',
                    }}
                  >
                    Verortung löschen
                  </button>
                </div>
              )
            })()}
          {/* Navigation von hier (wenn auf einer Perspektive) */}
          {aktivePerspektiveId && (localScene.perspektiven ?? []).length > 0 && (() => {
            const aktPersp = (localScene.perspektiven ?? []).find(p => p.id === aktivePerspektiveId)
            if (!aktPersp) return null
            const markers = aktPersp.navMarker ?? {}
            // Ziele: Haupt-Panorama + alle anderen Perspektiven
            const ziele: { id: string; label: string }[] = [
              { id: 'haupt', label: 'Haupt-Panorama' },
              ...(localScene.perspektiven ?? [])
                .filter(p => p.id !== aktivePerspektiveId)
                .map((p, i) => ({ id: p.id, label: p.label || `Standort ${i + 1}` })),
            ]
            return (
              <div style={{
                padding: '8px 14px',
                borderTop: '1px solid var(--zh-color-border)',
              }}>
                <div style={{
                  fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)',
                  marginBottom: '6px',
                }}>
                  Navigation von hier
                </div>
                {ziele.map(z => {
                  const pos = markers[z.id]
                  return (
                    <div key={z.id} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      marginBottom: '4px', fontSize: '11px',
                    }}>
                      <MapPin size={11} style={{ color: z.id === 'haupt' ? '#00407C' : '#0076BD', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--zh-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {z.label}
                      </span>
                      {pos ? (
                        <>
                          <span style={{ color: 'var(--zh-color-text-muted)', fontSize: '10px', flexShrink: 0 }}>
                            {Math.round(pos.theta)}°
                          </span>
                          <button
                            onClick={() => {
                              setLocalScene(prev => ({
                                ...prev,
                                perspektiven: (prev.perspektiven ?? []).map(p => {
                                  if (p.id !== aktivePerspektiveId) return p
                                  const updated = { ...(p.navMarker ?? {}) }
                                  delete updated[z.id]
                                  return { ...p, navMarker: Object.keys(updated).length > 0 ? updated : null }
                                }),
                              }))
                            }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: '#D40053', fontSize: '12px', padding: '0 2px', flexShrink: 0,
                            }}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setNavMarkerZiel(z.id)
                            setModus('standort')
                          }}
                          style={{
                            background: 'none', border: '1px solid var(--zh-blau)',
                            borderRadius: '4px', cursor: 'pointer',
                            color: 'var(--zh-blau)', fontSize: '10px', padding: '2px 6px',
                            fontFamily: 'var(--zh-font)', flexShrink: 0,
                          }}
                        >
                          Setzen
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Standort-Positionen (nur im Haupt-Panorama) */}
          {!aktivePerspektiveId && (localScene.perspektiven ?? []).length > 0 && (
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--zh-color-border)',
            }}>
              <div style={{
                fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: 'var(--zh-color-text-disabled)',
                marginBottom: '6px',
              }}>
                Standort-Positionen
              </div>
              {(localScene.perspektiven ?? []).map((p, i) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginBottom: '4px', fontSize: '11px',
                }}>
                  <MapPin size={11} style={{ color: '#0076BD', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--zh-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.label || `Standort ${i + 1}`}
                  </span>
                  {p.standortPosition ? (
                    <>
                      <span style={{ color: 'var(--zh-color-text-muted)', fontSize: '10px', flexShrink: 0 }}>
                        {Math.round(p.standortPosition.theta)}°
                      </span>
                      <button
                        onClick={() => {
                          setLocalScene(prev => ({
                            ...prev,
                            perspektiven: (prev.perspektiven ?? []).map(x =>
                              x.id === p.id ? { ...x, standortPosition: null } : x
                            ),
                          }))
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#D40053', fontSize: '12px', padding: '0 2px', flexShrink: 0,
                        }}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setStandortZielId(p.id)
                        setModus('standort')
                      }}
                      style={{
                        background: 'none', border: '1px solid var(--zh-blau)',
                        borderRadius: '4px', cursor: 'pointer',
                        color: 'var(--zh-blau)', fontSize: '10px', padding: '2px 6px',
                        fontFamily: 'var(--zh-font)', flexShrink: 0,
                      }}
                    >
                      Setzen
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--zh-color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--zh-color-bg-secondary)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '11px', color: 'var(--zh-color-text-muted)' }}>
            {bildGeladen
              ? `${bildBreite.toLocaleString('de-CH')} × ${bildHoehe.toLocaleString('de-CH')} px`
              : 'Kein Bild geladen'}
            {aktivePerspektiveId && aktivePerspektive && (
              <span style={{ marginLeft: '8px', color: 'var(--zh-blau)', fontWeight: 600 }}>
                | {aktivePerspektive.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px', borderRadius: 'var(--zh-radius-btn)',
                border: '1px solid var(--zh-color-border)', background: 'transparent',
                color: 'var(--zh-color-text-muted)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--zh-font)',
              }}
            >
              Abbrechen
            </button>
            <button
              onClick={() => onSave(localScene, localDeficits)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '7px 16px', borderRadius: 'var(--zh-radius-btn)',
                background: 'var(--zh-dunkelblau)', color: 'white',
                fontWeight: 700, fontSize: '12px', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--zh-font)',
              }}
            >
              <Save size={13} /> Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
