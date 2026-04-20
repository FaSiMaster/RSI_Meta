// Pikogramm-Katalog fuer Themenbereiche (D-4, v0.4.x)
//
// Kuratierte Auswahl aus lucide-react. Erweitern bei Bedarf.
// Mit Auto-Vorschlag aus Themenname (suggestIconKey).

import type { LucideIcon } from 'lucide-react'
import {
  Footprints, Bike, Crosshair, Construction,
  Car, Bus, Truck, Train,
  TrafficCone, Gauge, Moon, AlertTriangle,
  Trees, Building2, Mountain, GraduationCap,
  ArrowRightLeft, Map as MapIcon, Lightbulb, Eye, Route,
  ParkingSquare, ArrowDown,
} from 'lucide-react'

export interface TopicIconDef {
  key:    string
  label:  string
  Icon:   LucideIcon
  // Schluesselwoerter fuer Auto-Vorschlag (lowercase, ohne Umlaute)
  match: string[]
}

export const TOPIC_ICONS: TopicIconDef[] = [
  { key: 'walk',         label: 'Fussverkehr',           Icon: Footprints,    match: ['fuss', 'fusgang', 'pieton', 'pedone', 'pedestrian', 'walk', 'gehweg', 'trottoir'] },
  { key: 'bike',         label: 'Veloverkehr',           Icon: Bike,          match: ['velo', 'rad', 'bike', 'fahrrad', 'cycliste', 'bicicletta', 'cycle'] },
  { key: 'junction',     label: 'Knoten / Kreuzung',     Icon: Crosshair,     match: ['knoten', 'kreuz', 'carrefour', 'incroci', 'junction', 'kreisel', 'rotonda', 'rondpoint'] },
  { key: 'construction', label: 'Baustelle',             Icon: Construction,  match: ['bau', 'baustelle', 'chantier', 'cantiere', 'construction'] },
  { key: 'car',          label: 'Motorisierter Verkehr', Icon: Car,           match: ['miv', 'auto', 'pkw', 'voiture', 'car', 'motorisi', 'motorise'] },
  { key: 'bus',          label: 'Oeffentlicher Verkehr', Icon: Bus,           match: ['bus', 'oev', 'transports', 'trasporti', 'public transport'] },
  { key: 'truck',        label: 'Schwerverkehr',         Icon: Truck,         match: ['lkw', 'last', 'truck', 'camion', 'sgv', 'schwerverkehr'] },
  { key: 'train',        label: 'Schiene / Bahn',        Icon: Train,         match: ['bahn', 'schiene', 'tram', 'train', 'treno', 'rail'] },
  { key: 'cone',         label: 'Verkehrsfuehrung',      Icon: TrafficCone,   match: ['fuehrung', 'leit', 'guidage', 'guida', 'lenkung'] },
  { key: 'speed',        label: 'Geschwindigkeit',       Icon: Gauge,         match: ['speed', 'geschwindig', 'tempo', 'vitesse', 'velocita'] },
  { key: 'night',        label: 'Nacht / Beleuchtung',   Icon: Moon,          match: ['nacht', 'nuit', 'notte', 'night', 'dunkel'] },
  { key: 'lights',       label: 'Beleuchtung / Signal',  Icon: Lightbulb,     match: ['lampe', 'lumiere', 'beleucht', 'signal'] },
  { key: 'sight',        label: 'Sicht / Sichtweite',    Icon: Eye,           match: ['sicht', 'visibil', 'vue'] },
  { key: 'sign',         label: 'Beschilderung',         Icon: AlertTriangle, match: ['signal', 'schild', 'panneau', 'segnale'] },
  { key: 'crosswalk',    label: 'Querung',               Icon: ArrowRightLeft, match: ['quer', 'traverse', 'attraversamento', 'crossing', 'fussgangerstreifen'] },
  { key: 'rural',        label: 'Ausserorts / Landlich', Icon: Trees,         match: ['ausserorts', 'land', 'rural', 'campagne', 'campagna'] },
  { key: 'urban',        label: 'Innerorts / Stadt',     Icon: Building2,     match: ['innerorts', 'stadt', 'localite', 'localita', 'urban', 'siedlung'] },
  { key: 'mountain',     label: 'Berg / Gefaelle',       Icon: Mountain,      match: ['berg', 'gefaelle', 'gefall', 'mont', 'pendenza', 'slope'] },
  { key: 'school',       label: 'Schule',                Icon: GraduationCap, match: ['schul', 'ecole', 'scuola', 'school'] },
  { key: 'parking',      label: 'Parkierung',            Icon: ParkingSquare, match: ['park', 'stationn', 'parcheggio'] },
  { key: 'route',        label: 'Strassenfuehrung',      Icon: Route,         match: ['linienfuehrung', 'trace', 'tracciato', 'route', 'kurv'] },
  { key: 'map',          label: 'Allgemein / Strecke',   Icon: MapIcon,       match: ['strecke', 'segment', 'tracciato', 'parcours'] },
  { key: 'descent',      label: 'Gefaelle abwaerts',     Icon: ArrowDown,     match: ['abwaerts', 'descend', 'discesa'] },
]

// Default-Icon falls keine Auswahl getroffen
export const DEFAULT_TOPIC_ICON_KEY = 'map'

// Lookup: key -> Definition
const ICON_BY_KEY = new Map(TOPIC_ICONS.map(d => [d.key, d]))

export function getTopicIcon(key: string | undefined | null): TopicIconDef {
  if (!key) return ICON_BY_KEY.get(DEFAULT_TOPIC_ICON_KEY)!
  return ICON_BY_KEY.get(key) ?? ICON_BY_KEY.get(DEFAULT_TOPIC_ICON_KEY)!
}

// Auto-Vorschlag aus Themenname (z.B. "Fussverkehr" -> 'walk')
// Untersucht alle Sprachen und matcht auf Schluesselwoerter.
// Returns null wenn kein eindeutiger Match.
export function suggestIconKey(name: { de?: string; fr?: string; it?: string; en?: string }): string | null {
  const haystack = [name.de, name.fr, name.it, name.en]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    // Umlaute reduzieren fuer Match
    .replace(/[äàáâ]/g, 'a').replace(/[öòóô]/g, 'o').replace(/[üùúû]/g, 'u')
    .replace(/[éèê]/g, 'e').replace(/ß/g, 'ss')

  if (!haystack.trim()) return null

  // Erstes passendes Icon nehmen (Reihenfolge in TOPIC_ICONS = Prioritaet)
  for (const def of TOPIC_ICONS) {
    if (def.match.some(kw => haystack.includes(kw))) {
      return def.key
    }
  }
  return null
}
