import { XROrigin } from '@react-three/xr'
import { StreetScene } from './StreetScene'

export function Scene() {
  return (
    <>
      {/* Spieler-Startposition: Strassenniveau, Fahrbahn Mitte */}
      <XROrigin position={[0, 0, 3]} />

      {/* Nebel fuer Tiefenwirkung (Farbe = Himmelfarbe) */}
      <fog attach="fog" args={['#6BA3C8', 40, 130]} />

      {/* ── Beleuchtung (Tageslicht) ── */}
      <ambientLight intensity={1.0} color="#FFF8F0" />
      <directionalLight
        position={[15, 30, 10]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* Fuell-Licht (Himmelsreflex von unten) */}
      <hemisphereLight args={['#87CEEB', '#4A7A3A', 0.4]} />

      <StreetScene />
    </>
  )
}
