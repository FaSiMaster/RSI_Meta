// Typen für RSI VR Tool – FaSi Kanton Zürich

export interface Topic {
  id: string
  name: string
  description: string
}

export interface Scene {
  id: string
  topicId: string
  imageUrl: string
  description: string
  locationType: 'io' | 'ao' // io = innerorts, ao = ausserorts
}

export type RSIDimension = 'gross' | 'mittel' | 'klein'
export type NACADimension = 'leicht' | 'mittel' | 'schwer'
export type ResultDimension = 'gering' | 'mittel' | 'hoch'

export interface Deficit {
  id: string
  sceneId: string
  position: [number, number, number]
  tolerance: number
  title: string
  description: string
  correctAssessment: {
    wichtigkeit: RSIDimension
    abweichung: RSIDimension
    unfallschwere: NACADimension
  }
  feedback: string
  solution: string
}

export interface RankingEntry {
  username: string
  score: number
  timestamp: string
}

export interface UserProgress {
  username: string
  score: number
  completedScenes: string[]
  foundDeficits: string[]
  timestamp: string
}
