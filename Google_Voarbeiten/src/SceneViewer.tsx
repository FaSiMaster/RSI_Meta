import React, { Suspense, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Sphere, useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import { Deficit } from "./types";
import { CheckCircle2, ShieldAlert, Info } from "lucide-react";
import { cn } from "./lib/utils";

function SceneSphere({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  
  return (
    <Sphere args={[500, 60, 40]} scale={[-1, 1, 1]}>
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </Sphere>
  );
}

function DeficitHotspot({ 
  deficit, 
  onSelect, 
  isFound,
  showHints
}: { 
  deficit: Deficit; 
  onSelect: (d: Deficit) => void;
  isFound: boolean;
  showHints: boolean;
}) {
  if (!isFound && !showHints) return null; // Only show if found or hints active

  return (
    <group position={deficit.position}>
      <Html distanceFactor={10}>
        <div 
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all hover:scale-110 shadow-lg",
            isFound ? "bg-green-500" : "bg-orange-500/80 animate-pulse border-2 border-white"
          )}
          onClick={() => onSelect(deficit)}
        >
          {isFound ? <CheckCircle2 size={20} color="white" /> : <ShieldAlert size={20} color="white" />}
        </div>
      </Html>
    </group>
  );
}

export default function SceneViewer({ 
  sceneUrl, 
  deficits, 
  onDeficitFound,
  foundIds,
  showHints
}: { 
  sceneUrl: string; 
  deficits: Deficit[];
  onDeficitFound: (d: Deficit) => void;
  foundIds: string[];
  showHints: boolean;
}) {
  const handleCanvasClick = (event: any) => {
    // In a real WebXR app, we'd use raycasting. 
    // Here we can use the intersection from the click event if we click on the sphere.
    if (event.intersections && event.intersections.length > 0) {
      const point = event.intersections[0].point;
      
      // Check if click point is near any deficit
      const foundDeficit = deficits.find(d => {
        const dist = new THREE.Vector3(...d.position).distanceTo(point);
        return dist < d.tolerance;
      });

      if (foundDeficit) {
        onDeficitFound(foundDeficit);
      }
    }
  };

  return (
    <div className="w-full h-full relative bg-black">
      <Canvas camera={{ position: [0, 0, 0.1] }} onClick={handleCanvasClick}>
        <Suspense fallback={<Html center><div className="text-white">Lade 360° Szene...</div></Html>}>
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
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            rotateSpeed={-0.5}
          />
        </Suspense>
      </Canvas>
      
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white max-w-xs">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Info size={18} className="text-blue-400" />
          RSI Training
        </h3>
        <p className="text-sm opacity-80 mt-1">
          Bewege dich in der Szene und identifiziere die Sicherheitsdefizite (rote Markierungen).
        </p>
        <div className="mt-3 h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-500" 
            style={{ width: `${(foundIds.length / deficits.length) * 100}%` }}
          />
        </div>
        <p className="text-xs mt-1 text-right opacity-60">
          {foundIds.length} von {deficits.length} gefunden
        </p>
      </div>
    </div>
  );
}
