// 360°-Panorama-Szene mit WebXR-Unterstützung
// Desktop: OrbitControls | VR: Meta Quest Headtracking

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useTexture, Html } from '@react-three/drei'
import { XR, createXRStore, XROrigin } from '@react-three/xr'
import * as THREE from 'three'
import { CheckCircle2, ShieldAlert, Info } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Deficit } from '../types'

// XR Store als Singleton
const xrStore = createXRStore()

// ── 360°-Kugel mit Equirectangular-Textur ──
function SceneSphere({ url }: { url: string }) {
  const texture = useTexture(url)
  texture.mapping = THREE.EquirectangularReflectionMapping

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  )
}

// ── Platzhalter-Kugel wenn noch kein Foto vorhanden ──
function PlaceholderSphere() {
  return (
    <mesh>
      <sphereGeometry args={[500, 32, 16]} />
      <meshBasicMaterial color="#1a2a3a" side={THREE.BackSide} />
    </mesh>
  )
}

// ── Defizit-Hotspot in der Szene ──
function DeficitHotspot({
  deficit,
  onSelect,
  isFound,
  showHints,
}: {
  deficit: Deficit
  onSelect: (d: Deficit) => void
  isFound: boolean
  showHints: boolean
}) {
  if (!isFound && !showHints) return null

  return (
    <group position={deficit.position}>
      <Html distanceFactor={10}>
        <div
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110 shadow-lg',
            isFound
              ? 'bg-green-500'
              : 'bg-orange-500/80 animate-pulse border-2 border-white'
          )}
          onClick={() => onSelect(deficit)}
        >
          {isFound ? (
            <CheckCircle2 size={20} color="white" />
          ) : (
            <ShieldAlert size={20} color="white" />
          )}
        </div>
      </Html>
    </group>
  )
}

// ── Haupt-Komponente ──
export default function SceneViewer({
  sceneUrl,
  deficits,
  onDeficitFound,
  foundIds,
  showHints,
}: {
  sceneUrl: string
  deficits: Deficit[]
  onDeficitFound: (d: Deficit) => void
  foundIds: string[]
  showHints: boolean
}) {
  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        camera={{ position: [0, 0, 0.1] }}
        onPointerDown={(event) => {
          const e = event as unknown as { intersections?: Array<{ point: THREE.Vector3 }> }
          if (!e.intersections || e.intersections.length === 0) return
          const point = e.intersections[0].point
          const found = deficits.find((d) => {
            const dist = new THREE.Vector3(...d.position).distanceTo(point)
            return dist < d.tolerance
          })
          if (found) onDeficitFound(found)
        }}
      >
        <XR store={xrStore}>
          <XROrigin position={[0, 0, 0]} />
          <Suspense
            fallback={
              <Html center>
                <div className="text-white text-sm">Lade 360° Szene...</div>
              </Html>
            }
          >
            {sceneUrl ? (
              <SceneSphere url={sceneUrl} />
            ) : (
              <PlaceholderSphere />
            )}

            {deficits.map((d) => (
              <DeficitHotspot
                key={d.id}
                deficit={d}
                onSelect={onDeficitFound}
                isFound={foundIds.includes(d.id)}
                showHints={showHints}
              />
            ))}
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={-0.5}
          />
        </XR>
      </Canvas>

      {/* VR-Button (oben links) */}
      <button
        onClick={() => void xrStore.enterVR()}
        className="absolute top-4 left-4 z-20 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/20 transition-colors"
        style={{ background: 'var(--zh-dunkelblau)' }}
      >
        VR starten
      </button>

      {/* Fortschrittsanzeige (Mitte oben) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-xs font-bold">
        {foundIds.length} / {deficits.length} Defizite gefunden
      </div>

      {/* Info-Panel (unten links) – aus Google_Voarbeiten übernommen */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white max-w-xs">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-1">
          <Info size={15} style={{ color: 'var(--zh-cyan)' }} />
          RSI Training
        </h3>
        <p className="text-xs opacity-70 leading-relaxed mb-3">
          Bewege dich in der Szene und identifiziere die Sicherheitsdefizite.
        </p>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: deficits.length > 0 ? `${(foundIds.length / deficits.length) * 100}%` : '0%',
              background: 'var(--zh-gruen)',
            }}
          />
        </div>
        <p className="text-[10px] mt-1 text-right opacity-50">
          {foundIds.length} von {deficits.length} gefunden
        </p>
      </div>
    </div>
  )
}
