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
import KategoriePanel from './KategoriePanel'
import KlickFeedback, { type KlickFeedbackType } from './KlickFeedback'
import { useTranslation } from 'react-i18next'
import { WICHTIGKEIT_TABLE, ABWEICHUNG_KATEGORIEN } from '../data/scoringEngine'
import { KRITERIUM_LABELS } from '../data/kriteriumLabels'
import type { RSIDimension, NACADimension } from '../types'

// Modul-Level Singleton – nie innerhalb von Komponenten erzeugen

// Kategorien für VR-Panel
const VR_KATEGORIEN: { value: DefizitKategorie; label: string }[] = [
  { value: 'verkehrsfuehrung', label: 'Verkehrsführung'        },
  { value: 'sicht',            label: 'Sicht'                  },
  { value: 'ausruestung',      label: 'Ausrüstung'             },
  { value: 'zustand',          label: 'Zustand Verkehrsfläche' },
  { value: 'strassenrand',     label: 'Strassenrand'           },
  { value: 'verkehrsablauf',   label: 'Verkehrsablauf'         },
  { value: 'baustelle',        label: 'Baustelle'              },
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
  bildUrl: string | null | undefined
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

function PanoramaSphere({ bildUrl, onClick }: PanoramaSphereProps) {
  const fallbackColor = '#2a2e35'
  return (
    <mesh onClick={onClick} renderOrder={0}>
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
  onClick:  () => void
}

function StandortNavMarker({ position, label, status, onClick }: StandortNavMarkerProps) {
  const [hovered, setHovered] = useState(false)
  const size = hovered ? 3.2 : 2.6
  const fillColor = status === 'besucht' ? '#1A7F1F' : '#d7d7d7'
  const labelColor = status === 'besucht' ? '#cfe9d0' : 'white'
  return (
    <Billboard
      position={position}
      follow lockX={false} lockY={false} lockZ={false}
    >
      {/* Weisser Rand-Diamant (leicht grösser, hinten) */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <planeGeometry args={[size + 0.45, size + 0.45]} />
        <meshBasicMaterial color="white" transparent opacity={0.92} side={THREE.DoubleSide} depthTest={false} />
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

// ── VR: Panel im Weltraum – Position einmalig bei Mount erfassen ─────────────
// Beim ersten Frame wird die aktuelle Blickrichtung erfasst und das Panel
// dort fixiert. Danach dreht nur noch Billboard es zur Kamera – die Position
// bleibt unverändert (keine Kopf-Bindung mehr).
interface VRHudProps {
  offset?: [number, number, number]
  children: React.ReactNode
}

function VRHud({ offset = [0, 0, -1.5], children }: VRHudProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const initialized = useRef(false)

  useFrame(({ camera }) => {
    if (!groupRef.current || initialized.current) return
    // Position einmalig in Kamera-Richtung + Offset setzen
    const pos = new THREE.Vector3(offset[0], offset[1], offset[2])
      .applyQuaternion(camera.quaternion)
      .add(camera.position)
    groupRef.current.position.copy(pos)
    groupRef.current.visible = true
    initialized.current = true
  })

  // Unsichtbar starten, damit kein Flash bei (0,0,0) vor erstem Frame
  return (
    <group ref={groupRef} visible={false}>
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
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
    <VRHud offset={[-0.55, 0.36, -1.5]}>
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
  hintActive: boolean
  onHint:     () => void
  onBeenden:  () => void
}

function VRControlBar({ hintActive, onHint, onBeenden }: VRControlBarProps) {
  return (
    <VRHud offset={[0, -0.44, -1.5]}>
      <mesh>
        <planeGeometry args={[1.02, 0.11]} />
        <meshBasicMaterial color="#080c18" transparent opacity={0.80} />
      </mesh>
      {!hintActive ? (
        <VRButton
          label="Hinweis"
          position={[-0.27, 0, 0.002]}
          width={0.45}
          height={0.085}
          color="#2a1800"
          hoverColor="#b87300"
          textColor="#F0A500"
          fontSize={0.034}
          onClick={onHint}
        />
      ) : (
        <Text position={[-0.27, 0, 0.003]} fontSize={0.030} color="#F0A500" anchorX="center" anchorY="middle">
          Hinweis aktiv
        </Text>
      )}
      <VRButton
        label="Szene beenden"
        position={[0.27, 0, 0.002]}
        width={0.45}
        height={0.085}
        color="#151820"
        hoverColor="#2a3040"
        textColor="rgba(255,255,255,0.75)"
        fontSize={0.030}
        onClick={onBeenden}
      />
    </VRHud>
  )
}

// ── VR: Kategorie-Panel ──────────────────────────────────────────────────────
interface VRKategoriePanelProps {
  onSelect: (k: DefizitKategorie) => void
  onCancel: () => void
}

function VRKategoriePanel({ onSelect, onCancel }: VRKategoriePanelProps) {
  const btnH    = 0.077
  const btnGap  = 0.010
  const btnStep = btnH + btnGap
  const numBtn  = VR_KATEGORIEN.length + 1
  const panelH  = 0.18 + numBtn * btnStep + 0.04
  const panelW  = 0.80

  return (
    <VRHud offset={[0, 0, -1.5]}>
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#1a3060" transparent opacity={0.90} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>
      <Text position={[0, panelH / 2 - 0.048, 0.003]} fontSize={0.022} color="rgba(255,255,255,0.45)" anchorX="center" anchorY="middle">
        Schritt 0 — Kategorisierung
      </Text>
      <Text position={[0, panelH / 2 - 0.090, 0.003]} fontSize={0.036} color="#ffffff" anchorX="center" anchorY="middle">
        Was hast du identifiziert?
      </Text>
      {VR_KATEGORIEN.map(({ value, label }, i) => (
        <VRButton
          key={value}
          label={label}
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
        label="Abbrechen"
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

// ── VR: Klick-Feedback ───────────────────────────────────────────────────────
interface VRFeedbackProps {
  type:    KlickFeedbackType
  onClose: () => void
}

const VR_FEEDBACK_CFG: Record<KlickFeedbackType, { bg: string; title: string; sub: string; dauer: number }> = {
  kein_treffer:     { bg: '#141820', title: 'Kein Sicherheitsdefizit an dieser Stelle.', sub: 'Versuche es an einer anderen Stelle.', dauer: 2000 },
  bereits_gefunden: { bg: '#003060', title: 'Dieses Defizit hast du bereits gefunden.',  sub: '',                                       dauer: 2000 },
  kategorie_falsch: { bg: '#6a3800', title: 'Gefunden — aber falsche Kategorie.',         sub: '-10% Abzug. Weiter zur RSI-Bewertung.', dauer: 1800 },
  richtig:          { bg: '#0f4a12', title: 'Richtige Kategorie!',                        sub: 'Weiter zur RSI-Bewertung...',           dauer: 1500 },
}

function VRFeedback({ type, onClose }: VRFeedbackProps) {
  const cfg      = VR_FEEDBACK_CFG[type]
  const hasSubtext = cfg.sub.length > 0
  const panelH   = hasSubtext ? 0.19 : 0.13

  useEffect(() => {
    const t = setTimeout(onClose, cfg.dauer)
    return () => clearTimeout(t)
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
        {cfg.title}
      </Text>
      {hasSubtext && (
        <Text position={[0, -0.042, 0.003]} fontSize={0.026} color="rgba(255,255,255,0.75)" anchorX="center" anchorY="middle" maxWidth={0.68}>
          {cfg.sub}
        </Text>
      )}
    </VRHud>
  )
}

// ── VR: Alle-gefunden-Banner ─────────────────────────────────────────────────
function VRAllFound({ onBeenden }: { onBeenden: () => void }) {
  return (
    <VRHud offset={[0, -0.22, -1.5]}>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.82, 0.22]} />
        <meshBasicMaterial color="#083a0c" transparent opacity={0.95} />
      </mesh>
      <Text position={[0, 0.048, 0.003]} fontSize={0.032} color="#ffffff" anchorX="center" anchorY="middle">
        Alle Sicherheitsdefizite gefunden!
      </Text>
      <VRButton
        label="Szene beenden"
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
  hintActive:     boolean
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
  onHintRequest:     () => void
  onBeenden:         () => void
  aktivePerspektiveId: string | null
  aktiveBildUrl:       string | null | undefined
  pendingClickPos:     { theta: number; phi: number } | null
  onStandortWechsel:   (id: string | null) => void
  /** Set mit den bereits besuchten Perspektiven-IDs. '__haupt__' = Haupt-Panorama. */
  visitedPerspektiven: Set<string>
  hauptKey:            string
}

function SceneContent({
  scene, deficits, foundDeficits, hintActive,
  onSphereClick, startblick,
  onVRModeChange,
  phase, feedbackType, progress,
  sceneName, sceneKontextLabel, elapsedSec,
  onKategorieSelect, onKategorieCancel, onFeedbackClose,
  onHintRequest, onBeenden,
  aktivePerspektiveId, aktiveBildUrl, pendingClickPos, onStandortWechsel,
  visitedPerspektiven, hauptKey,
}: SceneContentProps) {
  const foundIds    = new Set(foundDeficits.map(f => f.deficitId))
  const allFound    = foundDeficits.length === deficits.length
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // XR-Session direkt via useXR erkennen (keine Verzoegerung durch State-Update)
  const xrSession = useXR(s => s.session)
  const isInXR    = xrSession != null

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
      <PanoramaSphere bildUrl={bildUrl} onClick={onSphereClick} />

      {/* Hotspots: gefundene Defizite immer grün, restliche nur bei aktivem Hint */}
      {deficits.map(d => {
        const isFound = foundIds.has(d.id)
        if (!isFound && !hintActive) return null
        const renderPos = getHotspotPosition(d, aktivePerspektiveId)
        if (!renderPos) return null
        return <Hotspot key={d.id} position={renderPos} found={isFound} />
      })}

      {/* Standort-Navigationsmarker (Haupt-Panorama → Perspektiven) */}
      {!aktivePerspektiveId && scene.perspektiven?.map((p, i) => {
        if (!p.standortPosition) return null
        const pos = sphericalToVector3(p.standortPosition, 60)
        const status: StandortMarkerStatus = visitedPerspektiven.has(p.id) ? 'besucht' : 'unbesucht'
        return (
          <StandortNavMarker
            key={`nav-${p.id}`}
            position={pos}
            label={p.label || `Standort ${i + 1}`}
            status={status}
            onClick={() => onStandortWechsel(p.id)}
          />
        )
      })}

      {/* NavMarker (Perspektive → Haupt / andere Perspektiven) */}
      {aktivePerspektiveId && (() => {
        const aktPersp = scene.perspektiven?.find(p => p.id === aktivePerspektiveId)
        if (!aktPersp?.navMarker) return null
        return Object.entries(aktPersp.navMarker).map(([zielId, markerPos]) => {
          const pos = sphericalToVector3(markerPos, 60)
          const zielPersp = scene.perspektiven?.find(p => p.id === zielId)
          const label = zielId === 'haupt'
            ? 'Haupt'
            : (zielPersp?.label || zielId)
          const visitedKey = zielId === 'haupt' ? hauptKey : zielId
          const status: StandortMarkerStatus = visitedPerspektiven.has(visitedKey) ? 'besucht' : 'unbesucht'
          return (
            <StandortNavMarker
              key={`nav-${zielId}`}
              position={pos}
              label={label}
              status={status}
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
                hintActive={hintActive}
                onHint={onHintRequest}
                onBeenden={onBeenden}
              />
            )}
            {allFound && phase === 'exploring' && (
              <VRAllFound onBeenden={onBeenden} />
            )}
            {phase === 'kategoriePanel' && (
              <VRKategoriePanel
                onSelect={onKategorieSelect}
                onCancel={onKategorieCancel}
              />
            )}
            {phase === 'klickFeedback' && (
              <VRFeedback
                type={feedbackType}
                onClose={onFeedbackClose}
              />
            )}
          </Suspense>
        </VRErrorBoundary>
      )}
    </>
  )
}

// ── Hinweis-Dialog (Browser) ─────────────────────────────────────────────────
interface HintDialogProps {
  hintCount:     number
  onBestätigen: () => void
  onAbbrechen:   () => void
}

function HintDialog({ hintCount, onBestätigen, onAbbrechen }: HintDialogProps) {
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
            Hinweis verwenden?
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: '8px' }}>
          Es werden <strong style={{ color: 'white' }}>{hintCount} Hotspot{hintCount !== 1 ? 's' : ''}</strong> im Bild
          eingeblendet. Pro gefundenem Sicherheitsdefizit mit aktivem Hinweis werden
          <strong style={{ color: 'var(--zh-warnung)' }}> 50% der Punkte abgezogen</strong>.
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginBottom: '20px' }}>
          Der Hinweis bleibt für die gesamte Szene aktiv.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onAbbrechen}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            Abbrechen
          </button>
          <button
            onClick={onBestätigen}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--zh-warnung)', color: '#1a1400', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
          >
            Trotzdem einblenden
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Alle-gefunden-Banner (Browser) ───────────────────────────────────────────
function AllFoundBanner({ onBeenden }: { onBeenden: () => void }) {
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
        Alle Sicherheitsdefizite gefunden!
      </span>
      <button
        onClick={onBeenden}
        style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: 'white', color: '#1A7F1F', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
      >
        Szene beenden
      </button>
    </div>
  )
}

// ── Haupt-Komponente SceneViewer ──────────────────────────────────────────────

export interface DeficitConfirmedPayload {
  deficit:          AppDeficit
  kategorieRichtig: boolean
  hintPenalty:      boolean
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
  hintActive:         boolean
  // Ms-Epoch-Stamp wann die Szene gestartet wurde (aus App.tsx handleEinstiegStart).
  // Wird fuer den VR-HUD-Timer (v0.8.0) gebraucht.
  sceneStartTime:     number
  onDeficitConfirmed: (payload: DeficitConfirmedPayload) => void
  onHintActivate:     () => void
  onBeenden:          () => void
}

type Phase =
  | 'exploring'
  | 'pendingConfirm'
  | 'kategoriePanel'
  | 'klickFeedback'
  | 'hintDialog'
  | 'bewertungW'
  | 'bewertungA'
  | 'bewertungN'

export default function SceneViewer({
  scene, deficits, foundDeficits, hintActive, sceneStartTime,
  onDeficitConfirmed, onHintActivate, onBeenden,
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

  // VR-Modus-Wechsel (von SceneContent via useXR gemeldet)
  // Kein phase-Dependency – phaseRef verhindert dass jeder Phase-Wechsel
  // das useEffect in SceneContent neu ausloest und den Klick-Flow resetzt
  const handleVRModeChange = useCallback((v: boolean) => {
    setIsVR(v)
    const p = phaseRef.current
    if (!v && (p === 'kategoriePanel' || p === 'pendingConfirm' || p === 'bewertungW' || p === 'bewertungA' || p === 'bewertungN')) {
      hitDeficit.current = null
      setUserWichtigkeit(null)
      setUserAbweichung(null)
      setPendingClickPos(null)
      setPhase('exploring')
    }
  }, [])

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

  // ── Hint aktivieren ─────────────────────────────────────────────────────────
  const handleHintRequest = useCallback(() => {
    if (isVR) {
      onHintActivate()
    } else {
      setPhase('hintDialog')
    }
  }, [isVR, onHintActivate])

  const handleHintBestätigen = useCallback(() => {
    onHintActivate()
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
            hintActive={hintActive}
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
            onBeenden={onBeenden}
            aktivePerspektiveId={aktivePerspektiveId}
            aktiveBildUrl={aktiveBildUrl}
            pendingClickPos={pendingClickPos}
            onStandortWechsel={handleStandortWechsel}
            visitedPerspektiven={visitedPerspektiven}
            hauptKey={HAUPT_KEY}
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
          {!hintActive && (
            <button
              onClick={() => setPhase('hintDialog')}
              title="Hotspots einblenden (−50 % Punkte)"
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
              <Eye size={14} /> Hinweis
            </button>
          )}
          {hintActive && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 14px', borderRadius: '9px',
              background: 'rgba(240,165,0,0.20)',
              border: '1px solid rgba(240,165,0,0.45)',
              color: 'var(--zh-warnung)',
              fontSize: '12px', fontWeight: 700,
              fontFamily: 'var(--zh-font)',
            }}>
              <MapPin size={13} /> Hinweis aktiv
            </div>
          )}
          <button
            onClick={() => xrStore.enterVR()}
            title="VR-Modus starten (Meta Quest)"
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
              { icon: <ZoomIn size={15} />, title: 'Reinzoomen', onClick: () => setFov(f => Math.max(30, f - 5)) },
              { icon: <Maximize2 size={14} />, title: 'Standardansicht', onClick: () => setFov(75) },
              { icon: <ZoomOut size={15} />, title: 'Rauszoomen', onClick: () => setFov(f => Math.min(90, f + 5)) },
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
            <X size={15} /> Szene beenden
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
        const tableWert = WICHTIGKEIT_TABLE[d.kriteriumId]
        const prefill: RSIDimension | null = tableWert
          ? ((tableWert[d.kontext] as RSIDimension | '') || null)
          : null
        return (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(16px)',
            borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)',
            padding: '24px 28px', width: '380px', maxWidth: '92vw',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)', zIndex: 300, fontFamily: 'var(--zh-font)',
          }}>
            <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)', marginBottom: '3px' }}>
              {t('scoring.bewertung_schritt', { nr: 1 })} — {t('scoring.phase_a')}
            </p>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
              {t('scoring.wie_wichtig')}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '6px' }}>
              {KRITERIUM_LABELS[d.kriteriumId] ?? d.kriteriumId} · {d.kontext === 'io' ? 'Innerorts' : 'Ausserorts'}
            </p>
            {prefill && (
              <p style={{ fontSize: '11px', color: 'color-mix(in srgb, var(--zh-blau) 85%, transparent)', marginBottom: '14px' }}>
                Gemäss Tabelle: <strong>{prefill === 'gross' ? 'Gross' : prefill === 'mittel' ? 'Mittel' : 'Klein'}</strong>
              </p>
            )}
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
                  {w === 'gross' ? 'Gross' : w === 'mittel' ? 'Mittel' : 'Klein'}
                </button>
              ))}
            </div>
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
            {t('scoring.bewertung_schritt', { nr: 2 })} — {t('scoring.phase_b')}
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>
            {t('scoring.wie_abweichung')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ABWEICHUNG_KATEGORIEN.map(k => (
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
                <span style={{ display: 'block' }}>{k.label}</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.50)', fontWeight: 400, marginTop: '2px' }}>{k.beschreibung}</span>
              </button>
            ))}
          </div>
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
            {t('scoring.bewertung_schritt', { nr: 3 })} — {t('scoring.phase_d')}
          </p>
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
            {t('scoring.wie_schwer')}
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px' }}>
            {t('scoring.stell_dir_vor')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {([
              { wert: 'leicht' as NACADimension, label: 'Leicht', sub: 'NACA 0–1 · Keine bis geringfügige Verletzung', color: '#1A7F1F' },
              { wert: 'mittel' as NACADimension, label: 'Mittel', sub: 'NACA 2–3 · Leichte bis mässige Verletzung', color: '#B87300' },
              { wert: 'schwer' as NACADimension, label: 'Schwer', sub: 'NACA 4–7 · Schwere Verletzung bis Tod', color: '#D40053' },
            ]).map(g => (
              <button
                key={g.wert}
                onClick={() => {
                  // Alle 3 Schritte fertig → Payload an App.tsx
                  const d = hitDeficit.current!
                  onDeficitConfirmed({
                    deficit:          d,
                    kategorieRichtig: hitKatRichtig.current,
                    hintPenalty:      hintActive,
                    userWichtigkeit:  userWichtigkeit!,
                    userAbweichung:   userAbweichung!,
                    userNacaSchwere:  g.wert,
                    bewertungStartMs: bewertungStartTime.current,
                  })
                  hitDeficit.current = null
                  setPhase('exploring')
                }}
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
            Standort
          </span>
          {/* Haupt-Panorama */}
          <button
            onClick={() => handleStandortWechsel(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '9px',
              border: !aktivePerspektiveId ? '2px solid #0076BD' : '1px solid rgba(255,255,255,0.18)',
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
            <span>Haupt</span>
          </button>
          {/* Perspektiven */}
          {perspektiven.map((p, i) => {
            const isActive = p.id === aktivePerspektiveId
            return (
              <button
                key={p.id}
                onClick={() => handleStandortWechsel(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px', borderRadius: '9px',
                  border: isActive ? '2px solid #0076BD' : '1px solid rgba(255,255,255,0.18)',
                  background: isActive ? 'rgba(0,118,189,0.25)' : 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(10px)',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.70)',
                  fontSize: '13px', fontWeight: isActive ? 700 : 500,
                  cursor: isActive ? 'default' : 'pointer',
                  fontFamily: 'var(--zh-font)',
                  transition: 'all 0.15s',
                  minWidth: '140px',
                  textAlign: 'left',
                }}
              >
                <MapPin size={13} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.5 }} />
                <span>{p.label || `Standort ${i + 1}`}</span>
              </button>
            )
          })}
        </div>
      )}

      {htmlVisible && phase === 'hintDialog' && (
        <HintDialog
          hintCount={deficits.filter(d => !foundIds.has(d.id)).length}
          onBestätigen={handleHintBestätigen}
          onAbbrechen={handleHintAbbrechen}
        />
      )}
    </div>
  )
}
