// SceneViewer – 360°-Panorama-Viewer mit Klick-Flow
// R3F Canvas + OrbitControls + Hotspots + HTML-Overlay
// Phase 2: Browser | Phase 3+: WebXR Meta Quest 3

import * as THREE from 'three'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Billboard } from '@react-three/drei'
import { createXRStore, XR } from '@react-three/xr'
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

// ── Boden-Platzhalter ────────────────────────────────────────────────────────
function BodenPlatzhalter() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} renderOrder={1}>
      <circleGeometry args={[8, 48]} />
      <meshBasicMaterial color="#3a3d42" />
    </mesh>
  )
}

// ── Hotspot (Billboard – immer zur Kamera gedreht) ───────────────────────────
interface HotspotProps {
  position: THREE.Vector3
  found: boolean
}

function Hotspot({ position, found }: HotspotProps) {
  const ringColor  = found ? '#1A7F1F' : '#0076BD'
  const fillColor  = found ? '#1A7F1F' : '#0076BD'
  const fillOpacity = 0.25

  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Aeusserer Ring */}
      <mesh>
        <ringGeometry args={[3.5, 5, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} />
      </mesh>
      {/* Innere Fuellung */}
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
      // Schwerpunkt der Polygon-Punkte
      const n = d.verortung.punkte.length
      const sumTheta = d.verortung.punkte.reduce((s, p) => s + p.theta, 0)
      const sumPhi   = d.verortung.punkte.reduce((s, p) => s + p.phi,   0)
      return sphericalToVector3({ theta: sumTheta / n, phi: sumPhi / n }, 60)
    }
    if (d.verortung.typ === 'gruppe' && d.verortung.elemente.length > 0) {
      // Erstes Element der Gruppe verwenden
      const erstesElement = d.verortung.elemente[0]
      if (erstesElement.typ === 'punkt') {
        return sphericalToVector3(erstesElement.position, 60)
      }
      if (erstesElement.typ === 'polygon' && erstesElement.punkte.length > 0) {
        return sphericalToVector3(erstesElement.punkte[0], 60)
      }
    }
  }
  // Fallback: alte position
  if (d.position) return sphericalToVector3(d.position, 60)
  return null
}

// ── Szenen-Inhalt (3D) ───────────────────────────────────────────────────────
interface SceneContentProps {
  scene:         AppScene
  deficits:      AppDeficit[]
  foundDeficits: FoundDeficit[]
  hintActive:    boolean
  onSphereClick: (e: ThreeEvent<MouseEvent>) => void
  startblick?:   { theta: number; phi: number } | null
}

function SceneContent({ scene, deficits, foundDeficits, hintActive, onSphereClick, startblick }: SceneContentProps) {
  const foundIds = new Set(foundDeficits.map(f => f.deficitId))
  const controlsRef = useRef<OrbitControlsImpl>(null)

  // Beim Mount: Startblick setzen
  useEffect(() => {
    if (!controlsRef.current || !startblick) return
    const azimuth = -(startblick.theta * Math.PI / 180)
    const polar   = startblick.phi * Math.PI / 180
    controlsRef.current.setAzimuthalAngle(azimuth)
    controlsRef.current.setPolarAngle(polar)
    controlsRef.current.update()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Panorama-URL bevorzugt, Fallback auf bildUrl
  const bildUrl = scene.panoramaBildUrl ?? scene.bildUrl

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={-0.45}
        reverseOrbit={false}
      />
      <PanoramaSphere bildUrl={bildUrl} onClick={onSphereClick} />
      <BodenPlatzhalter />

      {hintActive && deficits.map(d => {
        const renderPos = getHotspotPosition(d)
        if (!renderPos) return null
        return (
          <Hotspot
            key={d.id}
            position={renderPos}
            found={foundIds.has(d.id)}
          />
        )
      })}
    </>
  )
}

// ── Hint-Dialog ───────────────────────────────────────────────────────────────
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
            Hint verwenden?
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: '8px' }}>
          Es werden <strong style={{ color: 'white' }}>{hintCount} Hotspot{hintCount !== 1 ? 's' : ''}</strong> im Bild
          eingeblendet. Pro gefundenem Defizit mit aktivem Hint werden
          <strong style={{ color: '#F0A500' }}> 50% der Punkte abgezogen</strong>.
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', marginBottom: '20px' }}>
          Der Hint bleibt fuer die gesamte Szene aktiv.
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

// ── Alle-gefunden-Banner ──────────────────────────────────────────────────────
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
        Alle Defizite gefunden!
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
  scene:             AppScene
  deficits:          AppDeficit[]
  foundDeficits:     FoundDeficit[]
  hintActive:        boolean
  onDeficitConfirmed:(payload: DeficitConfirmedPayload) => void
  onHintActivate:    () => void
  onBeenden:         () => void
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
  const lang = i18n.language

  const [phase, setPhase]             = useState<Phase>('exploring')
  const [feedbackType, setFeedback]   = useState<KlickFeedbackType>('kein_treffer')

  // Zwischenspeicher fuer den aktuellen Klick-Kandidaten
  const hitDeficit       = useRef<AppDeficit | null>(null)
  const hitKatRichtig    = useRef<boolean>(false)

  const foundIds  = new Set(foundDeficits.map(f => f.deficitId))
  const allFound  = foundDeficits.length === deficits.length

  // ── Klick auf die Sphere ────────────────────────────────────────────────────
  const handleSphereClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (phase !== 'exploring') return

    const clickPos = clickToSpherical(e.point)

    // Treffer suchen: verortung bevorzugen, fallback auf position
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

    // Neuer Treffer → Kategorie-Auswahl
    hitDeficit.current = hit
    setPhase('kategoriePanel')
  }, [phase, deficits, foundIds])

  // ── Kategorie gewaehlt ──────────────────────────────────────────────────────
  const handleKategorieSelect = useCallback((gewaehlteKategorie: DefizitKategorie) => {
    const d = hitDeficit.current
    if (!d) return

    const kategorieRichtig = d.kategorie === gewaehlteKategorie
    hitKatRichtig.current  = kategorieRichtig

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
      // Weiter zum ScoringFlow
      onDeficitConfirmed({
        deficit:          d,
        kategorieRichtig: hitKatRichtig.current,
        hintPenalty:      hintActive,
      })
    }

    hitDeficit.current = null
    setPhase('exploring')
  }, [feedbackType, hintActive, onDeficitConfirmed])

  // ── Hint aktivieren ─────────────────────────────────────────────────────────
  const handleHintBestaetigen = useCallback(() => {
    onHintActivate()
    setPhase('exploring')
  }, [onHintActivate])

  const handleHintAbbrechen = useCallback(() => {
    setPhase('exploring')
  }, [])

  // ── Fortschritts-Punkte ─────────────────────────────────────────────────────
  const progress = deficits.map(d => ({
    id:    d.id,
    found: foundIds.has(d.id),
    name:  ml(d.nameI18n, lang),
  }))

  return (
    <div style={{ position: 'relative', flex: 1, background: '#1a1c22', overflow: 'hidden' }}>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 0.01], fov: 75 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <SceneContent
              scene={scene}
              deficits={deficits}
              foundDeficits={foundDeficits}
              hintActive={hintActive}
              onSphereClick={handleSphereClick}
              startblick={scene.startblick}
            />
          </Suspense>
        </XR>
      </Canvas>

      {/* ── HTML-Overlay ── */}

      {/* Oben links: Szenenname + Fortschritt */}
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
          {scene.kontext === 'io' ? 'Innerorts' : 'Ausserorts'}
        </p>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>
          {ml(scene.nameI18n, lang)}
        </p>

        {/* Fortschritts-Dots */}
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

      {/* Oben rechts: Hint + VR + Beenden */}
      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        zIndex: 50,
      }}>
        {/* Hint-Button */}
        {!hintActive && (
          <button
            onClick={() => setPhase('hintDialog')}
            title="Hotspots einblenden (–50% Punkte)"
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px',
              borderRadius: '9px',
              border: '1px solid rgba(240,165,0,0.35)',
              background: 'rgba(240,165,0,0.15)',
              color: '#F0A500',
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--zh-font)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Eye size={14} /> Hint
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
            <MapPin size={13} /> Hint aktiv
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

      {/* Unten: Szene beenden */}
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

      {/* Alle-gefunden-Banner */}
      {allFound && phase === 'exploring' && (
        <AllFoundBanner onBeenden={onBeenden} />
      )}

      {/* Overlay: KategoriePanel */}
      {phase === 'kategoriePanel' && (
        <KategoriePanel
          onSelect={handleKategorieSelect}
          onCancel={handleKategorieCancel}
        />
      )}

      {/* Overlay: KlickFeedback */}
      {phase === 'klickFeedback' && (
        <KlickFeedback
          type={feedbackType}
          onClose={handleFeedbackClose}
        />
      )}

      {/* Overlay: HintDialog */}
      {phase === 'hintDialog' && (
        <HintDialog
          hintCount={deficits.filter(d => !foundIds.has(d.id)).length}
          onBestaetigen={handleHintBestaetigen}
          onAbbrechen={handleHintAbbrechen}
        />
      )}
    </div>
  )
}
