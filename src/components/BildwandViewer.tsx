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
// ── Gleicher Ablauf wie im Schweizer Viewer (v0.20.0) ──────────────────────
//
// Die erste Fassung liess sich durchklicken: ein Klick auf die richtige Stelle
// führte unmittelbar in die Bewertung. Das ist nicht, wie die Anwendung sonst
// arbeitet, und es macht das Finden beliebig — wer genug klickt, trifft.
// Übernommen sind deshalb drei Dinge aus dem Panorama-Viewer:
//
//   1. Ein Klick setzt erst eine Marke. Erst «Bestätigen» prüft, ob dort ein
//      Befund liegt. Die Marke verfällt nach fünf Sekunden von selbst.
//   2. Zwei Hinweisstufen mit demselben Abzug wie dort: Stufe 1 sagt, in
//      welchen Bildern noch etwas offen ist, Stufe 2 zeigt die Marken. Die
//      Konstanten stehen in scoreCalc.ts; hier wird nur aufgerufen.
//   3. Eine Rückmeldung nach jedem Klick, auch nach einem Fehlklick.
//
// Der Abzug wird jetzt auch weitergegeben. Die erste Fassung setzte `hintAbzug`
// hart auf null, der Hinweis war also gratis — ein Fehler, kein Entscheid.
//
// ── Was hier bewusst fehlt ──────────────────────────────────────────────────
//
// Die Bewertung. Ein Fund führt über onDeficitConfirmed nach aussen, und der
// Ablauf läuft danach als Overlay. In der Brille fehlt dieser Ablauf für die
// Konvention noch; App.tsx bricht dort mit einem Protokolleintrag ab, statt zu
// rechnen. Das ist bekannt und ausgewiesen, nicht übersehen.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { XR } from '@react-three/xr'
import * as THREE from 'three'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, Check, X, Eye, MapPin } from 'lucide-react'
import { xrStore } from '../xrStore'
import {
  ml, szenentypVon,
  type AppScene, type AppDeficit, type BildPhase, type FoundDeficit,
} from '../data/appData'
import { HINT_ABZUG_STANDORT, HINT_ABZUG_HOTSPOTS } from '../data/scoreCalc'
import { trefferImBild, type BildPos, type DefizitVerortung } from '../utils/sphereCoords'
import KlickFeedback, { type KlickFeedbackType } from './KlickFeedback'
import type { DeficitConfirmedPayload } from './SceneViewer'

interface Props {
  scene:              AppScene
  deficits:           AppDeficit[]
  foundDeficits:      FoundDeficit[]
  hintStufe:          number
  onDeficitConfirmed: (payload: DeficitConfirmedPayload) => void
  onHintActivate:     (stufe: 1 | 2) => void
  onBeenden:          () => void
}

/** Abstand der Wand vor der Betrachterin, in Metern. */
const WAND_ABSTAND = 2.6
/** Anteil des Sichtfelds, den das eingepasste Bild einnimmt. */
const RANDANTEIL = 0.94
/** Nach dieser Zeit verfaellt eine nicht bestaetigte Marke, wie im Panorama-Viewer. */
const MARKE_DAUER_MS = 5000

type Zustand = 'suchen' | 'bestaetigen' | 'rueckmeldung'

export default function BildwandViewer({
  scene, deficits, foundDeficits, hintStufe, onDeficitConfirmed, onHintActivate, onBeenden,
}: Props) {
  const { i18n, t } = useTranslation()
  const lang = i18n.language

  const phasen = useMemo<BildPhase[]>(() => scene.phasen ?? [], [scene.phasen])
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [bildIdx, setBildIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [zustand, setZustand] = useState<Zustand>('suchen')
  const [marke, setMarke] = useState<BildPos | null>(null)
  const [rueckmeldung, setRueckmeldung] = useState<KlickFeedbackType>('kein_treffer')
  const [hinweisFrage, setHinweisFrage] = useState<1 | 2 | null>(null)

  const zeitgeber = useRef<ReturnType<typeof setTimeout> | null>(null)
  const zustandRef = useRef<Zustand>('suchen')
  zustandRef.current = zustand

  useEffect(() => () => { if (zeitgeber.current) clearTimeout(zeitgeber.current) }, [])

  const phase = phasen[phaseIdx] ?? null
  const bilder = phase?.bilder ?? []
  const bildUrl = bilder[bildIdx] ?? null

  const gefundenIds = useMemo(
    () => new Set(foundDeficits.map(f => f.deficitId)),
    [foundDeficits],
  )

  /**
   * Zahl der Befunde je Bild, gesamt und noch offen.
   *
   * Ein Bild kann mehrere tragen — auf dem Bild der Kreisinsel liegen drei.
   * Ohne diese Angabe sucht man weiter, wo nichts mehr ist, und hört auf, wo
   * noch etwas liegt. Gezeigt wird sie erst ab Hinweisstufe 1: sie verrät
   * dasselbe wie der Standort-Hinweis des Panorama-Viewers und muss deshalb
   * dasselbe kosten.
   */
  const zaehlungJeBild = useMemo(() => {
    const karte = new Map<string, { total: number; offen: number }>()
    if (!phase?.bewertet) return karte
    for (const url of bilder) {
      let total = 0
      let offen = 0
      for (const d of deficits) {
        if (!d.verortungen?.[url]) continue
        total++
        if (!gefundenIds.has(d.id)) offen++
      }
      karte.set(url, { total, offen })
    }
    return karte
  }, [bilder, deficits, gefundenIds, phase?.bewertet])

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
    ? deficits.filter(d => !gefundenIds.has(d.id))
    : []
  const gefundenGesamt = deficits.filter(d => gefundenIds.has(d.id)).length

  function verortungFuer(d: AppDeficit): DefizitVerortung | null {
    // Schlüssel ist die Bild-URL: dasselbe Muster wie bei den Perspektiven
    // eines Panoramas, wo der Schlüssel die Perspektiven-Kennung ist.
    return d.verortungen?.[bildUrl] ?? null
  }

  function markeLoeschen() {
    if (zeitgeber.current) clearTimeout(zeitgeber.current)
    setMarke(null)
    setZustand('suchen')
  }

  /** Ein Klick setzt die Marke. Geprüft wird erst beim Bestätigen. */
  function handleKlick(pos: BildPos) {
    if (zustand === 'rueckmeldung' || !phase.bewertet) return
    if (zeitgeber.current) clearTimeout(zeitgeber.current)
    setMarke(pos)
    setZustand('bestaetigen')
    zeitgeber.current = setTimeout(() => {
      // Nur löschen, wenn wir noch im Bestätigen stehen. Sonst reisst ein alter
      // Zeitgeber die Bedienung aus einem anderen Zustand — derselbe Fehler,
      // gegen den sich der Panorama-Viewer mit seinem Phasen-Guard wehrt.
      if (zustandRef.current !== 'bestaetigen') return
      setMarke(null)
      setZustand('suchen')
    }, MARKE_DAUER_MS)
  }

  /** Erst hier wird geprüft, ob an der Marke ein Befund liegt. */
  function handleBestaetigen(seitenverhaeltnis: number) {
    if (!marke) return
    if (zeitgeber.current) clearTimeout(zeitgeber.current)

    for (const d of offeneDefizite) {
      const v = verortungFuer(d)
      if (v && trefferImBild(marke, v, seitenverhaeltnis)) {
        setMarke(null)
        setZustand('suchen')
        onDeficitConfirmed({
          deficit:          d,
          // Die Kategoriewahl gehört zum Schweizer Ablauf. Hier wird sie nicht
          // erhoben, und «richtig» ist der Zustand, der nichts abzieht.
          kategorieRichtig: true,
          hintPenalty:      hintStufe > 0,
          // Massgebend ist die beim Fund aktive Stufe, und der Abzug ist nicht
          // additiv — dieselbe Regel wie im Panorama-Viewer.
          hintAbzug:        hintStufe >= 2 ? HINT_ABZUG_HOTSPOTS : hintStufe >= 1 ? HINT_ABZUG_STANDORT : 0,
          bewertungStartMs: Date.now(),
        })
        return
      }
    }

    // Kein Treffer. Liegt dort ein bereits gefundener Befund, sagt die
    // Rückmeldung das ausdrücklich, statt «nichts hier» zu behaupten.
    const schonGefunden = deficits.some(d => {
      if (!gefundenIds.has(d.id)) return false
      const v = verortungFuer(d)
      return v != null && trefferImBild(marke, v, seitenverhaeltnis)
    })
    setMarke(null)
    setRueckmeldung(schonGefunden ? 'bereits_gefunden' : 'kein_treffer')
    setZustand('rueckmeldung')
  }

  function hinweisBestaetigen() {
    if (hinweisFrage) onHintActivate(hinweisFrage)
    setHinweisFrage(null)
  }

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#0B0E11' }}>
      {/* Der Canvas wird absolut gelegt, nicht als Flex-Kind.
          Mit `flex: 1` in einem Kasten ohne eigene Hoehe faellt React Three
          Fiber auf 150 Bildpunkte zurueck, und zwar stumm: das Bild sass als
          Streifen am oberen Rand, und nichts meldete einen Fehler. Gemessen
          wurde es erst, als die Canvas-Groesse selbst abgefragt wurde —
          1440 mal 150, unabhaengig vom Fenster. Derselbe Weg wie im
          Panorama-Viewer. */}
      <Canvas
        camera={{ position: [0, 0, 0.01], fov: 70 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true }}
      >
        <XR store={xrStore}>
          <ambientLight intensity={1} />
          <Bildwand
            url={bildUrl}
            zoom={zoom}
            marke={marke}
            zustand={zustand}
            markerSichtbar={hintStufe >= 2 && phase.bewertet}
            offen={offeneDefizite.map(verortungFuer).filter((v): v is DefizitVerortung => v != null)}
            gefunden={deficits
              .filter(d => gefundenIds.has(d.id))
              .map(verortungFuer)
              .filter((v): v is DefizitVerortung => v != null)}
            onKlick={handleKlick}
            onBestaetigen={handleBestaetigen}
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
        <span style={{
          marginLeft: 'auto', fontSize: '12px', fontWeight: 700,
          color: 'rgba(255,255,255,0.82)', fontVariantNumeric: 'tabular-nums',
        }}>
          {t('szene.gefunden_von', { found: gefundenGesamt, total: deficits.length })}
        </span>
      </div>

      {/* Bestaetigung: erst hier wird geprueft, ob an der Marke etwas liegt */}
      {zustand === 'bestaetigen' && (
        <div style={{
          position: 'absolute', left: '50%', top: '15%', transform: 'translateX(-50%)',
          display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
          background: 'rgba(0,0,0,0.84)', padding: '10px 12px',
          borderRadius: 'var(--rsi-radius-card)', border: '1px solid rgba(255,255,255,0.18)',
        }}>
          <span style={{ fontSize: '13px', color: 'white', marginRight: '4px' }}>
            {t('bildserie.marke_gesetzt')}
          </span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('rsi-bildwand-bestaetigen'))}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 14px', borderRadius: 'var(--rsi-radius-btn)',
              border: 'none', background: 'var(--rsi-blau)', color: 'white',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--rsi-font)',
            }}
          >
            <Check size={14} /> {t('szene.bestätigen')}
          </button>
          <button
            onClick={markeLoeschen}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '8px 12px', borderRadius: 'var(--rsi-radius-btn)',
              border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.06)',
              color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--rsi-font)',
            }}
          >
            <X size={14} /> {t('scoring.abbrechen')}
          </button>
        </div>
      )}

      {/* Rueckmeldung nach einem Klick ohne Treffer */}
      {zustand === 'rueckmeldung' && (
        <KlickFeedback type={rueckmeldung} onClose={() => setZustand('suchen')} />
      )}

      {/* Rueckfrage vor einem Hinweis, mit dem Abzug im Text */}
      {hinweisFrage && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', padding: '24px',
          }}
        >
          <div style={{
            maxWidth: '420px', background: 'var(--rsi-color-surface)',
            borderRadius: 'var(--rsi-radius-card)', padding: '20px 22px',
            border: '1px solid var(--rsi-color-border)',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--rsi-color-text)', margin: '0 0 16px', lineHeight: 1.6 }}>
              {hinweisFrage === 1
                ? t('bildserie.hinweis_warnung_bilder', { abzug: HINT_ABZUG_STANDORT })
                : t('bildserie.hinweis_warnung_marken', { abzug: HINT_ABZUG_HOTSPOTS })}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={hinweisBestaetigen}
                style={{
                  padding: '10px 16px', borderRadius: 'var(--rsi-radius-btn)',
                  background: 'var(--rsi-dunkelblau)', color: 'white', border: 'none',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--rsi-font)',
                }}
              >
                {t('bildserie.hinweis_trotzdem')}
              </button>
              <button
                onClick={() => setHinweisFrage(null)}
                style={{
                  padding: '10px 16px', borderRadius: 'var(--rsi-radius-btn)',
                  background: 'var(--rsi-color-bg-secondary)', color: 'var(--rsi-color-text)',
                  border: '1px solid var(--rsi-color-border)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--rsi-font)',
                }}
              >
                {t('scoring.abbrechen')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              onClick={() => { setPhaseIdx(i); setBildIdx(0); setZoom(1); markeLoeschen() }}
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
            {bilder.map((url, i) => {
              const z = zaehlungJeBild.get(url)
              const zeigeZahl = hintStufe >= 1 && z != null && z.total > 0
              return (
                <button
                  key={i}
                  aria-label={
                    zeigeZahl
                      ? t('bildserie.bild_mit_befunden', { n: i + 1, offen: z!.offen, total: z!.total })
                      : t('bildserie.bild_von', { n: i + 1, gesamt: bilder.length })
                  }
                  aria-current={i === bildIdx}
                  onClick={() => { setBildIdx(i); setZoom(1); markeLoeschen() }}
                  style={{
                    minWidth: '26px', height: '26px', padding: zeigeZahl ? '0 7px' : 0,
                    borderRadius: '5px',
                    border: `1px solid ${i === bildIdx ? 'var(--rsi-blau)' : 'rgba(255,255,255,0.22)'}`,
                    background: i === bildIdx ? 'color-mix(in srgb, var(--rsi-blau) 30%, transparent)' : 'rgba(0,0,0,0.4)',
                    color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--rsi-font)', fontVariantNumeric: 'tabular-nums',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                  }}
                >
                  {i + 1}
                  {zeigeZahl && (
                    <span style={{
                      fontSize: '10px', fontWeight: 800,
                      color: z!.offen > 0 ? 'var(--rsi-warnung)' : 'var(--rsi-gruen)',
                    }}>
                      {z!.offen > 0 ? `${z!.offen}/${z!.total}` : `✓${z!.total}`}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {/* Hinweise: zwei Stufen, derselbe Abzug wie im Panorama-Viewer */}
          {phase.bewertet && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <HinweisKnopf
                aktiv={hintStufe >= 1}
                label={hintStufe >= 1 ? t('bildserie.bilderhinweis_aktiv') : t('bildserie.bilderhinweis_btn')}
                titel={t('bildserie.hinweis_warnung_bilder', { abzug: HINT_ABZUG_STANDORT })}
                onClick={() => setHinweisFrage(1)}
              >
                <MapPin size={14} />
              </HinweisKnopf>
              <HinweisKnopf
                aktiv={hintStufe >= 2}
                label={hintStufe >= 2 ? t('bildserie.markenhinweis_aktiv') : t('bildserie.markenhinweis_btn')}
                titel={t('bildserie.hinweis_warnung_marken', { abzug: HINT_ABZUG_HOTSPOTS })}
                onClick={() => setHinweisFrage(2)}
              >
                <Eye size={14} />
              </HinweisKnopf>
            </div>
          )}

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

function HinweisKnopf({
  aktiv, label, titel, onClick, children,
}: { aktiv: boolean; label: string; titel: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={aktiv ? undefined : onClick}
      disabled={aktiv}
      title={titel}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '6px 10px', borderRadius: 'var(--rsi-radius-btn)',
        border: `1px solid ${aktiv ? 'var(--rsi-warnung)' : 'rgba(255,255,255,0.22)'}`,
        background: aktiv ? 'color-mix(in srgb, var(--rsi-warnung) 20%, transparent)' : 'rgba(0,0,0,0.4)',
        color: aktiv ? 'var(--rsi-warnung)' : 'white',
        fontSize: '11px', fontWeight: 700, cursor: aktiv ? 'default' : 'pointer',
        fontFamily: 'var(--rsi-font)',
      }}
    >
      {children}
      {label}
    </button>
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
  url, zoom, marke, zustand, markerSichtbar, offen, gefunden, onKlick, onBestaetigen,
}: {
  url: string
  zoom: number
  marke: BildPos | null
  zustand: Zustand
  markerSichtbar: boolean
  offen: DefizitVerortung[]
  gefunden: DefizitVerortung[]
  onKlick: (pos: BildPos) => void
  onBestaetigen: (seitenverhaeltnis: number) => void
}) {
  const textur = useLoader(THREE.TextureLoader, url)
  const { camera, size } = useThree()

  // Das Seitenverhältnis kommt aus dem Bild, nicht aus einer Annahme. Genau
  // dieses Verhältnis braucht die Trefferprüfung, damit ihr Radius ein Kreis
  // bleibt.
  const seitenverhaeltnis = useMemo(() => {
    const b = textur.image?.width ?? 0
    const h = textur.image?.height ?? 0
    return h > 0 ? b / h : 1.5
  }, [textur])

  // Der Bestaetigungsknopf liegt ausserhalb des Canvas und kennt das
  // Seitenverhaeltnis des geladenen Bildes nicht. Die Wand kennt es und hoert
  // deshalb auf ein Ereignis am Fenster. Das ist der kuerzere Weg, als das
  // Verhaeltnis nach oben zu melden und dort zu halten — es aendert sich mit
  // jedem Bild, und ein Zustand mehr waere ein Zustand, der veralten kann.
  useEffect(() => {
    function hoeren() { onBestaetigen(seitenverhaeltnis) }
    window.addEventListener('rsi-bildwand-bestaetigen', hoeren)
    return () => window.removeEventListener('rsi-bildwand-bestaetigen', hoeren)
  }, [onBestaetigen, seitenverhaeltnis])

  // ── Die Wand wird aus dem Sichtfeld gerechnet, nicht angenommen ──────────
  //
  // Die erste Fassung gab der Wand eine feste Breite von 3,2 m. Am Bildschirm
  // stand das Bild dann als Briefmarke da: wie viel 3,2 m einnehmen, hängt am
  // Blickwinkel der Kamera und am Seitenverhältnis des Fensters, und beides
  // ist keine Konstante. Gemessen wird es jetzt bei jedem Bild neu — dieselbe
  // Lehre wie beim Bündelversatz der Netzplaene: Was mit dem Zoom skaliert,
  // darf nicht fest im Blatt stehen.
  //
  // Eingepasst wird «contain»: Das Bild bleibt vollständig sichtbar, und der
  // Rand bleibt frei, damit die Bedienleisten nicht darüber liegen.
  const { breite, hoehe } = useMemo(() => {
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 70
    const aspekt = size.height > 0 ? size.width / size.height : 1.6
    const sichtHoehe = 2 * WAND_ABSTAND * Math.tan((fov * Math.PI) / 360) * RANDANTEIL
    const sichtBreite = sichtHoehe * aspekt
    // Das Bild ist breiter als das Sichtfeld, wenn sein Verhältnis grösser ist.
    const passtAufBreite = seitenverhaeltnis > sichtBreite / sichtHoehe
    const b = passtAufBreite ? sichtBreite : sichtHoehe * seitenverhaeltnis
    return { breite: b * zoom, hoehe: (b / seitenverhaeltnis) * zoom }
  }, [camera, size.width, size.height, seitenverhaeltnis, zoom])

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (!e.uv) return
    // uv läuft von unten links; Bildkoordinaten laufen von oben links.
    onKlick({ x: e.uv.x, y: 1 - e.uv.y })
  }

  return (
    <group position={[0, 0, -WAND_ABSTAND]}>
      <mesh onClick={handleClick}>
        <planeGeometry args={[breite, hoehe]} />
        <meshBasicMaterial map={textur} toneMapped={false} />
      </mesh>

      {markerSichtbar && offen.map((v, i) => (
        <Marker key={`offen-${i}`} v={v} breite={breite} hoehe={hoehe} farbe="#D40053" />
      ))}
      {gefunden.map((v, i) => (
        <Marker key={`gefunden-${i}`} v={v} breite={breite} hoehe={hoehe} farbe="#1A7F1F" />
      ))}

      {/* Die gesetzte Marke: ein Fadenkreuz, das auf Bestaetigung wartet. */}
      {marke && zustand === 'bestaetigen' && (
        <Fadenkreuz pos={marke} breite={breite} hoehe={hoehe} />
      )}
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

function Fadenkreuz({ pos, breite, hoehe }: { pos: BildPos; breite: number; hoehe: number }) {
  const x = (pos.x - 0.5) * breite
  const y = (0.5 - pos.y) * hoehe
  const r = 0.035 * breite
  return (
    <group position={[x, y, 0.02]}>
      <mesh>
        <ringGeometry args={[r * 0.78, r, 32]} />
        <meshBasicMaterial color="#FFFFFF" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[r * 0.16, 16]} />
        <meshBasicMaterial color="#FFFFFF" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}
