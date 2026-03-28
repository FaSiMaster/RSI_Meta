// Statische Daten – ersetzen den Express-Backend aus Google_Voarbeiten
// Echte Inhalte werden separat definiert (FaSi TBA ZH)

import type { Topic, Scene, Deficit, RankingEntry } from '../types'

export const TOPICS: Topic[] = [
  { id: 'fuss', name: 'Fussverkehr', description: 'Sicherheitsdefizite bei Gehwegen und Querungen.' },
  { id: 'velo', name: 'Veloverkehr', description: 'Radwege, Radstreifen und Knotenpunkte.' },
  { id: 'knoten', name: 'Knotenpunkte', description: 'Sichtweiten und Vorfahrtsregelungen.' },
  { id: 'baustelle', name: 'Baustellen', description: 'Absicherung und Verkehrsführung.' },
]

export const SCENES: Scene[] = [
  {
    id: 'scene1',
    topicId: 'fuss',
    imageUrl: '/textures/street-360.jpg',
    description: 'Innerörtliche Strasse mit Gehweg.',
    locationType: 'io',
  },
  {
    id: 'scene2',
    topicId: 'velo',
    imageUrl: '/textures/street-360.jpg',
    description: 'Hauptverkehrsstrasse mit Radstreifen.',
    locationType: 'ao',
  },
  {
    id: 'scene3',
    topicId: 'knoten',
    imageUrl: '/textures/street-360.jpg',
    description: 'Kreuzung mit eingeschränkten Sichtweiten.',
    locationType: 'io',
  },
  {
    id: 'scene4',
    topicId: 'baustelle',
    imageUrl: '/textures/street-360.jpg',
    description: 'Baustelle mit temporärer Verkehrsführung.',
    locationType: 'ao',
  },
]

export const DEFICITS: Deficit[] = [
  {
    id: 'def1',
    sceneId: 'scene1',
    position: [10, 0, -10],
    tolerance: 2.5,
    title: 'Fehlende Absenkung',
    description: 'Der Bordstein ist an der Querungsstelle nicht abgesenkt.',
    correctAssessment: { wichtigkeit: 'mittel', abweichung: 'gross', unfallschwere: 'mittel' },
    feedback: 'Barrierefreiheit ist nicht gegeben. Rollstuhlfahrer müssen auf die Fahrbahn ausweichen.',
    solution: 'Bordstein auf 0–3 cm absenken.',
  },
  {
    id: 'def2',
    sceneId: 'scene1',
    position: [-5, 2, -8],
    tolerance: 2.0,
    title: 'Sichtbehinderung',
    description: 'Hecke ragt in den Sichtraum der Fussgänger.',
    correctAssessment: { wichtigkeit: 'gross', abweichung: 'mittel', unfallschwere: 'schwer' },
    feedback: 'Gefahr durch herannahende Fahrzeuge wird zu spät erkannt.',
    solution: 'Rückschnitt der Bepflanzung anordnen.',
  },
  {
    id: 'def3',
    sceneId: 'scene2',
    position: [3, 0, -6],
    tolerance: 2.0,
    title: 'Unterbrochener Radstreifen',
    description: 'Der Radstreifen endet ohne Weiterführung vor der Kreuzung.',
    correctAssessment: { wichtigkeit: 'gross', abweichung: 'gross', unfallschwere: 'mittel' },
    feedback: 'Velofahrende werden in den Mischverkehr gedrängt.',
    solution: 'Radstreifen bis Haltelinie weiterführen, Markierung erneuern.',
  },
]

const RANKINGS_KEY = 'rsi-rankings'

export function getRankings(): RankingEntry[] {
  try {
    const raw = localStorage.getItem(RANKINGS_KEY)
    const data: RankingEntry[] = raw ? JSON.parse(raw) : []
    // Startwerte falls leer
    if (data.length === 0) {
      return [
        { username: 'Max Muster', score: 1250, timestamp: new Date().toISOString() },
        { username: 'SicherheitsPro', score: 980, timestamp: new Date().toISOString() },
        { username: 'RSI_Expert', score: 1500, timestamp: new Date().toISOString() },
      ]
    }
    return data.sort((a, b) => b.score - a.score)
  } catch {
    return []
  }
}

export function saveRanking(username: string, score: number): void {
  try {
    const existing = getRankings().filter(r =>
      !(r.username === 'Max Muster' || r.username === 'SicherheitsPro' || r.username === 'RSI_Expert')
    )
    const updated: RankingEntry[] = [
      ...existing,
      { username, score, timestamp: new Date().toISOString() },
    ].sort((a, b) => b.score - a.score)
    localStorage.setItem(RANKINGS_KEY, JSON.stringify(updated))
  } catch {
    // localStorage nicht verfügbar – ignorieren
  }
}
