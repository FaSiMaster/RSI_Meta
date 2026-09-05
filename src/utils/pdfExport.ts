// pdfExport.ts — PDF-Erzeugung mit pdfmake (v0.11.0)
//
// Zwei Berichte:
//   1. Teilnehmerbericht — Auswertung (Deckblatt) + Befundliste im RSI-Format
//   2. Kursbericht       — Übersicht aller Durchläufe eines Kurses
//
// pdfmake wird bewusst per dynamischem Import geladen: Bibliothek und
// Schriftdateien (rund 1 MB) liegen dadurch in einem eigenen Chunk und
// belasten den Start der App nicht. Erst der Klick auf «Bericht» lädt sie.
//
// Farbgebung nach den Design-Tokens der Anwendung: Dunkelblau #00407C als
// Leitfarbe, Blau #0076BD für Akzente. Bewusst keine Logos — die App führt keine.

import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces'
import type { TFunction } from 'i18next'
import {
  fmtZahl, fmtDauer, fmtDatum,
  type TeilnehmerBericht, type BerichtDefizit, type Beurteilung,
} from '../data/berichtModel'
import { logger } from '../lib/logger'

const FARBE_DUNKELBLAU = '#00407C'
const FARBE_BLAU       = '#0076BD'
const FARBE_GRAU       = '#6B7280'
const FARBE_GRUEN      = '#1A7F1F'
const FARBE_ROT        = '#C4161C'
const FARBE_LINIE      = '#D4D9E0'

// pdfmake liefert UMD-Module; die Typen des Browser-Builds sind in
// @types/pdfmake nicht als Modul deklariert. Deshalb ein schmales Interface
// statt eines any-Casts.
interface PdfMakeBrowser {
  createPdf(def: TDocumentDefinitions): { download(name?: string): void }
  addVirtualFileSystem(vfs: unknown): void
  addFonts(fonts: Record<string, Record<string, string>>): void
}

// pdfmake 0.3 registriert die mitgelieferten Schriften NICHT mehr von selbst —
// ohne diese Zuordnung bricht das Rendern beim ersten fetten Text ab
// («Font 'Roboto' in style 'bold' is not defined»). Die vier Dateinamen sind
// exakt die Schluessel aus build/vfs_fonts.js.
const ROBOTO = {
  Roboto: {
    normal:      'Roboto-Regular.ttf',
    bold:        'Roboto-Medium.ttf',
    italics:     'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
}

let pdfMakeCache: PdfMakeBrowser | null = null

async function ladePdfMake(): Promise<PdfMakeBrowser> {
  if (pdfMakeCache) return pdfMakeCache
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = ((pdfMakeMod as unknown as { default?: PdfMakeBrowser }).default
    ?? pdfMakeMod) as unknown as PdfMakeBrowser
  const vfs = (vfsMod as unknown as { default?: unknown }).default ?? vfsMod
  // In manchen Bundles registriert vfs_fonts sich selbst am globalen pdfMake;
  // der explizite Aufruf ist idempotent und deckt den ESM-Pfad ab.
  if (typeof pdfMake.addVirtualFileSystem === 'function') {
    pdfMake.addVirtualFileSystem(vfs)
  }
  if (typeof pdfMake.addFonts === 'function') {
    pdfMake.addFonts(ROBOTO)
  }
  pdfMakeCache = pdfMake
  return pdfMake
}

// ── Bausteine ───────────────────────────────────────────────────────────────

function kopfzeile(titel: string, untertitel: string): Content {
  return {
    stack: [
      { text: titel, fontSize: 18, bold: true, color: FARBE_DUNKELBLAU },
      { text: untertitel, fontSize: 10, color: FARBE_GRAU, margin: [0, 2, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: FARBE_BLAU }], margin: [0, 8, 0, 0] },
    ],
    margin: [0, 0, 0, 16],
  }
}

/** Zweispaltige Kennwert-Liste (Label links, Wert rechts). */
function kennwerte(paare: [string, string][]): Content {
  return {
    table: {
      widths: [140, '*'],
      body: paare.map(([k, v]) => ([
        { text: k, fontSize: 9, color: FARBE_GRAU, border: [false, false, false, false], margin: [0, 2, 0, 2] },
        { text: v, fontSize: 9, bold: true, border: [false, false, false, false], margin: [0, 2, 0, 2] },
      ] as TableCell[])),
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12],
  }
}

function statusBadge(bestanden: boolean | null, t: TFunction): Content {
  if (bestanden == null) return { text: '' }
  return {
    table: {
      widths: ['auto'],
      body: [[{
        text: bestanden ? t('bericht.bestanden') : t('bericht.nicht_bestanden'),
        color: '#FFFFFF',
        fillColor: bestanden ? FARBE_GRUEN : FARBE_ROT,
        bold: true,
        fontSize: 10,
        margin: [10, 5, 10, 5],
      }]],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 14],
  }
}

/** Beurteilungskette als Textzeile: gross / gross → hoch · schwer → hoch */
function ketteText(k: Beurteilung, t: TFunction): string {
  const dim = (v: string) => t(`dim.${v}`, { defaultValue: v })
  const naca = k.naca != null ? ` (NACA ${k.naca})` : ''
  return `${dim(k.wichtigkeit)} / ${dim(k.abweichung)} → ${dim(k.relevanzSD)} · ${dim(k.unfallschwere)}${naca} → ${dim(k.unfallrisiko)}`
}

// ── Teil 1: Auswertungstabelle ──────────────────────────────────────────────

function auswertungsTabelle(b: TeilnehmerBericht, t: TFunction): Content {
  const kopf: TableCell[] = [
    t('bericht.spalte_defizit'), t('bericht.spalte_kategorie'),
    t('bericht.spalte_w'), t('bericht.spalte_a'), t('bericht.spalte_naca'),
    t('bericht.spalte_punkte'),
  ].map(text => ({ text, bold: true, fontSize: 8, color: '#FFFFFF', fillColor: FARBE_DUNKELBLAU, margin: [3, 4, 3, 4] }))

  const zeichen = (ok: boolean | null): TableCell => ({
    text: ok == null ? '–' : ok ? '✓' : '✗',
    color: ok == null ? FARBE_GRAU : ok ? FARBE_GRUEN : FARBE_ROT,
    alignment: 'center', fontSize: 9, bold: true, margin: [2, 3, 2, 3],
  })

  const zeilen: TableCell[][] = b.defizite.map(d => {
    if (!d.gefunden) {
      // colSpan: die drei Folgezellen muessen als leere Platzhalter stehen.
      return [
        { text: d.name + (d.isPflicht ? ' *' : ''), fontSize: 8, color: FARBE_GRAU, italics: true, margin: [3, 3, 3, 3] },
        { text: t('bericht.nicht_gefunden'), fontSize: 8, color: FARBE_GRAU, italics: true, colSpan: 4, margin: [3, 3, 3, 3] },
        { text: '' }, { text: '' }, { text: '' },
        { text: '0', fontSize: 8, alignment: 'right', color: FARBE_GRAU, margin: [3, 3, 3, 3] },
      ] as TableCell[]
    }
    return [
      { text: d.name + (d.isPflicht ? ' *' : ''), fontSize: 8, margin: [3, 3, 3, 3] },
      zeichen(d.kategorieRichtig),
      zeichen(d.ist ? d.ist.wichtigkeit === d.soll.wichtigkeit : null),
      zeichen(d.ist ? d.ist.abweichung === d.soll.abweichung : null),
      zeichen(d.ist ? d.ist.unfallschwere === d.soll.unfallschwere : null),
      { text: `${fmtZahl(d.punkteFinal ?? 0)} / ${fmtZahl(d.punkteMax)}`, fontSize: 8, alignment: 'right', margin: [3, 3, 3, 3] },
    ]
  })

  return {
    table: { headerRows: 1, widths: ['*', 42, 28, 28, 38, 62], body: [kopf, ...zeilen] },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => FARBE_LINIE,
    },
    margin: [0, 0, 0, 6],
  }
}

// ── Teil 2: Befundblatt je Defizit ──────────────────────────────────────────

function befundBlock(d: BerichtDefizit, t: TFunction): Content {
  const zeilen: [string, string][] = [
    [t('bericht.kriterium'), `${d.kriteriumLabel} (${d.kontext === 'io' ? t('bericht.innerorts') : t('bericht.ausserorts')})`],
    [t('bericht.soll'), ketteText(d.soll, t)],
  ]
  if (d.ist) {
    zeilen.push([t('bericht.ist'), ketteText(d.ist, t)])
  } else if (d.gefunden) {
    zeilen.push([t('bericht.ist'), t('bericht.ist_fehlt')])
  } else {
    zeilen.push([t('bericht.ist'), t('bericht.nicht_gefunden')])
  }
  if (d.normRefs.length > 0) zeilen.push([t('bericht.grundlage'), d.normRefs.join(' · ')])
  if (d.gefunden && d.hintAbzug > 0) zeilen.push([t('bericht.hilfe'), `−${fmtZahl(d.hintAbzug)}`])

  const abweichend = d.ist != null && d.ist.unfallrisiko !== d.soll.unfallrisiko

  return {
    unbreakable: true,
    stack: [
      {
        columns: [
          { text: `${d.nr}.  ${d.name}`, fontSize: 11, bold: true, color: FARBE_DUNKELBLAU, width: '*' },
          {
            text: d.gefunden
              ? `${fmtZahl(d.punkteFinal ?? 0)} / ${fmtZahl(d.punkteMax)}`
              : t('bericht.nicht_gefunden'),
            fontSize: 9, bold: true, alignment: 'right', width: 'auto',
            color: d.gefunden ? FARBE_BLAU : FARBE_ROT,
          },
        ],
        margin: [0, 0, 0, 4],
      },
      d.beschreibung
        ? { text: d.beschreibung, fontSize: 8, color: '#333333', margin: [0, 0, 0, 6], lineHeight: 1.25 } as Content
        : { text: '' } as Content,
      {
        table: {
          widths: [90, '*'],
          body: zeilen.map(([k, v]) => ([
            { text: k, fontSize: 8, color: FARBE_GRAU, margin: [0, 1.5, 0, 1.5] },
            { text: v, fontSize: 8, margin: [0, 1.5, 0, 1.5] },
          ] as TableCell[])),
        },
        layout: 'noBorders',
      },
      abweichend
        ? {
            text: t('bericht.risiko_abweichung'),
            fontSize: 8, italics: true, color: FARBE_ROT, margin: [0, 4, 0, 0],
          } as Content
        : { text: '' } as Content,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: FARBE_LINIE }], margin: [0, 8, 0, 8] },
    ],
  }
}

// ── Dokument: Teilnehmerbericht ─────────────────────────────────────────────

export function baueTeilnehmerDoc(b: TeilnehmerBericht, t: TFunction, lang: string): TDocumentDefinitions {
  const pflicht = b.pflichtTotal != null
    ? `${fmtZahl(b.pflichtGefunden ?? 0)} / ${fmtZahl(b.pflichtTotal)}`
    : '–'

  return {
    pageSize: 'A4',
    pageMargins: [40, 44, 40, 52],
    info: {
      title: `${t('bericht.titel')} — ${b.szene}`,
      author: 'RSI VR Tool · Stevan Skeledzic',
      subject: t('bericht.untertitel'),
    },
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    footer: (page: number, total: number) => ({
      columns: [
        { text: `${b.szene} · ${b.teilnehmer}`, fontSize: 7, color: FARBE_GRAU, margin: [40, 0, 0, 0] },
        { text: `${page} / ${total}`, fontSize: 7, color: FARBE_GRAU, alignment: 'right', margin: [0, 0, 40, 0] },
      ],
      margin: [0, 16, 0, 0],
    }),
    content: [
      kopfzeile(t('bericht.titel'), t('bericht.untertitel')),
      kennwerte([
        [t('bericht.teilnehmer'), b.teilnehmer],
        [t('bericht.szene'), b.szene],
        ...(b.thema ? [[t('bericht.thema'), b.thema] as [string, string]] : []),
        ...(b.kurs ? [[t('bericht.kurs'), b.kurs] as [string, string]] : []),
        [t('bericht.datum'), fmtDatum(b.datumIso, lang)],
        [t('bericht.dauer'), fmtDauer(b.dauerSekunden)],
        [t('bericht.versuch'), fmtZahl(b.versuch)],
      ]),
      statusBadge(b.bestanden, t),
      kennwerte([
        [t('bericht.punkte'), `${fmtZahl(b.punkte)} / ${fmtZahl(b.maxPunkte)}  (${b.prozent} %)`],
        [t('bericht.gefunden'), `${fmtZahl(b.gefunden)} / ${fmtZahl(b.total)}`],
        [t('bericht.pflicht'), pflicht],
      ]),
      { text: t('bericht.abschnitt_auswertung'), fontSize: 12, bold: true, color: FARBE_DUNKELBLAU, margin: [0, 6, 0, 8] },
      // Ohne Detaildaten (Serverzeile vor der detail-Migration) bleiben nur die
      // Kopfzahlen — dann statt leerer Tabellen ein klarer Hinweis.
      ...(b.defizite.length === 0
        ? [{ text: t('bericht.keine_details'), fontSize: 9, italics: true, color: FARBE_GRAU, margin: [0, 0, 0, 8] } as Content]
        : [
            auswertungsTabelle(b, t),
            { text: t('bericht.pflicht_fussnote'), fontSize: 7, color: FARBE_GRAU, margin: [0, 0, 0, 4] } as Content,
            { text: t('bericht.abschnitt_befunde'), fontSize: 12, bold: true, color: FARBE_DUNKELBLAU, pageBreak: 'before', margin: [0, 0, 0, 4] } as Content,
            { text: t('bericht.befunde_hinweis'), fontSize: 8, color: FARBE_GRAU, margin: [0, 0, 0, 10] } as Content,
            ...b.defizite.map(d => befundBlock(d, t)),
          ]),
      { text: t('bericht.disclaimer'), fontSize: 7, color: FARBE_GRAU, italics: true, margin: [0, 10, 0, 0] },
    ],
  }
}

// ── Dokument: Kursbericht ───────────────────────────────────────────────────

export interface KursZeile {
  teilnehmer:  string
  szene:       string
  datumIso:    string
  punkte:      number
  maxPunkte:   number | null
  prozent:     number
  dauerSekunden: number | null
  bestanden:   boolean | null
}

export interface KursBericht {
  kursName:  string
  zeilen:    KursZeile[]
  /** true, wenn die Namen als SHA-256-Hash vorliegen (Serverdaten). */
  anonymisiert: boolean
}

export function baueKursDoc(k: KursBericht, t: TFunction, lang: string): TDocumentDefinitions {
  const bestandenAnzahl = k.zeilen.filter(z => z.bestanden === true).length
  const mitWertung      = k.zeilen.filter(z => z.bestanden != null).length
  const schnitt = k.zeilen.length > 0
    ? Math.round(k.zeilen.reduce((s, z) => s + z.prozent, 0) / k.zeilen.length)
    : 0

  const kopf: TableCell[] = [
    t('bericht.teilnehmer'), t('bericht.szene'), t('bericht.datum'),
    t('bericht.spalte_punkte'), '%', t('bericht.dauer'), t('bericht.spalte_status'),
  ].map(text => ({ text, bold: true, fontSize: 8, color: '#FFFFFF', fillColor: FARBE_DUNKELBLAU, margin: [3, 4, 3, 4] }))

  const zeilen: TableCell[][] = k.zeilen.map(z => ([
    { text: z.teilnehmer, fontSize: 7.5, margin: [3, 3, 3, 3] },
    { text: z.szene, fontSize: 7.5, margin: [3, 3, 3, 3] },
    { text: fmtDatum(z.datumIso, lang), fontSize: 7.5, margin: [3, 3, 3, 3] },
    {
      text: z.maxPunkte != null ? `${fmtZahl(z.punkte)} / ${fmtZahl(z.maxPunkte)}` : fmtZahl(z.punkte),
      fontSize: 7.5, alignment: 'right', margin: [3, 3, 3, 3],
    },
    { text: `${z.prozent}`, fontSize: 7.5, alignment: 'right', margin: [3, 3, 3, 3] },
    { text: z.dauerSekunden != null ? fmtDauer(z.dauerSekunden) : '–', fontSize: 7.5, alignment: 'right', margin: [3, 3, 3, 3] },
    {
      text: z.bestanden == null ? '–' : z.bestanden ? t('bericht.bestanden') : t('bericht.nicht_bestanden'),
      fontSize: 7.5, bold: true,
      color: z.bestanden == null ? FARBE_GRAU : z.bestanden ? FARBE_GRUEN : FARBE_ROT,
      margin: [3, 3, 3, 3],
    },
  ]))

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [36, 44, 36, 48],
    info: {
      title: `${t('bericht.kurs_titel')} — ${k.kursName}`,
      author: 'RSI VR Tool · Stevan Skeledzic',
    },
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    footer: (page: number, total: number) => ({
      columns: [
        { text: k.kursName, fontSize: 7, color: FARBE_GRAU, margin: [36, 0, 0, 0] },
        { text: `${page} / ${total}`, fontSize: 7, color: FARBE_GRAU, alignment: 'right', margin: [0, 0, 36, 0] },
      ],
      margin: [0, 14, 0, 0],
    }),
    content: [
      kopfzeile(t('bericht.kurs_titel'), k.kursName),
      kennwerte([
        [t('bericht.anzahl_durchlaeufe'), fmtZahl(k.zeilen.length)],
        [t('bericht.anzahl_bestanden'), mitWertung > 0 ? `${fmtZahl(bestandenAnzahl)} / ${fmtZahl(mitWertung)}` : '–'],
        [t('bericht.schnitt'), `${schnitt} %`],
        [t('bericht.erstellt'), fmtDatum(new Date().toISOString(), lang)],
      ]),
      ...(k.anonymisiert
        ? [{ text: t('bericht.anonym_hinweis'), fontSize: 8, italics: true, color: FARBE_GRAU, margin: [0, 0, 0, 10] } as Content]
        : []),
      {
        table: { headerRows: 1, widths: [120, '*', 90, 70, 28, 60, 62], body: [kopf, ...zeilen] },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => FARBE_LINIE,
        },
      },
      { text: t('bericht.disclaimer'), fontSize: 7, color: FARBE_GRAU, italics: true, margin: [0, 12, 0, 0] },
    ],
  }
}

// ── Ausloeser ───────────────────────────────────────────────────────────────

/** Dateiname ohne Sonderzeichen, damit alle Browser ihn unveraendert uebernehmen. */
export function dateiname(teile: string[], datumIso: string): string {
  const datum = datumIso.slice(0, 10)
  const rein = teile
    .map(s => s.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .map(s => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
    .filter(Boolean)
    .join('_')
  return `${rein}_${datum}.pdf`
}

export async function exportTeilnehmerPdf(
  b: TeilnehmerBericht, t: TFunction, lang: string,
): Promise<void> {
  try {
    const pdfMake = await ladePdfMake()
    pdfMake.createPdf(baueTeilnehmerDoc(b, t, lang))
      .download(dateiname(['RSI', b.szene, b.teilnehmer], b.datumIso))
  } catch (err) {
    logger.error('PDF-Export fehlgeschlagen:', err)
    throw err
  }
}

export async function exportKursPdf(
  k: KursBericht, t: TFunction, lang: string,
): Promise<void> {
  try {
    const pdfMake = await ladePdfMake()
    pdfMake.createPdf(baueKursDoc(k, t, lang))
      .download(dateiname(['RSI', 'Kurs', k.kursName], new Date().toISOString()))
  } catch (err) {
    logger.error('PDF-Export fehlgeschlagen:', err)
    throw err
  }
}
