// SceneViewer – 360°-Panorama-Viewer mit Klick-Flow
// R3F Canvas + OrbitControls + Hotspots + HTML-Overlay
// Phase 2: Browser | Phase 3+: WebXR Meta Quest 3

import * as THREE from 'three'
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Billboard, Text } from '@react-three/drei'
import { XR, useXR } from '@react-three/xr'
import { xrStore } from '../xrStore'
import { Suspense, useCallback, useState, useRef, useEffect, Component } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Eye, X, Glasses, MapPin, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  clickToSpherical,
  sphericalToVector3,
  isInTolerance,
  trefferprüfung,
} from '../utils/sphereCoords'
import { ml, getVerortungFürPerspektive, type AppScene, type AppDeficit, type DefizitKategorie, type FoundDeficit } from '../data/appData'
import { triggerHaptic } from '../utils/vrHaptics'
import { getVRPanelOffset, saveVRPanelOffset, clearVRPanelOffset, clampOffset } from '../utils/vrPanelOffsets'
import KategoriePanel from './KategoriePanel'
import KlickFeedback, { type KlickFeedbackType } from './KlickFeedback'
import { useTranslation } from 'react-i18next'
import { KATEGORIE_PUNKTE, STEP_WEIGHTS, STEP_WEIGHT_UNIT, calcRelevanzSD, calcUnfallrisiko } from '../data/scoringEngine'
import { KATEGORIE_TEILPUNKTE, HINT_ABZUG_WEGWEISER, HINT_ABZUG_HOTSPOTS } from '../data/scoreCalc'
import { KRITERIUM_LABELS } from '../data/kriteriumLabels'
import { ABWEICHUNG_I18N } from '../data/abweichungLabels'
import { buildRelevanzMatrix, buildRisikoMatrix, deriveErgebnisse, RELEVANZ_ROWS, RELEVANZ_COLS, RISIKO_ROWS, RISIKO_COLS, type MatrixModel } from '../data/ergebnisModel'
import type { RSIDimension, NACADimension, ResultDimension } from '../types'
import type { TFunction } from 'i18next'

// Modul-Level Singleton – nie innerhalb von Komponenten erzeugen

// Kategorien für VR-Panel — Labels via i18n-Key (de/fr/it/en), aufgelöst mit t().
const VR_KATEGORIEN: { value: DefizitKategorie; labelKey: string }[] = [
  { value: 'verkehrsfuehrung', labelKey: 'kategorie.verkehrsfuehrung' },
  { value: 'sicht',            labelKey: 'kategorie.sicht'            },
  { value: 'ausruestung',      labelKey: 'kategorie.ausruestung'      },
  { value: 'zustand',          labelKey: 'kategorie.zustand'          },
  { value: 'strassenrand',     labelKey: 'kategorie.strassenrand'     },
  { value: 'verkehrsablauf',   labelKey: 'kategorie.verkehrsablauf'   },
  { value: 'baustelle',        labelKey: 'kategorie.baustelle'        },
]

// ── Fehlergrenze für VR-Panels (verhindert Scene-Crash) ────────────────────
interface VRErrorBoundaryState { hasError: boolean }
class VRErrorBoundary extends Component<{ children: React.ReactNode }, VRErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() { return { hasError: true } }
  render() { return this.state.hasError ? null : this.props.children }
}

// ── 360°-Sphere (invertiert, BackSide) ──────────────────────────────────────
interface PanoramaSphereProps {
  bildUrl:        string | null | undefined
  onClick:        (e: ThreeEvent<MouseEvent>) => void
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?:  () => void
}

function PanoramaSphere({ bildUrl, onClick, onPointerMove, onPointerOut }: PanoramaSphereProps) {
  const fallbackColor = '#2a2e35'
  return (
    <mesh onClick={onClick} onPointerMove={onPointerMove} onPointerOut={onPointerOut} renderOrder={0}>
      <sphereGeometry args={[500, 64, 40]} />
      {bildUrl ? (
        <Suspense fallback={<meshBasicMaterial color={fallbackColor} side={THREE.BackSide} />}>
          <PanoramaTextureMaterial url={bildUrl} />
        </Suspense>
      ) : (
        <meshBasicMaterial color={fallbackColor} side={THREE.BackSide} />
      )}
    </mesh>
  )
}

function PanoramaTextureMaterial({ url }: { url: string }) {
  const texture = useLoader(THREE.TextureLoader, url)
  texture.colorSpace = THREE.SRGBColorSpace
  // BackSide spiegelt die Textur horizontal — repeat.x=-1 hebt die Spiegelung auf,
  // offset.x=0.75 korrigiert den 90°-Versatz zwischen Three.js UV-Mapping und
  // unserer theta-Konvention (theta=0 = -Z = vorne)
  texture.wrapS = THREE.RepeatWrapping
  texture.repeat.x = -1
  texture.offset.x = 0.75
  return <meshBasicMaterial map={texture} side={THREE.BackSide} />
}

// ── Hotspot (Billboard – immer zur Kamera gedreht) ───────────────────────────
// Grün = gefundenes Defizit, Orange = Hinweis (ungefunden, Hint aktiv).
// Keine FOV-Kompensation: beim Reinzoomen wächst der Ring natürlich mit dem
// Bild, sodass präzises Klicken möglich ist.
interface HotspotProps {
  position: THREE.Vector3
  found: boolean
}

function Hotspot({ position, found }: HotspotProps) {
  const ringColor   = found ? '#1A7F1F' : '#F0A500'
  const fillOpacity = 0.20

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh>
        <ringGeometry args={[2.4, 2.9, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.90} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[2.4, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={fillOpacity} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </Billboard>
  )
}

// ── Standort-Navigationsmarker (klickbar, wechselt Perspektive) ─────────────
// Farb-Kodierung (seit v0.8.0, VR-Orientierungshilfe):
//   'unbesucht' — neutrales Hellgrau, signalisiert Wahlmoeglichkeit
//   'besucht'   — gruen (konsistent mit Hotspot-Found), signalisiert "war schon da"
// Die aktuell aktive Perspektive erscheint nicht als eigener Marker
// (der Marker fuehrt ja von hier weg), insofern brauchen wir keinen
// 'aktiv'-Status — der ergaebe sich nur bei anders gearteter Visualisierung.
type StandortMarkerStatus = 'unbesucht' | 'besucht'

interface StandortNavMarkerProps {
  position: THREE.Vector3
  label:    string
  status:   StandortMarkerStatus
  /** v0.9.4: Hinweis aktiv + hinter diesem Standort liegen unentdeckte Defizite.
      Der Marker wird orange umrandet — Wegweiser, ohne die Position zu verraten. */
  hintZiel?: boolean
  onClick:  () => void
}

function StandortNavMarker({ position, label, status, hintZiel = false, onClick }: StandortNavMarkerProps) {
  const [hovered, setHovered] = useState(false)
  // Hover-Vergroesserung v0.8.1: Feedback auf Stevos VR-Test deutlicher machen.
  const size = hovered ? 4.5 : 2.6
  const fillColor = status === 'besucht' ? '#1A7F1F' : '#d7d7d7'
  const labelColor = hintZiel ? '#F0A500' : status === 'besucht' ? '#cfe9d0' : 'white'
  const randColor  = hintZiel ? '#F0A500' : 'white'
  return (
    <Billboard
      position={position}
      follow lockX={false} lockY={false} lockZ={false}
    >
      {/* Rand-Diamant (leicht grösser, hinten) — orange als Hinweis-Wegweiser */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[size + (hintZiel ? 0.9 : 0.45), size + (hintZiel ? 0.9 : 0.45)]} />
        <meshBasicMaterial color={randColor} transparent opacity={0.92} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      {/* Füll-Diamant (klickbar, vorne) — Farbe abhaengig vom Besuch-Status */}
      <mesh
        rotation={[0, 0, Math.PI / 4]}
        position={[0, 0, 0.01]}
        onClick={e => { e.stopPropagation(); onClick() }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color={fillColor} transparent opacity={hovered ? 0.98 : 0.88} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <Text
        position={[0, -size - 1.4, 0]}
        fontSize={1.6}
        color={labelColor}
        anchorX="center"
        anchorY="top"
        outlineWidth={0.18}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </Billboard>
  )
}

// ── Hotspot-Position für ein Defizit bestimmen (perspektivenabhaengig) ──────
function getHotspotPosition(d: AppDeficit, perspektivenId: string | null = null): THREE.Vector3 | null {
  const verortung = getVerortungFürPerspektive(d, perspektivenId)
  if (verortung) {
    if (verortung.typ === 'punkt') {
      return sphericalToVector3(verortung.position, 60)
    }
    if (verortung.typ === 'polygon' && verortung.punkte.length > 0) {
      const n        = verortung.punkte.length
      const sumTheta = verortung.punkte.reduce((s, p) => s + p.theta, 0)
      const sumPhi   = verortung.punkte.reduce((s, p) => s + p.phi,   0)
      return sphericalToVector3({ theta: sumTheta / n, phi: sumPhi / n }, 60)
    }
    if (verortung.typ === 'gruppe' && verortung.elemente.length > 0) {
      const erstesElement = verortung.elemente[0]
      if (erstesElement.typ === 'punkt') {
        return sphericalToVector3(erstesElement.position, 60)
      }
      if (erstesElement.typ === 'polygon' && erstesElement.punkte.length > 0) {
        return sphericalToVector3(erstesElement.punkte[0], 60)
      }
    }
  }
  // Legacy-Fallback nur im Haupt-Panorama — in einer Perspektive würde die
  // Haupt-Koordinate sonst eine irreführende Position im anderen Bild zeigen.
  if (!perspektivenId && d.position) return sphericalToVector3(d.position, 60)
  return null
}

// v0.9.4: Liegen hinter einem Ziel-Standort noch unentdeckte, dort verortete
// Defizite? Grundlage für den Hinweis-Wegweiser: Hotspots erscheinen bewusst
// nur im Standort der Verortung (kein Fallback seit v0.4.0) — der Hinweis
// muss deshalb den Weg zum richtigen Standort zeigen.
// v0.9.5: Nur Defizite zählen, die am AKTUELLEN Standort NICHT sichtbar sind.
// Defizite sind oft mehrfach verortet (Haupt + mehrere Perspektiven) — ohne
// diesen Filter leuchteten fast alle Marker, obwohl es dort nichts Neues gibt.
function standortHatOffeneDefizite(
  deficits: AppDeficit[],
  foundIds: Set<string>,
  zielPerspektivenId: string | null,
  aktuellePerspektivenId: string | null,
): boolean {
  return deficits.some(d =>
    !foundIds.has(d.id) &&
    getHotspotPosition(d, zielPerspektivenId) !== null &&
    getHotspotPosition(d, aktuellePerspektivenId) === null,
  )
}

// ── VR: Panel im Weltraum – Position einmalig bei Mount erfassen ─────────────
// Beim ersten Frame wird die aktuelle Blickrichtung erfasst und das Panel
// dort fixiert. Danach dreht nur noch Billboard es zur Kamera – die Position
// bleibt unverändert (keine Kopf-Bindung mehr).
//
// v0.9.0 — Panels verschiebbar: Mit `drag` bekommt das Panel eine Griffleiste
// über der Oberkante. Grab-and-Drop via Pointer-Capture: @pmndrs/pointer-events
// (Basis von @react-three/xr v6) schneidet den Controller-Ray nach
// setPointerCapture mit einer kamerazugewandten View-Plane im Grab-Abstand —
// e.point wandert also mit dem Ray mit, das Panel folgt dem Delta. Die
// Distanz zum User bleibt dabei konstant. Beim Loslassen wird die Position
// im Kamera-System des Mount-Zeitpunkts persistiert (localStorage), Doppel-
// klick auf die Griffleiste setzt auf die Default-Position zurück.
interface VRHudDragConfig {
  /** Persistenz-Schlüssel — gleiche ID teilt die Position (z.B. Bewertungs-Schritte). */
  id:    string
  /** Breite der Griffleiste (= Panelbreite). */
  width: number
  /** Y-Oberkante des Panels in Panel-Lokalkoordinaten (= panelH / 2). */
  top:   number
}

interface VRHudProps {
  offset?: [number, number, number]
  drag?:   VRHudDragConfig
  children: React.ReactNode
}

const VR_HANDLE_H   = 0.045
const VR_HANDLE_GAP = 0.008

function VRHud({ offset = [0, 0, -1.5], drag, children }: VRHudProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const initialized = useRef(false)
  // Kamera-Pose beim Mount — Referenzsystem für Persistenz und Reset
  const mountPos  = useRef(new THREE.Vector3())
  const mountQuat = useRef(new THREE.Quaternion())
  const dragState = useRef<{
    pointerId:  number
    startPoint: THREE.Vector3
    startPos:   THREE.Vector3
  } | null>(null)
  const [handleHover, setHandleHover] = useState(false)
  const [handleDrag,  setHandleDrag]  = useState(false)

  useFrame(({ camera }) => {
    if (!groupRef.current || initialized.current) return
    mountPos.current.copy(camera.position)
    mountQuat.current.copy(camera.quaternion)
    // Position einmalig in Kamera-Richtung + Offset setzen (persistierter
    // Offset des Panels hat Vorrang vor dem Default)
    const eff = (drag ? getVRPanelOffset(drag.id) : null) ?? offset
    const pos = new THREE.Vector3(eff[0], eff[1], eff[2])
      .applyQuaternion(camera.quaternion)
      .add(camera.position)
    groupRef.current.position.copy(pos)
    groupRef.current.visible = true
    initialized.current = true
  })

  const setzePositionAusOffset = (o: [number, number, number]) => {
    if (!groupRef.current) return
    const pos = new THREE.Vector3(o[0], o[1], o[2])
      .applyQuaternion(mountQuat.current)
      .add(mountPos.current)
    groupRef.current.position.copy(pos)
  }

  const handleGrabStart = (e: ThreeEvent<PointerEvent>) => {
    if (!groupRef.current || dragState.current) return
    e.stopPropagation()
    ;(e.target as unknown as THREE.Object3D).setPointerCapture(e.pointerId)
    dragState.current = {
      pointerId:  e.pointerId,
      startPoint: e.point.clone(),
      startPos:   groupRef.current.position.clone(),
    }
    setHandleDrag(true)
  }

  const handleGrabMove = (e: ThreeEvent<PointerEvent>) => {
    const d = dragState.current
    if (!d || d.pointerId !== e.pointerId || !groupRef.current) return
    e.stopPropagation()
    groupRef.current.position
      .copy(d.startPos)
      .add(e.point)
      .sub(d.startPoint)
  }

  const handleGrabEnd = (e: ThreeEvent<PointerEvent>) => {
    const d = dragState.current
    if (!d || d.pointerId !== e.pointerId) return
    e.stopPropagation()
    dragState.current = null
    setHandleDrag(false)
    try {
      ;(e.target as unknown as THREE.Object3D).releasePointerCapture(e.pointerId)
    } catch {
      // Capture wurde bereits implizit gelöst — unkritisch
    }
    if (!drag || !groupRef.current) return
    // Weltposition zurück ins Kamera-System des Mount-Zeitpunkts rechnen
    const lokal = groupRef.current.position
      .clone()
      .sub(mountPos.current)
      .applyQuaternion(mountQuat.current.clone().invert())
    const geclampt = clampOffset([lokal.x, lokal.y, lokal.z])
    saveVRPanelOffset(drag.id, geclampt)
    // Clamp auch räumlich anwenden, damit Anzeige und Persistenz übereinstimmen
    setzePositionAusOffset(geclampt)
  }

  const handleReset = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!drag) return
    clearVRPanelOffset(drag.id)
    setzePositionAusOffset(offset)
  }

  // Unsichtbar starten, damit kein Flash bei (0,0,0) vor erstem Frame
  return (
    <group ref={groupRef} visible={false}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        {drag && (
          <group position={[0, drag.top + VR_HANDLE_GAP + VR_HANDLE_H / 2, 0]}>
            <mesh
              onPointerDown={handleGrabStart}
              onPointerMove={handleGrabMove}
              onPointerUp={handleGrabEnd}
              onPointerCancel={handleGrabEnd}
              onPointerOver={() => setHandleHover(true)}
              onPointerOut={() => setHandleHover(false)}
              onDoubleClick={handleReset}
            >
              <planeGeometry args={[drag.width, VR_HANDLE_H]} />
              <meshBasicMaterial
                color={handleDrag ? '#0076BD' : handleHover ? '#25476a' : '#131826'}
                transparent
                opacity={0.92}
              />
            </mesh>
            {/* Grip-Punkte als Verschiebbar-Signal */}
            {[-0.036, 0, 0.036].map(x => (
              <mesh key={x} position={[x, 0, 0.002]}>
                <circleGeometry args={[0.006, 12]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={handleDrag || handleHover ? 0.95 : 0.55} />
              </mesh>
            ))}
          </group>
        )}
        {children}
      </Billboard>
    </group>
  )
}

// ── VR: Schaltflaeche (Plane + Text) ────────────────────────────────────────
interface VRButtonProps {
  label:       string
  position?:   [number, number, number]
  width?:      number
  height?:     number
  color?:      string
  hoverColor?: string
  textColor?:  string
  fontSize?:   number
  onClick:     () => void
}

function VRButton({
  label,
  position   = [0, 0, 0],
  width      = 0.65,
  height     = 0.08,
  color      = '#1a2030',
  hoverColor = '#0076BD',
  textColor  = '#ffffff',
  fontSize   = 0.038,
  onClick,
}: VRButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={position}>
      <mesh
        onClick={e => { e.stopPropagation(); onClick() }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={hovered ? hoverColor : color} transparent opacity={0.92} />
      </mesh>
      <Text
        position={[0, 0, 0.003]}
        fontSize={fontSize}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={width - 0.04}
      >
        {label}
      </Text>
    </group>
  )
}

// ── VR: Fortschritts-Panel (oben links) ─────────────────────────────────────
interface VRProgressPanelProps {
  sceneName:  string
  kontext:    string
  foundCount: number
  totalCount: number
  dots:       { found: boolean }[]
  /** Verbrauchte Zeit in Sekunden, zeigt MM:SS rechts oben im Panel an. */
  elapsedSec: number
}

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function VRProgressPanel({ sceneName, kontext, foundCount, totalCount, dots, elapsedSec }: VRProgressPanelProps) {
  const maxDots    = Math.min(dots.length, 10)
  const shownDots  = dots.slice(0, maxDots)
  const dotStep    = 0.038
  const dotsWidth  = (shownDots.length - 1) * dotStep
  const dotsStartX = -dotsWidth / 2

  return (
    <VRHud offset={[-0.55, 0.36, -1.5]} drag={{ id: 'progress', width: 0.56, top: 0.12 }}>
      <mesh>
        <planeGeometry args={[0.56, 0.24]} />
        <meshBasicMaterial color="#080c18" transparent opacity={0.88} />
      </mesh>
      <Text position={[0, 0.08, 0.003]} fontSize={0.020} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        {kontext}
      </Text>
      <Text position={[0, 0.035, 0.003]} fontSize={0.030} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.50}>
        {sceneName}
      </Text>
      {/* Timer MM:SS rechts oben im Panel (v0.8.0 Orientierungshilfe) */}
      <Text
        position={[0.22, 0.08, 0.003]}
        fontSize={0.022}
        color="rgba(255,255,255,0.70)"
        anchorX="right"
        anchorY="middle"
      >
        {formatElapsed(elapsedSec)}
      </Text>
      {shownDots.map((d, i) => (
        <mesh key={i} position={[dotsStartX + i * dotStep, -0.055, 0.003]}>
          <circleGeometry args={[0.013, 16]} />
          <meshBasicMaterial color={d.found ? '#1A7F1F' : '#3a3f4a'} />
        </mesh>
      ))}
      <Text
        position={[dotsStartX + shownDots.length * dotStep + 0.01, -0.055, 0.003]}
        fontSize={0.024}
        color="rgba(255,255,255,0.55)"
        anchorX="left"
        anchorY="middle"
      >
        {`${foundCount}/${totalCount}`}
      </Text>
    </VRHud>
  )
}

// ── VR: Kontroll-Leiste (unten mitte) ───────────────────────────────────────
interface VRControlBarProps {
  hintStufe:  number
  onHint:     (stufe: 1 | 2) => void
  onBeenden:  () => void
  t:          TFunction
}

// v0.10.0: zweistufiger Hinweis (R-18) — Wegweiser (−10) und Hotspots (−25)
function VRControlBar({ hintStufe, onHint, onBeenden, t }: VRControlBarProps) {
  return (
    <VRHud offset={[0, -0.44, -1.5]} drag={{ id: 'controls', width: 1.38, top: 0.055 }}>
      <mesh>
        <planeGeometry args={[1.38, 0.11]} />
        <meshBasicMaterial color="#080c18" transparent opacity={0.80} />
      </mesh>
      {hintStufe < 1 ? (
        <VRButton
          label={t('szene.wegweiser_btn')}
          position={[-0.46, 0, 0.002]}
          width={0.42}
          height={0.085}
          color="#20260a"
          hoverColor="#7a8a00"
          textColor="#d6e04a"
          fontSize={0.028}
          onClick={() => onHint(1)}
        />
      ) : (
        <Text position={[-0.46, 0, 0.003]} fontSize={0.026} color="#d6e04a" anchorX="center" anchorY="middle">
          {t('szene.wegweiser_aktiv')}
        </Text>
      )}
      {hintStufe < 2 ? (
        <VRButton
          label={t('szene.hinweis_btn')}
          position={[0, 0, 0.002]}
          width={0.42}
          height={0.085}
          color="#2a1800"
          hoverColor="#b87300"
          textColor="#F0A500"
          fontSize={0.028}
          onClick={() => onHint(2)}
        />
      ) : (
        <Text position={[0, 0, 0.003]} fontSize={0.026} color="#F0A500" anchorX="center" anchorY="middle">
          {t('szene.hinweis_aktiv')}
        </Text>
      )}
      <VRButton
        label={t('szene.beenden')}
        position={[0.46, 0, 0.002]}
        width={0.42}
        height={0.085}
        color="#151820"
        hoverColor="#2a3040"
        textColor="rgba(255,255,255,0.75)"
        fontSize={0.028}
        onClick={onBeenden}
      />
    </VRHud>
  )
}

// ── VR: Kategorie-Panel ──────────────────────────────────────────────────────
interface VRKategoriePanelProps {
  onSelect: (k: DefizitKategorie) => void
  onCancel: () => void
  t:        TFunction
}

function VRKategoriePanel({ onSelect, onCancel, t }: VRKategoriePanelProps) {
  const btnH    = 0.077
  const btnGap  = 0.010
  const btnStep = btnH + btnGap
  const numBtn  = VR_KATEGORIEN.length + 1
  const panelH  = 0.18 + numBtn * btnStep + 0.04
  const panelW  = 0.80

  return (
    <VRHud offset={[0, 0, -1.5]} drag={{ id: 'kategorie', width: panelW, top: panelH / 2 }}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#1a3060" transparent opacity={0.90} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>
      <Text position={[0, panelH / 2 - 0.048, 0.003]} fontSize={0.022} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        {t('kategorie.schritt_label')}
      </Text>
      <Text position={[0, panelH / 2 - 0.090, 0.003]} fontSize={0.036} color="#ffffff" anchorX="center" anchorY="middle">
        {t('kategorie.frage')}
      </Text>
      {VR_KATEGORIEN.map(({ value, labelKey }, i) => (
        <VRButton
          key={value}
          label={t(labelKey)}
          position={[0, panelH / 2 - 0.158 - i * btnStep, 0.002]}
          width={panelW - 0.08}
          height={btnH}
          color="#131826"
          hoverColor="#0076BD"
          fontSize={0.032}
          onClick={() => onSelect(value)}
        />
      ))}
      <VRButton
        label={t('scoring.abbrechen')}
        position={[0, panelH / 2 - 0.158 - VR_KATEGORIEN.length * btnStep, 0.002]}
        width={panelW - 0.08}
        height={btnH}
        color="#1a1a2a"
        hoverColor="#333355"
        textColor="rgba(255,255,255,0.55)"
        fontSize={0.030}
        onClick={onCancel}
      />
    </VRHud>
  )
}

// ── VR: Hinweis-Dialog (v0.9.1, VR-Iter 5) ──────────────────────────────────
// Gleiche Semantik wie der Browser-HintDialog: erst bestaetigen, dann Penalty.
// Vorher aktivierte der VR-Hinweis-Button die Penalty ohne jede Warnung.
interface VRHintDialogProps {
  hintCount:    number
  stufe:        1 | 2
  onBestätigen: () => void
  onAbbrechen:  () => void
  t:            TFunction
}

function VRHintDialog({ hintCount, stufe, onBestätigen, onAbbrechen, t }: VRHintDialogProps) {
  const panelW = 0.80
  const panelH = 0.48

  return (
    <VRHud offset={[0, 0, -1.5]} drag={{ id: 'hint', width: panelW, top: panelH / 2 }}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#6a4a00" transparent opacity={0.90} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>
      <Text position={[0, panelH / 2 - 0.055, 0.003]} fontSize={0.034} color="#F0A500" anchorX="center" anchorY="middle" maxWidth={panelW - 0.08}>
        {t(stufe === 1 ? 'szene.hint1_titel' : 'szene.hint_titel')}
      </Text>
      <Text position={[0, 0.035, 0.003]} fontSize={0.024} color="rgba(255,255,255,0.80)" anchorX="center" anchorY="middle" maxWidth={panelW - 0.10} textAlign="center" lineHeight={1.45}>
        {t(stufe === 1 ? 'szene.hint1_text' : 'szene.hint_text', { count: hintCount })}
      </Text>
      <Text position={[0, -0.095, 0.003]} fontSize={0.019} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle" maxWidth={panelW - 0.10} textAlign="center">
        {t(stufe === 1 ? 'szene.hint1_dauer' : 'szene.hint_dauer')}
      </Text>
      <VRButton
        label={t('scoring.abbrechen')}
        position={[-0.19, -panelH / 2 + 0.070, 0.002]}
        width={0.34}
        height={0.075}
        color="#1a1a2a"
        hoverColor="#333355"
        textColor="rgba(255,255,255,0.65)"
        fontSize={0.027}
        onClick={onAbbrechen}
      />
      <VRButton
        label={t('szene.hint_bestätigen')}
        position={[0.19, -panelH / 2 + 0.070, 0.002]}
        width={0.34}
        height={0.075}
        color="#7a5500"
        hoverColor="#F0A500"
        textColor="#ffffff"
        fontSize={0.027}
        onClick={onBestätigen}
      />
    </VRHud>
  )
}

// ── VR: Klick-Feedback ───────────────────────────────────────────────────────
interface VRFeedbackProps {
  type:    KlickFeedbackType
  onClose: () => void
  t:       TFunction
}

// Texte via i18n-Key (identisch zum Browser-KlickFeedback), Farbe/Dauer VR-spezifisch.
const VR_FEEDBACK_CFG: Record<KlickFeedbackType, { bg: string; titleKey: string; subKey: string; dauer: number }> = {
  kein_treffer:     { bg: '#141820', titleKey: 'szene.kein_treffer',     subKey: 'szene.kein_treffer_sub',     dauer: 2000 },
  bereits_gefunden: { bg: '#003060', titleKey: 'szene.bereits_gefunden', subKey: '',                            dauer: 2000 },
  kategorie_falsch: { bg: '#6a3800', titleKey: 'szene.kategorie_falsch',  subKey: 'szene.kategorie_falsch_sub', dauer: 1800 },
  richtig:          { bg: '#0f4a12', titleKey: 'szene.kategorie_richtig', subKey: 'szene.weiter_bewertung',     dauer: 1500 },
}

function VRFeedback({ type, onClose, t }: VRFeedbackProps) {
  const cfg      = VR_FEEDBACK_CFG[type]
  const sub        = cfg.subKey ? t(cfg.subKey) : ''
  const hasSubtext = sub.length > 0
  const panelH   = hasSubtext ? 0.19 : 0.13

  useEffect(() => {
    const timer = setTimeout(onClose, cfg.dauer)
    return () => clearTimeout(timer)
  }, [onClose, cfg.dauer])

  return (
    <VRHud offset={[0, 0.06, -1.5]}>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.76, panelH + 0.012]} />
        <meshBasicMaterial color="rgba(255,255,255,0.18)" transparent opacity={0.30} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.75, panelH]} />
        <meshBasicMaterial color={cfg.bg} transparent opacity={0.95} />
      </mesh>
      <Text position={[0, hasSubtext ? 0.042 : 0, 0.003]} fontSize={0.034} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.68}>
        {t(cfg.titleKey)}
      </Text>
      {hasSubtext && (
        <Text position={[0, -0.042, 0.003]} fontSize={0.026} color="rgba(255,255,255,0.75)" anchorX="center" anchorY="middle" maxWidth={0.68}>
          {sub}
        </Text>
      )}
    </VRHud>
  )
}

// ── VR: Bewertungs-Panels (v0.8.1, Fix fuer VR-Hang nach Kategorie) ─────────
// Drei Schritte analog zu HTML-Overlays im Browser:
//   1. VRBewertungWPanel — Wichtigkeit (klein / mittel / gross) + Tabellen-Hinweis
//   2. VRBewertungAPanel — Abweichung (3 Optionen mit Beschreibung)
//   3. VRBewertungNPanel — NACA-Schwere (leicht / mittel / schwer)

interface VRBewertungWPanelProps {
  kriteriumLabel: string
  kontextLabel:   string
  onSelect:       (w: RSIDimension) => void
  onCancel:       () => void
  t:              TFunction
}

function VRBewertungWPanel({ kriteriumLabel, kontextLabel, onSelect, onCancel, t }: VRBewertungWPanelProps) {
  const options: { val: RSIDimension; labelKey: string }[] = [
    { val: 'klein',  labelKey: 'scoring.dim_klein'  },
    { val: 'mittel', labelKey: 'scoring.dim_mittel' },
    { val: 'gross',  labelKey: 'scoring.dim_gross'  },
  ]
  const btnH    = 0.080
  const btnGap  = 0.010
  const btnStep = btnH + btnGap
  const headerH = 0.20
  const footerH = 0.075
  const panelH  = headerH + options.length * btnStep + footerH + 0.04
  const panelW  = 0.80

  return (
    <VRHud offset={[0, 0, -1.5]} drag={{ id: 'bewertung', width: panelW, top: panelH / 2 }}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#1a3060" transparent opacity={0.90} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>
      <Text position={[0, panelH / 2 - 0.040, 0.003]} fontSize={0.018} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        {`${t('scoring.bewertung_schritt', { nr: 1 })} · ${t('scoring.methodik_schritt', { schritt: 1 })} — ${t('scoring.phase_a')}`}
      </Text>
      <Text position={[0, panelH / 2 - 0.080, 0.003]} fontSize={0.034} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={panelW - 0.08}>
        {t('scoring.wie_wichtig')}
      </Text>
      <Text position={[0, panelH / 2 - 0.120, 0.003]} fontSize={0.022} color="rgba(255,255,255,0.55)" anchorX="center" anchorY="middle" maxWidth={panelW - 0.08}>
        {kriteriumLabel} · {kontextLabel}
      </Text>
      {options.map((o, i) => (
        <VRButton
          key={o.val}
          label={t(o.labelKey)}
          position={[0, panelH / 2 - headerH - 0.02 - i * btnStep, 0.002]}
          width={panelW - 0.08}
          height={btnH}
          color="#131826"
          hoverColor="#0076BD"
          fontSize={0.034}
          onClick={() => onSelect(o.val)}
        />
      ))}
      <VRButton
        label={t('scoring.abbrechen')}
        position={[0, -panelH / 2 + 0.050, 0.002]}
        width={panelW - 0.08}
        height={0.060}
        color="#1a1a2a"
        hoverColor="#333355"
        textColor="rgba(255,255,255,0.55)"
        fontSize={0.026}
        onClick={onCancel}
      />
    </VRHud>
  )
}

interface VRBewertungAOption {
  wert:         RSIDimension
  label:        string
  beschreibung: string
}

interface VRBewertungAPanelProps {
  options:  VRBewertungAOption[]
  onSelect: (a: RSIDimension) => void
  onCancel: () => void
  t:        TFunction
}

function VRBewertungAPanel({ options, onSelect, onCancel, t }: VRBewertungAPanelProps) {
  const btnH    = 0.110
  const btnGap  = 0.010
  const btnStep = btnH + btnGap
  const headerH = 0.16
  const footerH = 0.075
  const panelH  = headerH + options.length * btnStep + footerH + 0.04
  const panelW  = 0.86

  return (
    <VRHud offset={[0, 0, -1.5]} drag={{ id: 'bewertung', width: panelW, top: panelH / 2 }}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#1a3060" transparent opacity={0.90} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>
      <Text position={[0, panelH / 2 - 0.040, 0.003]} fontSize={0.018} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        {`${t('scoring.bewertung_schritt', { nr: 2 })} · ${t('scoring.methodik_schritt', { schritt: 3 })} — ${t('scoring.phase_b')}`}
      </Text>
      <Text position={[0, panelH / 2 - 0.082, 0.003]} fontSize={0.032} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={panelW - 0.08}>
        {t('scoring.wie_abweichung')}
      </Text>
      {options.map((o, i) => {
        const yTop = panelH / 2 - headerH - 0.02 - i * btnStep
        return (
          <group key={o.wert} position={[0, yTop - btnH / 2, 0.002]}>
            <VRButton
              label=""
              position={[0, 0, 0]}
              width={panelW - 0.08}
              height={btnH}
              color="#131826"
              hoverColor="#0076BD"
              onClick={() => onSelect(o.wert)}
            />
            <Text position={[-(panelW - 0.12) / 2, 0.022, 0.004]} fontSize={0.028} color="#ffffff" anchorX="left" anchorY="middle" maxWidth={panelW - 0.12}>
              {o.label}
            </Text>
            <Text position={[-(panelW - 0.12) / 2, -0.018, 0.004]} fontSize={0.020} color="rgba(255,255,255,0.60)" anchorX="left" anchorY="middle" maxWidth={panelW - 0.12}>
              {o.beschreibung}
            </Text>
          </group>
        )
      })}
      <VRButton
        label={t('scoring.abbrechen')}
        position={[0, -panelH / 2 + 0.050, 0.002]}
        width={panelW - 0.08}
        height={0.060}
        color="#1a1a2a"
        hoverColor="#333355"
        textColor="rgba(255,255,255,0.55)"
        fontSize={0.026}
        onClick={onCancel}
      />
    </VRHud>
  )
}

interface VRBewertungNOption {
  wert:     NACADimension
  labelKey: string
  subKey:   string
  color:    string
}

interface VRBewertungNPanelProps {
  onSelect: (n: NACADimension) => void
  onCancel: () => void
  t:        TFunction
}

const VR_NACA_OPTIONS: VRBewertungNOption[] = [
  { wert: 'leicht', labelKey: 'scoring.naca_leicht', subKey: 'scoring.naca_leicht_sub', color: '#1A7F1F' },
  { wert: 'mittel', labelKey: 'scoring.naca_mittel', subKey: 'scoring.naca_mittel_sub', color: '#B87300' },
  { wert: 'schwer', labelKey: 'scoring.naca_schwer', subKey: 'scoring.naca_schwer_sub', color: '#D40053' },
]

function VRBewertungNPanel({ onSelect, onCancel, t }: VRBewertungNPanelProps) {
  const btnH    = 0.110
  const btnGap  = 0.010
  const btnStep = btnH + btnGap
  const headerH = 0.19
  const footerH = 0.075
  const panelH  = headerH + VR_NACA_OPTIONS.length * btnStep + footerH + 0.04
  const panelW  = 0.86

  return (
    <VRHud offset={[0, 0, -1.5]} drag={{ id: 'bewertung', width: panelW, top: panelH / 2 }}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#1a3060" transparent opacity={0.90} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>
      <Text position={[0, panelH / 2 - 0.040, 0.003]} fontSize={0.018} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        {`${t('scoring.bewertung_schritt', { nr: 3 })} · ${t('scoring.methodik_schritt', { schritt: 7 })} — ${t('scoring.phase_d')}`}
      </Text>
      <Text position={[0, panelH / 2 - 0.082, 0.003]} fontSize={0.032} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={panelW - 0.08}>
        {t('scoring.wie_schwer')}
      </Text>
      <Text position={[0, panelH / 2 - 0.122, 0.003]} fontSize={0.020} color="rgba(255,255,255,0.50)" anchorX="center" anchorY="middle" maxWidth={panelW - 0.08}>
        {t('scoring.stell_dir_vor')}
      </Text>
      {VR_NACA_OPTIONS.map((o, i) => {
        const yTop = panelH / 2 - headerH - 0.02 - i * btnStep
        return (
          <group key={o.wert} position={[0, yTop - btnH / 2, 0.002]}>
            <VRButton
              label=""
              position={[0, 0, 0]}
              width={panelW - 0.08}
              height={btnH}
              color="#131826"
              hoverColor={o.color}
              onClick={() => onSelect(o.wert)}
            />
            <Text position={[-(panelW - 0.12) / 2, 0.022, 0.004]} fontSize={0.030} color={o.color} anchorX="left" anchorY="middle" maxWidth={panelW - 0.12}>
              {t(o.labelKey)}
            </Text>
            <Text position={[-(panelW - 0.12) / 2, -0.020, 0.004]} fontSize={0.020} color="rgba(255,255,255,0.60)" anchorX="left" anchorY="middle" maxWidth={panelW - 0.12}>
              {t(o.subKey)}
            </Text>
          </group>
        )
      })}
      <VRButton
        label={t('scoring.abbrechen')}
        position={[0, -panelH / 2 + 0.050, 0.002]}
        width={panelW - 0.08}
        height={0.060}
        color="#1a1a2a"
        hoverColor="#333355"
        textColor="rgba(255,255,255,0.55)"
        fontSize={0.026}
        onClick={onCancel}
      />
    </VRHud>
  )
}

// ── VR: Matrix-Herleitung (v0.9.1, VR-Iter 5) ───────────────────────────────
// 3×3-Matrix als R3F-Grid, visuell an die Browser-CompactMatrix angelehnt
// (Wiedererkennung): User-Schnittpunkt gruen gefuellt (korrekt) bzw. rot (falsch),
// korrekte Zelle gruen umrandet, User-Achsen dezent hervorgehoben.
const VR_RESULT_COLOR: Record<ResultDimension, string> = {
  hoch:   '#D40053',
  mittel: '#B87300',
  gering: '#1A7F1F',
}

function resultLabelShort(v: ResultDimension, t: TFunction): string {
  return t(v === 'hoch' ? 'scoring.result_hoch' : v === 'mittel' ? 'scoring.result_mittel' : 'scoring.result_gering')
}

// Achsen-Beschriftungen pro Matrix-Typ (Reihenfolge = Modell-Reihenfolge)
function vrMatrixLabels(model: MatrixModel, t: TFunction): {
  rowLabels: string[]; colLabels: string[]; xLabel: string; yLabel: string
} {
  if (model.type === 'relevanz') {
    return {
      rowLabels: model.rows.map(r => dimLabelShort(r as RSIDimension, t)),
      colLabels: model.cols.map(c => dimLabelShort(c as RSIDimension, t)),
      xLabel:    t('scoring.matrix_abweichung'),
      yLabel:    t('scoring.matrix_wichtigkeit'),
    }
  }
  return {
    rowLabels: model.rows.map(r => resultLabelShort(r as ResultDimension, t)),
    colLabels: model.cols.map(c => nacaLabelShort(c as NACADimension, t)),
    xLabel:    t('scoring.matrix_unfallschwere'),
    yLabel:    t('scoring.matrix_relevanz'),
  }
}

interface VRMatrixProps {
  model: MatrixModel
  titel: string
  t:     TFunction
}

// Layout-Konstanten (Meter im Panel-Raum)
const MX_LABEL_W = 0.15
const MX_CELL_W  = 0.17
const MX_CELL_H  = 0.060
const MX_GAP     = 0.006
const MX_GRID_W  = MX_LABEL_W + 3 * MX_CELL_W + 3 * MX_GAP
/** Gesamthoehe eines VRMatrix-Blocks (Titel + X-Label + Header + 3 Zeilen). */
export const MX_BLOCK_H = 0.040 + 0.028 + 0.038 + 3 * (MX_CELL_H + MX_GAP)

// Rendert eine Matrix, oben-zentriert bei y=0 (waechst nach unten).
function VRMatrix({ model, titel, t }: VRMatrixProps) {
  const { rowLabels, colLabels, xLabel, yLabel } = vrMatrixLabels(model, t)
  const gridLeft = -MX_GRID_W / 2
  // X-Positionen: Zeilen-Label-Spalte + 3 Zellen-Spalten (Zentren)
  const colX = (ci: number) => gridLeft + MX_LABEL_W + MX_GAP + ci * (MX_CELL_W + MX_GAP) + MX_CELL_W / 2
  const labelX = gridLeft + MX_LABEL_W / 2
  // Y-Positionen (von oben): Titel, X-Achsen-Label, Spalten-Header, Zeilen
  const yTitel  = -0.020
  const yXAxis  = -0.054
  const yHeader = -0.088
  const rowY = (ri: number) => yHeader - 0.019 - MX_GAP - ri * (MX_CELL_H + MX_GAP) - MX_CELL_H / 2

  return (
    <group>
      <Text position={[0, yTitel, 0.003]} fontSize={0.026} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={MX_GRID_W}>
        {titel}
      </Text>
      <Text position={[colX(1), yXAxis, 0.003]} fontSize={0.017} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        {`${xLabel} →`}
      </Text>
      {/* Y-Achsen-Label vertikal links */}
      <Text
        position={[gridLeft - 0.020, rowY(1), 0.003]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.017}
        color="rgba(255,255,255,0.45)"
        anchorX="center"
        anchorY="middle"
      >
        {`← ${yLabel}`}
      </Text>
      {/* Spalten-Header */}
      {model.cols.map((col, ci) => {
        const istUserCol = col === model.userCol
        return (
          <group key={`h-${String(col)}`} position={[colX(ci), yHeader, 0]}>
            <mesh>
              <planeGeometry args={[MX_CELL_W, 0.034]} />
              <meshBasicMaterial color={istUserCol ? '#0a2438' : '#131826'} transparent opacity={0.95} />
            </mesh>
            <Text position={[0, 0, 0.002]} fontSize={0.017} color={istUserCol ? '#66a6e0' : 'rgba(255,255,255,0.55)'} anchorX="center" anchorY="middle">
              {colLabels[ci]}
            </Text>
          </group>
        )
      })}
      {/* Zeilen: Zeilen-Label + 3 Zellen */}
      {model.rows.map((row, ri) => {
        const istUserRow = row === model.userRow
        return (
          <group key={`r-${String(row)}`}>
            <group position={[labelX, rowY(ri), 0]}>
              <mesh>
                <planeGeometry args={[MX_LABEL_W, MX_CELL_H]} />
                <meshBasicMaterial color={istUserRow ? '#0a2438' : '#131826'} transparent opacity={0.95} />
              </mesh>
              <Text position={[0, 0, 0.002]} fontSize={0.017} color={istUserRow ? '#66a6e0' : 'rgba(255,255,255,0.55)'} anchorX="center" anchorY="middle" maxWidth={MX_LABEL_W - 0.01}>
                {rowLabels[ri]}
              </Text>
            </group>
            {model.cols.map((col, ci) => {
              const zelle = model.cells[ri * model.cols.length + ci]
              const wertFarbe = VR_RESULT_COLOR[zelle.value]
              let bg = '#0d1120'; let rand = '#1a2030'; let farbe = wertFarbe
              let prefix = ''; let dimmen = true
              if (zelle.userCorrect)        { bg = '#1A7F1F'; rand = '#25a029'; farbe = '#ffffff'; prefix = '✓ '; dimmen = false }
              else if (zelle.userWrong)     { bg = '#2a1010'; rand = '#D40053'; farbe = '#D40053'; prefix = '✗ '; dimmen = false }
              else if (zelle.correctMarker) { bg = '#0f2818'; rand = '#1A7F1F'; farbe = '#1A7F1F'; prefix = '✓ '; dimmen = false }
              else if (zelle.axisHighlight) { bg = '#131826'; rand = '#25476a'; dimmen = false }
              return (
                <group key={`c-${String(row)}-${String(col)}`} position={[colX(ci), rowY(ri), 0]}>
                  <mesh position={[0, 0, -0.001]}>
                    <planeGeometry args={[MX_CELL_W + 0.004, MX_CELL_H + 0.004]} />
                    <meshBasicMaterial color={rand} transparent opacity={0.95} />
                  </mesh>
                  <mesh>
                    <planeGeometry args={[MX_CELL_W, MX_CELL_H]} />
                    <meshBasicMaterial color={bg} transparent opacity={0.96} />
                  </mesh>
                  <Text
                    position={[0, 0, 0.002]}
                    fontSize={0.018}
                    color={farbe}
                    fillOpacity={dimmen ? 0.55 : 1}
                    anchorX="center"
                    anchorY="middle"
                  >
                    {`${prefix}${resultLabelShort(zelle.value, t)}`}
                  </Text>
                </group>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

// ── VR: Scoring-Summary-Panel (v0.8.2, VR-Iter 3) ──────────────────────────
// Zeigt nach abgeschlossener Bewertung ein Ergebnis-Panel im VR, damit der
// User in der Session bleibt. Der volle HTML-ScoringFlow mit Matrix-Erklärung
// startet im Browser nur wenn kein VR aktiv ist (siehe App.handleDeficitConfirmed).

export interface VRScoringSummary {
  deficitName:        string
  punkteFinal:        number
  maxPunkte:          number
  kategorieRichtig:   boolean
  wichtigkeitKorrekt: boolean
  abweichungKorrekt:  boolean
  nacaKorrekt:        boolean
  userW:   RSIDimension
  userA:   RSIDimension
  userN:   NACADimension
  correctW: RSIDimension
  correctA: RSIDimension
  correctN: NACADimension
  // v0.9.1 (VR-Iter 5): fuer Lernkarte- und Herleitungs-Seite im VR-Panel
  deficit: AppDeficit
  lang:    string
  // v0.9.5: fuer den Punkte-Aufriss (identisch zum Browser-Ergebnis)
  hintPenalty:    boolean
  /** v0.10.0: effektiver Hinweis-Abzug (0/10/25); Fallback hintPenalty ? 25 : 0 */
  hintAbzug?:     number
  boosterProzent: number
}

interface VRScoringSummaryPanelProps {
  summary:    VRScoringSummary
  onContinue: () => void
  t:          TFunction
}

function dimLabelShort(d: RSIDimension, t: TFunction): string {
  return t(d === 'gross' ? 'scoring.dim_gross' : d === 'mittel' ? 'scoring.dim_mittel' : 'scoring.dim_klein')
}
function nacaLabelShort(n: NACADimension, t: TFunction): string {
  return t(n === 'leicht' ? 'scoring.schwere_leicht' : n === 'mittel' ? 'scoring.schwere_mittel' : 'scoring.schwere_schwer')
}

// Zeilen-Schätzung für Lernkarten-Texte: troika bricht selbst um, die
// Schätzung dient nur der Panel-Höhen-Berechnung.
function schaetzeZeilen(text: string, zeichenProZeile: number, maxZeilen: number): number {
  if (!text) return 0
  return Math.min(maxZeilen, Math.max(1, Math.ceil(text.length / zeichenProZeile)))
}

type SummarySeite = 'ergebnis' | 'herleitung' | 'lernkarte'

function VRScoringSummaryPanel({ summary, onContinue, t }: VRScoringSummaryPanelProps) {
  // v0.9.1 (VR-Iter 5): drei Seiten — Ergebnis, Matrix-Herleitung, Lernkarte.
  // Gleicher Ablauf wie im Browser (Ergebnis mit Matrizen, danach Lernkarte),
  // damit VR und Browser dieselbe Didaktik zeigen (Wiedererkennung).
  const [seite, setSeite] = useState<SummarySeite>('ergebnis')

  const allCorrect = summary.kategorieRichtig
    && summary.wichtigkeitKorrekt
    && summary.abweichungKorrekt
    && summary.nacaKorrekt

  // v0.9.3: bei falscher Kategorie die korrekte anzeigen (vorher nur «—»)
  const korrekteKategorie = summary.deficit.kategorie
    ? t(`kategorie.${summary.deficit.kategorie}`)
    : '—'
  // v0.9.5: Punkte-Beitrag pro Zeile — dieselben Gewichte wie die Berechnung
  // (STEP_WEIGHTS Schritte 1/3/7 + KATEGORIE_PUNKTE), damit die Zeilensumme
  // exakt auf punkteFinal aufgeht (inkl. Hinweis-Abzug und Booster unten).
  const wPkt = Math.round(STEP_WEIGHTS[0] * STEP_WEIGHT_UNIT)
  const aPkt = Math.round(STEP_WEIGHTS[2] * STEP_WEIGHT_UNIT)
  const nPkt = Math.round(STEP_WEIGHTS[6] * STEP_WEIGHT_UNIT)
  const rows: { label: string; user: string; correct: string; ok: boolean; pkt: number }[] = [
    { label: t('vr.kategorie'),   user: summary.kategorieRichtig ? t('vr.richtig') : t('vr.falsch'),
      correct: summary.kategorieRichtig ? t('vr.richtig') : korrekteKategorie, ok: summary.kategorieRichtig,
      pkt: summary.kategorieRichtig ? KATEGORIE_PUNKTE : KATEGORIE_TEILPUNKTE },
    { label: t('scoring.phase_a'), user: dimLabelShort(summary.userW, t),
      correct: dimLabelShort(summary.correctW, t), ok: summary.wichtigkeitKorrekt,
      pkt: summary.wichtigkeitKorrekt ? wPkt : 0 },
    { label: t('scoring.phase_b'),  user: dimLabelShort(summary.userA, t),
      correct: dimLabelShort(summary.correctA, t), ok: summary.abweichungKorrekt,
      pkt: summary.abweichungKorrekt ? aPkt : 0 },
    { label: t('scoring.phase_d'), user: nacaLabelShort(summary.userN, t),
      correct: nacaLabelShort(summary.correctN, t), ok: summary.nacaKorrekt,
      pkt: summary.nacaKorrekt ? nPkt : 0 },
  ]
  // Abzug/Bonus-Zeilen unter der Tabelle (nur wenn zutreffend)
  const hintAbzugPkt = summary.hintAbzug ?? (summary.hintPenalty ? HINT_ABZUG_HOTSPOTS : 0)
  const vorBonus     = Math.max(0, rows.reduce((s, r) => s + r.pkt, 0) - hintAbzugPkt)
  const boosterPkt   = summary.punkteFinal - vorBonus
  const extraZeilen  = (summary.hintPenalty ? 1 : 0) + (summary.boosterProzent > 0 && boosterPkt !== 0 ? 1 : 0)

  const panelW  = 0.88
  const rowH    = 0.050
  const rowGap  = 0.010
  const headerH = 0.17
  const footerH = 0.12

  // ── Herleitung: Matrizen aus dem gemeinsamen Modell (wie Browser) ──────────
  const ca            = summary.deficit.correctAssessment
  const abgeleitet    = deriveErgebnisse(summary.userW, summary.userA, summary.userN)
  const relevanzMatrix = buildRelevanzMatrix(summary.userW, summary.userA, summary.correctW, summary.correctA)
  const risikoMatrix   = buildRisikoMatrix(abgeleitet.relevanzSD, summary.userN, ca.relevanzSD, summary.correctN)

  // ── Lernkarte: Inhalte wie Browser-LernKarte ───────────────────────────────
  const d              = summary.deficit
  const kriteriumLabel = KRITERIUM_LABELS[d.kriteriumId] ?? d.kriteriumId
  const kontextLabel   = t(d.kontext === 'io' ? 'einstieg.kontext_io' : 'einstieg.kontext_ao')
  const normRefs       = d.normRefs.slice(0, 4)
  const weitereRefs    = d.normRefs.length - normRefs.length
  const erklaerung     = d.erklaerungI18n ? ml(d.erklaerungI18n, summary.lang).trim() : ''
  const beschreibung   = ml(d.beschreibungI18n, summary.lang).trim()

  // Lernkarten-Layout: Offsets von der Panel-Oberkante (anchorY top)
  const nameZeilen   = schaetzeZeilen(summary.deficitName, 38, 2)
  const erklZeilen   = schaetzeZeilen(erklaerung, 62, 8)
  const beschrZeilen = schaetzeZeilen(beschreibung, 70, 5)
  const lk = (() => {
    let cur = 0.040
    const titelY = cur; cur += 0.034
    const nameY = cur; cur += nameZeilen * 0.040 + 0.012
    const kritY = cur; cur += 0.040
    let normLabelY = 0; let normStartY = 0
    if (normRefs.length > 0) {
      normLabelY = cur + 0.008; cur += 0.008 + 0.030
      normStartY = cur
      cur += normRefs.length * 0.030 + (weitereRefs > 0 ? 0.030 : 0) + 0.008
    }
    let erklLabelY = 0; let erklY = 0
    if (erklaerung) {
      erklLabelY = cur + 0.012; cur += 0.012 + 0.030
      erklY = cur; cur += erklZeilen * 0.031 + 0.010
    }
    let beschrY = 0
    if (beschreibung) {
      beschrY = cur + 0.008; cur += 0.008 + beschrZeilen * 0.028 + 0.008
    }
    return { titelY, nameY, kritY, normLabelY, normStartY, erklLabelY, erklY, beschrY, contentH: cur }
  })()

  // ── Panel-Höhe pro Seite ───────────────────────────────────────────────────
  const ergebnisH   = headerH + rows.length * (rowH + rowGap) + extraZeilen * 0.036 + footerH
  const herleitungH = 0.055 + MX_BLOCK_H + 0.030 + MX_BLOCK_H + 0.125
  const lernkarteH  = lk.contentH + 0.125
  const panelH = seite === 'ergebnis' ? ergebnisH : seite === 'herleitung' ? herleitungH : lernkarteH

  const randFarbe = seite === 'ergebnis' ? (allCorrect ? '#083a0c' : '#3a1808') : '#1a3060'

  // Footer: zwei Buttons nebeneinander (links Navigation, rechts weiter)
  const footerY = -panelH / 2 + 0.055
  const btnW = 0.37
  const btnX = 0.205

  return (
    <VRHud offset={[0, 0, -1.5]} drag={{ id: 'summary', width: panelW, top: panelH / 2 }}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color={randFarbe} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>

      {seite === 'ergebnis' && (
        <>
          {/* Header */}
          <Text position={[0, panelH / 2 - 0.040, 0.003]} fontSize={0.018} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
            {t('vr.bewertung_abgeschlossen')}
          </Text>
          <Text
            position={[0, panelH / 2 - 0.080, 0.003]}
            fontSize={0.034}
            color={allCorrect ? '#1A7F1F' : '#F0A500'}
            anchorX="center"
            anchorY="middle"
            maxWidth={panelW - 0.08}
          >
            {allCorrect ? t('vr.alles_richtig') : t('vr.teilweise_korrekt')}
          </Text>
          <Text position={[0, panelH / 2 - 0.120, 0.003]} fontSize={0.030} color="#ffffff" anchorX="center" anchorY="middle">
            {t('vr.punkte', { final: summary.punkteFinal, max: summary.maxPunkte })}
          </Text>

          {/* Zeilen: User-Wert vs korrekter Wert */}
          {rows.map((r, i) => {
            const y = panelH / 2 - headerH - (i + 0.5) * (rowH + rowGap)
            return (
              <group key={r.label} position={[0, y, 0.003]}>
                {/* Zeilen-Hintergrund */}
                <mesh>
                  <planeGeometry args={[panelW - 0.04, rowH]} />
                  <meshBasicMaterial color={r.ok ? '#0f2818' : '#2a1010'} transparent opacity={0.55} />
                </mesh>
                <Text position={[-(panelW - 0.04) / 2 + 0.020, 0, 0.001]} fontSize={0.020} color={r.ok ? '#1A7F1F' : '#D40053'} anchorX="left" anchorY="middle">
                  {r.ok ? '✓' : '✗'}
                </Text>
                <Text position={[-(panelW - 0.04) / 2 + 0.055, 0, 0.001]} fontSize={0.020} color="rgba(255,255,255,0.80)" anchorX="left" anchorY="middle">
                  {r.label}
                </Text>
                <Text position={[0.02, 0, 0.001]} fontSize={0.020} color="rgba(255,255,255,0.70)" anchorX="left" anchorY="middle">
                  {t('vr.du', { wert: r.user })}
                </Text>
                {!r.ok && (
                  <Text position={[0.17, 0, 0.001]} fontSize={0.018} color="#1A7F1F" anchorX="left" anchorY="middle" maxWidth={0.17} lineHeight={1.1}>
                    {t('vr.korrekt', { wert: r.correct })}
                  </Text>
                )}
                {/* v0.9.5: Punkte-Beitrag rechts — Zeilensumme = Endpunkte */}
                <Text position={[(panelW - 0.04) / 2 - 0.015, 0, 0.001]} fontSize={0.019} color={r.ok ? '#1A7F1F' : '#D40053'} anchorX="right" anchorY="middle">
                  {r.pkt > 0 ? `+${r.pkt}` : '0'}
                </Text>
              </group>
            )
          })}

          {/* v0.9.5: Hinweis-Abzug und Booster-Bonus als eigene Zeilen */}
          {(() => {
            const yBasis = panelH / 2 - headerH - rows.length * (rowH + rowGap)
            const zeilen: { label: string; wert: string; farbe: string }[] = []
            if (summary.hintPenalty) {
              zeilen.push({ label: t('scoring.hinweis_genutzt'), wert: `−${hintAbzugPkt}`, farbe: '#F0A500' })
            }
            if (summary.boosterProzent > 0 && boosterPkt !== 0) {
              zeilen.push({ label: `${t('scoring.booster')} (+${summary.boosterProzent} %)`, wert: `+${boosterPkt}`, farbe: '#1A7F1F' })
            }
            return zeilen.map((z, i) => (
              <group key={z.label} position={[0, yBasis - 0.010 - i * 0.036, 0.003]}>
                <Text position={[-(panelW - 0.04) / 2 + 0.020, 0, 0.001]} fontSize={0.019} color={z.farbe} anchorX="left" anchorY="middle" maxWidth={panelW - 0.20}>
                  {z.label}
                </Text>
                <Text position={[(panelW - 0.04) / 2 - 0.015, 0, 0.001]} fontSize={0.019} color={z.farbe} anchorX="right" anchorY="middle">
                  {z.wert}
                </Text>
              </group>
            ))
          })()}

          <VRButton
            label={t('scoring.herleitung')}
            position={[-btnX, footerY, 0.002]}
            width={btnW}
            height={0.075}
            color="#131826"
            hoverColor="#0076BD"
            textColor="rgba(255,255,255,0.85)"
            fontSize={0.028}
            onClick={() => setSeite('herleitung')}
          />
          <VRButton
            label={t('scoring.weiter')}
            position={[btnX, footerY, 0.002]}
            width={btnW}
            height={0.075}
            color={allCorrect ? '#1A7F1F' : '#0076BD'}
            hoverColor={allCorrect ? '#25a029' : '#1a8cd8'}
            fontSize={0.028}
            onClick={onContinue}
          />
        </>
      )}

      {seite === 'herleitung' && (
        <>
          <group position={[0, panelH / 2 - 0.030, 0]}>
            <VRMatrix model={relevanzMatrix} titel={t('scoring.relevanz_matrix_kurz')} t={t} />
          </group>
          <group position={[0, panelH / 2 - 0.030 - MX_BLOCK_H - 0.030, 0]}>
            <VRMatrix model={risikoMatrix} titel={t('scoring.unfallrisiko_matrix_kurz')} t={t} />
          </group>
          <VRButton
            label={t('einstieg.zurück')}
            position={[-btnX, footerY, 0.002]}
            width={btnW}
            height={0.075}
            color="#1a1a2a"
            hoverColor="#333355"
            textColor="rgba(255,255,255,0.65)"
            fontSize={0.028}
            onClick={() => setSeite('ergebnis')}
          />
          <VRButton
            label={t('lernkarte.titel')}
            position={[btnX, footerY, 0.002]}
            width={btnW}
            height={0.075}
            color="#131826"
            hoverColor="#0076BD"
            textColor="rgba(255,255,255,0.85)"
            fontSize={0.028}
            onClick={() => setSeite('lernkarte')}
          />
        </>
      )}

      {seite === 'lernkarte' && (
        <>
          <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.titelY, 0.003]} fontSize={0.018} color="#66a6e0" anchorX="left" anchorY="top">
            {t('lernkarte.titel').toUpperCase()}
          </Text>
          <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.nameY, 0.003]} fontSize={0.030} color="#ffffff" anchorX="left" anchorY="top" maxWidth={panelW - 0.10} lineHeight={1.25}>
            {summary.deficitName}
          </Text>
          <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.kritY, 0.003]} fontSize={0.020} color="rgba(255,255,255,0.55)" anchorX="left" anchorY="top" maxWidth={panelW - 0.10}>
            {`${kriteriumLabel} · ${kontextLabel}`}
          </Text>
          {normRefs.length > 0 && (
            <>
              <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.normLabelY, 0.003]} fontSize={0.016} color="rgba(255,255,255,0.40)" anchorX="left" anchorY="top">
                {t('lernkarte.normreferenz').toUpperCase()}
              </Text>
              {normRefs.map((ref, i) => (
                <Text key={ref} position={[-(panelW - 0.10) / 2, panelH / 2 - lk.normStartY - i * 0.030, 0.003]} fontSize={0.020} color="#66a6e0" anchorX="left" anchorY="top" maxWidth={panelW - 0.10}>
                  {`· ${ref}`}
                </Text>
              ))}
              {weitereRefs > 0 && (
                <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.normStartY - normRefs.length * 0.030, 0.003]} fontSize={0.018} color="rgba(255,255,255,0.40)" anchorX="left" anchorY="top">
                  {`+ ${weitereRefs}`}
                </Text>
              )}
            </>
          )}
          {erklaerung.length > 0 && (
            <>
              <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.erklLabelY, 0.003]} fontSize={0.016} color="rgba(102,166,224,0.75)" anchorX="left" anchorY="top">
                {t('lernkarte.erklaerung').toUpperCase()}
              </Text>
              <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.erklY, 0.003]} fontSize={0.021} color="rgba(255,255,255,0.80)" anchorX="left" anchorY="top" maxWidth={panelW - 0.10} lineHeight={1.4}>
                {erklaerung}
              </Text>
            </>
          )}
          {beschreibung.length > 0 && (
            <Text position={[-(panelW - 0.10) / 2, panelH / 2 - lk.beschrY, 0.003]} fontSize={0.019} color="rgba(255,255,255,0.55)" anchorX="left" anchorY="top" maxWidth={panelW - 0.10} lineHeight={1.4}>
              {beschreibung}
            </Text>
          )}
          <VRButton
            label={t('einstieg.zurück')}
            position={[-btnX, footerY, 0.002]}
            width={btnW}
            height={0.075}
            color="#1a1a2a"
            hoverColor="#333355"
            textColor="rgba(255,255,255,0.65)"
            fontSize={0.028}
            onClick={() => setSeite('herleitung')}
          />
          <VRButton
            label={t('scoring.weiter')}
            position={[btnX, footerY, 0.002]}
            width={btnW}
            height={0.075}
            color={allCorrect ? '#1A7F1F' : '#0076BD'}
            hoverColor={allCorrect ? '#25a029' : '#1a8cd8'}
            fontSize={0.028}
            onClick={onContinue}
          />
        </>
      )}
    </VRHud>
  )
}

// ── VR: Ray-Reticle (v0.8.1, Orientierungshilfe) ────────────────────────────
// Zeigt einen kleinen Ziel-Ring am letzten Hit-Punkt des Controller-Rays auf
// der Panorama-Sphere. Der User sieht so wo sein Ray landet.
interface VRRayReticleProps {
  position: THREE.Vector3 | null
}

function VRRayReticle({ position }: VRRayReticleProps) {
  if (!position) return null
  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Ring-Groessen in v0.8.2 (VR-Iter 3) verdoppelt — vorher zu dezent. */}
      <mesh renderOrder={999}>
        <ringGeometry args={[1.4, 1.75, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <mesh renderOrder={999}>
        <circleGeometry args={[0.35, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </Billboard>
  )
}

// ── VR: Alle-gefunden-Banner ─────────────────────────────────────────────────
function VRAllFound({ onBeenden, t }: { onBeenden: () => void; t: TFunction }) {
  return (
    <VRHud offset={[0, -0.22, -1.5]} drag={{ id: 'allfound', width: 0.82, top: 0.11 }}>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.82, 0.22]} />
        <meshBasicMaterial color="#083a0c" transparent opacity={0.95} />
      </mesh>
      <Text position={[0, 0.048, 0.003]} fontSize={0.032} color="#ffffff" anchorX="center" anchorY="middle">
        {t('szene.alle_gefunden')}
      </Text>
      <VRButton
        label={t('szene.beenden')}
        position={[0, -0.048, 0.003]}
        width={0.55}
        height={0.075}
        color="#1A7F1F"
        hoverColor="#25a029"
        fontSize={0.032}
        onClick={onBeenden}
      />
    </VRHud>
  )
}

// ── FOV-Sync (Zoom via Kamera-Perspektive) ───────────────────────────────────
function CameraSync({ fov }: { fov: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera, fov])
  return null
}

// ── Szenen-Inhalt (3D) ───────────────────────────────────────────────────────
interface SceneContentProps {
  scene:          AppScene
  deficits:       AppDeficit[]
  foundDeficits:  FoundDeficit[]
  hintStufe:      number
  onSphereClick:  (e: ThreeEvent<MouseEvent>) => void
  startblick?:    { theta: number; phi: number } | null
  onVRModeChange: (v: boolean) => void
  phase:          Phase
  feedbackType:   KlickFeedbackType
  progress:       { id: string; found: boolean }[]
  sceneName:      string
  sceneKontextLabel: string
  elapsedSec:     number
  onKategorieSelect: (k: DefizitKategorie) => void
  onKategorieCancel: () => void
  onFeedbackClose:   () => void
  onHintRequest:     (stufe: 1 | 2) => void
  hintDialogStufe:   1 | 2
  // v0.9.1: VR-Hinweis-Dialog (Bestaetigen aktiviert die Penalty, Abbrechen nicht)
  onHintConfirm:     () => void
  onHintCancel:      () => void
  onBeenden:         () => void
  aktivePerspektiveId: string | null
  aktiveBildUrl:       string | null | undefined
  pendingClickPos:     { theta: number; phi: number } | null
  onStandortWechsel:   (id: string | null) => void
  /** Set mit den bereits besuchten Perspektiven-IDs. '__haupt__' = Haupt-Panorama. */
  visitedPerspektiven: Set<string>
  hauptKey:            string
  // VR-Bewertung (v0.8.1): Daten + Callbacks fuer die drei Schritte
  hitDeficit:          AppDeficit | null
  onBewertungW:        (w: RSIDimension) => void
  onBewertungA:        (a: RSIDimension) => void
  onBewertungN:        (n: NACADimension) => void
  onBewertungCancel:   () => void
  // VR-Scoring-Summary (v0.8.2): Anzeige + Continue-Callback
  vrScoringFeedback:   VRScoringSummary | null
  onVRScoringContinue: () => void
  // i18n (v0.8.3): t als Prop, damit die VR-Panels im Canvas übersetzt sind.
  t:                   TFunction
}

function SceneContent({
  scene, deficits, foundDeficits, hintStufe,
  onSphereClick, startblick,
  onVRModeChange,
  phase, feedbackType, progress,
  sceneName, sceneKontextLabel, elapsedSec,
  onKategorieSelect, onKategorieCancel, onFeedbackClose,
  onHintRequest, hintDialogStufe, onHintConfirm, onHintCancel, onBeenden,
  aktivePerspektiveId, aktiveBildUrl, pendingClickPos, onStandortWechsel,
  visitedPerspektiven, hauptKey,
  hitDeficit, onBewertungW, onBewertungA, onBewertungN, onBewertungCancel,
  vrScoringFeedback, onVRScoringContinue,
  t,
}: SceneContentProps) {
  const foundIds    = new Set(foundDeficits.map(f => f.deficitId))
  const allFound    = foundDeficits.length === deficits.length
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // XR-Session direkt via useXR erkennen (keine Verzoegerung durch State-Update)
  const xrSession = useXR(s => s.session)
  const isInXR    = xrSession != null

  // VR-Ray-Reticle: letzter Hit-Punkt auf der Panorama-Sphere.
  // Im Browser nicht gebraucht — Maus-Cursor existiert nativ.
  const [aimPos, setAimPos] = useState<THREE.Vector3 | null>(null)
  const handleSpherePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isInXR) return
    // Schnittpunkt liegt auf der Sphere bei Radius 500. Auf Radius 60 normalisieren,
    // damit das Reticle in derselben Ebene wie Hotspots/Crosshair sitzt und gross
    // genug erscheint (sonst subtendiert der Ring bei r=500 nur ~0.4° — winzig).
    setAimPos(e.point.clone().normalize().multiplyScalar(60))
  }, [isInXR])
  const handleSpherePointerOut = useCallback(() => {
    if (!isInXR) return
    setAimPos(null)
  }, [isInXR])

  // HTML-Overlay-Zustand an SceneViewer weitergeben
  useEffect(() => {
    onVRModeChange(isInXR)
  }, [isInXR, onVRModeChange])

  // Startblick setzen (auch bei Perspektivenwechsel)
  // Stabile Werte extrahieren, damit useEffect nicht bei jeder Render-Referenz feuert
  const startTheta = startblick?.theta ?? null
  const startPhi   = startblick?.phi ?? null
  useEffect(() => {
    if (startTheta == null || startPhi == null) return
    const azimuth = -(startTheta * Math.PI / 180)
    // Innenperspektive: phi=0 (oben) → polar=π (Kamera unten, schaut hoch)
    const polar = Math.PI - (startPhi * Math.PI / 180)
    let active = true
    function apply() {
      if (!active) return
      if (controlsRef.current) {
        controlsRef.current.setAzimuthalAngle(azimuth)
        controlsRef.current.setPolarAngle(polar)
        controlsRef.current.update()
      } else {
        requestAnimationFrame(apply)
      }
    }
    // Immer einen Frame warten: OrbitControls initialisiert sich im selben Commit
    requestAnimationFrame(apply)
    return () => { active = false }
  }, [startTheta, startPhi])

  const bildUrl = aktiveBildUrl ?? scene.panoramaBildUrl ?? scene.bildUrl

  return (
    <>
      {/* Hintergrundfarbe: verhindert weissen Quest-Hintergrund wenn Scene kurz leer */}
      <color attach="background" args={['#000000']} />

      {/* OrbitControls nur im Browser-Modus aktiv */}
      <OrbitControls
        ref={controlsRef}
        enabled={!isInXR}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={-0.45}
        reverseOrbit={false}
      />

      {/* Panorama */}
      <PanoramaSphere
        bildUrl={bildUrl}
        onClick={onSphereClick}
        onPointerMove={isInXR ? handleSpherePointerMove : undefined}
        onPointerOut={isInXR ? handleSpherePointerOut : undefined}
      />

      {/* VR-Ray-Reticle (v0.8.1): zeigt wo der Controller-Ray landet */}
      {isInXR && phase === 'exploring' && <VRRayReticle position={aimPos} />}

      {/* Hotspots: gefundene Defizite immer grün, restliche nur bei aktivem Hint */}
      {deficits.map(d => {
        const isFound = foundIds.has(d.id)
        if (!isFound && hintStufe < 2) return null
        const renderPos = getHotspotPosition(d, aktivePerspektiveId)
        if (!renderPos) return null
        return <Hotspot key={d.id} position={renderPos} found={isFound} />
      })}

      {/* Standort-Navigationsmarker (Haupt-Panorama → Perspektiven)
          Nur in exploring/pendingConfirm sichtbar — sonst könnte ein Marker-Klick
          mitten in einer VR-Bewertung den Flow still abbrechen (Marker sind über
          den halbtransparenten Panels per Ray weiterhin treffbar). */}
      {(phase === 'exploring' || phase === 'pendingConfirm') && !aktivePerspektiveId && scene.perspektiven?.map((p, i) => {
        if (!p.standortPosition) return null
        const pos = sphericalToVector3(p.standortPosition, 60)
        const status: StandortMarkerStatus = visitedPerspektiven.has(p.id) ? 'besucht' : 'unbesucht'
        return (
          <StandortNavMarker
            key={`nav-${p.id}`}
            position={pos}
            label={p.label || t('szene.standort', { nr: i + 1 })}
            status={status}
            hintZiel={hintStufe >= 1 && standortHatOffeneDefizite(deficits, foundIds, p.id, aktivePerspektiveId)}
            onClick={() => onStandortWechsel(p.id)}
          />
        )
      })}

      {/* NavMarker (Perspektive → Haupt / andere Perspektiven) */}
      {(phase === 'exploring' || phase === 'pendingConfirm') && aktivePerspektiveId && (() => {
        const aktPersp = scene.perspektiven?.find(p => p.id === aktivePerspektiveId)
        if (!aktPersp?.navMarker) return null
        return Object.entries(aktPersp.navMarker).map(([zielId, markerPos]) => {
          const pos = sphericalToVector3(markerPos, 60)
          const zielPersp = scene.perspektiven?.find(p => p.id === zielId)
          const label = zielId === 'haupt'
            ? t('szene.haupt')
            : (zielPersp?.label || zielId)
          const visitedKey = zielId === 'haupt' ? hauptKey : zielId
          const status: StandortMarkerStatus = visitedPerspektiven.has(visitedKey) ? 'besucht' : 'unbesucht'
          return (
            <StandortNavMarker
              key={`nav-${zielId}`}
              position={pos}
              label={label}
              status={status}
              hintZiel={hintStufe >= 1 && standortHatOffeneDefizite(deficits, foundIds, zielId === 'haupt' ? null : zielId, aktivePerspektiveId)}
              onClick={() => onStandortWechsel(zielId === 'haupt' ? null : zielId)}
            />
          )
        })
      })()}

      {/* Pending-Klick-Marker: Fadenkreuz + dezenter Zielring
          Zeigt dem User PRÄZIS wo er hingeklickt hat. Klein genug, um beim
          Reinzoomen natürlich grösser zu werden und präzises Verorten zu
          ermöglichen (keine FOV-Kompensation). */}
      {pendingClickPos && (
        <Billboard position={sphericalToVector3(pendingClickPos, 60)} follow lockX={false} lockY={false} lockZ={false}>
          {/* Horizontale Linie */}
          <mesh>
            <planeGeometry args={[4.8, 0.22]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          {/* Vertikale Linie */}
          <mesh>
            <planeGeometry args={[0.22, 4.8]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          {/* Zentrumspunkt (präziser Zielpunkt) */}
          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.38, 16]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={1.0} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          {/* Dezenter Zielring aussen */}
          <mesh>
            <ringGeometry args={[1.9, 2.15, 48]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.55} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
        </Billboard>
      )}

      {/* ── VR-Panels: nur wenn XR-Session aktiv ──
          VRErrorBoundary verhindert dass Panel-Fehler die Scene crashen.
          Suspense faengt Font-Laden von Text-Komponenten ab. */}
      {isInXR && (
        <VRErrorBoundary>
          <Suspense fallback={null}>
            <VRProgressPanel
              sceneName={sceneName}
              kontext={sceneKontextLabel}
              foundCount={foundDeficits.length}
              totalCount={deficits.length}
              dots={progress}
              elapsedSec={elapsedSec}
            />
            {phase === 'exploring' && (
              <VRControlBar
                hintStufe={hintStufe}
                onHint={onHintRequest}
                onBeenden={onBeenden}
                t={t}
              />
            )}
            {allFound && phase === 'exploring' && (
              <VRAllFound onBeenden={onBeenden} t={t} />
            )}
            {phase === 'kategoriePanel' && (
              <VRKategoriePanel
                onSelect={onKategorieSelect}
                onCancel={onKategorieCancel}
                t={t}
              />
            )}
            {phase === 'vrHintDialog' && (
              <VRHintDialog
                hintCount={deficits.length - foundIds.size}
                stufe={hintDialogStufe}
                onBestätigen={onHintConfirm}
                onAbbrechen={onHintCancel}
                t={t}
              />
            )}
            {phase === 'klickFeedback' && (
              <VRFeedback
                type={feedbackType}
                onClose={onFeedbackClose}
                t={t}
              />
            )}
            {/* v0.8.1 Bugfix: Bewertungs-Phasen brauchten im VR eigene Panels.
                Im Browser sind das HTML-Overlays — die sind in VR unsichtbar
                und der Flow blieb nach Kategorie haengen. */}
            {phase === 'bewertungW' && hitDeficit && (() => {
              // v0.9.2: kein «Gemäss Tabelle»-Prefill mehr — der Hinweis zeigte
              // die korrekte Wichtigkeit an und nahm Schritt 1 die Bewertung ab.
              const kriteriumLabel = KRITERIUM_LABELS[hitDeficit.kriteriumId] ?? hitDeficit.kriteriumId
              const kontextLabel = t(hitDeficit.kontext === 'io' ? 'einstieg.kontext_io' : 'einstieg.kontext_ao')
              return (
                <VRBewertungWPanel
                  kriteriumLabel={kriteriumLabel}
                  kontextLabel={kontextLabel}
                  onSelect={onBewertungW}
                  onCancel={onBewertungCancel}
                  t={t}
                />
              )
            })()}
            {phase === 'bewertungA' && hitDeficit && (
              <VRBewertungAPanel
                options={ABWEICHUNG_I18N.map(o => ({
                  wert: o.wert,
                  label: t(o.labelKey),
                  beschreibung: t(o.beschreibungKey),
                }))}
                onSelect={onBewertungA}
                onCancel={onBewertungCancel}
                t={t}
              />
            )}
            {phase === 'bewertungN' && hitDeficit && (
              <VRBewertungNPanel onSelect={onBewertungN} onCancel={onBewertungCancel} t={t} />
            )}
            {phase === 'vrScoringSummary' && vrScoringFeedback && (
              <VRScoringSummaryPanel
                summary={vrScoringFeedback}
                onContinue={onVRScoringContinue}
                t={t}
              />
            )}
          </Suspense>
        </VRErrorBoundary>
      )}
    </>
  )
}

// ── Mini-Methodik-Referenz in den Bewertungs-Overlays (Review R-07) ──────────
// Nachschlagen ist Teil der RSI-Methode: aufklappbar, ohne Punktabzug.
// Schritt W zeigt bewusst nur die Begriffserklärung (Anti-Spoiler-Entscheid:
// die Wichtigkeits-Tabelle würde die korrekte Antwort verraten).

function MiniMatrixTable({ typ, t }: { typ: 'relevanz' | 'risiko'; t: TFunction }) {
  const rows = typ === 'relevanz' ? RELEVANZ_ROWS : RISIKO_ROWS
  const cols = typ === 'relevanz' ? RELEVANZ_COLS : RISIKO_COLS
  const cellVal = (r: string, c: string): ResultDimension =>
    typ === 'relevanz'
      ? calcRelevanzSD(r as RSIDimension, c as RSIDimension)
      : calcUnfallrisiko(r as ResultDimension, c as NACADimension)
  const rowLabel = (r: string) => t(typ === 'relevanz' ? `scoring.dim_${r}` : `scoring.result_${r}`)
  const colLabel = (c: string) => t(typ === 'relevanz' ? `scoring.dim_${c}` : `scoring.schwere_${c}`)
  const valColor = (v: ResultDimension) => v === 'hoch' ? '#FF7BAC' : v === 'mittel' ? '#F0A500' : '#6FCF73'
  const yLabel = t(typ === 'relevanz' ? 'scoring.matrix_wichtigkeit' : 'scoring.matrix_relevanz')
  const xLabel = t(typ === 'relevanz' ? 'scoring.matrix_abweichung' : 'scoring.matrix_unfallschwere')

  const cell: React.CSSProperties = {
    padding: '4px 6px', fontSize: '10px', textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.12)',
  }
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead>
        <tr>
          <th style={{ ...cell, color: 'rgba(255,255,255,0.45)', fontWeight: 700, textAlign: 'left' }}>
            {yLabel} \ {xLabel}
          </th>
          {cols.map(c => (
            <th key={c} style={{ ...cell, color: 'rgba(255,255,255,0.70)', fontWeight: 700 }}>{colLabel(c)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r}>
            <td style={{ ...cell, color: 'rgba(255,255,255,0.70)', fontWeight: 700, textAlign: 'left' }}>{rowLabel(r)}</td>
            {cols.map(c => {
              const v = cellVal(r, c)
              return (
                <td key={c} style={{ ...cell, color: valColor(v), fontWeight: 700 }}>
                  {t(`scoring.result_${v}`)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MiniReferenz({ schritt, t }: { schritt: 'w' | 'a' | 'n'; t: TFunction }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: '14px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
          fontSize: '11px', fontWeight: 600, color: 'rgba(120,190,255,0.90)',
          fontFamily: 'var(--zh-font)',
        }}
      >
        {open ? '▾' : '▸'} {t('scoring.referenz_btn')}
      </button>
      {open && (
        <div style={{
          marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
        }}>
          {schritt === 'w' && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, margin: 0 }}>
              {t('scoring.referenz_wichtigkeit')}
            </p>
          )}
          {schritt === 'a' && (
            <>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, margin: '0 0 8px' }}>
                {t('scoring.referenz_relevanz_hint')}
              </p>
              <MiniMatrixTable typ="relevanz" t={t} />
            </>
          )}
          {schritt === 'n' && (
            <>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, margin: '0 0 8px' }}>
                {t('scoring.referenz_risiko_hint')}
              </p>
              <MiniMatrixTable typ="risiko" t={t} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Hinweis-Dialog (Browser) ─────────────────────────────────────────────────
interface HintDialogProps {
  hintCount:     number
  stufe:         1 | 2
  onBestätigen: () => void
  onAbbrechen:   () => void
}

function HintDialog({ hintCount, stufe, onBestätigen, onAbbrechen }: HintDialogProps) {
  // v0.9.1: hartcodierte deutsche Strings durch bestehende i18n-Keys ersetzt
  // (HTML-Overlay ausserhalb des Canvas — useTranslation ist hier sicher).
  const { t } = useTranslation()
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 400,
    }}>
      <div style={{
        background: 'rgba(20,22,28,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        padding: '28px 32px',
        maxWidth: '400px',
        width: '90%',
        fontFamily: 'var(--zh-font)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Eye size={20} style={{ color: 'var(--zh-warnung)', flexShrink: 0 }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>
            {t(stufe === 1 ? 'szene.hint1_titel' : 'szene.hint_titel')}
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: '8px' }}>
          {t(stufe === 1 ? 'szene.hint1_text' : 'szene.hint_text', { count: hintCount })}
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginBottom: '20px' }}>
          {t(stufe === 1 ? 'szene.hint1_dauer' : 'szene.hint_dauer')}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onAbbrechen}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            {t('scoring.abbrechen')}
          </button>
          <button
            onClick={onBestätigen}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--zh-warnung)', color: '#1a1400', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            {t('szene.hint_bestätigen')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Alle-gefunden-Banner (Browser) ───────────────────────────────────────────
function AllFoundBanner({ onBeenden }: { onBeenden: () => void }) {
  const { t } = useTranslation()
  return (
    <div style={{
      position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(26,127,31,0.92)',
      backdropFilter: 'blur(12px)',
      borderRadius: '12px',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', gap: '16px',
      fontFamily: 'var(--zh-font)',
      zIndex: 100,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
        {t('szene.alle_gefunden')}
      </span>
      <button
        onClick={onBeenden}
        style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'white', color: '#1A7F1F', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
      >
        {t('szene.beenden')}
      </button>
    </div>
  )
}

// ── Haupt-Komponente SceneViewer ──────────────────────────────────────────────

export interface DeficitConfirmedPayload {
  deficit:          AppDeficit
  kategorieRichtig: boolean
  hintPenalty:      boolean
  /** v0.10.0: Abzug der beim Fund aktiven Hinweis-Stufe (0/10/25) */
  hintAbzug:        number
  // Bewertungs-Auswahlen aus dem Viewer-Overlay
  userWichtigkeit:  RSIDimension
  userAbweichung:   RSIDimension
  userNacaSchwere:  NACADimension
  // Zeitpunkt des Bewertungsbeginns (für Dauer-Berechnung)
  bewertungStartMs: number
}

interface Props {
  scene:              AppScene
  deficits:           AppDeficit[]
  foundDeficits:      FoundDeficit[]
  hintStufe:          number
  // Ms-Epoch-Stamp wann die Szene gestartet wurde (aus App.tsx handleEinstiegStart).
  // Wird fuer den VR-HUD-Timer (v0.8.0) gebraucht.
  sceneStartTime:     number
  /** Wenn gesetzt, zeigt der Viewer das VR-Scoring-Summary-Panel (v0.8.2). null = kein Panel. */
  vrScoringFeedback:  VRScoringSummary | null
  onDeficitConfirmed: (payload: DeficitConfirmedPayload) => void
  onHintActivate:     (stufe: 1 | 2) => void
  onBeenden:          () => void
  /** Wird aufgerufen wenn der User im VR-Scoring-Summary-Panel auf Weiter klickt. */
  onVRScoringContinue: () => void
}

type Phase =
  | 'exploring'
  | 'pendingConfirm'
  | 'kategoriePanel'
  | 'klickFeedback'
  | 'hintDialog'
  | 'vrHintDialog'
  | 'bewertungW'
  | 'bewertungA'
  | 'bewertungN'
  | 'vrScoringSummary'

export default function SceneViewer({
  scene, deficits, foundDeficits, hintStufe, sceneStartTime,
  vrScoringFeedback,
  onDeficitConfirmed, onHintActivate, onBeenden, onVRScoringContinue,
}: Props) {
  const { i18n, t } = useTranslation()
  const lang     = i18n.language

  const [phase, setPhase]           = useState<Phase>('exploring')
  const [feedbackType, setFeedback] = useState<KlickFeedbackType>('kein_treffer')
  const [isVR, setIsVR]             = useState(false)
  const [fov, setFov]               = useState(75)

  // VR-HUD-Timer: tickt jede Sekunde waehrend die XR-Session laeuft.
  // Ohne isVR-Gate wuerde der Timer im Browser unnoetig re-rendern.
  const [elapsedSec, setElapsedSec] = useState(0)
  useEffect(() => {
    if (!isVR) return
    setElapsedSec(Math.max(0, Math.floor((Date.now() - sceneStartTime) / 1000)))
    const id = setInterval(() => {
      setElapsedSec(Math.max(0, Math.floor((Date.now() - sceneStartTime) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [isVR, sceneStartTime])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setFov(prev => Math.min(90, Math.max(30, prev + (e.deltaY > 0 ? 5 : -5))))
  }, [])

  // Perspektiven
  const perspektiven = scene.perspektiven ?? []
  // Immer mit dem Haupt-Panorama starten — Perspektiven per Button wechseln
  const [aktivePerspektiveId, setAktivePerspektiveId] = useState<string | null>(null)
  const aktivePerspektive = perspektiven.find(p => p.id === aktivePerspektiveId) ?? null
  const aktiveBildUrl = aktivePerspektive?.bildUrl ?? scene.panoramaBildUrl ?? scene.bildUrl
  const aktiveStartblick = aktivePerspektive?.startblick ?? scene.startblick

  // Besuchte Standorte merken (v0.8.0, farb-codierte Marker).
  // '__haupt__' steht fuer das Haupt-Panorama (kein Perspektiven-Id).
  // Start-Set enthaelt schon '__haupt__', weil der User initial dort landet.
  const HAUPT_KEY = '__haupt__'
  const [visitedPerspektiven, setVisitedPerspektiven] = useState<Set<string>>(() => new Set([HAUPT_KEY]))

  // Standortwechsel: Perspektive wechseln + Pending-State aufräumen
  // Wichtig: Auch den Auto-Ausblenden-Timer stoppen, sonst feuert er 5s später
  // in der neuen Perspektive und setzt die Phase fälschlich zurück.
  const handleStandortWechsel = useCallback((id: string | null) => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    setAktivePerspektiveId(id)
    setVisitedPerspektiven(prev => {
      const key = id ?? HAUPT_KEY
      if (prev.has(key)) return prev
      const next = new Set(prev)
      next.add(key)
      return next
    })
    // Defensiv: laufende Bewertung verwerfen, falls doch ein Wechsel ausgelöst wird
    // (Marker sind via Phasen-Gate eigentlich nur in exploring/pendingConfirm aktiv).
    hitDeficit.current = null
    setUserWichtigkeit(null)
    setUserAbweichung(null)
    setPendingClickPos(null)
    setPhase('exploring')
  }, [])

  const hitDeficit    = useRef<AppDeficit | null>(null)
  const hitKatRichtig = useRef<boolean>(false)

  // Klick-Bestätigungs-Marker (Browser: Klick → Marker → Bestätigen)
  const [pendingClickPos, setPendingClickPos] = useState<{ theta: number; phi: number } | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref für Phase – vermeidet stale-closure in handleVRModeChange
  const phaseRef      = useRef<Phase>('exploring')
  phaseRef.current = phase

  // Bewertungs-State (Overlay im Viewer)
  const [userWichtigkeit, setUserWichtigkeit] = useState<RSIDimension | null>(null)
  const [userAbweichung, setUserAbweichung]   = useState<RSIDimension | null>(null)
  const bewertungStartTime = useRef<number>(0)

  const foundIds = new Set(foundDeficits.map(f => f.deficitId))
  const allFound = foundDeficits.length === deficits.length

  // ESC-Taste: VR beenden oder Szene verlassen
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // VR-Session beenden falls aktiv
        const session = xrStore.getState().session
        if (session) { session.end(); return }
        // Sonst: Pending abbrechen oder Szene beenden
        if (phaseRef.current === 'pendingConfirm') {
          setPendingClickPos(null)
          setPhase('exploring')
        } else {
          onBeenden()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBeenden])

  // VR-Lifecycle-Sicherheitsnetz (v0.8.3): beim Unmount des Viewers eine evtl.
  // noch laufende XR-Session und den pending-Timer abräumen. handleBeenden
  // beendet die Session bereits aktiv vor dem View-Wechsel — dies fängt jeden
  // anderen Unmount-Pfad ab, damit das Headset nie in einer toten Szene hängt.
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
      xrStore.getState().session?.end().catch(() => { /* evtl. schon beendet */ })
    }
  }, [])

  // VR-Modus-Wechsel (von SceneContent via useXR gemeldet)
  // Kein phase-Dependency – phaseRef verhindert dass jeder Phase-Wechsel
  // das useEffect in SceneContent neu ausloest und den Klick-Flow resetzt
  const handleVRModeChange = useCallback((v: boolean) => {
    setIsVR(v)
    const p = phaseRef.current
    // Beim Verlassen der VR-Session jede Zwischenphase sauber auf exploring
    // zurücksetzen. 'vrScoringSummary' MUSS dabei sein: sonst bliebe die Phase
    // hängen und es gibt im Browser kein HTML-Pendant für dieses Panel.
    if (!v && (
      p === 'kategoriePanel' || p === 'pendingConfirm' || p === 'klickFeedback' ||
      p === 'bewertungW' || p === 'bewertungA' || p === 'bewertungN' ||
      p === 'vrScoringSummary' || p === 'vrHintDialog'
    )) {
      hitDeficit.current = null
      setUserWichtigkeit(null)
      setUserAbweichung(null)
      setPendingClickPos(null)
      setPhase('exploring')
      // Eltern-Feedback-State (vrScoringFeedback) mitraeumen.
      onVRScoringContinue()
    }
  }, [onVRScoringContinue])

  // ── Treffer-Prüfung (gemeinsam für Browser-Bestätigung und VR-Direktklick) ──
  const runHitCheck = useCallback((clickPos: { theta: number; phi: number }) => {
    const hit = deficits.find(d => {
      const verortung = getVerortungFürPerspektive(d, aktivePerspektiveId)
      if (verortung) return trefferprüfung(clickPos, verortung)
      // Legacy-Fallback nur bei Haupt-Panorama (keine Perspektive aktiv)
      if (!aktivePerspektiveId && d.position) {
        return isInTolerance(clickPos, d.position, d.tolerance ?? 15)
      }
      return false
    })

    if (!hit) {
      triggerHaptic('miss')
      setFeedback('kein_treffer')
      setPhase('klickFeedback')
      setPendingClickPos(null)
      return
    }

    if (foundIds.has(hit.id)) {
      triggerHaptic('bereits-gefunden')
      setFeedback('bereits_gefunden')
      setPhase('klickFeedback')
      setPendingClickPos(null)
      return
    }

    // Treffer auf noch nicht gefundenes Defizit → positiver Puls,
    // Kategorie-Panel kommt gleich. (Idee #1 VR-Smoke-Report v0.8.0)
    triggerHaptic('hit')
    hitDeficit.current = hit
    setPendingClickPos(null)
    setPhase('kategoriePanel')
  }, [deficits, foundIds, aktivePerspektiveId])

  // ── Klick auf die Sphere ────────────────────────────────────────────────────
  const handleSphereClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()

    // Während pendingConfirm: neuer Klick ersetzt den alten Marker
    if (phase !== 'exploring' && phase !== 'pendingConfirm') return

    const clickPos = clickToSpherical(e.point)

    if (isVR) {
      // VR: Direkter Treffer-Check (Controller-Ray ist präzise)
      runHitCheck(clickPos)
      return
    }

    // Browser: Marker setzen, warten auf Bestätigung
    setPendingClickPos(clickPos)
    setPhase('pendingConfirm')

    // Auto-Ausblenden nach 5 Sekunden
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = setTimeout(() => {
      // Phasen-Guard: nur ausblenden wenn wir noch im pendingConfirm sind. Sonst
      // könnte ein nicht geclearter Timer (z.B. nach ESC → hintDialog) den
      // User aus einer ganz anderen Phase zurück nach exploring reissen.
      if (phaseRef.current !== 'pendingConfirm') return
      setPendingClickPos(null)
      setPhase('exploring')
    }, 5000)
  }, [phase, isVR, runHitCheck])

  // ── Browser: Klick bestätigen ──────────────────────────────────────────────
  const handleConfirmClick = useCallback(() => {
    if (!pendingClickPos) return
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    runHitCheck(pendingClickPos)
  }, [pendingClickPos, runHitCheck])

  // ── Browser: Klick abbrechen ──────────────────────────────────────────────
  const handleCancelPending = useCallback(() => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    setPendingClickPos(null)
    setPhase('exploring')
  }, [])

  // ── Kategorie gewählt ──────────────────────────────────────────────────────
  const handleKategorieSelect = useCallback((gewählteKategorie: DefizitKategorie) => {
    const d = hitDeficit.current
    if (!d) return
    const kategorieRichtig = d.kategorie === gewählteKategorie
    hitKatRichtig.current  = kategorieRichtig
    setFeedback(kategorieRichtig ? 'richtig' : 'kategorie_falsch')
    setPhase('klickFeedback')
  }, [])

  const handleKategorieCancel = useCallback(() => {
    hitDeficit.current = null
    setPhase('exploring')
  }, [])

  // ── Feedback-Anzeige abgelaufen → Bewertungs-Flow starten ──────────────────
  const handleFeedbackClose = useCallback(() => {
    const d = hitDeficit.current
    if (d && (feedbackType === 'richtig' || feedbackType === 'kategorie_falsch')) {
      // Bewertung starten (bleibt im Viewer als Overlay)
      setUserWichtigkeit(null)
      setUserAbweichung(null)
      bewertungStartTime.current = Date.now()
      setPhase('bewertungW')
      return
    }
    hitDeficit.current = null
    setPhase('exploring')
  }, [feedbackType])

  // ── VR-Bewertungs-Callbacks (v0.8.1) — analog zu den HTML-Overlays weiter unten.
  // Werden von VRBewertungWPanel/APanel/NPanel gerufen, damit der VR-Flow nach
  // der Kategorie-Auswahl weitergeht (vorher blieb die Phase haengen weil
  // die Browser-Overlays in VR unsichtbar sind).
  const handleBewertungW = useCallback((w: RSIDimension) => {
    setUserWichtigkeit(w)
    setPhase('bewertungA')
  }, [])
  const handleBewertungA = useCallback((a: RSIDimension) => {
    setUserAbweichung(a)
    setPhase('bewertungN')
  }, [])
  const handleBewertungN = useCallback((n: NACADimension) => {
    const d = hitDeficit.current
    if (!d || userWichtigkeit == null || userAbweichung == null) return
    onDeficitConfirmed({
      deficit:          d,
      kategorieRichtig: hitKatRichtig.current,
      hintPenalty:      hintStufe > 0,
      hintAbzug:        hintStufe === 2 ? HINT_ABZUG_HOTSPOTS : hintStufe === 1 ? HINT_ABZUG_WEGWEISER : 0,
      userWichtigkeit,
      userAbweichung,
      userNacaSchwere:  n,
      bewertungStartMs: bewertungStartTime.current,
    })
    hitDeficit.current = null
    // In VR (v0.8.2): auf vrScoringSummary wechseln — Props-Effekt oben bringt
    // vrScoringFeedback nach. In Browser: exploring, View wechselt auf scoring.
    setPhase(isVR ? 'vrScoringSummary' : 'exploring')
  }, [userWichtigkeit, userAbweichung, hintStufe, onDeficitConfirmed, isVR])

  // Abbruch einer laufenden Bewertung (v0.8.3, VR-Cancel-Buttons): verwirft den
  // Treffer und kehrt zum Erkunden zurück. Genutzt von den VR-Bewertungs-Panels.
  const handleBewertungCancel = useCallback(() => {
    hitDeficit.current = null
    setUserWichtigkeit(null)
    setUserAbweichung(null)
    setPhase('exploring')
  }, [])

  // Nach dem Weiter-Klick im VR-Scoring-Panel zurueck zum exploring.
  const handleVRScoringContinueLocal = useCallback(() => {
    setPhase('exploring')
    onVRScoringContinue()
  }, [onVRScoringContinue])

  // ── Hint aktivieren (v0.10.0: zweistufig) ──────────────────────────────────
  const pendingHintStufe = useRef<1 | 2>(2)
  const handleHintRequest = useCallback((stufe: 1 | 2) => {
    // v0.9.1: auch in VR erst bestaetigen — vorher wurde die Penalty ohne
    // Warnung scharf (Browser hatte den Dialog, VR nicht).
    pendingHintStufe.current = stufe
    setPhase(isVR ? 'vrHintDialog' : 'hintDialog')
  }, [isVR])

  const handleHintBestätigen = useCallback(() => {
    onHintActivate(pendingHintStufe.current)
    setPhase('exploring')
  }, [onHintActivate])

  const handleHintAbbrechen = useCallback(() => {
    setPhase('exploring')
  }, [])

  // ── Fortschritts-Daten ──────────────────────────────────────────────────────
  const progress = deficits.map(d => ({
    id:    d.id,
    found: foundIds.has(d.id),
    name:  ml(d.nameI18n, lang),
  }))

  // Pflicht-Zähler (Review R-10): Pflichtdefizite sichtbar mitzählen, damit
  // das Konzept nicht erst im Abschluss-Screen auftaucht.
  const pflichtTotal = deficits.filter(d => d.isPflicht).length
  const pflichtFound = deficits.filter(d => d.isPflicht && foundIds.has(d.id)).length

  const sceneName         = ml(scene.nameI18n, lang)
  const sceneKontextLabel = scene.kontext === 'io' ? t('einstieg.kontext_io') : t('einstieg.kontext_ao')
  const htmlVisible       = !isVR

  // Diagnose-Hinweis falls keiner der Pfade ein Panorama-Bild liefert.
  // Vermeidet "stille schwarze Sphäre" wenn Supabase-Daten unvollständig sind.
  const hatKeinBild = !aktiveBildUrl
  if (hatKeinBild && import.meta.env.DEV) {
    console.warn(`[RSI] Szene "${scene.id}" ohne panoramaBildUrl — bitte im Admin-Dashboard Panorama-Bild zuweisen.`)
  }

  return (
    <div style={{ position: 'relative', flex: 1, background: '#1a1c22', overflow: 'hidden' }} onWheel={handleWheel}>

      {/* Diagnose-Overlay: kein Panorama-Bild hinterlegt */}
      {hatKeinBild && htmlVisible && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', padding: '24px',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(240,165,0,0.55)',
            borderRadius: '12px',
            padding: '20px 24px',
            maxWidth: '460px',
            color: 'white',
            fontFamily: 'var(--zh-font)',
            textAlign: 'center',
            pointerEvents: 'auto',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--zh-warnung)', marginBottom: '8px' }}>
              Kein Panorama-Bild
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
              {sceneName}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
              Für diese Szene ist noch kein 360°-Bild hinterlegt. Im Admin-Dashboard
              unter «Szenen» ein Panorama-Bild zuweisen oder hochladen.
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '8px', fontFamily: 'monospace' }}>
              Szene-ID: {scene.id}
            </p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 0.01], fov: 75 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true }}
      >
        <XR store={xrStore}>
          <CameraSync fov={fov} />
          <SceneContent
            scene={scene}
            deficits={deficits}
            foundDeficits={foundDeficits}
            hintStufe={hintStufe}
            onSphereClick={handleSphereClick}
            startblick={aktiveStartblick}
            onVRModeChange={handleVRModeChange}
            phase={phase}
            feedbackType={feedbackType}
            progress={progress}
            sceneName={sceneName}
            sceneKontextLabel={sceneKontextLabel}
            elapsedSec={elapsedSec}
            onKategorieSelect={handleKategorieSelect}
            onKategorieCancel={handleKategorieCancel}
            onFeedbackClose={handleFeedbackClose}
            onHintRequest={handleHintRequest}
            hintDialogStufe={pendingHintStufe.current}
            onHintConfirm={handleHintBestätigen}
            onHintCancel={handleHintAbbrechen}
            onBeenden={onBeenden}
            aktivePerspektiveId={aktivePerspektiveId}
            aktiveBildUrl={aktiveBildUrl}
            pendingClickPos={pendingClickPos}
            onStandortWechsel={handleStandortWechsel}
            visitedPerspektiven={visitedPerspektiven}
            hauptKey={HAUPT_KEY}
            hitDeficit={hitDeficit.current}
            onBewertungW={handleBewertungW}
            onBewertungA={handleBewertungA}
            onBewertungN={handleBewertungN}
            onBewertungCancel={handleBewertungCancel}
            vrScoringFeedback={vrScoringFeedback}
            onVRScoringContinue={handleVRScoringContinueLocal}
            t={t}
          />
        </XR>
      </Canvas>

      {/* ── HTML-Overlays (nur Browser-Modus) ── */}

      {htmlVisible && (
        <div style={{
          position: 'absolute', top: '16px', left: '16px',
          background: 'rgba(0,0,0,0.62)',
          backdropFilter: 'blur(12px)',
          borderRadius: '10px',
          padding: '10px 16px',
          fontFamily: 'var(--zh-font)',
          zIndex: 50,
          maxWidth: '280px',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>
            {sceneKontextLabel}
          </p>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>
            {sceneName}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {progress.map(p => (
              <div
                key={p.id}
                title={p.name}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: p.found ? '#1A7F1F' : 'rgba(255,255,255,0.22)',
                  border: p.found ? 'none' : '1px solid rgba(255,255,255,0.35)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginLeft: '4px' }}>
              {foundDeficits.length}/{deficits.length}
              {pflichtTotal > 0 && ` · ${t('szene.pflicht_zaehler', { found: pflichtFound, total: pflichtTotal })}`}
            </span>
          </div>
        </div>
      )}

      {htmlVisible && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          zIndex: 50,
        }}>
          {/* v0.10.0: zweistufiger Hinweis — Wegweiser (−10) vor Hotspots (−25) */}
          {hintStufe < 1 ? (
            <button
              onClick={() => handleHintRequest(1)}
              title={t('szene.wegweiser_btn_title')}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 14px', borderRadius: '9px',
                border: '1px solid rgba(160,180,30,0.40)',
                background: 'rgba(160,180,30,0.15)',
                color: '#8a9a10',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--zh-font)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <MapPin size={14} /> {t('szene.wegweiser_btn')}
            </button>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 14px', borderRadius: '9px',
              background: 'rgba(160,180,30,0.20)',
              border: '1px solid rgba(160,180,30,0.5)',
              color: '#8a9a10',
              fontSize: '12px', fontWeight: 700,
              fontFamily: 'var(--zh-font)',
            }}>
              <MapPin size={13} /> {t('szene.wegweiser_aktiv')}
            </div>
          )}
          {hintStufe < 2 ? (
            <button
              onClick={() => handleHintRequest(2)}
              title={t('szene.hinweis_btn_title')}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 14px', borderRadius: '9px',
                border: '1px solid rgba(240,165,0,0.35)',
                background: 'rgba(240,165,0,0.15)',
                color: 'var(--zh-warnung)',
                fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--zh-font)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Eye size={14} /> {t('szene.hinweis_btn')}
            </button>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 14px', borderRadius: '9px',
              background: 'rgba(240,165,0,0.20)',
              border: '1px solid rgba(240,165,0,0.45)',
              color: 'var(--zh-warnung)',
              fontSize: '12px', fontWeight: 700,
              fontFamily: 'var(--zh-font)',
            }}>
              <Eye size={13} /> {t('szene.hinweis_aktiv')}
            </div>
          )}
          <button
            onClick={() => {
              // enterVR() rejected bei fehlendem WebXR / abgelehnter Permission /
              // ohne Headset — abfangen, sonst unhandled rejection + stummer Button.
              xrStore.enterVR().catch((err: unknown) => {
                console.warn('[RSI] VR-Start fehlgeschlagen (kein WebXR/Headset oder Permission verweigert):', err)
              })
            }}
            title={t('szene.vr_start_title')}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px', borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.70)',
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--zh-font)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Glasses size={14} /> VR
          </button>

          {/* Zoom-Kontrollen */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '9px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
            {[
              { icon: <ZoomIn size={15} />, title: t('szene.zoom_in'), onClick: () => setFov(f => Math.max(30, f - 5)) },
              { icon: <Maximize2 size={14} />, title: t('szene.zoom_reset'), onClick: () => setFov(75) },
              { icon: <ZoomOut size={15} />, title: t('szene.zoom_out'), onClick: () => setFov(f => Math.min(90, f + 5)) },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                title={btn.title}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '9px 12px',
                  border: 'none',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.10)' : 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.70)',
                  cursor: 'pointer',
                }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {htmlVisible && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
        }}>
          <button
            onClick={onBeenden}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '11px 22px', borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(0,0,0,0.60)',
              backdropFilter: 'blur(12px)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--zh-font)',
            }}
          >
            <X size={15} /> {t('szene.beenden')}
          </button>
        </div>
      )}

      {htmlVisible && allFound && phase === 'exploring' && (
        <AllFoundBanner onBeenden={onBeenden} />
      )}

      {htmlVisible && phase === 'kategoriePanel' && (
        <KategoriePanel
          onSelect={handleKategorieSelect}
          onCancel={handleKategorieCancel}
        />
      )}

      {/* Bestätigungs-Overlay (Browser: Klick bestätigen) */}
      {htmlVisible && phase === 'pendingConfirm' && pendingClickPos && (
        <div style={{
          position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(12px)',
          borderRadius: '12px', padding: '10px 16px',
          border: '1px solid rgba(255,255,255,0.20)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 200, fontFamily: 'var(--zh-font)',
        }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.70)' }}>
            {t('szene.defizit_hier')}
          </span>
          <button
            onClick={handleConfirmClick}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              background: '#1A7F1F', color: 'white',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--zh-font)',
            }}
          >
            {t('szene.bestätigen')}
          </button>
          <button
            onClick={handleCancelPending}
            style={{
              padding: '8px 12px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
              color: 'rgba(255,255,255,0.50)',
              fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--zh-font)',
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {htmlVisible && phase === 'klickFeedback' && (
        <KlickFeedback
          type={feedbackType}
          onClose={handleFeedbackClose}
        />
      )}

      {/* ── Bewertungs-Overlays (3 Schritte im KategoriePanel-Style) ── */}

      {htmlVisible && phase === 'bewertungW' && hitDeficit.current && (() => {
        const d = hitDeficit.current!
        return (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(16px)',
            borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)',
            padding: '24px 28px', width: '380px', maxWidth: '92vw',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 300, fontFamily: 'var(--zh-font)',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>
              {t('scoring.bewertung_schritt', { nr: 1 })} · {t('scoring.methodik_schritt', { schritt: 1 })} — {t('scoring.phase_a')}
            </p>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
              {t('scoring.wie_wichtig')}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '14px' }}>
              {KRITERIUM_LABELS[d.kriteriumId] ?? d.kriteriumId} · {t(d.kontext === 'io' ? 'einstieg.kontext_io' : 'einstieg.kontext_ao')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['klein', 'mittel', 'gross'] as RSIDimension[]).map(w => (
                <button
                  key={w}
                  onClick={() => { setUserWichtigkeit(w); setPhase('bewertungA') }}
                  style={{
                    textAlign: 'left', padding: '11px 16px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)',
                    color: 'white', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--zh-font)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,118,189,0.45)'; e.currentTarget.style.borderColor = 'rgba(0,118,189,0.6)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
                >
                  {t(w === 'gross' ? 'scoring.dim_gross' : w === 'mittel' ? 'scoring.dim_mittel' : 'scoring.dim_klein')}
                </button>
              ))}
            </div>
            <MiniReferenz schritt="w" t={t} />
          </div>
        )
      })()}

      {htmlVisible && phase === 'bewertungA' && hitDeficit.current && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(16px)',
          borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)',
          padding: '24px 28px', width: '380px', maxWidth: '92vw',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 300, fontFamily: 'var(--zh-font)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>
            {t('scoring.bewertung_schritt', { nr: 2 })} · {t('scoring.methodik_schritt', { schritt: 3 })} — {t('scoring.phase_b')}
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>
            {t('scoring.wie_abweichung')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ABWEICHUNG_I18N.map(k => (
              <button
                key={k.wert}
                onClick={() => { setUserAbweichung(k.wert); setPhase('bewertungN') }}
                style={{
                  textAlign: 'left', padding: '11px 16px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)',
                  color: 'white', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--zh-font)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,118,189,0.45)'; e.currentTarget.style.borderColor = 'rgba(0,118,189,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
              >
                <span style={{ display: 'block' }}>{t(k.labelKey)}</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.50)', fontWeight: 400, marginTop: '2px' }}>{t(k.beschreibungKey)}</span>
              </button>
            ))}
          </div>
          <MiniReferenz schritt="a" t={t} />
        </div>
      )}

      {htmlVisible && phase === 'bewertungN' && hitDeficit.current && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(16px)',
          borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)',
          padding: '24px 28px', width: '380px', maxWidth: '92vw',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 300, fontFamily: 'var(--zh-font)',
        }}>
          <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>
            {t('scoring.bewertung_schritt', { nr: 3 })} · {t('scoring.methodik_schritt', { schritt: 7 })} — {t('scoring.phase_d')}
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
            {t('scoring.wie_schwer')}
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
            {t('scoring.stell_dir_vor')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {([
              { wert: 'leicht' as NACADimension, label: t('scoring.naca_leicht'), sub: t('scoring.naca_leicht_sub'), color: '#1A7F1F' },
              { wert: 'mittel' as NACADimension, label: t('scoring.naca_mittel'), sub: t('scoring.naca_mittel_sub'), color: '#B87300' },
              { wert: 'schwer' as NACADimension, label: t('scoring.naca_schwer'), sub: t('scoring.naca_schwer_sub'), color: '#D40053' },
            ]).map(g => (
              <button
                key={g.wert}
                // Gemeinsamer Abschluss-Pfad mit dem VR-Flow (handleBewertungN) —
                // ein einziger Payload-Bau + Null-Guard statt duplizierter Logik.
                onClick={() => handleBewertungN(g.wert)}
                style={{
                  textAlign: 'left', padding: '11px 16px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)',
                  color: 'white', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--zh-font)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${g.color}55`; e.currentTarget.style.borderColor = `${g.color}88` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)' }}
              >
                <span style={{ display: 'block', color: g.color }}>{g.label}</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.50)', fontWeight: 400, marginTop: '2px' }}>{g.sub}</span>
              </button>
            ))}
          </div>
          <MiniReferenz schritt="n" t={t} />
        </div>
      )}

      {/* Perspektiven-Switcher (Standortwechsel) */}
      {htmlVisible && perspektiven.length > 0 && (phase === 'exploring' || phase === 'pendingConfirm') && (
        <div style={{
          position: 'absolute', bottom: '72px', left: '16px',
          display: 'flex', flexDirection: 'column', gap: '6px',
          zIndex: 60,
        }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)',
            marginBottom: '2px', paddingLeft: '2px',
          }}>
            {t('szene.standort_label')}
          </span>
          {/* Haupt-Panorama */}
          <button
            onClick={() => handleStandortWechsel(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '9px',
              border: !aktivePerspektiveId
                ? '2px solid #0076BD'
                : hintStufe >= 1 && standortHatOffeneDefizite(deficits, foundIds, null, aktivePerspektiveId)
                  ? '2px solid #F0A500'
                  : '1px solid rgba(255,255,255,0.18)',
              background: !aktivePerspektiveId ? 'rgba(0,118,189,0.25)' : 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)',
              color: !aktivePerspektiveId ? 'white' : 'rgba(255,255,255,0.70)',
              fontSize: '13px', fontWeight: !aktivePerspektiveId ? 700 : 500,
              cursor: !aktivePerspektiveId ? 'default' : 'pointer',
              fontFamily: 'var(--zh-font)',
              transition: 'all 0.15s',
              minWidth: '140px',
              textAlign: 'left',
            }}
          >
            <MapPin size={13} style={{ flexShrink: 0, opacity: !aktivePerspektiveId ? 1 : 0.5 }} />
            <span>{t('szene.haupt')}</span>
          </button>
          {/* Perspektiven */}
          {perspektiven.map((p, i) => {
            const isActive = p.id === aktivePerspektiveId
            // v0.9.4: Hinweis-Wegweiser — orange Umrandung, wenn hinter dem
            // Standort noch unentdeckte Defizite verortet sind.
            const hintZiel = !isActive && hintStufe >= 1 && standortHatOffeneDefizite(deficits, foundIds, p.id, aktivePerspektiveId)
            return (
              <button
                key={p.id}
                onClick={() => handleStandortWechsel(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px', borderRadius: '9px',
                  border: isActive ? '2px solid #0076BD' : hintZiel ? '2px solid #F0A500' : '1px solid rgba(255,255,255,0.18)',
                  background: isActive ? 'rgba(0,118,189,0.25)' : 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(10px)',
                  color: isActive ? 'white' : hintZiel ? '#F0A500' : 'rgba(255,255,255,0.70)',
                  fontSize: '13px', fontWeight: isActive ? 700 : 500,
                  cursor: isActive ? 'default' : 'pointer',
                  fontFamily: 'var(--zh-font)',
                  transition: 'all 0.15s',
                  minWidth: '140px',
                  textAlign: 'left',
                }}
              >
                <MapPin size={13} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5, color: hintZiel ? '#F0A500' : undefined }} />
                <span>{p.label || t('szene.standort', { nr: i + 1 })}</span>
              </button>
            )
          })}
        </div>
      )}

      {htmlVisible && phase === 'hintDialog' && (
        <HintDialog
          hintCount={deficits.filter(d => !foundIds.has(d.id)).length}
          stufe={pendingHintStufe.current}
          onBestätigen={handleHintBestätigen}
          onAbbrechen={handleHintAbbrechen}
        />
      )}
    </div>
  )
}
