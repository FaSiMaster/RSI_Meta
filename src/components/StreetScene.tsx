// Strassenszene mit 360°-Equirectangular-Hintergrund
// Textur: /public/textures/street-360.jpg

import { useLoader } from '@react-three/fiber'
import { TextureLoader, EquirectangularReflectionMapping, BackSide } from 'three'

const ROAD_WIDTH = 7      // Meter (2 Spuren à 3.5m)
const ROAD_LENGTH = 200   // Meter Sichtweite

// Gestrichelte Mittellinie: 3m Strich, 3m Abstand
const CENTER_DASHES = Array.from({ length: 30 }, (_, i) => i * 6 - 87)

export function StreetScene() {
  const skyTexture = useLoader(TextureLoader, '/textures/street-360.jpg')
  skyTexture.mapping = EquirectangularReflectionMapping

  return (
    <group>
      {/* ── 360°-Himmelskugel mit Equirectangular-Textur ── */}
      <mesh>
        <sphereGeometry args={[140, 64, 32]} />
        <meshBasicMaterial map={skyTexture} side={BackSide} />
      </mesh>

      {/* ── Umgebungsboden (Grün, aussen der Fahrbahn) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[ROAD_LENGTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#4A7A3A" roughness={1} />
      </mesh>

      {/* ── Fahrbahn (Asphalt) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#4A4A4A" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* ── Randlinie links ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-(ROAD_WIDTH / 2) + 0.15, 0.005, 0]}>
        <planeGeometry args={[0.12, ROAD_LENGTH]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* ── Randlinie rechts ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 - 0.15, 0.005, 0]}>
        <planeGeometry args={[0.12, ROAD_LENGTH]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* ── Gestrichelte Mittellinie ── */}
      {CENTER_DASHES.map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[0.1, 3]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}

      {/* ── Orientierungs-Box (Platzhalter fuer Strassenobjekte) ── */}
      <mesh position={[0, 0.5, -5]} castShadow>
        <boxGeometry args={[0.4, 1, 0.4]} />
        <meshStandardMaterial color="#003C71" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}
