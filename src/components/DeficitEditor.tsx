import React, { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MousePointer, Hexagon, RotateCcw, Check } from "lucide-react";
import * as THREE from "three";
import { cn } from "../lib/utils";
import { DeficitZone } from "../types";
import { point3dToSpherical, sphericalToNormalized } from "../utils/sphereRaycaster";

type Mode = "point" | "polygon";

interface Props {
  /** URL des Szenen-Bildes (equirektangular) */
  imageUrl: string;
  /** Bestehende Zone (für Bearbeitung) */
  initialZone?: DeficitZone;
  /** Wird aufgerufen wenn der User die Position bestätigt */
  onConfirm: (zone: DeficitZone) => void;
  onCancel: () => void;
}

/**
 * Admin-Komponente: Defizit räumlich im Bild verorten.
 *
 * MODUS A — Punkt-Marker: Klick setzt [x, y] normalisiert [0–1]
 * MODUS B — Polygon: Mehrere Klicks → Polygon
 *
 * Für equirektangulare 360°-Panoramen:
 * normalisierte Koordinaten lassen sich direkt via sphereRaycaster
 * in sphärische Grad umrechnen.
 */
export default function DeficitEditor({ imageUrl, initialZone, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [mode, setMode] = useState<Mode>(initialZone?.type ?? "point");
  const [points, setPoints] = useState<number[][]>(initialZone?.coordinates ?? []);
  const [imgLoaded, setImgLoaded] = useState(false);

  // ── Spherical info aus erstem Punkt ─────────────────────────────────────────
  const sphericalInfo = points.length > 0
    ? (() => {
        const [x, y] = points[0];
        const theta = x * 360;
        const phi   = y * 180;
        return { theta: theta.toFixed(1), phi: phi.toFixed(1) };
      })()
    : null;

  // ── Canvas-Zeichnung ─────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Bild rendern
    ctx.drawImage(img, 0, 0, w, h);

    // Dunkles Overlay
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, w, h);

    if (points.length === 0) return;

    const px = (p: number[]) => [p[0] * w, p[1] * h] as [number, number];

    if (mode === "point") {
      // Punkt-Marker
      const [cx, cy] = px(points[0]);
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(59,130,246,0.35)";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Kreuz
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();

    } else {
      // Polygon
      ctx.beginPath();
      const [sx, sy] = px(points[0]);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < points.length; i++) {
        const [nx, ny] = px(points[i]);
        ctx.lineTo(nx, ny);
      }
      if (points.length > 2) ctx.closePath();
      ctx.fillStyle = "rgba(59,130,246,0.20)";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Punkte markieren
      for (const p of points) {
        const [cx, cy] = px(p);
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
      }
    }
  }, [points, mode, imgLoaded]);

  useEffect(() => { draw(); }, [draw]);

  // ── Klick-Handler ────────────────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top)  / rect.height;

    if (mode === "point") {
      setPoints([[x, y]]);
    } else {
      setPoints(prev => [...prev, [x, y]]);
    }
  };

  const handleConfirm = () => {
    if (points.length === 0) return;

    const [x, y] = points[0];
    const theta = x * 360;
    const phi   = y * 180;
    // Sphere-Radius 490 (innere Seite der 500er Kugel)
    const sphere = new THREE.Spherical(490, THREE.MathUtils.degToRad(phi), THREE.MathUtils.degToRad(theta));
    const vec = new THREE.Vector3().setFromSpherical(sphere);

    const zone: DeficitZone = {
      type: mode,
      coordinates: points,
      position3d: [vec.x, vec.y, vec.z],
    };
    onConfirm(zone);
  };

  return (
    <div className="space-y-4">
      {/* Modus-Wahl */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {t("deficitEditor.title")}
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => { setMode("point"); setPoints([]); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              mode === "point" ? "bg-blue-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10",
            )}
          >
            <MousePointer size={12} /> {t("deficitEditor.mode_point")}
          </button>
          <button
            onClick={() => { setMode("polygon"); setPoints([]); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              mode === "polygon" ? "bg-blue-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10",
            )}
          >
            <Hexagon size={12} /> {t("deficitEditor.mode_polygon")}
          </button>
        </div>
      </div>

      {/* Hinweis */}
      <p className="text-[11px] text-white/40">
        {mode === "point" ? t("deficitEditor.mode_hint_point") : t("deficitEditor.mode_hint_polygon")}
      </p>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ aspectRatio: "2 / 1" }}>
        {/* Bild (versteckt, dient als Quelle für Canvas) */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt=""
          className="hidden"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
        />
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full cursor-crosshair"
          onClick={handleClick}
          onContextMenu={e => { e.preventDefault(); setPoints(prev => prev.slice(0, -1)); }}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Positions-Info */}
      {sphericalInfo && (
        <div className="flex gap-4 text-xs text-white/60 font-mono">
          <span>{t("deficitEditor.theta")}: {sphericalInfo.theta}°</span>
          <span>{t("deficitEditor.phi")}: {sphericalInfo.phi}°</span>
          <span className="text-white/30">({points.length} Pkt.)</span>
        </div>
      )}

      {/* Aktionen */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setPoints([])}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white/60 transition-colors"
        >
          <RotateCcw size={14} /> {t("deficitEditor.clear_btn")}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-colors"
        >
          {t("admin.cancel")}
        </button>
        <button
          onClick={handleConfirm}
          disabled={points.length === 0}
          className={cn(
            "ml-auto flex items-center gap-1.5 px-6 py-2 rounded-xl text-sm font-bold transition-all",
            points.length > 0
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-white/5 text-white/20 cursor-not-allowed",
          )}
        >
          <Check size={14} /> {t("deficitEditor.confirm_btn")}
        </button>
      </div>
    </div>
  );
}
