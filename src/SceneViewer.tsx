import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture, Html } from "@react-three/drei";
import { XR, XROrigin, useXR, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { Deficit } from "./types";
import { CheckCircle2, ShieldAlert, Info } from "lucide-react";
import { cn } from "./lib/utils";

// ── Typ des XR Stores (sicher unabhängig von exportierten Typen) ──────────────
type XRStoreType = ReturnType<typeof createXRStore>;

// ── 360°-Sphere (invertiert für Innenansicht) ─────────────────────────────────
function SceneSphere({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  return (
    <Sphere args={[500, 60, 40]} scale={[-1, 1, 1]}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </Sphere>
  );
}

// ── Deficit-Hotspot als 3D-Marker ─────────────────────────────────────────────
// In VR: Controller-Ray feuert onClick via @react-three/xr Pointer-Events
function DeficitHotspot({
  deficit,
  onSelect,
  isFound,
  showHints,
}: {
  deficit: Deficit;
  onSelect: (d: Deficit) => void;
  isFound: boolean;
  showHints: boolean;
}) {
  if (!isFound && !showHints) return null;

  return (
    <group position={deficit.position}>
      <Html distanceFactor={10}>
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110 shadow-lg",
            isFound
              ? "bg-green-500"
              : "bg-orange-500/80 animate-pulse border-2 border-white",
          )}
          onClick={() => onSelect(deficit)}
        >
          {isFound
            ? <CheckCircle2 size={20} color="white" />
            : <ShieldAlert size={20} color="white" />
          }
        </div>
      </Html>
    </group>
  );
}

// ── OrbitControls nur aktiv wenn NICHT in VR ──────────────────────────────────
// @react-three/xr v6: session-Check statt isPresenting
function DesktopControls() {
  const session = useXR((state) => state.session);
  if (session !== null) return null;
  return (
    <OrbitControls
      enableZoom={false}
      enablePan={false}
      rotateSpeed={-0.5}
    />
  );
}

// ── Szenen-Inhalt (innerhalb XR-Kontext) ──────────────────────────────────────
function SceneContent({
  sceneUrl,
  deficits,
  onDeficitFound,
  foundIds,
  showHints,
}: {
  sceneUrl: string;
  deficits: Deficit[];
  onDeficitFound: (d: Deficit) => void;
  foundIds: string[];
  showHints: boolean;
}) {
  return (
    <Suspense
      fallback={
        <Html center>
          <div className="text-white text-sm font-bold tracking-widest uppercase animate-pulse">
            Lade 360°-Szene...
          </div>
        </Html>
      }
    >
      <SceneSphere url={sceneUrl} />

      {deficits.map((d) => (
        <DeficitHotspot
          key={d.id}
          deficit={d}
          onSelect={onDeficitFound}
          isFound={foundIds.includes(d.id)}
          showHints={showHints}
        />
      ))}

      <XROrigin position={[0, 0, 0.1]} />
      <DesktopControls />
    </Suspense>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
interface SceneViewerProps {
  sceneUrl: string;
  deficits: Deficit[];
  onDeficitFound: (d: Deficit) => void;
  /** Wird gefeuert wenn der User blind auf die Sphere klickt (kein Marker) */
  onBlindClick?: (point: [number, number, number]) => void;
  foundIds: string[];
  showHints: boolean;
  store: XRStoreType;
}

export default function SceneViewer({
  sceneUrl,
  deficits,
  onDeficitFound,
  onBlindClick,
  foundIds,
  showHints,
  store,
}: SceneViewerProps) {
  const handleCanvasClick = (event: any) => {
    if (!event.intersections || event.intersections.length === 0) return;
    const point = event.intersections[0].point as THREE.Vector3;

    // Prüfen ob Klick auf einem Defizit-Hotspot-Bereich liegt
    const foundDeficit = deficits.find((d) => {
      const dist = new THREE.Vector3(...d.position).distanceTo(point);
      return dist < d.tolerance;
    });

    if (foundDeficit && showHints) {
      // Hints-Modus: Marker klicken → direktes Assessment
      onDeficitFound(foundDeficit);
    } else if (!showHints && onBlindClick) {
      // Explorativ-Modus: blinder Klick → Click-Flow
      onBlindClick([point.x, point.y, point.z]);
    }
  };

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas
        camera={{ position: [0, 0, 0.1] }}
        onClick={handleCanvasClick}
      >
        <XR store={store}>
          <SceneContent
            sceneUrl={sceneUrl}
            deficits={deficits}
            onDeficitFound={onDeficitFound}
            foundIds={foundIds}
            showHints={showHints}
          />
        </XR>
      </Canvas>

      {/* Fortschrittsanzeige (Desktop-Overlay) */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white max-w-xs">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Info size={18} className="text-blue-400" />
          RSI Training
        </h3>
        <p className="text-sm opacity-80 mt-1">
          {showHints
            ? "Klicke auf die markierten Defizite."
            : "Klicke auf verdächtige Stellen in der Szene."}
        </p>
        <div className="mt-3 h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{
              width: deficits.length > 0
                ? `${(foundIds.length / deficits.length) * 100}%`
                : "0%",
            }}
          />
        </div>
        <p className="text-xs mt-1 text-right opacity-60">
          {foundIds.length} von {deficits.length} gefunden
        </p>
      </div>
    </div>
  );
}
