// SceneViewer – 360°-Panorama-Viewer mit Klick-Flow
// R3F Canvas + OrbitControls + Hotspots + HTML-Overlay
// Phase 2: Browser | Phase 3+: WebXR Meta Quest 3

import * as THREE from 'three'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Billboard, Text } from '@react-three/drei'
import { createXRStore, XR, useXRSessionVisibilityState } from '@react-three/xr'
import { Suspense, useCallback, useState, useRef, useEffect } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Eye, X, Glasses, MapPin } from 'lucide-react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  clickToSpherical,
  sphericalToVector3,
  isInTolerance,
  trefferpruefung,
} from '../utils/sphereCoords'
import { ml, type AppScene, type AppDeficit, type DefizitKategorie, type FoundDeficit } from '../data/appData'
import KategoriePanel from './KategoriePanel'
import KlickFeedback, { type KlickFeedbackType } from './KlickFeedback'
import { useTranslation } from 'react-i18next'

// Modul-Level Singleton – nie innerhalb von Komponenten erzeugen
const xrStore = createXRStore()

// Kategorien fuer VR-Panel
const VR_KATEGORIEN: { value: DefizitKategorie; label: string }[] = [
  { value: 'verkehrsfuehrung', label: 'Verkehrsfuehrung'       },
  { value: 'sicht',            label: 'Sicht'                  },
  { value: 'ausruestung',      label: 'Ausruestung'            },
  { value: 'zustand',          label: 'Zustand Verkehrsflaeche'},
  { value: 'strassenrand',     label: 'Strassenrand'           },
  { value: 'verkehrsablauf',   label: 'Verkehrsablauf'         },
  { value: 'baustelle',        label: 'Baustelle'              },
]

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

// ── Hotspot-Position fuer ein Defizit bestimmen ──────────────────────────────
function getHotspotPosition(d: AppDeficit): THREE.Vector3 | null {
  if (d.verortung) {
    if (d.verortung.typ === 'punkt') {
      return sphericalToVector3(d.verortung.position, 60)
    }
    if (d.verortung.typ === 'polygon' && d.verortung.punkte.length > 0) {
      const n        = d.verortung.punkte.length
      const sumTheta = d.verortung.punkte.reduce((s, p) => s + p.theta, 0)
      const sumPhi   = d.verortung.punkte.reduce((s, p) => s + p.phi,   0)
      return sphericalToVector3({ theta: sumTheta / n, phi: sumPhi / n }, 60)
    }
    if (d.verortung.typ === 'gruppe' && d.verortung.elemente.length > 0) {
      const erstesElement = d.verortung.elemente[0]
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

// ── VR: HUD-Gruppe folgt der Kamera jeden Frame ──────────────────────────────
// offset = lokaler Versatz in Kamera-Koordinaten (z.B. [0, 0, -1.5] = 1.5 m vor Kamera)
interface VRHudProps {
  offset?: [number, number, number]
  children: React.ReactNode
}

function VRHud({ offset = [0, 0, -1.5], children }: VRHudProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    // Position: Kamera + rotierten Offset
    const pos = new THREE.Vector3(offset[0], offset[1], offset[2])
      .applyQuaternion(camera.quaternion)
      .add(camera.position)
    groupRef.current.position.copy(pos)
    // Rotation: Panel-Vorderseite zeigt zur Kamera (Panel+Z = Kamera+Z = hinter Kamera)
    groupRef.current.quaternion.copy(camera.quaternion)
  })

  return <group ref={groupRef}>{children}</group>
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

// ── VR: Modus-Erkennung ──────────────────────────────────────────────────────
function VRModeDetector({ onVRChange }: { onVRChange: (isVR: boolean) => void }) {
  const visibility = useXRSessionVisibilityState()

  useEffect(() => {
    onVRChange(visibility === 'visible')
  }, [visibility, onVRChange])

  return null
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
  const maxDots = Math.min(dots.length, 10)
  const shownDots = dots.slice(0, maxDots)
  // X-Startposition fuer Dots zentriert
  const dotStep    = 0.038
  const dotsWidth  = (shownDots.length - 1) * dotStep
  const dotsStartX = -dotsWidth / 2

  return (
    <VRHud offset={[-0.55, 0.36, -1.5]}>
      {/* Hintergrund */}
      <mesh>
        <planeGeometry args={[0.56, 0.24]} />
        <meshBasicMaterial color="#080c18" transparent opacity={0.88} />
      </mesh>
      {/* Kontext-Label */}
      <Text
        position={[0, 0.08, 0.003]}
        fontSize={0.020}
        color="rgba(255,255,255,0.45)"
        anchorX="center"
        anchorY="middle"
      >
        {kontext}
      </Text>
      {/* Szenenname */}
      <Text
        position={[0, 0.035, 0.003]}
        fontSize={0.030}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.50}
      >
        {sceneName}
      </Text>
      {/* Fortschritts-Dots */}
      {shownDots.map((d, i) => (
        <mesh key={i} position={[dotsStartX + i * dotStep, -0.055, 0.003]}>
          <circleGeometry args={[0.013, 16]} />
          <meshBasicMaterial color={d.found ? '#1A7F1F' : '#3a3f4a'} />
        </mesh>
      ))}
      {/* Zaehler */}
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
      {/* Hintergrund-Leiste */}
      <mesh>
        <planeGeometry args={[1.02, 0.11]} />
        <meshBasicMaterial color="#080c18" transparent opacity={0.80} />
      </mesh>

      {/* Hinweis-Button oder Status */}
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
        <Text
          position={[-0.27, 0, 0.003]}
          fontSize={0.030}
          color="#F0A500"
          anchorX="center"
          anchorY="middle"
        >
          Hinweis aktiv
        </Text>
      )}

      {/* Szene beenden */}
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
  const numBtn  = VR_KATEGORIEN.length + 1  // +1 fuer Abbrechen
  const panelH  = 0.18 + numBtn * btnStep + 0.04
  const panelW  = 0.80

  return (
    <VRHud offset={[0, 0, -1.5]}>
      {/* Rand */}
      <mesh position={[0, 0, -0.003]}>
        <planeGeometry args={[panelW + 0.012, panelH + 0.012]} />
        <meshBasicMaterial color="#1a3060" transparent opacity={0.90} />
      </mesh>
      {/* Hintergrund */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[panelW, panelH]} />
        <meshBasicMaterial color="#090d1b" transparent opacity={0.96} />
      </mesh>

      {/* Header */}
      <Text
        position={[0, panelH / 2 - 0.048, 0.003]}
        fontSize={0.022}
        color="rgba(255,255,255,0.45)"
        anchorX="center"
        anchorY="middle"
      >
        Schritt 0 — Kategorisierung
      </Text>
      <Text
        position={[0, panelH / 2 - 0.090, 0.003]}
        fontSize={0.036}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Was hast du identifiziert?
      </Text>

      {/* Kategorie-Buttons */}
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

      {/* Abbrechen */}
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
  const cfg = VR_FEEDBACK_CFG[type]

  useEffect(() => {
    const t = setTimeout(onClose, cfg.dauer)
    return () => clearTimeout(t)
  }, [onClose, cfg.dauer])

  const hasSubtext = cfg.sub.length > 0
  const panelH     = hasSubtext ? 0.19 : 0.13

  return (
    <VRHud offset={[0, 0.06, -1.5]}>
      {/* Rand */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.76, panelH + 0.012]} />
        <meshBasicMaterial color="rgba(255,255,255,0.18)" transparent opacity={0.30} />
      </mesh>
      {/* Hintergrund */}
      <mesh>
        <planeGeometry args={[0.75, panelH]} />
        <meshBasicMaterial color={cfg.bg} transparent opacity={0.95} />
      </mesh>
      {/* Haupt-Text */}
      <Text
        position={[0, hasSubtext ? 0.042 : 0, 0.003]}
        fontSize={0.034}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.68}
      >
        {cfg.title}
      </Text>
      {/* Unter-Text */}
      {hasSubtext && (
        <Text
          position={[0, -0.042, 0.003]}
          fontSize={0.026}
          color="rgba(255,255,255,0.75)"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.68}
        >
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
      {/* Hintergrund */}
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[0.82, 0.22]} />
        <meshBasicMaterial color="#083a0c" transparent opacity={0.95} />
      </mesh>
      <Text
        position={[0, 0.048, 0.003]}
        fontSize={0.032}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
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
  // VR-spezifisch
  isVR:              boolean
  onVRModeChange:    (v: boolean) => void
  phase:             Phase
  feedbackType:      KlickFeedbackType
  progress:          { id: string; found: boolean }[]
  sceneKontextLabel: string
  sceneName:         string
  onKategorieSelect: (k: DefizitKategorie) => void
  onKategorieCancel: () => void
  onFeedbackClose:   () => void
  onHintRequest:     () => void
  onBeenden:         () => void
}

function SceneContent({
  scene, deficits, foundDeficits, hintActive,
  onSphereClick, startblick,
  isVR, onVRModeChange,
  phase, feedbackType, progress,
  sceneKontextLabel, sceneName,
  onKategorieSelect, onKategorieCancel, onFeedbackClose,
  onHintRequest, onBeenden,
}: SceneContentProps) {
  const foundIds    = new Set(foundDeficits.map(f => f.deficitId))
  const allFound    = foundDeficits.length === deficits.length
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Startblick setzen
  useEffect(() => {
    if (!controlsRef.current || !startblick) return
    const azimuth = -(startblick.theta * Math.PI / 180)
    const polar   =   startblick.phi   * Math.PI / 180
    controlsRef.current.setAzimuthalAngle(azimuth)
    controlsRef.current.setPolarAngle(polar)
    controlsRef.current.update()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const bildUrl = scene.panoramaBildUrl ?? scene.bildUrl

  return (
    <>
      {/* OrbitControls nur im Browser-Modus */}
      <OrbitControls
        ref={controlsRef}
        enabled={!isVR}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={-0.45}
        reverseOrbit={false}
      />

      {/* Panorama */}
      <PanoramaSphere bildUrl={bildUrl} onClick={onSphereClick} />

      {/* Hotspots */}
      {hintActive && deficits.map(d => {
        const renderPos = getHotspotPosition(d)
        if (!renderPos) return null
        return (
          <Hotspot key={d.id} position={renderPos} found={foundIds.has(d.id)} />
        )
      })}

      {/* VR-Modus-Erkennung */}
      <VRModeDetector onVRChange={onVRModeChange} />

      {/* ── VR-spezifische 3D-Panels ─────────────────────────────────────── */}
      {isVR && (
        <Suspense fallback={null}>
          {/* Fortschritts-Panel (immer sichtbar) */}
          <VRProgressPanel
            sceneName={sceneName}
            kontext={sceneKontextLabel}
            foundCount={foundDeficits.length}
            totalCount={deficits.length}
            dots={progress}
          />

          {/* Kontroll-Leiste (immer sichtbar, ausser bei aktivem Panel) */}
          {phase === 'exploring' && (
            <VRControlBar
              hintActive={hintActive}
              onHint={onHintRequest}
              onBeenden={onBeenden}
            />
          )}

          {/* Alle gefunden */}
          {allFound && phase === 'exploring' && (
            <VRAllFound onBeenden={onBeenden} />
          )}

          {/* Kategorie-Auswahl */}
          {phase === 'kategoriePanel' && (
            <VRKategoriePanel
              onSelect={onKategorieSelect}
              onCancel={onKategorieCancel}
            />
          )}

          {/* Klick-Feedback */}
          {phase === 'klickFeedback' && (
            <VRFeedback
              type={feedbackType}
              onClose={onFeedbackClose}
            />
          )}
        </Suspense>
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
          Der Hinweis bleibt fuer die gesamte Szene aktiv.
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
  | 'kategoriePanel'
  | 'klickFeedback'
  | 'hintDialog'

export default function SceneViewer({
  scene, deficits, foundDeficits, hintActive,
  onDeficitConfirmed, onHintActivate, onBeenden,
}: Props) {
  const { i18n } = useTranslation()
  const lang     = i18n.language

  const [phase, setPhase]           = useState<Phase>('exploring')
  const [feedbackType, setFeedback] = useState<KlickFeedbackType>('kein_treffer')
  const [isVR, setIsVR]             = useState(false)

  const hitDeficit    = useRef<AppDeficit | null>(null)
  const hitKatRichtig = useRef<boolean>(false)

  const foundIds = new Set(foundDeficits.map(f => f.deficitId))
  const allFound = foundDeficits.length === deficits.length

  // ── VR-Modus-Wechsel (Callback fuer VRModeDetector) ────────────────────────
  const handleVRModeChange = useCallback((v: boolean) => {
    setIsVR(v)
    // Beim Verlassen des VR-Modus aktive Dialoge schliessen
    if (!v && (phase === 'kategoriePanel')) {
      hitDeficit.current = null
      setPhase('exploring')
    }
  }, [phase])

  // ── Klick auf die Sphere ────────────────────────────────────────────────────
  const handleSphereClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (phase !== 'exploring') return

    const clickPos = clickToSpherical(e.point)

    const hit = deficits.find(d => {
      if (d.verortung) return trefferpruefung(clickPos, d.verortung)
      if (!d.position) return false
      return isInTolerance(clickPos, d.position, d.tolerance ?? 15)
    })

    if (!hit) {
      setFeedback('kein_treffer')
      setPhase('klickFeedback')
      return
    }

    if (foundIds.has(hit.id)) {
      setFeedback('bereits_gefunden')
      setPhase('klickFeedback')
      return
    }

    hitDeficit.current = hit
    setPhase('kategoriePanel')
  }, [phase, deficits, foundIds])

  // ── Kategorie gewaehlt ──────────────────────────────────────────────────────
  const handleKategorieSelect = useCallback((gewaehlteKategorie: DefizitKategorie) => {
    const d = hitDeficit.current
    if (!d) return

    const kategorieRichtig    = d.kategorie === gewaehlteKategorie
    hitKatRichtig.current     = kategorieRichtig

    setFeedback(kategorieRichtig ? 'richtig' : 'kategorie_falsch')
    setPhase('klickFeedback')
  }, [])

  // ── KategoriePanel abgebrochen ──────────────────────────────────────────────
  const handleKategorieCancel = useCallback(() => {
    hitDeficit.current = null
    setPhase('exploring')
  }, [])

  // ── Feedback-Anzeige abgelaufen ─────────────────────────────────────────────
  const handleFeedbackClose = useCallback(() => {
    const d = hitDeficit.current

    if (d && (feedbackType === 'richtig' || feedbackType === 'kategorie_falsch')) {
      onDeficitConfirmed({
        deficit:          d,
        kategorieRichtig: hitKatRichtig.current,
        hintPenalty:      hintActive,
      })
    }

    hitDeficit.current = null
    setPhase('exploring')
  }, [feedbackType, hintActive, onDeficitConfirmed])

  // ── Hint-Anfrage (aus VR oder Browser) ─────────────────────────────────────
  const handleHintRequest = useCallback(() => {
    if (isVR) {
      // Im VR kein Dialog – Hinweis sofort aktivieren
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
  const sceneKontextLabel = scene.kontext === 'io' ? 'Innerorts' : 'Ausserorts'

  // ── HTML-Overlays ausblenden wenn VR aktiv ──────────────────────────────────
  const htmlVisible = !isVR

  return (
    <div style={{ position: 'relative', flex: 1, background: '#1a1c22', overflow: 'hidden' }}>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 0.01], fov: 75 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true }}
      >
        {/* Schwarzer Hintergrund verhindert weissen Meta-Quest-Hintergrund im XR-Modus */}
        <color attach="background" args={['#000000']} />
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <SceneContent
              scene={scene}
              deficits={deficits}
              foundDeficits={foundDeficits}
              hintActive={hintActive}
              onSphereClick={handleSphereClick}
              startblick={scene.startblick}
              isVR={isVR}
              onVRModeChange={handleVRModeChange}
              phase={phase}
              feedbackType={feedbackType}
              progress={progress}
              sceneKontextLabel={sceneKontextLabel}
              sceneName={sceneName}
              onKategorieSelect={handleKategorieSelect}
              onKategorieCancel={handleKategorieCancel}
              onFeedbackClose={handleFeedbackClose}
              onHintRequest={handleHintRequest}
              onBeenden={onBeenden}
            />
          </Suspense>
        </XR>
      </Canvas>

      {/* ── HTML-Overlays (nur Browser-Modus) ── */}

      {/* Oben links: Szenenname + Fortschritt */}
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

      {/* Oben rechts: Hinweis + VR + Beenden */}
      {htmlVisible && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          display: 'flex', flexDirection: 'column', gap: '8px',
          zIndex: 50,
        }}>
          {/* Hinweis-Button */}
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

          {/* VR-Button */}
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

      {/* Unten: Szene beenden */}
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

      {/* Alle-gefunden-Banner */}
      {htmlVisible && allFound && phase === 'exploring' && (
        <AllFoundBanner onBeenden={onBeenden} />
      )}

      {/* Overlay: KategoriePanel */}
      {htmlVisible && phase === 'kategoriePanel' && (
        <KategoriePanel
          onSelect={handleKategorieSelect}
          onCancel={handleKategorieCancel}
        />
      )}

      {/* Overlay: KlickFeedback */}
      {htmlVisible && phase === 'klickFeedback' && (
        <KlickFeedback
          type={feedbackType}
          onClose={handleFeedbackClose}
        />
      )}

      {/* Overlay: HintDialog */}
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
