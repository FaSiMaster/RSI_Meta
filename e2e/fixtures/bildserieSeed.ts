// Seed für den Szenentyp Bildserie (v0.20.0)
//
// Eigener Bestand, getrennt vom Seed der Panorama-Szenen: eine Bildserie
// braucht ein Thema mit Land, Phasen mit Zeitangabe und ein Defizit mit einer
// Verortung in Bildkoordinaten. Den bestehenden Seed dafür zu erweitern hiesse,
// jede andere Prüfung an Daten zu messen, die sie nicht braucht.

import type { Page } from '@playwright/test'
import { KEYS } from './seed'

/**
 * Ein Bild von 320 mal 180 Bildpunkten als data-URI, also 16:9.
 *
 * Vier farbige Felder, damit am Bildschirmfoto zu sehen ist, welche Ecke wo
 * liegt: links oben rot, rechts unten grün, der Rest blau. Ein data-URI und
 * keine Datei, damit die Prüfung ohne Bildspeicher und ohne Netz läuft;
 * THREE.TextureLoader lädt ihn wie jede andere Adresse.
 */
export const TESTBILD =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAIAAABqhmJGAAACnElEQVR42u3crUvEcBjA8d9kHniGGTSI3gX/AUGDBovNl2AWjNYzicVkEOwGuf9Ag81oERQObXL4UsTDdBpcUA7EtyAYfE3KPD+ftMGTHviyjY1FWyMjgeY1H4qW0MRarAAEDAgYEDAIGBAwIGBAwCBgQMCAgOH/ir+dGNveTo+PX44vd3fPNjYKk5O9ExNxPn+ytna1v//hjM1CJgJ+ur+vlEqvp7mOjt7x8Uqp1F4oDC4v78zMvJ8BMnoLnUuS883Np8fHRr2eSxIbhExfgd+4qdVuarUQQvfoaH1vzwYh0wFHcTy8uvpyfFouX1erIYR8T0/f9HRlbu6LGSBzz8AhhLitbWBp6XBl5S5NP5sBMvkaKYr6FxfP1tfToyPrg790C51Wq7cXF11DQ61JUpyaemg0DhYW3s+clMs2C78g8k+s4J9Y+BILEDAgYBAwIGBAwICAQcCAgAEBg4ABAQMCBgQMAgYEDAgYEDAIGBAwIGAQMCBgQMCAgEHAgIABAQMCBgEDAgYEDAIGBAwIGBAwCBgQMCBgEDAgYEDAgIBBwICAAQEDAgYBAwIGBAwCBgQMCBgQMAgYEDAgYEDAIGBAwICAQcCAgAEBAwIGAQMCBgQMCBj+sng+FG2hiXXO2oErMCBgQMCAgEHAgIABAYOAAQEDAgYEDAIGBAwIGBAwCBgQMCBgEDAgYEDAgIBBwICAAQGDgAEBAwIGBAwCBgQMCBgQMAgYEDAgYBAwIGBAwICAQcCAgAEBAwIGAQMCBgQMAgYEDAgYEDAIGBAwIGAQMCBgQMCAgEHAgIABAQMCBgEDAgYEDAIGBAwIGBAwCBgQMCBgQMAgYEDAgIBBwICAAQEDAgYBAwIGBAwIGAQMCBgQMAgYEDDwo54BlGV0GGKO778AAAAASUVORK5CYII='

export const BILDSERIE_THEMA = {
  id: 'tp-de-e2e',
  nameI18n: { de: 'E2E-Knoten DE', fr: 'E2E-Knoten DE', it: 'E2E-Knoten DE', en: 'E2E-Knoten DE' },
  beschreibungI18n: { de: '', fr: '', it: '', en: '' },
  sortOrder: 1,
  isActive: true,
  parentTopicId: null,
  createdAt: 1_700_000_000_000,
  country: 'DE',
} as const

/**
 * Die Verortung sitzt links oben, ausdrücklich nicht in der Mitte.
 *
 * In der Bildmitte stimmen richtige und an der Waagrechten gespiegelte
 * Koordinaten überein; ein vergessenes «1 minus» bei der Umrechnung von
 * Texturkoordinaten fiele dort nicht auf.
 */
export const BILDSERIE_VERORTUNG = { x: 0.25, y: 0.25, r: 0.1 } as const

export function bildserieSzene(bild: string) {
  return {
    id: 'SZ_2026_E2D',
    topicId: 'tp-de-e2e',
    nameI18n: { de: 'E2E-Bildserie', fr: 'E2E-Bildserie', it: 'E2E-Bildserie', en: 'E2E-Bildserie' },
    beschreibungI18n: { de: '', fr: '', it: '', en: '' },
    bemerkungI18n: { de: '', fr: '', it: '', en: '' },
    kontext: 'io',
    isActive: true,
    createdAt: 1_700_000_000_000,
    country: 'DE',
    szenentyp: 'bildserie',
    phasen: [
      {
        id: 'ph-jetzt',
        labelI18n: { de: 'Jetzt', fr: 'Jetzt', it: 'Jetzt', en: 'Jetzt' },
        zeitangabeI18n: { de: '12. Mai 2022', fr: '12 mai 2022', it: '12 maggio 2022', en: '12 May 2022' },
        bilder: [bild],
        bewertet: true,
      },
      {
        id: 'ph-frueher',
        labelI18n: { de: 'Frueher', fr: 'Frueher', it: 'Frueher', en: 'Frueher' },
        zeitangabeI18n: { de: '13. September 2017', fr: '13 sept. 2017', it: '13 sett. 2017', en: '13 Sept 2017' },
        bilder: [bild],
        bewertet: false,
      },
    ],
  }
}

export function bildserieDefizit(bild: string) {
  return {
    id: 'SD_0901',
    sceneId: 'SZ_2026_E2D',
    topicId: 'tp-de-e2e',
    nameI18n: { de: 'E2E-Befund DE', fr: 'E2E-Befund DE', it: 'E2E-Befund DE', en: 'E2E-Befund DE' },
    beschreibungI18n: { de: 'E2E', fr: 'E2E', it: 'E2E', en: 'E2E' },
    kriteriumId: 'knoten_allgemein',
    kontext: 'io',
    correctAssessment: { verfahren: 'de-uko-2', schritt1: 'sicherheitsdefizit', schritt2: 'gross' },
    isPflicht: true,
    isBooster: false,
    normRefs: [] as string[],
    verortung: null,
    verortungen: { [bild]: { typ: 'bild', ...BILDSERIE_VERORTUNG } },
  }
}

/** Sät den Bestand, bevor die Anwendung mountet. */
export async function seedBildserie(page: Page, bild: string): Promise<void> {
  await page.addInitScript(
    ({ keys, thema, szene, defizit }) => {
      window.localStorage.setItem(keys.SCHEMA, '2')
      window.localStorage.setItem(keys.INIT, '1')
      window.localStorage.setItem(keys.TOPICS, JSON.stringify([thema]))
      window.localStorage.setItem(keys.SCENES, JSON.stringify([szene]))
      window.localStorage.setItem(keys.DEFICITS, JSON.stringify([defizit]))
      window.localStorage.setItem(keys.RANKING, '[]')
      window.localStorage.setItem(keys.KURSE, '[]')
      // Der Landfilter steht sonst auf der Vorgabe Schweiz, und dann ist ein
      // deutsches Thema unsichtbar. Das ist die Länderweiche und gewollt; der
      // Test setzt ihn deshalb ausdrücklich. Genau daran ist die erste
      // Klickprobe von Hand gescheitert.
      window.localStorage.setItem('rsi-v3-landfilter', 'DE')
    },
    {
      keys: KEYS,
      thema: BILDSERIE_THEMA,
      szene: bildserieSzene(bild),
      defizit: bildserieDefizit(bild),
    },
  )
}
