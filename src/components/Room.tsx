// Einfache VR-Testszene: Raum mit Boden (Asphalt), Decke und 4 Wänden
// Phase 1 – wird in Phase 2 durch echte Strassenszene ersetzt

const ROOM = {
  width: 10,    // Meter
  depth: 10,    // Meter
  height: 3,    // Meter
} as const

// KZH-inspirierte Farben (Grautöne + FaSi-Kontext)
const COLORS = {
  floor: '#4A4A4A',     // Asphalt dunkelgrau
  ceiling: '#DCDCD0',   // Helles Beige (Tageslicht)
  wall: '#C8C4B8',      // Warmes Grau (Strassenrand)
  wallDark: '#B8B4A8',  // Leicht dunkler für Tiefenwirkung
} as const

export function Room() {
  const hw = ROOM.width / 2
  const hd = ROOM.depth / 2
  const hh = ROOM.height / 2

  return (
    <group>
      {/* ── Boden / Asphalt ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial
          color={COLORS.floor}
          roughness={0.92}
          metalness={0.05}
        />
      </mesh>

      {/* Boden-Raster für Massstab und Orientierung (leicht über Boden) */}
      <gridHelper
        args={[ROOM.width, 10, '#666666', '#555555']}
        position={[0, 0.005, 0]}
      />

      {/* ── Decke ── */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, ROOM.height, 0]}
      >
        <planeGeometry args={[ROOM.width, ROOM.depth]} />
        <meshStandardMaterial color={COLORS.ceiling} roughness={0.95} />
      </mesh>

      {/* ── Wand Nord (Z negativ, gegenüber Startposition) ── */}
      <mesh
        position={[0, hh, -hd]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.88} />
      </mesh>

      {/* ── Wand Süd (Z positiv, hinter dem Spieler) ── */}
      <mesh
        rotation={[0, Math.PI, 0]}
        position={[0, hh, hd]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.width, ROOM.height]} />
        <meshStandardMaterial color={COLORS.wallDark} roughness={0.88} />
      </mesh>

      {/* ── Wand West (X negativ) ── */}
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-hw, hh, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={COLORS.wall} roughness={0.88} />
      </mesh>

      {/* ── Wand Ost (X positiv) ── */}
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[hw, hh, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROOM.depth, ROOM.height]} />
        <meshStandardMaterial color={COLORS.wallDark} roughness={0.88} />
      </mesh>

      {/* ── Orientierungs-Objekt: Box in Raummitte (später: Strassenobjekt) ── */}
      <mesh
        position={[0, 0.5, -2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.5, 1.0, 0.5]} />
        <meshStandardMaterial color="#003C71" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  )
}
