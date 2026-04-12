// SceneViewer – 360°-Panorama-Viewer mit Klick-Flow
// R3F Canvas + OrbitControls + Hotspots + HTML-Overlay
// Phase 2: Browser | Phase 3+: WebXR Meta Quest 3

import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Billboard, Text } from '@react-three/drei'
import { XR, useXR } from '@react-three/xr'
import { xrStore } from '../xrStore'
import { Suspense, useCallback, useState, useRef, useEffect, Component } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Eye, X, Glasses, MapPin } from 'lucide-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  clickToSpherical,
  sphericalToVector3,
  isInTolerance,
  trefferpruefung,
} from '../utils/sphereCoords'
import { ml, getVerortungFuerPerspektive, type AppScene, type AppDeficit, type DefizitKategorie, type FoundDeficit } from '../data/appData'
import KategoriePanel from './KategoriePanel'
import KlickFeedback, { type KlickFeedbackType } from './KlickFeedback'
import { useTranslation } from 'react-i18next'
import { WICHTIGKEIT_TABLE, ABWEICHUNG_KATEGORIEN, KRITERIUM_LABELS } from '../data/scoringEngine'
import type { RSIDimension, NACADimension } from '../types'

// Modul-Level Singleton – nie innerhalb von Komponenten erzeugen

// Kategorien fuer VR-Panel
const VR_KATEGORIEN: { value: DefizitKategorie; label: string }[] = [
  { value: 'verkehrsfuehrung', label: 'Verkehrsführung'        },
  { value: 'sicht',            label: 'Sicht'                  },
  { value: 'ausruestung',      label: 'Ausrüstung'             },
  { value: 'zustand',          label: 'Zustand Verkehrsfläche' },
  { value: 'strassenrand',     label: 'Strassenrand'           },
  { value: 'verkehrsablauf',   label: 'Verkehrsablauf'         },
  { value: 'baustelle',        label: 'Baustelle'              },
]

// ── Fehlergrenze fuer VR-Panels (verhindert Scene-Crash) ────────────────────
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
  return <meshBasicMaterial map={texture} side={THREE.BackSide} />
}

// ── Hotspot (Billboard – immer zur Kamera gedreht) ───────────────────────────
interface HotspotProps {
  position: THREE.Vector3
  found: boolean
}

function Hotspot({ position, found }: HotspotProps) {
  const ringColor   = found ? '#1A7F1F' : '#0076BD'
  const fillColor   = found ? '#1A7F1F' : '#0076BD'
  const fillOpacity = 0.25

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      <mesh>
        <ringGeometry args={[3.5, 5, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[3.5, 32]} />
        <meshBasicMaterial color={fillColor} transparent opacity={fillOpacity} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
    </Billboard>
  )
}

// ── Hotspot-Position fuer ein Defizit bestimmen (perspektivenabhaengig) ──────
function getHotspotPosition(d: AppDeficit, perspektivenId: string | null = null): THREE.Vector3 | null {
  const verortung = getVerortungFuerPerspektive(d, perspektivenId)
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
  if (d.position) return sphericalToVector3(d.position, 60)
  return null
}

// ── VR: Panel im Weltraum – Position einmalig bei Mount erfassen ─────────────
// Beim ersten Frame wird die aktuelle Blickrichtung erfasst und das Panel
// dort fixiert. Danach dreht nur noch Billboard es zur Kamera – die Position
// bleibt unveraendert (keine Kopf-Bindung mehr).
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
}

function VRProgressPanel({ sceneName, kontext, foundCount, totalCount, dots }: VRProgressPanelProps) {
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
  onKategorieSelect: (k: DefizitKategorie) => void
  onKategorieCancel: () => void
  onFeedbackClose:   () => void
  onHintRequest:     () => void
  onBeenden:         () => void
  aktivePerspektiveId: string | null
  aktiveBildUrl:       string | null | undefined
  pendingClickPos:     { theta: number; phi: number } | null
}

function SceneContent({
  scene, deficits, foundDeficits, hintActive,
  onSphereClick, startblick,
  onVRModeChange,
  phase, feedbackType, progress,
  sceneName, sceneKontextLabel,
  onKategorieSelect, onKategorieCancel, onFeedbackClose,
  onHintRequest, onBeenden,
  aktivePerspektiveId, aktiveBildUrl, pendingClickPos,
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
  useEffect(() => {
    if (!controlsRef.current || !startblick) return
    const azimuth = -(startblick.theta * Math.PI / 180)
    const polar   =   startblick.phi   * Math.PI / 180
    controlsRef.current.setAzimuthalAngle(azimuth)
    controlsRef.current.setPolarAngle(polar)
    controlsRef.current.update()
  }, [startblick])

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

      {/* Hotspots (perspektivenabhaengig) */}
      {hintActive && deficits.map(d => {
        const renderPos = getHotspotPosition(d, aktivePerspektiveId)
        if (!renderPos) return null
        return <Hotspot key={d.id} position={renderPos} found={foundIds.has(d.id)} />
      })}

      {/* Pending-Klick-Marker (Browser: pulsierender Ring) */}
      {pendingClickPos && (
        <Billboard position={sphericalToVector3(pendingClickPos, 60)} follow lockX={false} lockY={false} lockZ={false}>
          <mesh>
            <ringGeometry args={[4, 6, 32]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.9} side={THREE.DoubleSide} depthTest={false} />
          </mesh>
          <mesh>
            <circleGeometry args={[4, 32]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} side={THREE.DoubleSide} depthTest={false} />
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
  onBestaetigen: () => void
  onAbbrechen:   () => void
}

function HintDialog({ hintCount, onBestaetigen, onAbbrechen }: HintDialogProps) {
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
          <Eye size={20} style={{ color: '#F0A500', flexShrink: 0 }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0 }}>
            Hinweis verwenden?
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: '8px' }}>
          Es werden <strong style={{ color: 'white' }}>{hintCount} Hotspot{hintCount !== 1 ? 's' : ''}</strong> im Bild
          eingeblendet. Pro gefundenem Sicherheitsdefizit mit aktivem Hinweis werden
          <strong style={{ color: '#F0A500' }}> 50% der Punkte abgezogen</strong>.
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
            onClick={onBestaetigen}
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#F0A500', color: '#1a1400', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--zh-font)' }}
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
}

interface Props {
  scene:              AppScene
  deficits:           AppDeficit[]
  foundDeficits:      FoundDeficit[]
  hintActive:         boolean
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
  scene, deficits, foundDeficits, hintActive,
  onDeficitConfirmed, onHintActivate, onBeenden,
}: Props) {
  const { i18n, t } = useTranslation()
  const lang     = i18n.language

  const [phase, setPhase]           = useState<Phase>('exploring')
  const [feedbackType, setFeedback] = useState<KlickFeedbackType>('kein_treffer')
  const [isVR, setIsVR]             = useState(false)

  // Perspektiven
  const perspektiven = scene.perspektiven ?? []
  // Immer mit dem Haupt-Panorama starten — Perspektiven per Button wechseln
  const [aktivePerspektiveId, setAktivePerspektiveId] = useState<string | null>(null)
  const aktivePerspektive = perspektiven.find(p => p.id === aktivePerspektiveId) ?? null
  const aktiveBildUrl = aktivePerspektive?.bildUrl ?? scene.panoramaBildUrl ?? scene.bildUrl
  const aktiveStartblick = aktivePerspektive?.startblick ?? scene.startblick

  const hitDeficit    = useRef<AppDeficit | null>(null)
  const hitKatRichtig = useRef<boolean>(false)

  // Klick-Bestätigungs-Marker (Browser: Klick → Marker → Bestätigen)
  const [pendingClickPos, setPendingClickPos] = useState<{ theta: number; phi: number } | null>(null)
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref fuer Phase – vermeidet stale-closure in handleVRModeChange
  const phaseRef      = useRef<Phase>('exploring')
  phaseRef.current = phase

  // Bewertungs-State (Overlay im Viewer)
  const [userWichtigkeit, setUserWichtigkeit] = useState<RSIDimension | null>(null)
  const [userAbweichung, setUserAbweichung]   = useState<RSIDimension | null>(null)

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
      const verortung = getVerortungFuerPerspektive(d, aktivePerspektiveId)
      if (verortung) return trefferpruefung(clickPos, verortung)
      // Legacy-Fallback nur bei Haupt-Panorama (keine Perspektive aktiv)
      if (!aktivePerspektiveId && d.position) {
        return isInTolerance(clickPos, d.position, d.tolerance ?? 15)
      }
      return false
    })

    if (!hit) {
      setFeedback('kein_treffer')
      setPhase('klickFeedback')
      setPendingClickPos(null)
      return
    }

    if (foundIds.has(hit.id)) {
      setFeedback('bereits_gefunden')
      setPhase('klickFeedback')
      setPendingClickPos(null)
      return
    }

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

  // ── Kategorie gewaehlt ──────────────────────────────────────────────────────
  const handleKategorieSelect = useCallback((gewaehlteKategorie: DefizitKategorie) => {
    const d = hitDeficit.current
    if (!d) return
    const kategorieRichtig = d.kategorie === gewaehlteKategorie
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

  const handleHintBestaetigen = useCallback(() => {
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

  return (
    <div style={{ position: 'relative', flex: 1, background: '#1a1c22', overflow: 'hidden' }}>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 0.01], fov: 75 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true }}
      >
        <XR store={xrStore}>
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
            onKategorieSelect={handleKategorieSelect}
            onKategorieCancel={handleKategorieCancel}
            onFeedbackClose={handleFeedbackClose}
            onHintRequest={handleHintRequest}
            onBeenden={onBeenden}
            aktivePerspektiveId={aktivePerspektiveId}
            aktiveBildUrl={aktiveBildUrl}
            pendingClickPos={pendingClickPos}
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
                color: '#F0A500',
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
              color: '#F0A500',
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
            {t('szene.bestaetigen')}
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
              <p style={{ fontSize: '11px', color: 'rgba(0,118,189,0.85)', marginBottom: '14px' }}>
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

      {/* Perspektiven-Switcher */}
      {htmlVisible && perspektiven.length > 1 && phase === 'exploring' && (
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
            Perspektive
          </span>
          {perspektiven.map((p, i) => {
            const isActive = p.id === aktivePerspektiveId
            return (
              <button
                key={p.id}
                onClick={() => setAktivePerspektiveId(p.id)}
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
          onBestaetigen={handleHintBestaetigen}
          onAbbrechen={handleHintAbbrechen}
        />
      )}
    </div>
  )
}
