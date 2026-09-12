// Szenentyp Bildserie: Einzelbilder als flache Wand im Raum
//
// Der Panorama-Viewer setzt die Betrachterin in eine Kugel und dreht sie darin.
// Für Einzelbilder gibt es keine Kugel: ein Foto einer Spiegelreflexkamera hat
// ein Bildfeld von wenigen Dutzend Grad, und es auf eine Kugel zu legen würde
// eine Rundumsicht behaupten, die nicht aufgenommen wurde.
//
// Diese Ansicht stellt das Bild deshalb als Fläche vor die Betrachterin, in
// Originalseitenverhältnis, und lässt sie zoomen und schieben statt drehen.
// Dieselbe Szene trägt im Browser und in der Brille; in der Brille hängt die
// Wand im Raum, und man tritt näher heran, statt zu zoomen.
//
// ── Was hier bewusst fehlt ──────────────────────────────────────────────────
//
// Die Bewertung. Ein Fund führt über onDeficitConfirmed nach aussen, und der
// Ablauf läuft danach als Overlay. In der Brille fehlt dieser Ablauf für die
// Konvention noch; App.tsx bricht dort mit einem Protokolleintrag ab, statt zu
// rechnen. Das ist bekannt und ausgewiesen, nicht übersehen.

import { useMemo, useRef, useState } from 'react'
import { Canvas, useLoader, type ThreeEvent } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import * as THREE from 'three'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { xrStore } from '../xrStore'
import {
  ml, szenentypVon,
  type AppScene, type AppDeficit, type BildPhase, type FoundDeficit,
} from '../data/appData'
import { trefferImBild, type BildPos, type DefizitVerortung } from '../utils/sphereCoords'
import type { DeficitConfirmedPayload } from './SceneViewer'

interface Props {
  scene:              AppScene
  deficits:           AppDeficit[]
  foundDeficits:      FoundDeficit[]
  hintStufe:          number
  onDeficitConfirmed: (payload: DeficitConfirmedPayload) => void
  onBeenden:          () => void
}

/** Breite der Wand in Metern. Die Höhe folgt dem Seitenverhältnis des Bildes. */
const WAND_BREITE = 3.2
/** Abstand der Wand vor der Betrachterin. */
const WAND_ABSTAND = 2.6

export default function BildwandViewer({
  scene, deficits, foundDeficits, hintStufe, onDeficitConfirmed, onBeenden,
}: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  const phasen = useMemo<BildPhase[]>(() => scene.phasen ?? [], [scene.phasen])
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [bildIdx, setBildIdx] = useState(0)
  const [zoom, setZoom] = useState(1)

  const phase = phasen[phaseIdx] ?? null
  const bilder = phase?.bilder ?? []
  const bildUrl = bilder[bildIdx] ?? null

  // Eine Bildserie ohne Phasen ist ein Datenfehler, kein Bedienzustand.
  if (szenentypVon(scene) !== 'bildserie' || !phase || !bildUrl) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--rsi-color-bg)', padding: '32px' }}>
        <div role="alert" style={{ maxWidth: '420px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--rsi-color-text-muted)', lineHeight: 1.6 }}>
            {t('bildserie.keine_phasen')}
          </p>
          <button
            onClick={onBeenden}
            style={{
              marginTop: '14px', padding: '10px 20px', borderRadius: 'var(--rsi-radius-btn)',
              background: 'var(--rsi-dunkelblau)', color: 'white', border: 'none',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--rsi-font)',
            }}
          >
            {t('land.zurueck')}
          </button>
        </div>
      </div>
    )
  }

  // In einer unbewerteten Vergleichsphase gibt es nichts zu finden. Das ist
  // Absicht: sie zeigt denselben Ort zu einer anderen Zeit.
  const offeneDefizite = phase.bewertet
    ? deficits.filter(d => !foundDeficits.some(f => f.deficitId === d.id))
    : []

  function verortungFuer(d: AppDeficit): DefizitVerortung | null {
    // Schlüssel ist die Bild-URL: dasselbe Muster wie bei den Perspektiven
    // eines Panoramas, wo der Schlüssel die Perspektiven-Kennung ist.
    return d.verortungen?.[bildUrl] ?? null
  }

  function handleTreffer(pos: BildPos, seitenverhaeltnis: number) {
    for (const d of offeneDefizite) {
      const v = verortungFuer(d)
      if (v && trefferImBild(pos, v, seitenverhaeltnis)) {
        onDeficitConfirmed({
          deficit:          d,
          // Die Kategoriewahl gehört zum Schweizer Ablauf. Hier wird sie nicht
          // erhoben, und «richtig» ist der Zustand, der nichts abzieht.
          kategorieRichtig: true,
          hintPenalty:      hintStufe > 0,
          hintAbzug:        0,
          bewertungStartMs: Date.now(),
        })
        return
      }
    }
  }

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#0B0E11' }}>
      <Canvas camera={{ position: [0, 0, 0.01], fov: 70 }} style={{ flex: 1 }}>
        <XR store={xrStore}>
          <ambientLight intensity={1} />
          <Bildwand
            url={bildUrl}
            zoom={zoom}
            markerSichtbar={hintStufe >= 2}
            verortungen={offeneDefizite.map(verortungFuer).filter((v): v is DefizitVerortung => v != null)}
            gefunden={deficits
              .filter(d => foundDeficits.some(f => f.deficitId === d.id))
              .map(verortungFuer)
              .filter((v): v is DefizitVerortung => v != null)}
            onTreffer={handleTreffer}
          />
        </XR>
      </Canvas>

      {/* Kopfzeile */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
        pointerEvents: 'none',
      }}>
        <button
          onClick={onBeenden}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            padding: 0, fontFamily: 'var(--rsi-font)', pointerEvents: 'auto',
          }}
        >
          <ArrowLeft size={15} /> {t('land.zurueck')}
        </button>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
          {ml(scene.nameI18n, lang)}
        </p>
      </div>

      {/* Phasenleiste mit Zeitangabe */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '14px 16px 16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <div role="tablist" aria-label={t('bildserie.phasen')} style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {phasen.map((p, i) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={i === phaseIdx}
              onClick={() => { setPhaseIdx(i); setBildIdx(0); setZoom(1) }}
              style={{
                flexShrink: 0,
                padding: '8px 14px', borderRadius: 'var(--rsi-radius-btn)',
                border: `1px solid ${i === phaseIdx ? 'var(--rsi-blau)' : 'rgba(255,255,255,0.22)'}`,
                background: i === phaseIdx ? 'color-mix(in srgb, var(--rsi-blau) 26%, transparent)' : 'rgba(0,0,0,0.4)',
                color: 'white', cursor: 'pointer', fontFamily: 'var(--rsi-font)',
                textAlign: 'left', lineHeight: 1.3,
              }}
            >
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700 }}>{ml(p.labelI18n, lang)}</span>
              <span style={{ display: 'block', fontSize: '11px', opacity: 0.75, fontVariantNumeric: 'tabular-nums' }}>
                {ml(p.zeitangabeI18n, lang)}
              </span>
              {!p.bewertet && (
                <span style={{ display: 'block', fontSize: '10px', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {t('bildserie.vergleich')}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
            {t('bildserie.bild_von', { n: bildIdx + 1, gesamt: bilder.length })}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {bilder.map((_, i) => (
              <button
                key={i}
                aria-label={t('bildserie.bild_von', { n: i + 1, gesamt: bilder.length })}
                aria-current={i === bildIdx}
                onClick={() => { setBildIdx(i); setZoom(1) }}
                style={{
                  width: '26px', height: '26px', borderRadius: '5px',
                  border: `1px solid ${i === bildIdx ? 'var(--rsi-blau)' : 'rgba(255,255,255,0.22)'}`,
                  background: i === bildIdx ? 'color-mix(in srgb, var(--rsi-blau) 30%, transparent)' : 'rgba(0,0,0,0.4)',
                  color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--rsi-font)', fontVariantNumeric: 'tabular-nums',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <Zoomknopf label={t('bildserie.verkleinern')} onClick={() => setZoom(z => Math.max(1, z / 1.4))}><ZoomOut size={16} /></Zoomknopf>
            <Zoomknopf label={t('bildserie.einpassen')} onClick={() => setZoom(1)}><Maximize2 size={16} /></Zoomknopf>
            <Zoomknopf label={t('bildserie.vergroessern')} onClick={() => setZoom(z => Math.min(6, z * 1.4))}><ZoomIn size={16} /></Zoomknopf>
          </div>
        </div>
      </div>
    </div>
  )
}

function Zoomknopf({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--rsi-radius-btn)', border: '1px solid rgba(255,255,255,0.22)',
        background: 'rgba(0,0,0,0.45)', color: 'white', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// ── Die Fläche selbst ───────────────────────────────────────────────────────

function Bildwand({
  url, zoom, markerSichtbar, verortungen, gefunden, onTreffer,
}: {
  url: string
  zoom: number
  markerSichtbar: boolean
  verortungen: DefizitVerortung[]
  gefunden: DefizitVerortung[]
  onTreffer: (pos: BildPos, seitenverhaeltnis: number) => void
}) {
  const textur = useLoader(THREE.TextureLoader, url)
  const gruppe = useRef<THREE.Group>(null)

  // Das Seitenverhältnis kommt aus dem Bild, nicht aus einer Annahme. Genau
  // dieses Verhältnis braucht die Trefferprüfung, damit ihr Radius ein Kreis
  // bleibt.
  const seitenverhaeltnis = useMemo(() => {
    const b = textur.image?.width ?? 0
    const h = textur.image?.height ?? 0
    return h > 0 ? b / h : 1.5
  }, [textur])

  const breite = WAND_BREITE * zoom
  const hoehe = breite / seitenverhaeltnis

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (!e.uv) return
    // uv läuft von unten links; Bildkoordinaten laufen von oben links.
    onTreffer({ x: e.uv.x, y: 1 - e.uv.y }, seitenverhaeltnis)
  }

  return (
    <group ref={gruppe} position={[0, 0, -WAND_ABSTAND]}>
      <mesh onClick={handleClick}>
        <planeGeometry args={[breite, hoehe]} />
        <meshBasicMaterial map={textur} toneMapped={false} />
      </mesh>

      {markerSichtbar && verortungen.map((v, i) => (
        <Marker key={`offen-${i}`} v={v} breite={breite} hoehe={hoehe} farbe="#D40053" />
      ))}
      {gefunden.map((v, i) => (
        <Marker key={`gefunden-${i}`} v={v} breite={breite} hoehe={hoehe} farbe="#1A7F1F" />
      ))}
    </group>
  )
}

function Marker({ v, breite, hoehe, farbe }: { v: DefizitVerortung; breite: number; hoehe: number; farbe: string }) {
  if (v.typ !== 'bild') return null
  // Bildkoordinaten in Wandkoordinaten: x von links, y von oben.
  const x = (v.x - 0.5) * breite
  const y = (0.5 - v.y) * hoehe
  const r = v.r * breite
  return (
    <mesh position={[x, y, 0.01]}>
      <ringGeometry args={[r * 0.82, r, 40]} />
      <meshBasicMaterial color={farbe} side={THREE.DoubleSide} transparent opacity={0.9} toneMapped={false} />
    </mesh>
  )
}
