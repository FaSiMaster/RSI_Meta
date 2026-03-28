import { XROrigin } from '@react-three/xr'
import { Room } from './Room'

export function Scene() {
  return (
    <>
      {/* Spieler-Startposition: Mitte des Raums, Augenhöhe 1.6 m */}
      <XROrigin position={[0, 0, 0]} />

      {/* Beleuchtung */}
      <ambientLight intensity={0.55} color="#F0F4FF" />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Füll-Licht von links (weichere Schatten) */}
      <pointLight position={[-4, 2.5, -3]} intensity={0.35} color="#FFF5E0" />

      <Room />
    </>
  )
}
